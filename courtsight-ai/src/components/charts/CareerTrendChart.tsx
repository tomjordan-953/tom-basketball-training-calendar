"use client";

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
import type { CareerSeason } from "@/types/stats";
import { round } from "@/lib/utils/format";

export function CareerTrendChart({ seasons }: { seasons: CareerSeason[] }) {
  const data = [...seasons]
    .sort((a, b) => a.season - b.season)
    .map((s) => ({
      season: String(s.season),
      PTS: round(s.points),
      REB: round(s.rebounds),
      AST: round(s.assists),
    }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="season" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
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
          <Line type="monotone" dataKey="PTS" stroke="#22d3ee" strokeWidth={2} dot />
          <Line type="monotone" dataKey="REB" stroke="#a855f7" strokeWidth={2} dot />
          <Line type="monotone" dataKey="AST" stroke="#22c55e" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
