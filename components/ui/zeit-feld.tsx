"use client";

import * as React from "react";
import { Clock3 } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** „9" → 09:00, „930" → 09:30, „9.30" / „9:30" → 09:30. `null` bei ungültiger Eingabe. */
function ausEingabe(text: string): string | null {
  const t = text.trim().replace(/[.,h ]/g, ":");
  if (!t) return null;
  let h: number;
  let m: number;
  if (t.includes(":")) {
    const [a, b = "0"] = t.split(":");
    h = Number(a);
    m = Number(b || 0);
  } else if (/^\d{1,2}$/.test(t)) {
    h = Number(t);
    m = 0;
  } else if (/^\d{3,4}$/.test(t)) {
    h = Number(t.slice(0, t.length - 2));
    m = Number(t.slice(-2));
  } else {
    return null;
  }
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface ZeitFeldProps {
  /** Name für Formulare – übermittelt wird HH:MM. */
  name?: string;
  id?: string;
  defaultValue?: string | null;
  value?: string | null;
  onChange?: (zeit: string) => void;
  required?: boolean;
  disabled?: boolean;
  /** Abstand der Vorschläge in Minuten (Standard 15). */
  schritt?: number;
  /** Erste und letzte Stunde der Vorschlagsliste. */
  von?: number;
  bis?: number;
  inputSize?: "sm" | "default";
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * Uhrzeitfeld auf Deutsch (24 Stunden): Eingabe frei („930", „9:30"), dazu
 * eine Liste mit Vorschlägen im Popover. Ersetzt `<input type="time">`, das
 * je nach Browser AM/PM oder Platzhalter wie „--:--" zeigt.
 */
export function ZeitFeld({
  name,
  id,
  defaultValue,
  value,
  onChange,
  required,
  disabled,
  schritt = 15,
  von = 6,
  bis = 22,
  inputSize = "default",
  className,
  ...aria
}: ZeitFeldProps) {
  const kontrolliert = value !== undefined;
  const [intern, setIntern] = React.useState((defaultValue ?? "").slice(0, 5));
  const zeit = ((kontrolliert ? value ?? "" : intern) || "").slice(0, 5);
  const [text, setText] = React.useState(zeit);
  const [offen, setOffen] = React.useState(false);
  const listeRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setText(zeit), [zeit]);

  // Beim Öffnen zur gewählten (oder nächsten vollen) Zeit scrollen.
  React.useEffect(() => {
    if (!offen) return;
    const t = window.setTimeout(() => {
      const ziel = listeRef.current?.querySelector<HTMLElement>("[data-gewaehlt='true']") ?? listeRef.current?.querySelector<HTMLElement>("[data-nah='true']");
      ziel?.scrollIntoView({ block: "center" });
    }, 0);
    return () => window.clearTimeout(t);
  }, [offen]);

  function setzen(neu: string) {
    if (!kontrolliert) setIntern(neu);
    onChange?.(neu);
    setText(neu);
  }

  function uebernehmen() {
    if (!text.trim()) return setzen("");
    const z = ausEingabe(text);
    if (z) setzen(z);
    else setText(zeit);
  }

  const vorschlaege: string[] = [];
  for (let min = von * 60; min <= bis * 60; min += schritt) {
    vorschlaege.push(`${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`);
  }
  const jetzt = new Date();
  const nah = `${String(jetzt.getHours()).padStart(2, "0")}:00`;

  return (
    <div className={cn("relative w-full", className)}>
      {name && <input type="hidden" name={name} value={zeit} />}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        placeholder="HH:MM"
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
      <Popover open={offen} onOpenChange={setOffen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Uhrzeit auswählen"
            className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[5px] text-foreground-tertiary transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 disabled:pointer-events-none"
          >
            <Clock3 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-36 p-1">
          <div ref={listeRef} className="max-h-60 overflow-y-auto scrollbar-thin" role="listbox" aria-label="Uhrzeiten">
            {vorschlaege.map((v) => {
              const gewaehlt = v === zeit;
              return (
                <button
                  key={v}
                  type="button"
                  role="option"
                  aria-selected={gewaehlt}
                  data-gewaehlt={gewaehlt}
                  data-nah={v === nah}
                  onClick={() => {
                    setzen(v);
                    setOffen(false);
                  }}
                  className={cn(
                    "flex h-8 w-full items-center rounded-sm px-2.5 text-13 tabular-nums transition-colors",
                    gewaehlt ? "bg-primary font-semibold text-primary-foreground" : "text-foreground hover:bg-muted",
                  )}
                >
                  {v} Uhr
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
