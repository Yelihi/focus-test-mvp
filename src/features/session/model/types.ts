import type { FaceSignals } from "@/entities/face-signal";
import type { FocusState, SessionSummary, SessionStatus } from "@/entities/focus-session";

export type { SessionStatus };

export interface SessionState {
  status: SessionStatus;
  focusState: FocusState;
  focusScore: number;
  confidence: number;
  coveragePercent: number;
  effectiveSampleRateHz: number;
  elapsedMs: number;
  summary: SessionSummary | null;
  breakCount: number;
}

export type StateListener = (state: SessionState) => void;
export type DistractedAlertListener = (distractedMs: number) => void;
export type SignalCallback = (signals: FaceSignals) => void;

export interface ICaptureController {
  start(
    video: HTMLVideoElement,
    landmarker: import("@mediapipe/tasks-vision").FaceLandmarker,
    onSignals: SignalCallback,
    objectDetector?: import("@mediapipe/tasks-vision").ObjectDetector,
  ): void;
  stop(): void;
  enterBackground(): void;
  enterForeground(): void;
  setRawResultCallback?(cb: ((result: import("@mediapipe/tasks-vision").FaceLandmarkerResult) => void) | null): void;
}
