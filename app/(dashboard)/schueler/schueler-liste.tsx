"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { EmptyState } from "@/components/shared/empty-state";
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
}

type Segment = "alle" | "reif" | "theorie" | "handlung" | "fertig";

const SEGMENTE: { key: Segment; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "reif", label: "Prüfungsreif" },
  { key: "theorie", label: "Theorie offen" },
  { key: "handlung", label: "Handlungsbedarf" },
  { key: "fertig", label: "Abgeschlossen" },
];

/** Vier schmale Balken: Theorie, Überland, Autobahn, Nacht. */
function Rail({ f }: { f: Fortschritt }) {
  const teile = [
    { label: "Theorie", wert: f.theorie },
    { label: "Überland", wert: f.ueberland },
    { label: "Autobahn", wert: f.autobahn },
    { label: "Nacht", wert: f.nacht },
  ];
  return (
    <div className="flex w-[104px] items-center gap-1" title={teile.map((t) => `${t.label} ${t.wert}%`).join(" · ")}>
      {teile.map((t) => (
        <span key={t.label} className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
          <span
            className={cn("block h-full rounded-full", t.wert >= 100 ? "bg-success" : "bg-primary")}
            style={{ width: `${t.wert}%` }}
          />
        </span>
      ))}
    </div>
  );
}

export function SchuelerListe({
  schueler,
  selectedId,
  saldoMap,
  lehrerMap,
  fortschrittMap,
}: {
  schueler: Fahrschueler[];
  selectedId?: string;
  saldoMap: Record<string, number>;
  lehrerMap: Record<string, string[]>;
  fortschrittMap: Record<string, Fortschritt>;
}) {
  const router = useRouter();
  const [suche, setSuche] = useState("");
  const [segment, setSegment] = useState<Segment>("alle");

  const leer: Fortschritt = { theorie: 0, ueberland: 0, autobahn: 0, nacht: 0, fahrstunden: 0, pruefungsreif: false, unterlagenFehlen: 0 };

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return schueler.filter((s) => {
      const f = fortschrittMap[s.id] ?? leer;
      if (segment === "reif" && !(f.pruefungsreif && !s.ausbildung_beendet)) return false;
      if (segment === "theorie" && (s.theorie_bestanden || s.ausbildung_beendet)) return false;
      if (segment === "handlung" && !(f.unterlagenFehlen > 0 || (saldoMap[s.id] ?? 0) < 0) ) return false;
      if (segment === "fertig" && !s.ausbildung_beendet) return false;
      if (segment === "alle" && s.ausbildung_beendet) return false;
      if (!q) return true;
      return `${s.vorname} ${s.nachname}`.toLowerCase().includes(q) || (s.kundennummer != null && String(s.kundennummer).includes(q));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schueler, suche, segment, fortschrittMap, saldoMap]);

  const zaehl = (seg: Segment) =>
    schueler.filter((s) => {
      const f = fortschrittMap[s.id] ?? leer;
      if (seg === "reif") return f.pruefungsreif && !s.ausbildung_beendet;
      if (seg === "theorie") return !s.theorie_bestanden && !s.ausbildung_beendet;
      if (seg === "handlung") return f.unterlagenFehlen > 0 || (saldoMap[s.id] ?? 0) < 0;
      if (seg === "fertig") return s.ausbildung_beendet;
      return !s.ausbildung_beendet;
    }).length;

  function exportCsv() {
    const kopf = ["Kundennr.", "Name", "Klassen", "Theorie", "Fahrstunden", "Saldo"];
    const zeilen = gefiltert.map((s) => [
      s.kundennummer ?? "",
      `${s.vorname} ${s.nachname}`,
      s.fuehrerscheinklassen?.join(" ") ?? "",
      s.theorie_bestanden ? "bestanden" : `${s.lernstatus ?? 0}%`,
      String(fortschrittMap[s.id]?.fahrstunden ?? 0),
      String(saldoMap[s.id] ?? 0),
    ]);
    const csv = [kopf, ...zeilen].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schueler.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportiert");
  }

  if (schueler.length === 0) {
    return (
      <EmptyState icon={Users} title="Noch keine Schüler" description="Lege den ersten Fahrschüler an – Fortschritt, Termine und Rechnungen laufen dann hier zusammen.">
        <Button asChild>
          <Link href="/schueler/neu">
            <Plus /> Neuer Schüler
          </Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      {/* Kopf: Suche + Segmente + Aktionen */}
      <div className="flex flex-col gap-2 border-b p-2.5 sm:flex-row sm:items-center">
        <div className="relative sm:w-56">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Name oder Kundennr." className="pl-8" />
        </div>
        <div className="flex flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SEGMENTE.map((s) => {
            const a = segment === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSegment(s.key)}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors duration-fast",
                  a ? "bg-foreground text-background" : "text-foreground-secondary hover:bg-foreground/[0.06] hover:text-foreground",
                )}
              >
                {s.label}
                <span className={cn("tabular-nums", a ? "text-background/70" : "text-muted-foreground")}>{zaehl(s.key)}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon-sm" onClick={exportCsv} aria-label="CSV exportieren">
            <Download />
          </Button>
          <Button asChild size="sm">
            <Link href="/schueler/neu">
              <Plus /> Schüler
            </Link>
          </Button>
        </div>
      </div>

      {/* Spaltenkopf */}
      <div className="hidden grid-cols-[minmax(0,1fr)_104px_92px_88px] items-center gap-3 border-b px-3 py-1.5 sm:grid">
        <span className="label-caps">Schüler</span>
        <span className="label-caps">Fortschritt</span>
        <span className="label-caps">Status</span>
        <span className="label-caps text-right">Saldo</span>
      </div>

      {/* Zeilen */}
      <div className="max-h-[calc(100vh-18rem)] divide-y overflow-y-auto scrollbar-thin">
        {gefiltert.map((s) => {
          const aktiv = s.id === selectedId;
          const f = fortschrittMap[s.id] ?? leer;
          const saldo = saldoMap[s.id] ?? 0;
          const status = s.ausbildung_beendet
            ? { label: "Abgeschlossen", dot: "bg-border-strong" }
            : f.pruefungsreif
              ? { label: "Prüfungsreif", dot: "bg-success" }
              : { label: "In Ausbildung", dot: "bg-primary" };
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => router.push(`/schueler?id=${s.id}`)}
              className={cn(
                "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 text-left transition-colors duration-fast sm:grid-cols-[minmax(0,1fr)_104px_92px_88px]",
                aktiv ? "bg-primary-soft/50 shadow-[inset_2px_0_0_hsl(var(--primary))]" : "hover:bg-surface-muted",
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <SchuelerAvatar vorname={s.vorname} nachname={s.nachname} farbe={s.avatar_farbe} className="h-8 w-8 text-[11px]" />
                <span className="min-w-0">
                  <span className={cn("block truncate text-[13px] text-foreground", aktiv ? "font-semibold" : "font-medium")}>
                    {s.vorname} {s.nachname}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {s.fuehrerscheinklassen?.join(" · ") || "Keine Klasse"}
                    {s.kundennummer != null ? ` · #${s.kundennummer}` : ""}
                    {(lehrerMap[s.id] ?? []).length ? ` · ${(lehrerMap[s.id] ?? []).join(", ")}` : ""}
                    {s.pruefung_termin ? ` · Prüfung ${formatDatum(s.pruefung_termin)}` : ""}
                  </span>
                </span>
              </span>
              <span className="hidden sm:block">
                <Rail f={f} />
              </span>
              <span className="hidden items-center gap-1.5 text-xs text-foreground-secondary sm:inline-flex">
                <i className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                {status.label}
                {f.unterlagenFehlen > 0 && <span className="text-warning">· {f.unterlagenFehlen} fehlt</span>}
              </span>
              <span className={cn("text-right text-[13px] font-medium tabular-nums", saldo < 0 ? "text-destructive" : saldo > 0 ? "text-success" : "text-muted-foreground")}>
                {formatEuro(saldo)}
              </span>
            </button>
          );
        })}
        {gefiltert.length === 0 && <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">Keine Treffer.</p>}
      </div>

      <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
        {gefiltert.length} von {schueler.length}
      </p>
    </div>
  );
}
