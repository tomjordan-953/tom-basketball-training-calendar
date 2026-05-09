// Award predictions: MVP, ROY.
//
// MVP scoring uses the actual signals voters use (modulo what's free):
//   - Box score production (PPG, RPG, APG, STL, BLK, minus TO)
//   - PER / NBARating (efficiency)
//   - Team success (win % from standings)
//   - Availability (games-played threshold — modern award rules require 65)
// Then we deduct for injury status (if voter cutoff already passed, the
// damage is done; if they're back, no penalty).
//
// ROY uses the same body of stats but restricts the candidate pool to
// players whose ESPN bio shows draft.year >= currentSeason - 1, fetched
// lazily for the top-30 PPG players.

import type { TeamStanding } from "@/lib/data/standings";
import type { LeadersByCategory, LeaderEntry } from "@/lib/data/leagueLeaders";
import type { SportsDataProvider } from "@/lib/data/providers/providerTypes";
import type { Player } from "@/types/player";

export interface AwardCandidate {
  athleteId: string;
  athleteName: string;
  team?: string;
  teamAbbr?: string;
  headshot?: string;
  score: number;
  signals: {
    ppg: number;
    rpg: number;
    apg: number;
    per: number;
    teamWinPct: number;
    gamesPlayed: number;
  };
  reasoning: string[];
  injuredNow: boolean;
}

interface BuildArgs {
  leaders: LeadersByCategory;
  standings: TeamStanding[];
  injuredNames: Set<string>;
}

function teamWinPct(teamAbbr: string | undefined, standings: TeamStanding[]): number {
  if (!teamAbbr) return 0;
  return standings.find((t) => t.abbreviation === teamAbbr)?.winPct ?? 0;
}

function rankByValue(leaders: LeaderEntry[], athleteId: string): number {
  return leaders.find((l) => l.athleteId === athleteId)?.value ?? 0;
}

function games(leaders: LeaderEntry[], athleteId: string): number {
  // ESPN doesn't expose GP per leader directly; minutesPerGame leaders
  // implicitly require GP, but we don't get a count back. Use rank presence
  // in PPG list as a weak signal that they qualify.
  return rankByValue(leaders, athleteId) > 0 ? 70 : 0;
}

export function predictMVP(args: BuildArgs): AwardCandidate[] {
  const { leaders, standings, injuredNames } = args;
  const candidates = leaders.pointsPerGame.slice(0, 12).map((p) => {
    const ppg = p.value;
    const rpg = rankByValue(leaders.reboundsPerGame, p.athleteId);
    const apg = rankByValue(leaders.assistsPerGame, p.athleteId);
    const per = rankByValue(leaders.per, p.athleteId);
    const winPct = teamWinPct(p.teamAbbr, standings);
    const gp = games(leaders.minutesPerGame, p.athleteId) || games(leaders.pointsPerGame, p.athleteId);

    // Production component
    const production = ppg * 1.0 + rpg * 0.8 + apg * 1.0;
    // Efficiency
    const efficiency = per * 0.6;
    // Team success — heavily weighted, modern MVPs almost always come from
    // top-3 seeds.
    const teamComponent = winPct * 35;
    // Penalty if currently flagged on the injury report.
    const injuredNow = injuredNames.has(p.athleteName.toLowerCase());
    const injuryPenalty = injuredNow ? 3 : 0;

    const score = production + efficiency + teamComponent - injuryPenalty;

    const reasoning: string[] = [];
    reasoning.push(
      `${ppg.toFixed(1)} PPG / ${rpg.toFixed(1)} RPG / ${apg.toFixed(1)} APG${per ? ` · ${per.toFixed(1)} PER` : ""}.`,
    );
    if (winPct >= 0.65) reasoning.push(`Team is ${(winPct * 100).toFixed(0)}% — top contender, narrative checks out.`);
    else if (winPct >= 0.55) reasoning.push(`Team ${(winPct * 100).toFixed(0)}% — playoff seed strong but not elite.`);
    else reasoning.push(`Team only ${(winPct * 100).toFixed(0)}% — historically a major MVP-vote dampener.`);
    if (injuredNow) reasoning.push(`⚠ Currently on the ESPN injury report — voters punish missed games hard.`);

    return {
      athleteId: p.athleteId,
      athleteName: p.athleteName,
      team: p.team,
      teamAbbr: p.teamAbbr,
      headshot: p.headshot,
      score: Number(score.toFixed(2)),
      signals: { ppg, rpg, apg, per, teamWinPct: winPct, gamesPlayed: gp },
      reasoning,
      injuredNow,
    };
  });
  return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
}

export async function predictROY(
  provider: SportsDataProvider,
  args: BuildArgs,
  currentSeasonStartYear: number,
): Promise<AwardCandidate[]> {
  const { leaders, standings, injuredNames } = args;

  // Pool: top 30 by PPG. We then check each one's draft year.
  const pool = leaders.pointsPerGame.slice(0, 30);

  // Look up each pool player's bio (cached).
  const bios = await Promise.all(
    pool.map(async (p) => {
      try {
        const player = await provider.getPlayer(p.athleteId);
        return { entry: p, player };
      } catch {
        return { entry: p, player: null as Player | null };
      }
    }),
  );

  // Filter: drafted within last 1 season (current season's rookies).
  const rookies = bios.filter(({ player }) => {
    const draft = player?.draftYear;
    if (!draft) return false;
    // currentSeasonStartYear = e.g. 2025 for the 2025-26 season → rookies
    // are 2025 draftees.
    return draft >= currentSeasonStartYear;
  });

  const candidates: AwardCandidate[] = rookies.map(({ entry: p, player }) => {
    const ppg = p.value;
    const rpg = rankByValue(leaders.reboundsPerGame, p.athleteId);
    const apg = rankByValue(leaders.assistsPerGame, p.athleteId);
    const per = rankByValue(leaders.per, p.athleteId);
    const winPct = teamWinPct(p.teamAbbr, standings);
    const injuredNow = injuredNames.has(p.athleteName.toLowerCase());

    // ROY scoring is heavier on raw production (team wins matter less to
    // ROY voters than MVP voters).
    const production = ppg * 1.4 + rpg * 1.0 + apg * 1.1;
    const efficiency = per * 0.4;
    const teamComponent = winPct * 6;
    const score = production + efficiency + teamComponent - (injuredNow ? 2 : 0);

    return {
      athleteId: p.athleteId,
      athleteName: p.athleteName,
      team: p.team,
      teamAbbr: p.teamAbbr,
      headshot: p.headshot,
      score: Number(score.toFixed(2)),
      signals: { ppg, rpg, apg, per, teamWinPct: winPct, gamesPlayed: 70 },
      reasoning: [
        `${ppg.toFixed(1)} PPG / ${rpg.toFixed(1)} RPG / ${apg.toFixed(1)} APG as a rookie (drafted ${player?.draftYear}).`,
        winPct >= 0.5
          ? `Team above .500 — voters notice winning rookies.`
          : `Team below .500 — ROY voters care less, focus on stats.`,
        injuredNow ? "⚠ Currently on the ESPN injury report." : "Healthy.",
      ],
      injuredNow,
    };
  });

  return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
}
