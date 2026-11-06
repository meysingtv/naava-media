"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterChip, Segmente } from "@/components/shared/filter-bar";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { cn, formatDatum, formatEuro } from "@/lib/utils";
import type { Fahrschueler } from "@/lib/types";

export interface Fortschritt {
  theorie: number; // 0–100
  ueberland: number; // 0–100
  autobahn: number;
  nacht: number;
  fahrstunden: number;
  pruefungsreif: boolean;
  unterlagenFehlen: number;
  /** Absolvierte / geforderte Sonderfahrten. */
  sonderIst?: number;
  sonderSoll?: number;
}

type Segment = "aktiv" | "reif" | "theorie" | "handlung" | "fertig";

const SEGMENTE: { key: Segment; label: string }[] = [
  { key: "aktiv", label: "In Ausbildung" },
  { key: "reif", label: "Prüfungsreif" },
  { key: "theorie", label: "Theorie offen" },
  { key: "handlung", label: "Handlungsbedarf" },
  { key: "fertig", label: "Abgeschlossen" },
];

const LEER: Fortschritt = {
  theorie: 0,
  ueberland: 0,
  autobahn: 0,
  nacht: 0,
  fahrstunden: 0,
  pruefungsreif: false,
  unterlagenFehlen: 0,
};

function passtSegment(seg: Segment, s: Fahrschueler, f: Fortschritt, offen: number): boolean {
  if (seg === "reif") return f.pruefungsreif && !s.ausbildung_beendet;
  if (seg === "theorie") return !s.theorie_bestanden && !s.ausbildung_beendet;
  if (seg === "handlung") return !s.ausbildung_beendet && (f.unterlagenFehlen > 0 || offen > 0);
  if (seg === "fertig") return s.ausbildung_beendet;
  return !s.ausbildung_beendet;
}

/** Schmaler Balken mit Zahl daneben – Sonderfahrten Ist / Soll. */
function Sonderfahrten({ f }: { f: Fortschritt }) {
  const ist = f.sonderIst ?? 0;
  const soll = f.sonderSoll ?? 0;
  const prozent = soll > 0 ? Math.min(100, Math.round((ist / soll) * 100)) : 100;
  if (soll === 0) return <span className="text-13 text-foreground-tertiary">Keine nötig</span>;
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-1 w-16 overflow-hidden rounded-full bg-muted">
        <span
          className={cn("block h-full rounded-full", prozent >= 100 ? "bg-success" : "bg-primary")}
          style={{ width: `${prozent}%` }}
        />
      </span>
      <span className="text-13 tabular-nums text-foreground-secondary">
        {ist}/{soll}
      </span>
    </div>
  );
}

export function SchuelerListe({
  schueler,
  offenMap,
  lehrerMap,
  fortschrittMap,
  zeigeFinanzen = true,
}: {
  schueler: Fahrschueler[];
  /** Offener Rechnungsbetrag je Schüler (positiv = offen). */
  offenMap: Record<string, number>;
  lehrerMap: Record<string, string[]>;
  fortschrittMap: Record<string, Fortschritt>;
  /** Spalte „Offen" und Beträge nur für Rollen mit Zugriff auf Rechnungen. */
  zeigeFinanzen?: boolean;
}) {
  const [suche, setSuche] = useState("");
  const [segment, setSegment] = useState<Segment>("aktiv");
  const [klassen, setKlassen] = useState<string[]>([]);
  const [lehrer, setLehrer] = useState<string[]>([]);

  const klassenOptionen = useMemo(() => {
    const set = new Set<string>();
    for (const s of schueler) for (const k of s.fuehrerscheinklassen ?? []) set.add(k);
    return Array.from(set)
      .sort()
      .map((k) => ({ value: k, label: `Klasse ${k}` }));
  }, [schueler]);

  const lehrerOptionen = useMemo(() => {
    const set = new Set<string>();
    for (const l of Object.values(lehrerMap)) for (const k of l) set.add(k);
    return Array.from(set)
      .sort()
      .map((k) => ({ value: k, label: k }));
  }, [lehrerMap]);

  const zaehler = useMemo(() => {
    const z: Record<Segment, number> = { aktiv: 0, reif: 0, theorie: 0, handlung: 0, fertig: 0 };
    for (const s of schueler) {
      const f = fortschrittMap[s.id] ?? LEER;
      for (const seg of SEGMENTE) if (passtSegment(seg.key, s, f, offenMap[s.id] ?? 0)) z[seg.key] += 1;
    }
    return z;
  }, [schueler, fortschrittMap, offenMap]);

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return schueler.filter((s) => {
      const f = fortschrittMap[s.id] ?? LEER;
      if (!passtSegment(segment, s, f, offenMap[s.id] ?? 0)) return false;
      if (klassen.length && !(s.fuehrerscheinklassen ?? []).some((k) => klassen.includes(k))) return false;
      if (lehrer.length && !(lehrerMap[s.id] ?? []).some((k) => lehrer.includes(k))) return false;
      if (!q) return true;
      return (
        `${s.vorname} ${s.nachname}`.toLowerCase().includes(q) ||
        (s.kundennummer != null && String(s.kundennummer).includes(q)) ||
        (s.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [schueler, suche, segment, klassen, lehrer, fortschrittMap, offenMap, lehrerMap]);

  function exportCsv() {
    const kopf = ["Kundennr.", "Name", "Klassen", "Theorie", "Fahrstunden", ...(zeigeFinanzen ? ["Offen"] : [])];
    const zeilen = gefiltert.map((s) => [
      s.kundennummer ?? "",
      `${s.vorname} ${s.nachname}`,
      s.fuehrerscheinklassen?.join(" ") ?? "",
      s.theorie_bestanden ? "bestanden" : `${s.lernstatus ?? 0}%`,
      String(fortschrittMap[s.id]?.fahrstunden ?? 0),
      ...(zeigeFinanzen ? [String(offenMap[s.id] ?? 0)] : []),
    ]);
    const csv = [kopf, ...zeilen].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schueler.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportiert");
  }

  const alleSpalten: DataTableColumn<Fahrschueler>[] = [
    {
      key: "name",
      header: "Name",
      primary: true,
      sortValue: (s) => `${s.nachname} ${s.vorname}`,
      cell: (s) => (
        <span className="flex min-w-0 items-center gap-3">
          <SchuelerAvatar vorname={s.vorname} nachname={s.nachname} className="h-7 w-7 text-[11px]" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground">
              {s.vorname} {s.nachname}
            </span>
            {s.kundennummer != null && (
              <span className="block truncate text-xs text-foreground-tertiary">Kd.-Nr. {s.kundennummer}</span>
            )}
          </span>
        </span>
      ),
    },
    {
      key: "klasse",
      header: "Klasse",
      width: "80px",
      sortValue: (s) => s.fuehrerscheinklassen?.[0] ?? "",
      cell: (s) => <span className="text-foreground">{s.fuehrerscheinklassen?.join(", ") || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (s) => {
        const f = fortschrittMap[s.id] ?? LEER;
        return s.ausbildung_beendet ? 2 : f.pruefungsreif ? 0 : 1;
      },
      cell: (s) => {
        const f = fortschrittMap[s.id] ?? LEER;
        if (s.ausbildung_beendet) return <StatusDot ton="neutral">Abgeschlossen</StatusDot>;
        if (f.pruefungsreif) return <StatusDot ton="success">Prüfungsreif</StatusDot>;
        if (!s.theorie_bestanden) return <StatusDot ton="primary">Theorie</StatusDot>;
        return <StatusDot ton="primary">Praxis</StatusDot>;
      },
    },
    {
      key: "sonder",
      header: "Sonderfahrten",
      hideBelow: "lg",
      sortValue: (s) => fortschrittMap[s.id]?.sonderIst ?? 0,
      cell: (s) => <Sonderfahrten f={fortschrittMap[s.id] ?? LEER} />,
    },
    {
      key: "stunden",
      header: "Fahrstunden",
      numeric: true,
      hideBelow: "xl",
      sortValue: (s) => fortschrittMap[s.id]?.fahrstunden ?? 0,
      cell: (s) => fortschrittMap[s.id]?.fahrstunden ?? 0,
    },
    {
      key: "unterlagen",
      header: "Unterlagen",
      hideBelow: "xl",
      sortValue: (s) => fortschrittMap[s.id]?.unterlagenFehlen ?? 0,
      cell: (s) => {
        const fehlen = fortschrittMap[s.id]?.unterlagenFehlen ?? 0;
        return fehlen > 0 ? (
          <span className="text-warning-text">{fehlen === 1 ? "1 fehlt" : `${fehlen} fehlen`}</span>
        ) : (
          <span className="text-foreground-secondary">Vollständig</span>
        );
      },
    },
    {
      key: "lehrer",
      header: "Fahrlehrer",
      hideBelow: "xl",
      cell: (s) => <span className="text-foreground-secondary">{(lehrerMap[s.id] ?? []).join(", ") || "—"}</span>,
    },
    {
      key: "pruefung",
      header: "Prüfung",
      hideBelow: "md",
      sortValue: (s) => s.pruefung_termin ?? s.theorie_termin ?? null,
      cell: (s) =>
        s.pruefung_termin ? (
          <span>
            {formatDatum(s.pruefung_termin)} <span className="text-foreground-tertiary">Praxis</span>
          </span>
        ) : s.theorie_termin ? (
          <span>
            {formatDatum(s.theorie_termin)} <span className="text-foreground-tertiary">Theorie</span>
          </span>
        ) : (
          <span className="text-foreground-tertiary">—</span>
        ),
    },
    {
      key: "offen",
      header: "Offen",
      numeric: true,
      sortValue: (s) => offenMap[s.id] ?? 0,
      cell: (s) => {
        const offen = offenMap[s.id] ?? 0;
        return offen > 0 ? (
          <span className="font-medium text-foreground">{formatEuro(offen)}</span>
        ) : (
          <span className="text-foreground-tertiary">—</span>
        );
      },
    },
  ];

  const spalten = zeigeFinanzen ? alleSpalten : alleSpalten.filter((c) => c.key !== "offen");

  if (schueler.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Noch keine Schüler"
        description="Lege den ersten Fahrschüler an. Fortschritt, Termine und Rechnungen laufen dann hier zusammen."
      >
        <Button asChild size="sm">
          <Link href="/schueler/neu">
            <Plus /> Schüler anlegen
          </Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmente
          optionen={SEGMENTE.map((seg) => ({ ...seg, anzahl: zaehler[seg.key] }))}
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
        getRowId={(s) => s.id}
        rowHref={(s) => `/schueler/${s.id}`}
        defaultSort={{ key: "name", dir: "asc" }}
        itemLabel="Schüler"
        caption="Schüler"
        toolbar={
          <FilterBar
            search={{ placeholder: "Name, Kundennummer oder E-Mail", value: suche, onChange: setSuche }}
            filters={
              <>
                {klassenOptionen.length > 1 && (
                  <FilterChip label="Klasse" options={klassenOptionen} selected={klassen} onChange={setKlassen} />
                )}
                {lehrerOptionen.length > 1 && (
                  <FilterChip label="Fahrlehrer" options={lehrerOptionen} selected={lehrer} onChange={setLehrer} />
                )}
              </>
            }
          />
        }
        mobileCard={(s) => {
          const f = fortschrittMap[s.id] ?? LEER;
          const offen = offenMap[s.id] ?? 0;
          return (
            <div className="flex items-center gap-3">
              <SchuelerAvatar vorname={s.vorname} nachname={s.nachname} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {s.vorname} {s.nachname}
                </p>
                <p className="truncate text-13 text-foreground-secondary">
                  Klasse {s.fuehrerscheinklassen?.join(", ") || "—"}
                  {f.pruefungsreif ? " · Prüfungsreif" : ""}
                  {f.unterlagenFehlen > 0 ? ` · ${f.unterlagenFehlen} Unterlagen fehlen` : ""}
                </p>
              </div>
              {zeigeFinanzen && offen > 0 && (
                <span className="shrink-0 text-13 font-medium tabular-nums">{formatEuro(offen)}</span>
              )}
            </div>
          );
        }}
        emptyState={<p className="px-4 py-10 text-center text-13 text-foreground-secondary">Keine Schüler für diese Auswahl.</p>}
      />
    </div>
  );
}
