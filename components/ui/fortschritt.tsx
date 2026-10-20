import { cn } from "@/lib/utils";

/**
 * Fortschrittsring als SVG: Anteil `wert / max`, Farbe frei wählbar, in der
 * Mitte ein Inhalt (z. B. „7/20").
 */
export function Ring({
  wert,
  max,
  farbe,
  groesse = 112,
  staerke = 9,
  children,
  label,
}: {
  wert: number;
  max: number;
  farbe: string;
  groesse?: number;
  staerke?: number;
  children?: React.ReactNode;
  label: string;
}) {
  const r = (groesse - staerke) / 2;
  const umfang = 2 * Math.PI * r;
  const anteil = max > 0 ? Math.min(1, wert / max) : 0;
  return (
    <div className="relative shrink-0" style={{ width: groesse, height: groesse }} role="img" aria-label={label}>
      <svg width={groesse} height={groesse} viewBox={`0 0 ${groesse} ${groesse}`} className="-rotate-90">
        <circle cx={groesse / 2} cy={groesse / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={staerke} />
        <circle
          cx={groesse / 2}
          cy={groesse / 2}
          r={r}
          fill="none"
          stroke={farbe}
          strokeWidth={staerke}
          strokeLinecap="round"
          strokeDasharray={`${umfang * anteil} ${umfang}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Schmaler Balken mit Farbe – für Kurse, Auslastung, Quoten. */
export function Balken({ anteil, farbe, className }: { anteil: number; farbe: string; className?: string }) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, anteil)) * 100}%`, background: farbe }} />
    </div>
  );
}
