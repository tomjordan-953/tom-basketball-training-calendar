// ESPN scoreboard for today's NBA games. Public, no auth.

import { TTL, cachedWithMeta } from "@/lib/data/cache";

export interface ScoreboardTeam {
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  logo?: string;
  score?: string;
  isHome: boolean;
  record?: string;
}

export interface ScoreboardGame {
  id: string;
  date: string;
  status: string;
  statusDetail: string;
  shortName: string;
  home: ScoreboardTeam;
  away: ScoreboardTeam;
  venue?: string;
  broadcast?: string;
}

interface RawCompetitor {
  homeAway: "home" | "away";
  score?: string;
  records?: Array<{ summary?: string }>;
  team?: {
    abbreviation: string;
    displayName: string;
    shortDisplayName: string;
    logo?: string;
  };
}

interface RawCompetition {
  venue?: { fullName?: string };
  broadcasts?: Array<{ names?: string[] }>;
  competitors?: RawCompetitor[];
}

interface RawEvent {
  id: string;
  date: string;
  name?: string;
  shortName?: string;
  status?: { type?: { description?: string; shortDetail?: string } };
  competitions?: RawCompetition[];
}

interface RawScoreboard {
  events?: RawEvent[];
}

export async function fetchScoreboard(): Promise<ScoreboardGame[]> {
  const read = await cachedWithMeta(
    "espn-scoreboard:today",
    Math.min(TTL.gameLogs, 5 * 60 * 1000),
    async () => {
      try {
        const res = await fetch(
          "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
          { cache: "no-store" },
        );
        if (!res.ok) return [];
        const data = (await res.json()) as RawScoreboard;
        return (data.events ?? [])
          .map((ev) => mapGame(ev))
          .filter((g): g is ScoreboardGame => g !== null);
      } catch {
        return [];
      }
    },
  );
  return read.value;
}

function mapGame(ev: RawEvent): ScoreboardGame | null {
  const comp = ev.competitions?.[0];
  if (!comp) return null;
  const competitors = comp.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  if (!home?.team || !away?.team) return null;
  return {
    id: ev.id,
    date: ev.date,
    status: ev.status?.type?.description ?? "Scheduled",
    statusDetail: ev.status?.type?.shortDetail ?? "",
    shortName: ev.shortName ?? `${away.team.abbreviation} @ ${home.team.abbreviation}`,
    home: mapTeam(home, true),
    away: mapTeam(away, false),
    venue: comp.venue?.fullName,
    broadcast: comp.broadcasts?.[0]?.names?.join(", "),
  };
}

function mapTeam(c: RawCompetitor, isHome: boolean): ScoreboardTeam {
  return {
    abbreviation: c.team!.abbreviation,
    displayName: c.team!.displayName,
    shortDisplayName: c.team!.shortDisplayName,
    logo: c.team!.logo,
    score: c.score,
    isHome,
    record: c.records?.[0]?.summary,
  };
}
