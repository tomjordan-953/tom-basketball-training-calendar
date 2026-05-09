import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getProvider } from "@/lib/data/providers";
import { buildProjection } from "@/lib/prediction/projectionEngine";
import { fmtStat } from "@/lib/utils/format";
import type { Projection } from "@/types/projection";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { ids?: string };
}

export default async function ComparePage({ searchParams }: Props) {
  const ids = (searchParams.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  const provider = getProvider();
  const cards = await Promise.all(
    ids.map(async (id) => {
      const player = await provider.getPlayer(id);
      if (!player) return null;
      const [logs, season, nextGame, injury] = await Promise.all([
        provider.getPlayerGameLogs(id, 24),
        provider.getSeasonAverages(id),
        provider.getNextGame(id),
        provider.getInjuryContext(id),
      ]);
      const opponent = nextGame ? await provider.getOpponentContext(nextGame.opponent) : null;
      if (logs.length < 3) return { player, projection: null as Projection | null };
      const projection = buildProjection({
        player,
        logs,
        season,
        nextGame,
        opponent,
        injury,
        dataSource: provider.name,
      });
      return { player, projection };
    }),
  );
  const filled = cards.filter((c): c is { player: NonNullable<Awaited<ReturnType<typeof provider.getPlayer>>>; projection: Projection | null } => c !== null);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Compare players</h1>
          <p className="text-sm text-white/50 mt-1">
            Side-by-side season averages and next-game projections. Pass up to 3 player IDs in the URL: <code className="text-accent-cyan">/compare?ids=espn-3112335,espn-4278073</code>
          </p>
        </div>
        <Link href="/players">
          <Button variant="outline" size="sm">Find players to compare →</Button>
        </Link>
      </div>

      {filled.length === 0 ? (
        <EmptyState
          title="Pick players to compare"
          description="Add up to 3 player IDs to the URL, or open two profiles in separate tabs and copy the IDs."
        />
      ) : (
        <Card>
          <CardHeader title={`Comparing ${filled.length} player${filled.length === 1 ? "" : "s"}`} />
          <CardBody className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-white/40 border-b border-white/5">
                    <th className="text-left font-medium px-5 py-2">Stat</th>
                    {filled.map((c) => (
                      <th key={c.player.id} className="text-right font-medium px-3 py-2">
                        <Link
                          href={`/players/${encodeURIComponent(c.player.id)}`}
                          className="text-accent-cyan hover:underline"
                        >
                          {c.player.fullName}
                        </Link>
                        <div className="text-[10px] text-white/40 normal-case tracking-normal">
                          {c.player.teamAbbreviation ?? "—"}
                          {c.player.position ? ` · ${c.player.position}` : ""}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <SectionLabel cols={filled.length} label="Next-game projection (expected)" />
                  {(["points", "rebounds", "assists", "steals", "blocks", "turnovers", "minutes"] as const).map((k) => (
                    <Row
                      key={`proj-${k}`}
                      label={STAT_LABELS[k]}
                      values={filled.map((c) => c.projection?.projected[k])}
                    />
                  ))}
                  <ConfRow values={filled.map((c) => c.projection?.confidence)} />
                  <FormRow values={filled.map((c) => c.projection?.formIndex)} />

                  <SectionLabel cols={filled.length} label="Season averages" />
                  {(["points", "rebounds", "assists", "steals", "blocks", "turnovers", "minutes"] as const).map((k) => (
                    <Row
                      key={`s-${k}`}
                      label={STAT_LABELS[k]}
                      values={filled.map((c) => c.projection?.baselineSeason[k])}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

const STAT_LABELS = {
  points: "PTS",
  rebounds: "REB",
  assists: "AST",
  steals: "STL",
  blocks: "BLK",
  turnovers: "TO",
  minutes: "MIN",
} as const;

function SectionLabel({ cols, label }: { cols: number; label: string }) {
  return (
    <tr>
      <td
        colSpan={cols + 1}
        className="px-5 pt-4 pb-1 text-[10px] uppercase tracking-widest text-white/40"
      >
        {label}
      </td>
    </tr>
  );
}

function Row({ label, values }: { label: string; values: Array<number | undefined> }) {
  const max = Math.max(...values.filter((v): v is number => v !== undefined));
  return (
    <tr className="border-b border-white/[0.04] last:border-0">
      <td className="px-5 py-2 text-white/70 font-medium">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={
            "px-3 py-2 text-right tabular-nums " +
            (v === undefined
              ? "text-white/30"
              : v === max && values.length > 1
                ? "text-accent-green font-semibold"
                : "text-white/85")
          }
        >
          {v === undefined ? "—" : fmtStat(v)}
        </td>
      ))}
    </tr>
  );
}

function ConfRow({ values }: { values: Array<number | undefined> }) {
  return (
    <tr className="border-b border-white/[0.04] last:border-0">
      <td className="px-5 py-2 text-white/70 font-medium">Confidence</td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-2 text-right">
          {v === undefined ? (
            <span className="text-white/30">—</span>
          ) : (
            <Badge tone={v >= 75 ? "positive" : v >= 55 ? "warning" : "danger"}>{v}%</Badge>
          )}
        </td>
      ))}
    </tr>
  );
}

function FormRow({ values }: { values: Array<number | undefined> }) {
  return (
    <tr>
      <td className="px-5 py-2 text-white/70 font-medium">Form index</td>
      {values.map((v, i) => (
        <td key={i} className="px-3 py-2 text-right">
          {v === undefined ? (
            <span className="text-white/30">—</span>
          ) : (
            <Badge tone="purple">{v}</Badge>
          )}
        </td>
      ))}
    </tr>
  );
}
