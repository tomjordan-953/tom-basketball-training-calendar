import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { fetchStandings } from "@/lib/data/standings";
import { fetchLeaders } from "@/lib/data/leagueLeaders";
import { predictChampionship } from "@/lib/predictions/championship";
import { predictMVP, predictROY, predictDPOY, type AwardCandidate } from "@/lib/predictions/awards";
import { getProvider } from "@/lib/data/providers";

export const dynamic = "force-dynamic";

// Build the lower-cased injured-name set from the live ESPN feed (already
// cached inside the provider).
async function injuredNamesFromProvider(): Promise<Set<string>> {
  const provider = getProvider();
  const espn = provider as unknown as {
    getTeamInjuryStats?: (abbr: string) => Promise<{ outOrDoubt: number; players: string[] }>;
  };
  if (!espn.getTeamInjuryStats) return new Set();
  // We need the league-wide list, not per-team. Cheapest path: pull a small
  // set of teams in parallel and union. The underlying fetch is cached on
  // the FIRST call so subsequent calls are free.
  const standings = await fetchStandings();
  const teams = standings.slice(0, 30);
  const lists = await Promise.all(
    teams.map((t) => espn.getTeamInjuryStats!(t.abbreviation).catch(() => ({ players: [] as string[] }))),
  );
  const set = new Set<string>();
  for (const l of lists) for (const n of l.players) set.add(n.toLowerCase());
  return set;
}

function currentSeasonStartYear(): number {
  const d = new Date();
  return d.getMonth() >= 9 ? d.getFullYear() : d.getFullYear() - 1;
}

export default async function PredictionsPage() {
  const provider = getProvider();
  const [standings, leaders, injuredNames] = await Promise.all([
    fetchStandings(),
    fetchLeaders(),
    injuredNamesFromProvider(),
  ]);

  const champ = predictChampionship(standings, leaders, injuredNames);
  const args = { leaders, standings, injuredNames, provider };
  const [mvp, dpoy, roy] = await Promise.all([
    predictMVP(args).catch((): AwardCandidate[] => []),
    predictDPOY(args).catch((): AwardCandidate[] => []),
    predictROY(args).catch((): AwardCandidate[] => []),
  ]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold text-white">Season predictions</h1>
        <p className="text-sm text-white/55 mt-1">
          Live ESPN data + our model. Updates whenever standings, leaders, or the league injury feed change.
        </p>
      </div>

      {/* Champion + finals */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Pick to win it all"
            subtitle="Score blends net-rating × win % × seed × star availability"
            right={
              champ.champion ? (
                <Badge tone="positive" dot>
                  {champ.champion.team.abbreviation} · score {champ.champion.rawScore}
                </Badge>
              ) : null
            }
          />
          <CardBody>
            {champ.champion ? (
              <div className="flex items-start gap-4">
                <TeamLogo abbreviation={champ.champion.team.abbreviation} size="lg" />
                <div className="flex-1">
                  <p className="text-2xl font-semibold text-white">
                    {champ.champion.team.abbreviation} · {champ.champion.team.wins}-{champ.champion.team.losses}
                  </p>
                  <p className="text-xs text-white/50 mt-1">
                    {champ.champion.team.conference}ern Conference · {champ.champion.team.seed} seed · point diff {champ.champion.team.pointDifferential >= 0 ? "+" : ""}{champ.champion.team.pointDifferential}
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-white/80">
                    {champ.champion.reasoning.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/50">No standings data available.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Predicted finals" />
          <CardBody className="space-y-3">
            <FinalsTeam side="East" t={champ.finalsEast} />
            <div className="text-center text-xs text-white/40">vs</div>
            <FinalsTeam side="West" t={champ.finalsWest} />
            {champ.upsetWatch.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Upset watch</p>
                {champ.upsetWatch.map((u, i) => (
                  <p key={i} className="text-[11px] text-white/60">{u}</p>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </section>

      {/* Full ranking */}
      <Card>
        <CardHeader title="Contender ranking" subtitle="All playoff teams scored, top to bottom" />
        <CardBody className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-white/40 border-b border-white/5">
                  <th className="text-left font-medium px-5 py-2">#</th>
                  <th className="text-left font-medium px-2 py-2">Team</th>
                  <th className="text-left font-medium px-2 py-2">Conf · Seed</th>
                  <th className="text-right font-medium px-2 py-2">Record</th>
                  <th className="text-right font-medium px-2 py-2">Net</th>
                  <th className="text-right font-medium px-5 py-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {champ.ranked.map((s, i) => (
                  <tr key={s.team.abbreviation} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-2 text-white/60 tabular-nums">{i + 1}</td>
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-2">
                        <TeamLogo abbreviation={s.team.abbreviation} size="sm" />
                        <span className="text-white">{s.team.abbreviation}</span>
                        {s.starInjured && <Badge tone="danger">⚠ Star out</Badge>}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-white/60">{s.team.conference} · {s.team.seed}</td>
                    <td className="px-2 py-2 text-right text-white/80 tabular-nums">{s.team.wins}-{s.team.losses}</td>
                    <td className={"px-2 py-2 text-right tabular-nums " + (s.team.pointDifferential >= 0 ? "text-accent-green" : "text-accent-red")}>
                      {s.team.pointDifferential >= 0 ? "+" : ""}{s.team.pointDifferential}
                    </td>
                    <td className="px-5 py-2 text-right text-white tabular-nums font-semibold">{s.rawScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* MVP race */}
      <Card>
        <CardHeader title="MVP race" subtitle="Production + efficiency + team success - injury cuts" />
        <CardBody>
          {mvp.length === 0 ? (
            <p className="text-sm text-white/50">No leaders data available.</p>
          ) : (
            <div className="space-y-3">
              {mvp.map((c, i) => (
                <CandidateRow key={c.athleteId} c={c} rank={i + 1} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* DPOY race */}
      <Card>
        <CardHeader title="Defensive Player of the Year" subtitle="Stocks (BLK + STL) + team defensive rating" />
        <CardBody>
          {dpoy.length === 0 ? (
            <p className="text-sm text-white/50">No DPOY candidates surfaced.</p>
          ) : (
            <div className="space-y-3">
              {dpoy.map((c, i) => (
                <CandidateRow key={c.athleteId} c={c} rank={i + 1} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ROY race */}
      <Card>
        <CardHeader title="Rookie of the Year" subtitle="Real 2025 rookie class — Cooper Flagg, Dylan Harper, VJ Edgecombe etc." />
        <CardBody>
          {roy.length === 0 ? (
            <p className="text-sm text-white/50">
              No rookie candidates surfaced from the top-30 PPG pool. ROY detection requires per-player draft-year lookups; if all top scorers are veterans, this section stays empty.
            </p>
          ) : (
            <div className="space-y-3">
              {roy.map((c, i) => (
                <CandidateRow key={c.athleteId} c={c} rank={i + 1} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Stat leaders */}
      <Card>
        <CardHeader title="Regular-season stat leaders" subtitle="Live ESPN — current top 5 in each category" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <LeaderColumn title="Points / G" entries={leaders.pointsPerGame.slice(0, 5)} />
            <LeaderColumn title="Rebounds / G" entries={leaders.reboundsPerGame.slice(0, 5)} />
            <LeaderColumn title="Assists / G" entries={leaders.assistsPerGame.slice(0, 5)} />
            <LeaderColumn title="Steals / G" entries={leaders.stealsPerGame.slice(0, 5)} />
            <LeaderColumn title="Blocks / G" entries={leaders.blocksPerGame.slice(0, 5)} />
            <LeaderColumn title="3P% (min qual.)" entries={leaders.threePointPercentage.slice(0, 5)} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="text-xs text-white/55 leading-relaxed">
          <strong className="text-white/80">How this works.</strong>{" "}
          Champion + Finals scores combine each playoff team's actual point differential, win percentage, playoff seed, and a penalty if their top scorer (PPG leader) is on the live ESPN injury report.
          MVP scoring uses each leader's PPG / RPG / APG / PER plus their team's win percentage; ROY restricts the pool to players whose ESPN bio shows draft year ≥ {currentSeasonStartYear()}. Refreshed automatically whenever standings, leaders, or the injury feed update. Sports analytics — not betting advice.
        </CardBody>
      </Card>
    </div>
  );
}

function FinalsTeam({ side, t }: { side: "East" | "West"; t?: { team: { abbreviation: string; conference: string; wins: number; losses: number; seed: number }; rawScore: number; starPlayer?: { athleteName: string; displayValue: string }; starInjured?: boolean } }) {
  if (!t) return <p className="text-sm text-white/50">No {side} contender available.</p>;
  return (
    <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 p-3">
      <div className="flex items-center gap-3">
        <TeamLogo abbreviation={t.team.abbreviation} size="md" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{t.team.abbreviation} ({side})</p>
            <Badge tone="info">{t.team.seed} seed</Badge>
            {t.starInjured && <Badge tone="danger">⚠</Badge>}
          </div>
          <p className="text-[11px] text-white/50">
            {t.team.wins}-{t.team.losses} · score {t.rawScore}
            {t.starPlayer ? ` · ${t.starPlayer.athleteName} (${t.starPlayer.displayValue} PPG)` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function CandidateRow({ c, rank }: { c: AwardCandidate; rank: number }) {
  return (
    <Link href={`/players/${encodeURIComponent(c.athleteId)}`} className="group block">
      <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 p-3 group-hover:ring-white/20 transition">
        <div className="flex items-center gap-3">
          <span className="text-white/40 font-mono w-5 text-center">{rank}</span>
          <PlayerAvatar src={c.headshot} name={c.athleteName} size="md" ring />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white truncate">{c.athleteName}</p>
              {c.teamAbbr && <TeamLogo abbreviation={c.teamAbbr} size="sm" />}
              {c.injuredNow && <Badge tone="danger">⚠ Injured</Badge>}
            </div>
            <p className="text-[11px] text-white/50">
              {c.signals.ppg.toFixed(1)} PPG · {c.signals.rpg.toFixed(1)} RPG · {c.signals.apg.toFixed(1)} APG · team {(c.signals.teamWinPct * 100).toFixed(0)}%
            </p>
          </div>
          <Badge tone="purple">score {c.score}</Badge>
        </div>
        <ul className="mt-2 space-y-0.5 text-[11px] text-white/60 pl-9">
          {c.reasoning.slice(0, 2).map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      </div>
    </Link>
  );
}

function LeaderColumn({ title, entries }: { title: string; entries: import("@/lib/data/leagueLeaders").LeaderEntry[] }) {
  return (
    <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 p-3">
      <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">{title}</p>
      <ul className="space-y-1.5">
        {entries.map((e) => (
          <li key={e.athleteId} className="flex items-center gap-2 text-xs">
            <span className="text-white/40 w-4">{e.rank}</span>
            <Link
              href={`/players/${encodeURIComponent(e.athleteId)}`}
              className="text-white/85 hover:text-accent-cyan truncate flex-1"
            >
              {e.athleteName}
            </Link>
            <span className="text-white/40">{e.teamAbbr}</span>
            <span className="text-white tabular-nums w-10 text-right">{e.displayValue}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
