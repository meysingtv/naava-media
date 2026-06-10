"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, Car, Pencil, Plus, Search } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import type { Fahrzeug } from "@/lib/types";
import { fahrzeugAktivSetzen } from "./actions";

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
    </span>
  );
}

const toolbarBtn =
  "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground";

type Filter = "aktiv" | "archiv" | "alle";

function anzeigeName(f: Fahrzeug): string {
  return f.name || [f.marke, f.modell].filter(Boolean).join(" ") || f.kennzeichen;
}
function klassenVon(f: Fahrzeug): string[] {
  if (f.klassen?.length) return f.klassen;
  return f.klasse ? [f.klasse] : [];
}

export function FahrzeugListe({
  fahrzeuge,
  selectedId,
  fahrlehrerMap,
}: {
  fahrzeuge: Fahrzeug[];
  selectedId?: string;
  fahrlehrerMap: Record<string, string>;
}) {
  const router = useRouter();
  const [suche, setSuche] = useState("");
  const [filter, setFilter] = useState<Filter>("aktiv");

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return fahrzeuge.filter((f) => {
      if (filter === "aktiv" && !f.aktiv) return false;
      if (filter === "archiv" && f.aktiv) return false;
      if (q) {
        const text = `${anzeigeName(f)} ${f.kennzeichen}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [fahrzeuge, filter, suche]);

  const selected = selectedId ? fahrzeuge.find((f) => f.id === selectedId) : undefined;

  if (fahrzeuge.length === 0) {
    return (
      <EmptyState
        icon={Car}
        title="Noch keine Fahrzeuge"
        description="Lege dein erstes Fahrzeug an, um Klassen, Fahrlehrer und Termine zu verwalten."
      >
        <Link
          href="/fahrzeuge?neu=1"
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Plus className="h-4 w-4" /> Neues Fahrzeug
        </Link>
      </EmptyState>
    );
  }

  return (
    <div>
      <Card>
        {/* Werkzeugleiste */}
        <div className="flex flex-wrap items-center gap-1 border-b p-2">
          <Tip label="Neues Fahrzeug">
            <Link href="/fahrzeuge?neu=1" aria-label="Neues Fahrzeug" className={toolbarBtn}>
              <Plus className="h-4 w-4" />
            </Link>
          </Tip>
          <Tip label={selectedId ? "Bearbeiten" : "Erst Fahrzeug auswählen"}>
            {selectedId ? (
              <Link
                href={`/fahrzeuge?id=${selectedId}&edit=1`}
                aria-label="Fahrzeug bearbeiten"
                className={toolbarBtn}
              >
                <Pencil className="h-4 w-4" />
              </Link>
            ) : (
              <span aria-disabled="true" className={cn(toolbarBtn, "cursor-not-allowed opacity-40")}>
                <Pencil className="h-4 w-4" />
              </span>
            )}
          </Tip>
          <Tip label={selected ? (selected.aktiv ? "Archivieren" : "Reaktivieren") : "Erst Fahrzeug auswählen"}>
            {selected ? (
              <form action={fahrzeugAktivSetzen}>
                <input type="hidden" name="id" value={selected.id} />
                <input type="hidden" name="aktiv" value={(!selected.aktiv).toString()} />
                <button type="submit" aria-label="Archivieren" className={toolbarBtn}>
                  <Archive className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <span aria-disabled="true" className={cn(toolbarBtn, "cursor-not-allowed opacity-40")}>
                <Archive className="h-4 w-4" />
              </span>
            )}
          </Tip>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as Filter)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="aktiv">Aktive Fahrzeuge</option>
              <option value="archiv">Archivierte</option>
              <option value="alle">Alle</option>
            </select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder="Suche …"
                className="h-8 w-36 pl-8 sm:w-48"
              />
            </div>
          </div>
        </div>

        {/* Tabelle */}
        <div className="max-h-[calc(100vh-16rem)] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Kennzeichen</th>
                <th className="hidden px-3 py-2 font-medium lg:table-cell">Klasse</th>
                <th className="hidden px-3 py-2 font-medium xl:table-cell">Fahrlehrer</th>
                <th className="px-3 py-2 font-medium">Getriebe</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {gefiltert.map((f) => {
                const aktiv = f.id === selectedId;
                const klassen = klassenVon(f);
                const kuerzel = (f.fahrlehrer_ids ?? [])
                  .map((id) => fahrlehrerMap[id])
                  .filter(Boolean);
                return (
                  <tr
                    key={f.id}
                    onClick={() => router.push(`/fahrzeuge?id=${f.id}`)}
                    className={cn(
                      "cursor-pointer transition-colors",
                      aktiv ? "bg-accent" : "hover:bg-muted/50",
                      !f.aktiv && "opacity-60",
                    )}
                  >
                    <td className="px-3 py-2">
                      <p className={cn("truncate", aktiv ? "font-semibold" : "font-medium")}>
                        {anzeigeName(f)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground sm:hidden">
                        {f.kennzeichen}
                      </p>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2 text-muted-foreground sm:table-cell">
                      {f.kennzeichen}
                    </td>
                    <td className="hidden px-3 py-2 lg:table-cell">
                      {klassen.length ? (
                        <span className="text-muted-foreground">{klassen.join(", ")}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden px-3 py-2 xl:table-cell">
                      {kuerzel.length ? (
                        <div className="flex flex-wrap gap-1">
                          {kuerzel.map((k, i) => (
                            <Badge key={`${k}-${i}`} variant="outline" className="px-1.5 py-0 text-[11px]">
                              {k}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {f.getriebeart || "—"}
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
        {gefiltert.length} von {fahrzeuge.length} angezeigt
      </p>
    </div>
  );
}
