import type { FaceSignals } from "@/entities/face-signal";
import type {
  SessionConfig,
  SessionSummary,
  StudyMode,
  BreakLog,
} from "@/entities/focus-session";
import { DEFAULT_SESSION_CONFIG } from "@/entities/focus-session";
import { HEARTBEAT_INTERVAL_MS } from "@/shared/config/timing";
import type { WorkerToMainMessage } from "@/shared/types/messages";
import { WorkerBridge } from "@/shared/lib/workerBridge";
import type { SessionState, StateListener, DistractedAlertListener, ICaptureController } from "../model";
import { ElapsedTimer } from "./elapsedTimer";
import { BreakBookkeeper } from "./breakBookkeeper";

export type { SessionState };
export type { SessionStatus } from "../model";

export class SessionManager {
  private bridge: WorkerBridge;
  private capture: ICaptureController;
  private config: SessionConfig;
  private state: SessionState;
  private listeners = new Set<StateListener>();
  private distractedAlertListeners = new Set<DistractedAlertListener>();
  private sessionId: string | null = null;
  private timer = new ElapsedTimer();
  private breaks = new BreakBookkeeper();
  private videoEl: HTMLVideoElement | null = null;
  private landmarker: import("@mediapipe/tasks-vision").FaceLandmarker | null = null;
  private objectDetector: import("@mediapipe/tasks-vision").ObjectDetector | null = null;

  constructor(config: Partial<SessionConfig> = {}, captureController: ICaptureController) {
    this.config = { ...DEFAULT_SESSION_CONFIG, ...config };
    this.bridge = new WorkerBridge();
    this.capture = captureController;
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
        const summary = this.breaks.enrichSummary(msg.summary);
        this.updateState({ status: "stopped", summary });
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

  async start(
    video: HTMLVideoElement,
    landmarker: import("@mediapipe/tasks-vision").FaceLandmarker,
    objectDetector?: import("@mediapipe/tasks-vision").ObjectDetector,
  ): Promise<void> {
    this.videoEl = video;
    this.landmarker = landmarker;
    this.objectDetector = objectDetector ?? null;
    this.sessionId = crypto.randomUUID();
    this.breaks.reset();

    this.updateState({
      ...this.createInitialState(),
      status: "running",
    });

    this.bridge.send({
      type: "SESSION_START",
      sessionId: this.sessionId,
      config: this.config,
    });

    this.capture.start(video, landmarker, (signals: FaceSignals) => {
      this.bridge.send({ type: "SIGNALS", signals });
    }, this.objectDetector ?? undefined);

    this.timer.start((elapsedMs) => {
      if (this.state.status === "running") {
        this.updateState({ elapsedMs });
      }
    });
  }

  takeBreak(): void {
    if (this.state.status !== "running") return;

    this.capture.stop();
    this.bridge.send({ type: "SESSION_PAUSE" });
    this.bridge.send({ type: "STOP_HEARTBEAT" });
    this.timer.pause();

    this.updateState({ status: "break" });
  }

  addBreakLog(log: BreakLog): void {
    this.breaks.addLog(log);
    this.updateState({ breakCount: this.breaks.count });
  }

  resume(): void {
    if (this.state.status !== "break") return;

    this.timer.resume();
    this.bridge.send({ type: "SESSION_RESUME" });

    if (this.videoEl && this.landmarker) {
      this.capture.start(this.videoEl, this.landmarker, (signals: FaceSignals) => {
        this.bridge.send({ type: "SIGNALS", signals });
      }, this.objectDetector ?? undefined);
    }

    this.updateState({ status: "running" });
  }

  stop(): void {
    if (this.state.status === "idle") return;

    this.capture.stop();
    this.timer.finalizePause();
    this.timer.stop();

    this.bridge.send({ type: "SESSION_STOP" });
    this.bridge.send({ type: "STOP_HEARTBEAT" });
    // State will be updated to "stopped" when SESSION_SUMMARY arrives
  }

  private handleVisibilityChange = (): void => {
    if (this.state.status !== "running") return;

    if (document.hidden) {
      this.capture.enterBackground();
      this.bridge.send({
        type: "START_HEARTBEAT",
        intervalMs: HEARTBEAT_INTERVAL_MS,
      });
    } else {
      this.bridge.send({ type: "STOP_HEARTBEAT" });
      if (this.videoEl && this.landmarker) {
        this.capture.enterForeground();
      }
    }
  };

  destroy(): void {
    this.capture.stop();
    this.bridge.off(this.handleWorkerMessage);
    this.bridge.terminate();
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.timer.stop();
    this.listeners.clear();
    this.distractedAlertListeners.clear();
  }

  setRawResultCallback(cb: ((result: import("@mediapipe/tasks-vision").FaceLandmarkerResult) => void) | null): void {
    this.capture.setRawResultCallback?.(cb);
  }

  setStudyMode(mode: StudyMode): void {
    this.config = { ...this.config, studyMode: mode };
    this.bridge.send({ type: "CHANGE_MODE", studyMode: mode });
  }

  getState(): SessionState {
    return { ...this.state };
  }

  getBreakLogs(): BreakLog[] {
    return this.breaks.getLogs();
  }

  getSessionId(): string | null {
    return this.sessionId;
  }
}
