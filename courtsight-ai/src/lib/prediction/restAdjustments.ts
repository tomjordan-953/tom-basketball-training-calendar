import type { NextGameContext } from "@/types/stats";

export interface RestAdjustment {
  multiplier: number;
  minutesDelta: number;
  description: string;
  impact: "positive" | "negative" | "neutral";
}

export function restAdjustment(next: NextGameContext | null): RestAdjustment {
  if (!next) {
    return {
      multiplier: 1,
      minutesDelta: 0,
      description: "No schedule data — rest adjustment neutral.",
      impact: "neutral",
    };
  }
  if (next.isBackToBack) {
    return {
      multiplier: 0.96,
      minutesDelta: -1.5,
      description: "Back-to-back game — slight reduction for fatigue.",
      impact: "negative",
    };
  }
  if (next.daysOfRest >= 3) {
    return {
      multiplier: 1.02,
      minutesDelta: 0.5,
      description: `${next.daysOfRest} days of rest — fresh legs expected.`,
      impact: "positive",
    };
  }
  return {
    multiplier: 1,
    minutesDelta: 0,
    description: `${next.daysOfRest} day(s) of rest — normal load expected.`,
    impact: "neutral",
  };
}
