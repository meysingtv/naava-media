import Link from "next/link";
import { Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Fahrlehrer } from "@/lib/types";

export function RolleAkte({ mitglieder }: { mitglieder: Fahrlehrer[] }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Users className="h-4 w-4" /> Mitarbeiter ({mitglieder.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {mitglieder.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Noch keine Mitarbeiter mit dieser Rolle.
          </p>
        ) : (
          <ul className="divide-y">
            {mitglieder.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/fahrlehrer?id=${b.id}`}
                  className="block rounded-md py-2.5 text-center text-sm font-medium transition-colors hover:bg-muted/50"
                >
                  {b.vorname} {b.nachname}
                  {!b.aktiv && <span className="ml-2 text-xs text-muted-foreground">(archiviert)</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
