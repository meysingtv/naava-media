import { redirect } from "next/navigation";
import { Mail, Phone, Power, UserCog } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoeschenDialog } from "@/components/shared/loeschen-dialog";
import { initialen } from "@/lib/utils";
import { EinladenDialog } from "./einladen-dialog";
import { RolleSelect } from "./rolle-select";
import { fahrlehrerAktivSetzen, fahrlehrerLoeschen } from "./actions";
import type { Fahrlehrer } from "@/lib/types";

export const metadata = { title: "Fahrlehrer · FahrschulApp" };

export default async function FahrlehrerPage() {
  const kontext = await getKontext();
  if (kontext?.fahrlehrer?.rolle !== "chef") {
    redirect("/dashboard");
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("fahrlehrer")
    .select("*")
    .order("aktiv", { ascending: false })
    .order("nachname", { ascending: true });

  const team = (data ?? []) as Fahrlehrer[];

  return (
    <div className="space-y-6">
      <PageHeader title="Fahrlehrer" description="Verwalte dein Team und die Rollen.">
        <EinladenDialog />
      </PageHeader>

      {team.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Noch kein Team"
          description="Füge Fahrlehrer und Bürokräfte hinzu und weise ihnen Rollen zu."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {team.map((m) => {
            const istIchSelbst = m.user_id === kontext.userId;
            return (
              <Card key={m.id} className={m.aktiv ? "" : "opacity-70"}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initialen(m.vorname, m.nachname)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {m.vorname} {m.nachname}
                      </p>
                      {istIchSelbst && (
                        <Badge variant="outline" className="text-[11px]">
                          Du
                        </Badge>
                      )}
                      {!m.aktiv && (
                        <Badge variant="secondary" className="text-[11px]">
                          Deaktiviert
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {m.email && (
                        <p className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3" />
                          {m.email}
                        </p>
                      )}
                      {m.telefon && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" />
                          {m.telefon}
                        </p>
                      )}
                    </div>
                    {m.fuehrerscheinklassen?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.fuehrerscheinklassen.map((k) => (
                          <Badge key={k} variant="secondary" className="px-1.5 py-0 text-[11px]">
                            {k}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {istIchSelbst ? (
                        <Badge variant="default">Chef</Badge>
                      ) : (
                        <RolleSelect id={m.id} rolle={m.rolle} />
                      )}
                      {!istIchSelbst && (
                        <>
                          <form action={fahrlehrerAktivSetzen}>
                            <input type="hidden" name="id" value={m.id} />
                            <input type="hidden" name="aktiv" value={(!m.aktiv).toString()} />
                            <Button type="submit" variant="outline" size="sm">
                              <Power className="h-3.5 w-3.5" />
                              {m.aktiv ? "Deaktivieren" : "Aktivieren"}
                            </Button>
                          </form>
                          <LoeschenDialog
                            action={fahrlehrerLoeschen}
                            id={m.id}
                            titel="Mitarbeiter entfernen?"
                            beschreibung={`${m.vorname} ${m.nachname} wird aus dem Team entfernt.`}
                            buttonLabel=""
                          />
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
