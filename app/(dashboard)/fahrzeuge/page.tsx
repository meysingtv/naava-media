import Link from "next/link";
import { redirect } from "next/navigation";
import { Car, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { fahrzeugName, frist, fristText, naechsteHu } from "@/lib/fahrzeug";
import { heuteBerlin, plusTage, stunden, wochenbeginn } from "@/lib/zeit";
import type { Fahrzeug } from "@/lib/types";
import { fahrlehrerOptionen } from "./daten";
import { FahrzeugListe } from "./fahrzeug-liste";

export const metadata = { title: "Fahrzeuge · FahrschulApp" };

export default async function FahrzeugePage({
  searchParams,
}: {
  searchParams: { id?: string; edit?: string; neu?: string };
}) {
  // Alte Links (?id=…, ?neu=1) führen auf die eigenen Seiten.
  if (searchParams.neu === "1") redirect("/fahrzeuge/neu");
  if (searchParams.id) {
    redirect(searchParams.edit === "1" ? `/fahrzeuge/${searchParams.id}/bearbeiten` : `/fahrzeuge/${searchParams.id}`);
  }

  const supabase = createClient();
  const heute = heuteBerlin();
  const montag = wochenbeginn(heute);

  const [fahrzeugRes, lehrer, stundenRes] = await Promise.all([
    supabase.from("fahrzeug").select("*").order("name", { ascending: true }),
    fahrlehrerOptionen(),
    supabase
      .from("fahrstunde")
      .select("fahrzeug_id, dauer_minuten, status")
      .gte("datum", montag)
      .lte("datum", plusTage(montag, 6))
      .returns<{ fahrzeug_id: string | null; dauer_minuten: number | null; status: string }[]>(),
  ]);

  const fahrzeuge = (fahrzeugRes.data ?? []) as Fahrzeug[];
  const kuerzelMap = Object.fromEntries(lehrer.map((l) => [l.id, l.kuerzel]));

  // Fahrstunden je Fahrzeug in dieser Woche (ohne ausgefallene)
  const wocheMap: Record<string, number> = {};
  let minutenWoche = 0;
  for (const s of stundenRes.data ?? []) {
    if (!s.fahrzeug_id || s.status === "ausgefallen") continue;
    wocheMap[s.fahrzeug_id] = (wocheMap[s.fahrzeug_id] ?? 0) + 1;
    minutenWoche += s.dauer_minuten ?? 0;
  }

  const aktive = fahrzeuge.filter((f) => f.aktiv);
  const automatik = aktive.filter((f) => /auto/i.test(f.getriebeart ?? "")).length;
  const termineWoche = aktive.reduce((s, f) => s + (wocheMap[f.id] ?? 0), 0);

  const faellig = (datum: (f: Fahrzeug) => string | null, bald: number) =>
    aktive
      .map((f) => ({ f, frist: frist(datum(f), heute, bald) }))
      .filter((x) => x.frist && x.frist.ton !== "ok")
      .sort((a, b) => a.frist!.tage - b.frist!.tage);
  const hu = faellig(naechsteHu, 60);
  const wartung = faellig((f) => f.naechste_wartung, 30);

  const fristSub = (liste: typeof hu, leer: string) =>
    liste.length ? `${fahrzeugName(liste[0].f)} ${fristText(liste[0].frist!.tage)}` : leer;
  const fristTon = (liste: typeof hu) =>
    liste.some((x) => x.frist!.ton === "ueberfaellig") ? "destructive" : liste.length ? "warning" : "neutral";

  return (
    <div>
      <PageHeader title="Fahrzeuge">
        <Button asChild size="sm">
          <Link href="/fahrzeuge/neu">
            <Plus /> Fahrzeug anlegen
          </Link>
        </Button>
      </PageHeader>

      {fahrzeuge.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Noch keine Fahrzeuge"
          description="Lege das erste Fahrzeug an. Danach planst du es im Kalender ein und behältst HU und Wartung im Blick."
        >
          <Button asChild size="sm">
            <Link href="/fahrzeuge/neu">
              <Plus /> Fahrzeug anlegen
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <KpiRow>
            <KpiCard
              label="Im Einsatz"
              value={aktive.length}
              sub={`${aktive.length - automatik} Schaltung · ${automatik} Automatik`}
            />
            <KpiCard
              label="Fahrstunden diese Woche"
              value={termineWoche}
              sub={
                aktive.length
                  ? `${stunden(minutenWoche)} · Ø ${Math.round(termineWoche / aktive.length)} je Fahrzeug`
                  : stunden(minutenWoche)
              }
              href="/kalender"
            />
            <KpiCard label="HU in den nächsten 60 Tagen" value={hu.length} sub={fristSub(hu, "Alle Fahrzeuge aktuell")} tone={fristTon(hu)} />
            <KpiCard
              label="Wartung in den nächsten 30 Tagen"
              value={wartung.length}
              sub={fristSub(wartung, "Keine Wartung fällig")}
              tone={fristTon(wartung)}
            />
          </KpiRow>

          <FahrzeugListe fahrzeuge={fahrzeuge} kuerzelMap={kuerzelMap} wocheMap={wocheMap} heute={heute} />
        </div>
      )}
    </div>
  );
}
