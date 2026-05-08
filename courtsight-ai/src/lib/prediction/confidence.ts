import type { GameLog } from "@/types/stats";
import type { InjuryNote } from "@/types/player";
import { clamp } from "@/lib/utils/format";
import { minutesTrend, volatilityScore } from "./trendUtils";

export interface ConfidenceResult {
  score: number;
  riskLevel: "Low" | "Medium" | "High";
  reasons: string[];
}

export function computeConfidence(
  logs: GameLog[],
  injury: InjuryNote | null,
  hasOpponentData: boolean,
): ConfidenceResult {
  let score = 70;
  const reasons: string[] = [];

  if (logs.length >= 10) {
    score += 8;
    reasons.push("10+ recent games of data");
  } else if (logs.length >= 5) {
    score += 2;
    reasons.push("5+ recent games of data");
  } else {
    score -= 15;
    reasons.push("Limited recent game data");
  }

  const m = minutesTrend(logs);
  if (m.stable) {
    score += 6;
    reasons.push("Minutes are stable");
  } else {
    score -= 8;
    reasons.push("Minutes are volatile");
  }

  const ptsVol = volatilityScore(logs, "points");
  if (ptsVol > 0.45) {
    score -= 10;
    reasons.push("High scoring volatility");
  } else if (ptsVol > 0.3) {
    score -= 4;
  } else {
    score += 3;
    reasons.push("Consistent scoring");
  }

  if (!injury || injury.status === "Unknown") {
    score -= 4;
    reasons.push("No verified injury source connected");
  } else if (injury.status === "Active") {
    score += 4;
  } else if (injury.status === "Day-to-Day" || injury.status === "Questionable") {
    score -= 8;
    reasons.push(`${injury.status} status reduces confidence`);
  } else if (injury.status === "Out") {
    score -= 30;
    reasons.push("Player listed Out");
  }

  if (hasOpponentData) score += 3;
  else score -= 2;

  score = Math.round(clamp(score, 5, 95));
  let riskLevel: "Low" | "Medium" | "High";
  if (score >= 75) riskLevel = "Low";
  else if (score >= 55) riskLevel = "Medium";
  else riskLevel = "High";

  return { score, riskLevel, reasons };
}
