import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, ShieldCheck, UserCog } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Benutzerrolle, Fahrlehrer, Fahrstunde, Fahrzeug } from "@/lib/types";
import { TeamGrid, type TeamKennzahl } from "./team-grid";
import { BenutzerAkte } from "./benutzer-akte";

export const metadata = { title: "Fahrlehrer · FahrschulApp" };

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function FahrlehrerPage({ searchParams }: { searchParams: { id?: string } }) {
  const kontext = await getKontext();
  if (kontext?.fahrlehrer?.rolle !== "chef") redirect("/dashboard");

  const heuteD = new Date();
  const heute = iso(heuteD);
  const montag = new Date(heuteD);
  montag.setDate(heuteD.getDate() - ((heuteD.getDay() + 6) % 7));
  const sonntag = new Date(montag);
  sonntag.setDate(montag.getDate() + 6);
  const vor60 = new Date(heuteD);
  vor60.setDate(heuteD.getDate() - 60);

  const supabase = createClient();
  const [benutzerRes, rollenRes, stundenRes, fahrzeugRes] = await Promise.all([
    supabase.from("fahrlehrer").select("*").order("nachname").order("vorname"),
    supabase.from("benutzerrolle").select("id, name"),
    supabase
      .from("fahrstunde")
      .select("fahrlehrer_id, schueler_id, datum, dauer_minuten, status")
      .gte("datum", iso(vor60))
      .lte("datum", iso(sonntag))
      .neq("status", "ausgefallen")
      .returns<Pick<Fahrstunde, "fahrlehrer_id" | "schueler_id" | "datum" | "dauer_minuten" | "status">[]>(),
    supabase.from("fahrzeug").select("id, kennzeichen, fahrlehrer_ids").eq("aktiv", true).returns<Pick<Fahrzeug, "id" | "kennzeichen" | "fahrlehrer_ids">[]>(),
  ]);

  const benutzer = (benutzerRes.data ?? []) as Fahrlehrer[];
  const rollenMap: Record<string, string> = {};
  for (const r of (rollenRes.data ?? []) as Pick<Benutzerrolle, "id" | "name">[]) rollenMap[r.id] = r.name;

  const wochenStart = iso(montag);
  const wochenEnde = iso(sonntag);
  const kennzahlen: Record<string, TeamKennzahl> = {};
  const schuelerSets: Record<string, Set<string>> = {};
  for (const f of stundenRes.data ?? []) {
    if (!f.fahrlehrer_id) continue;
    const k = (kennzahlen[f.fahrlehrer_id] ??= { heuteMinuten: 0, heuteAnzahl: 0, wocheMinuten: 0, wocheAnzahl: 0, schueler: 0, fahrzeuge: [] });
    const min = f.dauer_minuten ?? 45;
    if (f.datum === heute) {
      k.heuteMinuten += min;
      k.heuteAnzahl += 1;
    }
    if (f.datum >= wochenStart && f.datum <= wochenEnde) {
      k.wocheMinuten += min;
      k.wocheAnzahl += 1;
    }
    if (f.schueler_id) (schuelerSets[f.fahrlehrer_id] ??= new Set()).add(f.schueler_id);
  }
  for (const [id, set] of Object.entries(schuelerSets)) (kennzahlen[id] ??= { heuteMinuten: 0, heuteAnzahl: 0, wocheMinuten: 0, wocheAnzahl: 0, schueler: 0, fahrzeuge: [] }).schueler = set.size;
  for (const v of fahrzeugRes.data ?? []) {
    for (const lid of v.fahrlehrer_ids ?? []) {
      (kennzahlen[lid] ??= { heuteMinuten: 0, heuteAnzahl: 0, wocheMinuten: 0, wocheAnzahl: 0, schueler: 0, fahrzeuge: [] }).fahrzeuge.push(v.kennzeichen);
    }
  }

  const selectedId = searchParams.id;
  const selected = selectedId ? benutzer.find((b) => b.id === selectedId) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Ausbildung" title="Fahrlehrer & Team" description="Auslastung, Zuständigkeiten und Stammdaten.">
        <Button asChild variant="outline" size="sm">
          <Link href="/fahrlehrer/rollen">
            <ShieldCheck /> Rollen & Rechte
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/fahrlehrer/neu">
            <Plus /> Neuer Benutzer
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className={cn(selected && "hidden xl:block")}>
          <TeamGrid benutzer={benutzer} selectedId={selectedId} rollenMap={rollenMap} kennzahlen={kennzahlen} />
        </div>
        <div className={cn(!selected && "hidden xl:block")}>
          {selected ? (
            <BenutzerAkte benutzer={selected} selfUserId={kontext.userId} rollenMap={rollenMap} />
          ) : (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl bg-surface-muted/60 text-center">
              <UserCog className="mb-2 h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-[13px] text-muted-foreground">Person auswählen, um Details zu sehen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
