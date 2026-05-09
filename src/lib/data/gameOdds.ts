// Pull DraftKings game total + spread from ESPN's per-event summary.
// Game total is the strongest single pace signal we can get for free —
// over/under directly proxies expected possessions.

import { TTL, cachedWithMeta } from "@/lib/data/cache";

export interface GameOdds {
  overUnder?: number;        // game total
  spread?: number;           // home favorite negative
  awayMoneyLine?: number;
  homeMoneyLine?: number;
  details?: string;
  provider?: string;
}

interface RawSummary {
  pickcenter?: Array<{
    provider?: { name?: string };
    overUnder?: number;
    spread?: number;
    details?: string;
    awayTeamOdds?: { moneyLine?: number };
    homeTeamOdds?: { moneyLine?: number };
  }>;
}

export async function fetchGameOdds(eventId: string): Promise<GameOdds | null> {
  if (!eventId) return null;
  const read = await cachedWithMeta(`espn-odds:${eventId}`, TTL.gameLogs, async () => {
    try {
      const res = await fetch(
        `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${eventId}`,
        { cache: "no-store" },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as RawSummary;
      const pc = data.pickcenter?.[0];
      if (!pc) return null;
      return {
        overUnder: pc.overUnder,
        spread: pc.spread,
        awayMoneyLine: pc.awayTeamOdds?.moneyLine,
        homeMoneyLine: pc.homeTeamOdds?.moneyLine,
        details: pc.details,
        provider: pc.provider?.name,
      } satisfies GameOdds;
    } catch {
      return null;
    }
  });
  return read.value;
}

export const LEAGUE_AVG_TOTAL = 226;
