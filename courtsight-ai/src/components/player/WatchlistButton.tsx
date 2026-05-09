"use client";

import { useWatchlist } from "@/lib/state/watchlist";
import { cn } from "@/lib/utils/cn";

export function WatchlistButton({
  player,
}: {
  player: { id: string; fullName: string; teamAbbreviation?: string };
}) {
  const items = useWatchlist((s) => s.items);
  const toggle = useWatchlist((s) => s.toggle);
  const isWatched = items.some((i) => i.id === player.id);
  return (
    <button
      type="button"
      onClick={() =>
        toggle({ id: player.id, name: player.fullName, team: player.teamAbbreviation })
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition",
        isWatched
          ? "bg-accent-purple/15 text-accent-purple ring-accent-purple/40 hover:bg-accent-purple/20"
          : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10 hover:text-white",
      )}
    >
      <span>{isWatched ? "★" : "☆"}</span>
      {isWatched ? "Watching" : "Add to watchlist"}
    </button>
  );
}
