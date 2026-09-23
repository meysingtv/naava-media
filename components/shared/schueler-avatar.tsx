import { cn, initialen } from "@/lib/utils";

/**
 * Personen-Avatar v4: neutral hellgrau mit dunklen Initialen – keine bunten
 * Kreise. `farbe` bleibt aus Kompatibilitätsgründen im Aufruf, wird aber
 * nicht mehr als Fläche verwendet.
 */
export function SchuelerAvatar({
  vorname,
  nachname,
  className,
}: {
  vorname?: string | null;
  nachname?: string | null;
  farbe?: string | null;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground-secondary",
        className,
      )}
    >
      {initialen(vorname, nachname)}
    </div>
  );
}
