import { Badge } from "@/components/ui/Badge";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { formatCacheAge } from "@/lib/data/cache";
import { WatchlistButton } from "@/components/player/WatchlistButton";
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
  const teamLine = player.team ?? player.teamAbbreviation ?? null;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-ink-850/70 backdrop-blur-md shadow-glass">
      <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/25 via-transparent to-accent-purple/25" />
      <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent-cyan/10 blur-3xl" />
      <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-accent-purple/10 blur-3xl" />
      <div className="relative flex flex-col md:flex-row md:items-end gap-5 px-6 py-6">
        <div className="flex items-center gap-5">
          <PlayerAvatar src={player.imageUrl} name={player.fullName} size="xl" ring />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {player.teamAbbreviation && (
                <TeamLogo abbreviation={player.teamAbbreviation} size="md" />
              )}
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
            <p className="mt-1 text-sm text-white/65">
              {teamLine ?? "Team unknown"}
              {player.teamAbbreviation && teamLine !== player.teamAbbreviation
                ? ` · ${player.teamAbbreviation}`
                : ""}
              {player.position ? ` · ${player.position}` : ""}
              {player.jersey ? ` · #${player.jersey}` : ""}
              {player.experienceYears !== undefined
                ? ` · ${player.experienceYears} yr exp.`
                : ""}
            </p>
          </div>
        </div>
        <div className="md:ml-auto flex flex-wrap items-center gap-2 text-xs text-white/60">
          <WatchlistButton player={player} />
          {player.height && <Stat label="Height" value={player.height} />}
          {player.weight && <Stat label="Weight" value={`${player.weight} lb`} />}
          {player.country && <Stat label="Country" value={player.country} />}
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
