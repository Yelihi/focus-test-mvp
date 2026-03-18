import type { FocusState } from "@/entities/focus-session";

export const STATE_COLORS: Record<FocusState, string> = {
  focused: "bg-green-500",
  distracted: "bg-yellow-500",
  absent: "bg-red-500",
};

export const STATE_LABELS: Record<FocusState, string> = {
  focused: "Focused",
  distracted: "Distracted",
  absent: "Absent",
};
