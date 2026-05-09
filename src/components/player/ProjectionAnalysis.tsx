import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { Projection, ProjectionFactor } from "@/types/projection";

const STAT_LABEL: Record<string, string> = {
  points: "Points",
  rebounds: "Rebounds",
  assists: "Assists",
  steals: "Steals",
  blocks: "Blocks",
  turnovers: "Turnovers",
  minutes: "Minutes",
};

const GROUP_TONE: Record<string, "info" | "positive" | "warning" | "danger" | "purple" | "neutral"> = {
  form: "info",
  minutes: "purple",
  matchup: "positive",
  rest: "warning",
  volatility: "danger",
  data: "neutral",
  injury: "danger",
};

const IMPACT_DOT: Record<ProjectionFactor["impact"], string> = {
  positive: "bg-accent-green",
  negative: "bg-accent-red",
  neutral: "bg-white/30",
};

function groupFactors(factors: ProjectionFactor[]) {
  const buckets: Record<string, ProjectionFactor[]> = {};
  for (const f of factors) {
    const g = f.group ?? "form";
    (buckets[g] ??= []).push(f);
  }
  return buckets;
}

export function ProjectionAnalysis({ projection }: { projection: Projection }) {
  const groups = groupFactors(projection.factors);
  const groupOrder = ["form", "minutes", "matchup", "rest", "volatility", "injury", "data"];

  return (
    <Card>
      <CardHeader
        title="Projection analysis"
        subtitle="Why the model expects what it expects"
        right={
          <Badge tone="purple">
            v2 advanced formula
          </Badge>
        }
      />
      <CardBody className="space-y-6">
        <p className="text-sm text-white/85 leading-relaxed">
          {projection.summary}
        </p>

        <section>
          <h4 className="text-[10px] uppercase tracking-widest text-white/40 mb-3">
            Factor cards
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groupOrder.map((g) => {
              const items = groups[g];
              if (!items || items.length === 0) return null;
              const tone = GROUP_TONE[g] ?? "neutral";
              return (
                <div
                  key={g}
                  className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge tone={tone}>{titleCase(g)}</Badge>
                  </div>
                  <ul className="space-y-1.5">
                    {items.map((f, i) => (
                      <li key={i} className="flex gap-2 items-start text-xs">
                        <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", IMPACT_DOT[f.impact])} />
                        <span className="text-white/75">{f.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h4 className="text-[10px] uppercase tracking-widest text-white/40 mb-3">
            Stat-by-stat explanation
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(projection.statBreakdown).map(([key, sb]) => (
              <div
                key={key}
                className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-white">{STAT_LABEL[key] ?? key}</p>
                  <span className="text-xs text-white/50 tabular-nums">
                    {sb.expected.toFixed(1)}{" "}
                    <span className="text-white/30">
                      ({sb.floor.toFixed(1)}–{sb.ceiling.toFixed(1)})
                    </span>
                  </span>
                </div>
                <p className="text-xs text-white/65 leading-relaxed">
                  {sb.explanation}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-white/40">
                  <span>Per-stat conf {sb.confidence}%</span>
                  <span>·</span>
                  <span className="capitalize">trend {sb.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
              Confidence
            </p>
            <p className="text-sm text-white/85 leading-relaxed">
              {projection.confidenceExplanation}
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
              Risk
            </p>
            <p className="text-sm text-white/85 leading-relaxed">
              {projection.riskExplanation}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-white/5 bg-ink-900/40 p-4 text-xs text-white/55 leading-relaxed">
          <p className="font-medium text-white/70 mb-1.5">Data limitations</p>
          <ul className="space-y-1">
            {projection.dataQuality.notes.length === 0 ? (
              <li>
                · Data inputs are complete to the best the connected provider supports.
              </li>
            ) : (
              projection.dataQuality.notes.map((n, i) => <li key={i}>· {n}</li>)
            )}
            <li>
              · Projection is based on recent and season performance — it is not a guaranteed outcome.
            </li>
            <li>· Sports analytics projection, not betting advice.</li>
          </ul>
        </section>
      </CardBody>
    </Card>
  );
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
