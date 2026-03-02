import type { FaceSignals, SessionConfig, SessionSummary, FocusState, StudyMode } from "@/entities/focus-session";
import { DEFAULT_SESSION_CONFIG, HEARTBEAT_INTERVAL_MS } from "@/entities/focus-session";
import type { WorkerToMainMessage } from "@/shared/types/messages";
import { WorkerBridge } from "@/shared/lib/workerBridge";
import { CaptureLoop } from "@/features/detection";

export type SessionStatus = "idle" | "active" | "paused";

export interface SessionState {
  status: SessionStatus;
  focusState: FocusState;
  focusScore: number;
  confidence: number;
  coveragePercent: number;
  effectiveSampleRateHz: number;
  elapsedMs: number;
  summary: SessionSummary | null;
}

type StateListener = (state: SessionState) => void;

export class SessionManager {
  private bridge: WorkerBridge;
  private captureLoop: CaptureLoop;
  private config: SessionConfig;
  private state: SessionState;
  private listeners = new Set<StateListener>();
  private sessionId: string | null = null;
  private startTime = 0;
  private elapsedTimerId: ReturnType<typeof setInterval> | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private landmarker: import("@mediapipe/tasks-vision").FaceLandmarker | null = null;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_SESSION_CONFIG, ...config };
    this.bridge = new WorkerBridge();
    this.captureLoop = new CaptureLoop(this.config.targetFps);
    this.state = this.createInitialState();
  }

  private createInitialState(): SessionState {
    return {
      status: "idle",
      focusState: "focused",
      focusScore: 0,
      confidence: 0,
      coveragePercent: 100,
      effectiveSampleRateHz: 0,
      elapsedMs: 0,
      summary: null,
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn({ ...this.state }));
  }

  private updateState(partial: Partial<SessionState>): void {
    Object.assign(this.state, partial);
    this.notify();
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  async init(): Promise<void> {
    await this.bridge.init();
    this.bridge.on(this.handleWorkerMessage);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  private handleWorkerMessage = (msg: WorkerToMainMessage): void => {
    switch (msg.type) {
      case "STATE_UPDATE":
        this.updateState({
          focusState: msg.focusState,
          focusScore: msg.focusScore,
          confidence: msg.confidence,
        });
        break;
      case "COVERAGE_UPDATE":
        this.updateState({
          coveragePercent: msg.coveragePercent,
          effectiveSampleRateHz: msg.effectiveSampleRateHz,
        });
        break;
      case "SESSION_SUMMARY":
        this.updateState({
          status: "paused",
          summary: msg.summary,
        });
        break;
      case "HEARTBEAT_TICK":
        // Respond with ACK so worker knows main thread is alive
        this.bridge.send({
          type: "HEARTBEAT_ACK",
          timestamp: msg.timestamp,
        });
        break;
    }
  };

  async start(
    video: HTMLVideoElement,
    landmarker: import("@mediapipe/tasks-vision").FaceLandmarker,
  ): Promise<void> {
    this.videoEl = video;
    this.landmarker = landmarker;
    this.sessionId = crypto.randomUUID();
    this.startTime = performance.now();

    this.updateState({
      ...this.createInitialState(),
      status: "active",
    });

    this.bridge.send({
      type: "SESSION_START",
      sessionId: this.sessionId,
      config: this.config,
    });

    this.captureLoop.start(video, landmarker, (signals: FaceSignals) => {
      this.bridge.send({ type: "SIGNALS", signals });
    });

    // Elapsed timer
    this.elapsedTimerId = setInterval(() => {
      if (this.state.status === "active") {
        this.updateState({
          elapsedMs: performance.now() - this.startTime,
        });
      }
    }, 1000);
  }

  pause(): void {
    if (this.state.status !== "active") return;

    this.captureLoop.stop();
    this.bridge.send({ type: "SESSION_STOP" });
    this.bridge.send({ type: "STOP_HEARTBEAT" });

    if (this.elapsedTimerId) {
      clearInterval(this.elapsedTimerId);
      this.elapsedTimerId = null;
    }
    // State will be updated to "paused" when SESSION_SUMMARY arrives
  }

  reset(): void {
    this.captureLoop.stop();

    if (this.state.status === "active") {
      this.bridge.send({ type: "SESSION_STOP" });
      this.bridge.send({ type: "STOP_HEARTBEAT" });
    }

    if (this.elapsedTimerId) {
      clearInterval(this.elapsedTimerId);
      this.elapsedTimerId = null;
    }

    this.updateState(this.createInitialState());
  }

  private handleVisibilityChange = (): void => {
    if (this.state.status !== "active") return;

    if (document.hidden) {
      // Entering background — switch to heartbeat-driven capture
      this.captureLoop.enterBackground();
      this.bridge.send({
        type: "START_HEARTBEAT",
        intervalMs: HEARTBEAT_INTERVAL_MS,
      });
    } else {
      // Returning to foreground — restore rVFC capture
      this.bridge.send({ type: "STOP_HEARTBEAT" });
      if (this.videoEl && this.landmarker) {
        this.captureLoop.enterForeground();
      }
    }
  };

  destroy(): void {
    this.captureLoop.stop();
    this.bridge.off(this.handleWorkerMessage);
    this.bridge.terminate();
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);

    if (this.elapsedTimerId) {
      clearInterval(this.elapsedTimerId);
    }
    this.listeners.clear();
  }

  setStudyMode(mode: StudyMode): void {
    this.config = { ...this.config, studyMode: mode };
    this.bridge.send({ type: "CHANGE_MODE", studyMode: mode });
  }

  getState(): SessionState {
    return { ...this.state };
  }
}
