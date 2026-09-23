"use client";

import { useMemo, useState } from "react";
import { Download, Mail } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { formatEuro } from "@/lib/utils";

export interface KostentraegerZeile {
  name: string;
  email: string | null;
  anzahl: number;
  gesamt: number;
  offen: number;
}

const exportHref = (name: string) => `/kostentraeger/export?traeger=${encodeURIComponent(name)}`;

export function KostentraegerListe({ zeilen }: { zeilen: KostentraegerZeile[] }) {
  const [suche, setSuche] = useState("");

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return q ? zeilen.filter((z) => `${z.name} ${z.email ?? ""}`.toLowerCase().includes(q)) : zeilen;
  }, [zeilen, suche]);

  const spalten: DataTableColumn<KostentraegerZeile>[] = [
    {
      key: "name",
      header: "Kostenträger",
      primary: true,
      sortValue: (z) => z.name,
      cell: (z) => (
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{z.name}</span>
          <span className="block truncate text-xs text-foreground-tertiary">{z.email ?? "Keine E-Mail hinterlegt"}</span>
        </span>
      ),
    },
    {
      key: "schueler",
      header: "Schüler",
      numeric: true,
      sortValue: (z) => z.anzahl,
      cell: (z) => z.anzahl,
    },
    {
      key: "gesamt",
      header: "Abgerechnet",
      numeric: true,
      hideBelow: "md",
      sortValue: (z) => z.gesamt,
      cell: (z) => <span className="text-foreground-secondary">{formatEuro(z.gesamt)}</span>,
    },
    {
      key: "offen",
      header: "Offen",
      numeric: true,
      sortValue: (z) => z.offen,
      cell: (z) =>
        z.offen > 0 ? (
          <span className="font-medium text-foreground">{formatEuro(z.offen)}</span>
        ) : (
          <span className="text-foreground-tertiary">—</span>
        ),
    },
  ];

  return (
    <DataTable
      rows={gefiltert}
      columns={spalten}
      getRowId={(z) => z.name}
      defaultSort={{ key: "offen", dir: "desc" }}
      itemLabel="Kostenträger"
      caption="Kostenträger"
      rowActions={(z) => [
        { label: "Sammelabrechnung (CSV)", icon: Download, href: exportHref(z.name) },
        ...(z.email
          ? [
              {
                label: "E-Mail schreiben",
                icon: Mail,
                onSelect: () => {
                  window.location.href = `mailto:${z.email}?subject=${encodeURIComponent(`Sammelabrechnung – ${z.name}`)}`;
                },
              },
            ]
          : []),
      ]}
      toolbar={<FilterBar search={{ placeholder: "Kostenträger oder E-Mail", value: suche, onChange: setSuche }} />}
      mobileCard={(z) => (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{z.name}</p>
            <p className="truncate text-13 text-foreground-secondary">{z.anzahl} Schüler</p>
          </div>
          <span className="shrink-0 text-13 font-medium tabular-nums">{formatEuro(z.offen)}</span>
        </div>
      )}
      emptyState={<p className="px-4 py-10 text-center text-13 text-foreground-secondary">Kein Kostenträger gefunden.</p>}
    />
  );
}
