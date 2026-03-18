export class ElapsedTimer {
  private startTime = 0;
  private totalPausedMs = 0;
  private breakStartMs = 0;
  private timerId: ReturnType<typeof setInterval> | null = null;

  start(onTick: (elapsedMs: number) => void): void {
    this.stop();
    this.startTime = performance.now();
    this.totalPausedMs = 0;
    this.breakStartMs = 0;
    this.timerId = setInterval(() => {
      onTick(this.getElapsedMs());
    }, 1000);
  }

  stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  pause(): void {
    this.breakStartMs = performance.now();
  }

  resume(): void {
    if (this.breakStartMs > 0) {
      this.totalPausedMs += performance.now() - this.breakStartMs;
      this.breakStartMs = 0;
    }
  }

  /** Account for break time if currently paused (e.g. stop during break) */
  finalizePause(): void {
    if (this.breakStartMs > 0) {
      this.totalPausedMs += performance.now() - this.breakStartMs;
      this.breakStartMs = 0;
    }
  }

  getElapsedMs(): number {
    return performance.now() - this.startTime - this.totalPausedMs;
  }
}
