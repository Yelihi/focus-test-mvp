import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className = "", ...props }: SelectProps) {
  return (
    <select
      className={`rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300 disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
