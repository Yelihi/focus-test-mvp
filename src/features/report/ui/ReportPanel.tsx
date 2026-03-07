"use client";

import { useState } from "react";
import type { SessionSummary } from "@/entities/focus-session";
import { BREAK_REASON_LABELS } from "@/entities/focus-session";
import { analyzePatterns } from "../lib/analyzePatterns";

interface ReportPanelProps {
  summary: SessionSummary;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec}s`;
}

export function ReportPanel({ summary }: ReportPanelProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        리포트 보기
      </button>
    );
  }

  const analysis = analyzePatterns(summary);

  return (
    <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Session Report
        </h2>
        <button
          onClick={() => setOpen(false)}
          className="text-sm text-zinc-400 hover:text-zinc-600"
        >
          접기
        </button>
      </div>

      {/* Metric cards */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
          <p className="text-xs text-zinc-500">Break 횟수</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {analysis.breakCount}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
          <p className="text-xs text-zinc-500">평균 복귀 시간</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {analysis.avgRecoveryMs > 0
              ? formatDuration(analysis.avgRecoveryMs)
              : "-"}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
          <p className="text-xs text-zinc-500">최장 연속 집중</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {analysis.longestContinuousFocusMs > 0
              ? formatDuration(analysis.longestContinuousFocusMs)
              : "-"}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
          <p className="text-xs text-zinc-500">집중도</p>
          <p className="text-xl font-bold text-green-600">
            {Math.round(summary.focusPercent)}%
          </p>
        </div>
      </div>

      {/* Reason distribution */}
      {analysis.reasonDistribution.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            중단 사유 분포
          </p>
          <div className="space-y-1">
            {analysis.reasonDistribution.map(({ reason, count }) => (
              <div
                key={reason}
                className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400"
              >
                <span>{BREAK_REASON_LABELS[reason]}</span>
                <span className="font-medium">{count}회</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      {analysis.comments.length > 0 && (
        <div className="space-y-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          {analysis.comments.map((comment, i) => (
            <p
              key={i}
              className="text-sm text-blue-700 dark:text-blue-300"
            >
              {comment}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
