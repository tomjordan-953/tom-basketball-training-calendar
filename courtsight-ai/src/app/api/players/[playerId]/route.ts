import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data/providers";
import { TTL, cachedWithMeta } from "@/lib/data/cache";

interface Ctx {
  params: { playerId: string };
}

export async function GET(_req: Request, { params }: Ctx) {
  const provider = getProvider();
  const playerId = decodeURIComponent(params.playerId);
  try {
    const playerRead = await cachedWithMeta(
      `player:${provider.name}:${playerId}`,
      TTL.player,
      () => provider.getPlayer(playerId),
    );
    if (!playerRead.value) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const [logsRead, seasonRead, careerRead, nextGameRead, injuryRead, newsRead] =
      await Promise.all([
        cachedWithMeta(`logs:${provider.name}:${playerId}`, TTL.gameLogs, () =>
          provider.getPlayerGameLogs(playerId, 24),
        ),
        cachedWithMeta(
          `season:${provider.name}:${playerId}`,
          TTL.seasonAverages,
          () => provider.getSeasonAverages(playerId),
        ),
        cachedWithMeta(`career:${provider.name}:${playerId}`, TTL.player, () =>
          provider.getCareerSeasons(playerId),
        ),
        cachedWithMeta(`next:${provider.name}:${playerId}`, TTL.gameLogs, () =>
          provider.getNextGame(playerId),
        ),
        cachedWithMeta(
          `injury:${provider.name}:${playerId}`,
          TTL.gameLogs,
          () => provider.getInjuryContext(playerId),
        ),
        cachedWithMeta(`news:${provider.name}:${playerId}`, TTL.gameLogs, () =>
          provider.getNewsItems(playerId),
        ),
      ]);

    const ages = [
      playerRead.meta.ageMs,
      logsRead.meta.ageMs,
      seasonRead.meta.ageMs,
      nextGameRead.meta.ageMs,
    ];

    return NextResponse.json({
      player: playerRead.value,
      season: seasonRead.value,
      logs: logsRead.value,
      career: careerRead.value,
      nextGame: nextGameRead.value,
      injury: injuryRead.value,
      news: newsRead.value,
      source: provider.name,
      providerLabel: provider.status.label,
      cache: {
        oldestAgeMs: Math.max(...ages),
        ages: {
          player: playerRead.meta.ageMs,
          logs: logsRead.meta.ageMs,
          season: seasonRead.meta.ageMs,
          career: careerRead.meta.ageMs,
          nextGame: nextGameRead.meta.ageMs,
          injury: injuryRead.meta.ageMs,
          news: newsRead.meta.ageMs,
        },
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Provider unavailable" },
      { status: 502 },
    );
  }
}
