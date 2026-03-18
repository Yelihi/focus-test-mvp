import type { BreakLog, SessionSummary } from "@/entities/focus-session";

export class BreakBookkeeper {
  private logs: BreakLog[] = [];

  addLog(log: BreakLog): void {
    this.logs.push(log);
  }

  getLogs(): BreakLog[] {
    return [...this.logs];
  }

  get count(): number {
    return this.logs.length;
  }

  enrichSummary(summary: SessionSummary): SessionSummary {
    const totalBreakMs = this.logs.reduce(
      (sum, b) => sum + (b.recoveryMs ?? 0),
      0,
    );
    const recoveries = this.logs
      .filter((b) => b.recoveryMs != null)
      .map((b) => b.recoveryMs!);
    const avgRecoveryMs =
      recoveries.length > 0
        ? recoveries.reduce((a, b) => a + b, 0) / recoveries.length
        : 0;

    return {
      ...summary,
      breakCount: this.logs.length,
      breaks: [...this.logs],
      totalBreakMs,
      avgRecoveryMs,
    };
  }

  reset(): void {
    this.logs = [];
  }
}
