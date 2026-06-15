// Wird beim Navigieren sofort angezeigt, während die Seite (server-seitig)
// lädt – verhindert das „Hängen"/Leer-Gefühl beim ersten Seitenwechsel.
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted/70" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-lg border bg-card" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-lg border bg-card" />
    </div>
  );
}
