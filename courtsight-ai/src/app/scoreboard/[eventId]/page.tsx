import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { fetchGameSummary, type BoxScorePlayer, type BoxScoreTeam } from "@/lib/data/gameSummary";
import { getProvider } from "@/lib/data/providers";
import { buildRetroProjection } from "@/lib/prediction/retroProjection";
import { fmtStat } from "@/lib/utils/format";
import { shortDate } from "@/lib/utils/dates";
import type { Projection } from "@/types/projection";

export const dynamic = "force-dynamic";

interface Props {
  params: { eventId: string };
}

interface PlayerLine {
  player: BoxScorePlayer;
  projection: Projection | null;
  hindsightSafe: boolean;
  accuracy?: number;
  diffs?: { points: number; rebounds: number; assists: number };
}

const TOP_N = 4;

export default async function GameDetailPage({ params }: Props) {
  const summary = await fetchGameSummary(params.eventId);
  if (!summary) notFound();
  const provider = getProvider();

  const buildLineFor = async (
    bsp: BoxScorePlayer,
    teamAbbr: string,
    opponentAbbr: string,
    homeAway: "home" | "away",
  ): Promise<PlayerLine> => {
    if (!bsp.espnId || provider.name !== "espn" || bsp.didNotPlay) {
      return { player: bsp, projection: null, hindsightSafe: false };
    }
    const playerId = `espn-${bsp.espnId}`;
    try {
      const player = await provider.getPlayer(playerId);
      if (!player) return { player: bsp, projection: null, hindsightSafe: false };
      const [logs, season, injury, opponent] = await Promise.all([
        provider.getPlayerGameLogs(playerId, 30),
        provider.getSeasonAverages(playerId),
        provider.getInjuryContext(playerId),
        provider.getOpponentContext(opponentAbbr),
      ]);
      const targetDate = summary.date.slice(0, 10);
      const { projection, hindsightSafe } = await buildRetroProjection({
        player,
        allLogs: logs,
        season,
        injury,
        opponent,
        targetDate,
        opponentAbbr,
        homeAway,
        isPlayoffs: isPlayoffDate(summary.date),
        dataSource: provider.name,
      });
      // If game is final, compute diffs.
      let accuracy: number | undefined;
      let diffs: PlayerLine["diffs"];
      if (summary.isFinal && bsp.minutes > 0) {
        const dPts = bsp.points - projection.projected.points;
        const dReb = bsp.rebounds - projection.projected.rebounds;
        const dAst = bsp.assists - projection.projected.assists;
        diffs = { points: dPts, rebounds: dReb, assists: dAst };
        // crude accuracy 0-100 from PTS/REB/AST tolerance
        const score = (key: number, tol: number) =>
          Math.max(0, 1 - Math.abs(key) / (tol * 2));
        accuracy = Math.round(
          ((score(dPts, 4) * 2 + score(dReb, 2) + score(dAst, 2)) / 4) * 100,
        );
      }
      return { player: bsp, projection, hindsightSafe, accuracy, diffs };
    } catch {
      return { player: bsp, projection: null, hindsightSafe: false };
    }
  };

  const topAway = topPerformers(summary.away, TOP_N);
  const topHome = topPerformers(summary.home, TOP_N);

  const [awayLines, homeLines] = await Promise.all([
    Promise.all(
      topAway.map((p) =>
        buildLineFor(p, summary.away.abbreviation, summary.home.abbreviation, "away"),
      ),
    ),
    Promise.all(
      topHome.map((p) =>
        buildLineFor(p, summary.home.abbreviation, summary.away.abbreviation, "home"),
      ),
    ),
  ]);

  // Game-wide accuracy summary across the lines we projected.
  const allLines = [...awayLines, ...homeLines].filter(
    (l) => typeof l.accuracy === "number",
  );
  const gameAccuracy = allLines.length
    ? Math.round(allLines.reduce((a, l) => a + (l.accuracy ?? 0), 0) / allLines.length)
    : null;

  return (
    <div className="space-y-6 animate-fade-up">
      <Link href="/scoreboard">
        <Button variant="ghost" size="sm">← All games</Button>
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-ink-850/70 backdrop-blur-md shadow-glass">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/15 via-transparent to-accent-purple/15" />
        <div className="relative px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <Badge tone={summary.isLive ? "danger" : summary.isFinal ? "neutral" : "info"} dot={summary.isLive}>
              {summary.statusDetail || summary.status}
            </Badge>
            <div className="flex flex-wrap gap-2">
              {provider.name === "espn" && (
                <Badge tone="positive" dot>Real ESPN box score</Badge>
              )}
              {summary.isFinal && gameAccuracy !== null && (
                <Badge tone={gameAccuracy >= 70 ? "positive" : gameAccuracy >= 50 ? "warning" : "danger"}>
                  Avg projection accuracy: {gameAccuracy}%
                </Badge>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <TeamHeader team={summary.away} />
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-white/40">{shortDate(summary.date)}</p>
              <p className="mt-2 text-sm text-white/50">vs</p>
              {summary.venue && (
                <p className="mt-3 text-[11px] text-white/40">{summary.venue}</p>
              )}
              {summary.broadcast && (
                <p className="mt-1 text-[11px] text-white/40">📺 {summary.broadcast}</p>
              )}
            </div>
            <TeamHeader team={summary.home} alignRight />
          </div>
        </div>
      </div>

      <Card>
        <CardBody className="text-xs text-white/55 leading-relaxed">
          <strong className="text-white/75">Honest about projections.</strong>{" "}
          {summary.isFinal
            ? "Each player projection below was generated retrospectively, but uses ONLY their game logs from BEFORE this game's date — so the model never peeks at the actual outcome it's compared against."
            : "Each player projection below uses their season + recent form, blended with a small matchup adjustment. The game hasn't been played yet, so no actual line to compare to."}
          {provider.name !== "espn" && " Provider is not set to ESPN, so projections are limited."}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamProjectionCard team={summary.away} lines={awayLines} isFinal={summary.isFinal} />
        <TeamProjectionCard team={summary.home} lines={homeLines} isFinal={summary.isFinal} />
      </div>
    </div>
  );
}

function TeamHeader({ team, alignRight }: { team: BoxScoreTeam; alignRight?: boolean }) {
  return (
    <div className={"flex items-center gap-3 " + (alignRight ? "justify-end" : "")}>
      {alignRight && (
        <div className="text-right">
          <p className="text-sm font-semibold text-white">{team.shortDisplayName ?? team.displayName}</p>
          {team.record && <p className="text-[11px] text-white/40">{team.record}</p>}
          {team.score !== undefined && (
            <p className={"mt-1 text-3xl font-bold tabular-nums " + (team.isWinner ? "text-accent-green" : "text-white")}>
              {team.score}
            </p>
          )}
        </div>
      )}
      <TeamLogo abbreviation={team.abbreviation} src={team.logo} size="lg" />
      {!alignRight && (
        <div>
          <p className="text-sm font-semibold text-white">{team.shortDisplayName ?? team.displayName}</p>
          {team.record && <p className="text-[11px] text-white/40">{team.record}</p>}
          {team.score !== undefined && (
            <p className={"mt-1 text-3xl font-bold tabular-nums " + (team.isWinner ? "text-accent-green" : "text-white")}>
              {team.score}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TeamProjectionCard({
  team,
  lines,
  isFinal,
}: {
  team: BoxScoreTeam;
  lines: PlayerLine[];
  isFinal: boolean;
}) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <TeamLogo abbreviation={team.abbreviation} src={team.logo} size="sm" />
            <span>{team.displayName}</span>
          </span>
        }
        subtitle={`Top ${lines.length} performers · projection vs actual`}
      />
      <CardBody className="space-y-3">
        {lines.length === 0 && (
          <p className="text-sm text-white/50 px-2">No box-score data available.</p>
        )}
        {lines.map((line) => (
          <PlayerLineRow key={line.player.espnId || line.player.fullName} line={line} isFinal={isFinal} />
        ))}
      </CardBody>
    </Card>
  );
}

function PlayerLineRow({ line, isFinal }: { line: PlayerLine; isFinal: boolean }) {
  const p = line.player;
  const proj = line.projection?.projected;
  const accTone =
    line.accuracy === undefined
      ? "neutral"
      : line.accuracy >= 70
        ? "positive"
        : line.accuracy >= 50
          ? "warning"
          : "danger";
  return (
    <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 p-3">
      <div className="flex items-center gap-3">
        <PlayerAvatar src={p.headshot} name={p.fullName} size="md" ring />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={p.espnId ? `/players/espn-${p.espnId}` : "#"}
              className="text-sm font-medium text-white hover:text-accent-cyan truncate"
            >
              {p.fullName}
            </Link>
            {p.starter && <Badge tone="info">Starter</Badge>}
            {p.didNotPlay && <Badge tone="neutral">DNP</Badge>}
            {line.hindsightSafe && (
              <Badge tone="purple">Pre-game blind</Badge>
            )}
          </div>
          <p className="text-[11px] text-white/40">
            {p.position ?? ""}
            {p.jersey ? ` · #${p.jersey}` : ""}
            {p.minutes ? ` · ${p.minutes} min` : ""}
          </p>
        </div>
        {isFinal && line.accuracy !== undefined && (
          <Badge tone={accTone} dot>
            {line.accuracy}% acc
          </Badge>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <StatBlock
          label={isFinal ? "Actual" : "—"}
          tone="actual"
          values={
            isFinal
              ? { points: p.points, rebounds: p.rebounds, assists: p.assists }
              : null
          }
          extra={
            isFinal
              ? `${p.fg} FG · ${p.threes} 3PT · ${p.ft} FT${p.plusMinus !== undefined ? ` · ${p.plusMinus}` : ""}`
              : "Game has not started yet."
          }
        />
        <StatBlock
          label="Projection"
          tone="proj"
          values={
            proj
              ? { points: proj.points, rebounds: proj.rebounds, assists: proj.assists }
              : null
          }
          extra={
            line.projection
              ? `${line.projection.confidence}% conf · ${line.projection.riskLevel} risk`
              : "No projection — insufficient data."
          }
          diffs={line.diffs}
        />
      </div>
    </div>
  );
}

function StatBlock({
  label,
  tone,
  values,
  extra,
  diffs,
}: {
  label: string;
  tone: "actual" | "proj";
  values: { points: number; rebounds: number; assists: number } | null;
  extra?: string;
  diffs?: { points: number; rebounds: number; assists: number };
}) {
  const colour = tone === "actual" ? "from-accent-green/15 ring-accent-green/30" : "from-accent-cyan/15 ring-accent-cyan/30";
  return (
    <div className={"rounded-lg bg-gradient-to-br ring-1 px-3 py-2.5 " + colour + " to-transparent"}>
      <p className="text-[10px] uppercase tracking-widest text-white/50">{label}</p>
      {values ? (
        <div className="mt-1 flex items-baseline gap-3 text-white tabular-nums">
          <Cell n={values.points} d={diffs?.points} suffix="PTS" />
          <Cell n={values.rebounds} d={diffs?.rebounds} suffix="REB" />
          <Cell n={values.assists} d={diffs?.assists} suffix="AST" />
        </div>
      ) : (
        <p className="mt-1 text-sm text-white/30">—</p>
      )}
      {extra && <p className="mt-1 text-[11px] text-white/40">{extra}</p>}
    </div>
  );
}

function Cell({ n, d, suffix }: { n: number; d?: number; suffix: string }) {
  return (
    <span>
      <span className="text-base font-semibold">{fmtStat(n)}</span>
      <span className="text-[10px] text-white/40 ml-0.5">{suffix}</span>
      {d !== undefined && Math.abs(d) >= 0.1 && (
        <span className={"ml-1 text-[10px] " + (d >= 0 ? "text-accent-green" : "text-accent-red")}>
          {d > 0 ? "+" : ""}{d.toFixed(1)}
        </span>
      )}
    </span>
  );
}

function isPlayoffDate(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  // NBA postseason runs roughly mid-April through mid-June.
  const m = d.getMonth(); // 0-indexed
  if (m === 3) return d.getDate() >= 15; // April
  if (m === 4) return true; // May
  if (m === 5) return d.getDate() <= 30; // June
  return false;
}

function topPerformers(team: BoxScoreTeam, n: number): BoxScorePlayer[] {
  if (!team.players || team.players.length === 0) return [];
  // If game has any minutes recorded, sort by minutes; otherwise prefer starters.
  const hasStats = team.players.some((p) => p.minutes > 0);
  if (hasStats) {
    return [...team.players]
      .filter((p) => !p.didNotPlay)
      .sort((a, b) => b.minutes - a.minutes || b.points - a.points)
      .slice(0, n);
  }
  const starters = team.players.filter((p) => p.starter);
  return (starters.length > 0 ? starters : team.players).slice(0, n);
}
