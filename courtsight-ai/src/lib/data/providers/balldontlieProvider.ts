import type { InjuryNote, Player, PlayerNewsItem } from "@/types/player";
import type {
  CareerSeason,
  GameLog,
  NextGameContext,
  OpponentContext,
  SeasonAverages,
} from "@/types/stats";
import type { ProviderStatus, SportsDataProvider } from "./providerTypes";
import { createDemoProvider } from "./demoProvider";

const BASE = "https://api.balldontlie.io/v1";

interface ApiPlayer {
  id: number;
  first_name: string;
  last_name: string;
  position?: string;
  height?: string;
  weight?: string;
  jersey_number?: string;
  country?: string;
  draft_year?: number;
  team?: { id: number; full_name: string; abbreviation: string };
}

interface ApiStat {
  id: number;
  date?: string;
  min?: string | number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnover: number;
  fga?: number;
  fgm?: number;
  fg3a?: number;
  fg3m?: number;
  fta?: number;
  ftm?: number;
  game?: {
    id: number;
    date: string;
    home_team_id: number;
    visitor_team_id: number;
  };
  team?: { id: number; abbreviation: string };
  player?: { id: number };
}

interface ApiSeasonAverages {
  games_played: number;
  season: number;
  min: string | number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnover: number;
  fg_pct?: number;
  fg3_pct?: number;
  ft_pct?: number;
}

function parseMinutes(value: string | number | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  if (value.includes(":")) {
    const [m, s] = value.split(":").map(Number);
    return m + (s || 0) / 60;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

class BalldontlieProvider implements SportsDataProvider {
  readonly name = "balldontlie" as const;
  readonly status: ProviderStatus;
  private readonly apiKey: string;
  private readonly fallback = createDemoProvider();

  constructor(apiKey: string, mode: "auto" | "balldontlie" = "auto") {
    this.apiKey = apiKey;
    this.status = {
      name: "balldontlie",
      label: "Live • balldontlie",
      isLive: true,
      message: "Connected to balldontlie. Demo data shown if a request fails.",
      hasNewsSource: false,
      hasInjurySource: false,
      mode,
      apiKeyConfigured: true,
    };
  }

  private async fetchJson<T>(path: string): Promise<T | null> {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { Authorization: this.apiKey },
        cache: "no-store",
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  private mapPlayer(p: ApiPlayer): Player {
    return {
      id: `bdl-${p.id}`,
      firstName: p.first_name,
      lastName: p.last_name,
      fullName: `${p.first_name} ${p.last_name}`,
      team: p.team?.full_name,
      teamAbbreviation: p.team?.abbreviation,
      position: p.position,
      height: p.height,
      weight: p.weight,
      jersey: p.jersey_number,
      country: p.country,
      draftYear: p.draft_year,
    };
  }

  private mapStat(s: ApiStat, playerId: string): GameLog {
    const date = s.date ?? s.game?.date ?? "";
    return {
      id: `${playerId}-${s.id}`,
      playerId,
      date: date ? date.slice(0, 10) : "",
      minutes: parseMinutes(s.min),
      points: s.pts ?? 0,
      rebounds: s.reb ?? 0,
      assists: s.ast ?? 0,
      steals: s.stl ?? 0,
      blocks: s.blk ?? 0,
      turnovers: s.turnover ?? 0,
      fieldGoalAttempts: s.fga,
      fieldGoalMakes: s.fgm,
      threePointAttempts: s.fg3a,
      threePointMakes: s.fg3m,
      freeThrowAttempts: s.fta,
      freeThrowMakes: s.ftm,
    };
  }

  async searchPlayers(query: string): Promise<Player[]> {
    const q = query.trim();
    if (!q) return [];
    const data = await this.fetchJson<{ data: ApiPlayer[] }>(
      `/players?search=${encodeURIComponent(q)}&per_page=25`,
    );
    if (!data?.data) return this.fallback.searchPlayers(q);
    return data.data.map((p) => this.mapPlayer(p));
  }

  async getPlayer(playerId: string): Promise<Player | null> {
    const numericId = playerId.replace(/^bdl-/, "");
    const data = await this.fetchJson<{ data: ApiPlayer }>(
      `/players/${numericId}`,
    );
    if (!data?.data) return null;
    return this.mapPlayer(data.data);
  }

  async getPlayerGameLogs(playerId: string, limit = 24): Promise<GameLog[]> {
    const numericId = playerId.replace(/^bdl-/, "");
    const perPage = Math.min(Math.max(limit, 24), 100);
    const data = await this.fetchJson<{ data: ApiStat[] }>(
      `/stats?player_ids[]=${numericId}&per_page=${perPage}&seasons[]=${currentSeason()}`,
    );
    if (!data?.data || data.data.length === 0) return [];
    const logs = data.data.map((s) => this.mapStat(s, playerId));
    return logs.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
  }

  async getSeasonAverages(playerId: string): Promise<SeasonAverages | null> {
    const numericId = playerId.replace(/^bdl-/, "");
    const data = await this.fetchJson<{ data: ApiSeasonAverages[] }>(
      `/season_averages?season=${currentSeason()}&player_id=${numericId}`,
    );
    const row = data?.data?.[0];
    if (!row) return null;
    return {
      season: row.season,
      gamesPlayed: row.games_played,
      minutes: parseMinutes(row.min),
      points: row.pts,
      rebounds: row.reb,
      assists: row.ast,
      steals: row.stl,
      blocks: row.blk,
      turnovers: row.turnover,
      fieldGoalPct: row.fg_pct,
      threePointPct: row.fg3_pct,
      freeThrowPct: row.ft_pct,
    };
  }

  async getCareerSeasons(_playerId: string): Promise<CareerSeason[]> {
    // balldontlie free tier does not expose multi-season aggregates cheaply.
    // Return empty so the UI falls back to a single-season summary.
    return [];
  }

  async getNextGame(_playerId: string): Promise<NextGameContext | null> {
    return null;
  }

  async getOpponentContext(_opponent: string): Promise<OpponentContext | null> {
    return null;
  }

  async getInjuryContext(_playerId: string): Promise<InjuryNote | null> {
    return {
      status: "Unknown",
      note: "No verified injury/news source connected.",
      source: "—",
    };
  }

  async getNewsItems(_playerId: string): Promise<PlayerNewsItem[]> {
    return [];
  }
}

function currentSeason(): number {
  const d = new Date();
  // NBA season starts in October.
  return d.getMonth() >= 9 ? d.getFullYear() : d.getFullYear() - 1;
}

export function createBalldontlieProvider(
  apiKey: string,
  mode: "auto" | "balldontlie" = "auto",
): SportsDataProvider {
  return new BalldontlieProvider(apiKey, mode);
}
