"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { Check, MoreHorizontal, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Panel } from "@/components/ui/panel";
import { FilterBar, FilterChip, Segmente } from "@/components/shared/filter-bar";
import { cn, formatDatum } from "@/lib/utils";
import { plusTage, tageBis, wochenbeginn, wochentagKurz } from "@/lib/zeit";
import type { Aufgabe, Fahrschueler } from "@/lib/types";
import { aufgabeErstellen, aufgabeLoeschen, aufgabeStatusSetzen } from "./actions";

export type AufgabeMitSchueler = Aufgabe & {
  fahrschueler: Pick<Fahrschueler, "id" | "vorname" | "nachname"> | null;
};

type Segment = "offen" | "ueberfaellig" | "erledigt";
type Gruppe = "ueberfaellig" | "heute" | "morgen" | "woche" | "spaeter" | "ohne";

const GRUPPEN: { key: Gruppe; label: string }[] = [
  { key: "ueberfaellig", label: "Überfällig" },
  { key: "heute", label: "Heute" },
  { key: "morgen", label: "Morgen" },
  { key: "woche", label: "Diese Woche" },
  { key: "spaeter", label: "Später" },
  { key: "ohne", label: "Ohne Fälligkeit" },
];

const PRIO: Record<string, { label: string; balken: number; rang: number }> = {
  hoch: { label: "Hohe Priorität", balken: 3, rang: 0 },
  mittel: { label: "Mittlere Priorität", balken: 2, rang: 1 },
  niedrig: { label: "Niedrige Priorität", balken: 1, rang: 2 },
};

function gruppeVon(a: Aufgabe, heute: string): Gruppe {
  if (!a.faellig_am) return "ohne";
  const t = tageBis(a.faellig_am, heute);
  if (t < 0) return "ueberfaellig";
  if (t === 0) return "heute";
  if (t === 1) return "morgen";
  if (a.faellig_am <= plusTage(wochenbeginn(heute), 6)) return "woche";
  return "spaeter";
}

function faelligText(datum: string, heute: string): string {
  const t = tageBis(datum, heute);
  if (t < -1) return `seit ${-t} Tagen`;
  if (t === -1) return "Gestern";
  if (t === 0) return "Heute";
  if (t === 1) return "Morgen";
  if (t < 7) return `${wochentagKurz(datum)}, ${formatDatum(datum).slice(0, 6)}`;
  return formatDatum(datum);
}

/** Priorität als Signalbalken wie in Linear – drei Balken, gefüllt nach Stufe. */
function PrioBalken({ prioritaet }: { prioritaet: string }) {
  const p = PRIO[prioritaet] ?? PRIO.mittel;
  return (
    <span title={p.label} aria-label={p.label} role="img" className="flex h-4 w-4 shrink-0 items-end justify-center gap-[2px]">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={cn(
            "w-[3px] rounded-[1px]",
            n === 1 ? "h-[6px]" : n === 2 ? "h-[9px]" : "h-[12px]",
            n <= p.balken ? (p.balken === 3 ? "bg-destructive" : "bg-foreground-secondary") : "bg-border-strong",
          )}
        />
      ))}
    </span>
  );
}

/** Eingabezeile oben in der Liste: Titel tippen, Enter – fertig. */
function SchnellErfassen() {
  const [state, action] = useFormState(aufgabeErstellen, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      toast.success("Aufgabe angelegt");
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex h-12 items-center gap-3 border-b border-border px-4">
      <Plus className="h-4 w-4 shrink-0 text-foreground-tertiary" strokeWidth={1.75} aria-hidden="true" />
      <input type="hidden" name="prioritaet" value="mittel" />
      <input
        name="titel"
        required
        autoComplete="off"
        placeholder="Aufgabe hinzufügen und mit Enter speichern"
        aria-label="Neue Aufgabe"
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-tertiary"
      />
      {state.error && <span className="shrink-0 text-xs text-destructive-text">{state.error}</span>}
    </form>
  );
}

export function AufgabenListe({ aufgaben, heute }: { aufgaben: AufgabeMitSchueler[]; heute: string }) {
  const [suche, setSuche] = useState("");
  const [segment, setSegment] = useState<Segment>("offen");
  const [prios, setPrios] = useState<string[]>([]);
  // Sofort sichtbarer Status, bevor der Server geantwortet hat.
  const [lokal, setLokal] = useState<Record<string, string>>({});
  // Gerade abgehakte Aufgaben bleiben durchgestrichen stehen, bis die Ansicht wechselt.
  const [frisch, setFrisch] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const statusVon = (a: Aufgabe) => lokal[a.id] ?? a.status;

  const zaehler = useMemo(() => {
    const offen = aufgaben.filter((a) => statusVon(a) !== "erledigt");
    return {
      offen: offen.length,
      ueberfaellig: offen.filter((a) => gruppeVon(a, heute) === "ueberfaellig").length,
      erledigt: aufgaben.length - offen.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aufgaben, lokal, heute]);

  const sichtbar = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return aufgaben.filter((a) => {
      const erledigt = statusVon(a) === "erledigt";
      if (segment === "erledigt" ? !erledigt : erledigt && !frisch.has(a.id)) return false;
      if (segment === "ueberfaellig" && gruppeVon(a, heute) !== "ueberfaellig") return false;
      if (prios.length && !prios.includes(a.prioritaet)) return false;
      if (!q) return true;
      const schueler = a.fahrschueler ? `${a.fahrschueler.vorname} ${a.fahrschueler.nachname}` : "";
      return `${a.titel} ${schueler}`.toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aufgaben, suche, segment, prios, lokal, frisch, heute]);

  const sortiert = (liste: AufgabeMitSchueler[]) =>
    [...liste].sort(
      (a, b) =>
        (a.faellig_am ?? "9999").localeCompare(b.faellig_am ?? "9999") ||
        (PRIO[a.prioritaet]?.rang ?? 1) - (PRIO[b.prioritaet]?.rang ?? 1),
    );

  const gruppen =
    segment === "erledigt"
      ? [{ key: "erledigt", label: "Erledigt", liste: sortiert(sichtbar).reverse() }]
      : GRUPPEN.map((g) => ({ ...g, liste: sortiert(sichtbar.filter((a) => gruppeVon(a, heute) === g.key)) })).filter(
          (g) => g.liste.length > 0,
        );

  function ansichtWechseln(s: Segment) {
    setFrisch(new Set());
    setSegment(s);
  }

  function statusSetzen(a: AufgabeMitSchueler, neu: "offen" | "erledigt", mitRueckgaengig = true) {
    setLokal((m) => ({ ...m, [a.id]: neu }));
    if (neu === "erledigt") setFrisch((s) => new Set(s).add(a.id));
    const daten = new FormData();
    daten.set("id", a.id);
    daten.set("status", neu);
    startTransition(async () => {
      await aufgabeStatusSetzen(daten);
      if (!mitRueckgaengig) return;
      toast.success(neu === "erledigt" ? `„${a.titel}“ erledigt` : `„${a.titel}“ wieder offen`, {
        action: {
          label: "Rückgängig",
          onClick: () => statusSetzen(a, neu === "erledigt" ? "offen" : "erledigt", false),
        },
      });
    });
  }

  function loeschen(a: AufgabeMitSchueler) {
    const daten = new FormData();
    daten.set("id", a.id);
    startTransition(async () => {
      await aufgabeLoeschen(daten);
      toast.success(`„${a.titel}“ gelöscht`);
    });
  }

  return (
    <div className="space-y-3">
      <Segmente
        optionen={[
          { key: "offen", label: "Offen", anzahl: zaehler.offen },
          { key: "ueberfaellig", label: "Überfällig", anzahl: zaehler.ueberfaellig },
          { key: "erledigt", label: "Erledigt", anzahl: zaehler.erledigt },
        ]}
        wert={segment}
        onChange={ansichtWechseln}
      />

      <Panel padding="none">
        <FilterBar
          search={{ placeholder: "Aufgabe oder Schüler suchen", value: suche, onChange: setSuche }}
          filters={
            <FilterChip
              label="Priorität"
              options={[
                { value: "hoch", label: "Hoch" },
                { value: "mittel", label: "Mittel" },
                { value: "niedrig", label: "Niedrig" },
              ]}
              selected={prios}
              onChange={setPrios}
            />
          }
        />

        {segment !== "erledigt" && <SchnellErfassen />}

        {gruppen.length === 0 ? (
          <p className="px-4 py-12 text-center text-13 text-foreground-secondary">
            {segment === "erledigt"
              ? "Noch nichts erledigt."
              : segment === "ueberfaellig"
                ? "Nichts überfällig – alles im Plan."
                : suche || prios.length
                  ? "Keine Aufgaben für diese Auswahl."
                  : "Keine offenen Aufgaben. Neue oben eintippen und mit Enter speichern."}
          </p>
        ) : (
          gruppen.map((g) => (
            <section key={g.key} aria-label={g.label}>
              <h3
                className={cn(
                  "flex items-center gap-2 border-b border-border bg-surface-muted/60 px-4 py-1.5 text-xs font-semibold",
                  g.key === "ueberfaellig" ? "text-destructive-text" : "text-foreground-secondary",
                )}
              >
                {g.label}
                <span className="font-medium tabular-nums text-foreground-tertiary">{g.liste.length}</span>
              </h3>
              <ul className="divide-y divide-border border-b border-border last:border-b-0">
                {g.liste.map((a) => {
                  const erledigt = statusVon(a) === "erledigt";
                  const ueberfaellig = !erledigt && a.faellig_am != null && a.faellig_am < heute;
                  return (
                    <li key={a.id} className="group flex min-h-12 items-center gap-3 px-4 py-2 transition-colors hover:bg-surface-muted/50">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={erledigt}
                        aria-label={erledigt ? `„${a.titel}“ wieder öffnen` : `„${a.titel}“ abhaken`}
                        onClick={() => statusSetzen(a, erledigt ? "offen" : "erledigt")}
                        className={cn(
                          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-fast",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
                          erledigt
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border-strong bg-card text-transparent hover:border-primary hover:text-primary/60",
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </button>

                      <PrioBalken prioritaet={a.prioritaet} />

                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-sm",
                          erledigt ? "text-foreground-tertiary line-through" : "font-medium text-foreground",
                        )}
                      >
                        {a.titel}
                      </span>

                      {a.fahrschueler && (
                        <Link
                          href={`/schueler/${a.fahrschueler.id}`}
                          className="hidden max-w-[180px] shrink-0 truncate rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-primary-soft hover:text-primary-text sm:block"
                        >
                          {a.fahrschueler.vorname} {a.fahrschueler.nachname}
                        </Link>
                      )}

                      <span
                        className={cn(
                          "w-[92px] shrink-0 text-right text-13 tabular-nums",
                          ueberfaellig ? "font-medium text-destructive-text" : "text-foreground-secondary",
                        )}
                      >
                        {a.faellig_am ? faelligText(a.faellig_am, heute) : ""}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Aktionen"
                            className="shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onSelect={() => statusSetzen(a, erledigt ? "offen" : "erledigt")} className="cursor-pointer">
                            {erledigt ? <RotateCcw /> : <Check />}
                            {erledigt ? "Wieder öffnen" : "Als erledigt markieren"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="danger" onSelect={() => loeschen(a)} className="cursor-pointer">
                            <Trash2 /> Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </Panel>
    </div>
  );
}
