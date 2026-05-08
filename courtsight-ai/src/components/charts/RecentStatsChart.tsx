"use client";

import { memo, useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { shortDate } from "@/lib/utils/dates";
import type { GameLog } from "@/types/stats";

function RecentStatsChartImpl({ logs }: { logs: GameLog[] }) {
  const data = useMemo(
    () =>
      [...logs]
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .slice(-15)
        .map((g) => ({
          date: shortDate(g.date),
          PTS: g.points,
          REB: g.rebounds,
          AST: g.assists,
        })),
    [logs],
  );
  return (
    <Card>
      <CardHeader title="Recent stat trend" subtitle="Points, rebounds, assists" />
      <CardBody>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "rgba(15,17,24,0.95)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "white",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
              <Line type="monotone" dataKey="PTS" stroke="#22d3ee" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="REB" stroke="#a855f7" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="AST" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}

export const RecentStatsChart = memo(RecentStatsChartImpl);
