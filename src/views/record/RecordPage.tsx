"use client";

import { useState, useEffect, useMemo } from "react";
import { AppHeader, NavigationMenu } from "@/shared/ui";
import { PeriodFilter, type Period } from "@/widgets/period-filter/PeriodFilter";
import { StatsCard } from "@/widgets/stats-card/StatsCard";
import { WeeklyChart, type WeeklyChartData } from "@/widgets/weekly-chart/WeeklyChart";
import { AchievementsList } from "@/widgets/achievements/AchievementsList";
import { createSessionRepository } from "@/entities/focus-session/repository";
import type { SessionHistoryEntry } from "@/entities/focus-session/model";

function getDateRange(period: Period): { start: number; end: number } {
  const now = new Date();
  const end = now.getTime();

  switch (period) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return { start, end };
    }
    case "week": {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday start
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff).getTime();
      return { start, end };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return { start, end };
    }
    case "all":
    default:
      return { start: 0, end };
  }
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function buildWeeklyData(sessions: SessionHistoryEntry[]): WeeklyChartData[] {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);

  return DAY_LABELS.map((label, i) => {
    const dayStart = new Date(monday);
    dayStart.setDate(monday.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    const daySessions = sessions.filter(
      (s) => s.startedAt >= dayStart.getTime() && s.startedAt < dayEnd.getTime(),
    );

    const actualMinutes = Math.round(
      daySessions.reduce((sum, s) => sum + s.durationMs, 0) / (1000 * 60),
    );
    const targetMinutes = daySessions.reduce((sum, s) => {
      if (!s.goal) return sum + 120; // default 2h
      return sum + s.goal.targetHours * 60 + s.goal.targetMinutes;
    }, 0);
    const focusRate =
      daySessions.length > 0
        ? Math.round(
            daySessions.reduce((sum, s) => sum + s.focusPercent, 0) / daySessions.length,
          )
        : 0;

    return { day: label, targetMinutes, actualMinutes, focusRate };
  });
}

export function RecordPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("week");
  const [allSessions, setAllSessions] = useState<SessionHistoryEntry[]>([]);

  useEffect(() => {
    const repo = createSessionRepository();
    repo.getAllSessions().then(setAllSessions).catch(() => {});
  }, []);

  const { start } = getDateRange(period);
  const filtered = useMemo(
    () => allSessions.filter((s) => s.startedAt >= start),
    [allSessions, start],
  );

  const totalMs = filtered.reduce((sum, s) => sum + s.durationMs, 0);
  const avgFocus =
    filtered.length > 0
      ? Math.round(filtered.reduce((sum, s) => sum + s.focusPercent, 0) / filtered.length)
      : 0;

  const weeklyData = useMemo(() => buildWeeklyData(allSessions), [allSessions]);

  return (
    <div className="flex h-screen flex-col bg-zinc-50">
      <AppHeader onMenuToggle={() => setMenuOpen((v) => !v)} />
      <NavigationMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-xl font-bold text-zinc-900">개인 기록</h1>
          <p className="mt-1 text-sm text-zinc-500">
            집중도 통계와 학습 기록을 확인하세요
          </p>

          <div className="mt-6">
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <StatsCard
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              }
              label="총 학습 시간"
              value={formatDuration(totalMs)}
            />
            <StatsCard
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              }
              label="평균 집중도"
              value={`${avgFocus}%`}
            />
          </div>

          {period === "week" && (
            <div className="mt-6">
              <WeeklyChart data={weeklyData} />
            </div>
          )}

          <div className="mt-6">
            <AchievementsList sessions={allSessions} />
          </div>
        </div>
      </main>
    </div>
  );
}
