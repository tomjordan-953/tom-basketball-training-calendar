import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { fmtStat, round } from "@/lib/utils/format";
import { shortDate } from "@/lib/utils/dates";
import type { PredictionRecord } from "@/types/tracking";

export function TrackRecordCard({
  records,
}: {
  records: PredictionRecord[];
}) {
  const settled = records.filter((r) => r.actual);
  const pending = records.length - settled.length;
  const avg = settled.length
    ? round(
        settled.reduce((a, r) => a + (r.accuracy ?? 0), 0) / settled.length,
        1,
      )
    : 0;
  return (
    <Card>
      <CardHeader
        title="Prediction track record"
        subtitle={
          settled.length === 0
            ? "No graded predictions yet — come back after the next game."
            : `${settled.length} graded · ${pending} pending`
        }
        right={
          settled.length > 0 ? (
            <Badge tone={avg >= 70 ? "positive" : avg >= 55 ? "warning" : "danger"} dot>
              {avg}% avg accuracy
            </Badge>
          ) : (
            <Badge tone="neutral">awaiting grades</Badge>
          )
        }
      />
      <CardBody className="px-0 pb-0">
        {records.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-white/50">
            Predictions you generate by visiting this player will appear here once the matching real game has been played.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-white/40 border-b border-white/5">
                  <th className="text-left font-medium px-5 py-2">Predicted on</th>
                  <th className="text-right font-medium px-2 py-2">Pred PTS/REB/AST</th>
                  <th className="text-right font-medium px-2 py-2">Actual PTS/REB/AST</th>
                  <th className="text-right font-medium px-5 py-2">Acc.</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 8).map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-2 text-white/70">{shortDate(r.generatedAt)}</td>
                    <td className="px-2 py-2 text-right text-white/80 tabular-nums">
                      {fmtStat(r.predicted.points)} / {fmtStat(r.predicted.rebounds)} / {fmtStat(r.predicted.assists)}
                    </td>
                    <td className="px-2 py-2 text-right text-white tabular-nums">
                      {r.actual ? `${r.actual.points} / ${r.actual.rebounds} / ${r.actual.assists}` : "—"}
                    </td>
                    <td
                      className={
                        "px-5 py-2 text-right tabular-nums " +
                        (r.accuracy === undefined
                          ? "text-white/40"
                          : r.accuracy >= 75
                            ? "text-accent-green"
                            : r.accuracy >= 55
                              ? "text-accent-orange"
                              : "text-accent-red")
                      }
                    >
                      {r.accuracy !== undefined ? `${r.accuracy.toFixed(1)}%` : "pending"}
                      {r.hit && <span className="ml-1.5 text-accent-green">✓</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
