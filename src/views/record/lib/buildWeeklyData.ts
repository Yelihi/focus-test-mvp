import type { SessionHistoryEntry } from "@/entities/focus-session/models";
import type { WeeklyChartData } from "@/widgets/weekly-chart";
import { DAY_LABELS } from "../config/constants";

export function buildWeeklyData(sessions: SessionHistoryEntry[]): WeeklyChartData[] {
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
