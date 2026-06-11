import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROLLEN, ROLLEN_BESCHREIBUNG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Benutzerrolle, Fahrlehrer } from "@/lib/types";
import { RollenListe, type RolleEintrag } from "./rollen-liste";
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

  // Standardrollen (fest, RLS-relevant) + eigene Rollen zu einer Liste vereinen.
  const standard: RolleEintrag[] = [
    { key: "chef", id: null, name: ROLLEN.chef, beschreibung: ROLLEN_BESCHREIBUNG.chef, zugangsart: "Verwaltung", web_zugang: true, system: true },
    { key: "fahrlehrer", id: null, name: ROLLEN.fahrlehrer, beschreibung: ROLLEN_BESCHREIBUNG.fahrlehrer, zugangsart: "Fahrlehrer", web_zugang: true, system: true },
    { key: "buero", id: null, name: ROLLEN.buero, beschreibung: ROLLEN_BESCHREIBUNG.buero, zugangsart: "Verwaltung", web_zugang: true, system: true },
  ];
  const eigene: RolleEintrag[] = rollen.map((r) => ({
    key: r.id,
    id: r.id,
    name: r.name,
    beschreibung: r.beschreibung,
    zugangsart: r.zugangsart,
    web_zugang: r.web_zugang,
    system: false,
  }));
  const eintraege = [...standard, ...eigene];

  const neu = searchParams.neu === "1";
  const edit = searchParams.edit === "1";
  const selectedKey = searchParams.rolle;
  const selectedEintrag = selectedKey ? eintraege.find((e) => e.key === selectedKey) : undefined;
  const selectedCustom =
    selectedEintrag && !selectedEintrag.system ? rollen.find((r) => r.id === selectedEintrag.id) : undefined;

  const editorModus = neu || Boolean(selectedCustom && edit);
  const panel = neu || Boolean(selectedEintrag);

  // Mitarbeiter der ausgewählten Rolle (nur für die Lese-Ansicht laden).
  let mitglieder: Fahrlehrer[] = [];
  if (selectedEintrag && !editorModus) {
    const { data: alle } = await supabase
      .from("fahrlehrer")
      .select("*")
      .order("nachname", { ascending: true })
      .order("vorname", { ascending: true });
    const list = (alle ?? []) as Fahrlehrer[];
    mitglieder = selectedEintrag.system
      ? list.filter((f) => f.rolle === selectedEintrag.key && !f.benutzerrolle_id)
      : list.filter((f) => f.benutzerrolle_id === selectedEintrag.id);
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
          <RollenListe eintraege={eintraege} selectedKey={selectedKey} />
        </div>

        <div className={cn(!panel && "hidden lg:block")}>
          {editorModus ? (
            <RolleEditor key={selectedCustom?.id ?? "neu"} rolle={selectedCustom} />
          ) : selectedEintrag ? (
            <RolleAkte mitglieder={mitglieder} />
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
