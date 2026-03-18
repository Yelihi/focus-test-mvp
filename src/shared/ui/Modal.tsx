import type { ReactNode } from "react";

const maxWidthMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

interface ModalProps {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg";
  className?: string;
}

export function Modal({ children, maxWidth = "md", className = "" }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className={`w-full ${maxWidthMap[maxWidth]} rounded-2xl bg-white shadow-xl ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
