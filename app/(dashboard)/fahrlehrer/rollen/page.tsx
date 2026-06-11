import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Benutzerrolle, Fahrlehrer } from "@/lib/types";
import { RollenListe } from "./rollen-liste";
import { RolleEditor } from "./rolle-editor";
import { RolleAkte } from "./rolle-akte";

export const metadata = { title: "Rollen & Berechtigungen · FahrschulApp" };

export default async function RollenPage({
  searchParams,
}: {
  searchParams: { rolle?: string; neu?: string; edit?: string };
}) {
  const kontext = await getKontext();
  if (kontext?.fahrlehrer?.rolle !== "chef") {
    redirect("/dashboard");
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("benutzerrolle")
    .select("*")
    .order("created_at", { ascending: true });

  const rollen = (data ?? []) as Benutzerrolle[];

  const neu = searchParams.neu === "1";
  const edit = searchParams.edit === "1";
  const selectedId = searchParams.rolle;
  const selected = selectedId ? rollen.find((r) => r.id === selectedId) : undefined;
  const panel = neu || Boolean(selected);

  // Mitarbeiter der ausgewählten Rolle (nur für die Lese-Ansicht laden).
  let mitglieder: Fahrlehrer[] = [];
  if (selected && !edit) {
    const { data: m } = await supabase
      .from("fahrlehrer")
      .select("*")
      .eq("benutzerrolle_id", selected.id)
      .order("nachname", { ascending: true })
      .order("vorname", { ascending: true });
    mitglieder = (m ?? []) as Fahrlehrer[];
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Rollen & Berechtigungen" description="Lege Rollen an und steuere, wer was darf.">
        <Button asChild variant="outline" size="sm">
          <Link href="/fahrlehrer">
            <ArrowLeft className="h-4 w-4" /> Zurück zu Benutzer
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className={cn(panel && "hidden lg:block")}>
          <RollenListe rollen={rollen} selectedId={selectedId} />
        </div>

        <div className={cn(!panel && "hidden lg:block")}>
          {neu || (selected && edit) ? (
            <RolleEditor key={selected?.id ?? "neu"} rolle={edit ? selected : undefined} />
          ) : selected ? (
            <RolleAkte rolle={selected} mitglieder={mitglieder} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-24 text-center text-muted-foreground">
                <ShieldCheck className="h-8 w-8" />
                <p className="text-sm">Wähle links eine Rolle aus oder lege eine neue an.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
