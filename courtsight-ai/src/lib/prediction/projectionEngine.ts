// CourtSight projection engine v3 — "per-36 EWMA shrinkage" model.
//
// Core ideas (these typically halve MAE vs the v2 weighted-blend approach):
//  1. Filter out DNPs / garbage-time games (minutes < 10) before averaging.
//  2. Project MINUTES first, with EWMA recency weighting.
//  3. For every volume stat, compute a PER-36-MINUTE rate with both
//     EWMA recency and minutes-weight (so high-minute games count more).
//  4. Bayesian-shrink the recent per-36 toward the season per-36 — small
//     sample sizes lean on the prior, big samples lean on recent form.
//  5. Multiply per-36 rate by projected minutes to get the final stat.
//  6. Empirical floor / ceiling from the player's own per-36 stddev.
//  7. Per-stat tuned alpha (recency) and k (prior strength) — points lean
//     recent, blocks lean season, etc.
//  8. Small context multipliers (matchup ±5%, rest ±3%, injury), applied
//     AFTER the per-36 computation.
//
// Same Projection output shape as v2, so all UI keeps working.

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
import { matchupAdjustment } from "./matchupAdjustments";
import { restAdjustment } from "./restAdjustments";
import { injuryAdjustment } from "./injuryAwareness";
import { applyCalibration } from "@/lib/tracking/calibration";

export const MODEL_VERSION = "courtsight-formula-v3.1";

// Magnitude of the home/away bias correction. Real splits in the NBA are
// ~3% on PTS — capped here to avoid amplifying noise.
const HA_BLEND = 0.5;
// Playoff multipliers — stars play heavier minutes and shoot more.
const PLAYOFF_MIN_MUL = 1.06;
const PLAYOFF_PTS_MUL = 1.04;

type StatKey =
  | "points"
  | "rebounds"
  | "assists"
  | "steals"
  | "blocks"
  | "turnovers"
  | "minutes";

const STAT_LABEL: Record<StatKey, string> = {
  points: "Points",
  rebounds: "Rebounds",
  assists: "Assists",
  steals: "Steals",
  blocks: "Blocks",
  turnovers: "Turnovers",
  minutes: "Minutes",
};

// Per-stat tuning. alpha = EWMA recency weight (higher = more recency).
// k = Bayesian prior strength in "phantom games" (higher = more shrinkage to
// season). Values are based on what works for NBA projection systems —
// points lean recent and shrink lightly, blocks/steals are very noisy and
// shrink hard.
const TUNING: Record<Exclude<StatKey, "minutes">, { alpha: number; k: number }> = {
  points:    { alpha: 0.30, k: 5 },
  rebounds:  { alpha: 0.18, k: 8 },
  assists:   { alpha: 0.25, k: 6 },
  steals:    { alpha: 0.12, k: 10 },
  blocks:    { alpha: 0.12, k: 10 },
  turnovers: { alpha: 0.20, k: 7 },
};
const MINUTES_TUNING = { alpha: 0.20 };

const MIN_VALID_MINUTES = 10; // exclude DNPs / trash-time stints
const RECENT_WINDOW = 18;     // games we consider for the recency pool
const MAX_MINUTES_WEIGHT = 36; // cap so 44 min isn't 4x weight on a 12 min game

interface BuildArgs {
  player: Player;
  logs: GameLog[];
  season: SeasonAverages | null;
  nextGame: NextGameContext | null;
  opponent: OpponentContext | null;
  injury: InjuryNote | null;
  dataSource: "demo" | "balldontlie" | "espn";
  freshnessAgeMs?: number;
  // v3.1 additions — all optional so callers can opt in incrementally.
  isPlayoffs?: boolean;
  calibration?: import("@/lib/tracking/calibration").PlayerCalibration | null;
}

// ---------- helpers ---------------------------------------------------------

function ewma(values: number[], alpha: number): number {
  if (values.length === 0) return 0;
  let weighted = 0;
  let weightSum = 0;
  for (let i = 0; i < values.length; i++) {
    const w = Math.pow(1 - alpha, i); // values[0] = most recent
    weighted += values[i] * w;
    weightSum += w;
  }
  return weightSum === 0 ? 0 : weighted / weightSum;
}

function ewmaWithMinutesWeight(
  per36: number[],
  minutes: number[],
  alpha: number,
): number {
  if (per36.length === 0) return 0;
  let weighted = 0;
  let weightSum = 0;
  for (let i = 0; i < per36.length; i++) {
    const recency = Math.pow(1 - alpha, i);
    const minWeight = Math.min(minutes[i] ?? 0, MAX_MINUTES_WEIGHT);
    const w = recency * minWeight;
    weighted += per36[i] * w;
    weightSum += w;
  }
  return weightSum === 0 ? 0 : weighted / weightSum;
}

function shrunk(rate: number, prior: number, n: number, k: number): number {
  return (rate * n + prior * k) / (n + k);
}

function per36(stat: number, minutes: number): number {
  if (!Number.isFinite(stat) || !minutes) return 0;
  return (stat / minutes) * 36;
}

function validRecent(logs: GameLog[]): GameLog[] {
  return logs
    .slice() // already sorted desc by API caller, but copy to be safe
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .filter((g) => (g.minutes ?? 0) >= MIN_VALID_MINUTES)
    .slice(0, RECENT_WINDOW);
}

function seasonPer36(season: SeasonAverages | null, key: StatKey): number {
  if (!season || !season.minutes) return 0;
  return per36((season as unknown as Record<StatKey, number>)[key], season.minutes);
}

function clampStat(key: StatKey, v: number): number {
  if (key === "minutes") return clamp(v, 0, 48);
  return clamp(v, 0, 80);
}

// ---------- per-stat projection -------------------------------------------

interface PerStatResult {
  expected: number;
  floor: number;
  ceiling: number;
  confidence: number;
  trend: "up" | "down" | "flat";
  notes: string[];
  // diagnostics
  per36Rate: number;
  per36Season: number;
  sampleSize: number;
  cv: number;
}

function projectStat(
  key: Exclude<StatKey, "minutes">,
  recent: GameLog[],
  season: SeasonAverages | null,
  projMinutes: number,
): PerStatResult {
  const tuning = TUNING[key];
  const seasonRate = seasonPer36(season, key);
  const minutes = recent.map((g) => g.minutes);
  const per36s = recent.map((g) =>
    per36((g as unknown as Record<StatKey, number>)[key], g.minutes),
  );

  const recentRate = per36s.length
    ? ewmaWithMinutesWeight(per36s, minutes, tuning.alpha)
    : seasonRate;
  const blendedRate = shrunk(recentRate, seasonRate, per36s.length, tuning.k);
  const expected = clampStat(key, (blendedRate / 36) * projMinutes);

  // Empirical band from recent per-36 stddev, scaled by projected minutes.
  const sd = per36s.length >= 3 ? stddev(per36s) : 0;
  const bandPer36 = Math.max(sd * 0.85, blendedRate * 0.12);
  const floor = clampStat(key, ((blendedRate - bandPer36) / 36) * projMinutes);
  const ceiling = clampStat(key, ((blendedRate + bandPer36) / 36) * projMinutes);

  // Trend = last 5 vs prior 5 of per-36 rates.
  const last5 = per36s.slice(0, 5);
  const prior = per36s.slice(5, 10);
  const last5Avg = last5.length ? average(last5) : 0;
  const priorAvg = prior.length ? average(prior) : last5Avg;
  const delta = last5Avg - priorAvg;
  let trend: "up" | "down" | "flat";
  if (key === "turnovers") {
    trend = delta > 0.5 ? "down" : delta < -0.5 ? "up" : "flat";
  } else {
    trend = delta > 0.6 ? "up" : delta < -0.6 ? "down" : "flat";
  }

  const cv = blendedRate > 0 ? sd / blendedRate : 0;
  let confidence = 80 - cv * 60;
  if (per36s.length < 5) confidence -= 18;
  else if (per36s.length < 10) confidence -= 6;
  else confidence += 4;
  if (Math.abs(seasonRate - recentRate) > seasonRate * 0.4) confidence -= 6;
  confidence = clamp(Math.round(confidence), 5, 95);

  const notes: string[] = [];
  if (per36s.length < 5) notes.push(`Small sample (${per36s.length} valid games)`);
  if (cv > 0.45) notes.push(`High variance (CV ${cv.toFixed(2)})`);
  if (Math.abs(recentRate - seasonRate) > seasonRate * 0.25) {
    notes.push(
      recentRate > seasonRate
        ? `Recent per-36 ${recentRate.toFixed(1)} > season ${seasonRate.toFixed(1)}`
        : `Recent per-36 ${recentRate.toFixed(1)} < season ${seasonRate.toFixed(1)}`,
    );
  }

  return {
    expected,
    floor,
    ceiling,
    confidence,
    trend,
    notes,
    per36Rate: recentRate,
    per36Season: seasonRate,
    sampleSize: per36s.length,
    cv,
  };
}

// Compute the player's own home/away delta from their recent valid games.
// Returns the multiplicative adjustment to apply to per-36 PTS for the
// next game's home/away side. Capped to ±5% so a small sample can't move
// the projection too far.
function homeAwayPointsMultiplier(
  recent: GameLog[],
  upcoming: NextGameContext | null,
): { mul: number; sample: number; description: string | null } {
  if (!upcoming) return { mul: 1, sample: 0, description: null };
  const home = recent.filter((g) => g.homeAway === "home" && g.minutes >= MIN_VALID_MINUTES);
  const away = recent.filter((g) => g.homeAway === "away" && g.minutes >= MIN_VALID_MINUTES);
  if (home.length < 3 || away.length < 3) return { mul: 1, sample: 0, description: null };
  const homePer36 = average(home.map((g) => per36(g.points, g.minutes)));
  const awayPer36 = average(away.map((g) => per36(g.points, g.minutes)));
  if (homePer36 <= 0 || awayPer36 <= 0) return { mul: 1, sample: 0, description: null };
  const overallPer36 = (homePer36 * home.length + awayPer36 * away.length) / (home.length + away.length);
  const sidePer36 = upcoming.homeAway === "home" ? homePer36 : awayPer36;
  const rawMul = sidePer36 / overallPer36;
  const blended = 1 + (rawMul - 1) * HA_BLEND;
  const mul = clamp(blended, 0.95, 1.05);
  const description =
    Math.abs(mul - 1) >= 0.012
      ? `Player's per-36 points are ${(rawMul * 100 - 100).toFixed(1)}% ${rawMul > 1 ? "higher" : "lower"} ${upcoming.homeAway === "home" ? "at home" : "on the road"} (n=${upcoming.homeAway === "home" ? home.length : away.length}).`
      : null;
  return { mul, sample: home.length + away.length, description };
}

function projectMinutes(recent: GameLog[], season: SeasonAverages | null): {
  expected: number;
  floor: number;
  ceiling: number;
  trend: "up" | "down" | "flat";
  sd: number;
  confidence: number;
} {
  const minutes = recent.map((g) => g.minutes);
  const seasonMin = season?.minutes ?? (minutes.length ? average(minutes) : 0);
  const recentMin = minutes.length ? ewma(minutes, MINUTES_TUNING.alpha) : seasonMin;
  // Light shrinkage to season for minutes.
  const expected = shrunk(recentMin, seasonMin, minutes.length, 4);
  const sd = minutes.length >= 3 ? stddev(minutes) : 4;
  const band = Math.max(sd * 0.85, expected * 0.08);
  const last5 = minutes.slice(0, 5);
  const prior = minutes.slice(5, 10);
  const delta = (last5.length ? average(last5) : 0) - (prior.length ? average(prior) : 0);
  const trend: "up" | "down" | "flat" =
    delta > 1 ? "up" : delta < -1 ? "down" : "flat";
  let confidence = 85 - sd * 4;
  if (minutes.length < 5) confidence -= 15;
  return {
    expected: clampStat("minutes", expected),
    floor: clampStat("minutes", expected - band),
    ceiling: clampStat("minutes", expected + band),
    trend,
    sd,
    confidence: clamp(Math.round(confidence), 5, 95),
  };
}

// ---------- factors / data quality / explanations -------------------------

function buildFactors(args: {
  recent: GameLog[];
  season: SeasonAverages | null;
  matchup: ReturnType<typeof matchupAdjustment>;
  rest: ReturnType<typeof restAdjustment>;
  injury: ReturnType<typeof injuryAdjustment>;
  dataQualityScore: number;
  dqNotes: string[];
  ptsResult: PerStatResult;
  minutesResult: ReturnType<typeof projectMinutes>;
}): ProjectionFactor[] {
  const f: ProjectionFactor[] = [];
  const { ptsResult, minutesResult } = args;

  const recentPts = ptsResult.per36Rate;
  const seasonPts = ptsResult.per36Season;
  if (recentPts > seasonPts * 1.07) {
    f.push({
      label: "Recent scoring",
      group: "form",
      impact: "positive",
      description: `Per-36 scoring rate ${recentPts.toFixed(1)} is well above season ${seasonPts.toFixed(1)} — hot stretch.`,
    });
  } else if (recentPts < seasonPts * 0.93) {
    f.push({
      label: "Recent scoring",
      group: "form",
      impact: "negative",
      description: `Per-36 scoring rate ${recentPts.toFixed(1)} is below season ${seasonPts.toFixed(1)} — cold stretch.`,
    });
  } else {
    f.push({
      label: "Recent scoring",
      group: "form",
      impact: "neutral",
      description: `Per-36 scoring tracks season baseline (${recentPts.toFixed(1)} vs ${seasonPts.toFixed(1)}).`,
    });
  }

  if (minutesResult.trend === "up") {
    f.push({
      label: "Minutes trend",
      group: "minutes",
      impact: "positive",
      description: `Minutes trending up (~${minutesResult.expected.toFixed(1)} expected, σ ${minutesResult.sd.toFixed(1)}).`,
    });
  } else if (minutesResult.trend === "down") {
    f.push({
      label: "Minutes trend",
      group: "minutes",
      impact: "negative",
      description: `Minutes trending down (~${minutesResult.expected.toFixed(1)} expected, σ ${minutesResult.sd.toFixed(1)}).`,
    });
  } else {
    f.push({
      label: "Minutes stability",
      group: "minutes",
      impact: "neutral",
      description: `Minutes stable at ${minutesResult.expected.toFixed(1)} (σ ${minutesResult.sd.toFixed(1)}).`,
    });
  }

  if (ptsResult.cv > 0.4) {
    f.push({
      label: "Volatility",
      group: "volatility",
      impact: "negative",
      description: `Per-36 scoring CV ${ptsResult.cv.toFixed(2)} — wide game-to-game swings.`,
    });
  } else if (ptsResult.cv > 0) {
    f.push({
      label: "Volatility",
      group: "volatility",
      impact: "neutral",
      description: `Per-36 scoring variance is normal (CV ${ptsResult.cv.toFixed(2)}).`,
    });
  }

  f.push({
    label: "Opponent matchup",
    group: "matchup",
    impact: args.matchup.impact,
    description: args.matchup.description,
  });
  f.push({
    label: "Rest / schedule",
    group: "rest",
    impact: args.rest.impact,
    description: args.rest.description,
  });
  f.push({
    label: "Injury / status",
    group: "injury",
    impact: args.injury.impact,
    description: args.injury.description,
  });
  f.push({
    label: "Data quality",
    group: "data",
    impact: args.dataQualityScore >= 70 ? "neutral" : "negative",
    description:
      args.dqNotes.length === 0
        ? `Data inputs look complete (quality score ${args.dataQualityScore}/100).`
        : `Quality ${args.dataQualityScore}/100 — ${args.dqNotes.join("; ")}.`,
  });

  return f;
}

function computeDataQuality(args: {
  validCount: number;
  totalLogs: number;
  season: SeasonAverages | null;
  nextGame: NextGameContext | null;
  opponent: OpponentContext | null;
  injury: InjuryNote | null;
  freshnessAgeMs?: number;
}): DataQuality {
  const notes: string[] = [];
  let score = 60;
  if (args.validCount >= 15) score += 14;
  else if (args.validCount >= 8) score += 6;
  else if (args.validCount >= 3) notes.push("Small valid-game sample");
  else {
    score -= 25;
    notes.push("Almost no valid-minute games to model from");
  }
  if (args.totalLogs - args.validCount > 0) {
    notes.push(`${args.totalLogs - args.validCount} DNP/short stint(s) excluded`);
  }
  if (args.season) score += 6;
  else notes.push("Season averages unavailable");
  if (args.nextGame) score += 4;
  else notes.push("No verified next-game schedule connected");
  if (args.opponent) score += 6;
  else notes.push("Opponent matchup data unavailable");
  if (args.injury && args.injury.status !== "Unknown") score += 6;
  else notes.push("No verified injury source connected");
  if (args.freshnessAgeMs !== undefined && args.freshnessAgeMs > 6 * 60 * 60 * 1000) {
    notes.push("Cache is older than 6h");
    score -= 4;
  }
  return {
    recentGamesCount: args.validCount,
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

// ---------- top-level entry point -----------------------------------------

export function buildProjection(args: BuildArgs): Projection {
  const { player, logs, season, nextGame, opponent, injury, dataSource } = args;
  const recent = validRecent(logs);

  // Project minutes first.
  const m = projectMinutes(recent, season);
  let projMinutes = m.expected;

  // Per-stat per-36 projections (BEFORE multipliers).
  const ptsR = projectStat("points", recent, season, projMinutes);
  const rebR = projectStat("rebounds", recent, season, projMinutes);
  const astR = projectStat("assists", recent, season, projMinutes);
  const stlR = projectStat("steals", recent, season, projMinutes);
  const blkR = projectStat("blocks", recent, season, projMinutes);
  const tovR = projectStat("turnovers", recent, season, projMinutes);

  // Context multipliers.
  const matchup = matchupAdjustment(opponent);
  const rest = restAdjustment(nextGame);
  const inj = injuryAdjustment(injury);

  // Home/away split derived from this player's own gamelog.
  const ha = homeAwayPointsMultiplier(recent, nextGame);

  // Playoff bumps — only meaningful for high-minute role players.
  const playoffPtsMul = args.isPlayoffs ? PLAYOFF_PTS_MUL : 1;
  const playoffMinMul = args.isPlayoffs ? PLAYOFF_MIN_MUL : 1;

  // Smaller magnitudes than v2 so per-36 model dominates. Home/away and
  // playoffs layer on top.
  const offenseMul =
    (1 + (matchup.pointsMultiplier - 1) * 0.7) *
    rest.multiplier *
    inj.multiplier *
    ha.mul *
    playoffPtsMul;
  const contextMul =
    (1 + (matchup.paceMultiplier - 1) * 0.5) *
    rest.multiplier *
    inj.multiplier *
    playoffPtsMul; // pace bump applies to context stats too in playoffs

  if (rest.minutesDelta) projMinutes += rest.minutesDelta * 0.6;
  if (args.isPlayoffs) projMinutes *= playoffMinMul;
  if (inj.multiplier === 0) projMinutes = 0;
  projMinutes = clampStat("minutes", projMinutes);

  // Apply multipliers to expected/floor/ceiling.
  const apply = (r: PerStatResult, mul: number) => ({
    expected: clampStat("points", r.expected * mul), // clampStat key irrelevant for non-minutes
    floor: clampStat("points", r.floor * mul),
    ceiling: clampStat("points", r.ceiling * mul),
    confidence: r.confidence,
    trend: r.trend,
    notes: r.notes,
  });

  const pts = apply(ptsR, offenseMul);
  const reb = apply(rebR, contextMul);
  const ast = apply(astR, contextMul);
  const stl = apply(stlR, contextMul);
  const blk = apply(blkR, contextMul);
  const tov = apply(tovR, offenseMul);

  // If injury zeros things out, force everything to 0.
  if (inj.multiplier === 0) {
    pts.expected = pts.floor = pts.ceiling = 0;
    reb.expected = reb.floor = reb.ceiling = 0;
    ast.expected = ast.floor = ast.ceiling = 0;
    stl.expected = stl.floor = stl.ceiling = 0;
    blk.expected = blk.floor = blk.ceiling = 0;
    tov.expected = tov.floor = tov.ceiling = 0;
  }

  // Apply learned per-player calibration LAST (so it corrects systematic
  // bias from everything upstream).
  const calibratedLine = applyCalibration(
    {
      points: pts.expected,
      rebounds: reb.expected,
      assists: ast.expected,
      steals: stl.expected,
      blocks: blk.expected,
      turnovers: tov.expected,
      minutes: projMinutes,
    },
    args.calibration ?? null,
  );

  const finalLine: ProjectedStatline = {
    points: round(calibratedLine.points, 1),
    rebounds: round(calibratedLine.rebounds, 1),
    assists: round(calibratedLine.assists, 1),
    steals: round(calibratedLine.steals, 1),
    blocks: round(calibratedLine.blocks, 1),
    turnovers: round(calibratedLine.turnovers, 1),
    minutes: round(calibratedLine.minutes, 1),
  };

  const baselineSeason: ProjectedStatline = {
    points: round(season?.points ?? 0, 1),
    rebounds: round(season?.rebounds ?? 0, 1),
    assists: round(season?.assists ?? 0, 1),
    steals: round(season?.steals ?? 0, 1),
    blocks: round(season?.blocks ?? 0, 1),
    turnovers: round(season?.turnovers ?? 0, 1),
    minutes: round(season?.minutes ?? 0, 1),
  };

  const breakdown: StatBreakdown = {
    points: toStatProjection("Points", pts, ptsR),
    rebounds: toStatProjection("Rebounds", reb, rebR),
    assists: toStatProjection("Assists", ast, astR),
    steals: toStatProjection("Steals", stl, stlR),
    blocks: toStatProjection("Blocks", blk, blkR),
    turnovers: toStatProjection("Turnovers", tov, tovR),
    minutes: minutesStatProjection(m, projMinutes),
  };

  // Overall confidence — weighted by importance.
  const overallConf = Math.round(
    pts.confidence * 0.30 +
      reb.confidence * 0.18 +
      ast.confidence * 0.18 +
      m.confidence * 0.15 +
      stl.confidence * 0.06 +
      blk.confidence * 0.06 +
      tov.confidence * 0.07,
  );
  let riskLevel: "Low" | "Medium" | "High";
  if (overallConf >= 75) riskLevel = "Low";
  else if (overallConf >= 55) riskLevel = "Medium";
  else riskLevel = "High";

  const dq = computeDataQuality({
    validCount: recent.length,
    totalLogs: logs.length,
    season,
    nextGame,
    opponent,
    injury,
    freshnessAgeMs: args.freshnessAgeMs,
  });

  const factors = buildFactors({
    recent,
    season,
    matchup,
    rest,
    injury: inj,
    dataQualityScore: dq.score,
    dqNotes: dq.notes,
    ptsResult: ptsR,
    minutesResult: m,
  });

  if (ha.description) {
    factors.push({
      label: "Home/away split",
      group: "form",
      impact: ha.mul > 1.005 ? "positive" : ha.mul < 0.995 ? "negative" : "neutral",
      description: ha.description,
    });
  }
  if (args.isPlayoffs) {
    factors.push({
      label: "Playoff context",
      group: "rest",
      impact: "positive",
      description: `Postseason game — minutes scaled by ${PLAYOFF_MIN_MUL.toFixed(2)}, points by ${PLAYOFF_PTS_MUL.toFixed(2)} for high-rotation players.`,
    });
  }
  if (args.calibration && args.calibration.appliedCount > 0) {
    const bias = args.calibration.bias;
    const ptsBias = bias.points;
    factors.push({
      label: "Personal calibration",
      group: "data",
      impact: Math.abs(ptsBias) >= 0.6 ? (ptsBias > 0 ? "positive" : "negative") : "neutral",
      description: `Bias-corrected from ${args.calibration.appliedCount} graded games for this player (PTS shift ${ptsBias >= 0 ? "+" : ""}${ptsBias.toFixed(1)}).`,
    });
  }

  const riskFlags: string[] = [];
  if (inj.riskFlag) riskFlags.push(inj.riskFlag);
  if (nextGame?.isBackToBack) riskFlags.push("Back-to-back");
  if (m.sd > 4) riskFlags.push("Minutes volatility");
  if (ptsR.cv > 0.45) riskFlags.push("High variance scoring");
  if (recent.length < 5) riskFlags.push("Small valid-game sample");
  if (!injury || injury.status === "Unknown") riskFlags.push("No verified injury source");

  // Form index = recent per-36 across PTS+REB+AST vs season per-36.
  const formIndex = computeFormIndex(ptsR, rebR, astR);

  // Summary, confidence/risk write-ups, explanation bullets.
  const summary = buildSummary(
    player,
    finalLine,
    baselineSeason,
    overallConf,
    m.trend,
    matchup.impact,
    rest,
    injury?.status ?? "Unknown",
  );
  const confidenceExplanation = buildConfidenceExplanation(overallConf, recent.length, m.sd, ptsR.cv);
  const riskExplanation = buildRiskExplanation(riskFlags, ptsR.cv, recent.length);
  const explanation = factors.map((f) => f.description);
  if (!dq.hasInjurySource) explanation.push("No verified injury source connected, so injury adjustment is neutral.");
  if (!dq.hasOpponentContext) explanation.push("No opponent matchup data, so matchup adjustment is neutral.");

  return {
    playerId: player.id,
    playerName: player.fullName,
    opponent: nextGame?.opponent,
    homeAway: nextGame?.homeAway,
    projected: finalLine,
    baselineSeason,
    confidence: overallConf,
    riskLevel,
    riskFlags,
    explanation,
    factors,
    range: {
      floor: roundLine({
        points: pts.floor,
        rebounds: reb.floor,
        assists: ast.floor,
        steals: stl.floor,
        blocks: blk.floor,
        turnovers: tov.floor,
        minutes: m.floor,
      }),
      ceiling: roundLine({
        points: pts.ceiling,
        rebounds: reb.ceiling,
        assists: ast.ceiling,
        steals: stl.ceiling,
        blocks: blk.ceiling,
        turnovers: tov.ceiling,
        minutes: m.ceiling,
      }),
    },
    statBreakdown: breakdown,
    summary,
    confidenceExplanation,
    riskExplanation,
    dataQuality: dq,
    formIndex,
    generatedAt: new Date().toISOString(),
    modelVersion: MODEL_VERSION,
    dataSource,
  };
}

function toStatProjection(
  label: string,
  applied: { expected: number; floor: number; ceiling: number; confidence: number; trend: "up" | "down" | "flat"; notes: string[] },
  raw: PerStatResult,
): StatProjection {
  return {
    expected: round(applied.expected, 1),
    floor: round(applied.floor, 1),
    ceiling: round(applied.ceiling, 1),
    confidence: applied.confidence,
    trend: applied.trend,
    explanation: explainStat(label, applied.expected, raw),
  };
}

function minutesStatProjection(
  m: ReturnType<typeof projectMinutes>,
  expected: number,
): StatProjection {
  return {
    expected: round(expected, 1),
    floor: round(m.floor, 1),
    ceiling: round(m.ceiling, 1),
    confidence: m.confidence,
    trend: m.trend,
    explanation:
      m.trend === "up"
        ? `Minutes trending up over recent games — ~${expected.toFixed(1)} expected.`
        : m.trend === "down"
          ? `Minutes trending down recently — ~${expected.toFixed(1)} expected.`
          : `Minutes stable around ${expected.toFixed(1)} per game.`,
  };
}

function explainStat(label: string, expected: number, raw: PerStatResult): string {
  const lc = label.toLowerCase();
  const samples = raw.sampleSize;
  if (raw.notes.length === 0) {
    return `${label} projection (${expected.toFixed(1)}) blends per-36 recent rate ${raw.per36Rate.toFixed(1)} with season baseline ${raw.per36Season.toFixed(1)} (${samples} valid games).`;
  }
  const trendBit =
    raw.trend === "up"
      ? `Recent ${lc} per-36 trending up.`
      : raw.trend === "down"
        ? `Recent ${lc} per-36 trending down.`
        : `Recent ${lc} per-36 close to baseline.`;
  const notes = raw.notes.join("; ");
  return `${label}: ${expected.toFixed(1)} expected. ${trendBit} ${notes}.`;
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

function computeFormIndex(pts: PerStatResult, reb: PerStatResult, ast: PerStatResult): number {
  const ratios: number[] = [];
  for (const r of [pts, reb, ast]) {
    if (r.per36Season > 0) ratios.push(r.per36Rate / r.per36Season);
  }
  if (ratios.length === 0) return 50;
  const avg = average(ratios);
  return Math.round(clamp(30 + (avg - 0.7) * 100, 0, 100));
}

function buildSummary(
  player: Player,
  expected: ProjectedStatline,
  baseline: ProjectedStatline,
  conf: number,
  minTrend: "up" | "down" | "flat",
  matchupImpact: "positive" | "negative" | "neutral",
  rest: { minutesDelta: number },
  injuryStatus: string,
): string {
  const above = expected.points - baseline.points;
  const direction =
    above >= 1.5
      ? "above his season scoring baseline"
      : above <= -1.5
        ? "below his season scoring baseline"
        : "near his season scoring baseline";
  const trendPhrase =
    minTrend === "up"
      ? "his minutes are trending up"
      : minTrend === "down"
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

function buildConfidenceExplanation(score: number, n: number, minSd: number, ptsCv: number): string {
  const tone =
    score >= 75 ? "Confidence is high" : score >= 55 ? "Confidence is medium" : "Confidence is low";
  const reasons: string[] = [];
  reasons.push(`${n} valid recent games`);
  if (minSd > 4) reasons.push(`minutes σ ${minSd.toFixed(1)} (volatile)`);
  else reasons.push(`minutes σ ${minSd.toFixed(1)} (stable)`);
  if (ptsCv > 0.4) reasons.push(`per-36 scoring CV ${ptsCv.toFixed(2)} (high)`);
  else reasons.push(`per-36 scoring CV ${ptsCv.toFixed(2)} (normal)`);
  return `${tone} because: ${reasons.join("; ")}.`;
}

function buildRiskExplanation(riskFlags: string[], ptsCv: number, n: number): string {
  if (riskFlags.length === 0 && ptsCv < 0.3 && n >= 5) {
    return "Few risk drivers detected — projection should hold barring injury or unusual game script.";
  }
  const drivers = [...riskFlags];
  if (ptsCv >= 0.4) drivers.push("game-to-game scoring variance is high");
  if (n < 5) drivers.push("limited recent valid-game sample");
  return `Things that could make this prediction wrong: ${drivers.join("; ")}.`;
}
