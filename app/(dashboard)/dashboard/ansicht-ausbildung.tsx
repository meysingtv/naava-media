import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardCheck, FileWarning, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { pflichtFahrtenFuer } from "@/lib/constants";
import { formatDatum, formatUhrzeit, initialen } from "@/lib/utils";
import type { FahrlehrerRolle } from "@/lib/types";
import { AKZENT, Balken, DatumKachel, Karte, KarteLeer, KartenLink, Kennzahl, KennzahlReihe, Ring } from "./widgets";
import { plusTage, wochentagKurz } from "./zeit";

type SchuelerRow = {
  id: string;
  vorname: string;
  nachname: string;
  theorie_bestanden: boolean;
  theorie_termin: string | null;
  pruefung_termin: string | null;
  sehtest_am: string | null;
  erste_hilfe_am: string | null;
  passbild_ok: boolean;
  anmeldedatum: string;
  fuehrerscheinklassen: string[] | null;
};
type StundeRow = { schueler_id: string | null; typ: string; status: string; fahrlehrer_id: string | null };
type PruefRow = {
  id: string;
  datum: string;
  uhrzeit: string | null;
  art: string;
  pruefstelle: string | null;
  versuch: number | null;
  schueler_id: string | null;
  fahrschueler: { id: string; vorname: string; nachname: string; theorie_bestanden: boolean } | null;
};
type TheorieRow = { id: string; datum: string; uhrzeit: string; thema: string | null; max_teilnehmer: number | null; kurs_id: string | null };
type KursRow = { id: string; name: string; start_datum: string | null; status: string };

type Stufe = "theorie" | "praxis" | "reif" | "termin";

/** Die vier Abschnitte des Ausbildungswegs – Farbe, Name, kurze Erklärung. */
const STUFEN: { key: Stufe; label: string; hinweis: string; farbe: string }[] = [
  { key: "theorie", label: "Theorie", hinweis: "Theorieprüfung noch offen", farbe: AKZENT.orange },
  { key: "praxis", label: "Praxis", hinweis: "Sonderfahrten laufen", farbe: AKZENT.blau },
  { key: "reif", label: "Prüfungsreif", hinweis: "Bereit zur Anmeldung", farbe: AKZENT.smaragd },
  { key: "termin", label: "Prüfung geplant", hinweis: "Termin steht fest", farbe: AKZENT.violett },
];

export async function AnsichtAusbildung({
  rolle,
  meId,
  heute,
}: {
  rolle: FahrlehrerRolle;
  meId: string | null;
  heute: string;
}) {
  const supabase = createClient();
  const nurMeine = rolle === "fahrlehrer" && meId != null;
  const pruefungenSichtbar = rolle !== "buero";

  const [schuelerRes, stundenRes, pruefRes, theorieRes, kursRes, kursTeilRes] = await Promise.all([
    supabase
      .from("fahrschueler")
      .select(
        "id, vorname, nachname, theorie_bestanden, theorie_termin, pruefung_termin, sehtest_am, erste_hilfe_am, passbild_ok, anmeldedatum, fuehrerscheinklassen",
      )
      .eq("ausbildung_beendet", false)
      .order("nachname", { ascending: true })
      .returns<SchuelerRow[]>(),
    supabase.from("fahrstunde").select("schueler_id, typ, status, fahrlehrer_id").returns<StundeRow[]>(),
    supabase
      .from("pruefung")
      .select("id, datum, uhrzeit, art, pruefstelle, versuch, schueler_id, fahrschueler(id, vorname, nachname, theorie_bestanden)")
      .eq("ergebnis", "offen")
      .gte("datum", heute)
      .lte("datum", plusTage(heute, 14))
      .order("datum", { ascending: true })
      .returns<PruefRow[]>(),
    supabase
      .from("theoriestunde")
      .select("id, datum, uhrzeit, thema, max_teilnehmer, kurs_id")
      .order("datum", { ascending: true })
      .order("uhrzeit", { ascending: true })
      .returns<TheorieRow[]>(),
    supabase
      .from("kurs")
      .select("id, name, start_datum, status")
      .in("status", ["laufend", "geplant"])
      .order("start_datum", { ascending: true })
      .returns<KursRow[]>(),
    supabase.from("kurs_teilnahme").select("kurs_id").returns<{ kurs_id: string }[]>(),
  ]);

  const stunden = stundenRes.data ?? [];
  // Fahrlehrer sehen nur Schüler, mit denen sie selbst fahren oder gefahren sind.
  const meine = nurMeine
    ? new Set(stunden.filter((r) => r.fahrlehrer_id === meId && r.schueler_id).map((r) => r.schueler_id as string))
    : null;
  const schueler = (schuelerRes.data ?? []).filter((s) => !meine || meine.has(s.id));
  const ids = new Set(schueler.map((s) => s.id));
  const pruefungen = (pruefRes.data ?? []).filter((p) => !meine || (p.schueler_id != null && ids.has(p.schueler_id)));

  // Sonderfahrten je Schüler (nur gefahrene Stunden zählen)
  const sonder: Record<string, { ueberland: number; autobahn: number; nacht: number }> = {};
  for (const r of stunden) {
    if (!r.schueler_id || r.status !== "abgeschlossen") continue;
    const z = (sonder[r.schueler_id] ??= { ueberland: 0, autobahn: 0, nacht: 0 });
    if (r.typ === "ueberland") z.ueberland += 1;
    if (r.typ === "autobahn") z.autobahn += 1;
    if (r.typ === "nacht") z.nacht += 1;
  }

  const mitStufe = schueler.map((s) => {
    const pflicht = pflichtFahrtenFuer(s.fuehrerscheinklassen?.[0] ?? "B");
    const z = sonder[s.id] ?? { ueberland: 0, autobahn: 0, nacht: 0 };
    const sonderOk = z.ueberland >= pflicht.ueberland && z.autobahn >= pflicht.autobahn && z.nacht >= pflicht.nacht;
    const reif = s.theorie_bestanden && sonderOk;
    const stufe: Stufe =
      s.pruefung_termin && s.pruefung_termin >= heute ? "termin" : reif ? "reif" : s.theorie_bestanden ? "praxis" : "theorie";
    const fehlt = [!s.sehtest_am && "Sehtest", !s.erste_hilfe_am && "Erste Hilfe", !s.passbild_ok && "Passbild"].filter(
      Boolean,
    ) as string[];
    return { ...s, reif, stufe, fehlt };
  });

  const jeStufe = Object.fromEntries(STUFEN.map((st) => [st.key, mitStufe.filter((s) => s.stufe === st.key)])) as Record<
    Stufe,
    typeof mitStufe
  >;
  const reif = mitStufe.filter((s) => s.reif);
  const neu = schueler.filter((s) => s.anmeldedatum >= `${heute.slice(0, 7)}-01`).length;
  const unvollstaendig = mitStufe.filter((s) => s.fehlt.length > 0);
  const fehltZaehler: Record<string, number> = {};
  for (const s of unvollstaendig) for (const f of s.fehlt) fehltZaehler[f] = (fehltZaehler[f] ?? 0) + 1;
  const praxisPruefungen = pruefungen.filter((p) => p.art === "praxis").length;

  // Theorie und Kurse
  const theorie = theorieRes.data ?? [];
  const naechsteTheorie = theorie.find((t) => t.datum >= heute);
  const plaetze = naechsteTheorie?.max_teilnehmer ?? 20;
  const belegt = naechsteTheorie
    ? ((await supabase.from("theorie_teilnahme").select("id", { count: "exact", head: true }).eq("theoriestunde_id", naechsteTheorie.id))
        .count ?? 0)
    : 0;
  const teilnehmer: Record<string, number> = {};
  for (const t of kursTeilRes.data ?? []) teilnehmer[t.kurs_id] = (teilnehmer[t.kurs_id] ?? 0) + 1;
  const kurse = (kursRes.data ?? []).slice(0, 3).map((k) => {
    const lektionen = theorie.filter((t) => t.kurs_id === k.id);
    return { ...k, gesamt: lektionen.length, gehalten: lektionen.filter((t) => t.datum < heute).length, teilnehmer: teilnehmer[k.id] ?? 0 };
  });

  return (
    <div className="space-y-6">
      <KennzahlReihe>
        <Kennzahl
          label={nurMeine ? "Meine Schüler" : "In Ausbildung"}
          wert={schueler.length}
          sub={neu > 0 ? `${neu} neu angemeldet in diesem Monat` : "Keine Neuanmeldung in diesem Monat"}
          icon={Users}
          akzent={AKZENT.blau}
          href="/schueler"
        />
        <Kennzahl
          label="Prüfungsreif"
          wert={reif.length}
          sub={`${reif.filter((s) => s.stufe === "termin").length} davon mit Prüfungstermin`}
          anteil={schueler.length ? reif.length / schueler.length : 0}
          icon={BadgeCheck}
          akzent={AKZENT.smaragd}
        />
        <Kennzahl
          label="Prüfungen in 14 Tagen"
          wert={pruefungen.length}
          sub={pruefungen.length ? `${praxisPruefungen} Praxis · ${pruefungen.length - praxisPruefungen} Theorie` : "Keine angesetzt"}
          icon={ClipboardCheck}
          akzent={AKZENT.violett}
          href={pruefungenSichtbar ? "/pruefungen" : undefined}
        />
        <Kennzahl
          label="Unterlagen unvollständig"
          wert={unvollstaendig.length}
          sub={
            unvollstaendig.length
              ? Object.entries(fehltZaehler)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 2)
                  .map(([f, n]) => `${n}× ${f}`)
                  .join(" · ")
              : "Alle Unterlagen liegen vor"
          }
          ton={unvollstaendig.length > 0 ? "warnung" : undefined}
          icon={FileWarning}
          akzent={AKZENT.orange}
          href="/schueler"
        />
      </KennzahlReihe>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Ausbildungsweg */}
        <Karte
          titel="Ausbildungsweg"
          meta={`${schueler.length} Schüler`}
          aktion={<KartenLink href="/schueler">Alle Schüler</KartenLink>}
          className="xl:col-span-2"
          inhaltClassName="px-5 pb-5"
        >
          {schueler.length === 0 ? (
            <KarteLeer>{nurMeine ? "Du hast noch keine eigenen Schüler." : "Noch keine Schüler in Ausbildung."}</KarteLeer>
          ) : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label="Verteilung der Schüler auf die Abschnitte">
                {STUFEN.map((st) =>
                  jeStufe[st.key].length ? (
                    <span
                      key={st.key}
                      className="h-full border-r-2 border-card last:border-r-0"
                      style={{ width: `${(jeStufe[st.key].length / schueler.length) * 100}%`, background: st.farbe }}
                    />
                  ) : null,
                )}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-6 lg:grid-cols-4">
                {STUFEN.map((st) => {
                  const liste = jeStufe[st.key];
                  return (
                    <div key={st.key} className="min-w-0">
                      <p className="flex items-center gap-2 text-13 font-medium text-foreground-secondary">
                        <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: st.farbe }} aria-hidden="true" />
                        {st.label}
                      </p>
                      <p className="mt-1 text-[28px] font-semibold leading-8 tabular-nums text-foreground">{liste.length}</p>
                      <p className="text-xs text-foreground-tertiary">{st.hinweis}</p>
                      <ul className="mt-3 space-y-1.5">
                        {liste.slice(0, 3).map((s) => (
                          <li key={s.id}>
                            <Link href={`/schueler/${s.id}`} className="group flex min-w-0 items-center gap-2 text-13 text-foreground">
                              <span
                                aria-hidden="true"
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                                style={{ background: `${st.farbe}1F`, color: st.farbe }}
                              >
                                {initialen(s.vorname, s.nachname)}
                              </span>
                              <span className="truncate group-hover:underline">
                                {s.vorname} {s.nachname}
                              </span>
                            </Link>
                          </li>
                        ))}
                        {liste.length > 3 && (
                          <li>
                            <Link href="/schueler" className="text-xs font-medium text-primary-text hover:underline">
                              + {liste.length - 3} weitere
                            </Link>
                          </li>
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Karte>

        {/* Theorie und Kurse */}
        <Karte titel="Theorie und Kurse" aktion={<KartenLink href="/kurse">Alle Kurse</KartenLink>} inhaltClassName="px-5 pb-5">
          {naechsteTheorie ? (
            <div className="flex items-center gap-5 border-b border-border pb-5">
              <Ring wert={belegt} max={plaetze} farbe={AKZENT.orange} label={`${belegt} von ${plaetze} Plätzen belegt`}>
                <span className="text-lg font-semibold tabular-nums leading-6 text-foreground">
                  {belegt}/{plaetze}
                </span>
                <span className="text-[11px] text-foreground-tertiary">Plätze</span>
              </Ring>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground-tertiary">Nächste Theoriestunde</p>
                <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-foreground">{naechsteTheorie.thema ?? "Theorieunterricht"}</p>
                <p className="mt-1 text-13 tabular-nums text-foreground-secondary">
                  {wochentagKurz(naechsteTheorie.datum)}, {formatDatum(naechsteTheorie.datum)} · {formatUhrzeit(naechsteTheorie.uhrzeit)} Uhr
                </p>
                <Link
                  href={`/theorie/${naechsteTheorie.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-13 font-medium text-primary-text hover:underline"
                >
                  Anwesenheit <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <p className="border-b border-border pb-5 text-13 text-foreground-secondary">Keine Theoriestunde geplant.</p>
          )}
          {kurse.length === 0 ? (
            <p className="pt-5 text-13 text-foreground-secondary">Keine laufenden oder geplanten Kurse.</p>
          ) : (
            <ul className="space-y-4 pt-5">
              {kurse.map((k) => (
                <li key={k.id}>
                  <Link href={`/kurse/${k.id}`} className="group block">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-13 font-semibold text-foreground group-hover:underline">{k.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-foreground-secondary">{k.teilnehmer} Teilnehmer</span>
                    </div>
                    <p className="mb-1.5 text-xs text-foreground-tertiary">
                      {k.status === "geplant"
                        ? `Beginnt am ${k.start_datum ? formatDatum(k.start_datum) : "—"}`
                        : `Lektion ${k.gehalten} von ${k.gesamt || "—"}`}
                    </p>
                    <Balken anteil={k.gesamt ? k.gehalten / k.gesamt : 0} farbe={k.status === "geplant" ? "#C9CED6" : AKZENT.orange} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Karte>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Prüfungen */}
        <Karte
          titel="Prüfungen"
          meta="nächste 14 Tage"
          aktion={pruefungenSichtbar ? <KartenLink href="/pruefungen">Alle Prüfungen</KartenLink> : undefined}
          className="xl:col-span-2"
          inhaltClassName="pb-2"
        >
          {pruefungen.length === 0 ? (
            <KarteLeer>In den nächsten 14 Tagen sind keine Prüfungen angesetzt.</KarteLeer>
          ) : (
            <ul className="divide-y divide-border">
              {pruefungen.map((p) => {
                const praxis = p.art === "praxis";
                const theorieFehlt = praxis && p.fahrschueler && !p.fahrschueler.theorie_bestanden;
                return (
                  <li key={p.id}>
                    <Link
                      href={p.fahrschueler ? `/schueler/${p.fahrschueler.id}` : "/pruefungen"}
                      className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface-muted"
                    >
                      <DatumKachel datum={p.datum} farbe={praxis ? AKZENT.rot : AKZENT.orange} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-13 font-semibold text-foreground">
                          {p.fahrschueler ? `${p.fahrschueler.vorname} ${p.fahrschueler.nachname}` : "—"}
                        </span>
                        <span className="block truncate text-xs text-foreground-secondary">
                          {praxis ? "Praktische Prüfung" : "Theorieprüfung"}
                          {p.uhrzeit ? ` · ${formatUhrzeit(p.uhrzeit)} Uhr` : ""}
                          {p.pruefstelle ? ` · ${p.pruefstelle}` : ""}
                          {p.versuch && p.versuch > 1 ? ` · ${p.versuch}. Versuch` : ""}
                        </span>
                      </span>
                      {theorieFehlt ? (
                        <Badge variant="destructive">Theorie fehlt</Badge>
                      ) : (
                        <Badge variant={praxis ? "secondary" : "warning"}>{praxis ? "Praxis" : "Theorie"}</Badge>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Karte>

        {/* Unterlagen */}
        <Karte
          titel="Fehlende Unterlagen"
          meta={unvollstaendig.length ? `${unvollstaendig.length} Schüler` : undefined}
          aktion={<KartenLink href="/schueler">Schüler</KartenLink>}
          inhaltClassName="pb-2"
        >
          {unvollstaendig.length === 0 ? (
            <KarteLeer>Bei allen Schülern liegen die Unterlagen vor.</KarteLeer>
          ) : (
            <ul className="divide-y divide-border">
              {unvollstaendig.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <Link href={`/schueler/${s.id}`} className="group flex items-start gap-3 px-5 py-3 transition-colors hover:bg-surface-muted">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground-secondary"
                    >
                      {initialen(s.vorname, s.nachname)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-13 font-semibold text-foreground">
                        {s.vorname} {s.nachname}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {s.fehlt.map((f) => (
                          <Badge key={f} variant="warning">
                            {f}
                          </Badge>
                        ))}
                      </span>
                    </span>
                    <ArrowRight
                      className="mt-2 h-4 w-4 shrink-0 text-foreground-tertiary transition-transform group-hover:translate-x-0.5"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Karte>
      </div>
    </div>
  );
}
