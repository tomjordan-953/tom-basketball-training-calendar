export interface GameLog {
  id: string;
  playerId: string;
  date: string;
  opponent?: string;
  homeAway?: "home" | "away";
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoalAttempts?: number;
  fieldGoalMakes?: number;
  threePointAttempts?: number;
  threePointMakes?: number;
  freeThrowAttempts?: number;
  freeThrowMakes?: number;
  result?: "W" | "L";
}

export interface SeasonAverages {
  season: number;
  gamesPlayed: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoalPct?: number;
  threePointPct?: number;
  freeThrowPct?: number;
  trueShootingPct?: number;
}

export interface CareerSeason {
  season: number;
  team?: string;
  gamesPlayed: number;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals?: number;
  blocks?: number;
}

export interface OpponentContext {
  opponent: string;
  defensiveRating?: number;
  pointsAllowedToPosition?: number;
  pace?: number;
  difficulty: "Easy" | "Average" | "Tough";
}

export interface NextGameContext {
  date: string;
  opponent: string;
  homeAway: "home" | "away";
  daysOfRest: number;
  isBackToBack: boolean;
}
