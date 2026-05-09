// ESPN public-but-undocumented NBA endpoints.
// No API key, no auth. Server-side only — keeps user IPs off ESPN.
// Endpoints used:
//   site.web.api.espn.com  → search, gamelog, overview (season avgs + next game)
//   sports.core.api.espn.com → athlete bio (height, weight, position, team)
//
// ESPN can change/rename these any time. We treat all responses as best-effort
// and gracefully fall back to demo simulation when fields are missing.

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
import { TTL, cacheGet, cacheSet } from "@/lib/data/cache";

const SITE = "https://site.web.api.espn.com";
const CORE = "https://sports.core.api.espn.com";

const UA =
  "Mozilla/5.0 (compatible; CourtSightAI/2.0; +https://courtsight.local)";

interface SearchItem {
  id: string;
  displayName?: string;
  shortName?: string;
  type?: string;
  sport?: string;
  league?: string;
  defaultLeague?: { abbreviation?: string };
  description?: string;
  image?: { default?: string };
  links?: Array<{ rel?: string[]; href?: string }>;
}

interface CoreAthlete {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  displayName?: string;
  displayHeight?: string;
  displayWeight?: string;
  jersey?: string;
  position?: { abbreviation?: string };
  team?: { $ref?: string };
  birthPlace?: { country?: string };
  debutYear?: number;
  draft?: { year?: number };
  experience?: { years?: number };
  headshot?: { href?: string };
  active?: boolean;
}

interface OverviewSplit {
  displayName: string;
  stats: string[];
}

interface OverviewStatistics {
  names: string[];
  splits: OverviewSplit[];
}

interface NextGameEvent {
  id: string;
  date: string;
  shortName?: string;
  competitions?: Array<{
    competitors?: Array<{
      id: string;
      homeAway: "home" | "away";
      team?: { id: string; abbreviation?: string };
    }>;
  }>;
}

interface OverviewResponse {
  statistics?: OverviewStatistics;
  nextGame?: { league?: { events?: NextGameEvent[] } };
  news?: Array<{ id?: number; headline?: string; published?: string; description?: string; type?: string }>;
}

interface GamelogEvent {
  id: string;
  gameDate: string;
  atVs?: "@" | "vs" | string;
  homeTeamId?: string;
  awayTeamId?: string;
  gameResult?: "W" | "L";
  opponent?: { id?: string; abbreviation?: string; displayName?: string };
  team?: { id?: string; abbreviation?: string };
}

interface GamelogResponse {
  labels?: string[];
  names?: string[];
  events?: Record<string, GamelogEvent>;
  seasonTypes?: Array<{
    categories?: Array<{
      events?: Array<{ eventId: string; stats: string[] }>;
    }>;
  }>;
}

function parseMakesAttempts(value: string | undefined): { made?: number; attempted?: number } {
  if (!value || !value.includes("-")) return {};
  const [m, a] = value.split("-").map((x) => Number(x.trim()));
  return { made: Number.isFinite(m) ? m : undefined, attempted: Number.isFinite(a) ? a : undefined };
}

function n(v: string | undefined): number {
  if (!v) return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

class EspnProvider implements SportsDataProvider {
  readonly name = "espn" as const;
  readonly status: ProviderStatus;
  private readonly fallback = createDemoProvider();

  constructor(mode: "auto" | "espn" = "auto") {
    this.status = {
      name: "espn",
      label: "Live • ESPN",
      isLive: true,
      message:
        "Connected to ESPN public NBA endpoints — live profiles, season averages, and game logs.",
      hasNewsSource: true,
      hasInjurySource: false,
      mode,
      apiKeyConfigured: false,
    };
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  async searchPlayers(query: string): Promise<Player[]> {
    const q = query.trim();
    if (!q) return [];
    const url = `${SITE}/apis/common/v3/search?query=${encodeURIComponent(q)}&limit=15&type=player&sport=basketball`;
    const data = await this.fetchJson<{ items?: SearchItem[] }>(url);
    const items = (data?.items ?? []).filter((i) => i.type === "player");
    const players: Player[] = [];
    for (const i of items.slice(0, 15)) {
      const name = i.displayName ?? i.shortName ?? "";
      if (!name) continue;
      const [first, ...rest] = name.split(" ");
      const last = rest.join(" ");
      const player: Player = {
        id: `espn-${i.id}`,
        firstName: first,
        lastName: last,
        fullName: name,
        team: i.description,
        teamAbbreviation: i.defaultLeague?.abbreviation,
        imageUrl: i.image?.default,
      };
      players.push(player);
      cacheSet(`player:espn:${player.id}`, player, TTL.player);
    }
    return players;
  }

  async getPlayer(playerId: string): Promise<Player | null> {
    const cached = cacheGet<Player>(`player:espn:${playerId}`);
    if (cached?.value) {
      // If we only have minimal info from search, enrich with bio.
      if (!cached.value.height) {
        const enriched = await this.enrichBio(playerId, cached.value);
        if (enriched) {
          cacheSet(`player:espn:${playerId}`, enriched, TTL.player);
          return enriched;
        }
      }
      return cached.value;
    }
    const numericId = playerId.replace(/^espn-/, "");
    const bio = await this.fetchJson<CoreAthlete>(
      `${CORE}/v2/sports/basketball/leagues/nba/athletes/${numericId}`,
    );
    if (!bio) return null;
    const fullName = bio.fullName ?? bio.displayName ?? "";
    const [first, ...rest] = fullName.split(" ");
    const player: Player = {
      id: playerId,
      firstName: bio.firstName ?? first,
      lastName: bio.lastName ?? rest.join(" "),
      fullName,
      position: bio.position?.abbreviation,
      height: bio.displayHeight,
      weight: bio.displayWeight?.replace(" lbs", ""),
      jersey: bio.jersey,
      country: bio.birthPlace?.country,
      draftYear: bio.draft?.year,
      experienceYears: bio.experience?.years,
      imageUrl: bio.headshot?.href,
    };
    cacheSet(`player:espn:${playerId}`, player, TTL.player);
    return player;
  }

  private async enrichBio(playerId: string, base: Player): Promise<Player | null> {
    const numericId = playerId.replace(/^espn-/, "");
    const bio = await this.fetchJson<CoreAthlete>(
      `${CORE}/v2/sports/basketball/leagues/nba/athletes/${numericId}`,
    );
    if (!bio) return null;
    return {
      ...base,
      position: base.position ?? bio.position?.abbreviation,
      height: base.height ?? bio.displayHeight,
      weight: base.weight ?? bio.displayWeight?.replace(" lbs", ""),
      jersey: base.jersey ?? bio.jersey,
      country: base.country ?? bio.birthPlace?.country,
      draftYear: base.draftYear ?? bio.draft?.year,
      experienceYears: base.experienceYears ?? bio.experience?.years,
      imageUrl: base.imageUrl ?? bio.headshot?.href,
    };
  }

  async getPlayerGameLogs(playerId: string, limit = 24): Promise<GameLog[]> {
    const numericId = playerId.replace(/^espn-/, "");
    const data = await this.fetchJson<GamelogResponse>(
      `${SITE}/apis/common/v3/sports/basketball/nba/athletes/${numericId}/gamelog`,
    );
    if (!data?.labels || !data.events) return [];
    const idx = (label: string) => data.labels!.indexOf(label);
    const iMin = idx("MIN"),
      iFg = idx("FG"),
      iTpt = idx("3PT"),
      iFt = idx("FT"),
      iReb = idx("REB"),
      iAst = idx("AST"),
      iBlk = idx("BLK"),
      iStl = idx("STL"),
      iTo = idx("TO"),
      iPts = idx("PTS");

    const flat: Array<{ eventId: string; stats: string[] }> = [];
    for (const st of data.seasonTypes ?? []) {
      for (const cat of st.categories ?? []) {
        for (const ev of cat.events ?? []) flat.push(ev);
      }
    }
    const logs: GameLog[] = [];
    for (const ev of flat) {
      const meta = data.events[ev.eventId];
      if (!meta) continue;
      const fg = parseMakesAttempts(ev.stats[iFg]);
      const tpt = parseMakesAttempts(ev.stats[iTpt]);
      const ft = parseMakesAttempts(ev.stats[iFt]);
      logs.push({
        id: `${playerId}-${ev.eventId}`,
        playerId,
        date: meta.gameDate?.slice(0, 10) ?? "",
        opponent: meta.opponent?.abbreviation,
        homeAway: meta.atVs === "@" ? "away" : "home",
        minutes: n(ev.stats[iMin]),
        points: n(ev.stats[iPts]),
        rebounds: n(ev.stats[iReb]),
        assists: n(ev.stats[iAst]),
        steals: n(ev.stats[iStl]),
        blocks: n(ev.stats[iBlk]),
        turnovers: n(ev.stats[iTo]),
        fieldGoalAttempts: fg.attempted,
        fieldGoalMakes: fg.made,
        threePointAttempts: tpt.attempted,
        threePointMakes: tpt.made,
        freeThrowAttempts: ft.attempted,
        freeThrowMakes: ft.made,
        result: meta.gameResult,
      });
    }
    logs.sort((a, b) => (a.date < b.date ? 1 : -1));
    return logs.slice(0, limit);
  }

  async getSeasonAverages(playerId: string): Promise<SeasonAverages | null> {
    const overview = await this.getOverview(playerId);
    if (!overview?.statistics) return null;
    const split = overview.statistics.splits.find((s) => s.displayName === "Regular Season");
    if (!split) return null;
    const names = overview.statistics.names;
    const get = (name: string) => n(split.stats[names.indexOf(name)]);
    const season = new Date().getFullYear();
    return {
      season,
      gamesPlayed: get("gamesPlayed"),
      minutes: get("avgMinutes"),
      points: get("avgPoints"),
      rebounds: get("avgRebounds"),
      assists: get("avgAssists"),
      steals: get("avgSteals"),
      blocks: get("avgBlocks"),
      turnovers: get("avgTurnovers"),
      fieldGoalPct: get("fieldGoalPct") / 100,
      threePointPct: get("threePointPct") / 100,
      freeThrowPct: get("freeThrowPct") / 100,
    };
  }

  async getCareerSeasons(_playerId: string): Promise<CareerSeason[]> {
    // ESPN exposes a single Career split row in overview, not per-season aggregates
    // through these public endpoints. Skip to keep the chart honest.
    return [];
  }

  async getNextGame(playerId: string): Promise<NextGameContext | null> {
    const overview = await this.getOverview(playerId);
    const event = overview?.nextGame?.league?.events?.[0];
    if (!event) return null;
    const competitor = event.competitions?.[0]?.competitors ?? [];
    const me = competitor.find((c) => c.team?.abbreviation && c.team?.id);
    const opp = competitor.find((c) => c !== me);
    if (!opp) return null;
    return {
      date: event.date.slice(0, 10),
      opponent: opp.team?.abbreviation ?? "?",
      homeAway: me?.homeAway ?? "home",
      daysOfRest: 1,
      isBackToBack: false,
    };
  }

  async getOpponentContext(opponent: string): Promise<OpponentContext | null> {
    // ESPN doesn't expose per-position defensive ratings cheaply. Use the
    // bundled demo opponent table — neutral for unknowns.
    return this.fallback.getOpponentContext(opponent);
  }

  async getInjuryContext(_playerId: string): Promise<InjuryNote | null> {
    return {
      status: "Unknown",
      note: "No verified injury/news source connected.",
      source: "—",
    };
  }

  async getNewsItems(playerId: string): Promise<PlayerNewsItem[]> {
    const overview = await this.getOverview(playerId);
    const items = overview?.news ?? [];
    return items.slice(0, 5).map((n, i) => ({
      id: `${playerId}-news-${n.id ?? i}`,
      headline: n.headline ?? "ESPN news",
      body: n.description,
      date: (n.published ?? new Date().toISOString()).slice(0, 10),
      category: "general" as const,
      source: "ESPN",
    }));
  }

  private async getOverview(playerId: string): Promise<OverviewResponse | null> {
    const cacheKey = `espn-overview:${playerId}`;
    const hit = cacheGet<OverviewResponse>(cacheKey);
    if (hit?.value) return hit.value;
    const numericId = playerId.replace(/^espn-/, "");
    const data = await this.fetchJson<OverviewResponse>(
      `${SITE}/apis/common/v3/sports/basketball/nba/athletes/${numericId}/overview`,
    );
    if (data) cacheSet(cacheKey, data, TTL.gameLogs);
    return data;
  }
}

export function createEspnProvider(mode: "auto" | "espn" = "auto"): SportsDataProvider {
  return new EspnProvider(mode);
}
