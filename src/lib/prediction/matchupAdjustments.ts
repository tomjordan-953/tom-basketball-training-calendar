import type { OpponentContext } from "@/types/stats";

export interface MatchupAdjustment {
  pointsMultiplier: number;
  paceMultiplier: number;
  description: string;
  impact: "positive" | "negative" | "neutral";
}

const LEAGUE_AVG_PPG = 115;

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

  // Smart path: if real defensiveRating + pace are present, compute
  // continuous multipliers instead of bucketed Tough/Average/Easy.
  if (typeof opponent.defensiveRating === "number") {
    const def = opponent.defensiveRating;
    // Defense factor: lower opponent allowed PPG = harder.
    // Cap range so a single team can't move the projection by >8%.
    const rawDef = LEAGUE_AVG_PPG / def;
    const pointsMultiplier = clamp(0.92 + (rawDef - 1) * 0.55, 0.92, 1.08);

    // Pace factor: blend of opponent pace + ~neutral.
    const pace = opponent.pace ?? LEAGUE_AVG_PPG;
    const rawPace = pace / LEAGUE_AVG_PPG;
    const paceMultiplier = clamp(0.96 + (rawPace - 1) * 0.4, 0.96, 1.04);

    let impact: MatchupAdjustment["impact"];
    if (pointsMultiplier > 1.02) impact = "positive";
    else if (pointsMultiplier < 0.98) impact = "negative";
    else impact = "neutral";

    const desc =
      `Opponent ${opponent.opponent} allows ${def.toFixed(1)} PPG ` +
      `(league ~${LEAGUE_AVG_PPG}) and runs at pace proxy ${pace.toFixed(1)} — ` +
      `× ${pointsMultiplier.toFixed(3)} on points, × ${paceMultiplier.toFixed(3)} on volume stats.`;
    return { pointsMultiplier, paceMultiplier, description: desc, impact };
  }

  // Fallback bucketed adjustment (demo / no team-stats provider).
  if (opponent.difficulty === "Tough") {
    return {
      pointsMultiplier: 0.94,
      paceMultiplier: 0.98,
      description: `Opponent ${opponent.opponent} is a tough matchup.`,
      impact: "negative",
    };
  }
  if (opponent.difficulty === "Easy") {
    return {
      pointsMultiplier: 1.06,
      paceMultiplier: 1.02,
      description: `Opponent ${opponent.opponent} allows above-average production.`,
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
