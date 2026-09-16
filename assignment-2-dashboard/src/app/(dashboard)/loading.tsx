export default function OverviewLoading() {
  return (
    <div className="space-y-8">
      <div>
        <div className="animate-shimmer h-6 w-32 rounded" />
        <div className="animate-shimmer mt-2 h-4 w-80 rounded" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="animate-shimmer h-4 w-24 rounded" />
            <div className="animate-shimmer mt-2 h-7 w-16 rounded" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="animate-shimmer h-4 w-40 rounded" />
            <div className="animate-shimmer mt-4 h-64 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
