import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { cn } from "@/lib/utils/cn";
import type { Bracket, BracketMatchup, BracketTeam } from "@/lib/predictions/bracket";

const ROUND_LABELS = ["R1", "Conf SF", "Conf F", "Finals"] as const;

export function BracketView({ bracket }: { bracket: Bracket }) {
  return (
    <Card>
      <CardHeader
        title="Predicted playoff bracket"
        subtitle="Win probabilities = logistic on team scores, clamped 18–82% (NBA series rarely sit above 80%)"
        right={
          bracket.championPick ? (
            <Badge tone="positive" dot>
              Champion: {bracket.championPick.abbreviation}
            </Badge>
          ) : null
        }
      />
      <CardBody>
        {/* Top-down 4-row layout: each conference rendered side by side, with
           the Finals matchup centered at the top. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          <ConferenceColumn label="Eastern Conference" tone="info" data={bracket.east} flip={false} />
          <ConferenceColumn label="Western Conference" tone="purple" data={bracket.west} flip={true} />
        </div>

        {/* NBA Finals matchup */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-center text-[10px] uppercase tracking-widest text-white/40 mb-3">
            NBA Finals
          </p>
          <div className="max-w-2xl mx-auto">
            <MatchupCard m={bracket.finals} highlightChampion />
          </div>
        </div>

        {/* Round legend */}
        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap text-[10px] uppercase tracking-widest text-white/40">
          {ROUND_LABELS.map((r, i) => (
            <span key={r} className="inline-flex items-center gap-1">
              <span className={cn("h-1.5 w-1.5 rounded-full", ["bg-accent-cyan","bg-accent-blue","bg-accent-purple","bg-accent-green"][i])} />
              {r}
            </span>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function ConferenceColumn({
  label,
  tone,
  data,
  flip,
}: {
  label: string;
  tone: "info" | "purple";
  data: Bracket["east"];
  flip: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/85">{label}</h3>
        <Badge tone={tone}>seed line</Badge>
      </div>
      {/* 4 columns of matchups: R1 (4 matchups) → R2 (2) → CF (1).
         Reversed visual order on west side gives the "fanning in" feel. */}
      <div className={cn("grid grid-cols-3 gap-3", flip && "[direction:rtl]")}>
        <div className="space-y-3 [direction:ltr]">
          {data.round1.map((m) => (
            <MatchupCard key={m.id} m={m} compact />
          ))}
        </div>
        <div className="flex flex-col justify-around space-y-3 [direction:ltr]">
          {data.round2.map((m) => (
            <MatchupCard key={m.id} m={m} compact />
          ))}
        </div>
        <div className="flex flex-col justify-center [direction:ltr]">
          <MatchupCard m={data.confFinal} compact />
        </div>
      </div>
    </div>
  );
}

function MatchupCard({
  m,
  compact = false,
  highlightChampion = false,
}: {
  m: BracketMatchup;
  compact?: boolean;
  highlightChampion?: boolean;
}) {
  if (!m.teamA || !m.teamB) {
    return (
      <div className={cn("rounded-xl bg-white/[0.02] ring-1 ring-white/5 px-3 py-2 text-[11px] text-white/40", compact && "text-[10px]")}>
        TBD
      </div>
    );
  }
  const winnerSide = m.winProbA >= 0.5 ? "A" : "B";
  return (
    <div
      className={cn(
        "rounded-xl ring-1 px-3 py-2.5 transition relative overflow-hidden",
        highlightChampion
          ? "bg-gradient-to-br from-accent-green/15 to-accent-cyan/10 ring-accent-green/40"
          : "bg-white/[0.03] ring-white/5 hover:ring-white/15",
      )}
    >
      <TeamRow team={m.teamA} prob={m.winProbA} isWinner={winnerSide === "A"} highlightChampion={highlightChampion} compact={compact} />
      <TeamRow team={m.teamB} prob={m.winProbB} isWinner={winnerSide === "B"} highlightChampion={highlightChampion} compact={compact} />
      {!compact && m.reasoning && (
        <p className="mt-2 pt-2 border-t border-white/5 text-[10px] text-white/45 leading-snug">
          {m.reasoning}
        </p>
      )}
    </div>
  );
}

function TeamRow({
  team,
  prob,
  isWinner,
  highlightChampion,
  compact,
}: {
  team: BracketTeam;
  prob: number;
  isWinner: boolean;
  highlightChampion: boolean;
  compact: boolean;
}) {
  return (
    <div className="relative flex items-center gap-2 py-1">
      {/* Probability bar in background */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded transition-all",
          isWinner
            ? highlightChampion
              ? "bg-accent-green/15"
              : "bg-accent-cyan/12"
            : "bg-white/[0.02]",
        )}
        style={{ width: `${(prob * 100).toFixed(0)}%` }}
        aria-hidden
      />
      <div className="relative flex items-center gap-2 flex-1 min-w-0">
        <TeamLogo abbreviation={team.abbreviation} size={compact ? "sm" : "md"} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-semibold tabular-nums truncate",
              compact ? "text-xs" : "text-sm",
              isWinner ? "text-white" : "text-white/55",
            )}
          >
            <span className={compact ? "text-[10px] mr-1.5 text-white/40" : "text-[11px] mr-1.5 text-white/40"}>
              {team.seed}
            </span>
            {team.abbreviation}
            {team.starInjured && <span className="ml-1 text-accent-red">⚠</span>}
          </p>
        </div>
        <p
          className={cn(
            "tabular-nums font-mono",
            compact ? "text-[10px]" : "text-xs",
            isWinner ? (highlightChampion ? "text-accent-green" : "text-accent-cyan") : "text-white/40",
          )}
        >
          {(prob * 100).toFixed(0)}%
        </p>
      </div>
    </div>
  );
}
