import type { StudyMode } from "@/entities/focus-session";

const STUDY_MODE_KEY = "focus-app:studyMode";

export function getLastStudyMode(): StudyMode {
  try {
    const val = localStorage.getItem(STUDY_MODE_KEY);
    if (val === "work" || val === "reading") return val;
  } catch {
    // SSR or storage unavailable
  }
  return "work";
}

export function setLastStudyMode(mode: StudyMode): void {
  try {
    localStorage.setItem(STUDY_MODE_KEY, mode);
  } catch {
    // storage unavailable
  }
}
