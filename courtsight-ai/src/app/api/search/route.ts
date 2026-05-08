import { NextResponse } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/data/providers";
import { TTL, cachedWithMeta } from "@/lib/data/cache";

const Query = z.object({ q: z.string().min(1).max(60) });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = Query.safeParse({ q: searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ players: [] });
  }
  const provider = getProvider();
  try {
    const read = await cachedWithMeta(
      `search:${provider.name}:${parsed.data.q.toLowerCase()}`,
      TTL.search,
      () => provider.searchPlayers(parsed.data.q),
    );
    return NextResponse.json({
      players: read.value,
      source: provider.name,
      providerLabel: provider.status.label,
      cache: { ageMs: read.meta.ageMs },
    });
  } catch {
    return NextResponse.json(
      { players: [], error: "Provider unavailable" },
      { status: 200 },
    );
  }
}
