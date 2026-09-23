import Link from "next/link";
import { BellRing, CalendarDays, CheckSquare, Gauge, Phone, Timer, UserRound } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eigenschaft, Eigenschaften } from "@/components/ui/eigenschaften";
import { FAHRSTUNDE_FARBE, FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { cn, formatDatum, formatUhrzeit, initialen } from "@/lib/utils";
import type { Aufgabe, FahrlehrerRolle, FahrstundeStatus, FahrstundeTyp } from "@/lib/types";
import { AufgabeStatus } from "./aufgabe-status";
import { AKZENT, Balken, Karte, KarteLeer, KartenLink, Kennzahl, KennzahlReihe, MiniKalender } from "./widgets";
import { alsUhrzeit, dauerText, minutenVon, plusTage, stunden, wochenbeginn, wochentagKurz } from "./zeit";

/** Farben für Personen – dieselbe Familie wie die Fahrstunden-Arten. */
const PERSONEN_FARBEN = [AKZENT.blau, AKZENT.smaragd, AKZENT.violett, AKZENT.orange, AKZENT.rot, AKZENT.nacht];
/** Bezugsgröße für die Auslastung: acht Fahrstunden-Stunden je Fahrlehrer und Tag. */
const ARBEITSTAG_MIN = 8 * 60;

type TerminRow = {
  id: string;
  datum: string;
  uhrzeit: string;
  dauer_minuten: number | null;
  typ: FahrstundeTyp;
  status: FahrstundeStatus;
  bestaetigt_am: string | null;
  abgesagt_am: string | null;
  fahrschueler: { id: string; vorname: string; nachname: string; telefon: string | null } | null;
  fahrlehrer: { id: string; vorname: string; nachname: string } | null;
  fahrzeug: { id: string; kennzeichen: string } | null;
};
type AufgabeRow = Aufgabe & { fahrschueler: { vorname: string; nachname: string } | null };
type LehrerRow = { id: string; vorname: string; nachname: string; rolle: string };
type WocheRow = { datum: string; dauer_minuten: number | null };

const SEL_TERMIN =
  "id, datum, uhrzeit, dauer_minuten, typ, status, bestaetigt_am, abgesagt_am, fahrschueler(id, vorname, nachname, telefon), fahrlehrer(id, vorname, nachname), fahrzeug(id, kennzeichen)";

/** Rote „Jetzt"-Linie im Tagesplan – in derselben Spaltenaufteilung wie die Termine. */
function JetztLinie({ minuten }: { minuten: number }) {
  return (
    <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3 py-1" aria-label={`Jetzt, ${alsUhrzeit(minuten)} Uhr`}>
      <span className="text-right text-[11px] font-semibold tabular-nums text-destructive">{alsUhrzeit(minuten)}</span>
      <span className="flex items-center" aria-hidden="true">
        <span className="-ml-1 h-2 w-2 rounded-full bg-destructive" />
        <span className="h-px flex-1 bg-destructive/50" />
      </span>
    </div>
  );
}

export async function AnsichtHeute({
  rolle,
  meId,
  heute,
  jetztMin,
}: {
  rolle: FahrlehrerRolle;
  meId: string | null;
  heute: string;
  jetztMin: number;
}) {
  const supabase = createClient();
  const nurMeine = rolle === "fahrlehrer" && meId != null;
  const ich = meId ?? "";
  const kalender = rolle !== "buero";
  const woche0 = wochenbeginn(heute);
  const [jahr, monat] = heute.split("-").map(Number);
  const monatsbeginn = `${heute.slice(0, 7)}-01`;
  const monatsende = new Date(Date.UTC(jahr, monat, 0)).toISOString().slice(0, 10);

  const termineQ = supabase.from("fahrstunde").select(SEL_TERMIN).eq("datum", heute);
  const kommendeQ = supabase
    .from("fahrstunde")
    .select("id, bestaetigt_am, abgesagt_am")
    .eq("status", "geplant")
    .gte("datum", heute)
    .lte("datum", plusTage(heute, 3));
  const monatQ = supabase
    .from("fahrstunde")
    .select("datum")
    .neq("status", "ausgefallen")
    .gte("datum", monatsbeginn)
    .lte("datum", monatsende);

  const [termineRes, kommendeRes, aufgabenRes, aufgabenAlleRes, lehrerRes, wocheRes, monatRes, pruefMonatRes] = await Promise.all([
    (nurMeine ? termineQ.eq("fahrlehrer_id", ich) : termineQ).order("uhrzeit", { ascending: true }).returns<TerminRow[]>(),
    (nurMeine ? kommendeQ.eq("fahrlehrer_id", ich) : kommendeQ).returns<
      { id: string; bestaetigt_am: string | null; abgesagt_am: string | null }[]
    >(),
    supabase
      .from("aufgabe")
      .select("*, fahrschueler(vorname, nachname)")
      .eq("status", "offen")
      .order("faellig_am", { ascending: true, nullsFirst: false })
      .limit(6)
      .returns<AufgabeRow[]>(),
    supabase.from("aufgabe").select("id, faellig_am").eq("status", "offen").returns<{ id: string; faellig_am: string | null }[]>(),
    nurMeine
      ? Promise.resolve({ data: [] as LehrerRow[] })
      : supabase
          .from("fahrlehrer")
          .select("id, vorname, nachname, rolle")
          .eq("aktiv", true)
          .neq("rolle", "buero")
          .order("nachname", { ascending: true })
          .returns<LehrerRow[]>(),
    nurMeine
      ? supabase
          .from("fahrstunde")
          .select("datum, dauer_minuten")
          .eq("fahrlehrer_id", ich)
          .neq("status", "ausgefallen")
          .gte("datum", woche0)
          .lte("datum", plusTage(woche0, 6))
          .returns<WocheRow[]>()
      : Promise.resolve({ data: [] as WocheRow[] }),
    (nurMeine ? monatQ.eq("fahrlehrer_id", ich) : monatQ).returns<{ datum: string }[]>(),
    supabase.from("pruefung").select("datum").gte("datum", monatsbeginn).lte("datum", monatsende).returns<{ datum: string }[]>(),
  ]);

  const termine = termineRes.data ?? [];
  const kommende = kommendeRes.data ?? [];
  const aufgaben = aufgabenRes.data ?? [];
  const aufgabenAlle = aufgabenAlleRes.data ?? [];
  const lehrer = lehrerRes.data ?? [];

  // ---------------------------------------------------------------- Tagesplan
  const aktive = termine.filter((t) => t.status !== "ausgefallen");
  const ende = (t: TerminRow) => minutenVon(t.uhrzeit) + (t.dauer_minuten ?? 45);
  const gefahren = aktive.filter((t) => t.status === "abgeschlossen" || ende(t) <= jetztMin);
  const laufend = aktive.find((t) => minutenVon(t.uhrzeit) <= jetztMin && ende(t) > jetztMin);
  const naechster = aktive.find((t) => minutenVon(t.uhrzeit) > jetztMin);
  const fokus = laufend ?? naechster;
  const fahrMinuten = aktive.reduce((s, t) => s + (t.dauer_minuten ?? 0), 0);
  const indexJetzt = termine.findIndex((t) => ende(t) > jetztMin);

  // ---------------------------------------------------------------- Kennzahlen
  const unbestaetigt = kommende.filter((t) => !t.bestaetigt_am && !t.abgesagt_am).length;
  const aufgabenUeberfaellig = aufgabenAlle.filter((a) => a.faellig_am && a.faellig_am < heute).length;
  const aufgabenHeute = aufgabenAlle.filter((a) => a.faellig_am === heute).length;
  const kapazitaet = lehrer.length * ARBEITSTAG_MIN;
  const auslastung = kapazitaet > 0 ? fahrMinuten / kapazitaet : 0;

  // ---------------------------------------------------------------- Team / Woche
  const team = lehrer
    .map((l, i) => {
      const eigene = aktive.filter((t) => t.fahrlehrer?.id === l.id);
      return {
        ...l,
        anzahl: eigene.length,
        minuten: eigene.reduce((s, t) => s + (t.dauer_minuten ?? 0), 0),
        naechste: eigene.find((t) => minutenVon(t.uhrzeit) > jetztMin),
        farbe: PERSONEN_FARBEN[i % PERSONEN_FARBEN.length],
      };
    })
    .sort((a, b) => b.minuten - a.minuten);
  const tageDerWoche = Array.from({ length: 7 }, (_, i) => plusTage(woche0, i));
  const minutenJeTag: Record<string, number> = {};
  for (const w of wocheRes.data ?? []) minutenJeTag[w.datum] = (minutenJeTag[w.datum] ?? 0) + (w.dauer_minuten ?? 0);
  const wocheGesamt = Object.values(minutenJeTag).reduce((s, m) => s + m, 0);
  const wocheMax = Math.max(ARBEITSTAG_MIN, ...Object.values(minutenJeTag));

  // ---------------------------------------------------------------- Monat
  const stundenJeTag: Record<string, number> = {};
  for (const r of monatRes.data ?? []) stundenJeTag[r.datum] = (stundenJeTag[r.datum] ?? 0) + 1;
  const pruefTage = new Set((pruefMonatRes.data ?? []).map((p) => p.datum));

  return (
    <div className="space-y-6">
      <KennzahlReihe>
        <Kennzahl
          label={nurMeine ? "Meine Fahrstunden heute" : "Fahrstunden heute"}
          wert={aktive.length}
          sub={
            naechster
              ? `Nächste um ${formatUhrzeit(naechster.uhrzeit)} · ${gefahren.length} gefahren`
              : aktive.length > 0
                ? "Für heute alles gefahren"
                : "Keine geplant"
          }
          anteil={aktive.length ? gefahren.length / aktive.length : 0}
          icon={CalendarDays}
          akzent={AKZENT.blau}
          href={kalender ? "/kalender" : undefined}
        />
        {nurMeine ? (
          <Kennzahl
            label="Meine Fahrzeit heute"
            wert={stunden(fahrMinuten)}
            sub={`von ${stunden(ARBEITSTAG_MIN)} Arbeitstag`}
            anteil={fahrMinuten / ARBEITSTAG_MIN}
            icon={Timer}
            akzent={AKZENT.violett}
          />
        ) : (
          <Kennzahl
            label="Auslastung heute"
            wert={`${Math.round(auslastung * 100)} %`}
            sub={`${stunden(fahrMinuten)} von ${stunden(kapazitaet)} verplant`}
            anteil={auslastung}
            icon={Gauge}
            akzent={AKZENT.violett}
          />
        )}
        <Kennzahl
          label="Unbestätigte Termine"
          wert={unbestaetigt}
          sub={kommende.length ? `von ${kommende.length} Fahrstunden bis ${wochentagKurz(plusTage(heute, 3))}` : "Nichts geplant"}
          ton={unbestaetigt > 0 ? "warnung" : undefined}
          icon={BellRing}
          akzent={AKZENT.orange}
          href="/erinnerungen"
        />
        <Kennzahl
          label="Offene Aufgaben"
          wert={aufgabenAlle.length}
          sub={
            aufgabenUeberfaellig > 0
              ? `${aufgabenUeberfaellig} überfällig`
              : aufgabenHeute > 0
                ? `${aufgabenHeute} heute fällig`
                : "Nichts überfällig"
          }
          ton={aufgabenUeberfaellig > 0 ? "kritisch" : undefined}
          icon={CheckSquare}
          akzent={AKZENT.smaragd}
          href="/aufgaben"
        />
      </KennzahlReihe>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Tagesplan */}
        <Karte
          titel={nurMeine ? "Mein Tagesplan" : "Tagesplan"}
          meta={`${aktive.length} Fahrstunden`}
          aktion={kalender ? <KartenLink href="/kalender">Kalender öffnen</KartenLink> : undefined}
          className="xl:col-span-2 xl:row-span-2"
          inhaltClassName="flex flex-col"
        >
          {termine.length === 0 ? (
            <KarteLeer>Heute sind keine Fahrstunden geplant.</KarteLeer>
          ) : (
            <ol className="max-h-[540px] min-h-0 flex-1 overflow-y-auto px-4 pb-3 scrollbar-thin">
              {termine.map((t, i) => {
                const farbe = FAHRSTUNDE_FARBE[t.typ];
                const typ = FAHRSTUNDE_TYPEN[t.typ];
                const ausgefallen = t.status === "ausgefallen";
                const vorbei = !ausgefallen && (t.status === "abgeschlossen" || ende(t) <= jetztMin);
                const laeuft = laufend?.id === t.id;
                const blass = vorbei || ausgefallen;
                const name = t.fahrschueler ? `${t.fahrschueler.vorname} ${t.fahrschueler.nachname}` : typ.label;
                const chip = ausgefallen
                  ? "Ausgefallen"
                  : vorbei
                    ? "Gefahren"
                    : laeuft
                      ? "Läuft"
                      : t.bestaetigt_am
                        ? "Bestätigt"
                        : "Unbestätigt";
                return (
                  <li key={t.id}>
                    {i === indexJetzt && <JetztLinie minuten={jetztMin} />}
                    <Link
                      href={t.fahrschueler ? `/schueler/${t.fahrschueler.id}` : kalender ? "/kalender" : "/dashboard"}
                      className="group grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3 py-1 focus-visible:outline-none"
                    >
                      <span className="text-right tabular-nums">
                        <span className={cn("block text-13 font-semibold", blass ? "text-foreground-tertiary" : "text-foreground")}>
                          {formatUhrzeit(t.uhrzeit)}
                        </span>
                        <span className="block text-[11px] text-foreground-tertiary">{alsUhrzeit(ende(t))}</span>
                      </span>
                      <span
                        className={cn(
                          "flex min-w-0 items-center gap-3 rounded-xl px-4 py-2.5 transition-[filter,box-shadow] group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2",
                          blass ? "bg-muted text-foreground-secondary group-hover:bg-border/60" : "text-white group-hover:brightness-110",
                          laeuft && "ring-2 ring-offset-2 ring-offset-card",
                        )}
                        style={
                          blass
                            ? { boxShadow: `inset 3px 0 0 ${farbe}` }
                            : { background: farbe, ...(laeuft ? { ["--tw-ring-color" as string]: `${farbe}66` } : {}) }
                        }
                      >
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-13 font-semibold", ausgefallen && "line-through")}>{name}</span>
                          <span className={cn("block truncate text-xs", blass ? "text-foreground-tertiary" : "text-white/85")}>
                            {typ.kurz} · {t.dauer_minuten ?? 45} Min.
                            {t.fahrzeug ? ` · ${t.fahrzeug.kennzeichen}` : ""}
                          </span>
                        </span>
                        {!nurMeine && t.fahrlehrer && (
                          <span
                            title={`${t.fahrlehrer.vorname} ${t.fahrlehrer.nachname}`}
                            className={cn(
                              "hidden h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold sm:flex",
                              blass ? "bg-card text-foreground-secondary" : "bg-white/20 text-white",
                            )}
                          >
                            {initialen(t.fahrlehrer.vorname, t.fahrlehrer.nachname)}
                          </span>
                        )}
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                            blass ? "bg-card text-foreground-secondary" : "bg-white/20 text-white",
                          )}
                        >
                          {chip}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
              {indexJetzt === -1 && <JetztLinie minuten={jetztMin} />}
            </ol>
          )}
          <dl className="mt-auto grid grid-cols-4 border-t border-border text-center">
            {[
              { label: "Fahrzeit", wert: stunden(fahrMinuten) },
              { label: "Gefahren", wert: String(gefahren.length) },
              { label: "Offen", wert: String(aktive.length - gefahren.length) },
              { label: "Ausgefallen", wert: String(termine.length - aktive.length) },
            ].map((k, i) => (
              <div key={k.label} className={cn("px-2 py-3", i > 0 && "border-l border-border")}>
                <dt className="text-xs text-foreground-tertiary">{k.label}</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">{k.wert}</dd>
              </div>
            ))}
          </dl>
        </Karte>

        {/* Als Nächstes */}
        <Karte
          titel={laufend ? "Läuft gerade" : "Als Nächstes"}
          meta={
            laufend
              ? `noch ${dauerText(ende(laufend) - jetztMin)}`
              : naechster
                ? `in ${dauerText(minutenVon(naechster.uhrzeit) - jetztMin)}`
                : undefined
          }
          inhaltClassName="px-5 pb-5"
        >
          {fokus ? (
            <>
              <div className="flex items-center gap-4">
                <span
                  className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl text-white"
                  style={{ background: FAHRSTUNDE_FARBE[fokus.typ] }}
                >
                  <span className="text-lg font-semibold leading-5 tabular-nums">{formatUhrzeit(fokus.uhrzeit)}</span>
                  <span className="text-[11px] text-white/85">{fokus.dauer_minuten ?? 45} Min.</span>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-foreground">
                    {fokus.fahrschueler ? `${fokus.fahrschueler.vorname} ${fokus.fahrschueler.nachname}` : FAHRSTUNDE_TYPEN[fokus.typ].label}
                  </p>
                  <p className="truncate text-13 text-foreground-secondary">{FAHRSTUNDE_TYPEN[fokus.typ].label}</p>
                  <div className="mt-1.5">
                    {fokus.bestaetigt_am ? (
                      <Badge variant="success">Vom Schüler bestätigt</Badge>
                    ) : (
                      <Badge variant="warning">Noch nicht bestätigt</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Eigenschaften breite="schmal" className="mt-4 border-t border-border pt-3">
                {!nurMeine && (
                  <Eigenschaft label="Fahrlehrer">
                    {fokus.fahrlehrer ? `${fokus.fahrlehrer.vorname} ${fokus.fahrlehrer.nachname}` : null}
                  </Eigenschaft>
                )}
                <Eigenschaft label="Fahrzeug">{fokus.fahrzeug?.kennzeichen}</Eigenschaft>
                <Eigenschaft label="Telefon">
                  {fokus.fahrschueler?.telefon && (
                    <a href={`tel:${fokus.fahrschueler.telefon.replace(/\s/g, "")}`} className="hover:underline">
                      {fokus.fahrschueler.telefon}
                    </a>
                  )}
                </Eigenschaft>
              </Eigenschaften>
              <div className="mt-4 flex gap-2">
                {fokus.fahrschueler && (
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/schueler/${fokus.fahrschueler.id}`}>
                      <UserRound /> Schülerakte
                    </Link>
                  </Button>
                )}
                {fokus.fahrschueler?.telefon && (
                  <Button asChild size="sm" className="flex-1">
                    <a href={`tel:${fokus.fahrschueler.telefon.replace(/\s/g, "")}`}>
                      <Phone /> Anrufen
                    </a>
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="text-13 text-foreground-secondary">Für heute steht nichts mehr an.</p>
              {kalender && (
                <Link
                  href={`/kalender?datum=${plusTage(heute, 1)}`}
                  className="mt-2 inline-block text-13 font-medium text-primary-text hover:underline"
                >
                  Morgen im Kalender ansehen
                </Link>
              )}
            </div>
          )}
        </Karte>

        {/* Team heute (Büro, Chef) bzw. Meine Woche (Fahrlehrer) */}
        {nurMeine ? (
          <Karte titel="Meine Woche" meta={`${stunden(wocheGesamt)} gefahren und geplant`} inhaltClassName="px-5 pb-5">
            <div className="flex h-[150px] items-end gap-2" role="img" aria-label={`Fahrzeit je Wochentag, insgesamt ${stunden(wocheGesamt)}`}>
              {tageDerWoche.map((d) => {
                const min = minutenJeTag[d] ?? 0;
                const istHeute = d === heute;
                return (
                  <div key={d} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="text-[11px] tabular-nums text-foreground-tertiary">
                      {min ? (min / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 }) : ""}
                    </span>
                    <span
                      className="w-full max-w-[28px] rounded-t-md"
                      style={{ height: `${Math.max(min ? 6 : 2, (min / wocheMax) * 100)}%`, background: istHeute ? AKZENT.blau : "#C9D6FA" }}
                    />
                    <span className={cn("text-xs", istHeute ? "font-semibold text-foreground" : "text-foreground-tertiary")}>
                      {wochentagKurz(d)}
                    </span>
                  </div>
                );
              })}
            </div>
          </Karte>
        ) : (
          <Karte titel="Team heute" aktion={rolle === "chef" ? <KartenLink href="/fahrlehrer">Team</KartenLink> : undefined} inhaltClassName="px-5 pb-5">
            {team.length === 0 ? (
              <p className="py-6 text-13 text-foreground-secondary">Noch keine Fahrlehrer angelegt.</p>
            ) : (
              <ul className="space-y-4">
                {team.map((l) => (
                  <li key={l.id} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                      style={{ background: l.farbe }}
                    >
                      {initialen(l.vorname, l.nachname)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-13 font-semibold text-foreground">
                          {l.vorname} {l.nachname}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-foreground-secondary">
                          {l.anzahl === 0 ? "frei" : stunden(l.minuten)}
                        </span>
                      </div>
                      <Balken anteil={l.minuten / ARBEITSTAG_MIN} farbe={l.farbe} className="mt-1.5" />
                      <p className="mt-1 truncate text-xs text-foreground-tertiary">
                        {l.anzahl === 0
                          ? "Keine Fahrstunden heute"
                          : l.naechste
                            ? `${l.anzahl} Fahrstunden · nächste um ${formatUhrzeit(l.naechste.uhrzeit)}`
                            : `${l.anzahl} Fahrstunden · alle gefahren`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Karte>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Aufgaben */}
        <Karte
          titel="Aufgaben"
          meta={aufgabenAlle.length > 0 ? `${aufgabenAlle.length} offen` : undefined}
          aktion={<KartenLink href="/aufgaben">Alle Aufgaben</KartenLink>}
          className="xl:col-span-2"
          inhaltClassName="pb-2"
        >
          {aufgaben.length === 0 ? (
            <KarteLeer>Keine offenen Aufgaben.</KarteLeer>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[600px] text-13">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-foreground-secondary">
                    <th className="px-5 pb-2 font-medium">Aufgabe</th>
                    <th className="px-3 pb-2 font-medium">Schüler</th>
                    <th className="px-3 pb-2 font-medium">Fällig</th>
                    <th className="px-3 pb-2 font-medium">Priorität</th>
                    <th className="px-5 pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {aufgaben.map((a) => {
                    const ueberf = a.faellig_am != null && a.faellig_am < heute;
                    const heuteFaellig = a.faellig_am === heute;
                    return (
                      <tr key={a.id} className="transition-colors hover:bg-surface-muted">
                        <td className="max-w-[260px] px-5 py-2.5">
                          <span className="block truncate font-medium text-foreground">{a.titel}</span>
                        </td>
                        <td className="px-3 py-2.5 text-foreground-secondary">
                          {a.fahrschueler ? `${a.fahrschueler.vorname} ${a.fahrschueler.nachname}` : "—"}
                        </td>
                        <td
                          className={cn(
                            "whitespace-nowrap px-3 py-2.5 tabular-nums",
                            ueberf ? "font-medium text-destructive-text" : heuteFaellig ? "font-medium text-foreground" : "text-foreground-secondary",
                          )}
                        >
                          {a.faellig_am ? (heuteFaellig ? "Heute" : formatDatum(a.faellig_am)) : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-2 text-foreground-secondary">
                            <i
                              aria-hidden="true"
                              className="h-2 w-2 rounded-full"
                              style={{
                                background: a.prioritaet === "hoch" ? AKZENT.rot : a.prioritaet === "mittel" ? AKZENT.orange : "#C9CED6",
                              }}
                            />
                            {a.prioritaet === "hoch" ? "Hoch" : a.prioritaet === "mittel" ? "Mittel" : "Niedrig"}
                          </span>
                        </td>
                        <td className="px-5 py-2">
                          <AufgabeStatus id={a.id} status={a.status} titel={a.titel} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Karte>

        {/* Monatskalender */}
        <Karte
          titel={new Date(`${heute}T12:00:00Z`).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" })}
          aktion={
            <span className="flex items-center gap-3 text-xs text-foreground-tertiary">
              <span className="inline-flex items-center gap-1">
                <i className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> Fahrstunden
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="h-1.5 w-1.5 rounded-full" style={{ background: AKZENT.rot }} aria-hidden="true" /> Prüfung
              </span>
            </span>
          }
          inhaltClassName="px-4 pb-4"
        >
          <MiniKalender heute={heute} fahrstunden={stundenJeTag} pruefungen={pruefTage} verlinken={kalender} />
        </Karte>
      </div>
    </div>
  );
}
