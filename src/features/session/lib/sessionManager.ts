import type {
  FaceSignals,
  SessionConfig,
  SessionSummary,
  FocusState,
  StudyMode,
  SessionStatus,
  BreakLog,
} from "@/entities/focus-session";
import { DEFAULT_SESSION_CONFIG, HEARTBEAT_INTERVAL_MS } from "@/entities/focus-session";
import type { WorkerToMainMessage } from "@/shared/types/messages";
import { WorkerBridge } from "@/shared/lib/workerBridge";
import { CaptureLoop } from "@/features/detection";

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

type StateListener = (state: SessionState) => void;
type DistractedAlertListener = (distractedMs: number) => void;

export class SessionManager {
  private bridge: WorkerBridge;
  private captureLoop: CaptureLoop;
  private config: SessionConfig;
  private state: SessionState;
  private listeners = new Set<StateListener>();
  private distractedAlertListeners = new Set<DistractedAlertListener>();
  private sessionId: string | null = null;
  private startTime = 0;
  private totalPausedMs = 0;
  private breakStartMs = 0;
  private elapsedTimerId: ReturnType<typeof setInterval> | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private landmarker: import("@mediapipe/tasks-vision").FaceLandmarker | null = null;
  private breakLogs: BreakLog[] = [];

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
      breakCount: 0,
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

  onDistractedAlert(listener: DistractedAlertListener): () => void {
    this.distractedAlertListeners.add(listener);
    return () => this.distractedAlertListeners.delete(listener);
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
      case "SESSION_SUMMARY": {
        // Enrich summary with break data from SessionManager
        const summary = this.enrichSummary(msg.summary);
        this.updateState({
          status: "stopped",
          summary,
        });
        break;
      }
      case "HEARTBEAT_TICK":
        this.bridge.send({
          type: "HEARTBEAT_ACK",
          timestamp: msg.timestamp,
        });
        break;
      case "DISTRACTED_ALERT":
        this.distractedAlertListeners.forEach((fn) => fn(msg.distractedMs));
        break;
    }
  };

  private enrichSummary(summary: SessionSummary): SessionSummary {
    const totalBreakMs = this.breakLogs.reduce(
      (sum, b) => sum + (b.recoveryMs ?? 0),
      0,
    );
    const recoveries = this.breakLogs
      .filter((b) => b.recoveryMs != null)
      .map((b) => b.recoveryMs!);
    const avgRecoveryMs =
      recoveries.length > 0
        ? recoveries.reduce((a, b) => a + b, 0) / recoveries.length
        : 0;

    return {
      ...summary,
      breakCount: this.breakLogs.length,
      breaks: [...this.breakLogs],
      totalBreakMs,
      avgRecoveryMs,
    };
  }

  async start(
    video: HTMLVideoElement,
    landmarker: import("@mediapipe/tasks-vision").FaceLandmarker,
  ): Promise<void> {
    this.videoEl = video;
    this.landmarker = landmarker;
    this.sessionId = crypto.randomUUID();
    this.startTime = performance.now();
    this.totalPausedMs = 0;
    this.breakLogs = [];

    this.updateState({
      ...this.createInitialState(),
      status: "running",
    });

    this.bridge.send({
      type: "SESSION_START",
      sessionId: this.sessionId,
      config: this.config,
    });

    this.captureLoop.start(video, landmarker, (signals: FaceSignals) => {
      this.bridge.send({ type: "SIGNALS", signals });
    });

    this.startElapsedTimer();
  }

  private startElapsedTimer(): void {
    this.stopElapsedTimer();
    this.elapsedTimerId = setInterval(() => {
      if (this.state.status === "running") {
        this.updateState({
          elapsedMs: performance.now() - this.startTime - this.totalPausedMs,
        });
      }
    }, 1000);
  }

  private stopElapsedTimer(): void {
    if (this.elapsedTimerId) {
      clearInterval(this.elapsedTimerId);
      this.elapsedTimerId = null;
    }
  }

  takeBreak(): void {
    if (this.state.status !== "running") return;

    this.captureLoop.stop();
    this.bridge.send({ type: "SESSION_PAUSE" });
    this.bridge.send({ type: "STOP_HEARTBEAT" });
    this.breakStartMs = performance.now();

    this.updateState({
      status: "break",
    });
  }

  addBreakLog(log: BreakLog): void {
    this.breakLogs.push(log);
    this.updateState({ breakCount: this.breakLogs.length });
  }

  resume(): void {
    if (this.state.status !== "break") return;

    const now = performance.now();
    if (this.breakStartMs > 0) {
      this.totalPausedMs += now - this.breakStartMs;
      this.breakStartMs = 0;
    }

    this.bridge.send({ type: "SESSION_RESUME" });

    if (this.videoEl && this.landmarker) {
      this.captureLoop.start(this.videoEl, this.landmarker, (signals: FaceSignals) => {
        this.bridge.send({ type: "SIGNALS", signals });
      });
    }

    this.updateState({
      status: "running",
    });
  }

  stop(): void {
    if (this.state.status === "idle") return;

    this.captureLoop.stop();

    if (this.state.status === "break" && this.breakStartMs > 0) {
      this.totalPausedMs += performance.now() - this.breakStartMs;
      this.breakStartMs = 0;
    }

    this.bridge.send({ type: "SESSION_STOP" });
    this.bridge.send({ type: "STOP_HEARTBEAT" });
    this.stopElapsedTimer();
    // State will be updated to "stopped" when SESSION_SUMMARY arrives
  }

  private handleVisibilityChange = (): void => {
    if (this.state.status !== "running") return;

    if (document.hidden) {
      this.captureLoop.enterBackground();
      this.bridge.send({
        type: "START_HEARTBEAT",
        intervalMs: HEARTBEAT_INTERVAL_MS,
      });
    } else {
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
    this.stopElapsedTimer();
    this.listeners.clear();
    this.distractedAlertListeners.clear();
  }

  setStudyMode(mode: StudyMode): void {
    this.config = { ...this.config, studyMode: mode };
    this.bridge.send({ type: "CHANGE_MODE", studyMode: mode });
  }

  getState(): SessionState {
    return { ...this.state };
  }

  getBreakLogs(): BreakLog[] {
    return [...this.breakLogs];
  }

  getSessionId(): string | null {
    return this.sessionId;
  }
}
