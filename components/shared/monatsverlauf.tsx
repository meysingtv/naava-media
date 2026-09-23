import { AKZENT } from "@/lib/farben";
import { euroKurz, schoeneObergrenze, type MonatsWert } from "@/lib/finanzen";
import { cn, formatEuro } from "@/lib/utils";

const HELL = "#C9D6FA";

/**
 * Balkendiagramm „Gestellt / Eingegangen" je Monat: Legende mit Summen,
 * Achse mit runden Beträgen, gestrichelte Hilfslinien. Der laufende Monat
 * ist in der Beschriftung hervorgehoben.
 */
export function Monatsverlauf({ monate, hoehe = 240 }: { monate: MonatsWert[]; hoehe?: number }) {
  const achsenMax = schoeneObergrenze(Math.max(...monate.map((m) => Math.max(m.gestellt, m.eingang))));
  const summeEingang = monate.reduce((s, m) => s + m.eingang, 0);
  const summeGestellt = monate.reduce((s, m) => s + m.gestellt, 0);
  const aktuell = monate[monate.length - 1]?.schluessel;
  const viele = monate.length > 8;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-13">
        <span className="inline-flex items-center gap-2 text-foreground-secondary">
          <i className="h-2.5 w-2.5 rounded-sm" style={{ background: HELL }} aria-hidden="true" /> Gestellt
          <span className="font-semibold tabular-nums text-foreground">{formatEuro(summeGestellt)}</span>
        </span>
        <span className="inline-flex items-center gap-2 text-foreground-secondary">
          <i className="h-2.5 w-2.5 rounded-sm" style={{ background: AKZENT.blau }} aria-hidden="true" /> Eingegangen
          <span className="font-semibold tabular-nums text-foreground">{formatEuro(summeEingang)}</span>
        </span>
      </div>
      <div
        className="mt-5 grid grid-cols-[56px_minmax(0,1fr)] gap-3"
        role="img"
        aria-label={`Gestellte und eingegangene Beträge der letzten ${monate.length} Monate: gestellt ${formatEuro(summeGestellt)}, eingegangen ${formatEuro(summeEingang)}`}
      >
        <div className="relative text-right text-[11px] tabular-nums text-foreground-tertiary" style={{ height: hoehe }}>
          {[1, 0.75, 0.5, 0.25, 0].map((f) => (
            <span key={f} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - f) * 100}%` }}>
              {euroKurz(achsenMax * f)}
            </span>
          ))}
        </div>
        <div className="relative" style={{ height: hoehe }}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <span key={f} className="absolute inset-x-0 border-t border-dashed border-border" style={{ top: `${f * 100}%` }} aria-hidden="true" />
          ))}
          <div
            className={cn("absolute inset-0 grid items-end", viele ? "gap-1.5" : "gap-3")}
            style={{ gridTemplateColumns: `repeat(${monate.length}, minmax(0, 1fr))` }}
          >
            {monate.map((m) => (
              <div key={m.schluessel} className={cn("flex h-full items-end justify-center", viele ? "gap-1" : "gap-1.5")}>
                <span
                  className={cn("rounded-t-[4px]", viele ? "w-2.5 sm:w-3" : "w-4")}
                  style={{ height: `${(m.gestellt / achsenMax) * 100}%`, background: HELL }}
                  title={`${m.label}: gestellt ${formatEuro(m.gestellt)}`}
                />
                <span
                  className={cn("rounded-t-[4px]", viele ? "w-2.5 sm:w-3" : "w-4")}
                  style={{ height: `${(m.eingang / achsenMax) * 100}%`, background: AKZENT.blau }}
                  title={`${m.label}: eingegangen ${formatEuro(m.eingang)}`}
                />
              </div>
            ))}
          </div>
        </div>
        <span />
        <div
          className={cn("grid text-center text-xs text-foreground-tertiary", viele ? "gap-1.5" : "gap-3")}
          style={{ gridTemplateColumns: `repeat(${monate.length}, minmax(0, 1fr))` }}
        >
          {monate.map((m) => (
            <span key={m.schluessel} className={m.schluessel === aktuell ? "font-semibold text-foreground" : undefined}>
              {m.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
