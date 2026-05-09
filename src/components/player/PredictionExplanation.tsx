import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { Projection } from "@/types/projection";
import { cn } from "@/lib/utils/cn";

const DOT = {
  positive: "bg-accent-green",
  negative: "bg-accent-red",
  neutral: "bg-white/30",
};

export function PredictionExplanation({ projection }: { projection: Projection }) {
  return (
    <Card>
      <CardHeader
        title="Why this prediction?"
        subtitle="Deterministic factor breakdown"
      />
      <CardBody>
        <ul className="space-y-3">
          {projection.factors.map((f, i) => (
            <li key={i} className="flex gap-3 items-start text-sm">
              <span
                className={cn(
                  "mt-1.5 h-2 w-2 rounded-full shrink-0",
                  DOT[f.impact],
                )}
              />
              <div>
                <p className="text-white/90">
                  <span className="font-medium">{f.label}:</span>{" "}
                  <span className="text-white/70">{f.description}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
        {projection.explanation.length > projection.factors.length && (
          <div className="mt-5 pt-4 border-t border-white/5 text-xs text-white/50 space-y-1.5">
            {projection.explanation
              .slice(projection.factors.length)
              .map((line, i) => (
                <p key={i}>· {line}</p>
              ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
