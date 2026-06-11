import Link from "next/link";
import { Globe, Pencil, Smartphone, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLLEN } from "@/lib/constants";
import { initialen } from "@/lib/utils";
import type { Benutzerrolle, Fahrlehrer } from "@/lib/types";

export function RolleAkte({ rolle, mitglieder }: { rolle: Benutzerrolle; mitglieder: Fahrlehrer[] }) {
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight">{rolle.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {rolle.beschreibung || "Keine Beschreibung"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {rolle.zugangsart && <Badge variant="secondary">{rolle.zugangsart}</Badge>}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {rolle.web_zugang ? (
                  <>
                    <Globe className="h-3.5 w-3.5" /> Web + Mobile
                  </>
                ) : (
                  <>
                    <Smartphone className="h-3.5 w-3.5" /> Nur Mobile
                  </>
                )}
              </span>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/fahrlehrer/rollen?rolle=${rolle.id}&edit=1`}>
              <Pencil className="h-4 w-4" /> Bearbeiten
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="h-4 w-4" /> Mitarbeiter ({mitglieder.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {mitglieder.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Noch keine Mitarbeiter mit dieser Rolle. Weise sie im Benutzer-Formular unter Rollen-Profil zu.
            </p>
          ) : (
            <ul className="divide-y">
              {mitglieder.map((b) => {
                const kuerzel = b.kuerzel?.trim() || initialen(b.vorname, b.nachname);
                return (
                  <li key={b.id}>
                    <Link
                      href={`/fahrlehrer?id=${b.id}`}
                      className="flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                        {kuerzel}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {b.vorname} {b.nachname}
                        </p>
                        {!b.aktiv && <p className="text-xs text-muted-foreground">Archiviert</p>}
                      </div>
                      <Badge variant="secondary">{ROLLEN[b.rolle]}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
