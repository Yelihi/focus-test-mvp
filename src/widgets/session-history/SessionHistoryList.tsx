"use client";

import type { SessionHistoryEntry } from "@/entities/focus-session";

interface SessionHistoryListProps {
  entries: SessionHistoryEntry[];
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec}s`;
}

export function SessionHistoryList({ entries }: SessionHistoryListProps) {
  if (entries.length === 0) {
    return (
      <div className="w-full max-w-md text-center text-sm text-zinc-400">
        No session history yet
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="border-b border-zinc-200 px-6 py-4 text-lg font-bold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
        Session History
      </h2>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {entries.map((entry) => (
          <div
            key={`${entry.sessionId}-${entry.endedAt}`}
            className="flex items-center justify-between px-6 py-3 text-sm"
          >
            <span className="text-zinc-500">
              {formatTime(entry.startedAt)} ~ {formatTime(entry.endedAt)}
            </span>

            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {formatDuration(entry.focusedMs)}
            </span>

            <span className="font-medium text-green-600">
              {Math.round(entry.focusPercent)}%
            </span>

            {entry.breakCount > 0 && (
              <span className="text-xs text-zinc-400">
                {entry.breakCount} breaks
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
