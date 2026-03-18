"use client";

import { Input } from "@/shared/ui";

interface GoalFormProps {
  hours: number;
  minutes: number;
  focusPercent: number;
  dailyGoalText: string;
  onHoursChange: (v: number) => void;
  onMinutesChange: (v: number) => void;
  onFocusPercentChange: (v: number) => void;
  onDailyGoalTextChange: (v: string) => void;
}

export function GoalForm({
  hours,
  minutes,
  focusPercent,
  dailyGoalText,
  onHoursChange,
  onMinutesChange,
  onFocusPercentChange,
  onDailyGoalTextChange,
}: GoalFormProps) {
  return (
    <div className="space-y-4">
      {/* Target time */}
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          목표 시간
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={12}
            value={hours}
            onChange={(e) => onHoursChange(Math.max(0, Math.min(12, Number(e.target.value))))}
            className="w-20 text-center"
          />
          <span className="text-sm text-zinc-500">시간</span>
          <Input
            type="number"
            min={0}
            max={59}
            value={minutes}
            onChange={(e) => onMinutesChange(Math.max(0, Math.min(59, Number(e.target.value))))}
            className="w-20 text-center"
          />
          <span className="text-sm text-zinc-500">분</span>
        </div>
      </div>

      {/* Target focus */}
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          목표 집중도
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={100}
            value={focusPercent}
            onChange={(e) => onFocusPercentChange(Math.max(1, Math.min(100, Number(e.target.value))))}
            className="w-20 text-center"
          />
          <span className="text-sm text-zinc-500">%</span>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          권장 집중도는 70~85%입니다. 너무 높은 목표는 오히려 역효과가 될 수 있습니다.
        </p>
      </div>

      {/* Daily goal text */}
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          오늘의 목표
        </div>
        <Input
          type="text"
          value={dailyGoalText}
          onChange={(e) => onDailyGoalTextChange(e.target.value)}
          placeholder="예: 알고리즘 문제 10개 풀기"
          maxLength={100}
          className="mt-2"
        />
      </div>
    </div>
  );
}
