import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ROLLEN, ROLLEN_BESCHREIBUNG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Benutzerrolle, Fahrlehrer } from "@/lib/types";
import { RollenListe, type RolleEintrag } from "./rollen-liste";
import { RolleEditor } from "./rolle-editor";
import { RolleAkte } from "./rolle-akte";

export const metadata = { title: "Rollen und Rechte · FahrschulApp" };

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

  // Mitarbeiter je Rolle (für die Liste) und die der gewählten Rolle
  const { data: alle } = await supabase
    .from("fahrlehrer")
    .select("*")
    .order("nachname", { ascending: true })
    .order("vorname", { ascending: true });
  const team = (alle ?? []) as Fahrlehrer[];
  const schluesselVon = (f: Fahrlehrer) => f.benutzerrolle_id ?? f.rolle;
  const anzahl: Record<string, number> = {};
  for (const f of team) if (f.aktiv) anzahl[schluesselVon(f)] = (anzahl[schluesselVon(f)] ?? 0) + 1;
  const mitglieder = selectedEintrag ? team.filter((f) => schluesselVon(f) === selectedEintrag.key) : [];

  return (
    <div>
      <PageHeader title="Rollen und Rechte">
        <Button asChild size="sm">
          <Link href="/fahrlehrer/rollen?neu=1">
            <Plus /> Rolle anlegen
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <div className={cn(panel && "hidden lg:block")}>
          <RollenListe eintraege={eintraege} selectedKey={neu ? undefined : selectedKey} anzahl={anzahl} />
        </div>

        <div className={cn(!panel && "hidden lg:block")}>
          {editorModus ? (
            <RolleEditor key={selectedCustom?.id ?? "neu"} rolle={neu ? undefined : selectedCustom} />
          ) : selectedEintrag ? (
            <RolleAkte eintrag={selectedEintrag} rolle={selectedCustom} mitglieder={mitglieder} />
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong px-6 text-center">
              <ShieldCheck className="h-6 w-6 text-foreground-tertiary" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-13 text-foreground-secondary">Wähle links eine Rolle, um Zugang, Bereiche und Mitarbeiter zu sehen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
