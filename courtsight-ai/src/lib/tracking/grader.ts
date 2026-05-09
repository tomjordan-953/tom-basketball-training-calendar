// Grade unsettled predictions against actual game logs.
// Called lazily from the player profile page (and the /api/accuracy route)
// so we don't need a background worker.

import type { GameLog } from "@/types/stats";
import type { ActualLine, AccuracyStats, PredictionRecord } from "@/types/tracking";
import type { ProjectedStatline } from "@/types/projection";
import { gradePrediction, listPredictions, listForPlayer } from "./store";
import { clamp, round } from "@/lib/utils/format";

const TOLERANCE = {
  points: 4,
  rebounds: 2,
  assists: 2,
  steals: 1,
  blocks: 1,
  turnovers: 1.5,
  minutes: 4,
} as const;

function statAccuracy(predicted: number, actual: number, stat: keyof typeof TOLERANCE): number {
  const tol = TOLERANCE[stat] * 1.5;
  const diff = Math.abs(predicted - actual);
  // 0 diff → 1.0 accuracy; tolerance → ~0.5; 2*tolerance → ~0.0.
  return clamp(1 - diff / (tol * 2), 0, 1);
}

function isHit(predicted: number, actual: number, stat: keyof typeof TOLERANCE): boolean {
  return Math.abs(predicted - actual) <= TOLERANCE[stat];
}

function gameToActual(game: GameLog): ActualLine {
  return {
    points: game.points,
    rebounds: game.rebounds,
    assists: game.assists,
    steals: game.steals,
    blocks: game.blocks,
    turnovers: game.turnovers,
    minutes: game.minutes,
    opponent: game.opponent,
    result: game.result,
  };
}

function findActualGame(
  prediction: PredictionRecord,
  logs: GameLog[],
): GameLog | null {
  if (!prediction.targetDate) {
    // No target date — match the closest game after generatedAt within 7 days.
    const generated = new Date(prediction.generatedAt).getTime();
    return (
      logs.find((g) => {
        const gt = new Date(g.date).getTime();
        return gt >= generated && gt - generated < 7 * 86400_000;
      }) ?? null
    );
  }
  const target = new Date(prediction.targetDate).getTime();
  return (
    logs.find((g) => {
      const gt = new Date(g.date).getTime();
      return Math.abs(gt - target) < 3 * 86400_000;
    }) ?? null
  );
}

// Throttle background grading so refreshing a profile in quick succession
// doesn't re-do the same work.
const lastGrade = new Map<string, number>();
const GRADE_COOLDOWN_MS = 30 * 60 * 1000;

export async function gradePlayerPredictions(
  playerId: string,
  recentLogs: GameLog[],
): Promise<{ graded: number; pending: number }> {
  const last = lastGrade.get(playerId) ?? 0;
  if (Date.now() - last < GRADE_COOLDOWN_MS) {
    return { graded: 0, pending: 0 };
  }
  lastGrade.set(playerId, Date.now());
  const records = await listForPlayer(playerId);
  const ungraded = records.filter((r) => !r.actual);
  let graded = 0;
  let pending = 0;
  for (const rec of ungraded) {
    const game = findActualGame(rec, recentLogs);
    if (!game) {
      pending++;
      continue;
    }
    const actual = gameToActual(game);
    const perStat: ProjectedStatline = {
      points: round(statAccuracy(rec.predicted.points, actual.points, "points") * 100, 1),
      rebounds: round(statAccuracy(rec.predicted.rebounds, actual.rebounds, "rebounds") * 100, 1),
      assists: round(statAccuracy(rec.predicted.assists, actual.assists, "assists") * 100, 1),
      steals: round(statAccuracy(rec.predicted.steals, actual.steals, "steals") * 100, 1),
      blocks: round(statAccuracy(rec.predicted.blocks, actual.blocks, "blocks") * 100, 1),
      turnovers: round(statAccuracy(rec.predicted.turnovers, actual.turnovers, "turnovers") * 100, 1),
      minutes: round(statAccuracy(rec.predicted.minutes, actual.minutes, "minutes") * 100, 1),
    };
    const overall = round(
      (perStat.points * 2 +
        perStat.rebounds * 1.2 +
        perStat.assists * 1.2 +
        perStat.steals * 0.7 +
        perStat.blocks * 0.7 +
        perStat.turnovers * 0.7 +
        perStat.minutes) /
        7.5,
      1,
    );
    const hit =
      isHit(rec.predicted.points, actual.points, "points") &&
      isHit(rec.predicted.rebounds, actual.rebounds, "rebounds") &&
      isHit(rec.predicted.assists, actual.assists, "assists");
    await gradePrediction(rec.id, {
      actual,
      gradedAt: new Date().toISOString(),
      perStatAccuracy: perStat,
      accuracy: overall,
      hit,
    });
    graded++;
  }
  return { graded, pending };
}

export async function computeAccuracyStats(): Promise<AccuracyStats> {
  const all = await listPredictions();
  const settled = all.filter((r) => r.actual);
  const pending = all.length - settled.length;
  if (settled.length === 0) {
    return {
      totalPredictions: all.length,
      graded: 0,
      pending,
      overallAccuracyPct: 0,
      hitRatePct: 0,
      byStat: emptyByStat(),
      recent: all.slice(0, 10),
    };
  }
  const sum = (sel: (r: PredictionRecord) => number) =>
    settled.reduce((a, r) => a + sel(r), 0);
  const mae = (key: keyof PredictionRecord["predicted"]) =>
    sum((r) => Math.abs((r.predicted[key] ?? 0) - ((r.actual as ActualLine)[key] ?? 0))) /
    settled.length;
  const accForStat = (key: keyof PredictionRecord["predicted"]) =>
    sum((r) => r.perStatAccuracy?.[key] ?? 0) / settled.length;
  return {
    totalPredictions: all.length,
    graded: settled.length,
    pending,
    overallAccuracyPct: round(sum((r) => r.accuracy ?? 0) / settled.length, 1),
    hitRatePct: round((settled.filter((r) => r.hit).length / settled.length) * 100, 1),
    byStat: {
      points: { mae: round(mae("points"), 1), accuracyPct: round(accForStat("points"), 1) },
      rebounds: { mae: round(mae("rebounds"), 1), accuracyPct: round(accForStat("rebounds"), 1) },
      assists: { mae: round(mae("assists"), 1), accuracyPct: round(accForStat("assists"), 1) },
      steals: { mae: round(mae("steals"), 1), accuracyPct: round(accForStat("steals"), 1) },
      blocks: { mae: round(mae("blocks"), 1), accuracyPct: round(accForStat("blocks"), 1) },
      turnovers: { mae: round(mae("turnovers"), 1), accuracyPct: round(accForStat("turnovers"), 1) },
      minutes: { mae: round(mae("minutes"), 1), accuracyPct: round(accForStat("minutes"), 1) },
    },
    recent: settled.slice(0, 12),
  };
}

function emptyByStat(): AccuracyStats["byStat"] {
  return {
    points: { mae: 0, accuracyPct: 0 },
    rebounds: { mae: 0, accuracyPct: 0 },
    assists: { mae: 0, accuracyPct: 0 },
    steals: { mae: 0, accuracyPct: 0 },
    blocks: { mae: 0, accuracyPct: 0 },
    turnovers: { mae: 0, accuracyPct: 0 },
    minutes: { mae: 0, accuracyPct: 0 },
  };
}
