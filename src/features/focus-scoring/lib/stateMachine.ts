import type { FocusState, FocusSegment } from "@/entities/focus-session";
import { DEFAULT_SESSION_CONFIG } from "@/entities/focus-session";

export interface StateMachineConfig {
  focusThreshold: number;
  distractedThreshold: number;
  hysteresisFrames: number;
}

export interface StateMachineState {
  currentState: FocusState;
  /** How many consecutive frames the candidate state has been seen */
  candidateCount: number;
  /** The candidate state waiting for hysteresis threshold */
  candidateState: FocusState;
  /** Accumulated segments */
  segments: FocusSegment[];
  /** Start time of the current segment */
  segmentStartMs: number;
  /** Running score sum for the current segment */
  segmentScoreSum: number;
  /** Number of frames in the current segment */
  segmentFrameCount: number;
}

export function createStateMachine(
  config: Partial<StateMachineConfig> = {},
): StateMachineState {
  return {
    currentState: "focused",
    candidateCount: 0,
    candidateState: "focused",
    segments: [],
    segmentStartMs: 0,
    segmentScoreSum: 0,
    segmentFrameCount: 0,
  };
}

/** Classify a raw score into a focus state */
export function classifyScore(
  score: number,
  focusThreshold: number = DEFAULT_SESSION_CONFIG.focusThreshold,
  distractedThreshold: number = DEFAULT_SESSION_CONFIG.distractedThreshold,
): FocusState {
  if (score >= focusThreshold) return "focused";
  if (score >= distractedThreshold) return "distracted";
  return "absent";
}

export interface TransitionResult {
  state: StateMachineState;
  changed: boolean;
  newState: FocusState;
}

/**
 * Feed a new score into the state machine.
 * Uses hysteresis to avoid rapid flickering between states.
 */
export function transition(
  state: StateMachineState,
  score: number,
  timestampMs: number,
  config: StateMachineConfig = DEFAULT_SESSION_CONFIG,
): TransitionResult {
  const rawState = classifyScore(
    score,
    config.focusThreshold,
    config.distractedThreshold,
  );

  // Initialize segment start on first call
  if (state.segmentStartMs === 0) {
    state.segmentStartMs = timestampMs;
  }

  state.segmentScoreSum += score;
  state.segmentFrameCount += 1;

  // If raw state matches current → reset candidate
  if (rawState === state.currentState) {
    state.candidateCount = 0;
    state.candidateState = state.currentState;
    return { state, changed: false, newState: state.currentState };
  }

  // New candidate or continuing candidate
  if (rawState === state.candidateState) {
    state.candidateCount += 1;
  } else {
    state.candidateState = rawState;
    state.candidateCount = 1;
  }

  // Check hysteresis threshold
  if (state.candidateCount >= config.hysteresisFrames) {
    // Close current segment
    if (state.segmentFrameCount > 0) {
      state.segments.push({
        state: state.currentState,
        startMs: state.segmentStartMs,
        endMs: timestampMs,
        avgScore:
          state.segmentScoreSum / state.segmentFrameCount,
      });
    }

    // Start new segment
    state.currentState = rawState;
    state.candidateCount = 0;
    state.candidateState = rawState;
    state.segmentStartMs = timestampMs;
    state.segmentScoreSum = score;
    state.segmentFrameCount = 1;

    return { state, changed: true, newState: rawState };
  }

  return { state, changed: false, newState: state.currentState };
}

/** Finalize the state machine — close the last open segment */
export function finalize(
  state: StateMachineState,
  endMs: number,
): FocusSegment[] {
  if (state.segmentFrameCount > 0) {
    state.segments.push({
      state: state.currentState,
      startMs: state.segmentStartMs,
      endMs,
      avgScore: state.segmentScoreSum / state.segmentFrameCount,
    });
  }
  return state.segments;
}
