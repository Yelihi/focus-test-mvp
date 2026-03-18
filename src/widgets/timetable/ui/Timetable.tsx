"use client";

import { useEffect, useRef, useState } from "react";
import type { TimetableEntry } from "@/entities/focus-session/models";
import {
  STATE_COLORS,
  BAR_LEFT,
  BAR_RIGHT,
  TOTAL_MS_PER_DAY,
  SLOT_COUNT,
  SLOT_HEIGHT_PX,
  TOTAL_HEIGHT_PX,
} from "../config/const";

interface TimetableProps {
  entries: TimetableEntry[];
  isActive: boolean;
  currentTime: Date;
  sessionEndTime?: number | null;
  onSessionClick?: () => void;
}

function getSlotLabel(slotIndex: number): string | null {
  // Show label every 1 hour (every 4 slots of 15 min)
  if (slotIndex % 4 !== 0) return null;
  const h = Math.floor(slotIndex / 4);
  return `${h.toString().padStart(2, "0")}:00`;
}

function getDayStart(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function timeToPercent(ts: number, dayStart: number): number {
  return ((ts - dayStart) / TOTAL_MS_PER_DAY) * 100;
}

export function Timetable({ entries, isActive, currentTime, sessionEndTime, onSessionClick }: TimetableProps) {
  const currentLineRef = useRef<HTMLDivElement>(null);
  const [isGroupHovered, setIsGroupHovered] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Suppress SSR rendering of the current-time line to avoid hydration mismatch
  // (nowPercent depends on Date.now() which differs between server and client)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const dayStart = getDayStart(currentTime);
  // Cap "now" so bars never exceed the current time line
  const nowTs = currentTime.getTime();
  const nowPercent = timeToPercent(nowTs, dayStart);

  // Auto-scroll to current time on mount and when becoming active
  useEffect(() => {
    if (currentLineRef.current) {
      currentLineRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [isActive]);

  // Build segments — endTime capped at nowTs so bars never go past current time line
  // When session has ended, freeze the last bar at sessionEndTime
  const effectiveEnd = sessionEndTime ?? nowTs;
  const segments = entries.map((entry, i) => {
    const rawEnd = i < entries.length - 1 ? entries[i + 1].startTime : effectiveEnd;
    const endTime = Math.min(rawEnd, nowTs);
    return { ...entry, endTime };
  });

  // Group bounds (first entry top → last entry bottom)
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];
  const groupTopPct = firstSeg
    ? Math.max(0, timeToPercent(firstSeg.startTime, dayStart))
    : null;
  const groupBottomPct = lastSeg
    ? Math.min(100, timeToPercent(lastSeg.endTime, dayStart))
    : null;
  const groupHeightPct =
    groupTopPct !== null && groupBottomPct !== null
      ? Math.max(0, groupBottomPct - groupTopPct)
      : 0;

  const handleSegmentMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setIsGroupHovered(true);
  };

  const handleSegmentMouseLeave = () => {
    hoverTimerRef.current = setTimeout(() => setIsGroupHovered(false), 60);
  };

  const handleSegmentClick = () => {
    onSessionClick?.();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-2 py-2 border-b border-zinc-100">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 text-center">
          진행 기록
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="relative"
          style={{ height: `${TOTAL_HEIGHT_PX}px` }}
        >
          {/* Hour slot lines and labels */}
          {Array.from({ length: SLOT_COUNT }, (_, i) => {
            const label = getSlotLabel(i);
            const top = i * SLOT_HEIGHT_PX;
            return (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-zinc-100"
                style={{ top }}
              >
                {label && (
                  <span className="absolute left-1 -top-2 text-[9px] text-zinc-400 leading-none select-none">
                    {label}
                  </span>
                )}
              </div>
            );
          })}

          {/* Colored entry bars */}
          {segments.map((seg, i) => {
            const topPercent = timeToPercent(seg.startTime, dayStart);
            const heightPercent = ((seg.endTime - seg.startTime) / TOTAL_MS_PER_DAY) * 100;

            if (topPercent < 0 || topPercent > 100) return null;
            if (heightPercent <= 0) return null;

            const clampedTop = Math.max(0, topPercent);
            const clampedHeight = Math.min(heightPercent, 100 - clampedTop);
            const colors = STATE_COLORS[seg.state];

            return (
              <div
                key={i}
                className={`absolute ${BAR_LEFT} ${BAR_RIGHT} border ${colors.border} ${colors.bg} cursor-pointer transition-opacity ${isGroupHovered ? "opacity-100" : "opacity-90"}`}
                style={{
                  top: `${clampedTop}%`,
                  height: `${clampedHeight}%`,
                  minHeight: "3px",
                }}
                onMouseEnter={handleSegmentMouseEnter}
                onMouseLeave={handleSegmentMouseLeave}
                onClick={handleSegmentClick}
                title={seg.state}
              />
            );
          })}

          {/* Group hover border overlay */}
          {isGroupHovered && groupTopPct !== null && groupHeightPct > 0 && (
            <div
              className={`absolute ${BAR_LEFT} ${BAR_RIGHT} border border-zinc-500 rounded-sm pointer-events-none z-10`}
              style={{
                top: `${groupTopPct}%`,
                height: `${groupHeightPct}%`,
              }}
            />
          )}

          {/* Current time line — client-only to avoid SSR/hydration mismatch */}
          {mounted && nowPercent >= 0 && nowPercent <= 100 && (
            <div
              ref={currentLineRef}
              className="absolute left-0 right-0 flex items-center pointer-events-none"
              style={{ top: `${nowPercent}%` }}
            >
              <div className="h-px w-full bg-red-500/70" />
              <div className="absolute h-1.5 w-1.5 rounded-full bg-red-500" style={{ left: "38px", transform: "translate(-50%, -50%)" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
