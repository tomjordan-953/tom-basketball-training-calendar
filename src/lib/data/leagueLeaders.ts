// ESPN league leaders — top-10 in every stat category. Real, current.

import { TTL, cachedWithMeta } from "@/lib/data/cache";

export interface LeaderEntry {
  rank: number;
  athleteId: string;
  athleteName: string;
  team?: string;
  teamAbbr?: string;
  jersey?: string;
  value: number;
  displayValue: string;
  headshot?: string;
}

export interface LeadersByCategory {
  pointsPerGame: LeaderEntry[];
  reboundsPerGame: LeaderEntry[];
  assistsPerGame: LeaderEntry[];
  stealsPerGame: LeaderEntry[];
  blocksPerGame: LeaderEntry[];
  fieldGoalPercentage: LeaderEntry[];
  threePointPercentage: LeaderEntry[];
  freeThrowPercentage: LeaderEntry[];
  per: LeaderEntry[];
  minutesPerGame: LeaderEntry[];
  doubleDouble: LeaderEntry[];
  nbaRating: LeaderEntry[];
}

interface RawLeader {
  displayValue?: string;
  value?: number;
  athlete?: {
    id?: string;
    fullName?: string;
    displayName?: string;
    jersey?: string;
    headshot?: { href?: string };
  };
  team?: { abbreviation?: string; displayName?: string };
}

interface RawCategory {
  name?: string;
  displayName?: string;
  abbreviation?: string;
  leaders?: RawLeader[];
}

interface RawResponse {
  leaders?: { categories?: RawCategory[] };
}

const CATEGORY_MAP: Record<string, keyof LeadersByCategory> = {
  pointsPerGame: "pointsPerGame",
  reboundsPerGame: "reboundsPerGame",
  assistsPerGame: "assistsPerGame",
  stealsPerGame: "stealsPerGame",
  blocksPerGame: "blocksPerGame",
  fieldGoalPercentage: "fieldGoalPercentage",
  "3PointPct": "threePointPercentage",
  FreeThrowPct: "freeThrowPercentage",
  PER: "per",
  minutesPerGame: "minutesPerGame",
  doubleDouble: "doubleDouble",
  NBARating: "nbaRating",
};

function emptyLeaders(): LeadersByCategory {
  return {
    pointsPerGame: [],
    reboundsPerGame: [],
    assistsPerGame: [],
    stealsPerGame: [],
    blocksPerGame: [],
    fieldGoalPercentage: [],
    threePointPercentage: [],
    freeThrowPercentage: [],
    per: [],
    minutesPerGame: [],
    doubleDouble: [],
    nbaRating: [],
  };
}

function mapLeader(r: RawLeader, idx: number): LeaderEntry | null {
  const id = r.athlete?.id;
  if (!id) return null;
  return {
    rank: idx + 1,
    athleteId: `espn-${id}`,
    athleteName: r.athlete?.fullName ?? r.athlete?.displayName ?? "?",
    team: r.team?.displayName,
    teamAbbr: r.team?.abbreviation,
    jersey: r.athlete?.jersey,
    value: r.value ?? 0,
    displayValue: r.displayValue ?? String(r.value ?? "—"),
    headshot: r.athlete?.headshot?.href,
  };
}

export async function fetchLeaders(): Promise<LeadersByCategory> {
  const read = await cachedWithMeta("espn-leaders:v1", TTL.gameLogs, async () => {
    try {
      const res = await fetch(
        "https://site.web.api.espn.com/apis/site/v3/sports/basketball/nba/leaders",
        { cache: "no-store" },
      );
      if (!res.ok) return emptyLeaders();
      const data = (await res.json()) as RawResponse;
      const out = emptyLeaders();
      for (const cat of data.leaders?.categories ?? []) {
        const key = CATEGORY_MAP[cat.name ?? ""];
        if (!key) continue;
        const entries = (cat.leaders ?? [])
          .map((l, i) => mapLeader(l, i))
          .filter((l): l is LeaderEntry => l !== null);
        out[key] = entries;
      }
      return out;
    } catch {
      return emptyLeaders();
    }
  });
  return read.value;
}
