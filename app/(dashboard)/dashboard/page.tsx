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

function Ring({ prozent }: { prozent: number }) {
  const r = 40;
  const C = 2 * Math.PI * r;
  const off = C * (1 - Math.min(100, Math.max(0, prozent)) / 100);
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 96 96" className="h-24 w-24 -rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={C}
          strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold">{prozent}%</span>
        <span className="text-[10px] text-muted-foreground">Auslastung</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
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

  const [heuteRes, offeneRes, pruefungRes, wocheRes, lehrerRes, schuelerRes, monatRes, namenRes] =
    await Promise.all([
      supabase
        .from("fahrstunde")
        .select("*, fahrschueler(id, vorname, nachname, avatar_farbe), fahrlehrer(id, vorname, nachname), fahrzeug(id, kennzeichen)")
        .eq("datum", heute)
        .order("uhrzeit", { ascending: true })
        .returns<FahrstundeMitRelationen[]>(),
      supabase.from("rechnung").select("*").in("status", ["offen", "ueberfaellig"]).returns<Rechnung[]>(),
      supabase
        .from("fahrschueler")
        .select("vorname, nachname, pruefung_termin")
        .gte("pruefung_termin", heute)
        .order("pruefung_termin", { ascending: true })
        .limit(1)
        .returns<Pick<Fahrschueler, "vorname" | "nachname" | "pruefung_termin">[]>(),
      supabase.from("fahrstunde").select("id", { count: "exact", head: true }).gte("datum", wochenStart).lte("datum", wochenEnde),
      supabase.from("fahrlehrer").select("id", { count: "exact", head: true }).eq("aktiv", true),
      supabase.from("fahrschueler").select("id", { count: "exact", head: true }),
      supabase.from("fahrstunde").select("datum").gte("datum", monatStart).lte("datum", monatEnde).returns<{ datum: string }[]>(),
      supabase.from("fahrschueler").select("vorname, nachname").order("nachname").limit(6).returns<Pick<Fahrschueler, "vorname" | "nachname">[]>(),
    ]);

  const heutigeStunden = heuteRes.data ?? [];
  const offene = offeneRes.data ?? [];
  const offenerBetrag = offene.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const naechstePruefung = pruefungRes.data?.[0];
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
    <div className="space-y-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dashboard</p>

      {/* Obere Reihe */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Überblick */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Diese Woche</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-4">
              <Ring prozent={auslastung} />
              <div className="flex-1 space-y-2 text-sm">
                <MiniStat label="Aktive Schüler" value={schuelerGesamt} />
                <MiniStat label="Offene Rechnungen" value={formatEuro(offenerBetrag)} />
                <MiniStat label="Fahrstunden heute" value={heutigeStunden.length} />
              </div>
            </div>
            <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
              {naechstePruefung
                ? `Nächste Prüfung: ${naechstePruefung.vorname} ${naechstePruefung.nachname} am ${formatDatum(naechstePruefung.pruefung_termin)}`
                : "Keine anstehenden Prüfungen."}
            </p>
          </CardContent>
        </Card>

        {/* Meine Termine */}
        <Card>
          <CardHeader className="flex-row items-center justify-between p-4 pb-2">
            <CardTitle className="text-base">Meine Termine</CardTitle>
            <span className="text-xs text-muted-foreground">{formatDatum(heute)}</span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {heutigeStunden.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Heute keine Termine.</p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
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

        {/* Begrüßung */}
        <Card>
          <CardContent className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {initialen(vorname, nachname)}
            </div>
            <p className="text-lg font-bold tracking-tight">
              {begruessung()}, {vorname}!
            </p>
            <p className="text-sm text-muted-foreground">Schön, dass du da bist.</p>
          </CardContent>
        </Card>
      </div>

      {/* Untere Reihe */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AufgabenCard aufgaben={tempAufgaben} />
        </div>
        <MiniKalender markierteTage={monatsTage} />
      </div>
    </div>
  );
}
