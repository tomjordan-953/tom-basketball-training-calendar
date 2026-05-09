import { NextResponse } from "next/server";
import { computeAccuracyStats } from "@/lib/tracking/grader";
import { isWritable } from "@/lib/tracking/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await computeAccuracyStats();
  return NextResponse.json({
    ...stats,
    storageWritable: isWritable(),
    note: "Predictions are recorded on every player-profile visit and graded against ESPN's gamelog when the matching real game has been played.",
  });
}
