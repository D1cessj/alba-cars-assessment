"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { InventoryAging } from "@/lib/database.types";

function colorFor(days: number) {
  if (days >= 45) return "#f87171"; // sitting too long
  if (days >= 21) return "#fbbf24";
  return "#34d399";
}

export function AgingChart({ data }: { data: InventoryAging[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No vehicles in stock right now.
      </div>
    );
  }

  const chartData = data.map((v) => ({
    label: `${v.make} ${v.model}`,
    days: v.days_on_lot,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 24, right: 24 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
          label={{ value: "Days on lot", position: "insideBottom", offset: -5, fontSize: 12, fill: "#94a3b8" }}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={130}
          tick={{ fontSize: 12, fill: "#334155" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => `${value} days`}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
        />
        <Bar dataKey="days" radius={[0, 6, 6, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={colorFor(entry.days)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
