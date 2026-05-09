// Tiny adapter so the player profile page can ask the active provider
// "how many key opponents are out?" without coupling to the ESPN class
// directly. Other providers safely return 0.

import { getProvider } from "./providers";

export async function getOpponentInjuryCount(opponentAbbr: string): Promise<{
  count: number;
  players: string[];
}> {
  const provider = getProvider();
  if (!opponentAbbr || provider.name !== "espn") return { count: 0, players: [] };
  const espn = provider as unknown as {
    getTeamInjuryStats?: (abbr: string) => Promise<{ outOrDoubt: number; players: string[] }>;
  };
  if (!espn.getTeamInjuryStats) return { count: 0, players: [] };
  try {
    const stats = await espn.getTeamInjuryStats(opponentAbbr);
    return { count: stats.outOrDoubt, players: stats.players };
  } catch {
    return { count: 0, players: [] };
  }
}
