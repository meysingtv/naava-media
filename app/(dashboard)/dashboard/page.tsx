import Link from "next/link";
import { Clock, GraduationCap } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { cn, formatDatum, formatEuro, formatUhrzeit } from "@/lib/utils";
import type { Aufgabe, Fahrschueler, FahrstundeMitRelationen, Rechnung } from "@/lib/types";
import { AufgabenCard } from "./aufgaben-card";
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
function wochenBereich(): { start: string; ende: string } {
  const heute = new Date();
  const diffZuMontag = (heute.getDay() + 6) % 7;
  const montag = new Date(heute);
  montag.setDate(heute.getDate() - diffZuMontag);
  const sonntag = new Date(montag);
  sonntag.setDate(montag.getDate() + 6);
  return { start: iso(montag), ende: iso(sonntag) };
}

type AufgabeMitKunde = Aufgabe & { fahrschueler: { vorname: string; nachname: string } | null };

function MiniStat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
      </div>
      <p className="text-lg font-bold tracking-tight">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();
  const kontext = await getKontext();
  const heute = iso(new Date());
  const { start: wochenStart, ende: wochenEnde } = wochenBereich();

  const heuteDate = new Date();
  const monatStart = iso(new Date(heuteDate.getFullYear(), heuteDate.getMonth(), 1));
  const monatEnde = iso(new Date(heuteDate.getFullYear(), heuteDate.getMonth() + 1, 0));

  const [heuteRes, offeneRes, pruefungenRes, wocheRes, lehrerRes, schuelerRes, aufgabenRes, schuelerOptRes, monatRes] =
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
        .select("*")
        .gte("pruefung_termin", heute)
        .order("pruefung_termin", { ascending: true })
        .limit(5)
        .returns<Fahrschueler[]>(),
      supabase.from("fahrstunde").select("id", { count: "exact", head: true }).gte("datum", wochenStart).lte("datum", wochenEnde),
      supabase.from("fahrlehrer").select("id", { count: "exact", head: true }).eq("aktiv", true),
      supabase.from("fahrschueler").select("id", { count: "exact", head: true }),
      supabase
        .from("aufgabe")
        .select("*, fahrschueler(vorname, nachname)")
        .order("created_at", { ascending: false })
        .returns<AufgabeMitKunde[]>(),
      supabase.from("fahrschueler").select("id, vorname, nachname").order("nachname").returns<Pick<Fahrschueler, "id" | "vorname" | "nachname">[]>(),
      supabase.from("fahrstunde").select("datum").gte("datum", monatStart).lte("datum", monatEnde).returns<{ datum: string }[]>(),
    ]);

  const heutigeStunden = heuteRes.data ?? [];
  const offenerBetrag = (offeneRes.data ?? []).reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const pruefungen = pruefungenRes.data ?? [];
  const wochenStunden = wocheRes.count ?? 0;
  const aktiveLehrer = lehrerRes.count ?? 0;
  const schuelerGesamt = schuelerRes.count ?? 0;
  const aufgaben = aufgabenRes.data ?? [];
  const schuelerOptions = (schuelerOptRes.data ?? []).map((s) => ({ id: s.id, label: `${s.vorname} ${s.nachname}` }));
  const monatsTage = Array.from(new Set((monatRes.data ?? []).map((r) => r.datum)));

  const kapazitaet = Math.max(aktiveLehrer, 1) * 40;
  const auslastung = Math.min(100, Math.round((wochenStunden / kapazitaet) * 100));
  const vorname = kontext?.fahrlehrer?.vorname;

  const langesDatum = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {vorname ? `${begruessung()}, ${vorname}` : "Dashboard"}
        </h1>
        <p className="text-sm capitalize text-muted-foreground">{langesDatum}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Hauptspalte */}
        <div className="space-y-6 lg:col-span-2">
          {/* Heutige Fahrstunden */}
          <Card>
            <CardHeader className="flex-row items-center justify-between p-4 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-muted-foreground" /> Heutige Fahrstunden
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/kalender">Zum Terminplaner</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {heutigeStunden.length === 0 ? (
                <EmptyState icon={Clock} title="Keine Fahrstunden heute" description="Für heute sind noch keine Fahrstunden eingetragen." />
              ) : (
                <ul className="space-y-2">
                  {heutigeStunden.map((s) => {
                    const typ = FAHRSTUNDE_TYPEN[s.typ];
                    return (
                      <li key={s.id} className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
                        <span className={cn("h-9 w-1 shrink-0 rounded-full", typ.dot)} />
                        <div className="w-12 shrink-0 text-sm">
                          <p className="font-semibold">{formatUhrzeit(s.uhrzeit)}</p>
                          <p className="text-[11px] text-muted-foreground">{s.dauer_minuten}′</p>
                        </div>
                        <SchuelerAvatar
                          vorname={s.fahrschueler?.vorname}
                          nachname={s.fahrschueler?.nachname}
                          farbe={s.fahrschueler?.avatar_farbe}
                          className="h-8 w-8 text-xs"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {s.fahrschueler ? `${s.fahrschueler.vorname} ${s.fahrschueler.nachname}` : "Ohne Schüler"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {s.fahrlehrer ? `${s.fahrlehrer.vorname} ${s.fahrlehrer.nachname}` : "Kein Lehrer"}
                            {s.fahrzeug ? ` · ${s.fahrzeug.kennzeichen}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className={typ.badge}>
                          {typ.kurz}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Aufgaben */}
          <AufgabenCard aufgaben={aufgaben} schuelerOptions={schuelerOptions} />
        </div>

        {/* Seitenspalte */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Überblick</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0">
              <MiniStat label="Fahrstunden heute" value={heutigeStunden.length} />
              <MiniStat label="Aktive Schüler" value={schuelerGesamt} />
              <MiniStat label="Offene Rechnungen" value={formatEuro(offenerBetrag)} hint={`${(offeneRes.data ?? []).length} Rechnung(en)`} />
              <MiniStat label="Auslastung diese Woche" value={`${auslastung}%`} hint={`${wochenStunden} Stunden geplant`} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-4 w-4 text-muted-foreground" /> Nächste Prüfungen
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {pruefungen.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Keine Prüfungstermine.</p>
              ) : (
                <ul className="space-y-1">
                  {pruefungen.map((s) => (
                    <li key={s.id}>
                      <Link href={`/schueler?id=${s.id}`} className="flex items-center gap-2.5 rounded-md p-2 transition-colors hover:bg-muted">
                        <SchuelerAvatar vorname={s.vorname} nachname={s.nachname} farbe={s.avatar_farbe} className="h-8 w-8 text-xs" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{s.vorname} {s.nachname}</p>
                          <p className="text-xs text-muted-foreground">Klasse {s.fuehrerscheinklassen?.join(", ") || "—"}</p>
                        </div>
                        <span className="shrink-0 text-sm font-medium text-primary">{formatDatum(s.pruefung_termin)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <MiniKalender markierteTage={monatsTage} />
        </div>
      </div>
    </div>
  );
}
