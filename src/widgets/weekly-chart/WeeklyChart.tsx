"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export interface WeeklyChartData {
  day: string;
  targetMinutes: number;
  actualMinutes: number;
  focusRate: number;
}

interface WeeklyChartProps {
  data: WeeklyChartData[];
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-200 bg-white">
        <p className="text-sm text-zinc-400">이번 주 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-zinc-900">주간 학습 현황</h3>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#71717a" }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#71717a" }} label={{ value: "분", position: "insideTopLeft", offset: 10, style: { fontSize: 11, fill: "#a1a1aa" } }} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12, fill: "#71717a" }} label={{ value: "%", position: "insideTopRight", offset: 10, style: { fontSize: 11, fill: "#a1a1aa" } }} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 13 }}
            formatter={(value, name) => {
              if (name === "focusRate") return [`${value}%`, "집중률"];
              return [`${value}분`, name === "targetMinutes" ? "목표" : "실제"];
            }}
          />
          <Legend
            formatter={(value) => {
              if (value === "targetMinutes") return "목표";
              if (value === "actualMinutes") return "실제";
              if (value === "focusRate") return "집중률";
              return value;
            }}
            wrapperStyle={{ fontSize: 12 }}
          />
          <Bar yAxisId="left" dataKey="targetMinutes" fill="#e4e4e7" radius={[4, 4, 0, 0]} barSize={16} />
          <Bar yAxisId="left" dataKey="actualMinutes" fill="#18181b" radius={[4, 4, 0, 0]} barSize={16} />
          <Line yAxisId="right" type="monotone" dataKey="focusRate" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
