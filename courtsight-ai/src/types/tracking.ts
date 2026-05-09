import type { ProjectedStatline } from "@/types/projection";

export interface ActualLine {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  minutes: number;
  opponent?: string;
  result?: "W" | "L";
}

export interface PredictionRecord {
  id: string;
  playerId: string;
  playerName: string;
  modelVersion: string;
  dataSource: "demo" | "balldontlie" | "espn";
  generatedAt: string;
  // The game this prediction targets. We grade by looking for a real game on
  // or after this date in the player's logs (within ~7 days).
  targetDate?: string;
  opponent?: string;
  predicted: ProjectedStatline;
  confidence: number;
  // Filled in when graded.
  actual?: ActualLine;
  gradedAt?: string;
  // Per-stat accuracy 0-1 (1 = perfect, 0 = far off).
  perStatAccuracy?: ProjectedStatline;
  // Overall accuracy 0-100.
  accuracy?: number;
  // Hit = within tolerance.
  hit?: boolean;
}

export interface AccuracyStats {
  totalPredictions: number;
  graded: number;
  pending: number;
  overallAccuracyPct: number;
  byStat: {
    points: { mae: number; accuracyPct: number };
    rebounds: { mae: number; accuracyPct: number };
    assists: { mae: number; accuracyPct: number };
    steals: { mae: number; accuracyPct: number };
    blocks: { mae: number; accuracyPct: number };
    turnovers: { mae: number; accuracyPct: number };
    minutes: { mae: number; accuracyPct: number };
  };
  hitRatePct: number;
  recent: PredictionRecord[];
}
