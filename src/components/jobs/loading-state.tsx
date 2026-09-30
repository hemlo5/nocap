type LoadingStateProps = {
  count?: number;
};

export function LoadingState({ count = 5 }: LoadingStateProps) {
  return (
    <div className="space-y-3 p-3.5 sm:p-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs space-y-3 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-zinc-100 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-3/4 rounded bg-zinc-200" />
              <div className="h-3 w-1/3 rounded bg-zinc-100" />
            </div>
          </div>
          <div className="flex gap-1.5">
            <div className="h-4 w-16 rounded bg-zinc-100" />
            <div className="h-4 w-14 rounded bg-zinc-100" />
            <div className="h-4 w-18 rounded bg-zinc-100" />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="h-10 rounded-lg bg-zinc-50 border border-zinc-100" />
            <div className="h-10 rounded-lg bg-zinc-50 border border-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FilterSkeleton() {
  return (
    <aside className="border-b border-zinc-200/80 bg-white p-3.5 sm:p-4 lg:border-b-0 lg:border-r space-y-4 animate-pulse">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
        <div className="h-4 w-16 rounded bg-zinc-200" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-14 rounded bg-zinc-100" />
        <div className="h-8 w-full rounded-md bg-zinc-100" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-12 rounded bg-zinc-100" />
        <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-zinc-100 p-1">
          <div className="h-6 rounded bg-zinc-200" />
          <div className="h-6 rounded bg-zinc-200" />
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className="h-3 w-16 rounded bg-zinc-100" />
          <div className="flex flex-wrap gap-1.5">
            <div className="h-6 w-12 rounded bg-zinc-100" />
            <div className="h-6 w-16 rounded bg-zinc-100" />
            <div className="h-6 w-14 rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </aside>
  );
}

type MapSkeletonProps = {
  label?: string;
  compact?: boolean;
};

export function MapSkeleton({
  label = "Loading map...",
  compact = false,
}: MapSkeletonProps) {
  return (
    <div
      className="relative h-full min-h-[260px] w-full overflow-hidden bg-zinc-100"
      aria-busy="true"
      aria-label={label}
    >
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(0,0,0,0.04)_1px,transparent_1px)] [background-size:64px_64px]" />
      <div className="absolute left-[28%] top-[42%] h-4 w-4 animate-pulse rounded-full border-2 border-white bg-emerald-500 shadow-md" />
      <div className="absolute left-[58%] top-[34%] h-5 w-5 animate-pulse rounded-full border-2 border-white bg-[#18181B] shadow-md" />
      <div className="absolute left-[70%] top-[62%] h-4 w-4 animate-pulse rounded-full border-2 border-white bg-sky-500 shadow-md" />
      <div className="absolute bottom-4 left-4 rounded-md border border-zinc-200/80 bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs backdrop-blur-xs">
        {label}
      </div>
    </div>
  );
}