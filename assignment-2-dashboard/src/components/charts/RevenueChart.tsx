"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyRevenue } from "@/lib/database.types";

function formatMonth(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

export function RevenueChart({ data }: { data: MonthlyRevenue[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No sales recorded yet — revenue will show up here once a vehicle
        sells.
      </div>
    );
  }

  const chartData = data.map((row) => ({
    month: formatMonth(row.month),
    Revenue: Number(row.revenue),
    "Gross profit": Number(row.gross_profit),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value) => `AED ${Number(value).toLocaleString()}`}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
        />
        <Bar dataKey="Revenue" fill="#4f46e5" radius={[6, 6, 0, 0]} />
        <Bar dataKey="Gross profit" fill="#a5b4fc" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
