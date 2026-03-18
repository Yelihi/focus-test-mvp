import type { TimetableState } from "@/entities/focus-session/models";

export const STATE_COLORS: Record<TimetableState, { border: string; bg: string }> = {
  focused:    { border: "border-emerald-500", bg: "bg-emerald-500/20" },
  distracted: { border: "border-orange-400",  bg: "bg-orange-400/20" },
  absent:     { border: "border-red-500",     bg: "bg-red-500/20" },
  break:      { border: "border-blue-400",    bg: "bg-blue-400/20" },
};

// Left offset for bars (must clear the time labels)
export const BAR_LEFT = "left-[38px]";
export const BAR_RIGHT = "right-[4px]";

export const TOTAL_MS_PER_DAY = 24 * 60 * 60 * 1000;
export const SLOT_COUNT = 96; // 15-min slots
export const SLOT_HEIGHT_PX = 40;
export const TOTAL_HEIGHT_PX = SLOT_COUNT * SLOT_HEIGHT_PX;
