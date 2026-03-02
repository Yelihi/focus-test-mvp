/// <reference lib="webworker" />

import type {
  MainToWorkerMessage,
  WorkerToMainMessage,
  StateUpdateMessage,
  CoverageUpdateMessage,
  SessionSummaryMessage,
} from "@/shared/types/messages";
import type {
  SessionConfig,
  FocusState,
  StudyMode,
  SessionSummary,
} from "@/entities/focus-session";
import { DEFAULT_SESSION_CONFIG, COVERAGE_UPDATE_INTERVAL_MS } from "@/entities/focus-session";
import { computeFocusScore } from "./focusScorer";
import {
  createStateMachine,
  transition,
  finalize,
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
let studyMode: StudyMode = "desktop";
let smState: StateMachineState | null = null;
let coverageState: CoverageState | null = null;
let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
let coverageIntervalId: ReturnType<typeof setInterval> | null = null;
let lastStateUpdate: FocusState | null = null;
let lastKeepAliveMs = 0;
let sessionStartMs = 0;

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

function buildSummary(endMs: number): SessionSummary {
  const segments = smState ? finalize(smState, endMs) : [];
  const durationMs = endMs - sessionStartMs;

  let focusMs = 0;
  let distractedMs = 0;
  let absentMs = 0;

  for (const seg of segments) {
    const segDuration = seg.endMs - seg.startMs;
    if (seg.state === "focused") focusMs += segDuration;
    else if (seg.state === "distracted") distractedMs += segDuration;
    else absentMs += segDuration;
  }

  const total = focusMs + distractedMs + absentMs || 1;

  return {
    sessionId: sessionId ?? "unknown",
    durationMs,
    focusPercent: (focusMs / total) * 100,
    distractedPercent: (distractedMs / total) * 100,
    absentPercent: (absentMs / total) * 100,
    segments,
    coveragePercent: coverageState
      ? getCoveragePercent(coverageState, endMs)
      : 0,
    effectiveSampleRateHz: coverageState
      ? getEffectiveSampleRate(coverageState, endMs)
      : 0,
  };
}

function resetSession(): void {
  smState = null;
  coverageState = null;
  sessionId = null;
  lastStateUpdate = null;
  lastKeepAliveMs = 0;
  sessionStartMs = 0;

  if (heartbeatIntervalId !== null) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
  }
  if (coverageIntervalId !== null) {
    clearInterval(coverageIntervalId);
    coverageIntervalId = null;
  }
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

      const smConfig: import("./stateMachine").StateMachineConfig = {
        focusThreshold: config.focusThreshold,
        distractedThreshold: config.distractedThreshold,
        hysteresisFrames: config.hysteresisFrames,
      };
      smState = createStateMachine(smConfig);
      coverageState = createCoverageTracker(sessionStartMs, config.targetFps);

      // Periodic coverage updates
      coverageIntervalId = setInterval(
        sendCoverageUpdate,
        COVERAGE_UPDATE_INTERVAL_MS,
      );
      break;
    }

    case "SIGNALS": {
      if (!smState || !coverageState) break;

      const { signals } = msg;
      const { focusScore, confidence } = computeFocusScore(signals, studyMode);

      recordSample(coverageState, signals.timestamp);

      const smConfig: import("./stateMachine").StateMachineConfig = {
        focusThreshold: config.focusThreshold,
        distractedThreshold: config.distractedThreshold,
        hysteresisFrames: config.hysteresisFrames,
      };
      const result = transition(smState, focusScore, signals.timestamp, smConfig);
      smState = result.state;

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

    case "SESSION_STOP": {
      const endMs = performance.now();
      if (smState) {
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
