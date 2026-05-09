// ESPN league standings — real conference / seed / W-L per team.
// Cached 6h since regular season standings settle and playoffs update slowly.

import { TTL, cachedWithMeta } from "@/lib/data/cache";

export interface TeamStanding {
  abbreviation: string;
  espnId: number;
  conference: "East" | "West";
  seed: number;
  wins: number;
  losses: number;
  winPct: number;
  pointDifferential: number;
  gamesPlayed: number;
  avgPointsFor: number;
  avgPointsAgainst: number;
  streak?: string;
}

interface RawStat {
  name?: string;
  value?: number;
}
interface RawEntry {
  team?: { id?: string; abbreviation?: string };
  stats?: RawStat[];
}
interface RawConference {
  name?: string;
  standings?: { entries?: RawEntry[] };
}
interface RawStandings {
  children?: RawConference[];
}

function parseEntry(entry: RawEntry, conference: "East" | "West"): TeamStanding | null {
  const abbr = entry.team?.abbreviation;
  const id = Number(entry.team?.id);
  if (!abbr) return null;
  const get = (n: string): number =>
    Number(entry.stats?.find((s) => s.name === n)?.value ?? 0);
  return {
    abbreviation: abbr,
    espnId: id,
    conference,
    seed: get("playoffSeed") || 99,
    wins: get("wins"),
    losses: get("losses"),
    winPct: get("winPercent"),
    pointDifferential: get("pointDifferential"),
    gamesPlayed: get("gamesPlayed"),
    avgPointsFor: get("avgPointsFor"),
    avgPointsAgainst: get("avgPointsAgainst"),
  };
}

export async function fetchStandings(): Promise<TeamStanding[]> {
  const read = await cachedWithMeta("espn-standings:v1", TTL.player, async () => {
    try {
      const res = await fetch(
        "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings",
        { cache: "no-store" },
      );
      if (!res.ok) return [] as TeamStanding[];
      const data = (await res.json()) as RawStandings;
      const out: TeamStanding[] = [];
      for (const conf of data.children ?? []) {
        const isEast = (conf.name ?? "").toLowerCase().includes("east");
        const tag: "East" | "West" = isEast ? "East" : "West";
        for (const e of conf.standings?.entries ?? []) {
          const t = parseEntry(e, tag);
          if (t) out.push(t);
        }
      }
      return out;
    } catch {
      return [] as TeamStanding[];
    }
  });
  return read.value;
}
