import { CalendarDays, Receipt, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { cn, formatDatum, formatEuro, formatUhrzeit } from "@/lib/utils";
import type { Aufgabe, Fahrschueler, FahrstundeMitRelationen, Rechnung } from "@/lib/types";
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
function wochenBereich(): { start: string; ende: string } {
  const heute = new Date();
  const montag = new Date(heute);
  montag.setDate(heute.getDate() - ((heute.getDay() + 6) % 7));
  const sonntag = new Date(montag);
  sonntag.setDate(montag.getDate() + 6);
  return { start: iso(montag), ende: iso(sonntag) };
}

function Ring({ prozent }: { prozent: number }) {
  const r = 24;
  const C = 2 * Math.PI * r;
  const off = C * (1 - Math.min(100, Math.max(0, prozent)) / 100);
  return (
    <svg viewBox="0 0 56 56" className="h-14 w-14 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="6" className="stroke-surface-muted" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        strokeWidth="6"
        strokeLinecap="round"
        className="stroke-accent-bright transition-[stroke-dashoffset] duration-500 ease-soft"
        strokeDasharray={C}
        strokeDashoffset={off}
      />
    </svg>
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

  const [heuteRes, offeneRes, pruefungRes, wocheRes, lehrerRes, schuelerRes, monatRes, aufgabenRes] =
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
      supabase
        .from("aufgabe")
        .select("*, fahrschueler(vorname, nachname)")
        .eq("status", "offen")
        .order("faellig_am", { ascending: true, nullsFirst: false })
        .limit(12)
        .returns<(Aufgabe & { fahrschueler: Pick<Fahrschueler, "vorname" | "nachname"> | null })[]>(),
    ]);

  const heutigeStunden = heuteRes.data ?? [];
  const offene = offeneRes.data ?? [];
  const offenerBetrag = offene.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const naechstePruefung = pruefungRes.data?.[0];
  const wochenStunden = wocheRes.count ?? 0;
  const aktiveLehrer = lehrerRes.count ?? 0;
  const schuelerGesamt = schuelerRes.count ?? 0;
  const monatsTage = Array.from(new Set((monatRes.data ?? []).map((r) => r.datum)));

  const auslastung = Math.min(100, Math.round((wochenStunden / (Math.max(aktiveLehrer, 1) * 40)) * 100));
  const vorname = kontext?.fahrlehrer?.vorname ?? "";

  const aufgaben: TempAufgabe[] = (aufgabenRes.data ?? []).map((a) => ({
    titel: a.titel,
    faellig: a.faellig_am,
    kunde: a.fahrschueler ? `${a.fahrschueler.vorname} ${a.fahrschueler.nachname}` : null,
    prioritaet: (["niedrig", "mittel", "hoch"].includes(a.prioritaet)
      ? a.prioritaet
      : "mittel") as TempAufgabe["prioritaet"],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${begruessung()}${vorname ? `, ${vorname}` : ""}`}
        description={`Dein Überblick für ${formatDatum(heute)}.`}
      />

      {/* Kennzahlen */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Aktive Schüler" value={schuelerGesamt} icon={Users} />
        <StatCard
          label="Fahrstunden heute"
          value={heutigeStunden.length}
          icon={CalendarDays}
          hint={`${wochenStunden} diese Woche`}
        />
        <StatCard
          label="Offene Rechnungen"
          value={formatEuro(offenerBetrag)}
          icon={Receipt}
          iconClassName={offene.length > 0 ? "bg-warning-soft text-warning" : undefined}
          hint={offene.length === 1 ? "1 Rechnung offen" : `${offene.length} Rechnungen offen`}
        />
        <Card className="flex items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-muted-foreground">Auslastung</p>
            <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.02em] text-foreground tabular-nums">
              {auslastung}%
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {aktiveLehrer} {aktiveLehrer === 1 ? "Fahrlehrer" : "Fahrlehrer"} · diese Woche
            </p>
          </div>
          <Ring prozent={auslastung} />
        </Card>
      </div>

      {/* Inhalt */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AufgabenCard aufgaben={aufgaben} />
        </div>

        <div className="space-y-4">
          {/* Meine Termine */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-3">
              <CardTitle>Heute</CardTitle>
              <span className="text-xs text-muted-foreground">{formatDatum(heute)}</span>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {heutigeStunden.length === 0 ? (
                <p className="rounded-md border border-dashed border-border-strong py-8 text-center text-sm text-muted-foreground">
                  Heute keine Termine.
                </p>
              ) : (
                <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
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
                          "flex items-center gap-3 rounded-md border px-3 py-2 transition-colors duration-fast hover:bg-surface",
                          ausgefallen && "opacity-60",
                        )}
                      >
                        <span className={cn("h-8 w-1 shrink-0 rounded-full", ausgefallen ? "bg-border-strong" : typ.dot)} />
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate text-sm font-medium text-foreground", ausgefallen && "line-through")}>
                            {name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {typ.kurz}
                            {s.fahrzeug ? ` · ${s.fahrzeug.kennzeichen}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-[13px] font-medium text-foreground-secondary tabular-nums">
                          {formatUhrzeit(s.uhrzeit)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                {naechstePruefung
                  ? `Nächste Prüfung: ${naechstePruefung.vorname} ${naechstePruefung.nachname} am ${formatDatum(naechstePruefung.pruefung_termin)}`
                  : "Keine anstehenden Prüfungen."}
              </p>
            </CardContent>
          </Card>

          <MiniKalender markierteTage={monatsTage} />
        </div>
      </div>
    </div>
  );
}
