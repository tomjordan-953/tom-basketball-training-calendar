import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { InjuryNote, PlayerNewsItem } from "@/types/player";
import type { NextGameContext } from "@/types/stats";
import { shortDate } from "@/lib/utils/dates";

const INJURY_TONE = {
  Active: "positive",
  "Day-to-Day": "warning",
  Questionable: "warning",
  Out: "danger",
  Unknown: "neutral",
} as const;

export function PlayerBadges({
  injury,
  nextGame,
  news,
  hasInjurySource,
  hasNewsSource,
}: {
  injury: InjuryNote | null;
  nextGame: NextGameContext | null;
  news: PlayerNewsItem[];
  hasInjurySource: boolean;
  hasNewsSource: boolean;
}) {
  return (
    <Card>
      <CardHeader title="Status & context" />
      <CardBody className="space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
            Injury / availability
          </p>
          {injury && injury.status !== "Unknown" ? (
            <div className="flex items-start gap-2">
              <Badge tone={INJURY_TONE[injury.status]} dot>
                {injury.status}
              </Badge>
              {injury.note && (
                <p className="text-xs text-white/60">{injury.note}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-white/50">
              {hasInjurySource
                ? "No active injury reported."
                : "No verified injury/news source connected."}
            </p>
          )}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
            Next game
          </p>
          {nextGame ? (
            <p className="text-sm text-white/80">
              {shortDate(nextGame.date)} ·{" "}
              {nextGame.homeAway === "home" ? "vs" : "@"} {nextGame.opponent}
              <span className="text-white/40">
                {" "}
                · {nextGame.daysOfRest}d rest{nextGame.isBackToBack ? " (B2B)" : ""}
              </span>
            </p>
          ) : (
            <p className="text-xs text-white/50">Schedule data unavailable.</p>
          )}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">
            Recent notes
          </p>
          {!hasNewsSource ? (
            <p className="text-xs text-white/50">
              News provider not connected.
            </p>
          ) : news.length === 0 ? (
            <p className="text-xs text-white/50">No recent notes.</p>
          ) : (
            <ul className="space-y-2">
              {news.slice(0, 3).map((n) => (
                <li key={n.id} className="text-xs text-white/70">
                  <span className="text-white/40">{shortDate(n.date)}</span> ·{" "}
                  {n.headline}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
