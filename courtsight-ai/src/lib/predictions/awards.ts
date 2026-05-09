// Award predictions: MVP, ROY, DPOY.
//
// All three pull each candidate's REAL season averages from the active
// provider (cached) so production numbers don't get capped at "in top-10
// in this category". MVP / DPOY use the league leaders endpoint to find
// the candidate pool; ROY uses a hardcoded current-class roster
// (league leaders only return top-10, which never includes rookies).

import type { TeamStanding } from "@/lib/data/standings";
import type { LeadersByCategory } from "@/lib/data/leagueLeaders";
import type { SportsDataProvider } from "@/lib/data/providers/providerTypes";
import type { Player } from "@/types/player";
import type { SeasonAverages } from "@/types/stats";
import { CLASS_DRAFT_YEAR, ROOKIE_CLASS_NAMES } from "./rookies";

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
    spg: number;
    bpg: number;
    teamWinPct: number;
    gamesPlayed: number;
    teamDef?: number; // for DPOY context (lower = better defense)
  };
  reasoning: string[];
  injuredNow: boolean;
}

interface BuildArgs {
  leaders: LeadersByCategory;
  standings: TeamStanding[];
  injuredNames: Set<string>;
  provider: SportsDataProvider;
}

function teamFor(teamAbbr: string | undefined, standings: TeamStanding[]): TeamStanding | undefined {
  if (!teamAbbr) return undefined;
  return standings.find((t) => t.abbreviation === teamAbbr);
}

interface CandidateInputs {
  athleteId: string;
  athleteName: string;
  team?: string;
  teamAbbr?: string;
  headshot?: string;
}

async function enrichCandidate(
  provider: SportsDataProvider,
  c: CandidateInputs,
): Promise<{ player: Player | null; season: SeasonAverages | null }> {
  try {
    const [player, season] = await Promise.all([
      provider.getPlayer(c.athleteId),
      provider.getSeasonAverages(c.athleteId),
    ]);
    return { player, season };
  } catch {
    return { player: null, season: null };
  }
}

// ---------- MVP ----------------------------------------------------------

export async function predictMVP(args: BuildArgs): Promise<AwardCandidate[]> {
  const { leaders, standings, injuredNames, provider } = args;
  // Pool: top-10 PPG (modern MVPs are always top-10 scorers).
  const pool = leaders.pointsPerGame.slice(0, 10);
  const enriched = await Promise.all(pool.map((p) => enrichCandidate(provider, p)));

  const candidates: AwardCandidate[] = pool.map((p, i) => {
    const { season } = enriched[i];
    const ppg = season?.points ?? p.value;
    const rpg = season?.rebounds ?? 0;
    const apg = season?.assists ?? 0;
    const spg = season?.steals ?? 0;
    const bpg = season?.blocks ?? 0;
    const team = teamFor(p.teamAbbr, standings);
    const winPct = team?.winPct ?? 0;
    const gp = season?.gamesPlayed ?? 0;
    const injuredNow = injuredNames.has(p.athleteName.toLowerCase());

    // Production: PTS heavy, REB and AST balanced, defensive stats minor.
    const production = ppg * 1.0 + rpg * 0.85 + apg * 1.05 + (spg + bpg) * 0.5;
    // Team success — heavily weighted (modern MVPs from top-3 seeds).
    const teamComponent = winPct * 35;
    // Availability — modern award rules require 65 GP; we shrink hard if under.
    const availability = gp >= 65 ? 0 : gp >= 50 ? -3 : -10;
    const injuryPenalty = injuredNow ? 4 : 0;
    const score = Number((production + teamComponent + availability - injuryPenalty).toFixed(2));

    const reasoning: string[] = [];
    reasoning.push(`${ppg.toFixed(1)} PPG · ${rpg.toFixed(1)} RPG · ${apg.toFixed(1)} APG · ${(spg + bpg).toFixed(1)} stocks.`);
    if (team) {
      if (winPct >= 0.65) reasoning.push(`Team ${team.wins}-${team.losses} (${(winPct * 100).toFixed(0)}%) — top contender, narrative checks out.`);
      else if (winPct >= 0.55) reasoning.push(`Team ${team.wins}-${team.losses} — playoff seed strong but not elite.`);
      else reasoning.push(`Team only ${team.wins}-${team.losses} — historically a major MVP-vote dampener.`);
    }
    if (gp > 0 && gp < 65) reasoning.push(`⚠ ${gp} GP — short of 65-game award eligibility.`);
    if (injuredNow) reasoning.push(`⚠ Currently on the ESPN injury report.`);

    return {
      athleteId: p.athleteId,
      athleteName: p.athleteName,
      team: p.team,
      teamAbbr: p.teamAbbr,
      headshot: p.headshot,
      score,
      signals: { ppg, rpg, apg, spg, bpg, teamWinPct: winPct, gamesPlayed: gp },
      reasoning,
      injuredNow,
    };
  });

  return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
}

// ---------- DPOY ---------------------------------------------------------

export async function predictDPOY(args: BuildArgs): Promise<AwardCandidate[]> {
  const { leaders, standings, injuredNames, provider } = args;
  // Pool: union of blocks + steals leaders + a few obvious anchors.
  const seen = new Set<string>();
  const pool: typeof leaders.pointsPerGame = [];
  for (const l of [...leaders.blocksPerGame, ...leaders.stealsPerGame]) {
    if (seen.has(l.athleteId)) continue;
    seen.add(l.athleteId);
    pool.push(l);
    if (pool.length >= 18) break;
  }
  const enriched = await Promise.all(pool.map((p) => enrichCandidate(provider, p)));

  const candidates: AwardCandidate[] = pool.map((p, i) => {
    const { season } = enriched[i];
    const ppg = season?.points ?? 0;
    const rpg = season?.rebounds ?? 0;
    const apg = season?.assists ?? 0;
    const spg = season?.steals ?? 0;
    const bpg = season?.blocks ?? 0;
    const team = teamFor(p.teamAbbr, standings);
    const winPct = team?.winPct ?? 0;
    const teamDef = team?.avgPointsAgainst ?? 115;
    const gp = season?.gamesPlayed ?? 0;
    const injuredNow = injuredNames.has(p.athleteName.toLowerCase());

    // DPOY scoring: blocks & steals lead, REB rewarded (rim protection),
    // team defensive efficiency rewarded (lower opp PPG = better).
    const stocks = (bpg * 5) + (spg * 4);   // blocks weighted higher (rarer)
    const reboundComponent = rpg * 0.5;
    // Lower allowed PPG = better defense. Reward = (115 - teamDef) clamped.
    const teamDefBonus = Math.max(-2, Math.min(6, (115 - teamDef) * 0.6));
    const teamSuccess = winPct * 4;
    const availability = gp >= 65 ? 0 : gp >= 50 ? -2 : -6;
    const injuryPenalty = injuredNow ? 3 : 0;
    const score = Number((stocks + reboundComponent + teamDefBonus + teamSuccess + availability - injuryPenalty).toFixed(2));

    const reasoning: string[] = [];
    reasoning.push(`${bpg.toFixed(1)} BPG · ${spg.toFixed(1)} SPG · ${rpg.toFixed(1)} RPG.`);
    if (team) reasoning.push(`Team allows ${teamDef.toFixed(1)} PPG (league avg ~115) — ${teamDef < 110 ? "elite" : teamDef < 115 ? "solid" : "mediocre"} defense.`);
    if (gp > 0 && gp < 65) reasoning.push(`⚠ ${gp} GP — short of award eligibility threshold.`);
    if (injuredNow) reasoning.push(`⚠ Currently on the ESPN injury report.`);

    return {
      athleteId: p.athleteId,
      athleteName: p.athleteName,
      team: p.team,
      teamAbbr: p.teamAbbr,
      headshot: p.headshot,
      score,
      signals: { ppg, rpg, apg, spg, bpg, teamWinPct: winPct, gamesPlayed: gp, teamDef },
      reasoning,
      injuredNow,
    };
  });

  return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
}

// ---------- ROY ----------------------------------------------------------

export async function predictROY(args: BuildArgs): Promise<AwardCandidate[]> {
  const { standings, injuredNames, provider } = args;

  // Search ESPN by name to find each rookie's real ID + stats.
  const found = await Promise.all(
    ROOKIE_CLASS_NAMES.map(async (name) => {
      try {
        const results = await provider.searchPlayers(name);
        const exact = results.find((p) => p.fullName.toLowerCase() === name.toLowerCase());
        const player = exact ?? results[0];
        if (!player) return null;
        const [bio, season] = await Promise.all([
          provider.getPlayer(player.id),
          provider.getSeasonAverages(player.id),
        ]);
        // Cross-check draft year — only count players actually in the
        // current rookie class.
        if (bio?.draftYear && bio.draftYear !== CLASS_DRAFT_YEAR) return null;
        if (!season || !season.gamesPlayed) return null;
        return { name, player: bio ?? player, season };
      } catch {
        return null;
      }
    }),
  );

  const valid = found.filter(
    (x): x is { name: string; player: Player; season: SeasonAverages } => x !== null,
  );

  const candidates: AwardCandidate[] = valid.map(({ player, season }) => {
    const ppg = season.points;
    const rpg = season.rebounds;
    const apg = season.assists;
    const spg = season.steals;
    const bpg = season.blocks;
    const teamAbbr = player.teamAbbreviation;
    const team = teamFor(teamAbbr, standings);
    const winPct = team?.winPct ?? 0;
    const gp = season.gamesPlayed;
    const injuredNow = injuredNames.has(player.fullName.toLowerCase());

    // ROY scoring: production-heavy (team success matters less than MVP).
    const production = ppg * 1.4 + rpg * 1.0 + apg * 1.1 + (spg + bpg) * 0.6;
    const teamComponent = winPct * 6;
    const availability = gp >= 50 ? 0 : gp >= 30 ? -3 : -8;
    const injuryPenalty = injuredNow ? 2 : 0;
    const score = Number((production + teamComponent + availability - injuryPenalty).toFixed(2));

    const reasoning: string[] = [];
    reasoning.push(`${ppg.toFixed(1)} PPG / ${rpg.toFixed(1)} RPG / ${apg.toFixed(1)} APG over ${gp} GP as a rookie.`);
    if (team && winPct >= 0.5) reasoning.push(`Team above .500 — voters notice winning rookies.`);
    else if (team) reasoning.push(`Team below .500 — ROY voters care less, focus on stats.`);
    if (injuredNow) reasoning.push("⚠ Currently on the ESPN injury report.");

    return {
      athleteId: player.id,
      athleteName: player.fullName,
      team: player.team,
      teamAbbr,
      headshot: player.imageUrl,
      score,
      signals: { ppg, rpg, apg, spg, bpg, teamWinPct: winPct, gamesPlayed: gp },
      reasoning,
      injuredNow,
    };
  });

  return candidates.sort((a, b) => b.score - a.score).slice(0, 6);
}
