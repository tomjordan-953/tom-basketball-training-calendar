// Real ESPN team season stats — used by matchupAdjustment to compute a
// proper opponent multiplier (defense + pace) instead of a generic table.
//
// The ESPN team endpoint exposes `record.items[]` with avgPointsFor /
// avgPointsAgainst for total / home / road. We treat avgPointsAgainst as a
// defensive-rating proxy (lower = harder matchup) and (avgPointsFor +
// avgPointsAgainst) / 2 as a rough pace proxy. League average is computed
// across all 30 teams, refreshed daily.

import { TTL, cachedWithMeta } from "@/lib/data/cache";

// Static abbreviation → ESPN team ID. ESPN IDs are stable.
export const ESPN_TEAM_ID: Record<string, number> = {
  ATL: 1, BOS: 2, NOP: 3, CHI: 4, CLE: 5, DAL: 6, DEN: 7, DET: 8, GSW: 9,
  HOU: 10, IND: 11, LAC: 12, LAL: 13, MIA: 14, MIL: 15, MIN: 16, BKN: 17,
  NYK: 18, ORL: 19, PHI: 20, PHX: 21, POR: 22, SAC: 23, SAS: 24, OKC: 25,
  TOR: 28, UTA: 26, MEM: 29, WSH: 27, CHA: 30,
};

export interface TeamSeasonStats {
  abbreviation: string;
  espnId: number;
  gamesPlayed: number;
  avgPointsFor: number;
  avgPointsAgainst: number;
  pointDifferential: number;
  homeAvgPointsAgainst?: number;
  roadAvgPointsAgainst?: number;
  // derived
  paceProxy: number;
}

export interface TeamStatsBundle {
  teams: Record<string, TeamSeasonStats>;
  leagueAvgPointsAgainst: number;
  leagueAvgPace: number;
}

interface RawTeamResponse {
  team?: {
    record?: { items?: Array<{ type?: string; stats?: Array<{ name?: string; value?: number }> }> };
  };
}

function parseStats(raw: RawTeamResponse | null, abbr: string): TeamSeasonStats | null {
  const items = raw?.team?.record?.items ?? [];
  const total = items.find((i) => i.type === "total");
  if (!total?.stats) return null;
  const get = (name: string): number | undefined =>
    total.stats!.find((s) => s.name === name)?.value;
  const avgFor = get("avgPointsFor");
  const avgAgainst = get("avgPointsAgainst");
  if (avgFor === undefined || avgAgainst === undefined) return null;
  const home = items.find((i) => i.type === "home")?.stats;
  const road = items.find((i) => i.type === "road")?.stats;
  return {
    abbreviation: abbr,
    espnId: ESPN_TEAM_ID[abbr] ?? 0,
    gamesPlayed: get("gamesPlayed") ?? 0,
    avgPointsFor: avgFor,
    avgPointsAgainst: avgAgainst,
    pointDifferential: get("pointDifferential") ?? 0,
    homeAvgPointsAgainst: home?.find((s) => s.name === "avgPointsAgainst")?.value,
    roadAvgPointsAgainst: road?.find((s) => s.name === "avgPointsAgainst")?.value,
    paceProxy: (avgFor + avgAgainst) / 2,
  };
}

async function fetchOne(abbr: string): Promise<TeamSeasonStats | null> {
  const id = ESPN_TEAM_ID[abbr];
  if (!id) return null;
  try {
    const res = await fetch(
      `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const raw = (await res.json()) as RawTeamResponse;
    return parseStats(raw, abbr);
  } catch {
    return null;
  }
}

export async function fetchTeamStatsBundle(): Promise<TeamStatsBundle> {
  const read = await cachedWithMeta(
    "espn-team-stats:bundle",
    TTL.player,
    async () => {
      const teams: Record<string, TeamSeasonStats> = {};
      // Fetch all 30 teams in parallel — small, all cached.
      const results = await Promise.all(
        Object.keys(ESPN_TEAM_ID).map((abbr) => fetchOne(abbr).then((s) => [abbr, s] as const)),
      );
      let totalDef = 0;
      let totalPace = 0;
      let count = 0;
      for (const [abbr, stats] of results) {
        if (!stats) continue;
        teams[abbr] = stats;
        totalDef += stats.avgPointsAgainst;
        totalPace += stats.paceProxy;
        count++;
      }
      const leagueAvgPointsAgainst = count > 0 ? totalDef / count : 115;
      const leagueAvgPace = count > 0 ? totalPace / count : 115;
      return { teams, leagueAvgPointsAgainst, leagueAvgPace };
    },
  );
  return read.value;
}

export async function fetchOpponentTeamStats(
  abbr: string,
): Promise<{ team: TeamSeasonStats | null; bundle: TeamStatsBundle }> {
  const bundle = await fetchTeamStatsBundle();
  return { team: bundle.teams[abbr.toUpperCase()] ?? null, bundle };
}
