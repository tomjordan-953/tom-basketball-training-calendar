import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PlayerSearch } from "@/components/search/PlayerSearch";
import { FEATURED_DEMO_IDS } from "@/lib/data/providers/demoProvider";
import { getProvider } from "@/lib/data/providers";
import { fmtStat } from "@/lib/utils/format";
import { buildProjection } from "@/lib/prediction/projectionEngine";
import { TTL, cached } from "@/lib/data/cache";

export const dynamic = "force-dynamic";

export default async function Home() {
  const provider = getProvider();
  const status = provider.status;

  // For real-data mode, the demo IDs won't resolve — fall back to a few
  // popular real-name searches so the dashboard always shows featured cards.
  const idsToShow =
    provider.name === "demo"
      ? FEATURED_DEMO_IDS
      : await cached(`featured:${provider.name}`, TTL.search, async () => {
          const popular = ["Shai Gilgeous-Alexander", "Jokic", "Doncic", "Tatum"];
          const ids: string[] = [];
          for (const name of popular) {
            const results = await provider.searchPlayers(name);
            if (results[0]) ids.push(results[0].id);
            if (ids.length >= 4) break;
          }
          return ids;
        });

  const featured = await Promise.all(
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
  ).then((arr) => arr.filter(Boolean) as Array<{ player: NonNullable<Awaited<ReturnType<typeof provider.getPlayer>>>; projection: ReturnType<typeof buildProjection> }>);

  return (
    <div className="space-y-8 animate-fade-up">
      <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-ink-850/60 backdrop-blur-md shadow-glass">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/15 via-transparent to-accent-purple/20" />
        <div className="relative px-6 lg:px-10 py-10 lg:py-14">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={status.isLive ? "positive" : "info"} dot>
              {status.label}
            </Badge>
            <Badge tone="purple">v2 · Real Data Intelligence</Badge>
          </div>
          <h1 className="mt-4 text-3xl lg:text-5xl font-semibold tracking-tight text-white max-w-3xl">
            NBA player projections, with the{" "}
            <span className="bg-gradient-to-r from-accent-cyan to-accent-purple bg-clip-text text-transparent">
              reasoning shown
            </span>
            .
          </h1>
          <p className="mt-3 text-white/60 max-w-2xl">
            Search a player, see their recent form, then a next-game statline
            with the factors behind it. Analysis only — not betting advice.
          </p>
          <div className="mt-6 max-w-2xl">
            <PlayerSearch autoFocus />
          </div>
          <p className="mt-3 text-xs text-white/40">{status.message}</p>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Featured players</h2>
          <Link href="/players">
            <Button variant="ghost" size="sm">
              Browse all →
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featured.map(({ player, projection }) => (
            <Link
              key={player.id}
              href={`/players/${encodeURIComponent(player.id)}`}
              className="group"
            >
              <Card className="h-full transition group-hover:border-white/15 group-hover:translate-y-[-2px]">
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-white">
                        {player.fullName}
                      </p>
                      <p className="text-xs text-white/40">
                        {player.teamAbbreviation ?? "—"}
                        {player.position ? ` · ${player.position}` : ""}
                      </p>
                    </div>
                    <Badge tone="info">{projection.confidence}%</Badge>
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

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="How predictions work" />
          <CardBody className="text-sm text-white/70 space-y-3">
            <p>
              CourtSight blends each player&apos;s season averages, last 10 games,
              last 5 games and minutes/role trend, then adjusts for opponent
              difficulty, rest/back-to-back, and injury status.
            </p>
            <ul className="space-y-1 text-white/60 text-[13px] list-disc pl-5">
              <li>40% season avg · 35% last 10 · 15% last 5 · 10% trend baseline</li>
              <li>Matchup, rest, and injury multipliers applied on top</li>
              <li>Confidence reflects sample size, volatility and data quality</li>
              <li>Every projection ships with a factor-by-factor explanation</li>
            </ul>
            <p className="text-xs text-white/40">
              v1 is a transparent formula model — not a black-box ML system.
              Read more in the README.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent projections" />
          <CardBody>
            <ul className="space-y-2.5">
              {featured.slice(0, 4).map(({ player, projection }) => (
                <li key={player.id} className="flex items-center justify-between text-sm">
                  <span className="text-white/80 truncate pr-2">{player.fullName}</span>
                  <span className="text-white tabular-nums">
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

      <section>
        <Card>
          <CardBody className="text-xs text-white/50 leading-relaxed">
            <strong className="text-white/80">Disclaimer.</strong> CourtSight AI
            provides sports analysis and statistical projections for fantasy and
            informational purposes. It is not a sportsbook and does not provide
            betting advice. Predictions are estimates and can be wrong. Injury
            and news features show real data only when a verified provider is
            connected; otherwise they are clearly labelled as Demo.
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
