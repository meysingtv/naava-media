import { Skeleton, SkeletonKpiRow, SkeletonTable } from "@/components/ui/skeleton";

// Wird beim Navigieren sofort angezeigt, während die Seite server-seitig
// lädt – Maße wie die neue Shell: 56-px-Kopf, KPI-Zeile, Datentabelle.
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="mb-5 flex h-14 items-center">
        <Skeleton className="h-6 w-40" />
      </div>
      <SkeletonKpiRow n={4} />
      <SkeletonTable rows={8} />
    </div>
  );
}
