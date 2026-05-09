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
import { getPlayerCalibration } from "@/lib/tracking/calibration";

interface RetroArgs {
  player: Player;
  allLogs: GameLog[];
  season: SeasonAverages | null;
  injury: InjuryNote | null;
  opponent: OpponentContext | null;
  targetDate: string; // YYYY-MM-DD
  opponentAbbr?: string;
  homeAway?: "home" | "away";
  isPlayoffs?: boolean;
  dataSource: "demo" | "balldontlie" | "espn";
}

export interface RetroProjectionResult {
  projection: Projection;
  // Whether we excluded the target game from the inputs (true = honest retro
  // projection; false = we couldn't separate target from history).
  hindsightSafe: boolean;
}

export async function buildRetroProjection({
  player,
  allLogs,
  season,
  injury,
  opponent,
  targetDate,
  opponentAbbr,
  homeAway,
  isPlayoffs,
  dataSource,
}: RetroArgs): Promise<RetroProjectionResult> {
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
        isPlayoffs,
      }
    : null;
  const calibration = await getPlayerCalibration(player.id);
  // CRITICAL: do NOT inherit today's injury status into a retro projection
  // for a past game. We have no way to know whether the player was on the
  // injury report at the time. The fact that the player has a real gamelog
  // entry for that date is the strongest evidence they played. Forcing
  // status to "Active" keeps the per-36 model honest about past games.
  const retroInjury =
    new Date(targetDate).getTime() < Date.now() - 6 * 60 * 60 * 1000
      ? { status: "Active" as const, note: "Retro projection — current injury status irrelevant for past game.", source: "—" }
      : injury;
  const projection = buildProjection({
    player,
    logs: priorLogs.length > 0 ? priorLogs : allLogs,
    season,
    nextGame,
    opponent,
    injury: retroInjury,
    dataSource,
    isPlayoffs,
    calibration,
  });
  return { projection, hindsightSafe: priorLogs.length > 0 && !usedAll };
}
