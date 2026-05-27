"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";

export function HabitValueBarChart({
  data,
  target,
  color = "#0f172a",
  unit = "",
}: {
  data: { label: string; value: number; reached: boolean }[];
  target: number;
  color?: string;
  unit?: string;
}) {
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#64748b"
            tick={{ fontSize: 10, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine
            y={target}
            stroke="#10b981"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: `Goal ${target}${unit ? " " + unit : ""}`,
              fill: "#047857",
              fontSize: 10,
              fontWeight: 700,
              position: "insideTopRight",
            }}
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
              fontWeight: 600,
              color: "#0f172a",
            }}
            formatter={(v) => [`${v}${unit ? " " + unit : ""}`, "Logged"]}
          />
          <Bar dataKey="value" radius={[5, 5, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.reached ? "#10b981" : color} fillOpacity={d.value === 0 ? 0.15 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
