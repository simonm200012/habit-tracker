"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function CompletionAreaChart({
  data,
}: {
  data: { label: string; rate: number }[];
}) {
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#0f172a" stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            cursor={{ stroke: "#cbd5e1", strokeWidth: 1, strokeDasharray: "3 3" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
              fontWeight: 600,
              color: "#0f172a",
            }}
            formatter={(v) => [`${v}%`, "Completion"]}
          />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="#0f172a"
            strokeWidth={2.5}
            fill="url(#rateGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
