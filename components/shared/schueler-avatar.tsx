import { cn, initialen } from "@/lib/utils";

/**
 * Schüler-Avatar v3: weich getönte Fläche, Initialen im Farbton, 32 px.
 * Kein Inset-Ring mehr. Die persönliche Farbe bleibt – sie trägt Daten,
 * nicht Dekor.
 */
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
  const ton = farbe ?? "#14A15A";
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-13 font-semibold",
        className,
      )}
      style={{ backgroundColor: `${ton}1F`, color: ton }}
    >
      {initialen(vorname, nachname)}
    </div>
  );
}
