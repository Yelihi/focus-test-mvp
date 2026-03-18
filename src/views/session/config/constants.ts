import type { SessionState } from "@/features/session";

export const FOCUS_STATE_BADGE = {
  focused:    { bg: "bg-emerald-500/20", text: "text-emerald-300", dot: "bg-emerald-400", label: "집중 중" },
  distracted: { bg: "bg-orange-500/20",  text: "text-orange-300",  dot: "bg-orange-400",  label: "집중 저하" },
  absent:     { bg: "bg-red-500/20",     text: "text-red-300",     dot: "bg-red-400",     label: "얼굴 미감지" },
} as const;

export const INITIAL_SESSION_STATE: SessionState = {
  status: "idle",
  focusState: "focused",
  focusScore: 0,
  confidence: 0,
  coveragePercent: 100,
  effectiveSampleRateHz: 0,
  elapsedMs: 0,
  summary: null,
  breakCount: 0,
};
