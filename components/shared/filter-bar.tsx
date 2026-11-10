"use client";

import * as React from "react";
import { CirclePlus, CircleX, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface FilterBarProps {
  search?: { placeholder?: string; value?: string; onChange?: (v: string) => void };
  /** Segmente, üblicherweise `<Tabs variant="pills">`. */
  segments?: React.ReactNode;
  filters?: React.ReactNode;
  /** Ergebniszahl rechts, z. B. „213 Einträge". */
  count?: React.ReactNode;
  actions?: React.ReactNode;
  /** Aktive Filter als entfernbare Chips in einer zweiten Zeile. */
  activeChips?: { label: string; onRemove: () => void }[];
  className?: string;
}

/**
 * Werkzeugleiste v4 über einer Tabelle: Suche links, Segmente und Filter-
 * Chips daneben, rechts Ergebniszahl und Aktionen. `/` fokussiert die Suche,
 * solange kein Feld den Fokus hat.
 */
export function FilterBar({
  search,
  segments,
  filters,
  count,
  actions,
  activeChips,
  className,
}: FilterBarProps) {
  const sucheRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function beiTaste(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const aktiv = document.activeElement as HTMLElement | null;
      if (
        aktiv &&
        (aktiv.tagName === "INPUT" ||
          aktiv.tagName === "TEXTAREA" ||
          aktiv.tagName === "SELECT" ||
          aktiv.isContentEditable)
      )
        return;
      if (document.querySelector("[role=dialog]")) return;
      e.preventDefault();
      sucheRef.current?.focus();
    }
    document.addEventListener("keydown", beiTaste);
    return () => document.removeEventListener("keydown", beiTaste);
  }, []);

  return (
    <div className={cn("border-b border-border", className)}>
      <div className="flex min-h-12 flex-wrap items-center gap-2 px-3 py-2">
        {search && (
          <div className="w-full shrink-0 sm:w-[280px]">
            <Input
              ref={sucheRef}
              inputSize="sm"
              leadingIcon={Search}
              type="search"
              placeholder={search.placeholder ?? "Suchen …"}
              value={search.value}
              onChange={(e) => search.onChange?.(e.target.value)}
              aria-label={search.placeholder ?? "Suchen"}
            />
          </div>
        )}
        {segments}
        {filters}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {count && <span className="hidden text-13 text-foreground-tertiary sm:block">{count}</span>}
          {actions}
        </div>
      </div>

      {activeChips && activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2.5">
          {activeChips.map((c) => (
            <Badge key={c.label} variant="secondary" dot={false} className="gap-1 pr-1">
              {c.label}
              <button
                type="button"
                onClick={c.onRemove}
                aria-label={`${c.label} entfernen`}
                className="rounded-full p-0.5 text-foreground-tertiary hover:text-foreground"
              >
                <X className="h-3 w-3" strokeWidth={1.75} />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export interface FilterChipOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * Filter-Chip mit Mehrfachauswahl: inaktiv eine gestrichelte Pille
 * „⊕ Status", aktiv eine durchgezogene Pille „⊗ Status | Offen, Bezahlt".
 * Ab acht Optionen erscheint ein Suchfeld im Popover.
 */
export function FilterChip({
  label,
  options,
  selected,
  onChange,
  className,
}: {
  label: string;
  options: FilterChipOption[];
  selected: string[];
  onChange: (werte: string[]) => void;
  className?: string;
}) {
  const [suche, setSuche] = React.useState("");
  const aktiv = selected.length > 0;
  const gefiltert = suche
    ? options.filter((o) => o.label.toLowerCase().includes(suche.toLowerCase()))
    : options;
  const gewaehlteLabels = options.filter((o) => selected.includes(o.value)).map((o) => o.label);

  function umschalten(wert: string) {
    onChange(selected.includes(wert) ? selected.filter((v) => v !== wert) : [...selected, wert]);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-13 font-medium transition-colors duration-fast",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
            aktiv
              ? "border-border-strong bg-card text-foreground hover:bg-surface-muted"
              : "border-dashed border-border-strong text-foreground-secondary hover:bg-surface-muted hover:text-foreground",
            className,
          )}
        >
          {aktiv ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label={`${label} zurücksetzen`}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="-ml-0.5 text-foreground-tertiary hover:text-foreground"
            >
              <CircleX className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
          ) : (
            <CirclePlus className="-ml-0.5 h-3.5 w-3.5 text-foreground-tertiary" strokeWidth={1.75} aria-hidden="true" />
          )}
          {label}
          {aktiv && (
            <>
              <span aria-hidden="true" className="h-3.5 w-px bg-border-strong" />
              <span className="max-w-[180px] truncate text-primary-text">
                {gewaehlteLabels.length <= 2 ? gewaehlteLabels.join(", ") : `${gewaehlteLabels.length} gewählt`}
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        {options.length >= 8 && (
          <Input
            inputSize="sm"
            leadingIcon={Search}
            placeholder="Filtern …"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            className="mb-2"
            aria-label={`${label} filtern`}
          />
        )}
        <div className="max-h-64 space-y-0.5 overflow-y-auto scrollbar-thin">
          {gefiltert.map((o) => (
            <label
              key={o.value}
              className="flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-13 text-foreground hover:bg-accent"
            >
              <Checkbox checked={selected.includes(o.value)} onCheckedChange={() => umschalten(o.value)} />
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
              {o.count != null && <span className="text-xs tabular-nums text-foreground-tertiary">{o.count}</span>}
            </label>
          ))}
          {gefiltert.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">Keine Treffer</p>
          )}
        </div>
        {aktiv && (
          <Button variant="ghost" size="sm" className="mt-1 w-full justify-start" onClick={() => onChange([])}>
            Filter zurücksetzen
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Segment-Steuerung für Listen („Alle · Offen · Überfällig") mit Zahl je
 * Segment – eine weiße Schiene, das aktive Segment hellblau hinterlegt.
 * Seiten-Navigation bleibt den Unterstrich-Reitern vorbehalten.
 */
export function Segmente<K extends string>({
  optionen,
  wert,
  onChange,
  label = "Ansicht",
  className,
}: {
  optionen: { key: K; label: string; anzahl?: number }[];
  wert: K;
  onChange: (k: K) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex h-8 max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-lg bg-card p-0.5 shadow-panel [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {optionen.map((o) => {
        const aktiv = o.key === wert;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={aktiv}
            onClick={() => onChange(o.key)}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2.5 text-13 font-medium transition-colors duration-fast",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
              aktiv ? "bg-primary-soft text-primary-text" : "text-foreground-secondary hover:bg-muted hover:text-foreground",
            )}
          >
            {o.label}
            {o.anzahl != null && (
              <span className={cn("tabular-nums", aktiv ? "text-primary-text/70" : "text-foreground-tertiary")}>
                {o.anzahl}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
