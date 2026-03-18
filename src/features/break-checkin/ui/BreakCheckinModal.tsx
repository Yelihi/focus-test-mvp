"use client";

import { useState } from "react";
import type { BreakReason } from "@/entities/focus-session";
import { focusSessionBehavior } from "@/entities/focus-session";
import { ALL_REASONS, TIMER_OPTIONS } from "../config/constants";
import { Modal, PillButton, Input, Textarea, Button } from "@/shared/ui";

interface BreakCheckinModalProps {
  previousFirstStep?: string;
  onSubmit: (data: {
    reason: BreakReason;
    memo?: string;
    firstStep: string;
    timerMinutes: number;
  }) => void;
}

export function BreakCheckinModal({
  previousFirstStep,
  onSubmit,
}: BreakCheckinModalProps) {
  const [reason, setReason] = useState<BreakReason | null>(null);
  const [memo, setMemo] = useState("");
  const [showMemo, setShowMemo] = useState(false);
  const [firstStep, setFirstStep] = useState("");
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [customTimer, setCustomTimer] = useState("");

  const isQuick = reason !== null && focusSessionBehavior.isQuickBreakReason(reason);
  const effectiveFirstStep = isQuick && previousFirstStep ? previousFirstStep : firstStep;

  const canSubmit =
    reason !== null &&
    effectiveFirstStep.trim().length > 0 &&
    timerMinutes > 0;

  const handleSubmit = () => {
    if (!canSubmit || !reason) return;
    onSubmit({
      reason,
      memo: memo.trim() || undefined,
      firstStep: effectiveFirstStep.trim(),
      timerMinutes,
    });
  };

  return (
    <Modal maxWidth="md" className="p-6 dark:bg-zinc-900">
      <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
        Break Check-in
      </h2>

      {/* Reason chips */}
      <div className="mb-4">
        <p className="mb-2 text-sm text-zinc-500">왜 멈췄나요?</p>
        <div className="flex flex-wrap gap-2">
          {ALL_REASONS.map((r) => (
            <PillButton
              key={r}
              active={reason === r}
              onClick={() => setReason(r)}
            >
              {focusSessionBehavior.getBreakReasonLabel(r)}
            </PillButton>
          ))}
        </div>
      </div>

      {/* Quick break: simplified UI */}
      {isQuick && (
        <div className="mb-4 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
          <p className="text-sm text-zinc-500">
            복귀 후 첫 30초:{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {previousFirstStep || "아직 없음"}
            </span>
          </p>
          {!previousFirstStep && (
            <Input
              type="text"
              value={firstStep}
              onChange={(e) => setFirstStep(e.target.value.slice(0, 60))}
              placeholder="복귀하면 가장 먼저 할 일 (필수)"
              className="mt-2"
              maxLength={60}
            />
          )}
          <button
            onClick={() => setShowMemo(!showMemo)}
            className="mt-2 text-xs text-zinc-400 hover:text-zinc-600"
          >
            {showMemo ? "메모 접기" : "메모 펼치기"}
          </button>
          {showMemo && (
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value.slice(0, 100))}
              placeholder="메모 (선택, 100자)"
              rows={2}
              className="mt-2"
              maxLength={100}
            />
          )}
        </div>
      )}

      {/* Full UI for non-quick reasons */}
      {reason !== null && !isQuick && (
        <>
          <div className="mb-4">
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value.slice(0, 100))}
              placeholder="메모 (선택, 100자)"
              rows={2}
              maxLength={100}
            />
          </div>

          <div className="mb-4">
            <p className="mb-2 text-sm text-zinc-500">
              복귀 후 첫 30초에 할 일
            </p>
            <Input
              type="text"
              value={firstStep}
              onChange={(e) => setFirstStep(e.target.value.slice(0, 60))}
              placeholder="가장 먼저 할 일 (필수, 60자)"
              maxLength={60}
            />
          </div>
        </>
      )}

      {/* Timer selection */}
      {reason !== null && (
        <div className="mb-6">
          <p className="mb-2 text-sm text-zinc-500">복귀 타이머</p>
          <div className="flex gap-2">
            {TIMER_OPTIONS.map((min) => (
              <PillButton
                key={min}
                active={timerMinutes === min && !customTimer}
                onClick={() => {
                  setTimerMinutes(min);
                  setCustomTimer("");
                }}
              >
                {min}분
              </PillButton>
            ))}
            <Input
              type="number"
              value={customTimer}
              onChange={(e) => {
                const val = e.target.value;
                setCustomTimer(val);
                const num = parseInt(val, 10);
                if (num > 0) setTimerMinutes(num);
              }}
              placeholder="직접"
              className="w-20 py-1.5"
              min={1}
              max={60}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full rounded-full bg-zinc-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        타이머 시작
      </button>
    </Modal>
  );
}
