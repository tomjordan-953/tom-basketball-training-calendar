import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { fmtStat } from "@/lib/utils/format";
import type { SeasonAverages } from "@/types/stats";

export function PlayerProfileCard({
  season,
}: {
  season: SeasonAverages | null;
}) {
  return (
    <Card>
      <CardHeader
        title="Season averages"
        subtitle={season ? `${season.season} · ${season.gamesPlayed} GP` : "No season data"}
      />
      <CardBody>
        {!season ? (
          <p className="text-sm text-white/50">Season averages unavailable.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
            <Stat label="MIN" value={fmtStat(season.minutes)} />
            <Stat label="PTS" value={fmtStat(season.points)} />
            <Stat label="REB" value={fmtStat(season.rebounds)} />
            <Stat label="AST" value={fmtStat(season.assists)} />
            <Stat label="STL" value={fmtStat(season.steals)} />
            <Stat label="BLK" value={fmtStat(season.blocks)} />
            <Stat label="TO" value={fmtStat(season.turnovers)} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/5 px-3 py-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white tabular-nums">{value}</p>
    </div>
  );
}
