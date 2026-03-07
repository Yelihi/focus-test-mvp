"use client";

import { useState, useEffect, useRef } from "react";

interface ReturnTimerBannerProps {
  timerMinutes: number;
  firstStep: string;
  onResume: () => void;
}

export function ReturnTimerBanner({
  timerMinutes,
  firstStep,
  onResume,
}: ReturnTimerBannerProps) {
  const endTimeRef = useRef(Date.now() + timerMinutes * 60_000);
  const [remainingSec, setRemainingSec] = useState(timerMinutes * 60);

  useEffect(() => {
    const id = setInterval(() => {
      const diff = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setRemainingSec(diff);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const min = Math.floor(remainingSec / 60);
  const sec = remainingSec % 60;
  const isOvertime = remainingSec === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div
        className={`w-full max-w-md rounded-xl border p-6 shadow-xl ${
          isOvertime
            ? "border-red-300 bg-red-50"
            : "border-zinc-200 bg-white"
        }`}
      >
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-zinc-400">
          휴식 타이머
        </p>
        <p className={`text-4xl font-bold tabular-nums ${isOvertime ? "text-red-600" : "text-zinc-900"}`}>
          {isOvertime ? "시간 초과!" : `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`}
        </p>
        <p className="mt-3 text-sm text-zinc-500">
          복귀 후 첫 할 일:{" "}
          <span className="font-medium text-zinc-800">{firstStep}</span>
        </p>
        <button
          onClick={onResume}
          className="mt-5 w-full rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
        >
          집중 재개
        </button>
      </div>
    </div>
  );
}
