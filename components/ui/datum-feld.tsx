"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ISO = "yyyy-MM-dd";
const ANZEIGE = "dd.MM.yyyy";
const EINGABE_FORMATE = ["d.M.yyyy", "d.M.yy", "ddMMyyyy", "yyyy-MM-dd", "d.M."];

function ausIso(wert?: string | null): Date | null {
  if (!wert) return null;
  const d = parse(wert.slice(0, 10), ISO, new Date());
  return isValid(d) ? d : null;
}

function ausEingabe(text: string): Date | null {
  const t = text.trim();
  if (!t) return null;
  for (const f of EINGABE_FORMATE) {
    const d = parse(t, f, new Date());
    if (isValid(d) && d.getFullYear() > 1900 && d.getFullYear() < 2200) return d;
  }
  return null;
}

export interface DatumFeldProps {
  /** Name für Formulare – übermittelt wird immer JJJJ-MM-TT. */
  name?: string;
  id?: string;
  /** Unkontrolliert: Startwert als JJJJ-MM-TT. */
  defaultValue?: string | null;
  /** Kontrolliert: Wert als JJJJ-MM-TT ("" = leer). */
  value?: string | null;
  onChange?: (iso: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  inputSize?: "sm" | "default";
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
}

/**
 * Datumsfeld auf Deutsch: Eingabe als TT.MM.JJJJ (auch „1.3.26" oder
 * „010326"), dazu ein Monatskalender im Popover (Woche beginnt Montag).
 * Ersetzt `<input type="date">`, das in jedem Browser anders aussieht.
 * Für Formulare trägt ein verstecktes Feld den Wert im ISO-Format, damit
 * die Server-Aktionen unverändert bleiben.
 */
export function DatumFeld({
  name,
  id,
  defaultValue,
  value,
  onChange,
  required,
  disabled,
  placeholder = "TT.MM.JJJJ",
  inputSize = "default",
  className,
  ...aria
}: DatumFeldProps) {
  const kontrolliert = value !== undefined;
  const [intern, setIntern] = React.useState<string>(defaultValue?.slice(0, 10) ?? "");
  const iso = (kontrolliert ? value ?? "" : intern) || "";
  const datum = ausIso(iso);

  const [text, setText] = React.useState(datum ? format(datum, ANZEIGE) : "");
  const [offen, setOffen] = React.useState(false);
  const [monat, setMonat] = React.useState<Date>(datum ?? new Date());

  // Anzeige nachziehen, wenn der Wert von außen kommt.
  React.useEffect(() => {
    setText(datum ? format(datum, ANZEIGE) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);

  function setzen(d: Date | null) {
    const neu = d ? format(d, ISO) : "";
    if (!kontrolliert) setIntern(neu);
    onChange?.(neu);
    setText(d ? format(d, ANZEIGE) : "");
    if (d) setMonat(d);
  }

  function uebernehmen() {
    if (!text.trim()) return setzen(null);
    const d = ausEingabe(text);
    if (d) setzen(d);
    else setText(datum ? format(datum, ANZEIGE) : "");
  }

  const tage = eachDayOfInterval({
    start: startOfWeek(startOfMonth(monat), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monat), { weekStartsOn: 1 }),
  });
  const heute = new Date();

  return (
    <div className={cn("relative w-full", className)}>
      {name && <input type="hidden" name={name} value={iso} />}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={uebernehmen}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            uebernehmen();
          }
        }}
        className={cn(
          "flex w-full rounded-md border border-input bg-card pr-10 text-foreground shadow-xs tabular-nums transition-[border-color,box-shadow] duration-fast ease-soft",
          inputSize === "sm" ? "h-8 pl-2.5 text-13" : "h-9 pl-3 text-sm",
          "placeholder:text-foreground-tertiary hover:border-border-hover",
          "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-[3px] aria-[invalid=true]:ring-destructive/15",
          "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-foreground-disabled",
        )}
        {...aria}
      />
      <Popover
        open={offen}
        onOpenChange={(o) => {
          setOffen(o);
          if (o) setMonat(datum ?? new Date());
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Kalender öffnen"
            className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[5px] text-foreground-tertiary transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:pointer-events-none"
          >
            <CalendarDays className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[264px] p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonat((m) => addMonths(m, -1))}
              aria-label="Vorheriger Monat"
              className="flex h-7 w-7 items-center justify-center rounded-[5px] text-foreground-secondary hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <p className="text-13 font-semibold capitalize text-foreground">
              {format(monat, "LLLL yyyy", { locale: de })}
            </p>
            <button
              type="button"
              onClick={() => setMonat((m) => addMonths(m, 1))}
              aria-label="Nächster Monat"
              className="flex h-7 w-7 items-center justify-center rounded-[5px] text-foreground-secondary hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-2xs font-medium text-foreground-tertiary">
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((t) => (
              <span key={t} className="py-1">
                {t}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {tage.map((t) => {
              const gewaehlt = datum ? isSameDay(t, datum) : false;
              const istHeute = isSameDay(t, heute);
              return (
                <button
                  key={t.toISOString()}
                  type="button"
                  onClick={() => {
                    setzen(t);
                    setOffen(false);
                  }}
                  className={cn(
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-[5px] text-13 tabular-nums transition-colors",
                    !isSameMonth(t, monat) && "text-foreground-tertiary/60",
                    gewaehlt
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "hover:bg-muted",
                    istHeute && !gewaehlt && "font-semibold text-primary-text",
                  )}
                  aria-pressed={gewaehlt}
                  aria-label={format(t, "EEEE, d. MMMM yyyy", { locale: de })}
                >
                  {format(t, "d")}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <button
              type="button"
              onClick={() => {
                setzen(null);
                setOffen(false);
              }}
              className="rounded-[5px] px-2 py-1 text-13 text-foreground-secondary hover:bg-muted hover:text-foreground"
            >
              Leeren
            </button>
            <button
              type="button"
              onClick={() => {
                setzen(heute);
                setOffen(false);
              }}
              className="rounded-[5px] px-2 py-1 text-13 font-medium text-primary-text hover:bg-primary-soft"
            >
              Heute
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
