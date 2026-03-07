import type { SessionHistoryEntry, BreakLog } from "../model/types";

export interface SessionRepository {
  saveSession(entry: SessionHistoryEntry): Promise<void>;
  getRecentSessions(limit: number): Promise<SessionHistoryEntry[]>;
  getAllSessions(): Promise<SessionHistoryEntry[]>;
  getSession(sessionId: string): Promise<SessionHistoryEntry | null>;
  saveBreakLog(sessionId: string, log: BreakLog): Promise<void>;
  getBreakLogs(sessionId: string): Promise<BreakLog[]>;
}
