"use client";

import type { SessionHistoryEntry } from "@/entities/focus-session/model";

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  achievedAt: string | null;
}

interface AchievementsListProps {
  sessions: SessionHistoryEntry[];
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function computeAchievements(sessions: SessionHistoryEntry[]): Achievement[] {
  const sorted = [...sessions].sort((a, b) => a.startedAt - b.startedAt);
  const achievements: Achievement[] = [];

  // First session completed
  const firstSession = sorted[0];
  achievements.push({
    id: "first-session",
    icon: "🎯",
    title: "첫 세션 완료",
    description: "첫 번째 집중 세션을 완료했습니다",
    achievedAt: firstSession ? formatDate(firstSession.startedAt) : null,
  });

  // Total 50 hours
  const totalMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);
  const totalHours = totalMs / (1000 * 60 * 60);
  achievements.push({
    id: "50-hours",
    icon: "⏱️",
    title: "총 50시간 달성",
    description: `현재 ${Math.floor(totalHours)}시간 학습 (목표: 50시간)`,
    achievedAt: totalHours >= 50 ? "달성" : null,
  });

  // Focus rate 90%
  const highFocus = sorted.find((s) => s.focusPercent >= 90);
  achievements.push({
    id: "90-focus",
    icon: "🔥",
    title: "집중도 90% 달성",
    description: "세션 중 집중도 90% 이상을 달성했습니다",
    achievedAt: highFocus ? formatDate(highFocus.startedAt) : null,
  });

  // 7 consecutive days
  const daySet = new Set(
    sorted.map((s) => new Date(s.startedAt).toDateString()),
  );
  const days = Array.from(daySet)
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b);
  let maxConsecutive = 1;
  let current = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (days[i] - days[i - 1]) / (1000 * 60 * 60 * 24);
    if (diff <= 1) {
      current++;
      maxConsecutive = Math.max(maxConsecutive, current);
    } else {
      current = 1;
    }
  }
  achievements.push({
    id: "7-streak",
    icon: "📅",
    title: "7일 연속 달성",
    description: `현재 최대 ${days.length > 0 ? maxConsecutive : 0}일 연속 학습`,
    achievedAt: maxConsecutive >= 7 ? "달성" : null,
  });

  return achievements;
}

export function AchievementsList({ sessions }: AchievementsListProps) {
  const achievements = computeAchievements(sessions);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-zinc-900">달성 기록</h3>
      <div className="space-y-3">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={`flex items-start gap-3 rounded-lg p-3 ${
              a.achievedAt ? "bg-zinc-50" : "opacity-50"
            }`}
          >
            <span className="text-xl">{a.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-900">{a.title}</p>
              <p className="text-xs text-zinc-500">{a.description}</p>
            </div>
            {a.achievedAt && (
              <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                {a.achievedAt}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
