import type { InjuryNote } from "@/types/player";

export interface InjuryAdjustment {
  multiplier: number;
  description: string;
  impact: "positive" | "negative" | "neutral";
  riskFlag?: string;
}

export function injuryAdjustment(injury: InjuryNote | null): InjuryAdjustment {
  if (!injury || injury.status === "Unknown") {
    return {
      multiplier: 1,
      description:
        "No verified injury/news source connected — adjustment is neutral.",
      impact: "neutral",
    };
  }
  switch (injury.status) {
    case "Out":
      return {
        multiplier: 0,
        description: "Player is listed Out — projection is zero.",
        impact: "negative",
        riskFlag: "Listed Out",
      };
    case "Day-to-Day":
      return {
        multiplier: 0.95,
        description: "Day-to-Day status — small downward adjustment.",
        impact: "negative",
        riskFlag: "Day-to-Day status",
      };
    case "Questionable":
      return {
        multiplier: 0.92,
        description: "Questionable status — moderate downward adjustment.",
        impact: "negative",
        riskFlag: "Questionable status",
      };
    case "Active":
    default:
      return {
        multiplier: 1,
        description: "Listed Active with no concerns reported.",
        impact: "neutral",
      };
  }
}
