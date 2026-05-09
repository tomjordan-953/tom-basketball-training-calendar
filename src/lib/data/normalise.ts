import type { GameLog } from "@/types/stats";

export function sortGameLogsDesc(logs: GameLog[]): GameLog[] {
  return [...logs].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function takeRecent(logs: GameLog[], n: number): GameLog[] {
  return sortGameLogsDesc(logs).slice(0, n);
}
