"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterChip, Segmente } from "@/components/shared/filter-bar";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { formatDatum, formatEuro, formatUhrzeit } from "@/lib/utils";
import { wochentagKurz } from "@/lib/zeit";
import type { PruefungMitSchueler } from "@/lib/types";
import { pruefungErgebnisSetzen, pruefungLoeschen } from "./actions";

type Segment = "anstehend" | "fehlt" | "ergebnisse" | "alle";

const ART_LABEL: Record<string, string> = { theorie: "Theorie", praxis: "Praxis" };

export function PruefungenListe({ pruefungen, heute }: { pruefungen: PruefungMitSchueler[]; heute: string }) {
  const [suche, setSuche] = useState("");
  const [arten, setArten] = useState<string[]>([]);
  const [stellen, setStellen] = useState<string[]>([]);
  // Offene Prüfungen aus der Vergangenheit brauchen zuerst ein Ergebnis.
  const fehlend = pruefungen.filter((p) => p.ergebnis === "offen" && p.datum < heute);
  const [gewaehlt, setSegment] = useState<Segment>(fehlend.length ? "fehlt" : "anstehend");
  // Sind alle Ergebnisse nachgetragen, verschwindet „Ergebnis fehlt" – dann zurück zu „Anstehend".
  const segment: Segment = gewaehlt === "fehlt" && fehlend.length === 0 ? "anstehend" : gewaehlt;
  const [, startTransition] = useTransition();

  const passt = (p: PruefungMitSchueler, s: Segment) => {
    if (s === "anstehend") return p.ergebnis === "offen" && p.datum >= heute;
    if (s === "fehlt") return p.ergebnis === "offen" && p.datum < heute;
    if (s === "ergebnisse") return p.ergebnis !== "offen";
    return true;
  };

  const stellenOptionen = useMemo(
    () =>
      Array.from(new Set(pruefungen.map((p) => p.pruefstelle).filter((x): x is string => Boolean(x))))
        .sort()
        .map((x) => ({ value: x, label: x })),
    [pruefungen],
  );

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return pruefungen.filter((p) => {
      if (!passt(p, segment)) return false;
      if (arten.length && !arten.includes(p.art)) return false;
      if (stellen.length && !stellen.includes(p.pruefstelle ?? "")) return false;
      if (!q) return true;
      const name = p.fahrschueler ? `${p.fahrschueler.vorname} ${p.fahrschueler.nachname}` : "";
      return `${name} ${p.pruefstelle ?? ""} ${p.klasse ?? ""}`.toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pruefungen, suche, segment, arten, stellen, heute]);

  function ergebnis(p: PruefungMitSchueler, wert: "bestanden" | "nicht_bestanden") {
    const daten = new FormData();
    daten.set("id", p.id);
    daten.set("ergebnis", wert);
    daten.set("schueler_id", p.schueler_id ?? "");
    daten.set("art", p.art);
    const name = p.fahrschueler ? `${p.fahrschueler.vorname} ${p.fahrschueler.nachname}` : "Prüfung";
    startTransition(async () => {
      await pruefungErgebnisSetzen(daten);
      toast.success(wert === "bestanden" ? `${name}: bestanden` : `${name}: nicht bestanden`);
    });
  }

  function loeschen(p: PruefungMitSchueler) {
    const daten = new FormData();
    daten.set("id", p.id);
    startTransition(async () => {
      await pruefungLoeschen(daten);
      toast.success("Prüfung gelöscht");
    });
  }

  const spalten: DataTableColumn<PruefungMitSchueler>[] = [
    {
      key: "termin",
      header: "Termin",
      width: "132px",
      sortValue: (p) => `${p.datum} ${p.uhrzeit ?? ""}`,
      cell: (p) => (
        <span className="block leading-tight tabular-nums">
          <span className="block font-medium text-foreground">
            {p.datum === heute ? "Heute" : `${wochentagKurz(p.datum)}, ${formatDatum(p.datum)}`}
          </span>
          {p.uhrzeit && <span className="block text-xs text-foreground-secondary">{formatUhrzeit(p.uhrzeit)} Uhr</span>}
        </span>
      ),
    },
    {
      key: "schueler",
      header: "Schüler",
      primary: true,
      sortValue: (p) => (p.fahrschueler ? `${p.fahrschueler.nachname} ${p.fahrschueler.vorname}` : ""),
      cell: (p) =>
        p.fahrschueler ? (
          <span className="flex min-w-0 items-center gap-3">
            <SchuelerAvatar vorname={p.fahrschueler.vorname} nachname={p.fahrschueler.nachname} className="h-7 w-7 text-[11px]" />
            <span className="min-w-0">
              <span className="block truncate font-medium text-foreground">
                {p.fahrschueler.vorname} {p.fahrschueler.nachname}
              </span>
              <span className="block truncate text-xs text-foreground-tertiary">
                {p.klasse ? `Klasse ${p.klasse} · ` : ""}
                {p.versuch}. Versuch
              </span>
            </span>
          </span>
        ) : (
          <span className="text-foreground-tertiary">Ohne Schüler</span>
        ),
    },
    {
      key: "art",
      header: "Art",
      sortValue: (p) => p.art,
      cell: (p) => <span className="text-foreground">{ART_LABEL[p.art] ?? p.art}</span>,
    },
    {
      key: "stelle",
      header: "Prüfstelle",
      hideBelow: "md",
      sortValue: (p) => p.pruefstelle ?? "",
      cell: (p) => <span className="text-foreground-secondary">{p.pruefstelle || "—"}</span>,
    },
    {
      key: "gebuehr",
      header: "Gebühr",
      numeric: true,
      hideBelow: "xl",
      sortValue: (p) => p.gebuehr,
      cell: (p) => (p.gebuehr != null ? formatEuro(Number(p.gebuehr)) : <span className="text-foreground-tertiary">—</span>),
    },
    {
      key: "ergebnis",
      header: "Ergebnis",
      width: "236px",
      sortValue: (p) => p.ergebnis,
      cell: (p) => {
        if (p.ergebnis === "bestanden") return <StatusDot ton="success">Bestanden</StatusDot>;
        if (p.ergebnis === "nicht_bestanden") return <StatusDot ton="destructive">Nicht bestanden</StatusDot>;
        if (p.datum > heute) return <StatusDot ton="primary">Geplant</StatusDot>;
        return (
          <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button type="button" variant="outline" size="xs" onClick={() => ergebnis(p, "bestanden")}>
              <Check /> Bestanden
            </Button>
            <Button type="button" variant="outline" size="xs" onClick={() => ergebnis(p, "nicht_bestanden")}>
              <X /> Nicht bestanden
            </Button>
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      <Segmente
        optionen={[
          { key: "anstehend", label: "Anstehend", anzahl: pruefungen.filter((p) => passt(p, "anstehend")).length },
          ...(fehlend.length ? [{ key: "fehlt" as const, label: "Ergebnis fehlt", anzahl: fehlend.length }] : []),
          { key: "ergebnisse", label: "Ergebnisse", anzahl: pruefungen.filter((p) => passt(p, "ergebnisse")).length },
          { key: "alle", label: "Alle", anzahl: pruefungen.length },
        ]}
        wert={segment}
        onChange={setSegment}
      />
      <DataTable
        key={segment}
        rows={gefiltert}
        columns={spalten}
        getRowId={(p) => p.id}
        rowHref={(p) => (p.fahrschueler ? `/schueler/${p.fahrschueler.id}` : undefined)}
        defaultSort={{ key: "termin", dir: segment === "anstehend" ? "asc" : "desc" }}
        itemLabel="Prüfungen"
        caption="Prüfungen"
        rowActions={(p) => [
          ...(p.ergebnis === "offen"
            ? [
                { label: "Als bestanden eintragen", icon: Check, onSelect: () => ergebnis(p, "bestanden") },
                { label: "Als nicht bestanden eintragen", icon: X, onSelect: () => ergebnis(p, "nicht_bestanden") },
              ]
            : []),
          ...(p.fahrschueler ? [{ label: "Schülerakte öffnen", href: `/schueler/${p.fahrschueler.id}` }] : []),
          { label: "Löschen", icon: Trash2, variant: "danger" as const, onSelect: () => loeschen(p), separatorBefore: true },
        ]}
        toolbar={
          <FilterBar
            search={{ placeholder: "Schüler, Klasse oder Prüfstelle", value: suche, onChange: setSuche }}
            filters={
              <>
                <FilterChip
                  label="Art"
                  options={[
                    { value: "theorie", label: "Theorie" },
                    { value: "praxis", label: "Praxis" },
                  ]}
                  selected={arten}
                  onChange={setArten}
                />
                {stellenOptionen.length > 1 && (
                  <FilterChip label="Prüfstelle" options={stellenOptionen} selected={stellen} onChange={setStellen} />
                )}
              </>
            }
          />
        }
        mobileCard={(p) => (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {p.fahrschueler ? `${p.fahrschueler.vorname} ${p.fahrschueler.nachname}` : "Ohne Schüler"}
              </p>
              <p className="truncate text-13 text-foreground-secondary">
                {formatDatum(p.datum)} · {ART_LABEL[p.art] ?? p.art}
                {p.pruefstelle ? ` · ${p.pruefstelle}` : ""}
              </p>
            </div>
            <span className="shrink-0 text-13 text-foreground-secondary">
              {p.ergebnis === "bestanden" ? "Bestanden" : p.ergebnis === "nicht_bestanden" ? "Nicht bestanden" : "Offen"}
            </span>
          </div>
        )}
        emptyState={
          <p className="px-4 py-10 text-center text-13 text-foreground-secondary">
            {segment === "anstehend" ? "Keine Prüfungen geplant." : "Keine Prüfungen für diese Auswahl."}
          </p>
        }
      />
    </div>
  );
}
