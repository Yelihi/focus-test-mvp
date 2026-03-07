"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { SessionSummaryPanel } from "@/widgets/session-summary";
import { initLandmarker, destroyLandmarker } from "@/features/detection";
import { SessionManager, type SessionState } from "@/features/session";
import type {
  StudyMode,
  SessionHistoryEntry,
  BreakLog,
  SessionGoal,
  ActivityLogEntry,
} from "@/entities/focus-session/model";
import { COACHING_COOLDOWN_MS } from "@/entities/focus-session";
import { initPip, type PipHandle } from "@/features/pip";
import { BreakModalContainer } from "@/widgets/break-modal";
import { CoachingToast, getCoachingMessage } from "@/features/micro-coaching";
import { ReportPanel } from "@/features/report";
import { detectPipStrategy } from "@/shared/lib/featureDetect";
import { getLastStudyMode, setLastStudyMode } from "@/shared/lib/storage";
import { createSessionRepository } from "@/entities/focus-session/repository";
import { AppHeader, NavigationMenu } from "@/shared/ui";
import { MonitoringSidebar } from "@/widgets/monitoring-sidebar";
import { ActionButtons } from "@/widgets/action-buttons";
import { GoalSettingModal } from "@/features/goal-setting";

function formatRecordingTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

let activityIdCounter = 0;
function createActivity(
  type: ActivityLogEntry["type"],
  message: string,
): ActivityLogEntry {
  return {
    id: String(++activityIdCounter),
    type,
    timestamp: Date.now(),
    message,
  };
}

const FOCUS_STATE_BADGE = {
  focused:    { bg: "bg-emerald-500/20", text: "text-emerald-300", dot: "bg-emerald-400", label: "집중 중" },
  distracted: { bg: "bg-orange-500/20",  text: "text-orange-300",  dot: "bg-orange-400",  label: "집중 저하" },
  absent:     { bg: "bg-red-500/20",     text: "text-red-300",     dot: "bg-red-400",     label: "얼굴 미감지" },
} as const;

export function SessionPage() {
  const managerRef = useRef<SessionManager | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const repositoryRef = useRef(createSessionRepository());

  const [sessionState, setSessionState] = useState<SessionState>({
    status: "idle",
    focusState: "focused",
    focusScore: 0,
    confidence: 0,
    coveragePercent: 100,
    effectiveSampleRateHz: 0,
    elapsedMs: 0,
    summary: null,
    breakCount: 0,
  });
  const pipRef = useRef<PipHandle | null>(null);
  const [studyMode, setStudyMode] = useState<StudyMode>("work");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipStrategy, setPipStrategy] = useState<"auto" | "manual" | "none">("none");
  const sessionStartedAtRef = useRef<number>(0);

  const [coachingMessage, setCoachingMessage] = useState<string | null>(null);
  const lastCoachingTimeRef = useRef(0);

  const [goal, setGoal] = useState<SessionGoal | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activityEntries, setActivityEntries] = useState<ActivityLogEntry[]>([]);

  const addActivity = useCallback(
    (type: ActivityLogEntry["type"], message: string) => {
      setActivityEntries((prev) => [createActivity(type, message), ...prev]);
    },
    [],
  );

  useEffect(() => {
    setPipStrategy(detectPipStrategy());
    setStudyMode(getLastStudyMode());

    return () => {
      managerRef.current?.destroy();
      pipRef.current?.cleanup();
      destroyLandmarker();
    };
  }, []);

  const handleStudyModeChange = useCallback((mode: StudyMode) => {
    setStudyMode(mode);
    setLastStudyMode(mode);
    managerRef.current?.setStudyMode(mode);
  }, []);

  const handleStart = async () => {
    if (!videoRef.current) {
      setError("카메라가 준비되지 않았습니다");
      return;
    }

    setIsLoading(true);
    setError(null);
    sessionStartedAtRef.current = Date.now();
    addActivity("session_start", "세션 시작");

    try {
      const landmarker = await initLandmarker();
      landmarkerRef.current = landmarker;

      const manager = new SessionManager({ studyMode });
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
      pipRef.current = initPip(videoRef.current);

      await manager.start(videoRef.current, landmarker);
    } catch (err) {
      setError(err instanceof Error ? err.message : "세션 시작 실패");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBreak = () => {
    managerRef.current?.takeBreak();
    setCoachingMessage(null);
    addActivity("break_start", "휴식 시작");
  };

  const handleResume = () => {
    managerRef.current?.resume();
    addActivity("break_end", "집중 재개");
  };

  const handleStop = () => {
    managerRef.current?.stop();
    addActivity("session_stop", "세션 종료");
  };

  const handleBreakLogCreated = (log: BreakLog) => {
    const manager = managerRef.current;
    if (!manager) return;
    manager.addBreakLog(log);
    const sessionId = manager.getSessionId();
    if (sessionId) {
      repositoryRef.current.saveBreakLog(sessionId, log).catch(() => {});
    }
  };

  useEffect(() => {
    if (sessionState.status === "stopped" && sessionState.summary) {
      const entry: SessionHistoryEntry = {
        sessionId: sessionState.summary.sessionId,
        startedAt: sessionStartedAtRef.current,
        endedAt: Date.now(),
        status: "stopped",
        durationMs: sessionState.summary.durationMs,
        focusedMs: Math.round(
          (sessionState.summary.focusPercent / 100) * sessionState.summary.durationMs,
        ),
        focusPercent: sessionState.summary.focusPercent,
        breakCount: sessionState.summary.breakCount,
        breaks: sessionState.summary.breaks,
        goal: goal ?? undefined,
      };
      repositoryRef.current.saveSession(entry).catch(() => {});
    }
  }, [sessionState.status, sessionState.summary, goal]);

  useEffect(() => {
    pipRef.current?.setFocusState(sessionState.focusState);
  }, [sessionState.focusState]);

  const handleTogglePip = async () => {
    await pipRef.current?.toggle();
  };

  const handleNewSession = () => {
    managerRef.current?.destroy();
    managerRef.current = null;
    if (mainVideoRef.current?.srcObject) {
      const stream = mainVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      mainVideoRef.current.srcObject = null;
    }
    setSessionState({
      status: "idle",
      focusState: "focused",
      focusScore: 0,
      confidence: 0,
      coveragePercent: 100,
      effectiveSampleRateHz: 0,
      elapsedMs: 0,
      summary: null,
      breakCount: 0,
    });
    setGoal(null);
    setActivityEntries([]);
  };

  const handleGoalStart = async (newGoal: SessionGoal, stream: MediaStream) => {
    setGoal(newGoal);
    setShowGoalModal(false);
    const video = mainVideoRef.current!;
    video.srcObject = stream;
    await video.play();
    videoRef.current = video;
    await handleStart();
  };

  const { status, focusState } = sessionState;
  const focusedMs = Math.round(sessionState.elapsedMs * sessionState.focusScore);
  const focusBadge = FOCUS_STATE_BADGE[focusState];

  return (
    <div className="flex h-screen flex-col bg-white">
      <AppHeader onMenuToggle={() => setMenuOpen((v) => !v)} />
      <NavigationMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Camera area */}
        <main className="relative flex-1 bg-zinc-950">
          <video
            ref={mainVideoRef}
            className="h-full w-full -scale-x-100 object-cover"
            playsInline
            muted
          />

          {/* Idle overlay */}
          {status === "idle" && !showGoalModal && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-400">카메라가 비활성화되었습니다</p>
                <p className="mt-1 text-xs text-zinc-600">시작 버튼을 눌러 집중 모니터링을 시작하세요</p>
              </div>
            </div>
          )}

          {/* Recording indicator */}
          {status === "running" && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded bg-black/70 px-3 py-1.5 backdrop-blur-sm">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              <span className="font-mono text-xs font-medium text-white">{formatRecordingTime(sessionState.elapsedMs)}</span>
            </div>
          )}

          {/* Focus state badge */}
          {status === "running" && (
            <div className={`absolute right-4 top-4 flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium backdrop-blur-sm ${focusBadge.bg} ${focusBadge.text}`}>
              <div className={`h-1.5 w-1.5 rounded-full ${focusBadge.dot}`} />
              {focusBadge.label}
            </div>
          )}

          {/* Break status overlay */}
          {status === "break" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="rounded border border-zinc-700 bg-zinc-900/90 px-6 py-4 text-center">
                <p className="text-sm font-medium text-zinc-300">휴식 중</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <ActionButtons
              status={status}
              isLoading={isLoading}
              onStart={() => setShowGoalModal(true)}
              onPause={handleBreak}
              onReset={handleStop}
              onNewSession={handleNewSession}
              pipStrategy={pipStrategy}
              onTogglePip={handleTogglePip}
            />
          </div>

          {/* Error banner */}
          {error && (
            <div className="absolute left-4 right-4 top-16 rounded bg-red-500/90 px-4 py-2 text-center text-sm text-white backdrop-blur-sm">
              {error}
            </div>
          )}

          {/* Coaching Toast */}
          {coachingMessage && status === "running" && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
              <CoachingToast
                message={coachingMessage}
                onBreak={handleBreak}
                onDismiss={() => setCoachingMessage(null)}
              />
            </div>
          )}
        </main>

        {/* Desktop sidebar */}
        <aside className="hidden w-72 shrink-0 border-l border-zinc-200 bg-white lg:flex lg:flex-col">
          <MonitoringSidebar
            goal={goal}
            elapsedMs={sessionState.elapsedMs}
            focusedMs={focusedMs}
            focusScore={sessionState.focusScore}
            status={status}
            activityEntries={activityEntries}
            studyMode={studyMode}
            onStudyModeChange={handleStudyModeChange}
          />
        </aside>
      </div>

      {/* Mobile sidebar content below camera */}
      <div className="block lg:hidden overflow-y-auto bg-white border-t border-zinc-200 max-h-64">
        <MonitoringSidebar
          goal={goal}
          elapsedMs={sessionState.elapsedMs}
          focusedMs={focusedMs}
          focusScore={sessionState.focusScore}
          status={status}
          activityEntries={activityEntries}
          studyMode={studyMode}
          onStudyModeChange={handleStudyModeChange}
        />
      </div>

      {/* Modals */}
      {showGoalModal && (
        <GoalSettingModal
          onStart={handleGoalStart}
          onCancel={() => setShowGoalModal(false)}
        />
      )}
      <BreakModalContainer
        status={sessionState.status}
        onBreakLogCreated={handleBreakLogCreated}
        onResume={handleResume}
      />
      {status === "stopped" && (
        <SessionSummaryPanel summary={sessionState.summary} />
      )}
      {status === "stopped" && sessionState.summary && (
        <ReportPanel summary={sessionState.summary} />
      )}
    </div>
  );
}
