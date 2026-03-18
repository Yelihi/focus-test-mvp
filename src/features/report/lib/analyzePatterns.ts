import type { SessionSummary, BreakReason } from "@/entities/focus-session";
import { focusSessionBehavior } from "@/entities/focus-session";

export interface PatternAnalysis {
  topBreakReason: { reason: BreakReason; count: number } | null;
  reasonDistribution: { reason: BreakReason; count: number }[];
  avgRecoveryMs: number;
  longestContinuousFocusMs: number;
  breakCount: number;
  comments: string[];
}

export function analyzePatterns(summary: SessionSummary): PatternAnalysis {
  const reasonCounts = new Map<BreakReason, number>();
  for (const b of summary.breaks) {
    reasonCounts.set(b.reason, (reasonCounts.get(b.reason) ?? 0) + 1);
  }

  const distribution = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const topBreakReason = distribution[0] ?? null;

  const comments: string[] = [];

  // Focus quality comment
  if (summary.focusPercent >= 80) {
    comments.push("집중도가 매우 높았습니다. 좋은 흐름이었어요!");
  } else if (summary.focusPercent >= 60) {
    comments.push("전반적으로 양호한 집중이었습니다.");
  } else {
    comments.push("집중이 자주 끊겼어요. 환경을 점검해보세요.");
  }

  // Top break reason comment
  if (topBreakReason && topBreakReason.count >= 2) {
    comments.push(
      `${focusSessionBehavior.getBreakReasonLabel(topBreakReason.reason)}이(가) 주요 중단 원인입니다. (${topBreakReason.count}회)`,
    );
  }

  // Recovery time comment
  if (summary.avgRecoveryMs > 0) {
    const avgMin = summary.avgRecoveryMs / 60_000;
    if (avgMin > 10) {
      comments.push("복귀 시간이 긴 편이에요. 짧은 break를 추천합니다.");
    } else if (avgMin <= 3) {
      comments.push("빠른 복귀가 인상적이에요!");
    }
  }

  // Longest continuous focus
  if (summary.longestContinuousFocusMs > 0) {
    const min = Math.floor(summary.longestContinuousFocusMs / 60_000);
    if (min >= 25) {
      comments.push(`최장 ${min}분 연속 집중 — 포모도로 한 세트 이상이에요.`);
    }
  }

  return {
    topBreakReason,
    reasonDistribution: distribution,
    avgRecoveryMs: summary.avgRecoveryMs,
    longestContinuousFocusMs: summary.longestContinuousFocusMs,
    breakCount: summary.breakCount,
    comments,
  };
}
