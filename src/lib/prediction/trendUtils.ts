import type { GameLog } from "@/types/stats";
import { average, stddev } from "@/lib/utils/format";
import { takeRecent } from "@/lib/data/normalise";

export type StatKey =
  | "points"
  | "rebounds"
  | "assists"
  | "steals"
  | "blocks"
  | "turnovers"
  | "minutes";

export const STAT_KEYS: StatKey[] = [
  "points",
  "rebounds",
  "assists",
  "steals",
  "blocks",
  "turnovers",
  "minutes",
];

export function statValues(logs: GameLog[], key: StatKey): number[] {
  return logs.map((g) => g[key] ?? 0);
}

export function statAverage(logs: GameLog[], key: StatKey): number {
  return average(statValues(logs, key));
}

export function recentForm(logs: GameLog[], n: number): GameLog[] {
  return takeRecent(logs, n);
}

export function minutesTrend(logs: GameLog[]): {
  recentAvg: number;
  baselineAvg: number;
  delta: number;
  stable: boolean;
} {
  const recent = recentForm(logs, 5);
  const baseline = recentForm(logs, 10);
  const recentAvg = statAverage(recent, "minutes");
  const baselineAvg = statAverage(baseline, "minutes");
  const sd = stddev(statValues(baseline, "minutes"));
  return {
    recentAvg,
    baselineAvg,
    delta: recentAvg - baselineAvg,
    stable: sd < 4,
  };
}

export function volatilityScore(logs: GameLog[], key: StatKey): number {
  const values = statValues(takeRecent(logs, 10), key);
  if (values.length < 3) return 0;
  const mean = average(values);
  if (mean === 0) return 0;
  return stddev(values) / mean;
}
