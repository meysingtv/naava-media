import { cn } from "@/lib/utils";
import { initialen } from "@/lib/utils";

export function SchuelerAvatar({
  vorname,
  nachname,
  farbe,
  className,
}: {
  vorname?: string | null;
  nachname?: string | null;
  farbe?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
        className,
      )}
      style={{ backgroundColor: farbe ?? "#2563EB" }}
    >
      {initialen(vorname, nachname)}
    </div>
  );
}
