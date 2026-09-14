import { Skeleton } from "@/components/ui/skeleton";

// Wird beim Navigieren sofort angezeigt, während die Seite (server-seitig)
// lädt – verhindert das „Hängen"/Leer-Gefühl beim ersten Seitenwechsel.
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}
