export default function SalesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="animate-shimmer h-6 w-20 rounded" />
        <div className="animate-shimmer mt-2 h-4 w-96 rounded" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="animate-shimmer h-4 w-full max-w-md rounded" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-slate-100 px-4 py-4 last:border-0">
            <div className="animate-shimmer h-4 w-40 rounded" />
            <div className="animate-shimmer h-4 w-28 rounded" />
            <div className="animate-shimmer h-4 w-24 rounded" />
            <div className="animate-shimmer h-4 w-20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
