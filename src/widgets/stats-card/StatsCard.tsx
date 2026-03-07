"use client";

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: string;
  badgeColor?: "green" | "red" | "zinc";
}

export function StatsCard({ icon, label, value, badge, badgeColor = "zinc" }: StatsCardProps) {
  const badgeStyles: Record<string, string> = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    zinc: "bg-zinc-100 text-zinc-600",
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-bold text-zinc-900">{value}</span>
        {badge && (
          <span className={`mb-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${badgeStyles[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
