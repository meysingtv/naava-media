import { cn } from "@/lib/utils";

/** Ladeplatzhalter v3 – ruhiges Pulsieren auf der gedämpften Fläche. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-soft-pulse rounded-md bg-surface-muted", className)} {...props} />;
}

/** Tabellen-Attrappe in echter Zeilenhöhe (44 px) für `loading.tsx`. */
function SkeletonTable({ rows = 8, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-card shadow-panel", className)}>
      <div className="flex h-10 items-center gap-4 border-b border-border bg-surface-muted px-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="ml-auto h-3 w-16" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-11 items-center gap-4 border-b border-border px-4 last:border-0">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="ml-auto h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/** KPI-Zeile als Attrappe – gleiche Maße wie `KpiRow`. */
function SkeletonKpiRow({ n = 4, className }: { n?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="min-h-[104px] rounded-xl bg-card p-4 shadow-panel">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-6 w-24" />
          <Skeleton className="mt-3 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonTable, SkeletonKpiRow };
