import { Badge } from "@/components/ui/Badge";
import { formatCacheAge } from "@/lib/data/cache";
import type { Player } from "@/types/player";

export function PlayerHeader({
  player,
  dataSource,
  freshnessAgeMs,
}: {
  player: Player;
  dataSource: "demo" | "balldontlie" | "espn";
  freshnessAgeMs?: number;
}) {
  const initials = `${player.firstName[0] ?? ""}${player.lastName[0] ?? ""}`;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-ink-850/70 backdrop-blur-md shadow-glass">
      <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/20 via-transparent to-accent-purple/20" />
      <div className="relative flex flex-col md:flex-row md:items-end gap-5 px-6 py-6">
        <div className="flex items-center gap-5">
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-accent-cyan/30 to-accent-purple/30 text-2xl font-bold text-white ring-1 ring-white/10">
            {initials || "?"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
                {player.fullName}
              </h1>
              {dataSource === "demo" ? (
                <Badge tone="info" dot>
                  Demo data
                </Badge>
              ) : dataSource === "espn" ? (
                <Badge tone="positive" dot>
                  Real data · ESPN
                </Badge>
              ) : (
                <Badge tone="positive" dot>
                  Real data · balldontlie
                </Badge>
              )}
              {freshnessAgeMs !== undefined && (
                <Badge tone="neutral">
                  Cached {formatCacheAge(freshnessAgeMs)}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-white/60">
              {player.team ?? "Free agent"}
              {player.teamAbbreviation ? ` · ${player.teamAbbreviation}` : ""}
              {player.position ? ` · ${player.position}` : ""}
              {player.jersey ? ` · #${player.jersey}` : ""}
            </p>
          </div>
        </div>
        <div className="md:ml-auto flex flex-wrap gap-2 text-xs text-white/60">
          {player.height && (
            <Stat label="Height" value={player.height} />
          )}
          {player.weight && (
            <Stat label="Weight" value={`${player.weight} lb`} />
          )}
          {player.country && (
            <Stat label="Country" value={player.country} />
          )}
          {typeof player.draftYear === "number" && (
            <Stat label="Draft" value={String(player.draftYear)} />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/5">
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}
