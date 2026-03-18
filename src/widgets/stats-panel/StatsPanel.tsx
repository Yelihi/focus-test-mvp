"use client";

import type { SessionGoal, SessionStatus, StudyMode } from "@/entities/focus-session/models";
import { ProgressBar } from "@/shared/ui";

interface StatsPanelProps {
  goal: SessionGoal | null;
  elapsedMs: number;
  focusedMs: number;
  focusScore: number;
  status: SessionStatus;
  studyMode: StudyMode;
  onStudyModeChange: (mode: StudyMode) => void;
  backgroundBlurEnabled?: boolean;
  onOpenSettings?: () => void;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export function StatsPanel({
  goal,
  elapsedMs,
  focusedMs,
  focusScore,
  status,
  studyMode,
  onStudyModeChange,
  backgroundBlurEnabled,
  onOpenSettings,
}: StatsPanelProps) {
  const focusPercent = Math.round(focusScore * 100);
  const isActive = status === "running" || status === "break";
  const targetMs = goal ? (goal.targetHours * 60 + goal.targetMinutes) * 60_000 : 0;
  const timeProgress = targetMs > 0 ? Math.min(100, (elapsedMs / targetMs) * 100) : 0;

  return (
    <div className="flex h-full flex-col overflow-y-auto divide-y divide-zinc-100">
      {/* Study mode toggle */}
      <div className="px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          학습 모드
        </p>
        <div className="flex rounded-md border border-zinc-200 overflow-hidden">
          <button
            onClick={() => onStudyModeChange("work")}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
              studyMode === "work"
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-500 hover:bg-zinc-50"
            }`}
          >
            화면 작업
          </button>
          <button
            onClick={() => onStudyModeChange("reading")}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors border-l border-zinc-200 ${
              studyMode === "reading"
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-500 hover:bg-zinc-50"
            }`}
          >
            독서
          </button>
        </div>
      </div>

      {/* Goal section */}
      {goal && (
        <div className="px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            목표
          </p>
          {goal.dailyGoalText && (
            <p className="mb-2 text-sm text-zinc-700 font-medium leading-snug">
              {goal.dailyGoalText}
            </p>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">목표 시간</span>
              <span className="font-medium text-zinc-900">
                {goal.targetHours}h {goal.targetMinutes > 0 ? `${goal.targetMinutes}m` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">목표 집중도</span>
              <span className="font-medium text-zinc-900">{goal.targetFocusPercent}%</span>
            </div>
            {targetMs > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-zinc-400">시간 달성</span>
                  <span className="text-[10px] text-zinc-400">{Math.round(timeProgress)}%</span>
                </div>
                <ProgressBar value={timeProgress} variant="light" className="rounded-full" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current session stats */}
      {isActive && (
        <div className="px-4 py-3">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            현재 세션
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-lg bg-zinc-50 px-3 py-2.5">
              <p className="text-[10px] text-zinc-400">전체 시간</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-zinc-900">
                {formatTime(elapsedMs)}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 px-3 py-2.5">
              <p className="text-[10px] text-zinc-400">집중 시간</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-zinc-900">
                {formatTime(focusedMs)}
              </p>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-lg px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
              현재 집중도
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {focusPercent}
              <span className="text-sm font-normal text-zinc-400 ml-1">%</span>
            </p>
            <ProgressBar value={focusPercent} variant="dark" className="mt-2 rounded-full" />
          </div>
        </div>
      )}

      {/* Settings button */}
      <div className="flex-1 px-4 py-3 flex flex-col justify-end">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              설정
            </span>
            {backgroundBlurEnabled && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                블러 ON
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
