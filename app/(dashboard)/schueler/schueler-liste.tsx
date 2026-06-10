"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Pencil, Plus, Search, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatEuro } from "@/lib/utils";
import type { Fahrschueler } from "@/lib/types";

export function SchuelerListe({
  schueler,
  selectedId,
  saldoMap,
  lehrerMap,
}: {
  schueler: Fahrschueler[];
  selectedId?: string;
  saldoMap: Record<string, number>;
  lehrerMap: Record<string, string[]>;
}) {
  const router = useRouter();
  const [suche, setSuche] = useState("");

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    if (!q) return schueler;
    return schueler.filter(
      (s) =>
        `${s.vorname} ${s.nachname}`.toLowerCase().includes(q) ||
        (s.kundennummer != null && String(s.kundennummer).includes(q)),
    );
  }, [schueler, suche]);

  function exportCsv() {
    const kopf = ["Kundennr.", "Name", "Klassen", "Kostenträger", "Fahrlehrer", "Filiale", "Saldo"];
    const zeilen = gefiltert.map((s) => [
      s.kundennummer ?? "",
      `${s.vorname} ${s.nachname}`,
      s.fuehrerscheinklassen?.join(" ") ?? "",
      s.kostentraeger ?? "",
      (lehrerMap[s.id] ?? []).join(" "),
      s.filiale ?? "",
      String(saldoMap[s.id] ?? 0),
    ]);
    const csv = [kopf, ...zeilen]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schueler.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (schueler.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Noch keine Schüler"
        description="Lege deinen ersten Fahrschüler an, um Fortschritt, Fahrstunden und Rechnungen zu verwalten."
      >
        <Link
          href="/schueler/neu"
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Plus className="h-4 w-4" /> Neuer Schüler
        </Link>
      </EmptyState>
    );
  }

  const toolbarBtn =
    "flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

  return (
    <div>
      <Card className="overflow-hidden">
        {/* Werkzeugleiste */}
        <div className="flex flex-wrap items-center gap-2 border-b p-2">
          <Link href="/schueler/neu" title="Neuen Schüler anlegen" className={toolbarBtn}>
            <Plus className="h-4 w-4" />
          </Link>
          {selectedId ? (
            <Link
              href={`/schueler/${selectedId}/bearbeiten`}
              title="Ausgewählten Schüler bearbeiten"
              className={toolbarBtn}
            >
              <Pencil className="h-4 w-4" />
            </Link>
          ) : (
            <span
              title="Erst links einen Schüler auswählen"
              aria-disabled="true"
              className={cn(toolbarBtn, "cursor-not-allowed opacity-40")}
            >
              <Pencil className="h-4 w-4" />
            </span>
          )}
          <button type="button" onClick={exportCsv} title="Als CSV exportieren" className={toolbarBtn}>
            <Download className="h-4 w-4" />
          </button>
          <div className="relative ml-auto w-full sm:max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="Suche …"
              className="h-8 pl-8"
            />
          </div>
        </div>

        {/* Tabelle */}
        <div className="max-h-[calc(100vh-16rem)] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Kunde</th>
                <th className="hidden px-3 py-2 font-medium xl:table-cell">Kostenträger</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Fahrlehrer</th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">Filiale</th>
                <th className="px-3 py-2 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {gefiltert.map((s) => {
                const aktiv = s.id === selectedId;
                const saldo = saldoMap[s.id] ?? 0;
                const kuerzel = lehrerMap[s.id] ?? [];
                return (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/schueler?id=${s.id}`)}
                    className={cn(
                      "cursor-pointer transition-colors",
                      aktiv ? "bg-accent" : "hover:bg-muted/50",
                    )}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <SchuelerAvatar
                          vorname={s.vorname}
                          nachname={s.nachname}
                          farbe={s.avatar_farbe}
                          className="h-9 w-9 shrink-0 text-xs"
                        />
                        <div className="min-w-0">
                          <p className={cn("truncate", aktiv ? "font-semibold" : "font-medium")}>
                            {s.vorname} {s.nachname}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {s.fuehrerscheinklassen?.join(" · ") || "Keine Klasse"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-2 text-muted-foreground xl:table-cell">
                      <span className="line-clamp-1">{s.kostentraeger || "—"}</span>
                    </td>
                    <td className="hidden px-3 py-2 sm:table-cell">
                      {kuerzel.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {kuerzel.map((k) => (
                            <Badge key={k} variant="outline" className="px-1.5 py-0 text-[11px]">
                              {k}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">
                      {s.filiale || "—"}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-3 py-2 text-right font-medium",
                        saldo < 0 ? "text-destructive" : saldo > 0 ? "text-success" : "text-muted-foreground",
                      )}
                    >
                      {formatEuro(saldo)}
                    </td>
                  </tr>
                );
              })}
              {gefiltert.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Keine Treffer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-2 text-xs text-muted-foreground">
        {gefiltert.length} von {schueler.length} angezeigt
      </p>
    </div>
  );
}
