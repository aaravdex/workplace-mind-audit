"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { DIMENSIONS, DIMENSION_META } from "@/lib/constants";
import type { DimensionScores } from "@/types";

/** 5C radar — a natural shape for the model. Nulls render as 0. */
export function DimensionRadar({ dimensions }: { dimensions: DimensionScores }) {
  const data = DIMENSIONS.map((d) => ({
    dimension: DIMENSION_META[d].label,
    score: dimensions[d] ?? 0,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#E2EAF2" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "#38547A", fontSize: 12 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fill: "#9DB6D1", fontSize: 10 }}
            axisLine={false}
          />
          <Radar
            dataKey="score"
            stroke="#C2643F"
            fill="#C2643F"
            fillOpacity={0.25}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
