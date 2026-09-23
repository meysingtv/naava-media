"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, Segmente } from "@/components/shared/filter-bar";
import { RECHNUNG_STATUS } from "@/lib/constants";
import { formatDatum, formatEuro } from "@/lib/utils";
import type { RechnungMitSchueler } from "@/lib/types";

type Segment = "alle" | "offen" | "ueberfaellig" | "bezahlt";

function tageSeit(iso: string | null, heute: string): number {
  if (!iso) return 0;
  const a = new Date(`${iso}T12:00:00`).getTime();
  const b = new Date(`${heute}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Eine Rechnung gilt als überfällig, wenn sie so markiert oder ihre Frist verstrichen ist. */
function istUeberfaellig(r: RechnungMitSchueler, heute: string): boolean {
  if (r.status === "bezahlt") return false;
  return (
    r.status === "ueberfaellig" ||
    Boolean(r.faelligkeitsdatum && r.faelligkeitsdatum < heute)
  );
}

export function RechnungenTabelle({
  rechnungen,
  heute,
}: {
  rechnungen: RechnungMitSchueler[];
  heute: string;
}) {
  const [suche, setSuche] = useState("");
  const [segment, setSegment] = useState<Segment>("alle");

  const anzahl = useMemo(
    () => ({
      alle: rechnungen.length,
      offen: rechnungen.filter(
        (r) => r.status !== "bezahlt" && !istUeberfaellig(r, heute),
      ).length,
      ueberfaellig: rechnungen.filter((r) => istUeberfaellig(r, heute)).length,
      bezahlt: rechnungen.filter((r) => r.status === "bezahlt").length,
    }),
    [rechnungen, heute],
  );

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return rechnungen.filter((r) => {
      if (
        segment === "offen" &&
        (r.status === "bezahlt" || istUeberfaellig(r, heute))
      )
        return false;
      if (segment === "ueberfaellig" && !istUeberfaellig(r, heute))
        return false;
      if (segment === "bezahlt" && r.status !== "bezahlt") return false;
      if (!q) return true;
      const name = r.fahrschueler
        ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}`
        : "";
      return (
        r.nummer.toLowerCase().includes(q) || name.toLowerCase().includes(q)
      );
    });
  }, [rechnungen, suche, segment, heute]);

  const spalten: DataTableColumn<RechnungMitSchueler>[] = [
    {
      key: "nummer",
      header: "Nummer",
      primary: true,
      width: "132px",
      sortValue: (r) => r.nummer,
      cell: (r) => (
        <span className="font-medium text-foreground">{r.nummer}</span>
      ),
    },
    {
      key: "schueler",
      header: "Schüler",
      sortValue: (r) =>
        r.fahrschueler
          ? `${r.fahrschueler.nachname} ${r.fahrschueler.vorname}`
          : "",
      cell: (r) =>
        r.fahrschueler ? (
          <span className="truncate text-foreground">
            {r.fahrschueler.vorname} {r.fahrschueler.nachname}
          </span>
        ) : (
          <span className="text-foreground-tertiary">Ohne Schüler</span>
        ),
    },
    {
      key: "datum",
      header: "Datum",
      sortValue: (r) => r.rechnungsdatum,
      cell: (r) => (
        <span className="text-foreground-secondary">
          {formatDatum(r.rechnungsdatum)}
        </span>
      ),
    },
    {
      key: "faellig",
      header: "Fällig",
      hideBelow: "md",
      sortValue: (r) => r.faelligkeitsdatum ?? null,
      cell: (r) => {
        if (!r.faelligkeitsdatum)
          return <span className="text-foreground-tertiary">—</span>;
        if (istUeberfaellig(r, heute)) {
          const tage = tageSeit(r.faelligkeitsdatum, heute);
          return (
            <span className="text-destructive-text">
              {formatDatum(r.faelligkeitsdatum)}
              {tage > 0 && (
                <span className="ml-1.5 text-xs">
                  seit {tage} {tage === 1 ? "Tag" : "Tagen"}
                </span>
              )}
            </span>
          );
        }
        return (
          <span className="text-foreground-secondary">
            {formatDatum(r.faelligkeitsdatum)}
          </span>
        );
      },
    },
    {
      key: "mahnstufe",
      header: "Mahnstufe",
      hideBelow: "lg",
      sortValue: (r) => r.mahnstufe ?? 0,
      cell: (r) =>
        r.mahnstufe > 0 ? (
          <span className="text-foreground">{r.mahnstufe}. Mahnung</span>
        ) : (
          <span className="text-foreground-tertiary">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      width: "128px",
      sortValue: (r) =>
        istUeberfaellig(r, heute) ? 0 : r.status === "offen" ? 1 : 2,
      cell: (r) => {
        const ueber = istUeberfaellig(r, heute);
        const st = RECHNUNG_STATUS[ueber ? "ueberfaellig" : r.status];
        return <Badge variant={st.variant}>{st.label}</Badge>;
      },
    },
    {
      key: "betrag",
      header: "Betrag",
      numeric: true,
      width: "128px",
      sortValue: (r) => Number(r.betrag_brutto ?? 0),
      cell: (r) => (
        <span className="font-medium text-foreground">
          {formatEuro(Number(r.betrag_brutto))}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Segmente
        optionen={[
          { key: "alle", label: "Alle", anzahl: anzahl.alle },
          { key: "offen", label: "Offen", anzahl: anzahl.offen },
          {
            key: "ueberfaellig",
            label: "Überfällig",
            anzahl: anzahl.ueberfaellig,
          },
          { key: "bezahlt", label: "Bezahlt", anzahl: anzahl.bezahlt },
        ]}
        wert={segment}
        onChange={setSegment}
      />
      <DataTable
        rows={gefiltert}
        columns={spalten}
        getRowId={(r) => r.id}
        rowHref={(r) => `/rechnungen/${r.id}`}
        defaultSort={{ key: "datum", dir: "desc" }}
        itemLabel="Rechnungen"
        caption="Rechnungen"
        toolbar={
          <FilterBar
            search={{
              placeholder: "Nummer oder Schüler",
              value: suche,
              onChange: setSuche,
            }}
          />
        }
        mobileCard={(r) => {
          const ueber = istUeberfaellig(r, heute);
          const st = RECHNUNG_STATUS[ueber ? "ueberfaellig" : r.status];
          return (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {r.nummer}
                </p>
                <p className="truncate text-13 text-foreground-secondary">
                  {r.fahrschueler
                    ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}`
                    : "Ohne Schüler"}{" "}
                  · {formatDatum(r.rechnungsdatum)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium tabular-nums text-foreground">
                  {formatEuro(Number(r.betrag_brutto))}
                </p>
                <Badge variant={st.variant} className="mt-0.5">
                  {st.label}
                </Badge>
              </div>
            </div>
          );
        }}
        emptyState={
          <p className="px-4 py-10 text-center text-13 text-foreground-secondary">
            Keine Rechnungen für diese Auswahl.{" "}
            {segment !== "alle" && (
              <button
                type="button"
                className="font-medium text-foreground underline-offset-2 hover:underline"
                onClick={() => setSegment("alle")}
              >
                Alle anzeigen
              </button>
            )}
          </p>
        }
      />
    </div>
  );
}
