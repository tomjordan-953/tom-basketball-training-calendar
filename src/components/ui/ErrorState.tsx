import type { ReactNode } from "react";

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-accent-red/20 bg-accent-red/5 px-5 py-6 text-sm">
      <p className="text-accent-red font-medium">{title}</p>
      {description && (
        <p className="mt-1 text-white/70 max-w-xl">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
