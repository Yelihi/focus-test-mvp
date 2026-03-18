"use client";

import { useState, useEffect } from "react";
import type { StudyMode, SessionGoal } from "@/entities/focus-session/models";
import { Switch, Modal, Button, Input } from "@/shared/ui";

interface SessionSettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  backgroundBlurEnabled: boolean;
  onToggleBlur: (enabled: boolean) => void;
  blurLoading: boolean;
  studyMode: StudyMode;
  onStudyModeChange: (mode: StudyMode) => void;
  goal: SessionGoal | null;
  onGoalUpdate: (goal: SessionGoal) => void;
}

export function SessionSettingsPopup({
  isOpen,
  onClose,
  backgroundBlurEnabled,
  onToggleBlur,
  blurLoading,
  studyMode,
  onStudyModeChange,
  goal,
  onGoalUpdate,
}: SessionSettingsPopupProps) {
  const [hours, setHours] = useState(goal?.targetHours ?? 2);
  const [minutes, setMinutes] = useState(goal?.targetMinutes ?? 0);
  const [focusPercent, setFocusPercent] = useState(goal?.targetFocusPercent ?? 70);
  const [dailyGoalText, setDailyGoalText] = useState(goal?.dailyGoalText ?? "");

  useEffect(() => {
    if (isOpen) {
      setHours(goal?.targetHours ?? 2);
      setMinutes(goal?.targetMinutes ?? 0);
      setFocusPercent(goal?.targetFocusPercent ?? 70);
      setDailyGoalText(goal?.dailyGoalText ?? "");
    }
  }, [isOpen, goal]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (goal) {
      onGoalUpdate({
        ...goal,
        targetHours: hours,
        targetMinutes: minutes,
        targetFocusPercent: focusPercent,
        dailyGoalText: dailyGoalText.trim() || undefined,
      });
    }
    onClose();
  };

  return (
    <Modal maxWidth="sm" className="overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4">
          <h2 className="text-base font-semibold text-zinc-900">세션 설정</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Background blur toggle */}
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm text-zinc-700">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <line x1="12" y1="2" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="2" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="22" y2="12" />
              </svg>
              배경 블러
              {blurLoading && (
                <svg className="h-3.5 w-3.5 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
            <Switch
              checked={backgroundBlurEnabled}
              onChange={onToggleBlur}
              disabled={blurLoading}
            />
          </div>

          {/* Study mode */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-zinc-500">학습 모드</p>
            <div className="flex rounded-md border border-zinc-200 overflow-hidden">
              <button
                onClick={() => onStudyModeChange("work")}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  studyMode === "work"
                    ? "bg-zinc-900 text-white"
                    : "bg-white text-zinc-500 hover:bg-zinc-50"
                }`}
              >
                화면 작업
              </button>
              <button
                onClick={() => onStudyModeChange("reading")}
                className={`flex-1 py-2 text-xs font-medium transition-colors border-l border-zinc-200 ${
                  studyMode === "reading"
                    ? "bg-zinc-900 text-white"
                    : "bg-white text-zinc-500 hover:bg-zinc-50"
                }`}
              >
                독서
              </button>
            </div>
          </div>

          {/* Goal adjustment — only when goal exists */}
          {goal && (
            <>
              <hr className="border-zinc-100" />
              <div className="space-y-3">
                <p className="text-xs font-medium text-zinc-500">목표 조정</p>

                {/* Target time */}
                <div>
                  <p className="mb-1 text-xs text-zinc-400">목표 시간</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={12}
                      value={hours}
                      onChange={(e) => setHours(Math.max(0, Math.min(12, Number(e.target.value))))}
                      className="w-16 px-2 py-1.5 text-center"
                    />
                    <span className="text-xs text-zinc-500">시간</span>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      value={minutes}
                      onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
                      className="w-16 px-2 py-1.5 text-center"
                    />
                    <span className="text-xs text-zinc-500">분</span>
                  </div>
                </div>

                {/* Target focus */}
                <div>
                  <p className="mb-1 text-xs text-zinc-400">목표 집중도</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={focusPercent}
                      onChange={(e) => setFocusPercent(Math.max(1, Math.min(100, Number(e.target.value))))}
                      className="w-16 px-2 py-1.5 text-center"
                    />
                    <span className="text-xs text-zinc-500">%</span>
                  </div>
                </div>

                {/* Daily goal text */}
                <div>
                  <p className="mb-1 text-xs text-zinc-400">오늘의 목표</p>
                  <Input
                    type="text"
                    value={dailyGoalText}
                    onChange={(e) => setDailyGoalText(e.target.value)}
                    placeholder="예: 알고리즘 문제 10개 풀기"
                    maxLength={100}
                    className="py-1.5"
                  />
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <Button variant="ghost" onClick={onClose} className="px-4 py-2">
              닫기
            </Button>
            {goal && (
              <Button variant="primary" onClick={handleSave}>
                저장
              </Button>
            )}
          </div>
        </div>
    </Modal>
  );
}
