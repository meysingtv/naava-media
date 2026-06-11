"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe, Pencil, Plus, Smartphone, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { rolleLoeschen } from "../rollen-actions";

export interface RolleEintrag {
  key: string;
  id: string | null;
  name: string;
  beschreibung: string | null;
  zugangsart: string | null;
  web_zugang: boolean;
  system: boolean;
}

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
const toolbarBtnAus = cn(toolbarBtn, "cursor-not-allowed opacity-40");

export function RollenListe({ eintraege, selectedKey }: { eintraege: RolleEintrag[]; selectedKey?: string }) {
  const router = useRouter();
  const selected = selectedKey ? eintraege.find((e) => e.key === selectedKey) : undefined;
  const bearbeitbar = Boolean(selected && !selected.system);

  return (
    <div>
      <Card>
        <div className="flex flex-wrap items-center gap-1 border-b p-2">
          <Tip label={!selected ? "Erst Rolle auswählen" : selected.system ? "Standardrolle (nicht bearbeitbar)" : "Rolle bearbeiten"}>
            {bearbeitbar ? (
              <Link href={`/fahrlehrer/rollen?rolle=${selected!.key}&edit=1`} aria-label="Rolle bearbeiten" className={toolbarBtn}>
                <Pencil className="h-4 w-4" />
              </Link>
            ) : (
              <span aria-disabled="true" className={toolbarBtnAus}>
                <Pencil className="h-4 w-4" />
              </span>
            )}
          </Tip>
          <Tip label="Neue Rolle">
            <Link href="/fahrlehrer/rollen?neu=1" aria-label="Neue Rolle" className={toolbarBtn}>
              <Plus className="h-4 w-4" />
            </Link>
          </Tip>
          <Tip label={!selected ? "Erst Rolle auswählen" : selected.system ? "Standardrolle (nicht löschbar)" : "Rolle löschen"}>
            {bearbeitbar ? (
              <form action={rolleLoeschen}>
                <input type="hidden" name="id" value={selected!.id ?? ""} />
                <button type="submit" aria-label="Rolle löschen" className={cn(toolbarBtn, "hover:text-destructive")}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <span aria-disabled="true" className={toolbarBtnAus}>
                <Trash2 className="h-4 w-4" />
              </span>
            )}
          </Tip>
          <div className="ml-auto pr-2 text-xs text-muted-foreground">{eintraege.length} Rollen</div>
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
              {eintraege.map((e) => {
                const aktiv = e.key === selectedKey;
                return (
                  <tr
                    key={e.key}
                    onClick={() => router.push(`/fahrlehrer/rollen?rolle=${e.key}`)}
                    className={cn("cursor-pointer transition-colors", aktiv ? "bg-accent" : "hover:bg-muted/50")}
                  >
                    <td className={cn("px-3 py-2", aktiv ? "font-semibold" : "font-medium")}>
                      <span className="flex items-center gap-2">
                        {e.name}
                        {e.system && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Standard
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="hidden max-w-[16rem] truncate px-3 py-2 text-muted-foreground sm:table-cell">
                      {e.beschreibung || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {e.zugangsart ? <Badge variant="secondary">{e.zugangsart}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {e.web_zugang ? (
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
