import Link from "next/link";
import { notFound } from "next/navigation";
import { UserMinus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eigenschaft, Eigenschaften } from "@/components/ui/eigenschaften";
import { Karte, KarteLeer, KartenLink } from "@/components/ui/karte";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { DetailKopf } from "@/components/shared/detail-kopf";
import { LoeschenDialog } from "@/components/shared/loeschen-dialog";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { KURS_STATUS, THEORIE_GRUNDSTOFF } from "@/lib/constants";
import { cn, formatDatum, formatUhrzeit } from "@/lib/utils";
import { heuteBerlin, wochentagKurz } from "@/lib/zeit";
import type { Fahrschueler, Kurs, Theoriestunde } from "@/lib/types";
import { kursLoeschen, kursStatusSetzen, teilnehmerEntfernen } from "../actions";
import { TeilnehmerHinzufuegen } from "./teilnehmer-hinzufuegen";

export const metadata = { title: "Kurs · FahrschulApp" };

type TeilnahmeRow = {
  id: string;
  schueler_id: string;
  fahrschueler: Pick<Fahrschueler, "id" | "vorname" | "nachname" | "avatar_farbe"> | null;
};

type StundeRow = Pick<Theoriestunde, "id" | "datum" | "uhrzeit" | "thema" | "max_teilnehmer"> & {
  teilnahme: { count: number }[] | null;
};

const STATUS_BADGE: Record<string, "default" | "warning" | "secondary"> = {
  laufend: "default",
  geplant: "warning",
  beendet: "secondary",
};

export default async function KursDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: kursData } = await supabase.from("kurs").select("*").eq("id", params.id).maybeSingle();
  if (!kursData) notFound();
  const kurs = kursData as Kurs;

  const [teilnahmeRes, alleRes, stundenRes] = await Promise.all([
    supabase
      .from("kurs_teilnahme")
      .select("id, schueler_id, fahrschueler(id, vorname, nachname, avatar_farbe)")
      .eq("kurs_id", kurs.id)
      .returns<TeilnahmeRow[]>(),
    supabase
      .from("fahrschueler")
      .select("id, vorname, nachname, ausbildung_beendet")
      .order("nachname")
      .returns<Pick<Fahrschueler, "id" | "vorname" | "nachname" | "ausbildung_beendet">[]>(),
    supabase
      .from("theoriestunde")
      .select("id, datum, uhrzeit, thema, max_teilnehmer, teilnahme:theorie_teilnahme(count)")
      .eq("kurs_id", kurs.id)
      .order("datum", { ascending: true })
      .returns<StundeRow[]>(),
  ]);

  const heute = heuteBerlin();
  const teilnahmen = (teilnahmeRes.data ?? []).sort((a, b) =>
    `${a.fahrschueler?.nachname ?? ""}`.localeCompare(`${b.fahrschueler?.nachname ?? ""}`, "de"),
  );
  const eingeschrieben = new Set(teilnahmen.map((t) => t.schueler_id));
  const verfuegbar = (alleRes.data ?? [])
    .filter((s) => !eingeschrieben.has(s.id) && !s.ausbildung_beendet)
    .map((s) => ({ id: s.id, label: `${s.vorname} ${s.nachname}` }));
  const stunden = stundenRes.data ?? [];
  const gehalten = stunden.filter((s) => s.datum < heute);
  const naechste = stunden.find((s) => s.datum >= heute);
  const grundstoff = Math.min(gehalten.length, THEORIE_GRUNDSTOFF);
  const status = KURS_STATUS[kurs.status] ?? KURS_STATUS.geplant;

  return (
    <div>
      <DetailKopf
        zurueck={{ href: "/kurse", label: "Kurse" }}
        titel={kurs.name}
        kurztitel={kurs.name}
        status={<Badge variant={STATUS_BADGE[kurs.status] ?? "secondary"}>{status.label}</Badge>}
        meta={[
          kurs.klasse ? `Klasse ${kurs.klasse}` : "Theoriekurs",
          kurs.start_datum ? `Start ${formatDatum(kurs.start_datum)}` : null,
          `${teilnahmen.length} Teilnehmer`,
        ]}
        aktionen={
          <>
            <form action={kursStatusSetzen} className="inline-flex rounded-lg bg-card p-0.5 shadow-panel" role="group" aria-label="Status">
              <input type="hidden" name="id" value={kurs.id} />
              {(["geplant", "laufend", "beendet"] as const).map((s) => {
                const aktiv = kurs.status === s;
                return (
                  <button
                    key={s}
                    type="submit"
                    name="status"
                    value={s}
                    aria-pressed={aktiv}
                    disabled={aktiv}
                    className={cn(
                      "h-7 rounded-[5px] px-2.5 text-13 font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/70",
                      aktiv ? "bg-primary-soft text-primary-text" : "text-foreground-secondary hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {KURS_STATUS[s].label}
                  </button>
                );
              })}
            </form>
            <LoeschenDialog
              action={kursLoeschen}
              id={kurs.id}
              titel="Kurs löschen?"
              beschreibung="Der Kurs und die Teilnehmer-Zuordnungen werden entfernt. Theoriestunden bleiben erhalten."
              buttonLabel=""
            />
          </>
        }
      />

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <KpiRow cols={3}>
            <KpiCard label="Teilnehmer" value={teilnahmen.length} sub={verfuegbar.length ? `${verfuegbar.length} Schüler noch nicht im Kurs` : "Alle Schüler eingetragen"} />
            <KpiCard label="Grundstoff" value={`${grundstoff} / ${THEORIE_GRUNDSTOFF}`} sub={`${Math.round((grundstoff / THEORIE_GRUNDSTOFF) * 100)} % gehalten`} />
            <KpiCard
              label="Nächste Stunde"
              value={naechste ? (naechste.datum === heute ? "Heute" : formatDatum(naechste.datum)) : "—"}
              sub={naechste ? `${formatUhrzeit(naechste.uhrzeit)} Uhr${naechste.thema ? ` · ${naechste.thema}` : ""}` : "Keine geplant"}
            />
          </KpiRow>

          <Karte
            titel="Teilnehmer"
            meta={teilnahmen.length ? String(teilnahmen.length) : undefined}
            aktion={verfuegbar.length > 0 ? <TeilnehmerHinzufuegen kursId={kurs.id} schueler={verfuegbar} /> : undefined}
          >
            {teilnahmen.length === 0 ? (
              <KarteLeer>Noch keine Teilnehmer – oben rechts Schüler hinzufügen.</KarteLeer>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {teilnahmen.map((t) => (
                  <li key={t.id} className="group flex items-center gap-3 px-5 py-2.5">
                    <SchuelerAvatar vorname={t.fahrschueler?.vorname} nachname={t.fahrschueler?.nachname} className="h-7 w-7 text-[11px]" />
                    <Link href={`/schueler/${t.schueler_id}`} className="min-w-0 flex-1 truncate text-13 font-medium text-foreground hover:underline">
                      {t.fahrschueler?.vorname} {t.fahrschueler?.nachname}
                    </Link>
                    <form action={teilnehmerEntfernen}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="kurs_id" value={kurs.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`${t.fahrschueler?.vorname ?? "Schüler"} aus dem Kurs entfernen`}
                        title="Aus dem Kurs entfernen"
                        className="text-foreground-tertiary opacity-0 transition-opacity hover:text-destructive-text focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <UserMinus />
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Karte>

          <Karte titel="Theorie-Einheiten" meta={stunden.length ? String(stunden.length) : undefined} aktion={<KartenLink href="/theorie">Theorie planen</KartenLink>}>
            {stunden.length === 0 ? (
              <KarteLeer>Noch keine Theoriestunde mit diesem Kurs verknüpft.</KarteLeer>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {stunden.map((s) => {
                  const vorbei = s.datum < heute;
                  return (
                    <li key={s.id}>
                      <Link href={`/theorie/${s.id}`} className="flex items-center gap-4 px-5 py-2.5 transition-colors hover:bg-surface-muted/60">
                        <span className="w-[112px] shrink-0 text-13 tabular-nums">
                          <span className={cn("block font-medium", vorbei ? "text-foreground-secondary" : "text-foreground")}>
                            {s.datum === heute ? "Heute" : `${wochentagKurz(s.datum)}, ${formatDatum(s.datum).slice(0, 6)}`}
                          </span>
                          <span className="block text-xs text-foreground-tertiary">{formatUhrzeit(s.uhrzeit)} Uhr</span>
                        </span>
                        <span className={cn("min-w-0 flex-1 truncate text-13", vorbei ? "text-foreground-secondary" : "font-medium text-foreground")}>
                          {s.thema || "Theoriestunde"}
                        </span>
                        <span className="shrink-0 text-13 tabular-nums text-foreground-secondary">
                          {vorbei ? `${s.teilnahme?.[0]?.count ?? 0} anwesend` : "geplant"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Karte>
        </div>

        <aside className="min-w-0 space-y-8">
          <section>
            <h2 className="mb-2 text-13 font-semibold text-foreground">Details</h2>
            <Eigenschaften breite="schmal">
              <Eigenschaft label="Status">{status.label}</Eigenschaft>
              <Eigenschaft label="Klasse">{kurs.klasse}</Eigenschaft>
              <Eigenschaft label="Start">{kurs.start_datum ? formatDatum(kurs.start_datum) : null}</Eigenschaft>
              <Eigenschaft label="Angelegt">{formatDatum(kurs.created_at)}</Eigenschaft>
            </Eigenschaften>
          </section>
          {kurs.beschreibung && (
            <section className="border-t border-border pt-6">
              <h2 className="mb-2 text-13 font-semibold text-foreground">Beschreibung</h2>
              <p className="whitespace-pre-wrap text-13 text-foreground-secondary">{kurs.beschreibung}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
