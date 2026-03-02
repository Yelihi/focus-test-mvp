"use client";

import type { FocusState } from "@/entities/focus-session";

interface FocusHUDProps {
  focusState: FocusState;
  focusScore: number;
  confidence: number;
  coveragePercent: number;
  elapsedMs: number;
  isActive: boolean;
}

const STATE_COLORS: Record<FocusState, string> = {
  focused: "bg-green-500",
  distracted: "bg-yellow-500",
  absent: "bg-red-500",
};

const STATE_LABELS: Record<FocusState, string> = {
  focused: "Focused",
  distracted: "Distracted",
  absent: "Absent",
};

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export function FocusHUD({
  focusState,
  focusScore,
  confidence,
  coveragePercent,
  elapsedMs,
  isActive,
}: FocusHUDProps) {
  if (!isActive) return null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* State indicator */}
      <div className="flex items-center gap-3">
        <div
          className={`h-4 w-4 rounded-full ${STATE_COLORS[focusState]}`}
        />
        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {STATE_LABELS[focusState]}
        </span>
      </div>

      {/* Score bar */}
      <div>
        <div className="mb-1 flex justify-between text-sm text-zinc-500">
          <span>Focus Score</span>
          <span>{Math.round(focusScore * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${focusScore * 100}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-6 text-sm text-zinc-500 dark:text-zinc-400">
        <div>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {formatTime(elapsedMs)}
          </span>{" "}
          elapsed
        </div>
        <div>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {Math.round(coveragePercent)}%
          </span>{" "}
          coverage
        </div>
        <div>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {Math.round(confidence * 100)}%
          </span>{" "}
          confidence
        </div>
      </div>
    </div>
  );
}
