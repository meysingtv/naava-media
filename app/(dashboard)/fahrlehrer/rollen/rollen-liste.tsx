"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe, Plus, Shield, Smartphone, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import type { Benutzerrolle } from "@/lib/types";
import { rolleLoeschen } from "../rollen-actions";

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

export function RollenListe({ rollen, selectedId }: { rollen: Benutzerrolle[]; selectedId?: string }) {
  const router = useRouter();
  const selected = selectedId ? rollen.find((r) => r.id === selectedId) : undefined;

  if (rollen.length === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="Noch keine Rollen"
        description="Lege z. B. Büro oder Fahrlehrer mit eigenen Rechten an."
      >
        <Link
          href="/fahrlehrer/rollen?neu=1"
          className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Plus className="h-4 w-4" /> Neue Rolle
        </Link>
      </EmptyState>
    );
  }

  return (
    <div>
      <Card>
        <div className="flex flex-wrap items-center gap-1 border-b p-2">
          <Tip label="Neue Rolle">
            <Link href="/fahrlehrer/rollen?neu=1" aria-label="Neue Rolle" className={toolbarBtn}>
              <Plus className="h-4 w-4" />
            </Link>
          </Tip>
          <Tip label={selected ? "Rolle löschen" : "Erst Rolle auswählen"}>
            {selected ? (
              <form action={rolleLoeschen}>
                <input type="hidden" name="id" value={selected.id} />
                <button type="submit" aria-label="Rolle löschen" className={cn(toolbarBtn, "hover:text-destructive")}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <span aria-disabled="true" className={cn(toolbarBtn, "cursor-not-allowed opacity-40")}>
                <Trash2 className="h-4 w-4" />
              </span>
            )}
          </Tip>
          <div className="ml-auto pr-2 text-xs text-muted-foreground">{rollen.length} Rollen</div>
        </div>

        <div className="max-h-[calc(100vh-16rem)] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Rolle</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Beschreibung</th>
                <th className="px-3 py-2 font-medium">Zugangsart</th>
                <th className="px-3 py-2 font-medium">Zugang</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rollen.map((r) => {
                const aktiv = r.id === selectedId;
                return (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/fahrlehrer/rollen?rolle=${r.id}`)}
                    className={cn(
                      "cursor-pointer transition-colors",
                      aktiv ? "bg-accent" : "hover:bg-muted/50",
                    )}
                  >
                    <td className={cn("px-3 py-2", aktiv ? "font-semibold" : "font-medium")}>{r.name}</td>
                    <td className="hidden max-w-[16rem] truncate px-3 py-2 text-muted-foreground sm:table-cell">
                      {r.beschreibung || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.zugangsart ? <Badge variant="secondary">{r.zugangsart}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {r.web_zugang ? (
                          <>
                            <Globe className="h-3.5 w-3.5" /> Web + Mobile
                          </>
                        ) : (
                          <>
                            <Smartphone className="h-3.5 w-3.5" /> Nur Mobile
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
