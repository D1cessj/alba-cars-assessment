import { createClient } from "@/lib/supabase/server";
import { KpiCard } from "@/components/KpiCard";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { AgingChart } from "@/components/charts/AgingChart";
import type {
  DashboardSummary,
  InventoryAging,
  MonthlyRevenue,
} from "@/lib/database.types";

const currency = (n: number) =>
  `AED ${Math.round(n).toLocaleString()}`;

export default async function OverviewPage() {
  const supabase = await createClient();

  const [{ data: summaryRows }, { data: revenue }, { data: aging }] =
    await Promise.all([
      supabase.rpc("dashboard_summary"),
      supabase
        .from("monthly_revenue")
        .select("*")
        .returns<MonthlyRevenue[]>(),
      supabase
        .from("inventory_aging")
        .select("*")
        .returns<InventoryAging[]>(),
    ]);

  const summary: DashboardSummary = (summaryRows?.[0] as DashboardSummary) ?? {
    total_vehicles: 0,
    available_vehicles: 0,
    total_revenue: 0,
    avg_days_on_lot: 0,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500">
          Everything below is scoped to what your account can see — RLS
          filters it at the database, not in this page.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total vehicles" value={String(summary.total_vehicles)} />
        <KpiCard label="Available now" value={String(summary.available_vehicles)} />
        <KpiCard label="Total revenue" value={currency(summary.total_revenue)} />
        <KpiCard
          label="Avg. days on lot"
          value={`${Math.round(summary.avg_days_on_lot)}`}
          sub="for unsold inventory"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Revenue by month
          </h2>
          <p className="mb-2 text-xs text-slate-400">
            Computed server-side by the `monthly_revenue` view.
          </p>
          <RevenueChart data={revenue ?? []} />
        </div>

        <div className="animate-fade-in-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Inventory aging
          </h2>
          <p className="mb-2 text-xs text-slate-400">
            How long each unsold vehicle has been listed.
          </p>
          <AgingChart data={aging ?? []} />
        </div>
      </div>
    </div>
  );
}
