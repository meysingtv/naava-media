"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, Pencil, Plus, Search, UserCog } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ROLLEN } from "@/lib/constants";
import { cn, initialen } from "@/lib/utils";
import type { Fahrlehrer } from "@/lib/types";
import { fahrlehrerAktivSetzen } from "./actions";

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

function kuerzelVon(b: Fahrlehrer): string {
  return b.kuerzel?.trim() || initialen(b.vorname, b.nachname);
}

export function BenutzerListe({
  benutzer,
  selectedId,
  selfUserId,
  rollenMap = {},
}: {
  benutzer: Fahrlehrer[];
  selectedId?: string;
  selfUserId: string;
  rollenMap?: Record<string, string>;
}) {
  const router = useRouter();
  const [suche, setSuche] = useState("");
  const [filter, setFilter] = useState<Filter>("aktiv");

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return benutzer.filter((b) => {
      if (filter === "aktiv" && !b.aktiv) return false;
      if (filter === "archiv" && b.aktiv) return false;
      if (q && !`${b.vorname} ${b.nachname} ${kuerzelVon(b)}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [benutzer, filter, suche]);

  const selected = selectedId ? benutzer.find((b) => b.id === selectedId) : undefined;
  const selbst = selected?.user_id === selfUserId;

  if (benutzer.length === 0) {
    return (
      <EmptyState
        icon={UserCog}
        title="Noch kein Team"
        description="Lege Benutzer an und weise ihnen Rollen zu (Chef, Fahrlehrer, Büro)."
      >
        <Link
          href="/fahrlehrer/neu"
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Plus className="h-4 w-4" /> Neuer Benutzer
        </Link>
      </EmptyState>
    );
  }

  return (
    <div>
      <Card>
        <div className="flex flex-wrap items-center gap-1 border-b p-2">
          <Tip label="Neuer Benutzer">
            <Link
              href="/fahrlehrer/neu"
              aria-label="Neuer Benutzer"
              className={cn(toolbarBtn, "text-primary hover:bg-primary/10 hover:text-primary")}
            >
              <Plus className="h-4 w-4" />
            </Link>
          </Tip>
          <Tip label={selectedId ? "Bearbeiten" : "Erst Benutzer auswählen"}>
            {selectedId ? (
              <Link href={`/fahrlehrer/${selectedId}/bearbeiten`} aria-label="Bearbeiten" className={toolbarBtn}>
                <Pencil className="h-4 w-4" />
              </Link>
            ) : (
              <span aria-disabled="true" className={cn(toolbarBtn, "cursor-not-allowed opacity-40")}>
                <Pencil className="h-4 w-4" />
              </span>
            )}
          </Tip>
          <Tip label={!selected ? "Erst Benutzer auswählen" : selbst ? "Eigenes Konto nicht archivierbar" : selected.aktiv ? "Archivieren" : "Reaktivieren"}>
            {selected && !selbst ? (
              <form action={fahrlehrerAktivSetzen}>
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
              <option value="aktiv">Aktive Benutzer</option>
              <option value="archiv">Archivierte</option>
              <option value="alle">Alle</option>
            </select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Suche …" className="h-8 w-36 pl-8 sm:w-48" />
            </div>
          </div>
        </div>

        <div className="max-h-[calc(100vh-16rem)] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Kürzel</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Vorname</th>
                <th className="px-3 py-2 font-medium">Rolle</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {gefiltert.map((b) => {
                const aktiv = b.id === selectedId;
                return (
                  <tr
                    key={b.id}
                    onClick={() => router.push(`/fahrlehrer?id=${b.id}`)}
                    className={cn(
                      "cursor-pointer transition-colors",
                      aktiv ? "bg-accent" : "hover:bg-muted/50",
                      !b.aktiv && "opacity-60",
                    )}
                  >
                    <td className="px-3 py-2">
                      <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                        {kuerzelVon(b)}
                      </span>
                    </td>
                    <td className={cn("px-3 py-2", aktiv ? "font-semibold" : "font-medium")}>{b.nachname}</td>
                    <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">{b.vorname}</td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="secondary"
                        className={cn(!b.benutzerrolle_id && "bg-primary/10 text-primary hover:bg-primary/10")}
                      >
                        {(b.benutzerrolle_id && rollenMap[b.benutzerrolle_id]) || ROLLEN[b.rolle]}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {gefiltert.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Keine Treffer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-2 text-xs text-muted-foreground">
        {gefiltert.length} von {benutzer.length} angezeigt
      </p>
    </div>
  );
}
