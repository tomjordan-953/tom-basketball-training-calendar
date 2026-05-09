import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { computeAccuracyStats } from "@/lib/tracking/grader";
import { isWritable } from "@/lib/tracking/store";
import { fmtStat } from "@/lib/utils/format";
import { shortDate } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export default async function AccuracyPage() {
  const stats = await computeAccuracyStats();
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Model accuracy</h1>
          <p className="text-sm text-white/50 mt-1">
            Track record of CourtSight projections vs the actual stat lines that followed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">{stats.totalPredictions} total</Badge>
          <Badge tone="positive" dot>
            {stats.graded} graded
          </Badge>
          <Badge tone="warning">{stats.pending} pending</Badge>
          {!isWritable() && (
            <Badge tone="danger">Read-only FS — in-memory only</Badge>
          )}
        </div>
      </div>

      {stats.graded === 0 ? (
        <EmptyState
          title="No graded predictions yet"
          description="Visit a player profile to record a projection. Once that player plays a real game (data via ESPN), the prediction will be graded automatically the next time you load their page."
          action={
            <Link href="/players">
              <Button variant="outline" size="sm">Browse players</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Headline label="Overall accuracy" value={`${stats.overallAccuracyPct}%`} tone="info" />
            <Headline label="Hit rate (PTS/REB/AST within tolerance)" value={`${stats.hitRatePct}%`} tone="positive" />
            <Headline label="Predictions graded" value={String(stats.graded)} tone="purple" />
          </div>

          <Card>
            <CardHeader title="Per-stat error" subtitle="MAE = mean absolute error vs actual" />
            <CardBody className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-white/40 border-b border-white/5">
                      <th className="text-left font-medium px-5 py-2">Stat</th>
                      <th className="text-right font-medium px-2 py-2">MAE</th>
                      <th className="text-right font-medium px-5 py-2">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.byStat).map(([k, v]) => (
                      <tr key={k} className="border-b border-white/[0.04] last:border-0">
                        <td className="px-5 py-2 text-white/80 capitalize">{k}</td>
                        <td className="px-2 py-2 text-right text-white tabular-nums">±{fmtStat(v.mae)}</td>
                        <td className="px-5 py-2 text-right tabular-nums">
                          <span
                            className={
                              v.accuracyPct >= 70
                                ? "text-accent-green"
                                : v.accuracyPct >= 50
                                  ? "text-accent-orange"
                                  : "text-accent-red"
                            }
                          >
                            {v.accuracyPct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Recent graded predictions" />
            <CardBody className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-white/40 border-b border-white/5">
                      <th className="text-left font-medium px-5 py-2">Player</th>
                      <th className="text-left font-medium px-2 py-2">Date</th>
                      <th className="text-right font-medium px-2 py-2">Pred (PTS/REB/AST)</th>
                      <th className="text-right font-medium px-2 py-2">Actual (PTS/REB/AST)</th>
                      <th className="text-right font-medium px-5 py-2">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent.map((r) => (
                      <tr key={r.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                        <td className="px-5 py-2">
                          <Link
                            className="text-accent-cyan hover:underline"
                            href={`/players/${encodeURIComponent(r.playerId)}`}
                          >
                            {r.playerName}
                          </Link>
                        </td>
                        <td className="px-2 py-2 text-white/60">
                          {r.targetDate ? shortDate(r.targetDate) : shortDate(r.generatedAt)}
                        </td>
                        <td className="px-2 py-2 text-right text-white/80 tabular-nums">
                          {fmtStat(r.predicted.points)} / {fmtStat(r.predicted.rebounds)} / {fmtStat(r.predicted.assists)}
                        </td>
                        <td className="px-2 py-2 text-right text-white tabular-nums">
                          {r.actual ? `${r.actual.points} / ${r.actual.rebounds} / ${r.actual.assists}` : "—"}
                        </td>
                        <td
                          className={
                            "px-5 py-2 text-right tabular-nums " +
                            ((r.accuracy ?? 0) >= 75
                              ? "text-accent-green"
                              : (r.accuracy ?? 0) >= 55
                                ? "text-accent-orange"
                                : "text-accent-red")
                          }
                        >
                          {(r.accuracy ?? 0).toFixed(1)}%
                          {r.hit && <span className="ml-2 text-accent-green">✓</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      <Card>
        <CardBody className="text-xs text-white/55 leading-relaxed">
          Tolerance per stat: PTS ±4, REB ±2, AST ±2, STL ±1, BLK ±1, TO ±1.5, MIN ±4. A prediction is a "hit" if PTS, REB, and AST are all within tolerance. Per-stat accuracy is a smooth function — closer to actual = higher score, capped at 100. Sports analytics projection — not betting advice.
        </CardBody>
      </Card>
    </div>
  );
}

function Headline({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "info" | "positive" | "purple";
}) {
  return (
    <Card>
      <CardBody>
        <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-white tabular-nums">{value}</p>
        <Badge tone={tone} className="mt-3">
          {tone === "info" ? "weighted" : tone === "positive" ? "tolerance" : "all-time"}
        </Badge>
      </CardBody>
    </Card>
  );
}
