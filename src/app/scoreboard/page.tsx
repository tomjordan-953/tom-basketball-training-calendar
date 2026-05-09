import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TeamLogo } from "@/components/ui/TeamLogo";
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
            Live scoreboard from ESPN. Click any game for the box score, top performers, and the model's projection vs the actual line.
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
            <Link
              key={g.id}
              href={`/scoreboard/${g.id}`}
              className="group"
            >
              <Card className="h-full transition group-hover:border-white/15 group-hover:translate-y-[-2px]">
                <CardBody>
                  <GameHeader game={g} />
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <TeamRow team={g.away} winnerScore={getWinnerScore(g)} />
                    <TeamRow team={g.home} winnerScore={getWinnerScore(g)} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-white/40">
                      {g.venue}
                      {g.broadcast ? ` · 📺 ${g.broadcast}` : ""}
                    </span>
                    <span className="text-accent-cyan group-hover:translate-x-0.5 transition">
                      View box score →
                    </span>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function getWinnerScore(g: ScoreboardGame): "home" | "away" | null {
  const h = Number(g.home.score);
  const a = Number(g.away.score);
  if (!Number.isFinite(h) || !Number.isFinite(a)) return null;
  if (h > a) return "home";
  if (a > h) return "away";
  return null;
}

function GameHeader({ game }: { game: ScoreboardGame }) {
  const status = game.status.toLowerCase();
  const isFinal = status.includes("final");
  const isLive = status.includes("in progress") || status.includes("halftime");
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-semibold text-white">
        {game.away.shortDisplayName} @ {game.home.shortDisplayName}
      </p>
      <Badge tone={isLive ? "danger" : isFinal ? "neutral" : "info"} dot={isLive}>
        {game.statusDetail || game.status}
      </Badge>
    </div>
  );
}

function TeamRow({
  team,
  winnerScore,
}: {
  team: ScoreboardGame["home"];
  winnerScore: "home" | "away" | null;
}) {
  const isWinner = winnerScore === (team.isHome ? "home" : "away");
  return (
    <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 px-3 py-3">
      <div className="flex items-center gap-2">
        <TeamLogo abbreviation={team.abbreviation} size="md" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            {team.isHome ? "Home" : "Away"}
          </p>
          <p className="text-sm font-semibold text-white truncate">{team.shortDisplayName}</p>
        </div>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <p className="text-[11px] text-white/40">
          {team.abbreviation}
          {team.record ? ` · ${team.record}` : ""}
        </p>
        {team.score !== undefined && (
          <p
            className={
              "text-2xl font-bold tabular-nums " +
              (isWinner ? "text-accent-green" : "text-white")
            }
          >
            {team.score}
          </p>
        )}
      </div>
    </div>
  );
}
