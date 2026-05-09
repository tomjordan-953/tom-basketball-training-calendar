import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-white/5 bg-ink-850/70 backdrop-blur-md shadow-glass overflow-hidden",
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.025] to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, right, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 px-5 pt-5",
        className,
      )}
    >
      <div>
        <h3 className="text-sm font-medium text-white/80 tracking-wide uppercase">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs text-white/40">{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("px-5 pb-5 pt-4", className)}>{children}</div>;
}
