"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type Dispatch,
  type SetStateAction,
  type MutableRefObject,
} from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import {
  initLandmarker,
  destroyLandmarker,
  initObjectDetector,
  destroyObjectDetector,
  CaptureLoop,
} from "@/features/detection";
import { SessionManager, type SessionState } from "@/features/session";
import type { ActivityLogEntry, StudyMode } from "@/entities/focus-session/models";
import { COACHING_COOLDOWN_MS } from "@/shared/config/timing";
import { initPip, type PipHandle } from "@/features/pip";
import { getCoachingMessage } from "@/features/micro-coaching";
import { detectPipStrategy } from "@/shared/lib/featureDetect";
import { INITIAL_SESSION_STATE } from "../config/constants";

interface UseSessionLifecycleOptions {
  addActivity: (type: ActivityLogEntry["type"], message: string) => void;
  studyMode: StudyMode;
  managerRef: MutableRefObject<SessionManager | null>;
}

export interface UseSessionLifecycleReturn {
  sessionState: SessionState;
  sessionStartedAtRef: MutableRefObject<number>;
  isLoading: boolean;
  error: string | null;
  pipStrategy: "auto" | "manual" | "none";
  coachingMessage: string | null;
  setCoachingMessage: Dispatch<SetStateAction<string | null>>;
  handleStart: (video: HTMLVideoElement) => Promise<void>;
  handleBreak: () => void;
  handleResume: () => void;
  handleStop: () => void;
  handleTogglePip: () => Promise<void>;
  resetLifecycle: () => void;
}

export function useSessionLifecycle({
  addActivity,
  studyMode,
  managerRef,
}: UseSessionLifecycleOptions): UseSessionLifecycleReturn {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const pipRef = useRef<PipHandle | null>(null);
  const lastCoachingTimeRef = useRef(0);
  const sessionStartedAtRef = useRef<number>(0);

  const [sessionState, setSessionState] = useState<SessionState>(INITIAL_SESSION_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipStrategy, setPipStrategy] = useState<"auto" | "manual" | "none">("none");
  const [coachingMessage, setCoachingMessage] = useState<string | null>(null);

  // Detect PiP strategy on mount, cleanup on unmount
  useEffect(() => {
    setPipStrategy(detectPipStrategy());
    return () => {
      managerRef.current?.destroy();
      pipRef.current?.cleanup();
      destroyLandmarker();
      destroyObjectDetector();
    };
  }, []);

  // Sync PiP focus state
  useEffect(() => {
    pipRef.current?.setFocusState(sessionState.focusState);
  }, [sessionState.focusState]);

  const handleStart = useCallback(
    async (video: HTMLVideoElement) => {
      setIsLoading(true);
      setError(null);
      sessionStartedAtRef.current = Date.now();
      addActivity("session_start", "세션 시작");

      try {
        const [landmarker, objectDetector] = await Promise.all([
          initLandmarker(),
          initObjectDetector(),
        ]);
        landmarkerRef.current = landmarker;

        const captureLoop = new CaptureLoop(10);
        const manager = new SessionManager({ studyMode }, captureLoop);
        managerRef.current = manager;
        await manager.init();
        manager.subscribe((state) => {
          setSessionState(state);
        });

        manager.onDistractedAlert(() => {
          const now = Date.now();
          if (now - lastCoachingTimeRef.current < COACHING_COOLDOWN_MS) return;
          lastCoachingTimeRef.current = now;
          setCoachingMessage(getCoachingMessage());
          addActivity("distracted", "집중력 저하 감지");
        });

        pipRef.current?.cleanup();
        pipRef.current = initPip(video);

        await manager.start(video, landmarker, objectDetector);
      } catch (err) {
        setError(err instanceof Error ? err.message : "세션 시작 실패");
      } finally {
        setIsLoading(false);
      }
    },
    [studyMode, addActivity],
  );

  const handleBreak = useCallback(() => {
    managerRef.current?.takeBreak();
    setCoachingMessage(null);
    addActivity("break_start", "휴식 시작");
  }, [addActivity]);

  const handleResume = useCallback(() => {
    managerRef.current?.resume();
    addActivity("break_end", "집중 재개");
  }, [addActivity]);

  const handleStop = useCallback(() => {
    managerRef.current?.stop();
    addActivity("session_stop", "세션 종료");
  }, [addActivity]);

  const handleTogglePip = useCallback(async () => {
    await pipRef.current?.toggle();
  }, []);

  const resetLifecycle = useCallback(() => {
    managerRef.current?.destroy();
    managerRef.current = null;
    setSessionState(INITIAL_SESSION_STATE);
    setError(null);
    setCoachingMessage(null);
  }, []);

  return {
    sessionState,
    sessionStartedAtRef,
    isLoading,
    error,
    pipStrategy,
    coachingMessage,
    setCoachingMessage,
    handleStart,
    handleBreak,
    handleResume,
    handleStop,
    handleTogglePip,
    resetLifecycle,
  };
}
