export function ResultsSkeleton() {
  return (
    <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-10">
        <div className="animate-shimmer h-[220px] w-[220px] rounded-full" />
        <div className="animate-shimmer h-6 w-32 rounded-full" />
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="animate-shimmer mb-4 h-5 w-40 rounded" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b border-white/5 py-3 last:border-0"
          >
            <div className="animate-shimmer h-4 w-24 rounded" />
            <div className="animate-shimmer h-4 w-16 rounded" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] md:col-span-2">
        <div className="animate-shimmer aspect-video w-full" />
        <div className="p-6">
          <div className="animate-shimmer h-3 w-48 rounded" />
          <div className="animate-shimmer mt-3 h-6 w-2/3 rounded" />
          <div className="animate-shimmer mt-3 h-4 w-full rounded" />
          <div className="animate-shimmer mt-2 h-4 w-5/6 rounded" />
        </div>
      </div>
    </div>
  );
}
