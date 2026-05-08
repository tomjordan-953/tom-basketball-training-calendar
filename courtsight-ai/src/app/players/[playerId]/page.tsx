import { notFound } from "next/navigation";
import { PlayerHeader } from "@/components/player/PlayerHeader";
import { PlayerProfileCard } from "@/components/player/PlayerProfileCard";
import { StatlineProjectionCard } from "@/components/player/StatlineProjectionCard";
import { ProjectionAnalysis } from "@/components/player/ProjectionAnalysis";
import { RecentFormCard } from "@/components/player/RecentFormCard";
import { RecentFormTable } from "@/components/player/RecentFormTable";
import { CareerOverview } from "@/components/player/CareerOverview";
import { PlayerBadges } from "@/components/player/PlayerBadges";
import { RecentStatsChart } from "@/components/charts/RecentStatsChart";
import { ProjectionChart } from "@/components/charts/ProjectionChart";
import { MinutesTrendChart } from "@/components/charts/MinutesTrendChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { getProvider } from "@/lib/data/providers";
import { buildProjection } from "@/lib/prediction/projectionEngine";
import { TTL, cachedWithMeta } from "@/lib/data/cache";

export const dynamic = "force-dynamic";

interface Props {
  params: { playerId: string };
}

export default async function PlayerProfilePage({ params }: Props) {
  const provider = getProvider();
  const playerId = decodeURIComponent(params.playerId);

  const playerRead = await cachedWithMeta(
    `player:${provider.name}:${playerId}`,
    TTL.player,
    () => provider.getPlayer(playerId),
  );
  if (!playerRead.value) notFound();
  const player = playerRead.value;

  const [logsRead, seasonRead, careerRead, nextGameRead, injuryRead, newsRead] =
    await Promise.all([
      cachedWithMeta(`logs:${provider.name}:${playerId}`, TTL.gameLogs, () =>
        provider.getPlayerGameLogs(playerId, 24),
      ),
      cachedWithMeta(`season:${provider.name}:${playerId}`, TTL.seasonAverages, () =>
        provider.getSeasonAverages(playerId),
      ),
      cachedWithMeta(`career:${provider.name}:${playerId}`, TTL.player, () =>
        provider.getCareerSeasons(playerId),
      ),
      cachedWithMeta(`next:${provider.name}:${playerId}`, TTL.gameLogs, () =>
        provider.getNextGame(playerId),
      ),
      cachedWithMeta(`injury:${provider.name}:${playerId}`, TTL.gameLogs, () =>
        provider.getInjuryContext(playerId),
      ),
      cachedWithMeta(`news:${provider.name}:${playerId}`, TTL.gameLogs, () =>
        provider.getNewsItems(playerId),
      ),
    ]);

  const logs = logsRead.value;
  const season = seasonRead.value;
  const career = careerRead.value;
  const nextGame = nextGameRead.value;
  const injury = injuryRead.value;
  const news = newsRead.value;

  const opponent = nextGame
    ? await provider.getOpponentContext(nextGame.opponent)
    : null;

  const oldestAge = Math.max(
    playerRead.meta.ageMs,
    logsRead.meta.ageMs,
    seasonRead.meta.ageMs,
    nextGameRead.meta.ageMs,
  );

  const hasEnough = logs.length >= 3;
  const projection = hasEnough
    ? buildProjection({
        player,
        logs,
        season,
        nextGame,
        opponent,
        injury,
        dataSource: provider.name,
        freshnessAgeMs: oldestAge,
      })
    : null;

  return (
    <div className="space-y-6 animate-fade-up">
      <PlayerHeader
        player={player}
        dataSource={provider.name}
        freshnessAgeMs={oldestAge}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {projection ? (
            <StatlineProjectionCard projection={projection} />
          ) : (
            <EmptyState
              title="Not enough recent games for a strong projection"
              description="Connect a live data provider or pick a player with more recent activity."
            />
          )}
          {projection && <ProjectionAnalysis projection={projection} />}
          <PlayerProfileCard season={season} />
          <RecentFormCard logs={logs} season={season} />
          <RecentStatsChart logs={logs} />
          <RecentFormTable logs={logs} />
          <CareerOverview seasons={career} />
        </div>
        <div className="space-y-6">
          <ProjectionChart
            projection={
              projection ?? {
                playerId: player.id,
                playerName: player.fullName,
                projected: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, minutes: 0 },
                baselineSeason: {
                  points: season?.points ?? 0,
                  rebounds: season?.rebounds ?? 0,
                  assists: season?.assists ?? 0,
                  steals: season?.steals ?? 0,
                  blocks: season?.blocks ?? 0,
                  turnovers: season?.turnovers ?? 0,
                  minutes: season?.minutes ?? 0,
                },
                confidence: 0,
                riskLevel: "High",
                riskFlags: [],
                explanation: [],
                factors: [],
                range: {
                  floor: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, minutes: 0 },
                  ceiling: { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, minutes: 0 },
                },
                statBreakdown: {} as never,
                summary: "",
                riskExplanation: "",
                confidenceExplanation: "",
                dataQuality: {
                  recentGamesCount: 0,
                  hasSeasonAverages: !!season,
                  hasNextGame: false,
                  hasOpponentContext: false,
                  hasInjurySource: false,
                  hasNewsSource: false,
                  notes: ["Not enough recent games for a projection."],
                  score: 0,
                },
                formIndex: 50,
                generatedAt: new Date().toISOString(),
                modelVersion: "courtsight-formula-v2",
                dataSource: provider.name,
              }
            }
          />
          <MinutesTrendChart logs={logs} />
          <PlayerBadges
            injury={injury}
            nextGame={nextGame}
            news={news}
            hasInjurySource={provider.status.hasInjurySource}
            hasNewsSource={provider.status.hasNewsSource}
          />
        </div>
      </div>
    </div>
  );
}
