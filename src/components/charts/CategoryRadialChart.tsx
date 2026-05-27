"use client";

import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip,
  PolarAngleAxis,
} from "recharts";

export function CategoryRadialChart({
  data,
}: {
  data: { name: string; rate: number; fill: string }[];
}) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="25%"
          outerRadius="100%"
          barSize={12}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: "#f1f5f9" }} dataKey="rate" cornerRadius={6} />
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
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}
