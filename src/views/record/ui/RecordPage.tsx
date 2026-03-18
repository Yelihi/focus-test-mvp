"use client";

import { useState, useEffect, useMemo } from "react";
import { AppHeader, NavigationMenu } from "@/shared/ui";
import { PeriodFilter, type Period } from "@/widgets/period-filter";
import { StatsCard } from "@/widgets/stats-card";
import { WeeklyChart } from "@/widgets/weekly-chart";
import { AchievementsList } from "@/widgets/achievements";
import { createSessionRepository } from "@/entities/focus-session/services";
import type { SessionHistoryEntry } from "@/entities/focus-session/models";
import { getDateRange, formatDuration, buildWeeklyData } from "../lib";

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
