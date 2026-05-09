import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

type Tone =
  | "neutral"
  | "info"
  | "positive"
  | "warning"
  | "danger"
  | "purple";

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

const TONE: Record<Tone, string> = {
  neutral: "bg-white/5 text-white/70 ring-white/10",
  info: "bg-accent-cyan/10 text-accent-cyan ring-accent-cyan/30",
  positive: "bg-accent-green/10 text-accent-green ring-accent-green/30",
  warning: "bg-accent-orange/10 text-accent-orange ring-accent-orange/30",
  danger: "bg-accent-red/10 text-accent-red ring-accent-red/30",
  purple: "bg-accent-purple/10 text-accent-purple ring-accent-purple/30",
};

const DOT: Record<Tone, string> = {
  neutral: "bg-white/40",
  info: "bg-accent-cyan",
  positive: "bg-accent-green",
  warning: "bg-accent-orange",
  danger: "bg-accent-red",
  purple: "bg-accent-purple",
};

export function Badge({ tone = "neutral", children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE[tone],
        className,
      )}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", DOT[tone])} />
      )}
      {children}
    </span>
  );
}
