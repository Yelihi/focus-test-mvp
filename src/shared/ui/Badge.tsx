import type { ReactNode } from "react";

const variantClasses = {
  green: "bg-green-100 text-green-700",
  neutral: "bg-zinc-100 text-zinc-500",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-700",
};

interface BadgeProps {
  children: ReactNode;
  variant?: keyof typeof variantClasses;
  className?: string;
}

export function Badge({ children, variant = "neutral", className = "" }: BadgeProps) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
