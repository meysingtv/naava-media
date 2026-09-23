"use client";

import { useMemo, useState, useTransition } from "react";
import { Archive, ArchiveRestore, Car, Pencil } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterChip, Segmente } from "@/components/shared/filter-bar";
import { Kennzeichen } from "@/components/shared/kennzeichen";
import { getriebeLabel } from "@/lib/constants";
import { fahrzeugKlassen, fahrzeugName, frist, fristText, naechsteHu } from "@/lib/fahrzeug";
import { cn, formatDatum } from "@/lib/utils";
import type { Fahrzeug } from "@/lib/types";
import { fahrzeugAktivSetzen } from "./actions";

type Segment = "aktiv" | "archiv" | "alle";

/** Datum einer Frist, darunter „in 12 Tagen" oder „seit 3 Tagen fällig". */
function FristZelle({ datum, heute, bald }: { datum: string | null; heute: string; bald: number }) {
  const f = frist(datum, heute, bald);
  if (!datum || !f) return <span className="text-foreground-tertiary">—</span>;
  return (
    <span className="block leading-tight">
      <span className={cn("block tabular-nums", f.ton === "ueberfaellig" ? "font-medium text-destructive-text" : "text-foreground")}>
        {formatDatum(datum)}
      </span>
      {f.ton !== "ok" && (
        <span className={cn("block text-xs", f.ton === "ueberfaellig" ? "text-destructive-text" : "text-warning-text")}>
          {fristText(f.tage)}
        </span>
      )}
    </span>
  );
}

export function FahrzeugListe({
  fahrzeuge,
  kuerzelMap,
  wocheMap,
  heute,
}: {
  fahrzeuge: Fahrzeug[];
  kuerzelMap: Record<string, string>;
  /** Fahrstunden je Fahrzeug in dieser Woche. */
  wocheMap: Record<string, number>;
  heute: string;
}) {
  const [suche, setSuche] = useState("");
  const [segment, setSegment] = useState<Segment>("aktiv");
  const [klassen, setKlassen] = useState<string[]>([]);
  const [getriebe, setGetriebe] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  const klassenOptionen = useMemo(() => {
    const set = new Set<string>();
    for (const f of fahrzeuge) for (const k of fahrzeugKlassen(f)) set.add(k);
    return Array.from(set)
      .sort()
      .map((k) => ({ value: k, label: `Klasse ${k}` }));
  }, [fahrzeuge]);

  const zaehler = {
    aktiv: fahrzeuge.filter((f) => f.aktiv).length,
    archiv: fahrzeuge.filter((f) => !f.aktiv).length,
    alle: fahrzeuge.length,
  };

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return fahrzeuge.filter((f) => {
      if (segment === "aktiv" && !f.aktiv) return false;
      if (segment === "archiv" && f.aktiv) return false;
      if (klassen.length && !fahrzeugKlassen(f).some((k) => klassen.includes(k))) return false;
      if (getriebe.length && !getriebe.includes(getriebeLabel(f.getriebeart))) return false;
      if (!q) return true;
      return `${fahrzeugName(f)} ${f.kennzeichen} ${f.fahrzeug_id_nr ?? ""}`.toLowerCase().includes(q);
    });
  }, [fahrzeuge, suche, segment, klassen, getriebe]);

  function aktivSetzen(f: Fahrzeug) {
    const daten = new FormData();
    daten.set("id", f.id);
    daten.set("aktiv", String(!f.aktiv));
    startTransition(async () => {
      await fahrzeugAktivSetzen(daten);
      toast.success(f.aktiv ? `${fahrzeugName(f)} archiviert` : `${fahrzeugName(f)} ist wieder im Einsatz`);
    });
  }

  const spalten: DataTableColumn<Fahrzeug>[] = [
    {
      key: "name",
      header: "Fahrzeug",
      primary: true,
      sortValue: (f) => fahrzeugName(f),
      cell: (f) => (
        <span className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
              f.aktiv ? "bg-primary-soft text-primary-text" : "bg-muted text-foreground-tertiary",
            )}
          >
            <Car className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground">{fahrzeugName(f)}</span>
            <span className="block truncate text-xs text-foreground-tertiary">
              {getriebeLabel(f.getriebeart)}
              {f.anhaenger ? " · mit Anhänger" : ""}
              {!f.aktiv ? " · archiviert" : ""}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "kennzeichen",
      header: "Kennzeichen",
      sortValue: (f) => f.kennzeichen,
      cell: (f) => <Kennzeichen>{f.kennzeichen}</Kennzeichen>,
    },
    {
      key: "klassen",
      header: "Klassen",
      sortValue: (f) => fahrzeugKlassen(f)[0] ?? "",
      cell: (f) => <span className="text-foreground">{fahrzeugKlassen(f).join(", ") || "—"}</span>,
    },
    {
      key: "lehrer",
      header: "Fahrlehrer",
      hideBelow: "xl",
      cell: (f) => {
        const kuerzel = (f.fahrlehrer_ids ?? []).map((id) => kuerzelMap[id]).filter(Boolean);
        return kuerzel.length ? (
          <span className="flex flex-wrap gap-1">
            {kuerzel.map((k, i) => (
              <span
                key={`${k}-${i}`}
                className="inline-flex h-5 items-center rounded-sm bg-muted px-1.5 text-2xs font-semibold text-foreground-secondary"
              >
                {k}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-foreground-tertiary">—</span>
        );
      },
    },
    {
      key: "woche",
      header: "Diese Woche",
      numeric: true,
      hideBelow: "md",
      sortValue: (f) => wocheMap[f.id] ?? 0,
      cell: (f) => {
        const n = wocheMap[f.id] ?? 0;
        return n ? `${n} ${n === 1 ? "Termin" : "Termine"}` : <span className="text-foreground-tertiary">—</span>;
      },
    },
    {
      key: "hu",
      header: "Nächste HU",
      hideBelow: "md",
      sortValue: (f) => naechsteHu(f),
      cell: (f) => <FristZelle datum={naechsteHu(f)} heute={heute} bald={60} />,
    },
    {
      key: "wartung",
      header: "Wartung",
      hideBelow: "lg",
      sortValue: (f) => f.naechste_wartung,
      cell: (f) => <FristZelle datum={f.naechste_wartung} heute={heute} bald={30} />,
    },
    {
      key: "km",
      header: "Kilometer",
      numeric: true,
      hideBelow: "xl",
      sortValue: (f) => f.km_stand,
      cell: (f) =>
        f.km_stand != null ? (
          `${f.km_stand.toLocaleString("de-DE")} km`
        ) : (
          <span className="text-foreground-tertiary">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-3">
      <Segmente
        optionen={[
          { key: "aktiv", label: "Im Einsatz", anzahl: zaehler.aktiv },
          { key: "archiv", label: "Archiviert", anzahl: zaehler.archiv },
          { key: "alle", label: "Alle", anzahl: zaehler.alle },
        ]}
        wert={segment}
        onChange={setSegment}
      />
      <DataTable
        rows={gefiltert}
        columns={spalten}
        getRowId={(f) => f.id}
        rowHref={(f) => `/fahrzeuge/${f.id}`}
        defaultSort={{ key: "name", dir: "asc" }}
        itemLabel="Fahrzeuge"
        caption="Fahrzeuge"
        rowActions={(f) => [
          { label: "Bearbeiten", icon: Pencil, href: `/fahrzeuge/${f.id}/bearbeiten` },
          {
            label: f.aktiv ? "Archivieren" : "Wieder in Einsatz nehmen",
            icon: f.aktiv ? Archive : ArchiveRestore,
            onSelect: () => aktivSetzen(f),
            separatorBefore: true,
          },
        ]}
        toolbar={
          <FilterBar
            search={{ placeholder: "Name, Kennzeichen oder Ident-Nr.", value: suche, onChange: setSuche }}
            filters={
              <>
                {klassenOptionen.length > 1 && (
                  <FilterChip label="Klasse" options={klassenOptionen} selected={klassen} onChange={setKlassen} />
                )}
                <FilterChip
                  label="Getriebe"
                  options={[
                    { value: "Schaltung", label: "Schaltung" },
                    { value: "Automatik", label: "Automatik" },
                  ]}
                  selected={getriebe}
                  onChange={setGetriebe}
                />
              </>
            }
          />
        }
        mobileCard={(f) => {
          const hu = frist(naechsteHu(f), heute, 60);
          return (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{fahrzeugName(f)}</p>
                <p className="truncate text-13 text-foreground-secondary">
                  Klasse {fahrzeugKlassen(f).join(", ") || "—"} · {getriebeLabel(f.getriebeart)}
                  {hu && hu.ton !== "ok" ? ` · HU ${fristText(hu.tage)}` : ""}
                </p>
              </div>
              <Kennzeichen>{f.kennzeichen}</Kennzeichen>
            </div>
          );
        }}
        emptyState={
          <p className="px-4 py-10 text-center text-13 text-foreground-secondary">
            {segment === "archiv" ? "Keine archivierten Fahrzeuge." : "Keine Fahrzeuge für diese Auswahl."}
          </p>
        }
      />
    </div>
  );
}
