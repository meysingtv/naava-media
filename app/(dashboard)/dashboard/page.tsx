import { Car, Gauge, Receipt, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { cn, formatDatum, formatEuro, formatUhrzeit, initialen } from "@/lib/utils";
import type { Fahrschueler, FahrstundeMitRelationen, Rechnung } from "@/lib/types";
import { AufgabenCard, type TempAufgabe } from "./aufgaben-card";
import { MiniKalender } from "./mini-kalender";

export const metadata = { title: "Dashboard · FahrschulApp" };

function begruessung(): string {
  const h = new Date().getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function inTagen(n: number): string {
  return iso(new Date(Date.now() + n * 86400000));
}
function wochenBereich(): { start: string; ende: string } {
  const heute = new Date();
  const montag = new Date(heute);
  montag.setDate(heute.getDate() - ((heute.getDay() + 6) % 7));
  const sonntag = new Date(montag);
  sonntag.setDate(montag.getDate() + 6);
  return { start: iso(montag), ende: iso(sonntag) };
}

/** Kompakte KPI-Kachel: Icon links, Zahl + Label rechts. */
function KPI({ icon: Icon, wert, label }: { icon: typeof Users; wert: React.ReactNode; label: string }) {
  return (
    <Card className="flex items-center gap-3 p-4 shadow-sm">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xl font-bold leading-tight">{wert}</p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();
  const kontext = await getKontext();
  const heute = iso(new Date());
  const { start: wochenStart, ende: wochenEnde } = wochenBereich();
  const jetzt = new Date();
  const monatStart = iso(new Date(jetzt.getFullYear(), jetzt.getMonth(), 1));
  const monatEnde = iso(new Date(jetzt.getFullYear(), jetzt.getMonth() + 1, 0));

  const [heuteRes, offeneRes, wocheRes, lehrerRes, schuelerRes, monatRes, namenRes] =
    await Promise.all([
      supabase
        .from("fahrstunde")
        .select("*, fahrschueler(id, vorname, nachname, avatar_farbe), fahrlehrer(id, vorname, nachname), fahrzeug(id, kennzeichen)")
        .eq("datum", heute)
        .order("uhrzeit", { ascending: true })
        .returns<FahrstundeMitRelationen[]>(),
      supabase.from("rechnung").select("*").in("status", ["offen", "ueberfaellig"]).returns<Rechnung[]>(),
      supabase.from("fahrstunde").select("id", { count: "exact", head: true }).gte("datum", wochenStart).lte("datum", wochenEnde),
      supabase.from("fahrlehrer").select("id", { count: "exact", head: true }).eq("aktiv", true),
      supabase.from("fahrschueler").select("id", { count: "exact", head: true }),
      supabase.from("fahrstunde").select("datum").gte("datum", monatStart).lte("datum", monatEnde).returns<{ datum: string }[]>(),
      supabase.from("fahrschueler").select("vorname, nachname").order("nachname").limit(6).returns<Pick<Fahrschueler, "vorname" | "nachname">[]>(),
    ]);

  const heutigeStunden = heuteRes.data ?? [];
  const offene = offeneRes.data ?? [];
  const offenerBetrag = offene.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const wochenStunden = wocheRes.count ?? 0;
  const aktiveLehrer = lehrerRes.count ?? 0;
  const schuelerGesamt = schuelerRes.count ?? 0;
  const monatsTage = Array.from(new Set((monatRes.data ?? []).map((r) => r.datum)));
  const namen = (namenRes.data ?? []).map((s) => `${s.vorname} ${s.nachname}`);

  const auslastung = Math.min(100, Math.round((wochenStunden / (Math.max(aktiveLehrer, 1) * 40)) * 100));
  const vorname = kontext?.fahrlehrer?.vorname ?? "";
  const nachname = kontext?.fahrlehrer?.nachname ?? "";

  // Temporäre Aufgaben (echte Zuweisung folgt später)
  const tempAufgaben: TempAufgabe[] = [
    { titel: "Theorieprüfung beim TÜV anmelden", faellig: inTagen(2), kunde: namen[0] ?? null, prioritaet: "hoch" },
    { titel: "Überfällige Rechnung nachfassen", faellig: inTagen(1), kunde: namen[1] ?? null, prioritaet: "hoch" },
    { titel: "Sehtest-Nachweis anfordern", faellig: inTagen(3), kunde: namen[2] ?? null, prioritaet: "niedrig" },
    { titel: "Fahrzeug zur Hauptuntersuchung anmelden", faellig: inTagen(5), kunde: null, prioritaet: "mittel" },
    { titel: "Erste-Hilfe-Bescheinigung prüfen", faellig: inTagen(7), kunde: namen[3] ?? null, prioritaet: "niedrig" },
    { titel: "Passbild für Führerscheinantrag einscannen", faellig: inTagen(4), kunde: namen[4] ?? null, prioritaet: "mittel" },
    { titel: "Prüfungstermine für nächste Woche planen", faellig: inTagen(6), kunde: null, prioritaet: "mittel" },
    { titel: "Lehrmaterial Klasse B nachbestellen", faellig: inTagen(10), kunde: null, prioritaet: "niedrig" },
    { titel: "Kaffeemaschine entkalken", faellig: inTagen(8), kunde: null, prioritaet: "niedrig" },
  ];

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh_-_7rem)]">
      {/* Reihe 1: Begrüßung + KPIs (feste Höhe) */}
      <div className="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-6">
        <Card className="col-span-2 flex items-center gap-3 p-4 shadow-sm">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
            {initialen(vorname, nachname)}
          </span>
          <div className="min-w-0">
            <p className="text-sm leading-tight text-muted-foreground">{begruessung()},</p>
            <p className="truncate text-lg font-bold leading-tight">{vorname}!</p>
          </div>
        </Card>
        <KPI icon={Users} wert={schuelerGesamt} label="Aktive Schüler" />
        <KPI icon={Receipt} wert={formatEuro(offenerBetrag)} label="Offene Rechnungen" />
        <KPI icon={Car} wert={heutigeStunden.length} label="Fahrstunden heute" />
        <KPI icon={Gauge} wert={`${auslastung}%`} label="Auslastung" />
      </div>

      {/* Reihe 2: füllt die Resthöhe – Panels scrollen intern */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-h-0 lg:col-span-2">
          <AufgabenCard aufgaben={tempAufgaben} />
        </div>

        <div className="flex min-h-0 flex-col gap-4">
          <Card className="flex min-h-0 flex-1 flex-col shadow-sm">
            <CardHeader className="shrink-0 flex-row items-center justify-between p-4 pb-2">
              <CardTitle className="text-base">Meine Termine</CardTitle>
              <span className="text-xs text-muted-foreground">{formatDatum(heute)}</span>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto p-4 pt-0">
              {heutigeStunden.length === 0 ? (
                <p className="flex h-full items-center justify-center py-6 text-center text-sm text-muted-foreground">
                  Heute keine Termine.
                </p>
              ) : (
                <div className="space-y-2">
                  {heutigeStunden.map((s) => {
                    const typ = FAHRSTUNDE_TYPEN[s.typ];
                    const ausgefallen = s.status === "ausgefallen";
                    const name = s.fahrschueler
                      ? `${s.fahrschueler.vorname} ${s.fahrschueler.nachname}`
                      : typ.label;
                    return (
                      <div
                        key={s.id}
                        className={cn(
                          "rounded-md px-3 py-2 text-white",
                          ausgefallen ? "bg-slate-400 line-through" : typ.dot,
                        )}
                      >
                        <p className="truncate text-sm font-semibold">{name}</p>
                        <p className="truncate text-xs text-white/90">
                          {typ.label} · {formatUhrzeit(s.uhrzeit)}
                          {s.fahrzeug ? ` · ${s.fahrzeug.kennzeichen}` : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <MiniKalender markierteTage={monatsTage} />
        </div>
      </div>
    </div>
  );
}
