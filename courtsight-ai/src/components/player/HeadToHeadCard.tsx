import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TeamLogo } from "@/components/ui/TeamLogo";
import { fmtStat } from "@/lib/utils/format";
import { shortDate } from "@/lib/utils/dates";
import type { GameLog } from "@/types/stats";

interface Props {
  logs: GameLog[];
  opponent?: string;
  oppInjuryPlayers?: string[];
}

export function HeadToHeadCard({ logs, opponent, oppInjuryPlayers = [] }: Props) {
  if (!opponent) {
    return (
      <Card>
        <CardHeader title="Head-to-head + opponent context" />
        <CardBody>
          <p className="text-sm text-white/50">
            No upcoming opponent set — head-to-head and injury context unavailable.
          </p>
        </CardBody>
      </Card>
    );
  }
  const games = logs.filter(
    (g) => (g.opponent ?? "").toUpperCase() === opponent.toUpperCase(),
  );
  const recent = games.slice(0, 5);
  const avg = (k: keyof GameLog) => {
    if (recent.length === 0) return 0;
    let total = 0;
    for (const g of recent) {
      const v = (g as unknown as Record<string, unknown>)[k as string];
      if (typeof v === "number") total += v;
    }
    return total / recent.length;
  };

  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-2">
            <span>Head-to-head vs</span>
            <TeamLogo abbreviation={opponent} size="sm" />
            <span>{opponent}</span>
          </span>
        }
        subtitle={
          recent.length > 0
            ? `${recent.length} prior matchup${recent.length === 1 ? "" : "s"} this season`
            : "No prior matchups this season"
        }
        right={
          oppInjuryPlayers.length > 0 ? (
            <Badge tone="warning">{oppInjuryPlayers.length} opp. listed Out / DTD</Badge>
          ) : null
        }
      />
      <CardBody>
        {recent.length === 0 ? (
          <p className="text-sm text-white/50">
            No head-to-head signal — projection runs on overall form vs season averages.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
              <Stat label="MIN" value={fmtStat(avg("minutes"))} />
              <Stat label="PTS" value={fmtStat(avg("points"))} highlight />
              <Stat label="REB" value={fmtStat(avg("rebounds"))} />
              <Stat label="AST" value={fmtStat(avg("assists"))} />
              <Stat label="TO" value={fmtStat(avg("turnovers"))} />
            </div>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-white/40 border-b border-white/5">
                    <th className="text-left font-medium px-2 py-2">Date</th>
                    <th className="text-left font-medium px-2 py-2">Side</th>
                    <th className="text-right font-medium px-2 py-2">MIN</th>
                    <th className="text-right font-medium px-2 py-2">PTS</th>
                    <th className="text-right font-medium px-2 py-2">REB</th>
                    <th className="text-right font-medium px-2 py-2">AST</th>
                    <th className="text-right font-medium px-2 py-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((g) => (
                    <tr key={g.id} className="border-b border-white/[0.04] last:border-0">
                      <td className="px-2 py-1.5 text-white/70 tabular-nums">{shortDate(g.date)}</td>
                      <td className="px-2 py-1.5 text-white/60">
                        {g.homeAway === "away" ? "@" : "vs"}
                      </td>
                      <td className="px-2 py-1.5 text-right text-white/80 tabular-nums">{fmtStat(g.minutes)}</td>
                      <td className="px-2 py-1.5 text-right text-white tabular-nums font-medium">{g.points}</td>
                      <td className="px-2 py-1.5 text-right text-white/80 tabular-nums">{g.rebounds}</td>
                      <td className="px-2 py-1.5 text-right text-white/80 tabular-nums">{g.assists}</td>
                      <td className="px-2 py-1.5 text-right">
                        {g.result === "W" && <span className="text-accent-green">W</span>}
                        {g.result === "L" && <span className="text-accent-red">L</span>}
                        {!g.result && <span className="text-white/30">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {oppInjuryPlayers.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/5">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
              Opponent injuries (live ESPN)
            </p>
            <p className="text-xs text-white/60 leading-relaxed">
              {oppInjuryPlayers.slice(0, 6).join(" · ")}
              {oppInjuryPlayers.length > 6 ? ` · +${oppInjuryPlayers.length - 6} more` : ""}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={
        "rounded-xl px-3 py-3 text-center ring-1 " +
        (highlight
          ? "bg-gradient-to-br from-accent-cyan/15 to-accent-blue/10 ring-accent-cyan/30"
          : "bg-white/[0.03] ring-white/5")
      }
    >
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
      <p className="mt-1 text-base font-semibold text-white tabular-nums">{value}</p>
    </div>
  );
}
