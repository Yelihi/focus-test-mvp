interface ProgressBarProps {
  value: number; // 0–100
  variant?: "light" | "dark";
  className?: string;
}

export function ProgressBar({ value, variant = "light", className = "" }: ProgressBarProps) {
  const trackClass = variant === "dark" ? "bg-zinc-700" : "bg-zinc-100";
  const fillClass = variant === "dark" ? "bg-white" : "bg-zinc-900";

  return (
    <div className={`h-1 overflow-hidden ${trackClass} ${className}`}>
      <div
        className={`h-full ${fillClass} transition-all duration-500`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
