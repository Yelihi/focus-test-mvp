"use client";

import { useRef, useState, useCallback } from "react";
import type { ActivityLogEntry } from "@/entities/focus-session/models";

export interface UseActivityLogReturn {
  activityEntries: ActivityLogEntry[];
  addActivity: (type: ActivityLogEntry["type"], message: string) => void;
  resetActivityLog: () => void;
}

export function useActivityLog(): UseActivityLogReturn {
  const idCounterRef = useRef(0);
  const [activityEntries, setActivityEntries] = useState<ActivityLogEntry[]>([]);

  const addActivity = useCallback(
    (type: ActivityLogEntry["type"], message: string) => {
      const entry: ActivityLogEntry = {
        id: String(++idCounterRef.current),
        type,
        timestamp: Date.now(),
        message,
      };
      setActivityEntries((prev) => [entry, ...prev]);
    },
    [],
  );

  const resetActivityLog = useCallback(() => {
    setActivityEntries([]);
  }, []);

  return { activityEntries, addActivity, resetActivityLog };
}
