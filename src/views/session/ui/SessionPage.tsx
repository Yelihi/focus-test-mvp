"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { useSessionBlur } from "@/features/background-blur";
import { useActivityLog } from "./useActivityLog";
import { useStudyMode } from "./useStudyMode";
import { useTimetable } from "./useTimetable";
import { useSessionLifecycle } from "../services/useSessionLifecycle";
import { useSessionData } from "../services/useSessionData";
import { FOCUS_STATE_BADGE } from "../config/constants";
import { formatRecordingTime } from "../lib";
import type { SessionGoal } from "@/entities/focus-session/models";
import type { SessionManager } from "@/features/session";
import { CoachingToast } from "@/features/micro-coaching";
import { BreakModalContainer } from "@/widgets/break-modal";
import { AppHeader, NavigationMenu } from "@/shared/ui";
import { ActionButtons } from "@/widgets/action-buttons";
import { GoalSettingModal } from "@/features/goal-setting";
import { Timetable } from "@/widgets/timetable";
import { TodaySessionList } from "@/widgets/session-list";
import { SessionSummaryPopup } from "@/widgets/session-summary-popup";
import { StatsPanel } from "@/widgets/stats-panel";
import { SessionSettingsPopup } from "@/widgets/session-settings";

export function SessionPage() {
  // DOM refs
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const blurCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const managerRef = useRef<SessionManager | null>(null);
  const blur = useSessionBlur({ videoRef: mainVideoRef, canvasRef: blurCanvasRef });

  // UI-only modal state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Hooks — managerRef shared between useStudyMode and useSessionLifecycle
  const { activityEntries: _activityEntries, addActivity, resetActivityLog } = useActivityLog();
  const { studyMode, handleStudyModeChange } = useStudyMode(managerRef);

  const {
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
  } = useSessionLifecycle({ addActivity, studyMode, managerRef });

  const { timetableEntries, currentTime, sessionEndTime, resetTimetable } =
    useTimetable(sessionState.status, sessionState.focusState);

  const {
    goal,
    setGoal,
    todaySessions,
    selectedSession,
    setSelectedSession,
    handleBreakLogCreated,
    handleSaveFeedback,
    resetSessionData,
  } = useSessionData({ sessionState, sessionStartedAtRef, managerRef });

  // Cross-hook coordination handlers
  const handleNewSession = useCallback(() => {
    resetLifecycle();
    blur.cleanupBlur();
    if (mainVideoRef.current?.srcObject) {
      const stream = mainVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      mainVideoRef.current.srcObject = null;
    }
    resetActivityLog();
    resetTimetable();
    resetSessionData();
  }, [resetLifecycle, blur.cleanupBlur, resetActivityLog, resetTimetable, resetSessionData]);

  const handleGoalStart = useCallback(
    async (newGoal: SessionGoal, stream: MediaStream, backgroundBlur: boolean) => {
      setGoal(newGoal);
      setShowGoalModal(false);
      const video = mainVideoRef.current!;
      video.srcObject = stream;
      await video.play();
      await blur.initBlurFromModal(backgroundBlur);
      await handleStart(video);
    },
    [setGoal, blur.initBlurFromModal, handleStart],
  );

  // Derived values
  const { status, focusState } = sessionState;
  const { backgroundBlurEnabled, blurLoading } = blur;
  const focusedMs = useMemo(
    () => Math.round(sessionState.elapsedMs * sessionState.focusScore),
    [sessionState.elapsedMs, sessionState.focusScore],
  );
  const focusBadge = FOCUS_STATE_BADGE[focusState];
  const isActive = status === "running" || status === "break";

  const timeDisplay = currentTime.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div className="flex h-screen flex-col bg-white">
      <AppHeader onMenuToggle={() => setMenuOpen((v) => !v)} />
      <NavigationMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Timetable (desktop only) */}
        <aside className="hidden lg:flex flex-col w-[190px] shrink-0 border-r border-zinc-100 bg-white overflow-hidden">
          <Timetable
            entries={timetableEntries}
            isActive={isActive}
            currentTime={currentTime}
            sessionEndTime={sessionEndTime}
            onSessionClick={() => {
              const s = todaySessions[0];
              if (s) setSelectedSession(s);
            }}
          />
        </aside>

        {/* CENTER: Camera + Session List */}
        <main className="flex flex-1 flex-col overflow-hidden min-w-0">
          {/* Current time header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 shrink-0">
            <span className="font-mono text-sm font-medium text-zinc-500">{timeDisplay}</span>
            {isActive && (
              <span className="text-xs text-zinc-400">{formatRecordingTime(sessionState.elapsedMs)}</span>
            )}
          </div>

          {/* Camera area */}
          <div className="relative bg-zinc-950 min-h-[200px] flex-[2] min-w-0">
            <video
              ref={mainVideoRef}
              className={`h-full w-full -scale-x-100 object-cover${backgroundBlurEnabled ? " hidden" : ""}`}
              playsInline
              muted
            />
            <canvas
              ref={blurCanvasRef}
              className={`h-full w-full object-cover${backgroundBlurEnabled ? "" : " hidden"}`}
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
              <CoachingToast
                message={coachingMessage}
                onBreak={handleBreak}
                onDismiss={() => setCoachingMessage(null)}
              />
            )}
          </div>

          {/* Today's session list */}
          <div className="flex-1 min-h-0 border-t border-zinc-100 bg-white overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                오늘의 세션
              </span>
              <span className="text-[10px] text-zinc-400">{todaySessions.length}개</span>
            </div>
            <TodaySessionList
              sessions={todaySessions}
              onSessionClick={setSelectedSession}
            />
          </div>

          {/* Mobile: Timetable below session list */}
          <div className="block lg:hidden shrink-0 border-t border-zinc-100 bg-white overflow-hidden h-56">
            <Timetable
              entries={timetableEntries}
              isActive={isActive}
              currentTime={currentTime}
              sessionEndTime={sessionEndTime}
              onSessionClick={() => {
                const s = todaySessions[0];
                if (s) setSelectedSession(s);
              }}
            />
          </div>
        </main>

        {/* RIGHT: Stats Panel */}
        <aside className="hidden lg:flex flex-col w-[260px] shrink-0 border-l border-zinc-100 bg-white overflow-hidden">
          <StatsPanel
            goal={goal}
            elapsedMs={sessionState.elapsedMs}
            focusedMs={focusedMs}
            focusScore={sessionState.focusScore}
            status={status}
            studyMode={studyMode}
            onStudyModeChange={handleStudyModeChange}
            backgroundBlurEnabled={backgroundBlurEnabled}
            onOpenSettings={() => setShowSettings(true)}
          />
        </aside>
      </div>

      {/* Mobile: Stats below camera */}
      <div className="block lg:hidden shrink-0 overflow-y-auto bg-white border-t border-zinc-100 max-h-48">
        <StatsPanel
          goal={goal}
          elapsedMs={sessionState.elapsedMs}
          focusedMs={focusedMs}
          focusScore={sessionState.focusScore}
          status={status}
          studyMode={studyMode}
          onStudyModeChange={handleStudyModeChange}
          backgroundBlurEnabled={backgroundBlurEnabled}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      {/* Modals */}
      {showGoalModal && (
        <GoalSettingModal
          onStart={handleGoalStart}
          onCancel={() => setShowGoalModal(false)}
        />
      )}
      <SessionSettingsPopup
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        backgroundBlurEnabled={backgroundBlurEnabled}
        onToggleBlur={blur.toggleBlur}
        blurLoading={blurLoading}
        studyMode={studyMode}
        onStudyModeChange={handleStudyModeChange}
        goal={goal}
        onGoalUpdate={setGoal}
      />
      <BreakModalContainer
        status={sessionState.status}
        onBreakLogCreated={handleBreakLogCreated}
        onResume={handleResume}
      />
      {selectedSession && (
        <SessionSummaryPopup
          session={selectedSession}
          summary={selectedSession.sessionId === sessionState.summary?.sessionId ? sessionState.summary : null}
          onClose={() => setSelectedSession(null)}
          onSaveFeedback={handleSaveFeedback}
        />
      )}
    </div>
  );
}
