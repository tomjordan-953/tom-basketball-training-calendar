export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  team?: string;
  teamAbbreviation?: string;
  position?: string;
  height?: string;
  weight?: string;
  jersey?: string;
  imageUrl?: string;
  country?: string;
  experienceYears?: number;
  draftYear?: number;
}

export interface InjuryNote {
  status: "Active" | "Day-to-Day" | "Out" | "Questionable" | "Unknown";
  note?: string;
  source?: string;
  reportedAt?: string;
}

export interface PlayerNewsItem {
  id: string;
  headline: string;
  body?: string;
  date: string;
  category: "injury" | "trade" | "role" | "general";
  source?: string;
}
