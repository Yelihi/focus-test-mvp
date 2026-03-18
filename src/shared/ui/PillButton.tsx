import type { ButtonHTMLAttributes, ReactNode } from "react";

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

export function PillButton({ active, className = "", children, ...props }: PillButtonProps) {
  const base = "rounded-full px-4 py-1.5 text-sm transition-colors";
  const activeClass = "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900";
  const inactiveClass =
    "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800";

  return (
    <button className={`${base} ${active ? activeClass : inactiveClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
