import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { cn, formatUhrzeit } from "@/lib/utils";
import type { Fahrlehrer, Fahrschueler, FahrstundeMitRelationen, Fahrzeug } from "@/lib/types";
import { NeueFahrstundeButton } from "./neue-fahrstunde-button";
import { KalenderTag } from "./kalender-tag";

export const metadata = { title: "Kalender · FahrschulApp" };

const WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function parseIso(s?: string): Date {
  if (!s) return new Date();
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
function plusTage(s: string, n: number): string {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
function montagDerWoche(offsetWochen: number): Date {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const diffZuMontag = (heute.getDay() + 6) % 7;
  const montag = new Date(heute);
  montag.setDate(heute.getDate() - diffZuMontag + offsetWochen * 7);
  return montag;
}

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: { w?: string; d?: string; ansicht?: string };
}) {
  const ansicht = searchParams.ansicht === "tag" ? "tag" : "woche";
  const heuteIso = iso(new Date());

  const supabase = createClient();

  // Optionen für die Dialoge (und Spalten der Tagesansicht)
  const [schuelerRes, lehrerRes, fahrzeugRes] = await Promise.all([
    supabase.from("fahrschueler").select("*").order("nachname").returns<Fahrschueler[]>(),
    supabase.from("fahrlehrer").select("*").eq("aktiv", true).order("nachname").returns<Fahrlehrer[]>(),
    supabase.from("fahrzeug").select("*").eq("aktiv", true).order("kennzeichen").returns<Fahrzeug[]>(),
  ]);

  const aktiveLehrer = lehrerRes.data ?? [];
  const options = {
    schueler: (schuelerRes.data ?? []).map((s) => ({ id: s.id, label: `${s.vorname} ${s.nachname}` })),
    fahrlehrer: aktiveLehrer.map((f) => ({ id: f.id, label: `${f.vorname} ${f.nachname}` })),
    fahrzeuge: (fahrzeugRes.data ?? []).map((f) => ({ id: f.id, label: f.kennzeichen })),
  };

  const selectStunden =
    "*, fahrschueler(id, vorname, nachname, avatar_farbe), fahrlehrer(id, vorname, nachname), fahrzeug(id, kennzeichen)";

  const toggle = (
    <div className="inline-flex rounded-lg border bg-card p-0.5">
      <Link
        href="/kalender?ansicht=woche"
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium",
          ansicht === "woche" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
        )}
      >
        Woche
      </Link>
      <Link
        href="/kalender?ansicht=tag"
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium",
          ansicht === "tag" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
        )}
      >
        Tag
      </Link>
    </div>
  );

  // ---------------- Tagesansicht ----------------
  if (ansicht === "tag") {
    const datum = iso(parseIso(searchParams.d));
    const { data } = await supabase
      .from("fahrstunde")
      .select(selectStunden)
      .eq("datum", datum)
      .order("uhrzeit", { ascending: true })
      .returns<FahrstundeMitRelationen[]>();

    const label = parseIso(datum).toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    return (
      <div className="space-y-6">
        <PageHeader title="Kalender" description="Tagesübersicht je Fahrlehrer.">
          <NeueFahrstundeButton options={options} defaultDatum={datum} />
        </PageHeader>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="icon">
              <Link href={`/kalender?ansicht=tag&d=${plusTage(datum, -1)}`} aria-label="Vorheriger Tag">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon">
              <Link href={`/kalender?ansicht=tag&d=${plusTage(datum, 1)}`} aria-label="Nächster Tag">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            {datum !== heuteIso && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/kalender?ansicht=tag">Heute</Link>
              </Button>
            )}
            <p className="ml-2 text-sm font-medium">{label}</p>
          </div>
          {toggle}
        </div>

        <p className="text-xs text-muted-foreground">
          Tipp: Auf eine freie Stelle klicken, um eine Fahrstunde anzulegen – oder eine bestehende
          Stunde antippen, um sie zu bearbeiten.
        </p>

        <KalenderTag
          datum={datum}
          fahrlehrer={aktiveLehrer.map((f) => ({ id: f.id, vorname: f.vorname, nachname: f.nachname }))}
          stunden={data ?? []}
          options={options}
        />
      </div>
    );
  }

  // ---------------- Wochenansicht ----------------
  const offset = Number(searchParams.w ?? 0) || 0;
  const montag = montagDerWoche(offset);
  const tage = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(montag);
    d.setDate(montag.getDate() + i);
    return d;
  });
  const start = iso(tage[0]);
  const ende = iso(tage[6]);

  const { data: wochenStunden } = await supabase
    .from("fahrstunde")
    .select(selectStunden)
    .gte("datum", start)
    .lte("datum", ende)
    .order("uhrzeit", { ascending: true })
    .returns<FahrstundeMitRelationen[]>();

  const stunden = wochenStunden ?? [];
  const monatLabel = `${tage[0].toLocaleDateString("de-DE", { day: "2-digit", month: "short" })} – ${tage[6].toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Kalender" description="Wochenübersicht aller Fahrstunden.">
        <NeueFahrstundeButton options={options} defaultDatum={heuteIso} />
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button asChild variant="outline" size="icon">
            <Link href={`/kalender?w=${offset - 1}`} aria-label="Vorherige Woche">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon">
            <Link href={`/kalender?w=${offset + 1}`} aria-label="Nächste Woche">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          {offset !== 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/kalender">Heute</Link>
            </Button>
          )}
          <p className="ml-2 text-sm font-medium">{monatLabel}</p>
        </div>
        {toggle}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {tage.map((tag, i) => {
          const tagIso = iso(tag);
          const istHeute = tagIso === heuteIso;
          const tagesStunden = stunden.filter((s) => s.datum === tagIso);
          return (
            <Card key={tagIso} className={cn("flex flex-col p-0", istHeute && "ring-2 ring-primary")}>
              <Link
                href={`/kalender?ansicht=tag&d=${tagIso}`}
                className={cn(
                  "rounded-t-xl border-b px-3 py-2 text-center transition-colors hover:opacity-90",
                  istHeute ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted",
                )}
              >
                <p className="text-xs font-medium uppercase tracking-wide">{WOCHENTAGE[i].slice(0, 2)}</p>
                <p className="text-sm font-semibold">
                  {tag.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                </p>
              </Link>
              <div className="flex-1 space-y-1.5 p-2">
                {tagesStunden.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">—</p>
                ) : (
                  tagesStunden.map((s) => {
                    const typ = FAHRSTUNDE_TYPEN[s.typ];
                    return (
                      <Link
                        key={s.id}
                        href={`/kalender?ansicht=tag&d=${s.datum}`}
                        className={cn(
                          "block rounded-md border px-2 py-1.5 text-xs",
                          typ.badge,
                          s.status === "ausgefallen" && "opacity-50 line-through",
                        )}
                      >
                        <p className="font-semibold">{formatUhrzeit(s.uhrzeit)}</p>
                        <p className="truncate">
                          {s.fahrschueler
                            ? `${s.fahrschueler.vorname} ${s.fahrschueler.nachname}`
                            : "Ohne Schüler"}
                        </p>
                        {s.fahrlehrer && (
                          <p className="truncate opacity-80">
                            {s.fahrlehrer.vorname} {s.fahrlehrer.nachname}
                          </p>
                        )}
                      </Link>
                    );
                  })
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
