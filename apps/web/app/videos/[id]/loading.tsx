export default function Loading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-white/10 shadow-2xl flex items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-10 w-3/5 animate-pulse rounded bg-zinc-800/60" />
        <div className="h-7 w-28 animate-pulse rounded bg-zinc-800/60" />
      </div>

      <div className="mt-6 border-t border-zinc-800/70 pt-6">
        <dl className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2"
            >
              <dt className="h-4 w-24 animate-pulse rounded bg-zinc-800/60" />
              <dd className="h-5 w-36 animate-pulse rounded bg-zinc-800/60" />
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
