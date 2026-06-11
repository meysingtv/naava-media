import { redirect } from "next/navigation";
import { UserCog } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Fahrlehrer } from "@/lib/types";
import { BenutzerListe } from "./benutzer-liste";
import { BenutzerAkte } from "./benutzer-akte";
import { BenutzerForm } from "./benutzer-form";

export const metadata = { title: "Benutzer · FahrschulApp" };

export default async function BenutzerPage({
  searchParams,
}: {
  searchParams: { id?: string; edit?: string; neu?: string };
}) {
  const kontext = await getKontext();
  if (kontext?.fahrlehrer?.rolle !== "chef") {
    redirect("/dashboard");
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("fahrlehrer")
    .select("*")
    .order("nachname", { ascending: true })
    .order("vorname", { ascending: true });

  const benutzer = (data ?? []) as Fahrlehrer[];

  const neu = searchParams.neu === "1";
  const edit = searchParams.edit === "1";
  const selectedId = searchParams.id;
  const selected = selectedId ? benutzer.find((b) => b.id === selectedId) : undefined;
  const panelAktiv = neu || (selected && edit) || selected;

  return (
    <div className="space-y-6">
      <PageHeader title="Benutzer" description="Dein Team und die Rollen." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className={cn(panelAktiv && "hidden lg:block")}>
          <BenutzerListe benutzer={benutzer} selectedId={selectedId} selfUserId={kontext.userId} />
        </div>

        <div className={cn(!panelAktiv && "hidden lg:block")}>
          {neu ? (
            <BenutzerForm />
          ) : selected && edit ? (
            <BenutzerForm benutzer={selected} />
          ) : selected ? (
            <BenutzerAkte benutzer={selected} selfUserId={kontext.userId} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-24 text-center text-muted-foreground">
                <UserCog className="h-8 w-8" />
                <p className="text-sm">Wähle links einen Benutzer oder lege einen neuen an.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
