// "Retrospective" projections: when looking at a game (already played or
// upcoming), generate a projection for selected players based ONLY on games
// BEFORE the target date, then optionally compare to the actual game line.
//
// This is honest: the projection is generated *now* but uses a windowed
// gamelog that excludes the target game itself.

import type { Player } from "@/types/player";
import type { GameLog, NextGameContext, OpponentContext, SeasonAverages } from "@/types/stats";
import type { InjuryNote } from "@/types/player";
import type { Projection } from "@/types/projection";
import { buildProjection } from "./projectionEngine";

interface RetroArgs {
  player: Player;
  allLogs: GameLog[];
  season: SeasonAverages | null;
  injury: InjuryNote | null;
  opponent: OpponentContext | null;
  targetDate: string; // YYYY-MM-DD
  opponentAbbr?: string;
  homeAway?: "home" | "away";
  dataSource: "demo" | "balldontlie" | "espn";
}

export interface RetroProjectionResult {
  projection: Projection;
  // Whether we excluded the target game from the inputs (true = honest retro
  // projection; false = we couldn't separate target from history).
  hindsightSafe: boolean;
}

export function buildRetroProjection({
  player,
  allLogs,
  season,
  injury,
  opponent,
  targetDate,
  opponentAbbr,
  homeAway,
  dataSource,
}: RetroArgs): RetroProjectionResult {
  // Keep only games strictly BEFORE the target date so the projection isn't
  // contaminated by the very game we're predicting.
  const target = new Date(targetDate).getTime();
  const priorLogs = allLogs.filter((g) => {
    const t = new Date(g.date).getTime();
    return t < target;
  });
  const usedAll = priorLogs.length === allLogs.length;
  const nextGame: NextGameContext | null = opponentAbbr
    ? {
        date: targetDate,
        opponent: opponentAbbr,
        homeAway: homeAway ?? "home",
        daysOfRest: 1,
        isBackToBack: false,
      }
    : null;
  const projection = buildProjection({
    player,
    logs: priorLogs.length > 0 ? priorLogs : allLogs,
    season,
    nextGame,
    opponent,
    injury,
    dataSource,
  });
  return { projection, hindsightSafe: priorLogs.length > 0 && !usedAll };
}
