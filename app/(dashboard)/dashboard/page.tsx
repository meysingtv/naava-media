import Link from "next/link";
import { ArrowRight, CalendarDays, CheckSquare, ClipboardCheck, Euro } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { FAHRSTUNDE_FARBE, FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { cn, formatDatum, formatEuro, formatUhrzeit, initialen } from "@/lib/utils";
import type { Aufgabe, Fahrschueler, FahrstundeMitRelationen, Pruefung, Rechnung } from "@/lib/types";
import { AufgabeStatus } from "./aufgabe-status";
import { Balken, Karte, KartenLink, MiniKalender, Ring } from "./widgets";

export const metadata = { title: "Leitstand · FahrschulApp" };

/** Farben für Personen (Team) – dieselbe Familie wie die Fahrstunden-Arten. */
const PERSONEN_FARBEN = ["#3565E8", "#0E9A77", "#7650E0", "#E38A1C", "#E0434A", "#2F3F8F"];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function inTagen(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
}
function berlinMinuten(): number {
  const [h, m] = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Berlin" })
    .format(new Date())
    .split(":")
    .map(Number);
  return h * 60 + m;
}
function gruss(minuten: number): string {
  if (minuten < 11 * 60) return "Guten Morgen";
  if (minuten < 18 * 60) return "Guten Tag";
  return "Guten Abend";
}
function datumLang(): string {
  return new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
}
function kurzTag(datum: string): { tag: string; datum: string } {
  const d = new Date(`${datum}T12:00:00`);
  return {
    tag: d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", ""),
    datum: d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
  };
}
function minutenVon(uhrzeit: string): number {
  const [h, m] = uhrzeit.split(":").map(Number);
  return h * 60 + m;
}
function alsUhrzeit(min: number): string {
  return `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function monatsKurz(monatIndex: number): string {
  return new Date(2026, monatIndex, 1).toLocaleDateString("de-DE", { month: "short" }).replace(".", "");
}
function stunden(minuten: number): string {
  return `${(minuten / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.`;
}

type AufgabeRow = Aufgabe & { fahrschueler: Pick<Fahrschueler, "vorname" | "nachname"> | null };
type PruefungRow = Pruefung & { fahrschueler: Pick<Fahrschueler, "id" | "vorname" | "nachname"> | null };
type KommendeRow = {
  id: string;
  datum: string;
  uhrzeit: string;
  bestaetigt_am: string | null;
  abgesagt_am: string | null;
  fahrschueler: { id: string; vorname: string; nachname: string } | null;
};
type TheorieRow = {
  id: string;
  datum: string;
  uhrzeit: string;
  thema: string | null;
  max_teilnehmer: number | null;
  kurs_id: string | null;
};

/** „Jetzt"-Linie im Tagesplan. */
function JetztLinie({ minuten }: { minuten: number }) {
  return (
    <div className="flex items-center gap-2 px-1 py-1" aria-label={`Jetzt, ${alsUhrzeit(minuten)} Uhr`}>
      <span className="text-[11px] font-semibold tabular-nums text-destructive">{alsUhrzeit(minuten)}</span>
      <span className="h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
      <span className="h-px flex-1 bg-destructive/50" aria-hidden="true" />
    </div>
  );
}

export default async function LeitstandPage() {
  const supabase = createClient();
  const kontext = await getKontext();
  const heute = iso(new Date());
  const inSieben = inTagen(7);
  const jetztMin = berlinMinuten();

  const monatsbeginn = `${heute.slice(0, 7)}-01`;
  const [jahr, monat] = heute.split("-").map(Number);
  const monatsende = iso(new Date(Date.UTC(jahr, monat, 0)));
  const sechsMonate = iso(new Date(Date.UTC(jahr, monat - 6, 1)));

  const [
    heuteRes,
    offeneRes,
    aufgabenRes,
    pruefungRes,
    schuelerRes,
    verlaufRes,
    kommendeRes,
    monatStundenRes,
    monatPruefRes,
    kursRes,
    kursTeilnahmeRes,
    theorieRes,
    lehrerRes,
  ] = await Promise.all([
    supabase
      .from("fahrstunde")
      .select("*, fahrschueler(id, vorname, nachname, avatar_farbe), fahrlehrer(id, vorname, nachname), fahrzeug(id, kennzeichen)")
      .eq("datum", heute)
      .order("uhrzeit", { ascending: true })
      .returns<FahrstundeMitRelationen[]>(),
    supabase
      .from("rechnung")
      .select("id, betrag_brutto, status, faelligkeitsdatum, mahnstufe")
      .in("status", ["offen", "ueberfaellig"])
      .returns<Pick<Rechnung, "id" | "betrag_brutto" | "status" | "faelligkeitsdatum" | "mahnstufe">[]>(),
    supabase
      .from("aufgabe")
      .select("*, fahrschueler(vorname, nachname)")
      .eq("status", "offen")
      .order("faellig_am", { ascending: true, nullsFirst: false })
      .limit(6)
      .returns<AufgabeRow[]>(),
    supabase
      .from("pruefung")
      .select("*, fahrschueler(id, vorname, nachname)")
      .eq("ergebnis", "offen")
      .gte("datum", heute)
      .lte("datum", inSieben)
      .order("datum", { ascending: true })
      .returns<PruefungRow[]>(),
    supabase
      .from("fahrschueler")
      .select("id, vorname, nachname, theorie_bestanden, theorie_termin, pruefung_termin, sehtest_am, erste_hilfe_am, passbild_ok, ausbildung_beendet, anmeldedatum")
      .eq("ausbildung_beendet", false)
      .returns<
        Pick<
          Fahrschueler,
          | "id" | "vorname" | "nachname" | "theorie_bestanden" | "theorie_termin" | "pruefung_termin"
          | "sehtest_am" | "erste_hilfe_am" | "passbild_ok" | "ausbildung_beendet" | "anmeldedatum"
        >[]
      >(),
    supabase
      .from("rechnung")
      .select("betrag_brutto, rechnungsdatum, bezahlt_am, status")
      .gte("rechnungsdatum", sechsMonate)
      .returns<Pick<Rechnung, "betrag_brutto" | "rechnungsdatum" | "bezahlt_am" | "status">[]>(),
    supabase
      .from("fahrstunde")
      .select("id, datum, uhrzeit, bestaetigt_am, abgesagt_am, fahrschueler(id, vorname, nachname)")
      .eq("status", "geplant")
      .gt("datum", heute)
      .lte("datum", inTagen(3))
      .order("datum", { ascending: true })
      .order("uhrzeit", { ascending: true })
      .returns<KommendeRow[]>(),
    supabase
      .from("fahrstunde")
      .select("datum")
      .neq("status", "ausgefallen")
      .gte("datum", monatsbeginn)
      .lte("datum", monatsende)
      .returns<{ datum: string }[]>(),
    supabase.from("pruefung").select("datum").gte("datum", monatsbeginn).lte("datum", monatsende).returns<{ datum: string }[]>(),
    supabase
      .from("kurs")
      .select("id, name, klasse, start_datum, status")
      .in("status", ["laufend", "geplant"])
      .order("start_datum", { ascending: true })
      .returns<{ id: string; name: string; klasse: string | null; start_datum: string | null; status: string }[]>(),
    supabase.from("kurs_teilnahme").select("kurs_id").returns<{ kurs_id: string }[]>(),
    supabase
      .from("theoriestunde")
      .select("id, datum, uhrzeit, thema, max_teilnehmer, kurs_id")
      .order("datum", { ascending: true })
      .order("uhrzeit", { ascending: true })
      .returns<TheorieRow[]>(),
    supabase
      .from("fahrlehrer")
      .select("id, vorname, nachname, rolle")
      .eq("aktiv", true)
      .neq("rolle", "buero")
      .order("nachname", { ascending: true })
      .returns<{ id: string; vorname: string; nachname: string; rolle: string }[]>(),
  ]);

  const termine = heuteRes.data ?? [];
  const offene = offeneRes.data ?? [];
  const aufgaben = aufgabenRes.data ?? [];
  const pruefungen = pruefungRes.data ?? [];
  const schueler = schuelerRes.data ?? [];
  const verlauf = verlaufRes.data ?? [];
  const kommende = kommendeRes.data ?? [];
  const theorie = theorieRes.data ?? [];
  const lehrer = lehrerRes.data ?? [];

  // ---------------------------------------------------------------- Heute
  const aktiveTermine = termine.filter((t) => t.status !== "ausgefallen");
  const naechster = aktiveTermine.find((t) => minutenVon(t.uhrzeit) >= jetztMin);
  const fahrMinuten = aktiveTermine.reduce((s, t) => s + (t.dauer_minuten ?? 0), 0);
  const indexJetzt = termine.findIndex((t) => minutenVon(t.uhrzeit) + (t.dauer_minuten ?? 45) > jetztMin);

  // ---------------------------------------------------------------- Finanzen
  const offenerBetrag = offene.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const ueberfaellig = offene.filter((r) => r.status === "ueberfaellig" || (r.faelligkeitsdatum && r.faelligkeitsdatum < heute));
  const ueberfaelligBetrag = ueberfaellig.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const monate = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(jahr, monat - 6 + i, 1));
    const schluessel = iso(d).slice(0, 7);
    const gestellt = verlauf
      .filter((r) => r.rechnungsdatum.startsWith(schluessel))
      .reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
    const eingang = verlauf
      .filter((r) => r.status === "bezahlt" && (r.bezahlt_am ?? "").startsWith(schluessel))
      .reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
    return { schluessel, label: monatsKurz(d.getUTCMonth()), gestellt, eingang };
  });
  const eingaengeMonat = monate[monate.length - 1].eingang;
  const hoechster = Math.max(1, ...monate.map((m) => Math.max(m.gestellt, m.eingang)));

  // ---------------------------------------------------------------- Aufmerksamkeit
  const handlungsbedarf = schueler
    .map((s) => {
      const gruende: string[] = [];
      if (s.pruefung_termin && s.pruefung_termin >= heute && s.pruefung_termin <= inSieben && !s.theorie_bestanden)
        gruende.push("Praxisprüfung ohne bestandene Theorie");
      if (s.theorie_termin && s.theorie_termin >= heute && s.theorie_termin <= inSieben) gruende.push("Theorieprüfung diese Woche");
      if (!s.sehtest_am) gruende.push("Sehtest fehlt");
      if (!s.erste_hilfe_am) gruende.push("Erste Hilfe fehlt");
      if (!s.passbild_ok) gruende.push("Passbild fehlt");
      return { s, gruende };
    })
    .filter((x) => x.gruende.length > 0)
    .sort((a, b) => b.gruende.length - a.gruende.length)
    .slice(0, 5);

  // ---------------------------------------------------------------- Bestätigungen
  const bestaetigt = kommende.filter((t) => t.bestaetigt_am).length;
  const unbestaetigt = kommende.filter((t) => !t.bestaetigt_am && !t.abgesagt_am);

  // ---------------------------------------------------------------- Mini-Kalender
  const stundenJeTag: Record<string, number> = {};
  for (const r of monatStundenRes.data ?? []) stundenJeTag[r.datum] = (stundenJeTag[r.datum] ?? 0) + 1;
  const pruefTage = new Set((monatPruefRes.data ?? []).map((p) => p.datum));

  // ---------------------------------------------------------------- Theorie und Kurse
  const naechsteTheorie = theorie.find((t) => t.datum >= heute);
  const plaetze = naechsteTheorie?.max_teilnehmer ?? 20;
  const belegt = naechsteTheorie
    ? ((
        await supabase
          .from("theorie_teilnahme")
          .select("id", { count: "exact", head: true })
          .eq("theoriestunde_id", naechsteTheorie.id)
      ).count ?? 0)
    : 0;
  const teilnehmerJeKurs: Record<string, number> = {};
  for (const t of kursTeilnahmeRes.data ?? []) teilnehmerJeKurs[t.kurs_id] = (teilnehmerJeKurs[t.kurs_id] ?? 0) + 1;
  const kurse = (kursRes.data ?? []).slice(0, 3).map((k) => {
    const lektionen = theorie.filter((t) => t.kurs_id === k.id);
    const gehalten = lektionen.filter((t) => t.datum < heute).length;
    return { ...k, gesamt: lektionen.length, gehalten, teilnehmer: teilnehmerJeKurs[k.id] ?? 0 };
  });

  // ---------------------------------------------------------------- Team heute
  const team = lehrer
    .map((l, i) => {
      const eigene = aktiveTermine.filter((t) => t.fahrlehrer?.id === l.id);
      const minuten = eigene.reduce((s, t) => s + (t.dauer_minuten ?? 0), 0);
      const naechste = eigene.find((t) => minutenVon(t.uhrzeit) >= jetztMin);
      return { ...l, anzahl: eigene.length, minuten, naechste, farbe: PERSONEN_FARBEN[i % PERSONEN_FARBEN.length] };
    })
    .sort((a, b) => b.minuten - a.minuten);

  const vorname = kontext?.fahrlehrer?.vorname ?? "";
  const ueberfaelligeAufgaben = aufgaben.filter((a) => a.faellig_am && a.faellig_am < heute).length;

  return (
    <div>
      <PageHeader
        title={`${gruss(jetztMin)}${vorname ? `, ${vorname}` : ""}`}
        description={`${datumLang()} · ${aktiveTermine.length} Fahrstunden heute · ${pruefungen.length} ${
          pruefungen.length === 1 ? "Prüfung" : "Prüfungen"
        } in den nächsten 7 Tagen`}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/kalender">
            <CalendarDays /> Zum Kalender
          </Link>
        </Button>
      </PageHeader>

      {/* ------------------------------------------------ Kennzahlen */}
      <KpiRow>
        <KpiCard
          label="Fahrstunden heute"
          value={aktiveTermine.length}
          sub={
            naechster
              ? `Nächste um ${formatUhrzeit(naechster.uhrzeit)} · ${stunden(fahrMinuten)}`
              : aktiveTermine.length > 0
                ? "Für heute alles gefahren"
                : "Keine geplant"
          }
          icon={<CalendarDays strokeWidth={1.75} />}
          akzent="#3565E8"
          href="/kalender"
        />
        <KpiCard
          label="Prüfungen in 7 Tagen"
          value={pruefungen.length}
          sub={pruefungen[0] ? `Nächste am ${formatDatum(pruefungen[0].datum).slice(0, 6)}` : "Keine angesetzt"}
          icon={<ClipboardCheck strokeWidth={1.75} />}
          akzent="#7650E0"
          href="/pruefungen"
        />
        <KpiCard
          label="Offene Aufgaben"
          value={aufgaben.length}
          sub={ueberfaelligeAufgaben > 0 ? `${ueberfaelligeAufgaben} überfällig` : "Keine überfällig"}
          tone={ueberfaelligeAufgaben > 0 ? "warning" : "neutral"}
          icon={<CheckSquare strokeWidth={1.75} />}
          akzent="#E38A1C"
          href="/aufgaben"
        />
        <KpiCard
          label="Offene Rechnungen"
          value={formatEuro(offenerBetrag)}
          sub={ueberfaellig.length > 0 ? `${formatEuro(ueberfaelligBetrag)} überfällig` : `${offene.length} Rechnungen`}
          tone={ueberfaellig.length > 0 ? "warning" : "neutral"}
          icon={<Euro strokeWidth={1.75} />}
          akzent="#0E9A77"
          href="/rechnungen"
        />
      </KpiRow>

      {/* ------------------------------------------------ Reihe 1: Heute · Theorie und Kurse · Team heute */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
        <Karte
          titel="Heute"
          meta={`${aktiveTermine.length} Fahrstunden`}
          aktion={<KartenLink href="/kalender">Kalender</KartenLink>}
          className="lg:row-span-2 2xl:row-span-1"
          inhaltClassName="flex flex-col"
        >
          {termine.length === 0 ? (
            <p className="flex-1 px-5 py-10 text-center text-13 text-foreground-secondary">Heute sind keine Fahrstunden geplant.</p>
          ) : (
            <ol className="max-h-[560px] min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3 scrollbar-thin">
              {termine.map((t, i) => {
                const farbe = FAHRSTUNDE_FARBE[t.typ];
                const typ = FAHRSTUNDE_TYPEN[t.typ];
                const ausgefallen = t.status === "ausgefallen";
                const beginn = minutenVon(t.uhrzeit);
                const ende = beginn + (t.dauer_minuten ?? 45);
                const vorbei = !ausgefallen && ende <= jetztMin;
                const laeuft = !ausgefallen && beginn <= jetztMin && ende > jetztMin;
                const blass = vorbei || ausgefallen;
                const name = t.fahrschueler ? `${t.fahrschueler.vorname} ${t.fahrschueler.nachname}` : typ.label;
                return (
                  <li key={t.id}>
                    {i === indexJetzt && <JetztLinie minuten={jetztMin} />}
                    <Link
                      href={t.fahrschueler ? `/schueler/${t.fahrschueler.id}` : "/kalender"}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3.5 py-2.5 transition-[filter,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        blass ? "bg-muted text-foreground-secondary hover:bg-border/60" : "text-white hover:brightness-110",
                      )}
                      style={blass ? { boxShadow: `inset 3px 0 0 ${farbe}` } : { background: farbe }}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-13 font-semibold", ausgefallen && "line-through")}>{name}</span>
                        <span className={cn("block truncate text-xs", blass ? "text-foreground-tertiary" : "text-white/85")}>
                          {typ.kurz}
                          {t.fahrlehrer ? ` · ${t.fahrlehrer.vorname} ${t.fahrlehrer.nachname.slice(0, 1)}.` : ""}
                          {t.fahrzeug ? ` · ${t.fahrzeug.kennzeichen}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        <span className="block text-13 font-semibold">{formatUhrzeit(t.uhrzeit)}</span>
                        <span className={cn("block text-xs", blass ? "text-foreground-tertiary" : "text-white/85")}>
                          {ausgefallen ? "Ausgefallen" : laeuft ? "läuft gerade" : `bis ${alsUhrzeit(ende)}`}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
              {indexJetzt === -1 && (
                <li>
                  <JetztLinie minuten={jetztMin} />
                </li>
              )}
            </ol>
          )}
          <dl className="mt-auto grid grid-cols-3 border-t border-border text-center">
            {[
              { label: "Fahrzeit", wert: stunden(fahrMinuten) },
              { label: "Gefahren", wert: String(aktiveTermine.filter((t) => minutenVon(t.uhrzeit) + (t.dauer_minuten ?? 45) <= jetztMin).length) },
              { label: "Ausgefallen", wert: String(termine.length - aktiveTermine.length) },
            ].map((k, i) => (
              <div key={k.label} className={cn("px-3 py-3", i > 0 && "border-l border-border")}>
                <dt className="text-xs text-foreground-tertiary">{k.label}</dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">{k.wert}</dd>
              </div>
            ))}
          </dl>
        </Karte>

        <Karte titel="Theorie und Kurse" aktion={<KartenLink href="/kurse">Alle Kurse</KartenLink>} inhaltClassName="px-5 pb-5">
          {naechsteTheorie ? (
            <div className="flex items-center gap-5 border-b border-border pb-5">
              <Ring wert={belegt} max={plaetze} farbe="#E38A1C" label={`${belegt} von ${plaetze} Plätzen belegt`}>
                <span className="text-lg font-semibold tabular-nums leading-6 text-foreground">
                  {belegt}/{plaetze}
                </span>
                <span className="text-[11px] text-foreground-tertiary">Plätze</span>
              </Ring>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground-tertiary">Nächste Theoriestunde</p>
                <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-foreground">{naechsteTheorie.thema ?? "Theorieunterricht"}</p>
                <p className="mt-1 text-13 tabular-nums text-foreground-secondary">
                  {kurzTag(naechsteTheorie.datum).tag}, {formatDatum(naechsteTheorie.datum)} · {formatUhrzeit(naechsteTheorie.uhrzeit)} Uhr
                </p>
                <Link
                  href={`/theorie/${naechsteTheorie.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-13 font-medium text-primary-text hover:underline"
                >
                  Anwesenheit öffnen <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
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
                    <Balken anteil={k.gesamt ? k.gehalten / k.gesamt : 0} farbe={k.status === "geplant" ? "#C9CED6" : "#E38A1C"} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Karte>

        <Karte titel="Team heute" aktion={<KartenLink href="/fahrlehrer">Team</KartenLink>} inhaltClassName="px-5 pb-5">
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
                    <Balken anteil={l.minuten / 480} farbe={l.farbe} className="mt-1.5" />
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
      </div>

      {/* ------------------------------------------------ Reihe 2: Aufgaben · Monatskalender */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Karte
          titel="Meine Aufgaben"
          meta={aufgaben.length > 0 ? `${aufgaben.length} offen` : undefined}
          aktion={<KartenLink href="/aufgaben">Alle Aufgaben</KartenLink>}
          inhaltClassName="pb-2"
        >
          {aufgaben.length === 0 ? (
            <p className="px-5 py-10 text-center text-13 text-foreground-secondary">Keine offenen Aufgaben.</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[640px] text-13">
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
                        <td className="max-w-[280px] px-5 py-2.5">
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
                              className={cn(
                                "h-2 w-2 rounded-full",
                                a.prioritaet === "hoch" ? "bg-[#E0434A]" : a.prioritaet === "mittel" ? "bg-[#E38A1C]" : "bg-[#C9CED6]",
                              )}
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

        <Karte
          titel={new Date(`${heute}T12:00:00`).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
          aktion={
            <span className="flex items-center gap-3 text-xs text-foreground-tertiary">
              <span className="inline-flex items-center gap-1">
                <i className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" /> Fahrstunden
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="h-1.5 w-1.5 rounded-full bg-[#E0434A]" aria-hidden="true" /> Prüfung
              </span>
            </span>
          }
          inhaltClassName="px-4 pb-4"
        >
          <MiniKalender heute={heute} fahrstunden={stundenJeTag} pruefungen={pruefTage} />
        </Karte>
      </div>

      {/* ------------------------------------------------ Reihe 3: Aufmerksamkeit · Einnahmen · Bestätigungen · Prüfungen */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <Karte
          titel="Braucht Aufmerksamkeit"
          meta={handlungsbedarf.length > 0 ? `${handlungsbedarf.length} Schüler` : undefined}
          aktion={<KartenLink href="/schueler">Schüler</KartenLink>}
          inhaltClassName="pb-2"
        >
          {handlungsbedarf.length === 0 ? (
            <p className="px-5 py-10 text-center text-13 text-foreground-secondary">Bei keinem Schüler fehlt gerade etwas.</p>
          ) : (
            <ul className="divide-y divide-border">
              {handlungsbedarf.map(({ s, gruende }) => (
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
                        {gruende.map((g) => (
                          <Badge
                            key={g}
                            variant={g.startsWith("Praxisprüfung") ? "destructive" : g.startsWith("Theorie") ? "default" : "warning"}
                          >
                            {g}
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

        <Karte titel="Einnahmen" meta="letzte 6 Monate" aktion={<KartenLink href="/finanzen">Finanzen</KartenLink>} inhaltClassName="px-5 pb-5">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <p className="text-xs text-foreground-tertiary">Eingegangen diesen Monat</p>
              <p className="text-kpi font-semibold tabular-nums text-foreground">{formatEuro(eingaengeMonat)}</p>
            </div>
            <div className="ml-auto flex gap-3 pb-1.5 text-xs text-foreground-tertiary">
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-sm bg-[#C9D6FA]" aria-hidden="true" /> Gestellt
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-sm bg-primary" aria-hidden="true" /> Eingegangen
              </span>
            </div>
          </div>
          <div
            className="mt-4 grid h-[120px] grid-cols-6 items-end gap-3"
            role="img"
            aria-label="Gestellte und eingegangene Beträge der letzten sechs Monate"
          >
            {monate.map((m) => (
              <div key={m.schluessel} className="flex h-full min-w-0 flex-col items-center justify-end gap-1.5">
                <div className="flex min-h-0 w-full flex-1 items-end justify-center gap-1">
                  <span
                    className="w-2.5 rounded-t-[3px] bg-[#C9D6FA]"
                    style={{ height: `${(m.gestellt / hoechster) * 100}%` }}
                    title={`Gestellt ${formatEuro(m.gestellt)}`}
                  />
                  <span
                    className="w-2.5 rounded-t-[3px] bg-primary"
                    style={{ height: `${(m.eingang / hoechster) * 100}%` }}
                    title={`Eingegangen ${formatEuro(m.eingang)}`}
                  />
                </div>
                <span className="text-[11px] text-foreground-tertiary">{m.label}</span>
              </div>
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-13">
            <div>
              <dt className="text-xs text-foreground-tertiary">Offen</dt>
              <dd className="font-semibold tabular-nums text-foreground">{formatEuro(offenerBetrag)}</dd>
            </div>
            <div>
              <dt className="text-xs text-foreground-tertiary">Überfällig</dt>
              <dd className={cn("font-semibold tabular-nums", ueberfaellig.length > 0 ? "text-destructive-text" : "text-foreground")}>
                {formatEuro(ueberfaelligBetrag)}
              </dd>
            </div>
          </dl>
          {ueberfaellig.length > 0 && (
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/rechnungslauf">Mahnlauf für {ueberfaellig.length} Rechnungen starten</Link>
            </Button>
          )}
        </Karte>

        <Karte
          titel="Terminbestätigungen"
          meta="nächste 3 Tage"
          aktion={<KartenLink href="/erinnerungen">Erinnerungen</KartenLink>}
          inhaltClassName="px-5 pb-5"
        >
          {kommende.length === 0 ? (
            <p className="py-10 text-center text-13 text-foreground-secondary">In den nächsten drei Tagen ist nichts geplant.</p>
          ) : (
            <>
              <div className="flex items-center gap-5">
                <Ring
                  wert={bestaetigt}
                  max={kommende.length}
                  farbe="#0E9A77"
                  groesse={96}
                  staerke={8}
                  label={`${bestaetigt} von ${kommende.length} Fahrstunden bestätigt`}
                >
                  <span className="text-lg font-semibold tabular-nums leading-6 text-foreground">
                    {Math.round((bestaetigt / kommende.length) * 100)} %
                  </span>
                </Ring>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {bestaetigt} von {kommende.length} bestätigt
                  </p>
                  <p className="mt-0.5 text-13 text-foreground-secondary">
                    {unbestaetigt.length > 0
                      ? `${unbestaetigt.length} ${unbestaetigt.length === 1 ? "Schüler hat" : "Schüler haben"} noch nicht zugesagt.`
                      : "Alle Schüler haben zugesagt."}
                  </p>
                </div>
              </div>
              {unbestaetigt.length > 0 && (
                <ul className="mt-4 divide-y divide-border border-t border-border">
                  {unbestaetigt.slice(0, 4).map((t) => {
                    const tag = kurzTag(t.datum);
                    return (
                      <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-13">
                        <span className="truncate text-foreground">
                          {t.fahrschueler ? `${t.fahrschueler.vorname} ${t.fahrschueler.nachname}` : "—"}
                        </span>
                        <span className="shrink-0 tabular-nums text-foreground-secondary">
                          {tag.tag} {tag.datum} · {formatUhrzeit(t.uhrzeit)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </Karte>

        {/* Prüfungen der nächsten 7 Tage */}
        <Karte
          titel="Prüfungen"
          meta="nächste 7 Tage"
          aktion={<KartenLink href="/pruefungen">Alle Prüfungen</KartenLink>}
          className="2xl:col-span-3"
          inhaltClassName="px-5 pb-5"
        >
          {pruefungen.length === 0 ? (
            <p className="py-10 text-center text-13 text-foreground-secondary">In den nächsten 7 Tagen sind keine Prüfungen angesetzt.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {pruefungen.map((p) => {
                const t = kurzTag(p.datum);
                const praxis = p.art === "praxis";
                return (
                  <li key={p.id}>
                    <Link
                      href={p.fahrschueler ? `/schueler/${p.fahrschueler.id}` : "/pruefungen"}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-surface-muted"
                    >
                      <span
                        className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg text-white"
                        style={{ background: praxis ? "#E0434A" : "#E38A1C" }}
                      >
                        <span className="text-[10px] font-medium leading-3 text-white/85">{t.tag}</span>
                        <span className="text-13 font-semibold leading-4 tabular-nums">{t.datum.slice(0, 2)}.</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-13 font-semibold text-foreground">
                          {p.fahrschueler ? `${p.fahrschueler.vorname} ${p.fahrschueler.nachname}` : "—"}
                        </span>
                        <span className="block truncate text-xs text-foreground-secondary">
                          {praxis ? "Praxis" : "Theorie"}
                          {p.uhrzeit ? ` · ${formatUhrzeit(p.uhrzeit)} Uhr` : ""}
                          {p.pruefstelle ? ` · ${p.pruefstelle}` : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Karte>
      </div>
    </div>
  );
}
