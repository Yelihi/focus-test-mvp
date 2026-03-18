import type { ButtonHTMLAttributes, ReactNode } from "react";

const variantClasses = {
  primary: "rounded-lg bg-zinc-900 text-white px-5 py-2 text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors",
  secondary: "rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors",
  ghost: "text-sm font-medium text-zinc-500 hover:text-zinc-700 transition-colors",
  destructive: "rounded-lg bg-zinc-700/80 text-white hover:bg-zinc-600 transition-colors",
  icon: "flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 transition-colors",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  children: ReactNode;
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button className={`${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
