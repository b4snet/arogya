export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-md bg-white/[0.06] motion-safe:animate-pulse ${className}`}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-4 sm:p-5"
    >
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-3 h-7 w-28" />
      <div className="mt-3 border-t border-[var(--arogya-border)] pt-2.5">
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full w-full flex-col justify-between rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-4"
    >
      <div className="flex items-end gap-2 h-full pt-4">
        <Skeleton className="h-1/3 flex-1" />
        <Skeleton className="h-2/3 flex-1" />
        <Skeleton className="h-1/2 flex-1" />
        <Skeleton className="h-4/5 flex-1" />
        <Skeleton className="h-3/5 flex-1" />
        <Skeleton className="h-3/4 flex-1" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      aria-hidden="true"
      className="space-y-2 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-4"
    >
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="space-y-3 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface)] p-5"
    >
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-64" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export function PageLoadingSkeleton({ label = 'Loading Arogya console view...' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="h-64 lg:col-span-7">
          <ChartSkeleton />
        </div>
        <div className="lg:col-span-5">
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
