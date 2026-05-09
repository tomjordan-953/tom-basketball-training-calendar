// NBA playoff bracket simulator. Builds the standard 1v8 / 4v5 / 3v6 / 2v7
// bracket per conference using current ESPN seeds, then walks each round
// using our championship-model team scores to compute win probabilities.
//
// Win prob is a logistic on score-diff, clamped to [0.18, 0.82] because in
// a best-of-7 NBA series even a strong favorite rarely sits above ~80%.

import type { TeamStanding } from "@/lib/data/standings";
import type { TeamScore } from "./championship";

export interface BracketTeam {
  abbreviation: string;
  seed: number;
  conference: "East" | "West";
  rawScore: number;
  starInjured: boolean;
  team: TeamStanding;
}

export interface BracketMatchup {
  id: string;
  round: 1 | 2 | 3 | 4; // 1=R1, 2=R2, 3=Conf Final, 4=NBA Finals
  conference: "East" | "West" | "Both";
  teamA: BracketTeam | null;
  teamB: BracketTeam | null;
  winProbA: number;
  winProbB: number;
  predictedWinner?: BracketTeam;
  // For the championship matchup, the conf finals round
  feedsInto?: string;
  reasoning?: string;
}

export interface Bracket {
  east: {
    round1: BracketMatchup[];   // 4 matchups
    round2: BracketMatchup[];   // 2 matchups
    confFinal: BracketMatchup;  // 1 matchup
  };
  west: {
    round1: BracketMatchup[];
    round2: BracketMatchup[];
    confFinal: BracketMatchup;
  };
  finals: BracketMatchup;
  championPick?: BracketTeam;
}

const PROB_FLOOR = 0.18;
const PROB_CEIL = 0.82;
const LOGISTIC_SCALE = 6;

function winProb(scoreA: number, scoreB: number): number {
  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return 0.5;
  const diff = scoreA - scoreB;
  const raw = 1 / (1 + Math.exp(-diff / LOGISTIC_SCALE));
  return Math.max(PROB_FLOOR, Math.min(PROB_CEIL, raw));
}

function teamFromScore(score: TeamScore | undefined, conference: "East" | "West"): BracketTeam | null {
  if (!score) return null;
  return {
    abbreviation: score.team.abbreviation,
    seed: score.team.seed,
    conference,
    rawScore: score.rawScore,
    starInjured: !!score.starInjured,
    team: score.team,
  };
}

function buildMatchup(
  id: string,
  round: 1 | 2 | 3 | 4,
  conference: "East" | "West" | "Both",
  teamA: BracketTeam | null,
  teamB: BracketTeam | null,
): BracketMatchup {
  if (!teamA || !teamB) {
    return {
      id, round, conference, teamA, teamB,
      winProbA: 0.5, winProbB: 0.5,
    };
  }
  const probA = winProb(teamA.rawScore, teamB.rawScore);
  const winner = probA >= 0.5 ? teamA : teamB;
  const reasoning = buildReasoning(teamA, teamB, probA);
  return {
    id, round, conference,
    teamA, teamB,
    winProbA: probA,
    winProbB: 1 - probA,
    predictedWinner: winner,
    reasoning,
  };
}

function buildReasoning(a: BracketTeam, b: BracketTeam, probA: number): string {
  const fav = probA >= 0.5 ? a : b;
  const dog = probA >= 0.5 ? b : a;
  const favProb = probA >= 0.5 ? probA : 1 - probA;
  const margin = (a.rawScore - b.rawScore).toFixed(1);
  const parts: string[] = [];
  parts.push(`${fav.abbreviation} (${fav.seed} seed) favored ${(favProb * 100).toFixed(0)}% over ${dog.abbreviation} (${dog.seed} seed).`);
  parts.push(`Score margin ${probA >= 0.5 ? margin : (-Number(margin)).toFixed(1)}.`);
  if (a.starInjured) parts.push(`⚠ ${a.abbreviation}'s star on injury report.`);
  if (b.starInjured) parts.push(`⚠ ${b.abbreviation}'s star on injury report.`);
  return parts.join(" ");
}

export function buildBracket(scores: TeamScore[]): Bracket {
  const findBySeed = (conf: "East" | "West", seed: number): BracketTeam | null => {
    const score = scores.find(
      (s) => s.team.conference === conf && s.team.seed === seed,
    );
    return teamFromScore(score, conf);
  };

  const buildConferenceR1 = (conf: "East" | "West") => [
    buildMatchup(`${conf}-R1-1v8`, 1, conf, findBySeed(conf, 1), findBySeed(conf, 8)),
    buildMatchup(`${conf}-R1-4v5`, 1, conf, findBySeed(conf, 4), findBySeed(conf, 5)),
    buildMatchup(`${conf}-R1-3v6`, 1, conf, findBySeed(conf, 3), findBySeed(conf, 6)),
    buildMatchup(`${conf}-R1-2v7`, 1, conf, findBySeed(conf, 2), findBySeed(conf, 7)),
  ];

  const eastR1 = buildConferenceR1("East");
  const westR1 = buildConferenceR1("West");

  const buildR2 = (conf: "East" | "West", r1: BracketMatchup[]) => [
    buildMatchup(`${conf}-R2-top`, 2, conf, r1[0].predictedWinner ?? null, r1[1].predictedWinner ?? null),
    buildMatchup(`${conf}-R2-bot`, 2, conf, r1[3].predictedWinner ?? null, r1[2].predictedWinner ?? null),
  ];
  const eastR2 = buildR2("East", eastR1);
  const westR2 = buildR2("West", westR1);

  const eastCF = buildMatchup("East-CF", 3, "East", eastR2[0].predictedWinner ?? null, eastR2[1].predictedWinner ?? null);
  const westCF = buildMatchup("West-CF", 3, "West", westR2[0].predictedWinner ?? null, westR2[1].predictedWinner ?? null);

  const finals = buildMatchup("Finals", 4, "Both", eastCF.predictedWinner ?? null, westCF.predictedWinner ?? null);

  return {
    east: { round1: eastR1, round2: eastR2, confFinal: eastCF },
    west: { round1: westR1, round2: westR2, confFinal: westCF },
    finals,
    championPick: finals.predictedWinner,
  };
}
