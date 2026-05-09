"use client";

import { memo, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { shortDate } from "@/lib/utils/dates";
import type { GameLog } from "@/types/stats";

function MinutesTrendChartImpl({ logs }: { logs: GameLog[] }) {
  const data = useMemo(
    () =>
      [...logs]
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .slice(-15)
        .map((g) => ({ date: shortDate(g.date), MIN: g.minutes })),
    [logs],
  );
  return (
    <Card>
      <CardHeader title="Minutes trend" subtitle="Per game" />
      <CardBody>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="minGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 48]} stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "rgba(15,17,24,0.95)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "white",
                }}
              />
              <Area type="monotone" dataKey="MIN" stroke="#22d3ee" strokeWidth={2} fill="url(#minGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}

export const MinutesTrendChart = memo(MinutesTrendChartImpl);
