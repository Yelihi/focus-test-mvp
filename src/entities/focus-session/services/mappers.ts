import type { SessionHistoryEntry, BreakLog } from "../models/dtos";

// ─── DB row types ──────────────────────────────────────────────────────────────

export interface SessionRow {
  id: string;
  user_id: string;
  started_at: number;
  ended_at: number;
  duration_ms: number;
  focused_ms: number;
  focus_percent: number;
  break_count: number;
  goal: SessionHistoryEntry["goal"] | null;
  daily_goal_text: string | null;
  memo: string | null;
}

export interface BreakLogRow {
  id: string;
  session_id: string;
  user_id: string;
  reason: string;
  memo: string | null;
  first_step: string;
  timer_minutes: number | null;
  started_at: number;
  resumed_at: number | null;
  recovery_ms: number | null;
}

// ─── Mappers ───────────────────────────────────────────────────────────────────

export function toSessionRow(
  entry: SessionHistoryEntry,
  userId: string,
): SessionRow {
  return {
    id: entry.sessionId,
    user_id: userId,
    started_at: Math.round(entry.startedAt),
    ended_at: Math.round(entry.endedAt),
    duration_ms: Math.round(entry.durationMs),
    focused_ms: Math.round(entry.focusedMs),
    focus_percent: entry.focusPercent,
    break_count: entry.breakCount,
    goal: entry.goal ?? null,
    daily_goal_text: entry.dailyGoalText ?? null,
    memo: entry.memo ?? null,
  };
}

export function toBreakLogRow(
  log: BreakLog,
  sessionId: string,
  userId: string,
): BreakLogRow {
  return {
    id: log.breakId,
    session_id: sessionId,
    user_id: userId,
    reason: log.reason,
    memo: log.memo ?? null,
    first_step: log.firstStep,
    timer_minutes: log.timerMinutes ?? null,
    started_at: Math.round(log.startedAt),
    resumed_at: log.resumedAt != null ? Math.round(log.resumedAt) : null,
    recovery_ms: log.recoveryMs != null ? Math.round(log.recoveryMs) : null,
  };
}

export function toSessionHistoryEntry(
  row: SessionRow & { break_logs?: BreakLogRow[] },
): SessionHistoryEntry {
  const breaks: BreakLog[] = (row.break_logs ?? []).map((b) => ({
    breakId: b.id,
    reason: b.reason as BreakLog["reason"],
    memo: b.memo ?? undefined,
    firstStep: b.first_step,
    timerMinutes: b.timer_minutes ?? undefined,
    startedAt: b.started_at,
    resumedAt: b.resumed_at ?? undefined,
    recoveryMs: b.recovery_ms ?? undefined,
  }));

  return {
    sessionId: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: "stopped",
    durationMs: row.duration_ms,
    focusedMs: row.focused_ms,
    focusPercent: row.focus_percent,
    breakCount: row.break_count,
    breaks,
    goal: row.goal ?? undefined,
    dailyGoalText: row.daily_goal_text ?? undefined,
    memo: row.memo ?? undefined,
  };
}
