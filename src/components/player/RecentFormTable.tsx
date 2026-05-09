import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { shortDate } from "@/lib/utils/dates";
import { fmtStat } from "@/lib/utils/format";
import type { GameLog } from "@/types/stats";

export function RecentFormTable({ logs }: { logs: GameLog[] }) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader title="Recent game log" />
        <CardBody>
          <p className="text-sm text-white/50">No recent games available.</p>
        </CardBody>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader title="Recent game log" subtitle={`Last ${logs.length} games`} />
      <CardBody className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-white/40 border-b border-white/5">
                <th className="text-left font-medium px-5 py-2">Date</th>
                <th className="text-left font-medium px-2 py-2">Opp</th>
                <th className="text-right font-medium px-2 py-2">MIN</th>
                <th className="text-right font-medium px-2 py-2">PTS</th>
                <th className="text-right font-medium px-2 py-2">REB</th>
                <th className="text-right font-medium px-2 py-2">AST</th>
                <th className="text-right font-medium px-2 py-2">STL</th>
                <th className="text-right font-medium px-2 py-2">BLK</th>
                <th className="text-right font-medium px-5 py-2">TO</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((g) => (
                <tr
                  key={g.id}
                  className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-2 text-white/70 tabular-nums">{shortDate(g.date)}</td>
                  <td className="px-2 py-2 text-white/60">
                    {g.homeAway === "away" ? "@ " : "vs "}
                    {g.opponent ?? "—"}
                  </td>
                  <td className="px-2 py-2 text-right text-white/80 tabular-nums">{fmtStat(g.minutes)}</td>
                  <td className="px-2 py-2 text-right text-white tabular-nums font-medium">{g.points}</td>
                  <td className="px-2 py-2 text-right text-white/80 tabular-nums">{g.rebounds}</td>
                  <td className="px-2 py-2 text-right text-white/80 tabular-nums">{g.assists}</td>
                  <td className="px-2 py-2 text-right text-white/60 tabular-nums">{g.steals}</td>
                  <td className="px-2 py-2 text-right text-white/60 tabular-nums">{g.blocks}</td>
                  <td className="px-5 py-2 text-right text-white/60 tabular-nums">{g.turnovers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
