export {
  computeFocusScore,
  createStateMachine,
  classifyScore,
  transition,
  finalize,
  createCoverageTracker,
  recordSample,
  getCoveragePercent,
  getEffectiveSampleRate,
} from "./lib";
export type {
  ScoreResult,
  StateMachineConfig,
  StateMachineState,
  TransitionResult,
  CoverageState,
} from "./lib";
