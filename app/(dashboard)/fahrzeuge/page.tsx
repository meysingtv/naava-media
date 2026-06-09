import { Car, Power } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoeschenDialog } from "@/components/shared/loeschen-dialog";
import { FahrzeugDialog } from "./fahrzeug-dialog";
import { fahrzeugAktivSetzen, fahrzeugLoeschen } from "./actions";
import type { Fahrzeug } from "@/lib/types";

export const metadata = { title: "Fahrzeuge · FahrschulApp" };

export default async function FahrzeugePage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("fahrzeug")
    .select("*")
    .order("aktiv", { ascending: false })
    .order("kennzeichen", { ascending: true });

  const fahrzeuge = (data ?? []) as Fahrzeug[];

  return (
    <div className="space-y-6">
      <PageHeader title="Fahrzeuge" description="Die Flotte deiner Fahrschule.">
        <FahrzeugDialog />
      </PageHeader>

      {fahrzeuge.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Noch keine Fahrzeuge"
          description="Lege Fahrzeuge an, um sie Fahrstunden zuzuordnen und Konflikte zu erkennen."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {fahrzeuge.map((f) => (
            <Card key={f.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Car className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{f.kennzeichen}</p>
                    {f.aktiv ? (
                      <Badge variant="success" className="text-[11px]">
                        Aktiv
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[11px]">
                        Inaktiv
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {[f.marke, f.modell].filter(Boolean).join(" ") || "Keine Angabe"}
                  </p>
                  {f.klasse && (
                    <Badge variant="outline" className="mt-2">
                      Klasse {f.klasse}
                    </Badge>
                  )}
                  <div className="mt-3 flex gap-2">
                    <form action={fahrzeugAktivSetzen}>
                      <input type="hidden" name="id" value={f.id} />
                      <input type="hidden" name="aktiv" value={(!f.aktiv).toString()} />
                      <Button type="submit" variant="outline" size="sm">
                        <Power className="h-3.5 w-3.5" />
                        {f.aktiv ? "Deaktivieren" : "Aktivieren"}
                      </Button>
                    </form>
                    <LoeschenDialog
                      action={fahrzeugLoeschen}
                      id={f.id}
                      titel="Fahrzeug löschen?"
                      beschreibung={`Das Fahrzeug ${f.kennzeichen} wird dauerhaft entfernt.`}
                      buttonLabel=""
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
