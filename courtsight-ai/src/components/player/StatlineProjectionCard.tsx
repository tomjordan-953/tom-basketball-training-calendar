import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { fmtStat } from "@/lib/utils/format";
import { formatCacheAge } from "@/lib/data/cache";
import type { Projection } from "@/types/projection";

const RISK_TONE = {
  Low: "positive",
  Medium: "warning",
  High: "danger",
} as const;

const STAT_ORDER: Array<{ key: keyof Projection["projected"]; label: string; highlight?: boolean }> = [
  { key: "points", label: "PTS", highlight: true },
  { key: "rebounds", label: "REB" },
  { key: "assists", label: "AST" },
  { key: "steals", label: "STL" },
  { key: "blocks", label: "BLK" },
  { key: "turnovers", label: "TO" },
  { key: "minutes", label: "MIN" },
];

export function StatlineProjectionCard({ projection }: { projection: Projection }) {
  const freshness =
    projection.dataQuality.freshnessAgeMs !== undefined
      ? formatCacheAge(projection.dataQuality.freshnessAgeMs)
      : "fresh";
  return (
    <Card className="overflow-visible">
      <CardHeader
        title="Next-game projection"
        subtitle={
          projection.opponent
            ? `vs ${projection.opponent} · ${projection.homeAway === "home" ? "Home" : "Away"}`
            : "Advanced formula-based projection"
        }
        right={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Badge tone={RISK_TONE[projection.riskLevel]} dot>
              {projection.riskLevel} risk
            </Badge>
            <Badge tone="info">{projection.confidence}% conf</Badge>
            <Badge tone="purple">Form {projection.formIndex}</Badge>
          </div>
        }
      />
      <CardBody>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {STAT_ORDER.map(({ key, label, highlight }) => {
            const sb = projection.statBreakdown[key];
            return (
              <Cell
                key={key}
                label={label}
                expected={fmtStat(sb.expected)}
                floor={fmtStat(sb.floor)}
                ceiling={fmtStat(sb.ceiling)}
                conf={sb.confidence}
                trend={sb.trend}
                highlight={highlight}
              />
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <ConfidenceBar value={projection.confidence} />
          <p className="text-[11px] text-white/40">
            Model {projection.modelVersion} · cache {freshness} · generated{" "}
            {new Date(projection.generatedAt).toLocaleTimeString()}
          </p>
        </div>
        {projection.riskFlags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {projection.riskFlags.map((flag) => (
              <Badge key={flag} tone="warning">
                {flag}
              </Badge>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function trendArrow(trend: "up" | "down" | "flat") {
  if (trend === "up") return { icon: "▲", className: "text-accent-green" };
  if (trend === "down") return { icon: "▼", className: "text-accent-red" };
  return { icon: "▬", className: "text-white/30" };
}

function Cell({
  label,
  expected,
  floor,
  ceiling,
  conf,
  trend,
  highlight,
}: {
  label: string;
  expected: string;
  floor: string;
  ceiling: string;
  conf: number;
  trend: "up" | "down" | "flat";
  highlight?: boolean;
}) {
  const arrow = trendArrow(trend);
  return (
    <div
      className={
        "rounded-xl px-3 py-3 text-center ring-1 transition " +
        (highlight
          ? "bg-gradient-to-br from-accent-cyan/15 to-accent-blue/10 ring-accent-cyan/30"
          : "bg-white/[0.03] ring-white/5 hover:bg-white/[0.05]")
      }
    >
      <div className="flex items-center justify-center gap-1.5">
        <p className="text-[10px] uppercase tracking-widest text-white/50">{label}</p>
        <span className={`text-[10px] ${arrow.className}`}>{arrow.icon}</span>
      </div>
      <p className="mt-0.5 text-2xl font-semibold text-white tabular-nums">{expected}</p>
      <p className="mt-0.5 text-[10px] text-white/40 tabular-nums">
        <span className="text-white/50">{floor}</span>
        <span className="mx-1">·</span>
        <span className="text-white/50">{ceiling}</span>
      </p>
      <p className="mt-0.5 text-[9px] text-white/30 uppercase tracking-widest">{conf}%</p>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <span className="text-[11px] uppercase tracking-widest text-white/40">
        Confidence
      </span>
      <div className="relative flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-cyan to-accent-purple"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-white/70 tabular-nums">{value}%</span>
    </div>
  );
}
