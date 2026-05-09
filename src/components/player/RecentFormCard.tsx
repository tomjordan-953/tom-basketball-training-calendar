import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { fmtSigned, fmtStat, stddev } from "@/lib/utils/format";
import { recentForm, statAverage, statValues } from "@/lib/prediction/trendUtils";
import type { GameLog, SeasonAverages } from "@/types/stats";

interface Row {
  label: string;
  l5: number;
  l10: number;
  delta: number;
  hot: "hot" | "cold" | "neutral";
}

function rowsFor(logs: GameLog[], season: SeasonAverages | null): Row[] {
  const keys: Array<{ k: keyof Pick<GameLog, "points" | "rebounds" | "assists" | "minutes">; label: string }> = [
    { k: "points", label: "PTS" },
    { k: "rebounds", label: "REB" },
    { k: "assists", label: "AST" },
    { k: "minutes", label: "MIN" },
  ];
  return keys.map(({ k, label }) => {
    const l5 = statAverage(recentForm(logs, 5), k);
    const l10 = statAverage(recentForm(logs, 10), k);
    const seasonVal = season ? (season as unknown as Record<string, number>)[k] ?? l10 : l10;
    const delta = l5 - seasonVal;
    let hot: Row["hot"] = "neutral";
    if (k !== "minutes") {
      if (delta >= seasonVal * 0.12) hot = "hot";
      else if (delta <= -seasonVal * 0.12) hot = "cold";
    }
    return { label, l5, l10, delta, hot };
  });
}

export function RecentFormCard({
  logs,
  season,
}: {
  logs: GameLog[];
  season: SeasonAverages | null;
}) {
  const rows = rowsFor(logs, season);
  const minutesSd = stddev(statValues(recentForm(logs, 10), "minutes"));
  const minutesStable = minutesSd < 4;
  return (
    <Card>
      <CardHeader
        title="Recent form"
        subtitle="Last 5 vs last 10 vs season"
        right={
          <Badge tone={minutesStable ? "positive" : "warning"} dot>
            Minutes {minutesStable ? "stable" : "volatile"} (σ {minutesSd.toFixed(1)})
          </Badge>
        }
      />
      <CardBody>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-white/40 border-b border-white/5">
                <th className="text-left font-medium px-2 py-2">Stat</th>
                <th className="text-right font-medium px-2 py-2">Last 5</th>
                <th className="text-right font-medium px-2 py-2">Last 10</th>
                <th className="text-right font-medium px-2 py-2">vs season</th>
                <th className="text-right font-medium px-2 py-2">Trend</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-2 py-2 text-white/80 font-medium">{r.label}</td>
                  <td className="px-2 py-2 text-right text-white tabular-nums">{fmtStat(r.l5)}</td>
                  <td className="px-2 py-2 text-right text-white/80 tabular-nums">{fmtStat(r.l10)}</td>
                  <td
                    className={
                      "px-2 py-2 text-right tabular-nums " +
                      (r.delta > 0
                        ? "text-accent-green"
                        : r.delta < 0
                          ? "text-accent-red"
                          : "text-white/50")
                    }
                  >
                    {fmtSigned(r.delta)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {r.hot === "hot" && <Badge tone="positive">Hot</Badge>}
                    {r.hot === "cold" && <Badge tone="danger">Cold</Badge>}
                    {r.hot === "neutral" && <Badge tone="neutral">—</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
