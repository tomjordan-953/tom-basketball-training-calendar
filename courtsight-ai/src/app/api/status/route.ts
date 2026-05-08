import { NextResponse } from "next/server";
import { getProvider } from "@/lib/data/providers";
import { cacheStats } from "@/lib/data/cache";
import { MODEL_VERSION } from "@/lib/prediction/projectionEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  const provider = getProvider();
  return NextResponse.json({
    app: process.env.NEXT_PUBLIC_APP_NAME ?? "CourtSight AI",
    version: "2.0",
    versionTag: "v2.0 Real Data Intelligence",
    model: MODEL_VERSION,
    provider: {
      name: provider.name,
      mode: provider.status.mode,
      label: provider.status.label,
      isLive: provider.status.isLive,
      message: provider.status.message,
      apiKeyConfigured: provider.status.apiKeyConfigured,
      hasInjurySource: provider.status.hasInjurySource,
      hasNewsSource: provider.status.hasNewsSource,
      fallbackReason: provider.status.fallbackReason ?? null,
    },
    cache: cacheStats(),
    notes: [
      "Sports analytics projection — not betting advice.",
      "Injury/news fields show real data only when a verified provider is connected.",
    ],
    serverTime: new Date().toISOString(),
  });
}
