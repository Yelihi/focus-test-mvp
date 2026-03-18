"use client";

import { useState, useCallback, type MutableRefObject } from "react";
import type { StudyMode } from "@/entities/focus-session/models";
import { getLastStudyMode, setLastStudyMode } from "@/shared/lib/storage";
import type { SessionManager } from "@/features/session";

export function useStudyMode(managerRef: MutableRefObject<SessionManager | null>) {
  const [studyMode, setStudyMode] = useState<StudyMode>(() => getLastStudyMode());

  const handleStudyModeChange = useCallback(
    (mode: StudyMode) => {
      setStudyMode(mode);
      setLastStudyMode(mode);
      managerRef.current?.setStudyMode(mode);
    },
    [managerRef],
  );

  return { studyMode, handleStudyModeChange };
}
