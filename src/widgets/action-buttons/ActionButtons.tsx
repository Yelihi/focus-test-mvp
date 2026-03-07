"use client";

import type { SessionStatus } from "@/entities/focus-session/model";

interface ActionButtonsProps {
  status: SessionStatus;
  isLoading: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onNewSession: () => void;
  pipStrategy: "auto" | "manual" | "none";
  onTogglePip: () => void;
}

export function ActionButtons({
  status,
  isLoading,
  onStart,
  onPause,
  onReset,
  onNewSession,
  pipStrategy,
  onTogglePip,
}: ActionButtonsProps) {
  if (status === "idle") {
    return (
      <button
        onClick={onStart}
        disabled={isLoading}
        className="flex items-center gap-2.5 rounded-lg bg-white px-8 py-3 text-sm font-semibold text-zinc-900 shadow-lg transition-colors hover:bg-zinc-100 disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            로딩 중...
          </span>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            시작하기
          </>
        )}
      </button>
    );
  }

  if (status === "running") {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onPause}
          className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg transition-colors hover:bg-zinc-100"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
          일시정지
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 rounded-lg bg-zinc-700/80 px-5 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-zinc-600"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" />
          </svg>
          세션 종료
        </button>
        {pipStrategy !== "none" && (
          <button
            onClick={onTogglePip}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-700/80 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-zinc-600"
            aria-label="PiP 토글"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="1" />
              <rect x="12" y="9" width="8" height="6" rx="1" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  if (status === "stopped") {
    return (
      <button
        onClick={onNewSession}
        className="flex items-center gap-2 rounded-lg bg-white px-8 py-3 text-sm font-semibold text-zinc-900 shadow-lg transition-colors hover:bg-zinc-100"
      >
        새 세션 시작
      </button>
    );
  }

  return null;
}
