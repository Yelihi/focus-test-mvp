/// <reference lib="webworker" />

import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
  StateUpdateMessage,
  CoverageUpdateMessage,
  SessionSummaryMessage,
  DistractedAlertMessage,
} from "@/shared/types/messages";
import type {
  SessionConfig,
  FocusState,
  StudyMode,
  SessionSummary,
  FocusSegment,
} from "@/entities/focus-session";
import { DEFAULT_SESSION_CONFIG } from "@/entities/focus-session";
import {
  COVERAGE_UPDATE_INTERVAL_MS,
  DISTRACTED_ALERT_THRESHOLD_MS,
} from "@/shared/config/timing";
import { computeFocusScore } from "./focusScorer";
import {
  createStateMachine,
  transition,
  finalize,
  getLongestContinuousFocus,
  type StateMachineState,
  type StateMachineConfig,
} from "./stateMachine";
import {
  createCoverageTracker,
  recordSample,
  getCoveragePercent,
  getEffectiveSampleRate,
  type CoverageState,
} from "./coverageTracker";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

// ── State ──────────────────────────────────────────────────────

let sessionId: string | null = null;
let config: SessionConfig = DEFAULT_SESSION_CONFIG;
let studyMode: StudyMode = "work";
let smState: StateMachineState | null = null;
let coverageState: CoverageState | null = null;
let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
let coverageIntervalId: ReturnType<typeof setInterval> | null = null;
let lastStateUpdate: FocusState | null = null;
let lastKeepAliveMs = 0;
let sessionStartMs = 0;

// Accumulated segments from previous pause/resume cycles
let accumulatedSegments: FocusSegment[] = [];

// Distracted alert tracking
let distractedStartMs = 0;
let distractedAlertSent = false;

// ── Helpers ────────────────────────────────────────────────────

function post(msg: WorkerToMainMessage): void {
  ctx.postMessage(msg);
}

function sendCoverageUpdate(): void {
  if (!coverageState) return;
  const now = performance.now();
  const coverage: CoverageUpdateMessage = {
    type: "COVERAGE_UPDATE",
    coveragePercent: getCoveragePercent(coverageState, now),
    effectiveSampleRateHz: getEffectiveSampleRate(coverageState, now),
  };
  post(coverage);
}

function getAllSegments(endMs: number): FocusSegment[] {
  const currentSegments = smState ? finalize(smState, endMs) : [];
  return [...accumulatedSegments, ...currentSegments];
}

function buildSummary(endMs: number): SessionSummary {
  const segments = getAllSegments(endMs);
  const durationMs = endMs - sessionStartMs;

  let focusMs = 0;
  let distractedMs = 0;
  let absentMs = 0;

  for (const seg of segments) {
    const segDuration = Math.max(0, seg.endMs - seg.startMs);
    if (seg.state === "focused") focusMs += segDuration;
    else if (seg.state === "distracted") distractedMs += segDuration;
    else absentMs += segDuration;
  }

  const safeDuration = Math.max(1, durationMs);

  return {
    sessionId: sessionId ?? "unknown",
    durationMs,
    focusPercent: Math.min(100, (focusMs / safeDuration) * 100),
    distractedPercent: Math.min(100, (distractedMs / safeDuration) * 100),
    absentPercent: Math.min(100, (absentMs / safeDuration) * 100),
    segments,
    coveragePercent: coverageState
      ? getCoveragePercent(coverageState, endMs)
      : 0,
    effectiveSampleRateHz: coverageState
      ? getEffectiveSampleRate(coverageState, endMs)
      : 0,
    // Break fields are filled by SessionManager (worker doesn't track breaks)
    breakCount: 0,
    breaks: [],
    longestContinuousFocusMs: getLongestContinuousFocus(segments),
    totalBreakMs: 0,
    avgRecoveryMs: 0,
  };
}

function resetSession(): void {
  smState = null;
  coverageState = null;
  sessionId = null;
  lastStateUpdate = null;
  lastKeepAliveMs = 0;
  sessionStartMs = 0;
  accumulatedSegments = [];
  distractedStartMs = 0;
  distractedAlertSent = false;

  if (heartbeatIntervalId !== null) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
  }
  if (coverageIntervalId !== null) {
    clearInterval(coverageIntervalId);
    coverageIntervalId = null;
  }
}

function stopCoverageInterval(): void {
  if (coverageIntervalId !== null) {
    clearInterval(coverageIntervalId);
    coverageIntervalId = null;
  }
}

function startCoverageInterval(): void {
  stopCoverageInterval();
  coverageIntervalId = setInterval(
    sendCoverageUpdate,
    COVERAGE_UPDATE_INTERVAL_MS,
  );
}

// ── Message handler ────────────────────────────────────────────

ctx.addEventListener("message", (e: MessageEvent<MainToWorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case "SESSION_START": {
      resetSession();
      sessionId = msg.sessionId;
      config = { ...DEFAULT_SESSION_CONFIG, ...msg.config };
      studyMode = config.studyMode;
      sessionStartMs = performance.now();

      const smConfig: StateMachineConfig = {
        focusThreshold: config.focusThreshold,
        distractedThreshold: config.distractedThreshold,
        hysteresisFrames: config.hysteresisFrames,
      };
      smState = createStateMachine(smConfig);
      coverageState = createCoverageTracker(sessionStartMs, config.targetFps);

      startCoverageInterval();
      break;
    }

    case "SIGNALS": {
      if (!smState || !coverageState) break;

      const { signals } = msg;
      const { focusScore, confidence } = computeFocusScore(signals, studyMode);

      recordSample(coverageState, signals.timestamp);

      const smConfig: StateMachineConfig = {
        focusThreshold: config.focusThreshold,
        distractedThreshold: config.distractedThreshold,
        hysteresisFrames: config.hysteresisFrames,
      };
      const result = transition(smState, focusScore, signals.timestamp, smConfig);
      smState = result.state;

      // Distracted alert tracking
      if (result.newState === "distracted" || result.newState === "absent") {
        if (distractedStartMs === 0) {
          distractedStartMs = performance.now();
          distractedAlertSent = false;
        } else if (!distractedAlertSent) {
          const elapsed = performance.now() - distractedStartMs;
          if (elapsed >= DISTRACTED_ALERT_THRESHOLD_MS) {
            distractedAlertSent = true;
            const alert: DistractedAlertMessage = {
              type: "DISTRACTED_ALERT",
              distractedMs: elapsed,
            };
            post(alert);
          }
        }
      } else {
        distractedStartMs = 0;
        distractedAlertSent = false;
      }

      const now = performance.now();
      const shouldSend =
        result.changed ||
        now - lastKeepAliveMs >= 1000;

      if (shouldSend) {
        lastKeepAliveMs = now;
        lastStateUpdate = result.newState;
        const update: StateUpdateMessage = {
          type: "STATE_UPDATE",
          focusState: result.newState,
          focusScore,
          confidence,
        };
        post(update);
      }
      break;
    }

    case "SESSION_PAUSE": {
      // Finalize current segments but keep session alive
      const now = performance.now();
      if (smState) {
        const currentSegments = finalize(smState, now);
        accumulatedSegments = [...accumulatedSegments, ...currentSegments];
        smState = null;
      }
      stopCoverageInterval();
      distractedStartMs = 0;
      distractedAlertSent = false;
      break;
    }

    case "SESSION_RESUME": {
      // Create fresh state machine, preserving accumulated segments
      const smConfig: StateMachineConfig = {
        focusThreshold: config.focusThreshold,
        distractedThreshold: config.distractedThreshold,
        hysteresisFrames: config.hysteresisFrames,
      };
      smState = createStateMachine(smConfig);
      // Re-init coverage from now
      if (coverageState) {
        const now = performance.now();
        coverageState = createCoverageTracker(now, config.targetFps);
      }
      startCoverageInterval();
      distractedStartMs = 0;
      distractedAlertSent = false;
      break;
    }

    case "SESSION_STOP": {
      const endMs = performance.now();
      if (smState || accumulatedSegments.length > 0) {
        const summary = buildSummary(endMs);
        const summaryMsg: SessionSummaryMessage = {
          type: "SESSION_SUMMARY",
          summary,
        };
        post(summaryMsg);
      }
      resetSession();
      break;
    }

    case "START_HEARTBEAT": {
      if (heartbeatIntervalId !== null) {
        clearInterval(heartbeatIntervalId);
      }
      heartbeatIntervalId = setInterval(() => {
        post({ type: "HEARTBEAT_TICK", timestamp: performance.now() });
      }, msg.intervalMs);
      break;
    }

    case "STOP_HEARTBEAT": {
      if (heartbeatIntervalId !== null) {
        clearInterval(heartbeatIntervalId);
        heartbeatIntervalId = null;
      }
      break;
    }

    case "HEARTBEAT_ACK": {
      // Acknowledged — nothing to do
      break;
    }

    case "CHANGE_MODE": {
      studyMode = msg.studyMode;
      break;
    }
  }
});

// ── Signal ready ───────────────────────────────────────────────
post({ type: "WORKER_READY" });
