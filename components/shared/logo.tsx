import { cn } from "@/lib/utils";

/**
 * Marke v3: Die Mark wird gegenüber v2 umgekehrt – helle Fläche in
 * Markengrün mit weißen Fahrbahnspuren statt Tinte-Quadrat mit grünen
 * Strichen. In der Sidebar (`tone="dark"`) sitzt sie auf Tinte.
 * Die Wortmarke ist einfarbig: „App" ist nicht mehr grün.
 */
export function Logo({
  className,
  compact,
  tone = "light",
}: {
  className?: string;
  compact?: boolean;
  tone?: "light" | "dark";
}) {
  const dunkel = tone === "dark";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight",
        dunkel ? "text-sidebar-foreground" : "text-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md",
          dunkel ? "bg-sidebar-badge" : "bg-primary",
        )}
      >
        <span
          className={cn(
            "absolute left-[7px] top-[7px] h-3.5 w-[3px] rounded-full",
            dunkel ? "bg-sidebar-bar" : "bg-white",
          )}
        />
        <span
          className={cn(
            "absolute left-[13px] top-[6px] h-[7px] w-[3px] rounded-full",
            dunkel ? "bg-sidebar-bar/60" : "bg-white/60",
          )}
        />
        <span
          className={cn(
            "absolute left-[13px] top-[16px] h-[6px] w-[3px] rounded-full",
            dunkel ? "bg-sidebar-bar/60" : "bg-white/60",
          )}
        />
        <span
          className={cn(
            "absolute left-[19px] top-[7px] h-3.5 w-[3px] rounded-full",
            dunkel ? "bg-sidebar-bar" : "bg-white",
          )}
        />
      </span>
      {!compact && <span>FahrschulApp</span>}
    </span>
  );
}
