import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, Car, Pencil } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eigenschaft, Eigenschaften } from "@/components/ui/eigenschaften";
import { Karte, KarteLeer, KartenLink } from "@/components/ui/karte";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { DetailKopf } from "@/components/shared/detail-kopf";
import { Kennzeichen } from "@/components/shared/kennzeichen";
import { LoeschenDialog } from "@/components/shared/loeschen-dialog";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { FAHRSTUNDE_FARBE, FAHRSTUNDE_TYPEN, getriebeLabel } from "@/lib/constants";
import { fahrzeugKlassen, fahrzeugName, frist, fristText, naechsteHu, type FristTon } from "@/lib/fahrzeug";
import { cn, formatDatum, formatUhrzeit } from "@/lib/utils";
import { heuteBerlin, plusTage, stunden, wochenbeginn, wochentagKurz } from "@/lib/zeit";
import type { Fahrzeug, FahrstundeStatus, FahrstundeTyp } from "@/lib/types";
import { fahrzeugAktivSetzen, fahrzeugLoeschen } from "../actions";
import { fahrlehrerOptionen } from "../daten";

export const metadata = { title: "Fahrzeug · FahrschulApp" };

type Termin = {
  id: string;
  datum: string;
  uhrzeit: string;
  dauer_minuten: number | null;
  typ: FahrstundeTyp;
  status: FahrstundeStatus;
  fahrschueler: { id: string; vorname: string; nachname: string } | null;
  fahrlehrer: { id: string; vorname: string; nachname: string } | null;
};

const FRIST_BADGE: Record<FristTon, "destructive" | "warning" | "secondary"> = {
  ueberfaellig: "destructive",
  bald: "warning",
  ok: "secondary",
};

export default async function FahrzeugDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("fahrzeug").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const f = data as Fahrzeug;

  const heute = heuteBerlin();
  const montag = wochenbeginn(heute);
  const sonntag = plusTage(montag, 6);
  const monat = heute.slice(0, 7);
  const ab = montag < `${monat}-01` ? montag : `${monat}-01`;

  const [lehrer, termineRes] = await Promise.all([
    fahrlehrerOptionen(),
    supabase
      .from("fahrstunde")
      .select("id, datum, uhrzeit, dauer_minuten, typ, status, fahrschueler(id, vorname, nachname), fahrlehrer(id, vorname, nachname)")
      .eq("fahrzeug_id", f.id)
      .gte("datum", ab)
      .order("datum", { ascending: true })
      .order("uhrzeit", { ascending: true })
      .returns<Termin[]>(),
  ]);

  const name = fahrzeugName(f);
  const klassen = fahrzeugKlassen(f);
  const zugeordnet = lehrer.filter((l) => (f.fahrlehrer_ids ?? []).includes(l.id));

  const termine = (termineRes.data ?? []).filter((t) => t.status !== "ausgefallen");
  const minuten = (liste: Termin[]) => liste.reduce((s, t) => s + (t.dauer_minuten ?? 0), 0);
  const woche = termine.filter((t) => t.datum >= montag && t.datum <= sonntag);
  const imMonat = termine.filter((t) => t.datum.startsWith(monat));
  const kommende = termine.filter((t) => t.datum >= heute && t.status === "geplant").slice(0, 8);
  const monatName = new Date(`${heute}T12:00:00Z`).toLocaleDateString("de-DE", { month: "long", timeZone: "UTC" });

  const hu = naechsteHu(f);
  const huFrist = frist(hu, heute, 60);
  const fristen = [
    { label: "Hauptuntersuchung", datum: hu, frist: huFrist },
    { label: "Wartung", datum: f.naechste_wartung, frist: frist(f.naechste_wartung, heute, 30) },
  ];
  const saison =
    f.saison_von || f.saison_bis
      ? `${f.saison_von ? formatDatum(f.saison_von) : "offen"} – ${f.saison_bis ? formatDatum(f.saison_bis) : "offen"}`
      : null;

  return (
    <div>
      <DetailKopf
        zurueck={{ href: "/fahrzeuge", label: "Fahrzeuge" }}
        bild={
          <span
            aria-hidden="true"
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              f.aktiv ? "bg-primary-soft text-primary-text" : "bg-muted text-foreground-tertiary",
            )}
          >
            <Car className="h-5 w-5" strokeWidth={1.75} />
          </span>
        }
        titel={name}
        kurztitel={f.kennzeichen}
        status={f.aktiv ? <Badge>Im Einsatz</Badge> : <Badge variant="secondary">Archiviert</Badge>}
        meta={[
          f.kennzeichen,
          getriebeLabel(f.getriebeart),
          klassen.length ? `Klasse ${klassen.join(", ")}` : null,
          f.nummer != null ? `Fahrzeug-Nr. ${f.nummer}` : null,
        ]}
        aktionen={
          <>
            <form action={fahrzeugAktivSetzen}>
              <input type="hidden" name="id" value={f.id} />
              <input type="hidden" name="aktiv" value={String(!f.aktiv)} />
              <Button type="submit" variant="outline" size="sm">
                {f.aktiv ? <Archive /> : <ArchiveRestore />}
                {f.aktiv ? "Archivieren" : "Wieder in Einsatz nehmen"}
              </Button>
            </form>
            <LoeschenDialog
              action={fahrzeugLoeschen}
              id={f.id}
              titel="Fahrzeug löschen?"
              beschreibung={`${name} (${f.kennzeichen}) wird gelöscht. Eingetragene Fahrstunden bleiben erhalten, nur ohne Fahrzeug.`}
              buttonLabel=""
            />
            <Button asChild size="sm">
              <Link href={`/fahrzeuge/${f.id}/bearbeiten`}>
                <Pencil /> Bearbeiten
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <KpiRow cols={3}>
            <KpiCard label="Diese Woche" value={woche.length} sub={`${stunden(minuten(woche))} eingeplant`} />
            <KpiCard label={`Im ${monatName}`} value={imMonat.length} sub={stunden(minuten(imMonat))} />
            <KpiCard
              label="Nächste HU"
              value={hu ? formatDatum(hu) : "—"}
              sub={huFrist ? fristText(huFrist.tage) : "Kein Termin eingetragen"}
              tone={huFrist?.ton === "ueberfaellig" ? "destructive" : huFrist?.ton === "bald" ? "warning" : "neutral"}
            />
          </KpiRow>

          <Karte titel="Nächste Termine" meta={kommende.length ? String(kommende.length) : undefined} aktion={<KartenLink href="/kalender">Zum Kalender</KartenLink>}>
            {kommende.length === 0 ? (
              <KarteLeer>Keine geplanten Fahrstunden mit diesem Fahrzeug.</KarteLeer>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {kommende.map((t) => (
                  <li key={t.id} className="flex items-center gap-4 px-5 py-2.5">
                    <span className="w-[76px] shrink-0 text-13 tabular-nums">
                      <span className="block font-medium text-foreground">
                        {t.datum === heute ? "Heute" : `${wochentagKurz(t.datum)}, ${formatDatum(t.datum).slice(0, 6)}`}
                      </span>
                      <span className="block text-xs text-foreground-secondary">{formatUhrzeit(t.uhrzeit)} Uhr</span>
                    </span>
                    <span aria-hidden="true" className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: FAHRSTUNDE_FARBE[t.typ] }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-13 font-medium text-foreground">
                        {t.fahrschueler ? (
                          <Link href={`/schueler/${t.fahrschueler.id}`} className="hover:underline">
                            {t.fahrschueler.vorname} {t.fahrschueler.nachname}
                          </Link>
                        ) : (
                          FAHRSTUNDE_TYPEN[t.typ]?.label
                        )}
                      </span>
                      <span className="block truncate text-xs text-foreground-secondary">
                        {FAHRSTUNDE_TYPEN[t.typ]?.kurz}
                        {t.dauer_minuten ? ` · ${t.dauer_minuten} Min.` : ""}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-13 text-foreground-secondary sm:block">
                      {t.fahrlehrer ? `${t.fahrlehrer.vorname} ${t.fahrlehrer.nachname}` : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Karte>

          <Karte titel="Fristen">
            <ul className="divide-y divide-border border-t border-border">
              {fristen.map((x) => (
                <li key={x.label} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="text-13 font-medium text-foreground">{x.label}</span>
                  <span className="flex items-center gap-2.5 text-13 tabular-nums">
                    {x.datum ? (
                      <>
                        <span className="text-foreground">{formatDatum(x.datum)}</span>
                        {x.frist && <Badge variant={FRIST_BADGE[x.frist.ton]}>{fristText(x.frist.tage)}</Badge>}
                      </>
                    ) : (
                      <span className="text-foreground-tertiary">Nicht eingetragen</span>
                    )}
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="text-13 font-medium text-foreground">Saisonpause</span>
                <span className={cn("text-13 tabular-nums", saison ? "text-foreground" : "text-foreground-tertiary")}>
                  {saison ?? "Keine"}
                </span>
              </li>
            </ul>
          </Karte>
        </div>

        <aside className="min-w-0 space-y-8">
          <section>
            <h2 className="mb-2 text-13 font-semibold text-foreground">Details</h2>
            <Eigenschaften breite="schmal">
              <Eigenschaft label="Kennzeichen">
                <Kennzeichen>{f.kennzeichen}</Kennzeichen>
              </Eigenschaft>
              <Eigenschaft label="Getriebe">{getriebeLabel(f.getriebeart)}</Eigenschaft>
              <Eigenschaft label="Klassen">{klassen.join(", ")}</Eigenschaft>
              <Eigenschaft label="Anhänger">{f.anhaenger ? "Ja" : "Nein"}</Eigenschaft>
              <Eigenschaft label="Ident-Nr.">{f.fahrzeug_id_nr}</Eigenschaft>
              <Eigenschaft label="Versicherung">{f.versicherung}</Eigenschaft>
              <Eigenschaft label="Kilometer">{f.km_stand != null ? `${f.km_stand.toLocaleString("de-DE")} km` : null}</Eigenschaft>
            </Eigenschaften>
          </section>

          <section className="border-t border-border pt-6">
            <h2 className="mb-2 text-13 font-semibold text-foreground">Fahrlehrer</h2>
            {zugeordnet.length === 0 ? (
              <p className="text-13 text-foreground-secondary">Noch niemand zugeordnet.</p>
            ) : (
              <ul className="space-y-2">
                {zugeordnet.map((l) => {
                  const [vorname, ...rest] = l.name.split(" ");
                  return (
                    <li key={l.id}>
                      <Link href={`/fahrlehrer?id=${l.id}`} className="flex items-center gap-2.5 text-13 text-foreground hover:underline">
                        <SchuelerAvatar vorname={vorname} nachname={rest.join(" ")} className="h-6 w-6 text-2xs" />
                        {l.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
