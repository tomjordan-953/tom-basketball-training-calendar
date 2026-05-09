"use client";

import Link from "next/link";
import { useWatchlist } from "@/lib/state/watchlist";

export function WatchlistPanel() {
  const items = useWatchlist((s) => s.items);
  const remove = useWatchlist((s) => s.remove);
  if (items.length === 0) {
    return (
      <div className="px-3 py-2 text-[11px] text-white/40">
        Tap ★ on any player to pin them here.
      </div>
    );
  }
  return (
    <ul className="space-y-1 px-3">
      {items.map((p) => (
        <li
          key={p.id}
          className="group flex items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-white/[0.04]"
        >
          <Link
            href={`/players/${encodeURIComponent(p.id)}`}
            className="flex-1 truncate text-white/80 hover:text-white"
          >
            {p.name}
            {p.team && <span className="ml-2 text-white/30">{p.team}</span>}
          </Link>
          <button
            type="button"
            onClick={() => remove(p.id)}
            aria-label="Remove from watchlist"
            className="ml-2 text-white/30 opacity-0 group-hover:opacity-100 hover:text-accent-red transition"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
