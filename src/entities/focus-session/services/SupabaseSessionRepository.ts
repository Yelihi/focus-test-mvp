import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionHistoryEntry, BreakLog } from "../models/dtos";
import type { SessionRepository } from "../models/repository";
import {
  toSessionRow,
  toBreakLogRow,
  toSessionHistoryEntry,
  type SessionRow,
  type BreakLogRow,
} from "./mappers";

export class SupabaseSessionRepository implements SessionRepository {
  constructor(
    private supabase: SupabaseClient,
    private userId: string,
  ) {}

  async saveSession(entry: SessionHistoryEntry): Promise<void> {
    const { error } = await this.supabase
      .from("sessions")
      .upsert(toSessionRow(entry, this.userId));
    if (error) throw error;
  }

  async updateSessionMemo(sessionId: string, memo: string): Promise<void> {
    const { error } = await this.supabase
      .from("sessions")
      .update({ memo })
      .eq("id", sessionId)
      .eq("user_id", this.userId);
    if (error) throw error;
  }

  async getAllSessions(): Promise<SessionHistoryEntry[]> {
    const { data } = await this.supabase
      .from("sessions")
      .select("*, break_logs(*)")
      .eq("user_id", this.userId)
      .order("started_at", { ascending: false });

    return (data ?? []).map((row) =>
      toSessionHistoryEntry(row as SessionRow & { break_logs: BreakLogRow[] }),
    );
  }

  async getRecentSessions(limit: number): Promise<SessionHistoryEntry[]> {
    const { data } = await this.supabase
      .from("sessions")
      .select("*, break_logs(*)")
      .eq("user_id", this.userId)
      .order("started_at", { ascending: false })
      .limit(limit);

    return (data ?? []).map((row) =>
      toSessionHistoryEntry(row as SessionRow & { break_logs: BreakLogRow[] }),
    );
  }

  async getSession(sessionId: string): Promise<SessionHistoryEntry | null> {
    const { data } = await this.supabase
      .from("sessions")
      .select("*, break_logs(*)")
      .eq("id", sessionId)
      .eq("user_id", this.userId)
      .single();

    if (!data) return null;
    return toSessionHistoryEntry(data as SessionRow & { break_logs: BreakLogRow[] });
  }

  async saveBreakLog(sessionId: string, log: BreakLog): Promise<void> {
    const { error } = await this.supabase
      .from("break_logs")
      .upsert(toBreakLogRow(log, sessionId, this.userId));
    if (error) throw error;
  }

  async getBreakLogs(sessionId: string): Promise<BreakLog[]> {
    const { data } = await this.supabase
      .from("break_logs")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", this.userId);

    return (data ?? []).map((b: BreakLogRow) => ({
      breakId: b.id,
      reason: b.reason as BreakLog["reason"],
      memo: b.memo ?? undefined,
      firstStep: b.first_step,
      timerMinutes: b.timer_minutes ?? undefined,
      startedAt: b.started_at,
      resumedAt: b.resumed_at ?? undefined,
      recoveryMs: b.recovery_ms ?? undefined,
    }));
  }

  async getTodaySessions(): Promise<SessionHistoryEntry[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data } = await this.supabase
      .from("sessions")
      .select("*, break_logs(*)")
      .eq("user_id", this.userId)
      .gte("started_at", todayStart.getTime())
      .order("started_at", { ascending: false });

    return (data ?? []).map((row) =>
      toSessionHistoryEntry(row as SessionRow & { break_logs: BreakLogRow[] }),
    );
  }
}
