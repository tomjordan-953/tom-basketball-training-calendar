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
import { TTL, cacheSet, cacheGet } from "@/lib/data/cache";

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
      if (res.status === 401 || res.status === 403) {
        // Free tier ALL-STAR keys can search players but not pull stats /
        // season averages. Mark the provider so the UI can explain.
        this.markRestrictedTier();
        return null;
      }
      if (res.status === 429) {
        this.markRateLimited();
        return null;
      }
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  private markRestrictedTier() {
    if (this.status.label.includes("free tier")) return;
    this.status.label = "Live • balldontlie (free tier)";
    this.status.message =
      "Connected to balldontlie on the free tier — live profiles + simulated stats. Upgrade your API tier for live game logs.";
    this.status.fallbackReason =
      "balldontlie returned Unauthorized for stats — using demo simulation for game logs and season averages.";
  }

  private markRateLimited() {
    this.status.message =
      "balldontlie rate limit reached — serving from cache and demo simulation until it clears.";
    if (!this.status.fallbackReason) {
      this.status.fallbackReason = "Rate limited (HTTP 429).";
    }
  }

  // Resolve a balldontlie player to a demo seed by name match, so we can
  // simulate stats when the free API tier blocks /stats and /season_averages.
  private async resolveDemoFallback(
    playerId: string,
  ): Promise<string | null> {
    const player = await this.getPlayer(playerId);
    if (!player) return null;
    const candidates = await this.fallback.searchPlayers(player.lastName);
    const exact = candidates.find(
      (p) =>
        p.fullName.toLowerCase() === player.fullName.toLowerCase() ||
        (p.lastName.toLowerCase() === player.lastName.toLowerCase() &&
          p.firstName.toLowerCase() === player.firstName.toLowerCase()),
    );
    return exact?.id ?? null;
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
    const players = data.data.map((p) => this.mapPlayer(p));
    // Warm the per-player cache so clicking a search result skips a second
    // API call (keeps us under the free tier's tight rate limit).
    for (const p of players) {
      cacheSet(`player:balldontlie:${p.id}`, p, TTL.player);
    }
    return players;
  }

  async getPlayer(playerId: string): Promise<Player | null> {
    // Prefer the cache primed by searchPlayers — avoids an extra API hit.
    const cached = cacheGet<Player>(`player:balldontlie:${playerId}`);
    if (cached?.value) return cached.value;
    const numericId = playerId.replace(/^bdl-/, "");
    const data = await this.fetchJson<{ data: ApiPlayer }>(
      `/players/${numericId}`,
    );
    if (data?.data) {
      const player = this.mapPlayer(data.data);
      cacheSet(`player:balldontlie:${playerId}`, player, TTL.player);
      return player;
    }
    return null;
  }

  async getPlayerGameLogs(playerId: string, limit = 24): Promise<GameLog[]> {
    const numericId = playerId.replace(/^bdl-/, "");
    const perPage = Math.min(Math.max(limit, 24), 100);
    const data = await this.fetchJson<{ data: ApiStat[] }>(
      `/stats?player_ids[]=${numericId}&per_page=${perPage}&seasons[]=${currentSeason()}`,
    );
    if (data?.data && data.data.length > 0) {
      const logs = data.data.map((s) => this.mapStat(s, playerId));
      return logs.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
    }
    // Fallback: free tier or off-season — simulate logs from a name-matched
    // demo seed so the projection engine still has something to chew on.
    const seedId = await this.resolveDemoFallback(playerId);
    if (!seedId) return [];
    const fallbackLogs = await this.fallback.getPlayerGameLogs(seedId, limit);
    return fallbackLogs.map((g) => ({ ...g, playerId }));
  }

  async getSeasonAverages(playerId: string): Promise<SeasonAverages | null> {
    const numericId = playerId.replace(/^bdl-/, "");
    const data = await this.fetchJson<{ data: ApiSeasonAverages[] }>(
      `/season_averages?season=${currentSeason()}&player_id=${numericId}`,
    );
    const row = data?.data?.[0];
    if (row) {
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
    // Free-tier / empty fallback: use the demo seed of a same-named player.
    const seedId = await this.resolveDemoFallback(playerId);
    return seedId ? this.fallback.getSeasonAverages(seedId) : null;
  }

  async getCareerSeasons(playerId: string): Promise<CareerSeason[]> {
    // balldontlie free tier does not expose multi-season aggregates.
    // Use the demo simulator so the career chart still renders something.
    const seedId = await this.resolveDemoFallback(playerId);
    return seedId ? this.fallback.getCareerSeasons(seedId) : [];
  }

  async getNextGame(playerId: string): Promise<NextGameContext | null> {
    const seedId = await this.resolveDemoFallback(playerId);
    return seedId ? this.fallback.getNextGame(seedId) : null;
  }

  async getOpponentContext(opponent: string): Promise<OpponentContext | null> {
    return this.fallback.getOpponentContext(opponent);
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
