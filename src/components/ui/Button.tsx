import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60 disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        variant === "primary" &&
          "bg-gradient-to-br from-accent-cyan/90 to-accent-blue/90 text-ink-950 hover:from-accent-cyan hover:to-accent-blue shadow-lg shadow-accent-blue/20",
        variant === "ghost" &&
          "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
        variant === "outline" &&
          "border border-white/10 bg-transparent text-white/80 hover:bg-white/5",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
