// Real backtest against ESPN. For each named player we:
//   1. Fetch their full recent gamelog
//   2. Walk the most-recent N games as "test games"
//   3. For each test game, run buildRetroProjection (which uses ONLY games
//      from BEFORE that date — so it never peeks at the actual outcome)
//   4. Compare predicted vs actual, accumulate MAE per stat
//
// Outputs the table the user actually wants to see.

import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data/providers";
import { buildRetroProjection } from "@/lib/prediction/retroProjection";
import { round } from "@/lib/utils/format";
import { fetchGameOdds } from "@/lib/data/gameOdds";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_PLAYER_QUERIES = [
  // Top scorers / MVP-tier
  "Gilgeous-Alexander", "Jokic", "Doncic", "Tatum", "Antetokounmpo",
  "Edwards", "Wembanyama", "Booker", "Curry", "James",
  // High-usage stars
  "Durant", "Embiid", "Brunson", "Mitchell", "Halliburton",
  "Maxey", "Sabonis", "Ant-Edwards", "Brown", "Harden",
  // Other notable
  "Lillard", "Williamson", "Morant", "Banchero", "Towns",
  "Holmgren", "Fox", "LaVine", "Murray", "Davis",
];

const STATS = ["points", "rebounds", "assists", "steals", "blocks", "turnovers", "minutes"] as const;
type StatKey = (typeof STATS)[number];

interface SinglePrediction {
  date: string;
  opponent?: string;
  pred: Record<StatKey, number>;
  actual: Record<StatKey, number>;
  diff: Record<StatKey, number>;
}

interface PlayerBench {
  query: string;
  playerId?: string;
  fullName?: string;
  sampleSize: number;
  mae: Record<StatKey, number> | null;
  predictions: SinglePrediction[];
  error?: string;
}

function isPlayoffDate(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const m = d.getMonth();
  if (m === 3) return d.getDate() >= 15;
  if (m === 4) return true;
  if (m === 5) return d.getDate() <= 30;
  return false;
}

async function benchmarkPlayer(query: string): Promise<PlayerBench> {
  const provider = getProvider();
  const search = await provider.searchPlayers(query);
  const player = search[0];
  if (!player) return { query, sampleSize: 0, mae: null, predictions: [], error: "not found" };

  // Need the full enriched player (team, etc).
  const enriched = await provider.getPlayer(player.id);
  if (!enriched) return { query, sampleSize: 0, mae: null, predictions: [], error: "no profile" };

  const allLogs = await provider.getPlayerGameLogs(player.id, 30);
  const valid = allLogs.filter((g) => g.minutes >= 10);
  if (valid.length < 6) {
    return {
      query,
      playerId: player.id,
      fullName: enriched.fullName,
      sampleSize: 0,
      mae: null,
      predictions: [],
      error: `only ${valid.length} valid games`,
    };
  }

  // Use most-recent 4 valid games as the test set.
  const testGames = valid.slice(0, 4);

  const [season, injury] = await Promise.all([
    provider.getSeasonAverages(player.id),
    provider.getInjuryContext(player.id),
  ]);

  const predictions: SinglePrediction[] = [];
  for (const target of testGames) {
    // GameLog.id is `${playerId}-${eventId}` for ESPN — extract eventId so we
    // can pull the DraftKings game total from ESPN's summary endpoint.
    const eventId = target.id.split("-").pop();
    const [opp, vegas] = await Promise.all([
      target.opponent ? provider.getOpponentContext(target.opponent) : Promise.resolve(null),
      eventId ? fetchGameOdds(eventId) : Promise.resolve(null),
    ]);
    const { projection } = await buildRetroProjection({
      player: enriched,
      allLogs: valid,
      season,
      injury,
      opponent: opp,
      targetDate: target.date,
      opponentAbbr: target.opponent,
      homeAway: target.homeAway,
      isPlayoffs: isPlayoffDate(target.date),
      vegasGameTotal: vegas?.overUnder,
      eventId,
      dataSource: provider.name,
    });
    const pred = {
      points: projection.projected.points,
      rebounds: projection.projected.rebounds,
      assists: projection.projected.assists,
      steals: projection.projected.steals,
      blocks: projection.projected.blocks,
      turnovers: projection.projected.turnovers,
      minutes: projection.projected.minutes,
    };
    const actual = {
      points: target.points,
      rebounds: target.rebounds,
      assists: target.assists,
      steals: target.steals,
      blocks: target.blocks,
      turnovers: target.turnovers,
      minutes: target.minutes,
    };
    const diff = {} as Record<StatKey, number>;
    for (const s of STATS) diff[s] = round(pred[s] - actual[s], 1);
    predictions.push({
      date: target.date,
      opponent: target.opponent,
      pred,
      actual,
      diff,
    });
  }

  const mae = {} as Record<StatKey, number>;
  for (const s of STATS) {
    const sum = predictions.reduce((a, p) => a + Math.abs(p.diff[s]), 0);
    mae[s] = round(sum / predictions.length, 2);
  }

  return {
    query,
    playerId: player.id,
    fullName: enriched.fullName,
    sampleSize: predictions.length,
    mae,
    predictions,
  };
}

export async function GET(req: Request) {
  // ?players=Curry,LeBron,Embiid  — comma-separated, override default list.
  // ?n=10  — limit count (faster runs).
  const url = new URL(req.url);
  const playersParam = url.searchParams.get("players");
  const limit = Number(url.searchParams.get("n") ?? "0");
  let queries: string[];
  if (playersParam) {
    queries = playersParam.split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    queries = DEFAULT_PLAYER_QUERIES;
  }
  if (limit > 0) queries = queries.slice(0, limit);

  const results = await Promise.all(queries.map(benchmarkPlayer));

  // Aggregate league-wide MAE.
  const overall = {} as Record<StatKey, { sum: number; count: number }>;
  for (const s of STATS) overall[s] = { sum: 0, count: 0 };
  for (const r of results) {
    if (!r.mae) continue;
    for (const s of STATS) {
      overall[s].sum += r.mae[s] * r.sampleSize;
      overall[s].count += r.sampleSize;
    }
  }
  const overallMae = {} as Record<StatKey, number>;
  for (const s of STATS) {
    overallMae[s] = overall[s].count > 0 ? round(overall[s].sum / overall[s].count, 2) : 0;
  }

  return NextResponse.json({
    note: "Backtest: for each player's most-recent ~4 valid games, prediction generated using ONLY games before that date. Compared to ESPN's actual stat line.",
    model: "courtsight-formula-v3.3",
    queriesRun: queries.length,
    overallMae,
    players: results,
    timestamp: new Date().toISOString(),
  });
}
