"use client";

import type { SessionSummary } from "@/entities/focus-session";

interface SessionSummaryPanelProps {
  summary: SessionSummary | null;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec}s`;
}

export function SessionSummaryPanel({ summary }: SessionSummaryPanelProps) {
  if (!summary) return null;

  return (
    <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
        Session Summary
      </h2>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Duration</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatDuration(summary.durationMs)}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Focused</span>
          <span className="font-medium text-green-600">
            {Math.round(summary.focusPercent)}%
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Distracted</span>
          <span className="font-medium text-yellow-600">
            {Math.round(summary.distractedPercent)}%
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Absent</span>
          <span className="font-medium text-red-600">
            {Math.round(summary.absentPercent)}%
          </span>
        </div>

        <hr className="border-zinc-200 dark:border-zinc-700" />

        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Breaks</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {summary.breakCount}
          </span>
        </div>

        {summary.avgRecoveryMs > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Avg Recovery</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {formatDuration(summary.avgRecoveryMs)}
            </span>
          </div>
        )}

        {summary.longestContinuousFocusMs > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Longest Focus</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {formatDuration(summary.longestContinuousFocusMs)}
            </span>
          </div>
        )}

        <hr className="border-zinc-200 dark:border-zinc-700" />

        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Coverage</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {Math.round(summary.coveragePercent)}%
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Segments</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {summary.segments.length}
          </span>
        </div>
      </div>
    </div>
  );
}
