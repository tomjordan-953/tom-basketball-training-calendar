export type RiskLevel = "Low" | "Medium" | "High";

export interface ProjectedStatline {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  minutes: number;
}

export interface ProjectionFactor {
  label: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
  weight?: number;
  group?: "form" | "minutes" | "matchup" | "rest" | "volatility" | "data" | "injury";
}

export interface StatProjection {
  expected: number;
  floor: number;
  ceiling: number;
  confidence: number; // 0-100
  trend: "up" | "down" | "flat";
  explanation: string;
}

export type StatBreakdown = Record<keyof ProjectedStatline, StatProjection>;

export interface DataQuality {
  recentGamesCount: number;
  hasSeasonAverages: boolean;
  hasNextGame: boolean;
  hasOpponentContext: boolean;
  hasInjurySource: boolean;
  hasNewsSource: boolean;
  freshnessAgeMs?: number;
  notes: string[];
  score: number; // 0-100
}

export interface Projection {
  playerId: string;
  playerName: string;
  opponent?: string;
  homeAway?: "home" | "away";
  projected: ProjectedStatline; // expected line, kept for v1 compatibility
  baselineSeason: ProjectedStatline;
  confidence: number;
  riskLevel: RiskLevel;
  riskFlags: string[];
  explanation: string[];
  factors: ProjectionFactor[];
  // v2 additions
  range: {
    floor: ProjectedStatline;
    ceiling: ProjectedStatline;
  };
  statBreakdown: StatBreakdown;
  summary: string;
  riskExplanation: string;
  confidenceExplanation: string;
  dataQuality: DataQuality;
  formIndex: number; // 0-100 all-around composite vs season baseline
  generatedAt: string;
  modelVersion: string;
  dataSource: "demo" | "balldontlie" | "espn";
}
