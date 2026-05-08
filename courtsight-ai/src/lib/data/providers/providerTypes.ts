import type { InjuryNote, Player, PlayerNewsItem } from "@/types/player";
import type {
  GameLog,
  NextGameContext,
  OpponentContext,
  SeasonAverages,
  CareerSeason,
} from "@/types/stats";

export type ProviderName = "demo" | "balldontlie";
export type ProviderMode = "auto" | "demo" | "balldontlie";

export interface ProviderStatus {
  name: ProviderName;
  label: string;
  isLive: boolean;
  message: string;
  hasNewsSource: boolean;
  hasInjurySource: boolean;
  mode: ProviderMode;
  apiKeyConfigured: boolean;
  fallbackReason?: string;
}

export interface SportsDataProvider {
  readonly name: ProviderName;
  readonly status: ProviderStatus;

  searchPlayers(query: string): Promise<Player[]>;
  getPlayer(playerId: string): Promise<Player | null>;
  getPlayerGameLogs(playerId: string, limit?: number): Promise<GameLog[]>;
  getSeasonAverages(playerId: string): Promise<SeasonAverages | null>;
  getCareerSeasons(playerId: string): Promise<CareerSeason[]>;
  getNextGame(playerId: string): Promise<NextGameContext | null>;
  getOpponentContext(opponent: string): Promise<OpponentContext | null>;
  getInjuryContext(playerId: string): Promise<InjuryNote | null>;
  getNewsItems(playerId: string): Promise<PlayerNewsItem[]>;
}
