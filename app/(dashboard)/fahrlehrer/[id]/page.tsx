import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eigenschaft, Eigenschaften } from "@/components/ui/eigenschaften";
import { Karte, KarteLeer, KartenLink } from "@/components/ui/karte";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { DetailKopf } from "@/components/shared/detail-kopf";
import { Kennzeichen } from "@/components/shared/kennzeichen";
import { LoeschenDialog } from "@/components/shared/loeschen-dialog";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { FAHRSTUNDE_FARBE, FAHRSTUNDE_TYPEN, ROLLEN } from "@/lib/constants";
import { formatDatum, formatUhrzeit, initialen } from "@/lib/utils";
import { heuteBerlin, plusTage, stunden, wochenbeginn, wochentagKurz } from "@/lib/zeit";
import type { Fahrlehrer, Fahrzeug, FahrstundeStatus, FahrstundeTyp } from "@/lib/types";
import { fahrlehrerAktivSetzen, fahrlehrerLoeschen } from "../actions";

export const metadata = { title: "Mitarbeiter · FahrschulApp" };

type Termin = {
  id: string;
  datum: string;
  uhrzeit: string;
  dauer_minuten: number | null;
  typ: FahrstundeTyp;
  status: FahrstundeStatus;
  fahrschueler: { id: string; vorname: string; nachname: string } | null;
  fahrzeug: { id: string; kennzeichen: string } | null;
};

export default async function MitarbeiterPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const kontext = await getKontext();

  const { data } = await supabase.from("fahrlehrer").select("*").eq("id", params.id).maybeSingle();
  if (!data) notFound();
  const b = data as Fahrlehrer;

  const heute = heuteBerlin();
  const montag = wochenbeginn(heute);
  const sonntag = plusTage(montag, 6);

  const [rolleRes, termineRes, fahrzeugRes] = await Promise.all([
    b.benutzerrolle_id
      ? supabase.from("benutzerrolle").select("name").eq("id", b.benutzerrolle_id).maybeSingle<{ name: string }>()
      : Promise.resolve({ data: null }),
    supabase
      .from("fahrstunde")
      .select("id, datum, uhrzeit, dauer_minuten, typ, status, fahrschueler(id, vorname, nachname), fahrzeug(id, kennzeichen)")
      .eq("fahrlehrer_id", b.id)
      .gte("datum", plusTage(heute, -60))
      .order("datum", { ascending: true })
      .order("uhrzeit", { ascending: true })
      .returns<Termin[]>(),
    supabase
      .from("fahrzeug")
      .select("id, name, kennzeichen, aktiv")
      .contains("fahrlehrer_ids", [b.id])
      .returns<Pick<Fahrzeug, "id" | "name" | "kennzeichen" | "aktiv">[]>(),
  ]);

  const name = `${b.vorname} ${b.nachname}`;
  const rolle = rolleRes.data?.name ?? ROLLEN[b.rolle];
  const selbst = Boolean(b.user_id && b.user_id === kontext?.userId);
  const kuerzel = b.kuerzel?.trim() || initialen(b.vorname, b.nachname);

  const termine = (termineRes.data ?? []).filter((t) => t.status !== "ausgefallen");
  const minuten = (liste: Termin[]) => liste.reduce((s, t) => s + (t.dauer_minuten ?? 45), 0);
  const heuteListe = termine.filter((t) => t.datum === heute);
  const woche = termine.filter((t) => t.datum >= montag && t.datum <= sonntag);
  const kommende = termine.filter((t) => t.datum >= heute && t.status === "geplant").slice(0, 8);

  // Schüler der letzten 60 Tage – mit Anzahl Fahrstunden und letztem Termin
  const schuelerMap = new Map<string, { id: string; name: string; anzahl: number; zuletzt: string }>();
  for (const t of termine) {
    if (!t.fahrschueler || t.datum > heute) continue;
    const e = schuelerMap.get(t.fahrschueler.id) ?? {
      id: t.fahrschueler.id,
      name: `${t.fahrschueler.vorname} ${t.fahrschueler.nachname}`,
      anzahl: 0,
      zuletzt: t.datum,
    };
    e.anzahl += 1;
    if (t.datum > e.zuletzt) e.zuletzt = t.datum;
    schuelerMap.set(t.fahrschueler.id, e);
  }
  const schueler = Array.from(schuelerMap.values()).sort((a, c) => c.zuletzt.localeCompare(a.zuletzt));
  const fahrzeuge = (fahrzeugRes.data ?? []).filter((f) => f.aktiv);

  return (
    <div>
      <DetailKopf
        zurueck={{ href: "/fahrlehrer", label: "Team" }}
        bild={<SchuelerAvatar vorname={b.vorname} nachname={b.nachname} className="h-11 w-11 text-sm" />}
        titel={name}
        kurztitel={name}
        status={
          <>
            {selbst && <Badge variant="secondary">Du</Badge>}
            {!b.aktiv && <Badge variant="secondary">Archiviert</Badge>}
          </>
        }
        meta={[rolle, b.fuehrerscheinklassen?.length ? `Klasse ${b.fuehrerscheinklassen.join(", ")}` : null, `Kürzel ${kuerzel}`]}
        aktionen={
          <>
            {!selbst && (
              <>
                <form action={fahrlehrerAktivSetzen}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="aktiv" value={String(!b.aktiv)} />
                  <Button type="submit" variant="outline" size="sm">
                    {b.aktiv ? <Archive /> : <ArchiveRestore />}
                    {b.aktiv ? "Archivieren" : "Wieder aktivieren"}
                  </Button>
                </form>
                <LoeschenDialog
                  action={fahrlehrerLoeschen}
                  id={b.id}
                  titel="Mitarbeiter löschen?"
                  beschreibung={`${name} wird aus dem Team entfernt. Eingetragene Fahrstunden bleiben erhalten, nur ohne Fahrlehrer. Archivieren behält alles.`}
                  buttonLabel=""
                />
              </>
            )}
            <Button asChild size="sm">
              <Link href={`/fahrlehrer/${b.id}/bearbeiten`}>
                <Pencil /> Bearbeiten
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <KpiRow cols={3}>
            <KpiCard
              label="Heute"
              value={heuteListe.length ? `${heuteListe.length} ${heuteListe.length === 1 ? "Termin" : "Termine"}` : "Frei"}
              sub={heuteListe.length ? stunden(minuten(heuteListe)) : "Keine Fahrstunden eingetragen"}
            />
            <KpiCard label="Diese Woche" value={stunden(minuten(woche))} sub={`${woche.length} Termine`} />
            <KpiCard label="Schüler" value={schueler.length} sub="in den letzten 60 Tagen" />
          </KpiRow>

          <Karte titel="Nächste Termine" meta={kommende.length ? String(kommende.length) : undefined} aktion={<KartenLink href="/kalender">Zum Kalender</KartenLink>}>
            {kommende.length === 0 ? (
              <KarteLeer>Keine geplanten Termine.</KarteLeer>
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
                    {t.fahrzeug && (
                      <Link href={`/fahrzeuge/${t.fahrzeug.id}`} className="hidden shrink-0 sm:block">
                        <Kennzeichen>{t.fahrzeug.kennzeichen}</Kennzeichen>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Karte>

          <Karte titel="Schüler" meta={schueler.length ? `${schueler.length} · letzte 60 Tage` : undefined}>
            {schueler.length === 0 ? (
              <KarteLeer>In den letzten 60 Tagen keine Fahrstunden.</KarteLeer>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {schueler.slice(0, 10).map((s) => {
                  const [vorname, ...rest] = s.name.split(" ");
                  return (
                    <li key={s.id}>
                      <Link href={`/schueler/${s.id}`} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-muted/60">
                        <SchuelerAvatar vorname={vorname} nachname={rest.join(" ")} className="h-7 w-7 text-[11px]" />
                        <span className="min-w-0 flex-1 truncate text-13 font-medium text-foreground">{s.name}</span>
                        <span className="shrink-0 text-13 tabular-nums text-foreground-secondary">
                          {s.anzahl} {s.anzahl === 1 ? "Fahrstunde" : "Fahrstunden"}
                        </span>
                        <span className="hidden w-[92px] shrink-0 text-right text-13 tabular-nums text-foreground-tertiary sm:block">
                          {formatDatum(s.zuletzt)}
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
            <h2 className="mb-2 text-13 font-semibold text-foreground">Kontakt</h2>
            <Eigenschaften breite="schmal">
              <Eigenschaft label="E-Mail">
                {b.email && (
                  <a href={`mailto:${b.email}`} className="break-all hover:underline">
                    {b.email}
                  </a>
                )}
              </Eigenschaft>
              <Eigenschaft label="Mobil">
                {b.telefon && (
                  <a href={`tel:${b.telefon.replace(/\s/g, "")}`} className="tabular-nums hover:underline">
                    {b.telefon}
                  </a>
                )}
              </Eigenschaft>
              <Eigenschaft label="Privat">
                {b.telefon_privat && (
                  <a href={`tel:${b.telefon_privat.replace(/\s/g, "")}`} className="tabular-nums hover:underline">
                    {b.telefon_privat}
                  </a>
                )}
              </Eigenschaft>
              <Eigenschaft label="Adresse">
                {(b.strasse || b.ort) && (
                  <span className="whitespace-pre-line">
                    {[b.strasse, [b.plz, b.ort].filter(Boolean).join(" ")].filter(Boolean).join("\n")}
                  </span>
                )}
              </Eigenschaft>
            </Eigenschaften>
          </section>

          <section className="border-t border-border pt-6">
            <h2 className="mb-2 text-13 font-semibold text-foreground">Person</h2>
            <Eigenschaften breite="schmal">
              <Eigenschaft label="Rolle">{rolle}</Eigenschaft>
              <Eigenschaft label="Kürzel">{kuerzel}</Eigenschaft>
              <Eigenschaft label="Geboren">
                {b.geburtsdatum ? `${formatDatum(b.geburtsdatum)}${b.geburtsort ? ` in ${b.geburtsort}` : ""}` : null}
              </Eigenschaft>
              <Eigenschaft label="Zugang">{b.user_id ? "Login aktiv" : "Kein Login"}</Eigenschaft>
            </Eigenschaften>
          </section>

          <section className="border-t border-border pt-6">
            <h2 className="mb-2 text-13 font-semibold text-foreground">Fahrzeuge</h2>
            {fahrzeuge.length === 0 ? (
              <p className="text-13 text-foreground-secondary">Keinem Fahrzeug zugeordnet.</p>
            ) : (
              <ul className="space-y-2">
                {fahrzeuge.map((f) => (
                  <li key={f.id}>
                    <Link href={`/fahrzeuge/${f.id}`} className="flex items-center justify-between gap-3 text-13 text-foreground hover:underline">
                      <span className="truncate">{f.name || f.kennzeichen}</span>
                      <Kennzeichen>{f.kennzeichen}</Kennzeichen>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {b.notiz && (
            <section className="border-t border-border pt-6">
              <h2 className="mb-2 text-13 font-semibold text-foreground">Notiz</h2>
              <p className="whitespace-pre-wrap text-13 text-foreground-secondary">{b.notiz}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
