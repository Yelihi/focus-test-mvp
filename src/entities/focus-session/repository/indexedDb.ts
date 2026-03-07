import type { SessionHistoryEntry, BreakLog } from "../model/types";
import type { SessionRepository } from "./sessionRepository";

const DB_NAME = "focus-app";
const DB_VERSION = 1;
const SESSIONS_STORE = "sessions";
const BREAK_LOGS_STORE = "breakLogs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: "sessionId" });
      }
      if (!db.objectStoreNames.contains(BREAK_LOGS_STORE)) {
        const store = db.createObjectStore(BREAK_LOGS_STORE, { keyPath: "breakId" });
        store.createIndex("sessionId", "sessionId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class IndexedDbSessionRepository implements SessionRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDb();
    }
    return this.dbPromise;
  }

  async saveSession(entry: SessionHistoryEntry): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSIONS_STORE, "readwrite");
      tx.objectStore(SESSIONS_STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getRecentSessions(limit: number): Promise<SessionHistoryEntry[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSIONS_STORE, "readonly");
      const request = tx.objectStore(SESSIONS_STORE).getAll();
      request.onsuccess = () => {
        const all = request.result as SessionHistoryEntry[];
        // Sort by startedAt descending
        all.sort((a, b) => b.startedAt - a.startedAt);
        resolve(all.slice(0, limit));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSessions(): Promise<SessionHistoryEntry[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSIONS_STORE, "readonly");
      const request = tx.objectStore(SESSIONS_STORE).getAll();
      request.onsuccess = () => {
        const all = request.result as SessionHistoryEntry[];
        all.sort((a, b) => b.startedAt - a.startedAt);
        resolve(all);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getSession(sessionId: string): Promise<SessionHistoryEntry | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSIONS_STORE, "readonly");
      const request = tx.objectStore(SESSIONS_STORE).get(sessionId);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveBreakLog(sessionId: string, log: BreakLog): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BREAK_LOGS_STORE, "readwrite");
      tx.objectStore(BREAK_LOGS_STORE).put({ ...log, sessionId });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getBreakLogs(sessionId: string): Promise<BreakLog[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BREAK_LOGS_STORE, "readonly");
      const index = tx.objectStore(BREAK_LOGS_STORE).index("sessionId");
      const request = index.getAll(sessionId);
      request.onsuccess = () => resolve(request.result as BreakLog[]);
      request.onerror = () => reject(request.error);
    });
  }
}
