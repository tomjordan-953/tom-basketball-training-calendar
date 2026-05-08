import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { CareerTrendChart } from "@/components/charts/CareerTrendChart";
import { fmtStat } from "@/lib/utils/format";
import type { CareerSeason } from "@/types/stats";

export function CareerOverview({ seasons }: { seasons: CareerSeason[] }) {
  if (seasons.length === 0) {
    return (
      <Card>
        <CardHeader title="Career overview" />
        <CardBody>
          <p className="text-sm text-white/50">
            Career season aggregates not available from the connected provider.
          </p>
        </CardBody>
      </Card>
    );
  }
  const best = seasons.reduce((b, s) => (s.points > b.points ? s : b), seasons[0]);
  const career = {
    gp: seasons.reduce((a, s) => a + s.gamesPlayed, 0),
    pts:
      seasons.reduce((a, s) => a + s.points * s.gamesPlayed, 0) /
      Math.max(1, seasons.reduce((a, s) => a + s.gamesPlayed, 0)),
    reb:
      seasons.reduce((a, s) => a + s.rebounds * s.gamesPlayed, 0) /
      Math.max(1, seasons.reduce((a, s) => a + s.gamesPlayed, 0)),
    ast:
      seasons.reduce((a, s) => a + s.assists * s.gamesPlayed, 0) /
      Math.max(1, seasons.reduce((a, s) => a + s.gamesPlayed, 0)),
  };
  return (
    <Card>
      <CardHeader
        title="Career overview"
        subtitle={`${seasons.length} seasons · best PTS season ${best.season}`}
      />
      <CardBody>
        <div className="grid sm:grid-cols-4 gap-3 mb-5">
          <Stat label="Career GP" value={String(career.gp)} />
          <Stat label="Career PTS" value={fmtStat(career.pts)} />
          <Stat label="Career REB" value={fmtStat(career.reb)} />
          <Stat label="Career AST" value={fmtStat(career.ast)} />
        </div>
        <CareerTrendChart seasons={seasons} />
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
