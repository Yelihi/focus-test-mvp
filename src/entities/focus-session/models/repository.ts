import type { SessionHistoryEntry, BreakLog } from "./dtos";

export interface SessionRepository {
  saveSession(entry: SessionHistoryEntry): Promise<void>;
  getRecentSessions(limit: number): Promise<SessionHistoryEntry[]>;
  getAllSessions(): Promise<SessionHistoryEntry[]>;
  getSession(sessionId: string): Promise<SessionHistoryEntry | null>;
  saveBreakLog(sessionId: string, log: BreakLog): Promise<void>;
  getBreakLogs(sessionId: string): Promise<BreakLog[]>;
  getTodaySessions(): Promise<SessionHistoryEntry[]>;
  updateSessionMemo(sessionId: string, memo: string): Promise<void>;
}
