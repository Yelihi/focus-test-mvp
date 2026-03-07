"use client";

import { useEffect, useState } from "react";

interface CoachingToastProps {
  message: string;
  onBreak: () => void;
  onDismiss: () => void;
}

export function CoachingToast({
  message,
  onBreak,
  onDismiss,
}: CoachingToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in
    requestAnimationFrame(() => setVisible(true));

    // Auto dismiss after 10s
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 10_000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">
          {message}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onBreak}
            className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Break
          </button>
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            무시
          </button>
        </div>
      </div>
    </div>
  );
}
