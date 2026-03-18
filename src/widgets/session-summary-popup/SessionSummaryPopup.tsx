"use client";

import { useState } from "react";
import type { SessionHistoryEntry, SessionSummary } from "@/entities/focus-session/models";
import { Modal, Button, Textarea } from "@/shared/ui";

interface SessionSummaryPopupProps {
  session: SessionHistoryEntry;
  summary: SessionSummary | null;
  onClose: () => void;
  onSaveFeedback?: (sessionId: string, feedback: string) => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (h > 0) return `${h}시간 ${min}분`;
  if (min > 0) return `${min}분 ${sec}초`;
  return `${sec}초`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function SessionSummaryPopup({
  session,
  summary,
  onClose,
  onSaveFeedback,
}: SessionSummaryPopupProps) {
  const [feedback, setFeedback] = useState(session.memo ?? "");

  const handleSave = () => {
    if (onSaveFeedback) {
      onSaveFeedback(session.sessionId, feedback);
    }
    onClose();
  };

  const focusPercent = Math.round(session.focusPercent);
  const distractedPercent = summary ? Math.round(summary.distractedPercent) : null;
  const absentPercent = summary ? Math.round(summary.absentPercent) : null;
  const longestFocusMs = summary?.longestContinuousFocusMs ?? 0;
  const goalText = session.dailyGoalText ?? session.goal?.dailyGoalText;

  return (
    <Modal maxWidth="md" className="overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              {goalText ?? "세션 요약"}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {formatTime(session.startedAt)} — {formatTime(session.endedAt)}
            </p>
          </div>
          <Button variant="icon" onClick={onClose} className="ml-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-zinc-50 px-4 py-3">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">총 시간</p>
              <p className="mt-1 text-lg font-semibold text-zinc-900">
                {formatDuration(session.durationMs)}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-50 px-4 py-3">
              <p className="text-[10px] text-emerald-600 uppercase tracking-wider">집중</p>
              <p className="mt-1 text-lg font-semibold text-emerald-700">{focusPercent}%</p>
            </div>
            {distractedPercent !== null && (
              <div className="rounded-xl bg-orange-50 px-4 py-3">
                <p className="text-[10px] text-orange-600 uppercase tracking-wider">집중 저하</p>
                <p className="mt-1 text-lg font-semibold text-orange-700">{distractedPercent}%</p>
              </div>
            )}
            {absentPercent !== null && (
              <div className="rounded-xl bg-red-50 px-4 py-3">
                <p className="text-[10px] text-red-600 uppercase tracking-wider">미감지</p>
                <p className="mt-1 text-lg font-semibold text-red-700">{absentPercent}%</p>
              </div>
            )}
          </div>

          {/* Detail rows */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500">휴식 횟수</span>
              <span className="font-medium text-zinc-900">{session.breakCount}회</span>
            </div>
            {longestFocusMs > 0 && (
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-100">
                <span className="text-zinc-500">최장 집중 구간</span>
                <span className="font-medium text-zinc-900">{formatDuration(longestFocusMs)}</span>
              </div>
            )}
            {session.goal && (
              <>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-100">
                  <span className="text-zinc-500">목표 시간</span>
                  <span className="font-medium text-zinc-900">
                    {session.goal.targetHours}h {session.goal.targetMinutes > 0 ? `${session.goal.targetMinutes}m` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-100">
                  <span className="text-zinc-500">목표 집중도</span>
                  <span className="font-medium text-zinc-900">{session.goal.targetFocusPercent}%</span>
                </div>
              </>
            )}
          </div>

          {/* AI Summary placeholder */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">
              AI 요약
            </p>
            <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-4">
              <p className="text-xs text-zinc-400 text-center">준비 중</p>
            </div>
          </div>

          {/* Feedback textarea */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">
              메모
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="이번 세션에 대한 메모를 남겨보세요..."
              rows={3}
              className="text-zinc-700 placeholder:text-zinc-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-100">
          <Button variant="ghost" onClick={onClose} className="px-4 py-2">
            닫기
          </Button>
          <Button variant="primary" onClick={handleSave}>
            저장
          </Button>
        </div>
    </Modal>
  );
}
