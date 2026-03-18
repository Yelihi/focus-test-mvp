"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type Dispatch,
  type SetStateAction,
  type MutableRefObject,
} from "react";
import type {
  SessionGoal,
  SessionHistoryEntry,
  BreakLog,
} from "@/entities/focus-session/models";
import { createSessionRepository, cleanupExpiredLocalSessions } from "@/entities/focus-session/services";
import type { SessionRepository } from "@/entities/focus-session/models";
import { useAuth } from "@/shared/lib/supabase";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase/client";
import type { SessionState, SessionManager } from "@/features/session";

interface UseSessionDataOptions {
  sessionState: SessionState;
  sessionStartedAtRef: MutableRefObject<number>;
  managerRef: MutableRefObject<SessionManager | null>;
}

export interface UseSessionDataReturn {
  goal: SessionGoal | null;
  setGoal: Dispatch<SetStateAction<SessionGoal | null>>;
  todaySessions: SessionHistoryEntry[];
  selectedSession: SessionHistoryEntry | null;
  setSelectedSession: Dispatch<SetStateAction<SessionHistoryEntry | null>>;
  handleBreakLogCreated: (log: BreakLog) => void;
  handleSaveFeedback: (sessionId: string, memo: string) => void;
  resetSessionData: () => void;
}

export function useSessionData({
  sessionState,
  sessionStartedAtRef,
  managerRef,
}: UseSessionDataOptions): UseSessionDataReturn {
  const { user, isAuthenticated } = useAuth();
  const repositoryRef = useRef<SessionRepository>(createSessionRepository());

  // Re-create repository whenever auth state changes
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    repositoryRef.current = createSessionRepository({
      isAuthenticated,
      supabase: isAuthenticated ? supabase : undefined,
      userId: user?.id,
    });
  }, [isAuthenticated, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [goal, setGoal] = useState<SessionGoal | null>(null);
  const [todaySessions, setTodaySessions] = useState<SessionHistoryEntry[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionHistoryEntry | null>(null);

  // Load today's sessions on mount + cleanup old sessions
  useEffect(() => {
    repositoryRef.current.getTodaySessions().then(setTodaySessions).catch(() => {});
    cleanupExpiredLocalSessions(24 * 60 * 60 * 1000).catch(() => {});
  }, []);

  // Save session when stopped with summary
  useEffect(() => {
    if (sessionState.status !== "stopped" || !sessionState.summary) return;

    const entry: SessionHistoryEntry = {
      sessionId: sessionState.summary.sessionId,
      startedAt: sessionStartedAtRef.current,
      endedAt: Date.now(),
      status: "stopped",
      durationMs: sessionState.summary.durationMs,
      focusedMs: Math.round(
        (sessionState.summary.focusPercent / 100) * sessionState.summary.durationMs,
      ),
      focusPercent: sessionState.summary.focusPercent,
      breakCount: sessionState.summary.breakCount,
      breaks: sessionState.summary.breaks,
      goal: goal ?? undefined,
      dailyGoalText: goal?.dailyGoalText,
    };

    repositoryRef.current.saveSession(entry).then(() => {
      repositoryRef.current.getTodaySessions().then((sessions) => {
        setTodaySessions(sessions);
        const saved = sessions.find((s) => s.sessionId === entry.sessionId);
        setSelectedSession(saved ?? entry);
      }).catch(() => {
        setSelectedSession(entry);
      });
    }).catch(console.error);
  }, [sessionState.status, sessionState.summary, goal, sessionStartedAtRef]);

  const handleBreakLogCreated = useCallback(
    (log: BreakLog) => {
      const manager = managerRef.current;
      if (!manager) return;
      manager.addBreakLog(log);
      const sessionId = manager.getSessionId();
      if (sessionId) {
        repositoryRef.current.saveBreakLog(sessionId, log).catch(() => {});
      }
    },
    [managerRef],
  );

  const handleSaveFeedback = useCallback((sessionId: string, memo: string) => {
    repositoryRef.current.updateSessionMemo(sessionId, memo).catch(() => {});
    setTodaySessions((prev) =>
      prev.map((s) => (s.sessionId === sessionId ? { ...s, memo } : s)),
    );
  }, []);

  const resetSessionData = useCallback(() => {
    setGoal(null);
    setSelectedSession(null);
  }, []);

  return {
    goal,
    setGoal,
    todaySessions,
    selectedSession,
    setSelectedSession,
    handleBreakLogCreated,
    handleSaveFeedback,
    resetSessionData,
  };
}
