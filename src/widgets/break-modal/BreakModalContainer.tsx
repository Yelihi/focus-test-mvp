"use client";

import { useState, useRef } from "react";
import type { BreakReason, BreakLog, SessionStatus } from "@/entities/focus-session";
import { BreakCheckinModal, ReturnTimerBanner } from "@/features/break-checkin";

interface BreakModalContainerProps {
  status: SessionStatus;
  onBreakLogCreated: (log: BreakLog) => void;
  onResume: () => void;
}

export function BreakModalContainer({
  status,
  onBreakLogCreated,
  onResume,
}: BreakModalContainerProps) {
  const [showModal, setShowModal] = useState(true);
  const [currentBreak, setCurrentBreak] = useState<{
    timerMinutes: number;
    firstStep: string;
  } | null>(null);
  const previousFirstStepRef = useRef<string | undefined>(undefined);
  const breakStartMsRef = useRef(0);

  // Reset modal visibility when entering break
  if (status === "break" && breakStartMsRef.current === 0) {
    breakStartMsRef.current = performance.now();
    setShowModal(true);
    setCurrentBreak(null);
  }

  // Reset when leaving break
  if (status !== "break" && breakStartMsRef.current !== 0) {
    breakStartMsRef.current = 0;
  }

  if (status !== "break") return null;

  const handleSubmit = (data: {
    reason: BreakReason;
    memo?: string;
    firstStep: string;
    timerMinutes: number;
  }) => {
    const log: BreakLog = {
      breakId: crypto.randomUUID(),
      reason: data.reason,
      memo: data.memo,
      firstStep: data.firstStep,
      timerMinutes: data.timerMinutes,
      startedAt: breakStartMsRef.current,
    };

    previousFirstStepRef.current = data.firstStep;
    onBreakLogCreated(log);
    setCurrentBreak({
      timerMinutes: data.timerMinutes,
      firstStep: data.firstStep,
    });
    setShowModal(false);
  };

  const handleResume = () => {
    onResume();
  };

  if (showModal) {
    return (
      <BreakCheckinModal
        previousFirstStep={previousFirstStepRef.current}
        onSubmit={handleSubmit}
      />
    );
  }

  if (currentBreak) {
    return (
      <ReturnTimerBanner
        timerMinutes={currentBreak.timerMinutes}
        firstStep={currentBreak.firstStep}
        onResume={handleResume}
      />
    );
  }

  return null;
}
