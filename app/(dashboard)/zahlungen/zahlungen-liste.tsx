"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterChip, Segmente } from "@/components/shared/filter-bar";
import { ZAHLARTEN } from "@/lib/constants";
import { formatDatum, formatEuro } from "@/lib/utils";
import type { Fahrschueler, Rechnung, Zahlung } from "@/lib/types";
import { zahlungLoeschen } from "./actions";

export type ZahlungRow = Zahlung & {
  fahrschueler: Pick<Fahrschueler, "id" | "vorname" | "nachname"> | null;
  rechnung: Pick<Rechnung, "id" | "nummer"> | null;
};

type Segment = "alle" | "zugeordnet" | "ohne";

export function ZahlungenListe({ zahlungen }: { zahlungen: ZahlungRow[] }) {
  const [suche, setSuche] = useState("");
  const [segment, setSegment] = useState<Segment>("alle");
  const [arten, setArten] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return zahlungen.filter((z) => {
      if (segment === "zugeordnet" && !z.rechnung_id) return false;
      if (segment === "ohne" && z.rechnung_id) return false;
      if (arten.length && !arten.includes(z.art)) return false;
      if (!q) return true;
      const schueler = z.fahrschueler ? `${z.fahrschueler.vorname} ${z.fahrschueler.nachname}` : "";
      return `${schueler} ${z.rechnung?.nummer ?? ""} ${z.notiz ?? ""}`.toLowerCase().includes(q);
    });
  }, [zahlungen, suche, segment, arten]);

  const summe = gefiltert.reduce((s, z) => s + Number(z.betrag ?? 0), 0);

  function loeschen(z: ZahlungRow) {
    const daten = new FormData();
    daten.set("id", z.id);
    startTransition(async () => {
      await zahlungLoeschen(daten);
      toast.success(`Zahlung über ${formatEuro(Number(z.betrag))} gelöscht`);
    });
  }

  function exportCsv() {
    const kopf = ["Datum", "Schüler", "Rechnung", "Zahlart", "Betrag", "Notiz"];
    const zeilen = gefiltert.map((z) => [
      formatDatum(z.datum),
      z.fahrschueler ? `${z.fahrschueler.vorname} ${z.fahrschueler.nachname}` : "",
      z.rechnung?.nummer ?? "",
      ZAHLARTEN[z.art] ?? z.art,
      Number(z.betrag).toFixed(2).replace(".", ","),
      z.notiz ?? "",
    ]);
    const csv = [kopf, ...zeilen].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "zahlungen.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportiert");
  }

  const spalten: DataTableColumn<ZahlungRow>[] = [
    {
      key: "datum",
      header: "Datum",
      width: "112px",
      sortValue: (z) => z.datum,
      cell: (z) => <span className="tabular-nums text-foreground">{formatDatum(z.datum)}</span>,
    },
    {
      key: "schueler",
      header: "Schüler",
      primary: true,
      sortValue: (z) => (z.fahrschueler ? `${z.fahrschueler.nachname} ${z.fahrschueler.vorname}` : ""),
      cell: (z) =>
        z.fahrschueler ? (
          <span className="font-medium text-foreground">
            {z.fahrschueler.vorname} {z.fahrschueler.nachname}
          </span>
        ) : (
          <span className="text-foreground-tertiary">Ohne Schüler</span>
        ),
    },
    {
      key: "rechnung",
      header: "Rechnung",
      sortValue: (z) => z.rechnung?.nummer ?? "",
      cell: (z) =>
        z.rechnung ? (
          <Link
            href={`/rechnungen/${z.rechnung.id}`}
            onClick={(e) => e.stopPropagation()}
            className="tabular-nums text-primary-text hover:underline"
          >
            {z.rechnung.nummer}
          </Link>
        ) : (
          <span className="text-foreground-tertiary">Nicht zugeordnet</span>
        ),
    },
    {
      key: "art",
      header: "Zahlart",
      hideBelow: "md",
      sortValue: (z) => ZAHLARTEN[z.art] ?? z.art,
      cell: (z) => <span className="text-foreground-secondary">{ZAHLARTEN[z.art] ?? z.art}</span>,
    },
    {
      key: "notiz",
      header: "Notiz",
      hideBelow: "lg",
      cell: (z) => <span className="block max-w-[280px] truncate text-foreground-secondary">{z.notiz || "—"}</span>,
    },
    {
      key: "betrag",
      header: "Betrag",
      numeric: true,
      sortValue: (z) => Number(z.betrag),
      cell: (z) => <span className="font-medium text-foreground">{formatEuro(Number(z.betrag))}</span>,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmente
          optionen={[
            { key: "alle", label: "Alle", anzahl: zahlungen.length },
            { key: "zugeordnet", label: "Zugeordnet", anzahl: zahlungen.filter((z) => z.rechnung_id).length },
            { key: "ohne", label: "Ohne Rechnung", anzahl: zahlungen.filter((z) => !z.rechnung_id).length },
          ]}
          wert={segment}
          onChange={setSegment}
        />
        <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
          <Download /> Exportieren
        </Button>
      </div>
      <DataTable
        rows={gefiltert}
        columns={spalten}
        getRowId={(z) => z.id}
        rowHref={(z) => (z.fahrschueler ? `/schueler/${z.fahrschueler.id}` : z.rechnung ? `/rechnungen/${z.rechnung.id}` : undefined)}
        defaultSort={{ key: "datum", dir: "desc" }}
        itemLabel="Zahlungen"
        caption="Zahlungen"
        rowActions={(z) => [
          ...(z.rechnung ? [{ label: "Rechnung öffnen", href: `/rechnungen/${z.rechnung.id}` }] : []),
          ...(z.fahrschueler ? [{ label: "Schülerakte öffnen", href: `/schueler/${z.fahrschueler.id}` }] : []),
          { label: "Löschen", icon: Trash2, variant: "danger" as const, onSelect: () => loeschen(z), separatorBefore: true },
        ]}
        toolbar={
          <FilterBar
            search={{ placeholder: "Schüler, Rechnung oder Notiz", value: suche, onChange: setSuche }}
            filters={
              <FilterChip
                label="Zahlart"
                options={Object.entries(ZAHLARTEN).map(([value, label]) => ({ value, label }))}
                selected={arten}
                onChange={setArten}
              />
            }
            count={gefiltert.length ? `Summe ${formatEuro(summe)}` : undefined}
          />
        }
        mobileCard={(z) => (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {z.fahrschueler ? `${z.fahrschueler.vorname} ${z.fahrschueler.nachname}` : "Ohne Schüler"}
              </p>
              <p className="truncate text-13 text-foreground-secondary">
                {formatDatum(z.datum)} · {ZAHLARTEN[z.art] ?? z.art}
                {z.rechnung ? ` · ${z.rechnung.nummer}` : ""}
              </p>
            </div>
            <span className="shrink-0 text-13 font-medium tabular-nums text-foreground">{formatEuro(Number(z.betrag))}</span>
          </div>
        )}
        emptyState={<p className="px-4 py-10 text-center text-13 text-foreground-secondary">Keine Zahlungen für diese Auswahl.</p>}
      />
    </div>
  );
}
