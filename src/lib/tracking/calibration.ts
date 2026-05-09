// Per-player calibration: learn the model's systematic bias for each
// player from the historical prediction store and bias-correct future
// projections.
//
// Math: for each (player, stat), compute the median of (actual - predicted)
// across graded predictions. Apply that as an additive correction to new
// projections (capped to ±15% of the predicted value to prevent runaway).
//
// Median (vs mean) gives robustness against single-game outliers. Capping
// keeps a noisy 3-sample history from doing too much.
//
// We require >= 3 graded predictions per player before applying calibration,
// and we cache the result for a short window so visiting a profile is fast.

import type { ProjectedStatline } from "@/types/projection";
import type { PredictionRecord } from "@/types/tracking";
import { listForPlayer } from "./store";
import { clamp } from "@/lib/utils/format";

const STAT_KEYS: Array<keyof ProjectedStatline> = [
  "points",
  "rebounds",
  "assists",
  "steals",
  "blocks",
  "turnovers",
  "minutes",
];

export interface PlayerCalibration {
  sampleSize: number;
  bias: ProjectedStatline; // median(actual - predicted) per stat
  appliedCount: number;   // how many records met the inclusion criteria
}

const cacheByPlayer = new Map<string, { result: PlayerCalibration; expires: number }>();
const TTL_MS = 5 * 60 * 1000; // small — recompute often as new grades land

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export async function getPlayerCalibration(playerId: string): Promise<PlayerCalibration | null> {
  const hit = cacheByPlayer.get(playerId);
  if (hit && hit.expires > Date.now()) return hit.result;
  const recs: PredictionRecord[] = await listForPlayer(playerId);
  const graded = recs.filter((r) => r.actual);
  if (graded.length < 3) {
    cacheByPlayer.set(playerId, {
      result: { sampleSize: graded.length, bias: zeroLine(), appliedCount: 0 },
      expires: Date.now() + TTL_MS,
    });
    return null;
  }
  // Use the most recent N graded predictions so calibration follows role
  // changes (trade, new role, etc.).
  const recent = graded.slice(0, 30);
  const bias = {} as ProjectedStatline;
  for (const k of STAT_KEYS) {
    const diffs = recent
      .map((r) => {
        const a = (r.actual as unknown as Record<string, number> | undefined)?.[k];
        const p = (r.predicted as unknown as Record<string, number>)[k];
        if (typeof a !== "number" || typeof p !== "number") return NaN;
        return a - p;
      })
      .filter((d) => Number.isFinite(d));
    bias[k] = median(diffs);
  }
  const result: PlayerCalibration = {
    sampleSize: graded.length,
    appliedCount: recent.length,
    bias,
  };
  cacheByPlayer.set(playerId, { result, expires: Date.now() + TTL_MS });
  return result;
}

function zeroLine(): ProjectedStatline {
  return {
    points: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    turnovers: 0,
    minutes: 0,
  };
}

/**
 * Apply calibration to an expected statline. Each stat is shifted by the
 * learned bias, capped to ±15% of the original predicted value (and a hard
 * floor at 0).
 */
export function applyCalibration(
  predicted: ProjectedStatline,
  cal: PlayerCalibration | null,
): ProjectedStatline {
  if (!cal || cal.appliedCount === 0) return { ...predicted };
  const out = {} as ProjectedStatline;
  for (const k of STAT_KEYS) {
    const base = predicted[k];
    const cap = Math.max(Math.abs(base) * 0.15, 1);
    const adj = clamp(cal.bias[k], -cap, cap);
    out[k] = Math.max(0, base + adj);
  }
  return out;
}

export function calibrationSummary(cal: PlayerCalibration | null): string {
  if (!cal || cal.appliedCount === 0) {
    return "No calibration yet — projection runs blind on this player.";
  }
  const drivers: string[] = [];
  for (const k of STAT_KEYS) {
    const v = cal.bias[k];
    if (Math.abs(v) >= 0.6) {
      const sign = v > 0 ? "+" : "";
      drivers.push(`${k.toUpperCase().slice(0, 3)} ${sign}${v.toFixed(1)}`);
    }
  }
  if (drivers.length === 0) {
    return `Calibrated against ${cal.appliedCount} graded games — no significant bias detected.`;
  }
  return `Calibrated against ${cal.appliedCount} graded games. Bias correction: ${drivers.join(", ")}.`;
}
