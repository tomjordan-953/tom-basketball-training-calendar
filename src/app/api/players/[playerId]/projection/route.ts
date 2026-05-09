import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data/providers";
import { TTL, cachedWithMeta } from "@/lib/data/cache";
import { buildProjection } from "@/lib/prediction/projectionEngine";

interface Ctx {
  params: { playerId: string };
}

export async function GET(_req: Request, { params }: Ctx) {
  const provider = getProvider();
  const playerId = decodeURIComponent(params.playerId);
  try {
    const cacheKey = `projection-v2:${provider.name}:${playerId}`;
    const result = await cachedWithMeta(cacheKey, TTL.projection, async () => {
      const player = await provider.getPlayer(playerId);
      if (!player) return { error: "Player not found" } as const;
      const [logs, season, nextGame, injury] = await Promise.all([
        provider.getPlayerGameLogs(playerId, 24),
        provider.getSeasonAverages(playerId),
        provider.getNextGame(playerId),
        provider.getInjuryContext(playerId),
      ]);
      const opponent = nextGame
        ? await provider.getOpponentContext(nextGame.opponent)
        : null;
      if (logs.length < 3) {
        return {
          error: "Not enough recent games for a strong projection.",
          recentGamesCount: logs.length,
        } as const;
      }
      return buildProjection({
        player,
        logs,
        season,
        nextGame,
        opponent,
        injury,
        dataSource: provider.name,
      });
    });

    if ("error" in (result.value as Record<string, unknown>)) {
      const err = result.value as { error: string };
      return NextResponse.json(
        { ...err, source: provider.name, cache: { ageMs: result.meta.ageMs } },
        { status: err.error === "Player not found" ? 404 : 200 },
      );
    }
    return NextResponse.json({
      ...(result.value as object),
      cache: { ageMs: result.meta.ageMs, storedAt: result.meta.storedAt },
    });
  } catch {
    return NextResponse.json(
      { error: "Provider unavailable" },
      { status: 502 },
    );
  }
}
