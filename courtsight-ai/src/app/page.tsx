import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { PlayerSearch } from "@/components/search/PlayerSearch";
import { FEATURED_DEMO_IDS } from "@/lib/data/providers/demoProvider";
import { getProvider } from "@/lib/data/providers";
import { fmtStat } from "@/lib/utils/format";
import { buildProjection } from "@/lib/prediction/projectionEngine";
import { TTL, cached } from "@/lib/data/cache";
import { fetchScoreboard } from "@/lib/data/scoreboard";
import { computeAccuracyStats } from "@/lib/tracking/grader";

export const dynamic = "force-dynamic";

export default async function Home() {
  const provider = getProvider();
  const status = provider.status;

  const idsToShow =
    provider.name === "demo"
      ? FEATURED_DEMO_IDS
      : await cached(`featured:${provider.name}`, TTL.search, async () => {
          const popular = ["Gilgeous-Alexander", "Jokic", "Doncic", "Tatum", "Antetokounmpo", "Edwards"];
          const ids: string[] = [];
          for (const name of popular) {
            const results = await provider.searchPlayers(name);
            if (results[0]) ids.push(results[0].id);
            if (ids.length >= 6) break;
          }
          return ids;
        });

  const [featured, scoreboard, accuracyStats] = await Promise.all([
    Promise.all(
      idsToShow.map((id) =>
        cached(`featured-card:${provider.name}:${id}`, TTL.projection, async () => {
          const player = await provider.getPlayer(id);
          if (!player) return null;
          const [logs, season, next, injury] = await Promise.all([
            provider.getPlayerGameLogs(player.id, 24),
            provider.getSeasonAverages(player.id),
            provider.getNextGame(player.id),
            provider.getInjuryContext(player.id),
          ]);
          const opponent = next ? await provider.getOpponentContext(next.opponent) : null;
          if (logs.length < 3) return null;
          const projection = buildProjection({
            player,
            logs,
            season,
            nextGame: next,
            opponent,
            injury,
            dataSource: provider.name,
          });
          return { player, projection };
        }),
      ),
    ).then((arr) => arr.filter(Boolean) as Array<{ player: NonNullable<Awaited<ReturnType<typeof provider.getPlayer>>>; projection: ReturnType<typeof buildProjection> }>),
    fetchScoreboard().catch(() => []),
    computeAccuracyStats().catch(() => null),
  ]);

  const liveGames = scoreboard.filter(
    (g) => g.status.toLowerCase().includes("in progress") || g.status.toLowerCase().includes("halftime"),
  );
  const finalGames = scoreboard.filter((g) => g.status.toLowerCase().includes("final"));
  const upcomingGames = scoreboard.filter(
    (g) => !liveGames.includes(g) && !finalGames.includes(g),
  );

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-ink-850/60 backdrop-blur-md shadow-glass">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/20 via-transparent to-accent-purple/30" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-cyan/15 blur-3xl" />
        <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-accent-purple/20 blur-3xl" />

        {/* Floating headshots */}
        <div className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 -space-x-4 opacity-90">
          {featured.slice(0, 4).map((f, i) => (
            <div
              key={f.player.id}
              className="ring-2 ring-ink-850 rounded-2xl"
              style={{ transform: `translateY(${i % 2 === 0 ? "-8px" : "8px"})` }}
            >
              <PlayerAvatar src={f.player.imageUrl} name={f.player.fullName} size="lg" />
            </div>
          ))}
        </div>

        <div className="relative px-6 lg:px-10 py-10 lg:py-14 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={status.isLive ? "positive" : "info"} dot>
              {status.label}
            </Badge>
            <Badge tone="purple">v2.5 · Calibrated</Badge>
            {liveGames.length > 0 && (
              <Badge tone="danger" dot>
                {liveGames.length} live
              </Badge>
            )}
          </div>
          <h1 className="mt-4 text-3xl lg:text-5xl font-semibold tracking-tight text-white">
            Real NBA stats.{" "}
            <span className="bg-gradient-to-r from-accent-cyan to-accent-purple bg-clip-text text-transparent">
              Honest projections.
            </span>
          </h1>
          <p className="mt-3 text-white/65 max-w-2xl">
            Search any NBA player for live ESPN form, season averages and a next-game statline with the reasoning shown. Open a game to see top performers projected blind vs the actual box score.
          </p>
          <div className="mt-6 max-w-2xl">
            <PlayerSearch autoFocus />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">
            <Link href="/scoreboard"><Button variant="outline" size="sm">Today's games →</Button></Link>
            <Link href="/players"><Button variant="ghost" size="sm">Browse players</Button></Link>
            <Link href="/accuracy"><Button variant="ghost" size="sm">Track record</Button></Link>
          </div>
        </div>
      </section>

      {/* Quick stats strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatPill label="Live now" value={String(liveGames.length)} tone="danger" />
        <StatPill label="Upcoming today" value={String(upcomingGames.length)} tone="info" />
        <StatPill label="Finals today" value={String(finalGames.length)} tone="purple" />
        <StatPill
          label="Model accuracy"
          value={accuracyStats && accuracyStats.graded > 0 ? `${accuracyStats.overallAccuracyPct}%` : "—"}
          tone="positive"
          sub={accuracyStats?.graded ? `over ${accuracyStats.graded} graded` : "no graded preds yet"}
        />
      </section>

      {/* Live + recent games */}
      {scoreboard.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {liveGames.length > 0 ? "Live + recent" : "Today's games"}
            </h2>
            <Link href="/scoreboard">
              <Button variant="ghost" size="sm">See all →</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...liveGames, ...upcomingGames, ...finalGames].slice(0, 6).map((g) => (
              <Link
                key={g.id}
                href={`/scoreboard/${g.id}`}
                className="group rounded-2xl border border-white/5 bg-ink-850/70 px-4 py-3 hover:border-white/15 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-widest text-white/40">{g.statusDetail || g.status}</span>
                  <span className="text-accent-cyan opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <TeamLogo abbreviation={g.away.abbreviation} size="sm" />
                    <span className="text-sm text-white truncate">{g.away.shortDisplayName}</span>
                  </div>
                  <span className="text-sm text-white tabular-nums">{g.away.score ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <TeamLogo abbreviation={g.home.abbreviation} size="sm" />
                    <span className="text-sm text-white truncate">{g.home.shortDisplayName}</span>
                  </div>
                  <span className="text-sm text-white tabular-nums">{g.home.score ?? "—"}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured players */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Featured projections</h2>
          <Link href="/players">
            <Button variant="ghost" size="sm">Browse all →</Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map(({ player, projection }) => (
            <Link
              key={player.id}
              href={`/players/${encodeURIComponent(player.id)}`}
              className="group"
            >
              <Card className="h-full transition group-hover:border-white/15 group-hover:translate-y-[-2px]">
                <CardBody>
                  <div className="flex items-center gap-3">
                    <PlayerAvatar src={player.imageUrl} name={player.fullName} size="lg" ring />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-white truncate">{player.fullName}</p>
                        {player.teamAbbreviation && <TeamLogo abbreviation={player.teamAbbreviation} size="sm" />}
                      </div>
                      <p className="text-[11px] text-white/50">
                        {player.teamAbbreviation ?? "—"}
                        {player.position ? ` · ${player.position}` : ""}
                      </p>
                    </div>
                    <Badge tone={projection.confidence >= 75 ? "positive" : projection.confidence >= 55 ? "warning" : "danger"}>
                      {projection.confidence}%
                    </Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Mini label="PTS" value={fmtStat(projection.projected.points)} />
                    <Mini label="REB" value={fmtStat(projection.projected.rebounds)} />
                    <Mini label="AST" value={fmtStat(projection.projected.assists)} />
                  </div>
                  {projection.opponent && (
                    <p className="mt-3 text-[11px] text-white/40">
                      Next: {projection.homeAway === "home" ? "vs" : "@"}{" "}
                      {projection.opponent}
                    </p>
                  )}
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works + recent */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="How predictions work" />
          <CardBody className="text-sm text-white/70 space-y-3">
            <p>
              Each projection blends season averages, last 5 / 10 / 20 game splits and minutes/role trend, then applies opponent, rest and injury multipliers. Every factor is shown — no black box.
            </p>
            <ul className="space-y-1 text-white/60 text-[13px] list-disc pl-5">
              <li>30% season · 25% L10 · 15% L5 · 10% L20 · 10% trend baseline</li>
              <li>Matchup, rest, and injury multipliers applied on top</li>
              <li>Per-stat floor / expected / ceiling + confidence + trend arrow</li>
              <li>Recorded automatically and graded against ESPN's actual gamelog</li>
            </ul>
            <p className="text-xs text-white/40">
              Sports analytics projection — not betting advice.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent projections" />
          <CardBody>
            <ul className="space-y-2.5">
              {featured.slice(0, 4).map(({ player, projection }) => (
                <li key={player.id} className="flex items-center gap-2 text-sm">
                  <PlayerAvatar src={player.imageUrl} name={player.fullName} size="xs" />
                  <span className="text-white/80 truncate flex-1">{player.fullName}</span>
                  <span className="text-white tabular-nums text-xs">
                    {fmtStat(projection.projected.points)} /{" "}
                    {fmtStat(projection.projected.rebounds)} /{" "}
                    {fmtStat(projection.projected.assists)}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </section>

      {/* Disclaimer */}
      <section>
        <Card>
          <CardBody className="text-xs text-white/50 leading-relaxed">
            <strong className="text-white/80">Disclaimer.</strong> CourtSight AI provides sports analysis and statistical projections for fantasy and informational purposes. It is not a sportsbook and does not provide betting advice. Predictions are estimates and can be wrong. Injury and news features show real ESPN data when the ESPN provider is connected; demo mode clearly labels everything as Demo.
          </CardBody>
        </Card>
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] ring-1 ring-white/5 px-2 py-2">
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
      <p className="text-sm font-semibold text-white tabular-nums">{value}</p>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone: "danger" | "info" | "purple" | "positive";
  sub?: string;
}) {
  const TONE: Record<typeof tone, string> = {
    danger: "from-accent-red/15 ring-accent-red/30",
    info: "from-accent-cyan/15 ring-accent-cyan/30",
    purple: "from-accent-purple/15 ring-accent-purple/30",
    positive: "from-accent-green/15 ring-accent-green/30",
  };
  return (
    <div
      className={
        "rounded-2xl bg-gradient-to-br ring-1 px-4 py-3 to-transparent " + TONE[tone]
      }
    >
      <p className="text-[10px] uppercase tracking-widest text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-white/40 mt-0.5">{sub}</p>}
    </div>
  );
}
