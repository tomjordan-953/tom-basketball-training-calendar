import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { fetchScoreboard, type ScoreboardGame } from "@/lib/data/scoreboard";

export const dynamic = "force-dynamic";

export default async function ScoreboardPage() {
  const games = await fetchScoreboard();
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Today's NBA games</h1>
          <p className="text-sm text-white/50 mt-1">
            Live scoreboard via ESPN. Refreshes when the page is reloaded.
          </p>
        </div>
        <Badge tone="info" dot>
          {games.length} {games.length === 1 ? "game" : "games"}
        </Badge>
      </div>

      {games.length === 0 ? (
        <EmptyState
          title="No games today"
          description="ESPN's scoreboard returned no games for the current date. Check back later or browse players."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {games.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function GameCard({ game }: { game: ScoreboardGame }) {
  const status = game.status.toLowerCase();
  const isFinal = status.includes("final");
  const isLive = status.includes("in progress") || status.includes("halftime");
  return (
    <Card>
      <CardHeader
        title={`${game.away.shortDisplayName} @ ${game.home.shortDisplayName}`}
        subtitle={game.venue}
        right={
          <Badge tone={isLive ? "danger" : isFinal ? "neutral" : "info"} dot={isLive}>
            {game.statusDetail || game.status}
          </Badge>
        }
      />
      <CardBody>
        <div className="grid grid-cols-2 gap-3">
          <TeamRow team={game.away} />
          <TeamRow team={game.home} />
        </div>
        {game.broadcast && (
          <p className="mt-3 text-[11px] text-white/40">📺 {game.broadcast}</p>
        )}
      </CardBody>
    </Card>
  );
}

function TeamRow({ team }: { team: ScoreboardGame["home"] }) {
  return (
    <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 px-3 py-3">
      <p className="text-[10px] uppercase tracking-widest text-white/40">
        {team.isHome ? "Home" : "Away"}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{team.displayName}</p>
      <p className="text-[11px] text-white/40">
        {team.abbreviation}
        {team.record ? ` · ${team.record}` : ""}
      </p>
      {team.score !== undefined && (
        <p className="mt-2 text-2xl font-bold text-white tabular-nums">{team.score}</p>
      )}
    </div>
  );
}
