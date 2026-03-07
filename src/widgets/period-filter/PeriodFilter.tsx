"use client";

export type Period = "today" | "week" | "month" | "all";

interface PeriodFilterProps {
  value: Period;
  onChange: (period: Period) => void;
}

const OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "오늘" },
  { value: "week", label: "이번 주" },
  { value: "month", label: "이번 달" },
  { value: "all", label: "전체" },
];

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            value === opt.value
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
