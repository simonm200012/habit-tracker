"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export function DayOfWeekChart({
  data,
}: {
  data: { day: string; rate: number }[];
}) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="day"
            tick={{ fontSize: 11, fontWeight: 600, fill: "#334155" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
              fontWeight: 600,
              color: "#0f172a",
            }}
            formatter={(v) => [`${v}%`, "Completion"]}
          />
          <Radar
            dataKey="rate"
            stroke="#0f172a"
            fill="#0f172a"
            fillOpacity={0.18}
            strokeWidth={2.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
