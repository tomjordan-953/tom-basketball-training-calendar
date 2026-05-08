import type { OpponentContext } from "@/types/stats";

export interface MatchupAdjustment {
  pointsMultiplier: number;
  paceMultiplier: number;
  description: string;
  impact: "positive" | "negative" | "neutral";
}

export function matchupAdjustment(
  opponent: OpponentContext | null,
): MatchupAdjustment {
  if (!opponent) {
    return {
      pointsMultiplier: 1,
      paceMultiplier: 1,
      description: "No opponent matchup data — neutral adjustment applied.",
      impact: "neutral",
    };
  }
  if (opponent.difficulty === "Tough") {
    return {
      pointsMultiplier: 0.94,
      paceMultiplier: 0.98,
      description: `Opponent ${opponent.opponent} is a tough matchup (defensive rating ~${opponent.defensiveRating?.toFixed(1) ?? "?"}).`,
      impact: "negative",
    };
  }
  if (opponent.difficulty === "Easy") {
    return {
      pointsMultiplier: 1.06,
      paceMultiplier: 1.02,
      description: `Opponent ${opponent.opponent} allows above-average production at this position.`,
      impact: "positive",
    };
  }
  return {
    pointsMultiplier: 1,
    paceMultiplier: 1,
    description: `Opponent ${opponent.opponent} is an average matchup.`,
    impact: "neutral",
  };
}
