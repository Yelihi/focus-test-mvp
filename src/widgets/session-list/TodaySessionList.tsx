"use client";

import type { SessionHistoryEntry } from "@/entities/focus-session/models";

interface TodaySessionListProps {
  sessions: SessionHistoryEntry[];
  onSessionClick: (session: SessionHistoryEntry) => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${min}m`;
  return `${min}m`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function TodaySessionList({ sessions, onSessionClick }: TodaySessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <p className="text-xs text-zinc-400">진행 중인 세션이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-100">
      {sessions.map((session) => (
        <button
          key={session.sessionId}
          onClick={() => onSessionClick(session)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors text-left"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-800 truncate">
              {session.dailyGoalText ?? session.goal?.dailyGoalText ?? "세션 기록"}
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {formatTime(session.startedAt)} — {formatTime(session.endedAt)}
            </p>
          </div>
          <div className="ml-3 shrink-0 text-right">
            <p className="text-xs font-medium text-zinc-600">{formatDuration(session.durationMs)}</p>
            <p className="text-xs text-emerald-600 mt-0.5">{Math.round(session.focusPercent)}% 집중</p>
          </div>
        </button>
      ))}
    </div>
  );
}
