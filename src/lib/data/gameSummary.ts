// ESPN game summary endpoint — full per-team box score with player headshots
// and per-game stat lines. Public, no auth.

import { TTL, cachedWithMeta } from "@/lib/data/cache";

export interface BoxScorePlayer {
  espnId: string;
  fullName: string;
  position?: string;
  jersey?: string;
  starter: boolean;
  didNotPlay: boolean;
  headshot?: string;
  // raw stats indexed by labels
  stats: string[];
  // parsed
  minutes: number;
  points: number;
  fg: string;
  threes: string;
  ft: string;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  plusMinus?: string;
}

export interface BoxScoreTeam {
  abbreviation: string;
  displayName: string;
  shortDisplayName?: string;
  logo?: string;
  score?: string;
  homeAway: "home" | "away";
  isWinner?: boolean;
  record?: string;
  players: BoxScorePlayer[];
}

export interface GameSummary {
  eventId: string;
  date: string;
  status: string;
  statusDetail: string;
  isFinal: boolean;
  isLive: boolean;
  venue?: string;
  broadcast?: string;
  away: BoxScoreTeam;
  home: BoxScoreTeam;
  labels: string[];
}

interface RawSummary {
  header?: {
    competitions?: Array<{
      status?: { type?: { description?: string; shortDetail?: string; completed?: boolean; state?: string } };
      competitors?: Array<{
        homeAway: "home" | "away";
        winner?: boolean;
        score?: string;
        team?: { abbreviation?: string; displayName?: string; shortDisplayName?: string; logo?: string };
        record?: Array<{ summary?: string; type?: string }>;
      }>;
      date?: string;
      venue?: { fullName?: string };
      broadcasts?: Array<{ media?: { shortName?: string } }>;
    }>;
  };
  boxscore?: {
    players?: Array<{
      team?: { abbreviation?: string; displayName?: string; shortDisplayName?: string; logo?: string };
      statistics?: Array<{
        labels?: string[];
        athletes?: Array<{
          starter?: boolean;
          didNotPlay?: boolean;
          stats?: string[];
          athlete?: {
            id?: string;
            displayName?: string;
            shortName?: string;
            jersey?: string;
            position?: { abbreviation?: string };
            headshot?: { href?: string };
          };
        }>;
      }>;
    }>;
  };
}

function n(v: string | undefined): number {
  if (!v) return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export async function fetchGameSummary(eventId: string): Promise<GameSummary | null> {
  const read = await cachedWithMeta(
    `espn-summary:${eventId}`,
    TTL.gameLogs,
    async () => {
      try {
        const res = await fetch(
          `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${eventId}`,
          { cache: "no-store" },
        );
        if (!res.ok) return null;
        return (await res.json()) as RawSummary;
      } catch {
        return null;
      }
    },
  );
  const data = read.value;
  if (!data) return null;

  const compHeader = data.header?.competitions?.[0];
  const status = compHeader?.status?.type?.description ?? "Scheduled";
  const statusDetail = compHeader?.status?.type?.shortDetail ?? "";
  const isFinal = compHeader?.status?.type?.completed === true;
  const isLive = compHeader?.status?.type?.state === "in";
  const headerCompetitors = compHeader?.competitors ?? [];
  const homeHeader = headerCompetitors.find((c) => c.homeAway === "home");
  const awayHeader = headerCompetitors.find((c) => c.homeAway === "away");

  const teamsBoxscore = data.boxscore?.players ?? [];
  const homeBox = teamsBoxscore.find(
    (t) => t.team?.abbreviation === homeHeader?.team?.abbreviation,
  );
  const awayBox = teamsBoxscore.find(
    (t) => t.team?.abbreviation === awayHeader?.team?.abbreviation,
  );

  const labels = homeBox?.statistics?.[0]?.labels ?? awayBox?.statistics?.[0]?.labels ?? [];

  const buildTeam = (
    boxTeam: typeof homeBox,
    headerTeam: typeof homeHeader,
    homeAway: "home" | "away",
  ): BoxScoreTeam => {
    const stats = boxTeam?.statistics?.[0];
    const labelsLocal = stats?.labels ?? [];
    const idx = (label: string) => labelsLocal.indexOf(label);
    const players: BoxScorePlayer[] = (stats?.athletes ?? []).map((a) => {
      const sx = a.stats ?? [];
      return {
        espnId: a.athlete?.id ?? "",
        fullName: a.athlete?.displayName ?? a.athlete?.shortName ?? "—",
        position: a.athlete?.position?.abbreviation,
        jersey: a.athlete?.jersey,
        starter: !!a.starter,
        didNotPlay: !!a.didNotPlay,
        headshot: a.athlete?.headshot?.href,
        stats: sx,
        minutes: n(sx[idx("MIN")]),
        points: n(sx[idx("PTS")]),
        fg: sx[idx("FG")] ?? "",
        threes: sx[idx("3PT")] ?? "",
        ft: sx[idx("FT")] ?? "",
        rebounds: n(sx[idx("REB")]),
        assists: n(sx[idx("AST")]),
        steals: n(sx[idx("STL")]),
        blocks: n(sx[idx("BLK")]),
        turnovers: n(sx[idx("TO")]),
        plusMinus: sx[idx("+/-")],
      };
    });
    return {
      abbreviation: boxTeam?.team?.abbreviation ?? headerTeam?.team?.abbreviation ?? "?",
      displayName: boxTeam?.team?.displayName ?? headerTeam?.team?.displayName ?? "",
      shortDisplayName: boxTeam?.team?.shortDisplayName ?? headerTeam?.team?.shortDisplayName,
      logo: boxTeam?.team?.logo ?? headerTeam?.team?.logo,
      score: headerTeam?.score,
      homeAway,
      isWinner: headerTeam?.winner,
      record: headerTeam?.record?.find((r) => r.type === "total")?.summary ?? headerTeam?.record?.[0]?.summary,
      players,
    };
  };

  return {
    eventId,
    date: compHeader?.date ?? new Date().toISOString(),
    status,
    statusDetail,
    isFinal,
    isLive,
    venue: compHeader?.venue?.fullName,
    broadcast: compHeader?.broadcasts?.map((b) => b.media?.shortName).filter(Boolean).join(", "),
    away: buildTeam(awayBox, awayHeader, "away"),
    home: buildTeam(homeBox, homeHeader, "home"),
    labels,
  };
}
