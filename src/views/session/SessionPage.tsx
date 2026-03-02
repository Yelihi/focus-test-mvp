"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { CameraPreview } from "@/widgets/camera-preview";
import { FocusHUD } from "@/widgets/focus-hud";
import { SessionSummaryPanel } from "@/widgets/session-summary";
import { initLandmarker, destroyLandmarker } from "@/features/detection";
import { SessionManager, type SessionState } from "@/features/session";
import type {
  StudyMode,
  SessionHistoryEntry,
} from "@/entities/focus-session/model";
import { initPip, type PipHandle } from "@/features/pip";
import { SessionHistoryList } from "@/widgets/session-history";
import { detectPipStrategy } from "@/shared/lib/featureDetect";

export function SessionPage() {
  const managerRef = useRef<SessionManager | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [sessionState, setSessionState] = useState<SessionState>({
    status: "idle",
    focusState: "focused",
    focusScore: 0,
    confidence: 0,
    coveragePercent: 100,
    effectiveSampleRateHz: 0,
    elapsedMs: 0,
    summary: null,
  });
  const pipRef = useRef<PipHandle | null>(null);
  const [studyMode, setStudyMode] = useState<StudyMode>("desktop");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipStrategy, setPipStrategy] = useState<"auto" | "manual" | "none">("none");
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);
  const sessionStartedAtRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    setPipStrategy(detectPipStrategy());
    return () => {
      managerRef.current?.destroy();
      pipRef.current?.cleanup();
      destroyLandmarker();
    };
  }, []);

  const handleVideoReady = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;
  }, []);

  const handleError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  const handleStart = async () => {
    if (!videoRef.current) {
      setError("Camera not ready");
      return;
    }

    setIsLoading(true);
    setError(null);
    sessionStartedAtRef.current = Date.now();

    try {
      // Init MediaPipe
      const landmarker = await initLandmarker();
      landmarkerRef.current = landmarker;

      // Init session manager
      const manager = new SessionManager({ studyMode });
      managerRef.current = manager;
      await manager.init();
      manager.subscribe(setSessionState);

      // Init PiP
      pipRef.current?.cleanup();
      pipRef.current = initPip(videoRef.current);

      // Start session
      await manager.start(videoRef.current, landmarker);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start session",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = () => {
    managerRef.current?.pause();
  };

  const handleReset = () => {
    managerRef.current?.reset();
  };

  // Track session history on pause
  useEffect(() => {
    if (sessionState.status === "paused" && sessionState.summary) {
      const entry: SessionHistoryEntry = {
        sessionId: sessionState.summary.sessionId,
        startedAt: sessionStartedAtRef.current,
        endedAt: Date.now(),
        status: "paused",
        durationMs: sessionState.summary.durationMs,
        focusedMs: Math.round(
          (sessionState.summary.focusPercent / 100) *
            sessionState.summary.durationMs,
        ),
        focusPercent: sessionState.summary.focusPercent,
      };
      setHistory((prev) => [entry, ...prev]);
    }
  }, [sessionState.summary]);

  // Sync focus state to PiP overlay
  useEffect(() => {
    pipRef.current?.setFocusState(sessionState.focusState);
  }, [sessionState.focusState]);

  const handleTogglePip = async () => {
    await pipRef.current?.toggle();
  };

  const { status } = sessionState;

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-zinc-50 p-8 dark:bg-black">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Focus Session
      </h1>

      {error && (
        <div className="rounded-lg bg-red-100 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <CameraPreview onVideoReady={handleVideoReady} onError={handleError} />

      {/* Study Mode Toggle */}
      <div className="flex gap-2">
        {(["desktop", "book"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setStudyMode(mode);
              managerRef.current?.setStudyMode(mode);
            }}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              studyMode === mode
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {mode === "desktop" ? "Desktop" : "Book"}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        {status === "idle" && (
          <button
            onClick={handleStart}
            disabled={isLoading}
            className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {isLoading ? "Loading..." : "Start"}
          </button>
        )}

        {status === "active" && (
          <button
            onClick={handlePause}
            className="rounded-full bg-yellow-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-yellow-600"
          >
            Pause
          </button>
        )}

        {(status === "active" || status === "paused") && (
          <button
            onClick={handleReset}
            className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Reset
          </button>
        )}

        {status === "paused" && (
          <button
            onClick={handleStart}
            disabled={isLoading}
            className="rounded-full bg-green-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Resume"}
          </button>
        )}

        {status === "active" && pipStrategy !== "none" && (
          <button
            onClick={handleTogglePip}
            className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            PiP
          </button>
        )}
      </div>

      {/* Focus HUD */}
      <FocusHUD
        focusState={sessionState.focusState}
        focusScore={sessionState.focusScore}
        confidence={sessionState.confidence}
        coveragePercent={sessionState.coveragePercent}
        elapsedMs={sessionState.elapsedMs}
        isActive={status === "active"}
      />

      {/* Session Summary */}
      {status === "paused" && (
        <SessionSummaryPanel summary={sessionState.summary} />
      )}

      {/* Session History */}
      <SessionHistoryList entries={history} />
    </div>
  );
}
