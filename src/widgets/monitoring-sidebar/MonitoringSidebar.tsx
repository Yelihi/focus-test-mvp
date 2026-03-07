"use client";

import type {
  SessionGoal,
  ActivityLogEntry,
  SessionStatus,
  StudyMode,
} from "@/entities/focus-session/model";
import { ActivityLog } from "@/features/activity-log";

interface MonitoringSidebarProps {
  goal: SessionGoal | null;
  elapsedMs: number;
  focusedMs: number;
  focusScore: number;
  status: SessionStatus;
  activityEntries: ActivityLogEntry[];
  studyMode: StudyMode;
  onStudyModeChange: (mode: StudyMode) => void;
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

export function MonitoringSidebar({
  goal,
  elapsedMs,
  focusedMs,
  focusScore,
  status,
  activityEntries,
  studyMode,
  onStudyModeChange,
}: MonitoringSidebarProps) {
  const focusPercent = Math.round(focusScore * 100);
  const isActive = status === "running" || status === "break";

  return (
    <div className="flex h-full flex-col divide-y divide-zinc-200">
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

      {/* Realtime stats */}
      <div className="px-4 py-3">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          실시간 활동
        </p>

        {/* Time stats grid */}
        <div className="grid grid-cols-2 divide-x divide-zinc-200 border border-zinc-200">
          <div className="px-3 py-2.5">
            <p className="text-[10px] text-zinc-400">전체 시간</p>
            <p className="mt-0.5 font-mono text-base font-semibold text-zinc-900">
              {formatTime(elapsedMs)}
            </p>
          </div>
          <div className="px-3 py-2.5">
            <p className="text-[10px] text-zinc-400">집중 시간</p>
            <p className="mt-0.5 font-mono text-base font-semibold text-zinc-900">
              {formatTime(focusedMs)}
            </p>
          </div>
        </div>

        {/* Focus score card */}
        <div className="mt-2 bg-zinc-900 px-4 py-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
            현재 집중도
          </p>
          <p className="mt-1 text-3xl font-bold text-white">
            {focusPercent} <span className="text-lg font-normal text-zinc-400">%</span>
          </p>
          {/* Progress bar */}
          <div className="mt-3 h-1 overflow-hidden bg-zinc-700">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${focusPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Goal */}
      {goal && isActive && (
        <div className="px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            목표
          </p>
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
            {/* Goal progress */}
            {goal.targetHours > 0 && (
              <div className="mt-2">
                <div className="h-1 overflow-hidden bg-zinc-100">
                  <div
                    className="h-full bg-zinc-900 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (elapsedMs / ((goal.targetHours * 60 + goal.targetMinutes) * 60_000)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity log */}
      <div className="flex-1 overflow-hidden px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          활동 기록
        </p>
        <ActivityLog entries={activityEntries} />
      </div>
    </div>
  );
}
