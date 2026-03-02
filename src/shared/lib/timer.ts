/**
 * Capture loop abstraction that uses requestVideoFrameCallback (rVFC)
 * when available, falling back to requestAnimationFrame or setInterval.
 */

type FrameCallback = (timestamp: number) => void;

export class CaptureTimer {
  private running = false;
  private videoEl: HTMLVideoElement | null = null;
  private rafId: number | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastCaptureTime = 0;
  private targetIntervalMs: number;

  constructor(private fps: number = 10) {
    this.targetIntervalMs = 1000 / fps;
  }

  start(video: HTMLVideoElement, callback: FrameCallback): void {
    this.videoEl = video;
    this.running = true;
    this.lastCaptureTime = 0;

    if ("requestVideoFrameCallback" in video) {
      this.startRvfc(video, callback);
    } else {
      this.startRaf(callback);
    }
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private startRvfc(video: HTMLVideoElement, callback: FrameCallback): void {
    const tick = (_now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata) => {
      if (!this.running) return;
      const elapsed = metadata.presentationTime - this.lastCaptureTime;
      if (elapsed >= this.targetIntervalMs) {
        this.lastCaptureTime = metadata.presentationTime;
        callback(metadata.presentationTime);
      }
      (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: typeof tick) => number })
        .requestVideoFrameCallback(tick);
    };
    (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: typeof tick) => number })
      .requestVideoFrameCallback(tick);
  }

  private startRaf(callback: FrameCallback): void {
    const tick = (timestamp: number) => {
      if (!this.running) return;
      const elapsed = timestamp - this.lastCaptureTime;
      if (elapsed >= this.targetIntervalMs) {
        this.lastCaptureTime = timestamp;
        callback(timestamp);
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  /** Switch to background mode using setInterval fallback */
  startBackground(callback: FrameCallback, intervalMs: number = 500): void {
    this.stop();
    this.running = true;
    this.intervalId = setInterval(() => {
      if (!this.running) return;
      callback(performance.now());
    }, intervalMs);
  }

  /** Switch back to foreground mode with video element */
  resumeForeground(video: HTMLVideoElement, callback: FrameCallback): void {
    this.stop();
    this.start(video, callback);
  }

  get isRunning(): boolean {
    return this.running;
  }
}
