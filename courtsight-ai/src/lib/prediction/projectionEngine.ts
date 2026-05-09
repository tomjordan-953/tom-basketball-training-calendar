import type { InjuryNote, Player } from "@/types/player";
import type {
  GameLog,
  NextGameContext,
  OpponentContext,
  SeasonAverages,
} from "@/types/stats";
import type {
  DataQuality,
  ProjectedStatline,
  Projection,
  ProjectionFactor,
  StatBreakdown,
  StatProjection,
} from "@/types/projection";
import { average, clamp, round, stddev } from "@/lib/utils/format";
import {
  STAT_KEYS,
  StatKey,
  minutesTrend,
  recentForm,
  statAverage,
  statValues,
  volatilityScore,
} from "./trendUtils";
import { matchupAdjustment } from "./matchupAdjustments";
import { restAdjustment } from "./restAdjustments";
import { injuryAdjustment } from "./injuryAwareness";
import { computeConfidence } from "./confidence";

export const MODEL_VERSION = "courtsight-formula-v2";

interface BuildArgs {
  player: Player;
  logs: GameLog[];
  season: SeasonAverages | null;
  nextGame: NextGameContext | null;
  opponent: OpponentContext | null;
  injury: InjuryNote | null;
  dataSource: "demo" | "balldontlie" | "espn";
  freshnessAgeMs?: number;
}

// v2 weighting:
// 30% season · 25% L10 · 15% L5 · 10% L20 · 10% trend · 10% absorbed by multipliers.
// If L20 unavailable, weight redistributes to season/L10.
const WEIGHTS_FULL = { season: 0.3, l10: 0.25, l5: 0.15, l20: 0.1, trend: 0.1 };
const WEIGHTS_NO_L20 = { season: 0.36, l10: 0.32, l5: 0.16, l20: 0, trend: 0.16 };

const STAT_LABEL: Record<StatKey, string> = {
  points: "Points",
  rebounds: "Rebounds",
  assists: "Assists",
  steals: "Steals",
  blocks: "Blocks",
  turnovers: "Turnovers",
  minutes: "Minutes",
};

function blendStat(
  key: StatKey,
  logs: GameLog[],
  season: SeasonAverages | null,
): number {
  const last5 = recentForm(logs, 5);
  const last10 = recentForm(logs, 10);
  const last20 = recentForm(logs, 20);
  const seasonVal = season ? (season as unknown as Record<StatKey, number>)[key] : 0;
  const l5 = statAverage(last5, key);
  const l10 = statAverage(last10, key);
  const l20 = statAverage(last20, key);
  const trendBase = (l5 + l10) / 2;
  const w = last20.length >= 11 ? WEIGHTS_FULL : WEIGHTS_NO_L20;
  return (
    w.season * seasonVal +
    w.l10 * l10 +
    w.l5 * l5 +
    w.l20 * l20 +
    w.trend * trendBase
  );
}

function statSpread(logs: GameLog[], key: StatKey): number {
  const recent = recentForm(logs, 10);
  return stddev(statValues(recent, key));
}

function trendDirection(logs: GameLog[], key: StatKey): "up" | "down" | "flat" {
  const l5 = statAverage(recentForm(logs, 5), key);
  const l10 = statAverage(recentForm(logs, 10), key);
  const delta = l5 - l10;
  if (key === "turnovers") {
    if (delta > 0.5) return "down"; // more turnovers = bad trend
    if (delta < -0.5) return "up";
    return "flat";
  }
  if (delta > 0.5) return "up";
  if (delta < -0.5) return "down";
  return "flat";
}

function clampStat(key: StatKey, v: number): number {
  if (key === "minutes") return clamp(v, 0, 48);
  return clamp(v, 0, 80);
}

function statConfidence(logs: GameLog[], key: StatKey, mean: number): number {
  const samples = recentForm(logs, 10);
  if (samples.length < 3) return 30;
  const sd = stddev(statValues(samples, key));
  const cv = mean > 0 ? sd / mean : 1;
  let c = 80 - cv * 80;
  if (samples.length < 5) c -= 12;
  if (samples.length >= 10) c += 4;
  return Math.round(clamp(c, 10, 95));
}

function statExplanation(
  key: StatKey,
  expected: number,
  seasonVal: number,
  l10: number,
  l5: number,
  trend: "up" | "down" | "flat",
  hits: number,
  total: number,
): string {
  const label = STAT_LABEL[key];
  const seasonGap = expected - seasonVal;
  const wantUp = key !== "turnovers";
  const aboveBaseline = wantUp ? seasonGap > 0.5 : seasonGap < -0.3;
  const belowBaseline = wantUp ? seasonGap < -0.5 : seasonGap > 0.3;

  if (key === "turnovers") {
    if (l5 < l10 - 0.4) return `${label} projected slightly down — taking better care of the ball over the last 5 games.`;
    if (l5 > l10 + 0.4) return `${label} projected up — turnovers have ticked up across the last 5 games.`;
    return `${label} projection is stable — recent ball-handling matches season norms.`;
  }

  if (key === "minutes") {
    if (trend === "up") return `Minutes trending up over recent games (~${round(expected)} expected).`;
    if (trend === "down") return `Minutes trending down recently (~${round(expected)} expected).`;
    return `Minutes are stable around ${round(expected)} per game.`;
  }

  if (aboveBaseline) {
    return `Projected ${label.toLowerCase()} are above season average because the player has produced above baseline in ${hits} of the last ${total} games.`;
  }
  if (belowBaseline) {
    return `Projected ${label.toLowerCase()} are below season average — recent form lags the season baseline.`;
  }
  return `${label} projection is stable because recent numbers track the season average closely.`;
}

function buildStatBreakdown(
  logs: GameLog[],
  expected: ProjectedStatline,
  season: SeasonAverages | null,
): StatBreakdown {
  const out = {} as StatBreakdown;
  for (const key of STAT_KEYS) {
    const expVal = expected[key];
    const sd = statSpread(logs, key);
    const spread = Math.max(sd * 0.9, expVal * 0.12);
    const floor = clampStat(key, expVal - spread);
    const ceiling = clampStat(key, expVal + spread);
    const seasonVal = season ? (season as unknown as Record<StatKey, number>)[key] : expVal;
    const l10v = statAverage(recentForm(logs, 10), key);
    const l5v = statAverage(recentForm(logs, 5), key);
    const trend = trendDirection(logs, key);
    const recent10 = recentForm(logs, 10);
    const hits = recent10.filter((g) => {
      const v = (g as unknown as Record<StatKey, number>)[key] ?? 0;
      return key === "turnovers" ? v < seasonVal : v > seasonVal;
    }).length;
    const proj: StatProjection = {
      expected: round(expVal, 1),
      floor: round(floor, 1),
      ceiling: round(ceiling, 1),
      confidence: statConfidence(logs, key, expVal),
      trend,
      explanation: statExplanation(
        key,
        expVal,
        seasonVal,
        l10v,
        l5v,
        trend,
        hits,
        recent10.length,
      ),
    };
    out[key] = proj;
  }
  return out;
}

function applyMultipliers(
  base: ProjectedStatline,
  offenseMul: number,
  contextMul: number,
  minutesAdj: number,
  restMul: number,
  outIfZero: boolean,
): ProjectedStatline {
  const out = {
    points: base.points * offenseMul,
    rebounds: base.rebounds * contextMul,
    assists: base.assists * contextMul,
    steals: base.steals * contextMul,
    blocks: base.blocks * contextMul,
    turnovers: base.turnovers * offenseMul,
    minutes: base.minutes * restMul + minutesAdj,
  };
  if (outIfZero) {
    return { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, minutes: 0 };
  }
  return out;
}

function roundLine(line: ProjectedStatline): ProjectedStatline {
  return {
    points: round(line.points, 1),
    rebounds: round(line.rebounds, 1),
    assists: round(line.assists, 1),
    steals: round(line.steals, 1),
    blocks: round(line.blocks, 1),
    turnovers: round(line.turnovers, 1),
    minutes: round(line.minutes, 1),
  };
}

function rangeOf(breakdown: StatBreakdown, side: "floor" | "ceiling"): ProjectedStatline {
  return {
    points: breakdown.points[side],
    rebounds: breakdown.rebounds[side],
    assists: breakdown.assists[side],
    steals: breakdown.steals[side],
    blocks: breakdown.blocks[side],
    turnovers: breakdown.turnovers[side],
    minutes: breakdown.minutes[side],
  };
}

function computeFormIndex(
  logs: GameLog[],
  season: SeasonAverages | null,
): number {
  if (!season) return 50;
  const last10 = recentForm(logs, 10);
  if (last10.length === 0) return 50;
  const ratios: number[] = [];
  for (const k of ["points", "rebounds", "assists"] as StatKey[]) {
    const baseline = (season as unknown as Record<StatKey, number>)[k];
    if (!baseline) continue;
    const ratio = statAverage(last10, k) / baseline;
    ratios.push(ratio);
  }
  if (ratios.length === 0) return 50;
  const avgRatio = average(ratios);
  // Map 0.7 → 30, 1.0 → 60, 1.3 → 90.
  const score = clamp(30 + (avgRatio - 0.7) * 100, 0, 100);
  return Math.round(score);
}

function computeDataQuality(args: {
  logs: GameLog[];
  season: SeasonAverages | null;
  nextGame: NextGameContext | null;
  opponent: OpponentContext | null;
  injury: InjuryNote | null;
  dataSource: "demo" | "balldontlie" | "espn";
  freshnessAgeMs?: number;
}): DataQuality {
  const notes: string[] = [];
  let score = 60;
  if (args.logs.length >= 15) {
    score += 12;
  } else if (args.logs.length >= 8) {
    score += 6;
  } else if (args.logs.length >= 3) {
    notes.push("Limited recent game data");
  } else {
    score -= 25;
    notes.push("Very few recent games available");
  }
  if (args.season) score += 6;
  else notes.push("Season averages unavailable");
  if (args.nextGame) score += 4;
  else notes.push("No verified next-game schedule connected");
  if (args.opponent) score += 6;
  else notes.push("Opponent matchup data unavailable");
  if (args.injury && args.injury.status !== "Unknown") score += 6;
  else notes.push("No verified injury/news provider connected");
  if (args.freshnessAgeMs !== undefined && args.freshnessAgeMs > 6 * 60 * 60 * 1000) {
    notes.push("Cache is older than 6h");
    score -= 4;
  }
  return {
    recentGamesCount: args.logs.length,
    hasSeasonAverages: !!args.season,
    hasNextGame: !!args.nextGame,
    hasOpponentContext: !!args.opponent,
    hasInjurySource: !!args.injury && args.injury.status !== "Unknown",
    hasNewsSource: false,
    freshnessAgeMs: args.freshnessAgeMs,
    notes,
    score: Math.round(clamp(score, 5, 99)),
  };
}

function buildSummary(
  player: Player,
  expected: ProjectedStatline,
  baseline: ProjectedStatline,
  conf: number,
  trend: "up" | "down" | "flat",
  matchupImpact: "positive" | "negative" | "neutral",
  rest: { multiplier: number; impact: string; minutesDelta: number },
  injuryStatus: string,
): string {
  const above = expected.points - baseline.points;
  const direction =
    above >= 1.5 ? "above his season scoring baseline" : above <= -1.5 ? "below his season scoring baseline" : "near his season scoring baseline";
  const trendPhrase =
    trend === "up"
      ? "his minutes are trending up"
      : trend === "down"
        ? "his minutes are trending down"
        : "his minutes have remained stable";
  const matchupPhrase =
    matchupImpact === "positive"
      ? "and the opponent matchup is favourable"
      : matchupImpact === "negative"
        ? "despite a tough opponent matchup"
        : "with a roughly neutral opponent matchup";
  const restPhrase =
    rest.minutesDelta < 0
      ? "Slight reduction applied for back-to-back fatigue."
      : rest.minutesDelta > 0
        ? "Fresh legs from extra rest add a small boost."
        : "Normal rest profile.";
  const injuryPhrase =
    injuryStatus === "Active" || injuryStatus === "Unknown"
      ? ""
      : ` Status flagged ${injuryStatus.toLowerCase()} — projection adjusted accordingly.`;
  const confPhrase =
    conf >= 75
      ? "High confidence given stable role and sample size."
      : conf >= 55
        ? "Medium confidence — some volatility or missing context."
        : "Lower confidence — sample, volatility, or missing data limits certainty.";
  return `${player.fullName} projects ${direction} because ${trendPhrase} ${matchupPhrase}. ${restPhrase}${injuryPhrase} ${confPhrase}`;
}

function buildConfidenceExplanation(reasons: string[], score: number): string {
  const tone =
    score >= 75
      ? "Confidence is high"
      : score >= 55
        ? "Confidence is medium"
        : "Confidence is low";
  if (reasons.length === 0) return `${tone}.`;
  return `${tone} because: ${reasons.join("; ")}.`;
}

function buildRiskExplanation(
  riskFlags: string[],
  volatility: number,
  enoughGames: boolean,
): string {
  if (riskFlags.length === 0 && volatility < 0.25 && enoughGames) {
    return "Few risk drivers detected — projection should hold barring injury or unusual game script.";
  }
  const drivers: string[] = [...riskFlags];
  if (volatility >= 0.4) drivers.push("game-to-game scoring variance is high");
  if (!enoughGames) drivers.push("limited recent game sample");
  return `Things that could make this prediction wrong: ${drivers.join("; ")}.`;
}

export function buildProjection(args: BuildArgs): Projection {
  const { player, logs, season, nextGame, opponent, injury, dataSource } = args;

  const baseline: ProjectedStatline = {
    points: blendStat("points", logs, season),
    rebounds: blendStat("rebounds", logs, season),
    assists: blendStat("assists", logs, season),
    steals: blendStat("steals", logs, season),
    blocks: blendStat("blocks", logs, season),
    turnovers: blendStat("turnovers", logs, season),
    minutes: blendStat("minutes", logs, season),
  };

  const factors: ProjectionFactor[] = [];

  // Form factor
  const seasonPts = season?.points ?? baseline.points;
  const last10Pts = statAverage(recentForm(logs, 10), "points");
  const last5Pts = statAverage(recentForm(logs, 5), "points");
  if (last10Pts - seasonPts >= 1.5) {
    factors.push({
      label: "Recent scoring",
      group: "form",
      impact: "positive",
      description: `Averaging ${last10Pts.toFixed(1)} PTS over last 10 (above season ${seasonPts.toFixed(1)}); last 5 at ${last5Pts.toFixed(1)}.`,
      weight: 0.35,
    });
  } else if (last10Pts - seasonPts <= -1.5) {
    factors.push({
      label: "Recent scoring",
      group: "form",
      impact: "negative",
      description: `Averaging ${last10Pts.toFixed(1)} PTS over last 10 (below season ${seasonPts.toFixed(1)}).`,
      weight: 0.35,
    });
  } else {
    factors.push({
      label: "Recent scoring",
      group: "form",
      impact: "neutral",
      description: `Recent scoring tracks season average (${last10Pts.toFixed(1)} vs ${seasonPts.toFixed(1)}).`,
    });
  }

  // Minutes
  const mt = minutesTrend(logs);
  let minutesAdj = 0;
  if (Math.abs(mt.delta) >= 1.5) {
    minutesAdj = mt.delta * 0.6;
    factors.push({
      label: "Minutes trend",
      group: "minutes",
      impact: mt.delta > 0 ? "positive" : "negative",
      description:
        mt.delta > 0
          ? `Minutes trending up over last 5 games (+${mt.delta.toFixed(1)} vs last 10).`
          : `Minutes trending down over last 5 games (${mt.delta.toFixed(1)} vs last 10).`,
    });
  } else {
    factors.push({
      label: "Minutes stability",
      group: "minutes",
      impact: "neutral",
      description: `Minutes stable around ${mt.recentAvg.toFixed(1)} MPG (σ ${stddev(statValues(recentForm(logs, 10), "minutes")).toFixed(1)}).`,
    });
  }

  // Volatility
  const ptsVol = volatilityScore(logs, "points");
  if (ptsVol > 0.4) {
    factors.push({
      label: "Volatility",
      group: "volatility",
      impact: "negative",
      description: `High game-to-game scoring variance (CV ${ptsVol.toFixed(2)}) — projection less certain.`,
    });
  } else if (ptsVol > 0) {
    factors.push({
      label: "Volatility",
      group: "volatility",
      impact: "neutral",
      description: `Scoring variance is normal (CV ${ptsVol.toFixed(2)}).`,
    });
  }

  // Matchup, rest, injury
  const matchup = matchupAdjustment(opponent);
  factors.push({ label: "Opponent matchup", group: "matchup", impact: matchup.impact, description: matchup.description });

  const rest = restAdjustment(nextGame);
  factors.push({ label: "Rest / schedule", group: "rest", impact: rest.impact, description: rest.description });

  const inj = injuryAdjustment(injury);
  factors.push({ label: "Injury / status", group: "injury", impact: inj.impact, description: inj.description });

  // Data quality factor
  const dq = computeDataQuality({ ...args });
  factors.push({
    label: "Data quality",
    group: "data",
    impact: dq.score >= 70 ? "neutral" : "negative",
    description:
      dq.notes.length === 0
        ? `Data inputs look complete (quality score ${dq.score}/100).`
        : `Data quality score ${dq.score}/100 — ${dq.notes.join("; ")}.`,
  });

  // Apply multipliers
  const offenseMul = matchup.pointsMultiplier * rest.multiplier * inj.multiplier;
  const contextMul = matchup.paceMultiplier * rest.multiplier * inj.multiplier;
  const adjusted = applyMultipliers(
    baseline,
    offenseMul,
    contextMul,
    minutesAdj,
    rest.multiplier,
    inj.multiplier === 0,
  );

  const finalLine = roundLine(adjusted);
  const seasonLine: ProjectedStatline = {
    points: season?.points ?? 0,
    rebounds: season?.rebounds ?? 0,
    assists: season?.assists ?? 0,
    steals: season?.steals ?? 0,
    blocks: season?.blocks ?? 0,
    turnovers: season?.turnovers ?? 0,
    minutes: season?.minutes ?? 0,
  };

  const breakdown = buildStatBreakdown(logs, finalLine, season);
  const floor = roundLine(rangeOf(breakdown, "floor"));
  const ceiling = roundLine(rangeOf(breakdown, "ceiling"));

  const conf = computeConfidence(logs, injury, !!opponent);
  const riskFlags: string[] = [];
  if (inj.riskFlag) riskFlags.push(inj.riskFlag);
  if (nextGame?.isBackToBack) riskFlags.push("Back-to-back");
  if (!mt.stable) riskFlags.push("Minutes volatility");
  if (ptsVol > 0.45) riskFlags.push("High variance scoring");
  if (logs.length < 5) riskFlags.push("Limited recent data");
  if (!injury || injury.status === "Unknown") riskFlags.push("No verified injury source");

  const formIndex = computeFormIndex(logs, season);

  const explanation = factors.map((f) => f.description);
  if (!dq.hasInjurySource) explanation.push("No verified injury source connected, so injury adjustment is neutral.");
  if (!dq.hasOpponentContext) explanation.push("No opponent matchup data, so matchup adjustment is neutral.");
  if (!dq.hasNextGame) explanation.push("No verified next-game schedule, so rest adjustment is neutral.");
  if (logs.length < 5) explanation.push("Limited recent game data — confidence reduced accordingly.");

  const summary = buildSummary(
    player,
    finalLine,
    seasonLine,
    conf.score,
    mt.delta > 0.5 ? "up" : mt.delta < -0.5 ? "down" : "flat",
    matchup.impact,
    { multiplier: rest.multiplier, impact: rest.impact, minutesDelta: rest.minutesDelta },
    injury?.status ?? "Unknown",
  );

  const confidenceExplanation = buildConfidenceExplanation(conf.reasons, conf.score);
  const riskExplanation = buildRiskExplanation(riskFlags, ptsVol, logs.length >= 5);

  return {
    playerId: player.id,
    playerName: player.fullName,
    opponent: nextGame?.opponent,
    homeAway: nextGame?.homeAway,
    projected: finalLine,
    baselineSeason: roundLine(seasonLine),
    confidence: conf.score,
    riskLevel: conf.riskLevel,
    riskFlags,
    explanation,
    factors,
    range: { floor, ceiling },
    statBreakdown: breakdown,
    summary,
    riskExplanation,
    confidenceExplanation,
    dataQuality: dq,
    formIndex,
    generatedAt: new Date().toISOString(),
    modelVersion: MODEL_VERSION,
    dataSource,
  };
}
