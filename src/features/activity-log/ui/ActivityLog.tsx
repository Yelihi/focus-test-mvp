"use client";

import type { ActivityLogEntry } from "@/entities/focus-session/model";

interface ActivityLogProps {
  entries: ActivityLogEntry[];
}

const TYPE_STYLES: Record<ActivityLogEntry["type"], { dot: string; label: string }> = {
  session_start: { dot: "bg-blue-500", label: "시작" },
  session_stop:  { dot: "bg-zinc-400", label: "종료" },
  break_start:   { dot: "bg-amber-400", label: "휴식" },
  break_end:     { dot: "bg-emerald-500", label: "재개" },
  distracted:    { dot: "bg-orange-400", label: "집중 저하" },
};

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function ActivityLog({ entries }: ActivityLogProps) {
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-zinc-400">
        아직 활동 기록이 없습니다
      </p>
    );
  }

  return (
    <div className="max-h-56 overflow-y-auto">
      <ul className="divide-y divide-zinc-100">
        {entries.map((entry) => {
          const style = TYPE_STYLES[entry.type];
          return (
            <li key={entry.id} className="flex items-center gap-3 py-2">
              <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
              <span className="flex-1 truncate text-xs text-zinc-600">{entry.message}</span>
              <span className="shrink-0 font-mono text-xs text-zinc-400">
                {formatTimestamp(entry.timestamp)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
