import type { InjuryNote, Player, PlayerNewsItem } from "@/types/player";
import type {
  CareerSeason,
  GameLog,
  NextGameContext,
  OpponentContext,
  SeasonAverages,
} from "@/types/stats";
import type { ProviderStatus, SportsDataProvider } from "./providerTypes";

// All players, stats, and news in this provider are fictional and clearly
// labeled as Demo data in the UI. They are designed to look realistic so the
// full app can be exercised without an API key.

interface DemoPlayerSeed {
  id: string;
  firstName: string;
  lastName: string;
  team: string;
  teamAbbreviation: string;
  position: string;
  height: string;
  weight: string;
  jersey: string;
  experienceYears: number;
  draftYear: number;
  country: string;
  archetype: "scorer" | "playmaker" | "wing" | "big" | "two-way";
  baseline: {
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    minutes: number;
  };
  trend: "up" | "down" | "flat";
  volatility: "low" | "medium" | "high";
}

const SEEDS: DemoPlayerSeed[] = [
  {
    id: "demo-1",
    firstName: "Shai",
    lastName: "Gilgeous-Alexander",
    team: "Oklahoma City Thunder",
    teamAbbreviation: "OKC",
    position: "G",
    height: "6-6",
    weight: "195",
    jersey: "2",
    experienceYears: 7,
    draftYear: 2018,
    country: "Canada",
    archetype: "scorer",
    baseline: { points: 31, rebounds: 5.4, assists: 6.2, steals: 1.9, blocks: 0.9, turnovers: 2.3, minutes: 34.1 },
    trend: "up",
    volatility: "low",
  },
  {
    id: "demo-2",
    firstName: "Nikola",
    lastName: "Jokic",
    team: "Denver Nuggets",
    teamAbbreviation: "DEN",
    position: "C",
    height: "6-11",
    weight: "284",
    jersey: "15",
    experienceYears: 10,
    draftYear: 2014,
    country: "Serbia",
    archetype: "big",
    baseline: { points: 27.4, rebounds: 12.6, assists: 9.8, steals: 1.4, blocks: 0.7, turnovers: 3.1, minutes: 34.6 },
    trend: "flat",
    volatility: "low",
  },
  {
    id: "demo-3",
    firstName: "Luka",
    lastName: "Doncic",
    team: "Los Angeles Lakers",
    teamAbbreviation: "LAL",
    position: "G",
    height: "6-7",
    weight: "230",
    jersey: "77",
    experienceYears: 7,
    draftYear: 2018,
    country: "Slovenia",
    archetype: "playmaker",
    baseline: { points: 30.1, rebounds: 8.5, assists: 8.4, steals: 1.2, blocks: 0.5, turnovers: 4.0, minutes: 36.2 },
    trend: "up",
    volatility: "medium",
  },
  {
    id: "demo-4",
    firstName: "Jayson",
    lastName: "Tatum",
    team: "Boston Celtics",
    teamAbbreviation: "BOS",
    position: "F",
    height: "6-8",
    weight: "210",
    jersey: "0",
    experienceYears: 8,
    draftYear: 2017,
    country: "USA",
    archetype: "wing",
    baseline: { points: 27.8, rebounds: 8.0, assists: 4.7, steals: 1.0, blocks: 0.8, turnovers: 2.4, minutes: 35.1 },
    trend: "flat",
    volatility: "low",
  },
  {
    id: "demo-5",
    firstName: "Giannis",
    lastName: "Antetokounmpo",
    team: "Milwaukee Bucks",
    teamAbbreviation: "MIL",
    position: "F",
    height: "6-11",
    weight: "243",
    jersey: "34",
    experienceYears: 12,
    draftYear: 2013,
    country: "Greece",
    archetype: "two-way",
    baseline: { points: 31.2, rebounds: 11.5, assists: 6.0, steals: 0.9, blocks: 1.2, turnovers: 3.1, minutes: 34.8 },
    trend: "up",
    volatility: "medium",
  },
  {
    id: "demo-6",
    firstName: "Anthony",
    lastName: "Edwards",
    team: "Minnesota Timberwolves",
    teamAbbreviation: "MIN",
    position: "G",
    height: "6-4",
    weight: "225",
    jersey: "5",
    experienceYears: 5,
    draftYear: 2020,
    country: "USA",
    archetype: "scorer",
    baseline: { points: 26.4, rebounds: 5.4, assists: 5.0, steals: 1.4, blocks: 0.6, turnovers: 3.0, minutes: 35.5 },
    trend: "up",
    volatility: "high",
  },
  {
    id: "demo-7",
    firstName: "Devin",
    lastName: "Booker",
    team: "Phoenix Suns",
    teamAbbreviation: "PHX",
    position: "G",
    height: "6-5",
    weight: "206",
    jersey: "1",
    experienceYears: 10,
    draftYear: 2015,
    country: "USA",
    archetype: "scorer",
    baseline: { points: 26.0, rebounds: 4.5, assists: 7.5, steals: 0.9, blocks: 0.4, turnovers: 2.7, minutes: 35.2 },
    trend: "flat",
    volatility: "medium",
  },
  {
    id: "demo-8",
    firstName: "Tyrese",
    lastName: "Haliburton",
    team: "Indiana Pacers",
    teamAbbreviation: "IND",
    position: "G",
    height: "6-5",
    weight: "185",
    jersey: "0",
    experienceYears: 5,
    draftYear: 2020,
    country: "USA",
    archetype: "playmaker",
    baseline: { points: 19.4, rebounds: 3.9, assists: 11.2, steals: 1.3, blocks: 0.5, turnovers: 2.4, minutes: 33.5 },
    trend: "down",
    volatility: "medium",
  },
  {
    id: "demo-9",
    firstName: "Anthony",
    lastName: "Davis",
    team: "Dallas Mavericks",
    teamAbbreviation: "DAL",
    position: "F-C",
    height: "6-10",
    weight: "253",
    jersey: "3",
    experienceYears: 13,
    draftYear: 2012,
    country: "USA",
    archetype: "big",
    baseline: { points: 24.3, rebounds: 11.8, assists: 3.6, steals: 1.4, blocks: 2.4, turnovers: 2.1, minutes: 34.1 },
    trend: "flat",
    volatility: "medium",
  },
  {
    id: "demo-10",
    firstName: "Victor",
    lastName: "Wembanyama",
    team: "San Antonio Spurs",
    teamAbbreviation: "SAS",
    position: "C",
    height: "7-4",
    weight: "210",
    jersey: "1",
    experienceYears: 2,
    draftYear: 2023,
    country: "France",
    archetype: "two-way",
    baseline: { points: 24.1, rebounds: 11.0, assists: 4.0, steals: 1.2, blocks: 3.6, turnovers: 3.2, minutes: 32.5 },
    trend: "up",
    volatility: "medium",
  },
];

const DEMO_OPPONENTS: Record<string, OpponentContext> = {
  LAL: { opponent: "LAL", defensiveRating: 114.2, pointsAllowedToPosition: 28.4, pace: 100.1, difficulty: "Average" },
  BOS: { opponent: "BOS", defensiveRating: 110.1, pointsAllowedToPosition: 24.1, pace: 98.4, difficulty: "Tough" },
  OKC: { opponent: "OKC", defensiveRating: 108.7, pointsAllowedToPosition: 23.0, pace: 99.0, difficulty: "Tough" },
  DEN: { opponent: "DEN", defensiveRating: 113.0, pointsAllowedToPosition: 25.6, pace: 97.5, difficulty: "Average" },
  MIN: { opponent: "MIN", defensiveRating: 109.5, pointsAllowedToPosition: 23.8, pace: 96.9, difficulty: "Tough" },
  PHX: { opponent: "PHX", defensiveRating: 116.0, pointsAllowedToPosition: 28.9, pace: 99.5, difficulty: "Easy" },
  MIL: { opponent: "MIL", defensiveRating: 114.5, pointsAllowedToPosition: 27.0, pace: 99.8, difficulty: "Average" },
  IND: { opponent: "IND", defensiveRating: 117.2, pointsAllowedToPosition: 29.6, pace: 103.6, difficulty: "Easy" },
  DAL: { opponent: "DAL", defensiveRating: 115.0, pointsAllowedToPosition: 27.7, pace: 98.1, difficulty: "Average" },
  SAS: { opponent: "SAS", defensiveRating: 116.4, pointsAllowedToPosition: 28.6, pace: 100.3, difficulty: "Easy" },
};

const TEAM_ABBRS = Object.keys(DEMO_OPPONENTS);

// Deterministic pseudo-random generator (mulberry32) for stable demo data.
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function jitter(rng: () => number, mean: number, spread: number, min = 0): number {
  const v = mean + (rng() - 0.5) * 2 * spread;
  return Math.max(min, v);
}

function buildPlayer(seed: DemoPlayerSeed): Player {
  return {
    id: seed.id,
    firstName: seed.firstName,
    lastName: seed.lastName,
    fullName: `${seed.firstName} ${seed.lastName}`,
    team: seed.team,
    teamAbbreviation: seed.teamAbbreviation,
    position: seed.position,
    height: seed.height,
    weight: seed.weight,
    jersey: seed.jersey,
    experienceYears: seed.experienceYears,
    draftYear: seed.draftYear,
    country: seed.country,
  };
}

function buildGameLogs(seed: DemoPlayerSeed, count = 12): GameLog[] {
  const rng = makeRng(hashId(seed.id));
  const logs: GameLog[] = [];
  const today = new Date();
  const trendShift = seed.trend === "up" ? 1.5 : seed.trend === "down" ? -1.5 : 0;
  const volatility =
    seed.volatility === "high" ? 1.7 : seed.volatility === "medium" ? 1.0 : 0.6;
  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (i + 1) * 2 - Math.floor(rng() * 2));
    const opponent = TEAM_ABBRS[Math.floor(rng() * TEAM_ABBRS.length)];
    const homeAway: "home" | "away" = rng() > 0.5 ? "home" : "away";
    const recencyBonus = ((count - i) / count) * trendShift;
    const minutes = Math.min(40, jitter(rng, seed.baseline.minutes, 2.5 * volatility, 18));
    const pointsAvg = seed.baseline.points + recencyBonus;
    const points = Math.round(jitter(rng, pointsAvg, 6 * volatility, 4));
    const rebounds = Math.round(jitter(rng, seed.baseline.rebounds, 2.5 * volatility, 0));
    const assists = Math.round(jitter(rng, seed.baseline.assists, 2.2 * volatility, 0));
    const steals = Math.round(jitter(rng, seed.baseline.steals, 1.0, 0));
    const blocks = Math.round(jitter(rng, seed.baseline.blocks, 0.8, 0));
    const turnovers = Math.round(jitter(rng, seed.baseline.turnovers, 1.2, 0));
    const fga = Math.round(jitter(rng, points * 0.85, 3, 4));
    const fgm = Math.round(fga * (0.42 + rng() * 0.12));
    const tpa = Math.round(jitter(rng, fga * 0.4, 1.5, 0));
    const tpm = Math.round(tpa * (0.3 + rng() * 0.15));
    const fta = Math.round(jitter(rng, points * 0.25, 1.5, 0));
    const ftm = Math.round(fta * (0.78 + rng() * 0.12));
    logs.push({
      id: `${seed.id}-${i}`,
      playerId: seed.id,
      date: date.toISOString().slice(0, 10),
      opponent,
      homeAway,
      minutes: Number(minutes.toFixed(1)),
      points,
      rebounds,
      assists,
      steals,
      blocks,
      turnovers,
      fieldGoalAttempts: fga,
      fieldGoalMakes: fgm,
      threePointAttempts: tpa,
      threePointMakes: tpm,
      freeThrowAttempts: fta,
      freeThrowMakes: ftm,
      result: rng() > 0.45 ? "W" : "L",
    });
  }
  return logs;
}

function buildSeasonAverages(seed: DemoPlayerSeed): SeasonAverages {
  const b = seed.baseline;
  return {
    season: 2024,
    gamesPlayed: 58,
    minutes: b.minutes,
    points: b.points,
    rebounds: b.rebounds,
    assists: b.assists,
    steals: b.steals,
    blocks: b.blocks,
    turnovers: b.turnovers,
    fieldGoalPct: 0.49,
    threePointPct: 0.37,
    freeThrowPct: 0.84,
    trueShootingPct: 0.6,
  };
}

function buildCareer(seed: DemoPlayerSeed): CareerSeason[] {
  const seasons: CareerSeason[] = [];
  const rng = makeRng(hashId(seed.id) + 7);
  const startSeason = 2024 - Math.min(seed.experienceYears - 1, 9);
  for (let s = startSeason; s <= 2024; s++) {
    const t = (s - startSeason) / Math.max(1, 2024 - startSeason);
    const growth = 0.55 + 0.55 * t;
    seasons.push({
      season: s,
      team: seed.teamAbbreviation,
      gamesPlayed: 60 + Math.floor(rng() * 20),
      minutes: Math.max(18, seed.baseline.minutes * (0.7 + 0.35 * t)),
      points: seed.baseline.points * growth,
      rebounds: seed.baseline.rebounds * (0.7 + 0.35 * t),
      assists: seed.baseline.assists * (0.7 + 0.35 * t),
      steals: seed.baseline.steals,
      blocks: seed.baseline.blocks,
    });
  }
  return seasons;
}

function buildNextGame(seed: DemoPlayerSeed): NextGameContext {
  const rng = makeRng(hashId(seed.id) + 13);
  const opponent =
    TEAM_ABBRS.filter((t) => t !== seed.teamAbbreviation)[
      Math.floor(rng() * (TEAM_ABBRS.length - 1))
    ];
  const homeAway: "home" | "away" = rng() > 0.5 ? "home" : "away";
  const daysOfRest = Math.floor(rng() * 4);
  const date = new Date();
  date.setDate(date.getDate() + 1 + Math.floor(rng() * 2));
  return {
    date: date.toISOString().slice(0, 10),
    opponent,
    homeAway,
    daysOfRest,
    isBackToBack: daysOfRest === 0,
  };
}

function buildInjury(seed: DemoPlayerSeed): InjuryNote | null {
  // For demo only: a couple of seeded players show non-critical statuses.
  if (seed.id === "demo-9") {
    return {
      status: "Day-to-Day",
      note: "Demo: minor lower-body soreness, listed as probable.",
      source: "Demo data",
      reportedAt: new Date().toISOString(),
    };
  }
  if (seed.id === "demo-7") {
    return {
      status: "Questionable",
      note: "Demo: questionable with ankle, decision before tip-off.",
      source: "Demo data",
      reportedAt: new Date().toISOString(),
    };
  }
  return {
    status: "Active",
    note: "Demo: no injury concerns reported.",
    source: "Demo data",
    reportedAt: new Date().toISOString(),
  };
}

function buildNews(seed: DemoPlayerSeed): PlayerNewsItem[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: `${seed.id}-news-1`,
      headline: `Demo: ${seed.firstName} ${seed.lastName} rotation update`,
      body: "This is sample news shown only in Demo Mode. Connect a verified provider to see real updates.",
      date: today,
      category: "role",
      source: "Demo data",
    },
  ];
}

class DemoProviderImpl implements SportsDataProvider {
  readonly name = "demo" as const;
  readonly status: ProviderStatus;

  constructor(opts: { reason?: string; mode?: "auto" | "demo" | "balldontlie"; apiKeyConfigured?: boolean } = {}) {
    this.status = {
      name: "demo",
      label: "Demo Mode",
      isLive: false,
      message:
        opts.reason ??
        "Running on bundled sample data. Set BALLDONTLIE_API_KEY in .env.local for live data.",
      hasNewsSource: false,
      hasInjurySource: false,
      mode: opts.mode ?? "demo",
      apiKeyConfigured: opts.apiKeyConfigured ?? false,
      fallbackReason: opts.reason,
    };
  }

  async searchPlayers(query: string): Promise<Player[]> {
    const q = query.trim().toLowerCase();
    if (!q) return SEEDS.map(buildPlayer);
    return SEEDS.filter((s) =>
      `${s.firstName} ${s.lastName} ${s.teamAbbreviation}`
        .toLowerCase()
        .includes(q),
    ).map(buildPlayer);
  }

  async getPlayer(playerId: string): Promise<Player | null> {
    const seed = SEEDS.find((s) => s.id === playerId);
    return seed ? buildPlayer(seed) : null;
  }

  async getPlayerGameLogs(playerId: string, limit = 24): Promise<GameLog[]> {
    const seed = SEEDS.find((s) => s.id === playerId);
    if (!seed) return [];
    return buildGameLogs(seed, Math.max(limit, 24));
  }

  async getSeasonAverages(playerId: string): Promise<SeasonAverages | null> {
    const seed = SEEDS.find((s) => s.id === playerId);
    return seed ? buildSeasonAverages(seed) : null;
  }

  async getCareerSeasons(playerId: string): Promise<CareerSeason[]> {
    const seed = SEEDS.find((s) => s.id === playerId);
    return seed ? buildCareer(seed) : [];
  }

  async getNextGame(playerId: string): Promise<NextGameContext | null> {
    const seed = SEEDS.find((s) => s.id === playerId);
    return seed ? buildNextGame(seed) : null;
  }

  async getOpponentContext(opponent: string): Promise<OpponentContext | null> {
    return DEMO_OPPONENTS[opponent.toUpperCase()] ?? null;
  }

  async getInjuryContext(playerId: string): Promise<InjuryNote | null> {
    const seed = SEEDS.find((s) => s.id === playerId);
    return seed ? buildInjury(seed) : null;
  }

  async getNewsItems(playerId: string): Promise<PlayerNewsItem[]> {
    const seed = SEEDS.find((s) => s.id === playerId);
    return seed ? buildNews(seed) : [];
  }
}

export function createDemoProvider(opts: {
  reason?: string;
  mode?: "auto" | "demo" | "balldontlie";
  apiKeyConfigured?: boolean;
} = {}): SportsDataProvider {
  return new DemoProviderImpl(opts);
}

export const FEATURED_DEMO_IDS = ["demo-1", "demo-5", "demo-2", "demo-10"];
