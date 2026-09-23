"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Pencil, Plus, UserCog } from "lucide-react";
import { toast } from "sonner";

import { StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar, FilterChip, Segmente } from "@/components/shared/filter-bar";
import { Kennzeichen } from "@/components/shared/kennzeichen";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { TAGESKAPAZITAET, rolleName } from "@/lib/team";
import { cn } from "@/lib/utils";
import { stunden } from "@/lib/zeit";
import type { Fahrlehrer } from "@/lib/types";
import { fahrlehrerAktivSetzen } from "./actions";

export interface TeamKennzahl {
  heuteMinuten: number;
  heuteAnzahl: number;
  wocheMinuten: number;
  wocheAnzahl: number;
  /** Schüler, mit denen die Person in den letzten 60 Tagen gefahren ist. */
  schueler: number;
  fahrzeuge: { id: string; kennzeichen: string }[];
}

type Segment = "aktiv" | "archiv" | "alle";

const LEER: TeamKennzahl = { heuteMinuten: 0, heuteAnzahl: 0, wocheMinuten: 0, wocheAnzahl: 0, schueler: 0, fahrzeuge: [] };

/** Auslastung heute als schmaler Balken mit Stunden daneben. */
function HeuteZelle({ k, buero }: { k: TeamKennzahl; buero: boolean }) {
  if (buero && k.heuteAnzahl === 0) return <span className="text-foreground-tertiary">—</span>;
  const prozent = Math.min(100, Math.round((k.heuteMinuten / TAGESKAPAZITAET) * 100));
  return (
    <span className="flex items-center gap-2.5">
      <span className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
        <span
          className={cn("block h-full rounded-full", prozent >= 90 ? "bg-warning" : "bg-primary")}
          style={{ width: `${prozent}%` }}
        />
      </span>
      <span className="whitespace-nowrap text-13 tabular-nums text-foreground-secondary">
        {k.heuteAnzahl === 0 ? "frei" : stunden(k.heuteMinuten)}
      </span>
    </span>
  );
}

export function TeamListe({
  benutzer,
  rollenMap,
  kennzahlen,
  selbstUserId,
}: {
  benutzer: Fahrlehrer[];
  rollenMap: Record<string, string>;
  kennzahlen: Record<string, TeamKennzahl>;
  selbstUserId: string | null;
}) {
  const [suche, setSuche] = useState("");
  const [segment, setSegment] = useState<Segment>("aktiv");
  const [rollen, setRollen] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  const rollenOptionen = useMemo(() => {
    const set = new Set(benutzer.map((b) => rolleName(b, rollenMap)));
    return Array.from(set)
      .sort()
      .map((r) => ({ value: r, label: r }));
  }, [benutzer, rollenMap]);

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return benutzer.filter((b) => {
      if (segment === "aktiv" && !b.aktiv) return false;
      if (segment === "archiv" && b.aktiv) return false;
      if (rollen.length && !rollen.includes(rolleName(b, rollenMap))) return false;
      if (!q) return true;
      return `${b.vorname} ${b.nachname} ${b.kuerzel ?? ""} ${b.email ?? ""}`.toLowerCase().includes(q);
    });
  }, [benutzer, suche, segment, rollen, rollenMap]);

  function aktivSetzen(b: Fahrlehrer) {
    const daten = new FormData();
    daten.set("id", b.id);
    daten.set("aktiv", String(!b.aktiv));
    startTransition(async () => {
      await fahrlehrerAktivSetzen(daten);
      toast.success(b.aktiv ? `${b.vorname} ${b.nachname} archiviert` : `${b.vorname} ${b.nachname} ist wieder aktiv`);
    });
  }

  if (benutzer.length === 0) {
    return (
      <EmptyState
        icon={UserCog}
        title="Noch kein Team"
        description="Lege Mitarbeiter an und gib ihnen eine Rolle – Geschäftsführer, Fahrlehrer oder Büro."
      >
        <Button asChild size="sm">
          <Link href="/fahrlehrer/neu">
            <Plus /> Mitarbeiter anlegen
          </Link>
        </Button>
      </EmptyState>
    );
  }

  const kz = (b: Fahrlehrer) => kennzahlen[b.id] ?? LEER;

  const spalten: DataTableColumn<Fahrlehrer>[] = [
    {
      key: "name",
      header: "Name",
      primary: true,
      sortValue: (b) => `${b.nachname} ${b.vorname}`,
      cell: (b) => (
        <span className="flex min-w-0 items-center gap-3">
          <SchuelerAvatar vorname={b.vorname} nachname={b.nachname} className="h-7 w-7 text-[11px]" />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-medium text-foreground">
                {b.vorname} {b.nachname}
              </span>
              {b.user_id && b.user_id === selbstUserId && (
                <span className="rounded-sm bg-muted px-1 text-2xs font-medium text-foreground-secondary">Du</span>
              )}
            </span>
            <span className="block truncate text-xs text-foreground-tertiary">{b.email ?? "Keine E-Mail"}</span>
          </span>
        </span>
      ),
    },
    {
      key: "rolle",
      header: "Rolle",
      sortValue: (b) => rolleName(b, rollenMap),
      cell: (b) => <span className="text-foreground">{rolleName(b, rollenMap)}</span>,
    },
    {
      key: "klassen",
      header: "Klassen",
      hideBelow: "xl",
      cell: (b) => <span className="whitespace-nowrap text-foreground-secondary">{b.fuehrerscheinklassen?.join(", ") || "—"}</span>,
    },
    {
      key: "heute",
      header: "Heute",
      hideBelow: "md",
      sortValue: (b) => kz(b).heuteMinuten,
      cell: (b) => <HeuteZelle k={kz(b)} buero={b.rolle === "buero"} />,
    },
    {
      key: "woche",
      header: "Diese Woche",
      numeric: true,
      hideBelow: "md",
      sortValue: (b) => kz(b).wocheMinuten,
      cell: (b) => (kz(b).wocheAnzahl ? stunden(kz(b).wocheMinuten) : <span className="text-foreground-tertiary">—</span>),
    },
    {
      key: "schueler",
      header: "Schüler",
      numeric: true,
      hideBelow: "lg",
      sortValue: (b) => kz(b).schueler,
      cell: (b) => kz(b).schueler || <span className="text-foreground-tertiary">—</span>,
    },
    {
      key: "fahrzeuge",
      header: "Fahrzeuge",
      hideBelow: "xl",
      cell: (b) => {
        const liste = kz(b).fahrzeuge;
        if (!liste.length) return <span className="text-foreground-tertiary">—</span>;
        return (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Kennzeichen>{liste[0].kennzeichen}</Kennzeichen>
            {liste.length > 1 && <span className="text-xs text-foreground-tertiary">+{liste.length - 1}</span>}
          </span>
        );
      },
    },
    {
      key: "zugang",
      header: "Zugang",
      hideBelow: "xl",
      sortValue: (b) => (b.user_id ? 0 : 1),
      cell: (b) =>
        b.user_id ? <StatusDot ton="primary">Login aktiv</StatusDot> : <StatusDot ton="neutral">Kein Login</StatusDot>,
    },
  ];

  return (
    <div className="space-y-3">
      <Segmente
        optionen={[
          { key: "aktiv", label: "Aktiv", anzahl: benutzer.filter((b) => b.aktiv).length },
          { key: "archiv", label: "Archiviert", anzahl: benutzer.filter((b) => !b.aktiv).length },
          { key: "alle", label: "Alle", anzahl: benutzer.length },
        ]}
        wert={segment}
        onChange={setSegment}
      />
      <DataTable
        rows={gefiltert}
        columns={spalten}
        getRowId={(b) => b.id}
        rowHref={(b) => `/fahrlehrer/${b.id}`}
        defaultSort={{ key: "name", dir: "asc" }}
        itemLabel="Mitarbeiter"
        caption="Team"
        rowActions={(b) => {
          const selbst = Boolean(b.user_id && b.user_id === selbstUserId);
          return [
            { label: "Bearbeiten", icon: Pencil, href: `/fahrlehrer/${b.id}/bearbeiten` },
            ...(selbst
              ? []
              : [
                  {
                    label: b.aktiv ? "Archivieren" : "Wieder aktivieren",
                    icon: b.aktiv ? Archive : ArchiveRestore,
                    onSelect: () => aktivSetzen(b),
                    separatorBefore: true,
                  },
                ]),
          ];
        }}
        toolbar={
          <FilterBar
            search={{ placeholder: "Name, Kürzel oder E-Mail", value: suche, onChange: setSuche }}
            filters={
              rollenOptionen.length > 1 ? (
                <FilterChip label="Rolle" options={rollenOptionen} selected={rollen} onChange={setRollen} />
              ) : undefined
            }
          />
        }
        mobileCard={(b) => (
          <div className="flex items-center gap-3">
            <SchuelerAvatar vorname={b.vorname} nachname={b.nachname} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {b.vorname} {b.nachname}
              </p>
              <p className="truncate text-13 text-foreground-secondary">
                {rolleName(b, rollenMap)}
                {kz(b).heuteAnzahl ? ` · heute ${stunden(kz(b).heuteMinuten)}` : ""}
              </p>
            </div>
          </div>
        )}
        emptyState={<p className="px-4 py-10 text-center text-13 text-foreground-secondary">Niemand für diese Auswahl.</p>}
      />
    </div>
  );
}
