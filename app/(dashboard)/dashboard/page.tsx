import Link from "next/link";
import {
  CalendarPlus,
  Clock,
  FileText,
  GraduationCap,
  Receipt,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/stat-card";
import { PageHeader } from "@/components/shared/page-header";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { formatEuro, formatDatum, formatUhrzeit } from "@/lib/utils";
import type { Fahrschueler, FahrstundeMitRelationen, Rechnung } from "@/lib/types";

export const metadata = { title: "Dashboard · FahrschulApp" };

function begruessung(): string {
  const stunde = new Date().getHours();
  if (stunde < 11) return "Guten Morgen";
  if (stunde < 18) return "Guten Tag";
  return "Guten Abend";
}

function isoDatum(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function wochenBereich(): { start: string; ende: string } {
  const heute = new Date();
  const tag = heute.getDay(); // 0 = So
  const diffZuMontag = (tag + 6) % 7;
  const montag = new Date(heute);
  montag.setDate(heute.getDate() - diffZuMontag);
  const sonntag = new Date(montag);
  sonntag.setDate(montag.getDate() + 6);
  return { start: isoDatum(montag), ende: isoDatum(sonntag) };
}

export default async function DashboardPage() {
  const supabase = createClient();
  const kontext = await getKontext();
  const heute = isoDatum(new Date());
  const { start: wochenStart, ende: wochenEnde } = wochenBereich();

  const [heuteRes, offeneRes, pruefungenRes, wocheRes, lehrerRes, schuelerRes] = await Promise.all([
    supabase
      .from("fahrstunde")
      .select(
        "*, fahrschueler(id, vorname, nachname, avatar_farbe), fahrlehrer(id, vorname, nachname), fahrzeug(id, kennzeichen)",
      )
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
    supabase
      .from("fahrstunde")
      .select("id", { count: "exact", head: true })
      .gte("datum", wochenStart)
      .lte("datum", wochenEnde),
    supabase.from("fahrlehrer").select("id", { count: "exact", head: true }).eq("aktiv", true),
    supabase.from("fahrschueler").select("id", { count: "exact", head: true }),
  ]);

  const heutigeStunden = heuteRes.data ?? [];
  const offenerBetrag = (offeneRes.data ?? []).reduce(
    (summe, r) => summe + Number(r.betrag_brutto ?? 0),
    0,
  );
  const pruefungen = pruefungenRes.data ?? [];
  const wochenStunden = wocheRes.count ?? 0;
  const aktiveLehrer = lehrerRes.count ?? 0;
  const schuelerGesamt = schuelerRes.count ?? 0;

  // Auslastung: gebuchte 45-Min-Slots gegen ca. 40 verfügbare Slots/Lehrer/Woche.
  const kapazitaet = Math.max(aktiveLehrer, 1) * 40;
  const auslastung = Math.min(100, Math.round((wochenStunden / kapazitaet) * 100));

  const vorname = kontext?.fahrlehrer?.vorname;

  return (
    <div className="space-y-6">
      <PageHeader
        title={vorname ? `${begruessung()}, ${vorname}` : "Dashboard"}
        description="Dein Überblick für heute und diese Woche."
      />

      {/* Statistik-Karten */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Fahrstunden heute"
          value={heutigeStunden.length}
          icon={Clock}
          hint={`${formatDatum(heute)}`}
        />
        <StatCard
          label="Offene Rechnungen"
          value={formatEuro(offenerBetrag)}
          icon={Receipt}
          iconClassName="bg-amber-100 text-amber-600"
          hint={`${(offeneRes.data ?? []).length} Rechnung(en)`}
        />
        <StatCard
          label="Aktive Schüler"
          value={schuelerGesamt}
          icon={Users}
          iconClassName="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          label="Auslastung diese Woche"
          value={`${auslastung}%`}
          icon={TrendingUp}
          iconClassName="bg-primary/10 text-primary"
          hint={`${wochenStunden} Stunden geplant`}
        />
      </div>

      {/* Schnellzugriff */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Button asChild variant="outline" size="lg" className="justify-start">
          <Link href="/schueler/neu">
            <UserPlus className="text-primary" /> Neuer Schüler
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="justify-start">
          <Link href="/kalender">
            <CalendarPlus className="text-primary" /> Neue Fahrstunde
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="justify-start">
          <Link href="/rechnungen/neu">
            <FileText className="text-primary" /> Neue Rechnung
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Heutige Fahrstunden */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Heutige Fahrstunden</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/kalender">Zum Kalender</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {heutigeStunden.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Keine Fahrstunden heute"
                description="Für heute sind noch keine Fahrstunden eingetragen."
              />
            ) : (
              <ul className="divide-y">
                {heutigeStunden.map((stunde) => {
                  const typ = FAHRSTUNDE_TYPEN[stunde.typ];
                  return (
                    <li key={stunde.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex w-14 shrink-0 flex-col items-center">
                        <span className="text-sm font-semibold">
                          {formatUhrzeit(stunde.uhrzeit)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {stunde.dauer_minuten} Min
                        </span>
                      </div>
                      <SchuelerAvatar
                        vorname={stunde.fahrschueler?.vorname}
                        nachname={stunde.fahrschueler?.nachname}
                        farbe={stunde.fahrschueler?.avatar_farbe}
                        className="h-9 w-9 text-xs"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {stunde.fahrschueler
                            ? `${stunde.fahrschueler.vorname} ${stunde.fahrschueler.nachname}`
                            : "Ohne Schüler"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {stunde.fahrlehrer
                            ? `${stunde.fahrlehrer.vorname} ${stunde.fahrlehrer.nachname}`
                            : "Kein Lehrer"}
                          {stunde.fahrzeug ? ` · ${stunde.fahrzeug.kennzeichen}` : ""}
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

        {/* Nächste Prüfungstermine */}
        <Card>
          <CardHeader>
            <CardTitle>Nächste Prüfungen</CardTitle>
          </CardHeader>
          <CardContent>
            {pruefungen.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="Keine Prüfungen"
                description="Es stehen keine Prüfungstermine an."
              />
            ) : (
              <ul className="space-y-3">
                {pruefungen.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/schueler/${s.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
                    >
                      <SchuelerAvatar
                        vorname={s.vorname}
                        nachname={s.nachname}
                        farbe={s.avatar_farbe}
                        className="h-9 w-9 text-xs"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {s.vorname} {s.nachname}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Klasse {s.fuehrerscheinklassen?.join(", ") || "—"}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-primary">
                        {formatDatum(s.pruefung_termin)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
