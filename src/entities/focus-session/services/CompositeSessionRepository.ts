import type { SessionHistoryEntry, BreakLog } from "../models/dtos";
import type { SessionRepository } from "../models/repository";

export class CompositeSessionRepository implements SessionRepository {
  constructor(
    private local: SessionRepository,
    private remote: SessionRepository | null,
  ) {}

  async saveSession(entry: SessionHistoryEntry): Promise<void> {
    await this.local.saveSession(entry);
    this.remote?.saveSession(entry).catch(console.error);
  }

  async updateSessionMemo(sessionId: string, memo: string): Promise<void> {
    await this.local.updateSessionMemo(sessionId, memo);
    this.remote?.updateSessionMemo(sessionId, memo).catch(console.error);
  }

  async saveBreakLog(sessionId: string, log: BreakLog): Promise<void> {
    await this.local.saveBreakLog(sessionId, log);
    this.remote?.saveBreakLog(sessionId, log).catch(console.error);
  }

  async getRecentSessions(limit: number): Promise<SessionHistoryEntry[]> {
    return this.local.getRecentSessions(limit);
  }

  async getAllSessions(): Promise<SessionHistoryEntry[]> {
    return this.local.getAllSessions();
  }

  async getSession(sessionId: string): Promise<SessionHistoryEntry | null> {
    return this.local.getSession(sessionId);
  }

  async getBreakLogs(sessionId: string): Promise<BreakLog[]> {
    return this.local.getBreakLogs(sessionId);
  }

  async getTodaySessions(): Promise<SessionHistoryEntry[]> {
    return this.local.getTodaySessions();
  }
}
