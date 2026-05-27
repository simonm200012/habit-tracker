"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export function WeeklyBarChart({
  data,
}: {
  data: { day: string; completed: number; scheduled: number }[];
}) {
  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#475569" stopOpacity={0.9} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="day"
            stroke="#64748b"
            tick={{ fontSize: 11, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
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
          />
          <Bar
            dataKey="scheduled"
            fill="#e2e8f0"
            radius={[6, 6, 0, 0]}
            name="Scheduled"
          />
          <Bar
            dataKey="completed"
            fill="url(#completedGrad)"
            radius={[6, 6, 0, 0]}
            name="Completed"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
