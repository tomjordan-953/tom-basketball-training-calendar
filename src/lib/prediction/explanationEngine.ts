import type { ProjectionFactor } from "@/types/projection";

export interface ExplainContext {
  playerName: string;
  factors: ProjectionFactor[];
  hasInjurySource: boolean;
  hasOpponentData: boolean;
  enoughGames: boolean;
}

export function buildExplanation(ctx: ExplainContext): string[] {
  const bullets: string[] = [];
  for (const f of ctx.factors) {
    bullets.push(f.description);
  }
  if (!ctx.hasInjurySource) {
    bullets.push("No verified injury source connected, so injury adjustment is neutral.");
  }
  if (!ctx.hasOpponentData) {
    bullets.push("No opponent matchup data, so matchup adjustment is neutral.");
  }
  if (!ctx.enoughGames) {
    bullets.push("Limited recent game data — confidence reduced accordingly.");
  }
  return bullets;
}
