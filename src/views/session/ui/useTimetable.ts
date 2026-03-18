"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { TimetableEntry, FocusState, SessionStatus } from "@/entities/focus-session/models";

export function useTimetable(status: SessionStatus, focusState: FocusState) {
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionEndTime, setSessionEndTime] = useState<number | null>(null);

  const prevStatusRef = useRef<SessionStatus>("idle");
  const prevFocusStateRef = useRef<FocusState>("focused");

  // Update current time every minute
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const prevFocusState = prevFocusStateRef.current;

    if (prevStatus === "idle" && status === "running") {
      // Session just started — initialize with initial focused entry
      setTimetableEntries([{ state: focusState, startTime: Date.now() }]);
      setSessionEndTime(null);
    } else if (status === "running") {
      if (prevStatus === "break") {
        // Resumed from break
        setTimetableEntries((prev) => [...prev, { state: focusState, startTime: Date.now() }]);
      } else if (prevFocusState !== focusState) {
        // Focus state changed while running
        setTimetableEntries((prev) => [...prev, { state: focusState, startTime: Date.now() }]);
      }
    } else if (status === "break" && prevStatus !== "break") {
      setTimetableEntries((prev) => [...prev, { state: "break", startTime: Date.now() }]);
    } else if (status === "stopped" && prevStatus !== "stopped") {
      setSessionEndTime(Date.now());
    }

    prevStatusRef.current = status;
    prevFocusStateRef.current = focusState;
  }, [status, focusState]);

  const resetTimetable = useCallback(() => {
    setTimetableEntries([]);
    setSessionEndTime(null);
  }, []);

  return { timetableEntries, currentTime, sessionEndTime, resetTimetable };
}
