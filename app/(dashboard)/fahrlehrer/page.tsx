import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { heuteBerlin, plusTage, stunden, wochenbeginn } from "@/lib/zeit";
import type { Benutzerrolle, Fahrlehrer, Fahrstunde, Fahrzeug } from "@/lib/types";
import { TAGESKAPAZITAET } from "@/lib/team";
import { TeamListe, type TeamKennzahl } from "./team-liste";

export const metadata = { title: "Team · FahrschulApp" };

const LEER: TeamKennzahl = { heuteMinuten: 0, heuteAnzahl: 0, wocheMinuten: 0, wocheAnzahl: 0, schueler: 0, fahrzeuge: [] };

export default async function TeamPage({ searchParams }: { searchParams: { id?: string } }) {
  // Alte Links (/fahrlehrer?id=…) führen auf die eigene Seite der Person.
  if (searchParams.id) redirect(`/fahrlehrer/${searchParams.id}`);

  const kontext = await getKontext();
  const heute = heuteBerlin();
  const montag = wochenbeginn(heute);
  const sonntag = plusTage(montag, 6);

  const supabase = createClient();
  const [benutzerRes, rollenRes, stundenRes, fahrzeugRes] = await Promise.all([
    supabase.from("fahrlehrer").select("*").order("nachname").order("vorname"),
    supabase.from("benutzerrolle").select("id, name"),
    supabase
      .from("fahrstunde")
      .select("fahrlehrer_id, schueler_id, datum, dauer_minuten, status")
      .gte("datum", plusTage(heute, -60))
      .lte("datum", sonntag)
      .neq("status", "ausgefallen")
      .returns<Pick<Fahrstunde, "fahrlehrer_id" | "schueler_id" | "datum" | "dauer_minuten" | "status">[]>(),
    supabase
      .from("fahrzeug")
      .select("id, kennzeichen, fahrlehrer_ids")
      .eq("aktiv", true)
      .returns<Pick<Fahrzeug, "id" | "kennzeichen" | "fahrlehrer_ids">[]>(),
  ]);

  const benutzer = (benutzerRes.data ?? []) as Fahrlehrer[];
  const rollenMap: Record<string, string> = {};
  for (const r of (rollenRes.data ?? []) as Pick<Benutzerrolle, "id" | "name">[]) rollenMap[r.id] = r.name;

  // Kennzahlen je Person: heute, diese Woche, Schüler der letzten 60 Tage, Fahrzeuge
  const kennzahlen: Record<string, TeamKennzahl> = {};
  const schuelerSets: Record<string, Set<string>> = {};
  const k = (id: string) => (kennzahlen[id] ??= { ...LEER, fahrzeuge: [] });
  for (const f of stundenRes.data ?? []) {
    if (!f.fahrlehrer_id) continue;
    const z = k(f.fahrlehrer_id);
    const min = f.dauer_minuten ?? 45;
    if (f.datum === heute) {
      z.heuteMinuten += min;
      z.heuteAnzahl += 1;
    }
    if (f.datum >= montag && f.datum <= sonntag) {
      z.wocheMinuten += min;
      z.wocheAnzahl += 1;
    }
    if (f.schueler_id && f.datum <= heute) (schuelerSets[f.fahrlehrer_id] ??= new Set()).add(f.schueler_id);
  }
  for (const [id, set] of Object.entries(schuelerSets)) k(id).schueler = set.size;
  for (const v of fahrzeugRes.data ?? []) {
    for (const lid of v.fahrlehrer_ids ?? []) k(lid).fahrzeuge.push({ id: v.id, kennzeichen: v.kennzeichen });
  }

  const aktive = benutzer.filter((b) => b.aktiv);
  const lehrend = aktive.filter((b) => b.rolle !== "buero");
  const summe = (feld: keyof Omit<TeamKennzahl, "fahrzeuge">) => lehrend.reduce((s, b) => s + (kennzahlen[b.id]?.[feld] ?? 0), 0);
  const imEinsatz = lehrend.filter((b) => (kennzahlen[b.id]?.heuteAnzahl ?? 0) > 0).length;
  const auslastung = lehrend.length ? Math.round((summe("heuteMinuten") / (lehrend.length * TAGESKAPAZITAET)) * 100) : 0;

  return (
    <div>
      <PageHeader title="Team">
        <Button asChild size="sm">
          <Link href="/fahrlehrer/neu">
            <Plus /> Mitarbeiter anlegen
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-6">
        <KpiRow>
          <KpiCard label="Mitarbeiter" value={aktive.length} sub={`${lehrend.length} unterrichten · ${aktive.length - lehrend.length} Büro`} />
          <KpiCard label="Fahrstunden heute" value={summe("heuteAnzahl")} sub={`${imEinsatz} von ${lehrend.length} Fahrlehrern im Einsatz`} href="/kalender" />
          <KpiCard
            label="Stunden diese Woche"
            value={stunden(summe("wocheMinuten"))}
            sub={lehrend.length ? `Ø ${stunden(summe("wocheMinuten") / lehrend.length)} je Fahrlehrer` : undefined}
          />
          <KpiCard label="Auslastung heute" value={`${auslastung} %`} sub="bei 8 Std. je Fahrlehrer" />
        </KpiRow>

        <TeamListe benutzer={benutzer} rollenMap={rollenMap} kennzahlen={kennzahlen} selbstUserId={kontext?.userId ?? null} />
      </div>
    </div>
  );
}
