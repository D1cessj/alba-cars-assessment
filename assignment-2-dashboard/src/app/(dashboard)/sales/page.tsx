import { createClient } from "@/lib/supabase/server";

type SaleRow = {
  id: string;
  customer_name: string;
  sale_price: number;
  sale_date: string;
  vehicles: { make: string; model: string; year: number } | null;
  profiles: { full_name: string } | null;
};

function currency(n: number) {
  return `AED ${Math.round(n).toLocaleString()}`;
}

export default async function SalesPage() {
  const supabase = await createClient();

  const { data: sales, error } = await supabase
    .from("sales")
    .select(
      "id, customer_name, sale_price, sale_date, vehicles(make, model, year), profiles(full_name)"
    )
    .order("sale_date", { ascending: false })
    .returns<SaleRow[]>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Sales</h1>
        <p className="text-sm text-slate-500">
          Sale records are created from the Inventory page via &quot;Mark
          sold&quot; and can&apos;t be edited from here — corrections are an
          admin-only action, on purpose.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Couldn&apos;t load sales: {error.message}
        </div>
      )}

      {!error && (!sales || sales.length === 0) && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No sales recorded yet.
        </div>
      )}

      {!error && sales && sales.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Salesperson</th>
                <th className="px-4 py-3">Sale price</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {sale.vehicles
                      ? `${sale.vehicles.year} ${sale.vehicles.make} ${sale.vehicles.model}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{sale.customer_name}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {sale.profiles?.full_name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {currency(sale.sale_price)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
