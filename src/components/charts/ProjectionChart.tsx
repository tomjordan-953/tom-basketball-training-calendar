"use client";

import { memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { Projection } from "@/types/projection";

function ProjectionChartImpl({ projection }: { projection: Projection }) {
  const data = useMemo(() => [
    { stat: "PTS", Projected: projection.projected.points, Season: projection.baselineSeason.points },
    { stat: "REB", Projected: projection.projected.rebounds, Season: projection.baselineSeason.rebounds },
    { stat: "AST", Projected: projection.projected.assists, Season: projection.baselineSeason.assists },
    { stat: "STL", Projected: projection.projected.steals, Season: projection.baselineSeason.steals },
    { stat: "BLK", Projected: projection.projected.blocks, Season: projection.baselineSeason.blocks },
    { stat: "TO", Projected: projection.projected.turnovers, Season: projection.baselineSeason.turnovers },
  ], [projection]);
  return (
    <Card>
      <CardHeader title="Projection vs season average" />
      <CardBody>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="stat" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{
                  background: "rgba(15,17,24,0.95)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "white",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
              <Bar dataKey="Season" fill="rgba(168,85,247,0.45)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Projected" fill="#22d3ee" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}

export const ProjectionChart = memo(ProjectionChartImpl);
