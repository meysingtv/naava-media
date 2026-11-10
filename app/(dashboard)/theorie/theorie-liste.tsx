"use client";

import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, Segmente } from "@/components/shared/filter-bar";
import { cn, formatDatum, formatUhrzeit } from "@/lib/utils";
import { wochentagKurz } from "@/lib/zeit";
import type { Theoriestunde } from "@/lib/types";

export type StundeZeile = Theoriestunde & {
  teilnahme: { count: number }[] | null;
  kurs: { id: string; name: string } | null;
};

type Segment = "anstehend" | "vergangen" | "alle";

/** Belegung als Balken mit „8 / 20" daneben. */
function Belegung({ anzahl, max }: { anzahl: number; max: number | null }) {
  const prozent = max ? Math.min(100, Math.round((anzahl / max) * 100)) : 0;
  return (
    <span className="flex items-center gap-2.5">
      {max ? (
        <span className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
          <span className={cn("block h-full rounded-full", prozent >= 100 ? "bg-warning" : "bg-primary")} style={{ width: `${prozent}%` }} />
        </span>
      ) : null}
      <span className="whitespace-nowrap text-13 tabular-nums text-foreground-secondary">
        {anzahl}
        {max ? ` / ${max}` : ""}
      </span>
    </span>
  );
}

export function TheorieListe({ stunden, heute }: { stunden: StundeZeile[]; heute: string }) {
  const [suche, setSuche] = useState("");
  const [segment, setSegment] = useState<Segment>("anstehend");

  const passt = (t: StundeZeile, s: Segment) => (s === "anstehend" ? t.datum >= heute : s === "vergangen" ? t.datum < heute : true);

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return stunden.filter((t) => {
      if (!passt(t, segment)) return false;
      if (!q) return true;
      return `${t.thema ?? ""} ${t.kurs?.name ?? ""}`.toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stunden, suche, segment, heute]);

  const spalten: DataTableColumn<StundeZeile>[] = [
    {
      key: "termin",
      header: "Termin",
      width: "148px",
      sortValue: (t) => `${t.datum} ${t.uhrzeit}`,
      cell: (t) => (
        <span className="block leading-tight tabular-nums">
          <span className="block font-medium text-foreground">
            {t.datum === heute ? "Heute" : `${wochentagKurz(t.datum)}, ${formatDatum(t.datum)}`}
          </span>
          <span className="block text-xs text-foreground-secondary">{formatUhrzeit(t.uhrzeit)} Uhr</span>
        </span>
      ),
    },
    {
      key: "thema",
      header: "Thema",
      primary: true,
      sortValue: (t) => t.thema ?? "",
      cell: (t) => <span className="font-medium text-foreground">{t.thema || "Theoriestunde"}</span>,
    },
    {
      key: "kurs",
      header: "Kurs",
      hideBelow: "lg",
      sortValue: (t) => t.kurs?.name ?? "",
      cell: (t) => <span className="text-foreground-secondary">{t.kurs?.name ?? "—"}</span>,
    },
    {
      key: "teilnehmer",
      header: "Anwesend",
      sortValue: (t) => t.teilnahme?.[0]?.count ?? 0,
      cell: (t) =>
        t.datum > heute ? (
          <span className="text-13 text-foreground-tertiary">{t.max_teilnehmer ? `${t.max_teilnehmer} Plätze` : "—"}</span>
        ) : (
          <Belegung anzahl={t.teilnahme?.[0]?.count ?? 0} max={t.max_teilnehmer} />
        ),
    },
  ];

  return (
    <div className="space-y-3">
      <Segmente
        optionen={[
          { key: "anstehend", label: "Anstehend", anzahl: stunden.filter((t) => passt(t, "anstehend")).length },
          { key: "vergangen", label: "Vergangen", anzahl: stunden.filter((t) => passt(t, "vergangen")).length },
          { key: "alle", label: "Alle", anzahl: stunden.length },
        ]}
        wert={segment}
        onChange={setSegment}
      />
      <DataTable
        key={segment}
        rows={gefiltert}
        columns={spalten}
        getRowId={(t) => t.id}
        rowHref={(t) => `/theorie/${t.id}`}
        defaultSort={{ key: "termin", dir: segment === "anstehend" ? "asc" : "desc" }}
        itemLabel="Stunden"
        caption="Theoriestunden"
        rowActions={(t) => [{ label: "Anwesenheit erfassen", icon: ClipboardList, href: `/theorie/${t.id}` }]}
        toolbar={<FilterBar search={{ placeholder: "Thema oder Kurs", value: suche, onChange: setSuche }} />}
        mobileCard={(t) => (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{t.thema || "Theoriestunde"}</p>
              <p className="truncate text-13 text-foreground-secondary">
                {formatDatum(t.datum)} · {formatUhrzeit(t.uhrzeit)} Uhr
              </p>
            </div>
            <span className="shrink-0 text-13 tabular-nums text-foreground-secondary">
              {t.teilnahme?.[0]?.count ?? 0}
              {t.max_teilnehmer ? ` / ${t.max_teilnehmer}` : ""}
            </span>
          </div>
        )}
        emptyState={
          <p className="px-4 py-10 text-center text-13 text-foreground-secondary">
            {segment === "anstehend" ? "Keine Theoriestunden geplant." : "Keine Stunden für diese Auswahl."}
          </p>
        }
      />
    </div>
  );
}
