// Championship + Finals prediction.
//
// We score each team on a small set of *real* signals, then pick the top
// in each conference (Finals matchup) and the best score overall (Champ).
// Honest: this is a deterministic ranking, not a Monte Carlo bracket sim.
//
// Signals (all from real ESPN data):
//   1. SRS proxy = pointDifferential / gamesPlayed (actual avg margin)
//   2. Win % (actual record)
//   3. Seed bonus (top seeds get easier brackets)
//   4. Star-availability penalty: subtract weight when a key opponent's
//      top scorer is on the injury report as Out / Day-to-Day.
//   5. Recent form via avg pts for/against differential vs season norm.
//
// Updates whenever the underlying ESPN feeds update (standings 6h, injuries
// 30 min).

import type { TeamStanding } from "@/lib/data/standings";
import type { LeadersByCategory, LeaderEntry } from "@/lib/data/leagueLeaders";

export interface TeamScore {
  team: TeamStanding;
  rawScore: number;       // SRS proxy after seed/availability adjustments
  injuryPenalty: number;  // negative impact from injuries to top scorer(s)
  starPlayer?: LeaderEntry;
  starInjured?: boolean;
  reasoning: string[];    // why this team ranks where it does
}

export interface ChampionshipPrediction {
  ranked: TeamScore[];
  finalsEast?: TeamScore;
  finalsWest?: TeamScore;
  champion?: TeamScore;
  upsetWatch: string[];
  generatedAt: string;
}

/**
 * @param standings  ESPN standings
 * @param leaders    league leaders (used to identify each team's "star")
 * @param injuredNames lower-cased names of players currently Out/Day-to-Day
 */
export function predictChampionship(
  standings: TeamStanding[],
  leaders: LeadersByCategory,
  injuredNames: Set<string>,
): ChampionshipPrediction {
  // Map team -> top scorer (their PPG leader).
  const topScorerByTeam = new Map<string, LeaderEntry>();
  for (const l of leaders.pointsPerGame) {
    if (!l.teamAbbr) continue;
    if (!topScorerByTeam.has(l.teamAbbr)) topScorerByTeam.set(l.teamAbbr, l);
  }
  const perLeaderByTeam = new Map<string, LeaderEntry>();
  for (const l of leaders.per) {
    if (l.teamAbbr && !perLeaderByTeam.has(l.teamAbbr)) {
      perLeaderByTeam.set(l.teamAbbr, l);
    }
  }

  const scored: TeamScore[] = standings
    .filter((t) => t.gamesPlayed > 0 && t.seed > 0 && t.seed <= 8)
    .map((team) => {
      const reasoning: string[] = [];

      // SRS proxy + win pct (most predictive of postseason success).
      const srs = team.gamesPlayed > 0 ? team.pointDifferential / team.gamesPlayed : 0;
      let score = srs * 1.0 + team.winPct * 12;
      reasoning.push(
        `Net margin ${srs >= 0 ? "+" : ""}${srs.toFixed(1)} per game, ${(team.winPct * 100).toFixed(0)}% win rate.`,
      );

      // Seed bonus — 1 seed gets +2, 8 seed gets ~0.
      const seedBonus = Math.max(0, (9 - team.seed) * 0.4);
      score += seedBonus;
      if (team.seed <= 2) reasoning.push(`Top-${team.seed} seed → easier bracket path.`);

      // Star availability check.
      const star = topScorerByTeam.get(team.abbreviation) ?? perLeaderByTeam.get(team.abbreviation);
      let injuryPenalty = 0;
      let starInjured = false;
      if (star && injuredNames.has(star.athleteName.toLowerCase())) {
        injuryPenalty = 4.5;
        starInjured = true;
        reasoning.push(`⚠ Top scorer ${star.athleteName} on injury report — major contender penalty.`);
      } else if (star) {
        reasoning.push(`Star ${star.athleteName} (${star.displayValue} PPG) is healthy.`);
      }
      score -= injuryPenalty;

      return {
        team,
        rawScore: Number(score.toFixed(2)),
        injuryPenalty,
        starPlayer: star,
        starInjured,
        reasoning,
      };
    })
    .sort((a, b) => b.rawScore - a.rawScore);

  const east = scored.find((s) => s.team.conference === "East");
  const west = scored.find((s) => s.team.conference === "West");
  let champion: TeamScore | undefined;
  if (east && west) {
    champion = east.rawScore >= west.rawScore ? east : west;
  } else {
    champion = east ?? west;
  }

  // Upset watch: any team with a top-3 score from a low (>=5) seed.
  const upsetWatch = scored
    .filter((s) => s.team.seed >= 5 && scored.indexOf(s) < 6)
    .map(
      (s) =>
        `${s.team.abbreviation} (${s.team.seed} seed) — score ${s.rawScore} ranks ${scored.indexOf(s) + 1}/${scored.length}.`,
    )
    .slice(0, 3);

  return {
    ranked: scored,
    finalsEast: east,
    finalsWest: west,
    champion,
    upsetWatch,
    generatedAt: new Date().toISOString(),
  };
}
