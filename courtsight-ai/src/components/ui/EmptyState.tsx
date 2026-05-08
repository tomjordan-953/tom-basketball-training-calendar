import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12 rounded-2xl border border-dashed border-white/10 bg-ink-900/40">
      <div className="text-2xl mb-2">🏀</div>
      <p className="text-white/80 font-medium">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-white/50 max-w-md">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
