import { cn } from "@/lib/utils";
import { initialen } from "@/lib/utils";

/**
 * Schüler-Avatar mit persönlicher Farbe: weich getönter Hintergrund +
 * Initialen im Farbton – ruhig statt knallig.
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
  const ton = farbe ?? "#0C8CA1";
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
        className,
      )}
      style={{ backgroundColor: `${ton}1F`, color: ton, boxShadow: `inset 0 0 0 1px ${ton}33` }}
    >
      {initialen(vorname, nachname)}
    </div>
  );
}
