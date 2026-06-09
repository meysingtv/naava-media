import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { formatUhrzeit } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Fahrlehrer, Fahrschueler, FahrstundeMitRelationen, Fahrzeug } from "@/lib/types";
import { KalenderDialog } from "./kalender-dialog";

export const metadata = { title: "Kalender · FahrschulApp" };

const WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function montagDerWoche(offsetWochen: number): Date {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const tag = heute.getDay();
  const diffZuMontag = (tag + 6) % 7;
  const montag = new Date(heute);
  montag.setDate(heute.getDate() - diffZuMontag + offsetWochen * 7);
  return montag;
}

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: { w?: string };
}) {
  const offset = Number(searchParams.w ?? 0) || 0;
  const montag = montagDerWoche(offset);
  const tage = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(montag);
    d.setDate(montag.getDate() + i);
    return d;
  });
  const start = iso(tage[0]);
  const ende = iso(tage[6]);
  const heuteIso = iso(new Date());

  const supabase = createClient();
  const [stundenRes, schuelerRes, lehrerRes, fahrzeugRes] = await Promise.all([
    supabase
      .from("fahrstunde")
      .select(
        "*, fahrschueler(id, vorname, nachname, avatar_farbe), fahrlehrer(id, vorname, nachname), fahrzeug(id, kennzeichen)",
      )
      .gte("datum", start)
      .lte("datum", ende)
      .order("uhrzeit", { ascending: true })
      .returns<FahrstundeMitRelationen[]>(),
    supabase.from("fahrschueler").select("*").order("nachname").returns<Fahrschueler[]>(),
    supabase.from("fahrlehrer").select("*").eq("aktiv", true).order("nachname").returns<Fahrlehrer[]>(),
    supabase.from("fahrzeug").select("*").eq("aktiv", true).order("kennzeichen").returns<Fahrzeug[]>(),
  ]);

  const stunden = stundenRes.data ?? [];
  const stundenProTag = (tagIso: string) => stunden.filter((s) => s.datum === tagIso);

  const monatLabel = `${tage[0].toLocaleDateString("de-DE", { day: "2-digit", month: "short" })} – ${tage[6].toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}`;

  const schuelerOpt = (schuelerRes.data ?? []).map((s) => ({
    id: s.id,
    label: `${s.vorname} ${s.nachname}`,
  }));
  const lehrerOpt = (lehrerRes.data ?? []).map((f) => ({
    id: f.id,
    label: `${f.vorname} ${f.nachname}`,
  }));
  const fahrzeugOpt = (fahrzeugRes.data ?? []).map((f) => ({ id: f.id, label: f.kennzeichen }));

  return (
    <div className="space-y-6">
      <PageHeader title="Kalender" description="Wochenübersicht aller Fahrstunden.">
        <KalenderDialog
          schueler={schuelerOpt}
          fahrlehrer={lehrerOpt}
          fahrzeuge={fahrzeugOpt}
          defaultDatum={offset === 0 ? heuteIso : start}
        />
      </PageHeader>

      <div className="flex items-center justify-between">
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
        </div>
        <p className="text-sm font-medium">{monatLabel}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {tage.map((tag, i) => {
          const tagIso = iso(tag);
          const istHeute = tagIso === heuteIso;
          const tagesStunden = stundenProTag(tagIso);
          return (
            <Card
              key={tagIso}
              className={cn("flex flex-col p-0", istHeute && "ring-2 ring-primary")}
            >
              <div
                className={cn(
                  "rounded-t-xl border-b px-3 py-2 text-center",
                  istHeute ? "bg-primary text-primary-foreground" : "bg-muted/40",
                )}
              >
                <p className="text-xs font-medium uppercase tracking-wide">
                  {WOCHENTAGE[i].slice(0, 2)}
                </p>
                <p className="text-sm font-semibold">
                  {tag.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                </p>
              </div>
              <div className="flex-1 space-y-1.5 p-2">
                {tagesStunden.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">—</p>
                ) : (
                  tagesStunden.map((s) => {
                    const typ = FAHRSTUNDE_TYPEN[s.typ];
                    return (
                      <div
                        key={s.id}
                        className={cn("rounded-md border px-2 py-1.5 text-xs", typ.badge)}
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
                      </div>
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
