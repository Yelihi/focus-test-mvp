import type { FaceLandmarker, ObjectDetector } from "@mediapipe/tasks-vision";
import type { FaceSignals } from "@/entities/face-signal";
import { CaptureTimer } from "@/shared/lib/timer";
import { ABSENT_FRAME_THRESHOLD, PHONE_DETECT_INTERVAL } from "../config/constants";
import { extractSignals } from "./extractSignals";

export type SignalCallback = (signals: FaceSignals) => void;

export class CaptureLoop {
  private timer: CaptureTimer;
  private landmarker: FaceLandmarker | null = null;
  private objectDetector: ObjectDetector | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private onSignals: SignalCallback | null = null;
  private lastTimestampMs = -1;
  private lastObjectTimestampMs = -1;
  private noFaceFrames = 0;
  private frameCount = 0;
  private lastPhoneDetected = false;

  constructor(fps: number = 10) {
    this.timer = new CaptureTimer(fps);
  }

  start(
    video: HTMLVideoElement,
    landmarker: FaceLandmarker,
    onSignals: SignalCallback,
    objectDetector?: ObjectDetector,
  ): void {
    this.videoEl = video;
    this.landmarker = landmarker;
    this.objectDetector = objectDetector ?? null;
    this.onSignals = onSignals;
    this.lastTimestampMs = -1;
    this.lastObjectTimestampMs = -1;
    this.noFaceFrames = 0;
    this.frameCount = 0;
    this.lastPhoneDetected = false;

    this.timer.start(video, (timestamp) => {
      this.processFrame(timestamp);
    });
  }

  stop(): void {
    this.timer.stop();
  }

  private processFrame(timestamp: number): void {
    if (!this.landmarker || !this.videoEl || !this.onSignals) return;
    if (this.videoEl.readyState < 2) return;

    // Skip if video has no valid dimensions (stream switching)
    if (this.videoEl.videoWidth === 0 || this.videoEl.videoHeight === 0) return;

    // MediaPipe requires strictly increasing timestamps
    const nowMs = performance.now();
    if (nowMs <= this.lastTimestampMs) return;
    this.lastTimestampMs = nowMs;

    this.frameCount += 1;

    try {
      const result = this.landmarker.detectForVideo(this.videoEl, nowMs);
      const signals = extractSignals(result, nowMs);

      // Run phone detection every PHONE_DETECT_INTERVAL frames
      if (this.objectDetector && this.frameCount % PHONE_DETECT_INTERVAL === 0) {
        const objNowMs = nowMs + 0.001;
        if (objNowMs > this.lastObjectTimestampMs) {
          this.lastObjectTimestampMs = objNowMs;
          try {
            const objResult = this.objectDetector.detectForVideo(this.videoEl, objNowMs);
            const phoneFound = objResult.detections.some(
              (d) => d.categories[0]?.categoryName === "cell phone",
            );
            if (phoneFound !== this.lastPhoneDetected) {
              if (phoneFound) {
                const score = objResult.detections.find(
                  (d) => d.categories[0]?.categoryName === "cell phone",
                )?.categories[0]?.score;
                console.log(`[PhoneDetect] 핸드폰 감지됨 (score: ${score?.toFixed(2)})`);
              } else {
                console.log("[PhoneDetect] 핸드폰 사라짐");
              }
              this.lastPhoneDetected = phoneFound;
            }
          } catch {
            // skip this detection frame
          }
        }
      }

      if (signals) {
        this.noFaceFrames = 0;
        this.onSignals({ ...signals, phoneDetected: this.lastPhoneDetected });
      } else {
        this.noFaceFrames += 1;
        // 짧은 미감지(< 3초) → 무시 (마지막 상태 유지)
        // 긴 미감지(≥ 3초) → absent 신호 전달 (confidence 0)
        if (this.noFaceFrames >= ABSENT_FRAME_THRESHOLD) {
          this.onSignals({
            earLeft: 0, earRight: 0,
            eyeBlinkLeft: 0, eyeBlinkRight: 0,
            eyeLookUpLeft: 0, eyeLookUpRight: 0,
            eyeLookDownLeft: 0, eyeLookDownRight: 0,
            eyeLookInLeft: 0, eyeLookInRight: 0,
            eyeLookOutLeft: 0, eyeLookOutRight: 0,
            headYaw: 0, headPitch: 0, headRoll: 0,
            faceDetectionConfidence: 0,
            phoneDetected: this.lastPhoneDetected,
            timestamp: nowMs,
          });
        }
      }
    } catch {
      // detectForVideo can throw during camera switch — skip this frame
    }
  }

  /** Switch to background mode (timer-based, no rVFC) */
  enterBackground(): void {
    if (!this.videoEl || !this.landmarker || !this.onSignals) return;
    this.timer.startBackground((timestamp) => {
      this.processFrame(timestamp);
    });
  }

  /** Switch back to foreground mode */
  enterForeground(): void {
    if (!this.videoEl || !this.landmarker || !this.onSignals) return;
    this.timer.resumeForeground(this.videoEl, (timestamp) => {
      this.processFrame(timestamp);
    });
  }

  get isRunning(): boolean {
    return this.timer.isRunning;
  }
}
