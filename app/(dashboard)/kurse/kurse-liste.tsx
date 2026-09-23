"use client";

import { useMemo, useState } from "react";

import { StatusDot } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, Segmente } from "@/components/shared/filter-bar";
import { KURS_STATUS, THEORIE_GRUNDSTOFF } from "@/lib/constants";
import { cn, formatDatum } from "@/lib/utils";
import type { Kurs } from "@/lib/types";

export type KursZeile = Kurs & {
  kurs_teilnahme: { count: number }[] | null;
  /** Bereits gehaltene Theorie-Einheiten. */
  stunden: number;
  /** Nächste Theoriestunde des Kurses. */
  naechste: string | null;
};

type Segment = "aktiv" | "beendet" | "alle";

export function KurseListe({ kurse }: { kurse: KursZeile[] }) {
  const [suche, setSuche] = useState("");
  const [segment, setSegment] = useState<Segment>("aktiv");

  const passt = (k: KursZeile, s: Segment) => (s === "aktiv" ? k.status !== "beendet" : s === "beendet" ? k.status === "beendet" : true);

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return kurse.filter((k) => passt(k, segment) && (!q || `${k.name} ${k.klasse ?? ""} ${k.beschreibung ?? ""}`.toLowerCase().includes(q)));
  }, [kurse, suche, segment]);

  const spalten: DataTableColumn<KursZeile>[] = [
    {
      key: "name",
      header: "Kurs",
      primary: true,
      sortValue: (k) => k.name,
      cell: (k) => (
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{k.name}</span>
          {k.beschreibung && <span className="block max-w-[360px] truncate text-xs text-foreground-tertiary">{k.beschreibung}</span>}
        </span>
      ),
    },
    {
      key: "klasse",
      header: "Klasse",
      width: "80px",
      sortValue: (k) => k.klasse ?? "",
      cell: (k) => <span className="text-foreground">{k.klasse || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (k) => ["laufend", "geplant", "beendet"].indexOf(k.status),
      cell: (k) => {
        const st = KURS_STATUS[k.status] ?? KURS_STATUS.geplant;
        return <StatusDot ton={st.ton}>{st.label}</StatusDot>;
      },
    },
    {
      key: "start",
      header: "Start",
      hideBelow: "md",
      sortValue: (k) => k.start_datum,
      cell: (k) => <span className="tabular-nums text-foreground-secondary">{k.start_datum ? formatDatum(k.start_datum) : "—"}</span>,
    },
    {
      key: "fortschritt",
      header: "Grundstoff",
      hideBelow: "lg",
      sortValue: (k) => k.stunden,
      cell: (k) => {
        const prozent = Math.min(100, Math.round((k.stunden / THEORIE_GRUNDSTOFF) * 100));
        return (
          <span className="flex items-center gap-2.5">
            <span className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
              <span className={cn("block h-full rounded-full", prozent >= 100 ? "bg-success" : "bg-primary")} style={{ width: `${prozent}%` }} />
            </span>
            <span className="whitespace-nowrap text-13 tabular-nums text-foreground-secondary">
              {Math.min(k.stunden, THEORIE_GRUNDSTOFF)} / {THEORIE_GRUNDSTOFF}
            </span>
          </span>
        );
      },
    },
    {
      key: "naechste",
      header: "Nächste Stunde",
      hideBelow: "xl",
      sortValue: (k) => k.naechste,
      cell: (k) => <span className="tabular-nums text-foreground-secondary">{k.naechste ? formatDatum(k.naechste) : "—"}</span>,
    },
    {
      key: "teilnehmer",
      header: "Teilnehmer",
      numeric: true,
      sortValue: (k) => k.kurs_teilnahme?.[0]?.count ?? 0,
      cell: (k) => k.kurs_teilnahme?.[0]?.count ?? 0,
    },
  ];

  return (
    <div className="space-y-3">
      <Segmente
        optionen={[
          { key: "aktiv", label: "Aktuell", anzahl: kurse.filter((k) => passt(k, "aktiv")).length },
          { key: "beendet", label: "Beendet", anzahl: kurse.filter((k) => passt(k, "beendet")).length },
          { key: "alle", label: "Alle", anzahl: kurse.length },
        ]}
        wert={segment}
        onChange={setSegment}
      />
      <DataTable
        rows={gefiltert}
        columns={spalten}
        getRowId={(k) => k.id}
        rowHref={(k) => `/kurse/${k.id}`}
        defaultSort={{ key: "status", dir: "asc" }}
        itemLabel="Kurse"
        caption="Kurse"
        toolbar={<FilterBar search={{ placeholder: "Kursname, Klasse oder Beschreibung", value: suche, onChange: setSuche }} />}
        mobileCard={(k) => (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{k.name}</p>
              <p className="truncate text-13 text-foreground-secondary">
                {(KURS_STATUS[k.status] ?? KURS_STATUS.geplant).label}
                {k.klasse ? ` · Klasse ${k.klasse}` : ""} · {k.kurs_teilnahme?.[0]?.count ?? 0} Teilnehmer
              </p>
            </div>
          </div>
        )}
        emptyState={<p className="px-4 py-10 text-center text-13 text-foreground-secondary">Keine Kurse für diese Auswahl.</p>}
      />
    </div>
  );
}
