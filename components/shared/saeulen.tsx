import { AKZENT } from "@/lib/farben";
import { euroKurz, schoeneObergrenze } from "@/lib/finanzen";
import { cn, formatEuro } from "@/lib/utils";

export interface SaeulenWert {
  schluessel: string;
  label: string;
  wert: number;
}

/**
 * Säulendiagramm mit einer Reihe (z. B. Umsatz oder Neuanmeldungen je
 * Monat): Achse links, gestrichelte Hilfslinien, die letzte Säule in voller
 * Farbe, die übrigen heller.
 */
export function Saeulen({
  werte,
  einheit = "anzahl",
  hoehe = 200,
  farbe = AKZENT.blau,
  label,
  hervorheben,
}: {
  werte: SaeulenWert[];
  einheit?: "euro" | "anzahl";
  hoehe?: number;
  farbe?: string;
  /** Beschreibung für Screenreader. */
  label: string;
  /** Schlüssel der hervorgehobenen Säule (Standard: die letzte). */
  hervorheben?: string;
}) {
  const max = Math.max(0, ...werte.map((w) => w.wert));
  // Anzahlen: gerade Obergrenze, damit die Mittellinie eine ganze Zahl ist.
  const obergrenze = einheit === "euro" ? schoeneObergrenze(max) : Math.max(2, Math.ceil(max / 2) * 2);
  const stufen = einheit === "euro" ? [1, 0.75, 0.5, 0.25, 0] : [1, 0.5, 0];
  const text = (n: number) => (einheit === "euro" ? euroKurz(n) : n.toLocaleString("de-DE"));
  const titel = (n: number) => (einheit === "euro" ? formatEuro(n) : n.toLocaleString("de-DE"));
  const letzter = hervorheben ?? werte[werte.length - 1]?.schluessel;

  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-3" role="img" aria-label={label}>
      <div className="relative text-right text-[11px] tabular-nums text-foreground-tertiary" style={{ height: hoehe }}>
        {stufen.map((f) => (
          <span key={f} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - f) * 100}%` }}>
            {text(obergrenze * f)}
          </span>
        ))}
      </div>
      <div className="relative" style={{ height: hoehe }}>
        {stufen.map((f) => (
          <span key={f} className="absolute inset-x-0 border-t border-dashed border-border" style={{ top: `${(1 - f) * 100}%` }} aria-hidden="true" />
        ))}
        <div className="absolute inset-0 grid items-end gap-1.5" style={{ gridTemplateColumns: `repeat(${werte.length}, minmax(0, 1fr))` }}>
          {werte.map((w) => (
            <div key={w.schluessel} className="flex h-full items-end justify-center">
              <span
                className="w-full max-w-[28px] rounded-t-[4px]"
                style={{
                  height: `${obergrenze > 0 ? (w.wert / obergrenze) * 100 : 0}%`,
                  background: farbe,
                  opacity: w.schluessel === letzter ? 1 : 0.35,
                }}
                title={`${w.label}: ${titel(w.wert)}`}
              />
            </div>
          ))}
        </div>
      </div>
      <span />
      <div className="grid gap-1.5 text-center text-xs text-foreground-tertiary" style={{ gridTemplateColumns: `repeat(${werte.length}, minmax(0, 1fr))` }}>
        {werte.map((w) => (
          <span key={w.schluessel} className={cn("truncate", w.schluessel === letzter && "font-semibold text-foreground")}>
            {w.label}
          </span>
        ))}
      </div>
    </div>
  );
}
