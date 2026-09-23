import Link from "next/link";
import { ArrowRight, CalendarDays, Check } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Abschnitt, AbschnittLeer, AbschnittLink } from "@/components/ui/abschnitt";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { cn, formatDatum, formatEuro, formatUhrzeit } from "@/lib/utils";
import type { Aufgabe, Fahrschueler, FahrstundeMitRelationen, Pruefung, Rechnung } from "@/lib/types";
import { aufgabeStatusSetzen } from "../aufgaben/actions";

export const metadata = { title: "Leitstand · FahrschulApp" };

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function inTagen(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
}
function wochentag(): string {
  return new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function kurzTag(datum: string): { tag: string; datum: string } {
  const d = new Date(`${datum}T12:00:00`);
  return {
    tag: d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", ""),
    datum: d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
  };
}
function endeUhrzeit(uhrzeit: string, minuten: number): string {
  const [h, m] = uhrzeit.split(":").map(Number);
  const ende = h * 60 + m + minuten;
  return `${String(Math.floor(ende / 60) % 24).padStart(2, "0")}:${String(ende % 60).padStart(2, "0")}`;
}

type AufgabeRow = Aufgabe & { fahrschueler: Pick<Fahrschueler, "vorname" | "nachname"> | null };
type PruefungRow = Pruefung & { fahrschueler: Pick<Fahrschueler, "id" | "vorname" | "nachname"> | null };

export default async function LeitstandPage() {
  const supabase = createClient();
  const heute = iso(new Date());
  const inSieben = inTagen(7);
  const jetztMin = new Date().getHours() * 60 + new Date().getMinutes();

  const [heuteRes, offeneRes, aufgabenRes, pruefungRes, schuelerRes, zahlungMonatRes, bestaetigungRes] = await Promise.all([
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
      .limit(8)
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
      .select("betrag_brutto, bezahlt_am")
      .eq("status", "bezahlt")
      .gte("bezahlt_am", heute.slice(0, 7) + "-01")
      .returns<Pick<Rechnung, "betrag_brutto" | "bezahlt_am">[]>(),
    supabase
      .from("fahrstunde")
      .select("id, bestaetigt_am, abgesagt_am")
      .eq("status", "geplant")
      .gt("datum", heute)
      .lte("datum", inTagen(3))
      .returns<{ id: string; bestaetigt_am: string | null; abgesagt_am: string | null }[]>(),
  ]);

  const termine = heuteRes.data ?? [];
  const offene = offeneRes.data ?? [];
  const aufgaben = aufgabenRes.data ?? [];
  const pruefungen = pruefungRes.data ?? [];
  const schueler = schuelerRes.data ?? [];
  const eingaengeMonat = (zahlungMonatRes.data ?? []).reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const kommende = bestaetigungRes.data ?? [];
  const bestaetigt = kommende.filter((t) => t.bestaetigt_am).length;

  const offenerBetrag = offene.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const ueberfaellig = offene.filter((r) => r.status === "ueberfaellig" || (r.faelligkeitsdatum && r.faelligkeitsdatum < heute));
  const ueberfaelligBetrag = ueberfaellig.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);

  // Schüler mit Handlungsbedarf – konkrete Gründe statt Zahlen
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
    .slice(0, 6);

  const aktiveTermine = termine.filter((t) => t.status !== "ausgefallen");
  const naechster = aktiveTermine.find((t) => {
    const [h, m] = t.uhrzeit.split(":").map(Number);
    return h * 60 + m >= jetztMin;
  });
  const fahrMinuten = aktiveTermine.reduce((s, t) => s + (t.dauer_minuten ?? 0), 0);
  const ueberfaelligeAufgaben = aufgaben.filter((a) => a.faellig_am && a.faellig_am < heute).length;
  const naechstePruefung = pruefungen[0];

  return (
    <div>
      <PageHeader title="Leitstand" description={wochentag()}>
        <Button asChild variant="outline" size="sm">
          <Link href="/kalender">
            <CalendarDays /> Kalender
          </Link>
        </Button>
      </PageHeader>

      <KpiRow>
        <KpiCard
          label="Fahrstunden heute"
          value={aktiveTermine.length}
          sub={
            naechster
              ? `Nächste um ${formatUhrzeit(naechster.uhrzeit)} · ${(fahrMinuten / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std. gesamt`
              : aktiveTermine.length > 0
                ? "Alle erledigt"
                : "Keine geplant"
          }
          href="/kalender"
        />
        <KpiCard
          label="Prüfungen in 7 Tagen"
          value={pruefungen.length}
          sub={naechstePruefung ? `Nächste am ${formatDatum(naechstePruefung.datum).slice(0, 6)}` : "Keine angesetzt"}
          href="/pruefungen"
        />
        <KpiCard
          label="Offene Aufgaben"
          value={aufgaben.length}
          sub={ueberfaelligeAufgaben > 0 ? `${ueberfaelligeAufgaben} überfällig` : "Keine überfällig"}
          tone={ueberfaelligeAufgaben > 0 ? "warning" : "neutral"}
          href="/aufgaben"
        />
        <KpiCard
          label="Offene Rechnungen"
          value={formatEuro(offenerBetrag)}
          sub={ueberfaellig.length > 0 ? `${formatEuro(ueberfaelligBetrag)} überfällig` : `${offene.length} Rechnungen`}
          tone={ueberfaellig.length > 0 ? "warning" : "neutral"}
          href="/rechnungen"
        />
      </KpiRow>

      <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ------------------------------------------------ Linke Spalte */}
        <div className="min-w-0 space-y-8">
          <Abschnitt
            titel="Heute"
            meta={aktiveTermine.length > 0 ? `${aktiveTermine.length} Fahrstunden` : undefined}
            aktion={<AbschnittLink href="/kalender">Zum Kalender</AbschnittLink>}
            rahmen
          >
            {termine.length === 0 ? (
              <AbschnittLeer>Heute sind keine Fahrstunden geplant.</AbschnittLeer>
            ) : (
              <ol className="divide-y divide-border">
                {termine.map((t) => {
                  const typ = FAHRSTUNDE_TYPEN[t.typ];
                  const ausgefallen = t.status === "ausgefallen";
                  const [h, m] = t.uhrzeit.split(":").map(Number);
                  const beginn = h * 60 + m;
                  const vorbei = !ausgefallen && beginn + (t.dauer_minuten ?? 45) <= jetztMin;
                  const laeuft = !ausgefallen && beginn <= jetztMin && beginn + (t.dauer_minuten ?? 45) > jetztMin;
                  const istNaechster = naechster?.id === t.id && !laeuft;
                  const name = t.fahrschueler ? `${t.fahrschueler.vorname} ${t.fahrschueler.nachname}` : typ.label;
                  return (
                    <li
                      key={t.id}
                      className={cn(
                        "grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:grid-cols-[88px_minmax(0,1fr)_170px_auto]",
                        (vorbei || ausgefallen) && "text-foreground-secondary",
                      )}
                    >
                      <span className="tabular-nums">
                        <span className={cn("block text-13 font-semibold", vorbei || ausgefallen ? "text-foreground-secondary" : "text-foreground")}>
                          {formatUhrzeit(t.uhrzeit)}
                        </span>
                        <span className="block text-xs text-foreground-tertiary">
                          bis {endeUhrzeit(t.uhrzeit, t.dauer_minuten ?? 45)}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-2">
                          {t.fahrschueler ? (
                            <Link
                              href={`/schueler/${t.fahrschueler.id}`}
                              className={cn(
                                "truncate text-13 font-medium hover:underline",
                                ausgefallen ? "text-foreground-secondary line-through" : vorbei ? "text-foreground-secondary" : "text-foreground",
                              )}
                            >
                              {name}
                            </Link>
                          ) : (
                            <span className="truncate text-13 font-medium text-foreground">{name}</span>
                          )}
                          {istNaechster && (
                            <Badge variant="default" className="hidden shrink-0 sm:inline-flex">
                              Als Nächstes
                            </Badge>
                          )}
                        </span>
                        <span className="block truncate text-xs text-foreground-secondary">
                          {typ.kurz} · {t.dauer_minuten} Min.
                          {t.fahrzeug ? ` · ${t.fahrzeug.kennzeichen}` : ""}
                        </span>
                      </span>
                      <span className="hidden truncate text-13 text-foreground-secondary sm:block">
                        {t.fahrlehrer ? `${t.fahrlehrer.vorname} ${t.fahrlehrer.nachname}` : "—"}
                      </span>
                      <span className="w-28 text-right">
                        {ausgefallen ? (
                          <StatusDot ton="neutral">Ausgefallen</StatusDot>
                        ) : t.status === "abgeschlossen" || vorbei ? (
                          <StatusDot ton="success">Gefahren</StatusDot>
                        ) : laeuft ? (
                          <StatusDot ton="primary">Läuft gerade</StatusDot>
                        ) : t.bestaetigt_am ? (
                          <StatusDot ton="neutral">Bestätigt</StatusDot>
                        ) : (
                          <StatusDot ton="warning">Unbestätigt</StatusDot>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Abschnitt>

          <Abschnitt
            titel="Braucht Aufmerksamkeit"
            meta={handlungsbedarf.length > 0 ? `${handlungsbedarf.length} Schüler` : undefined}
            aktion={<AbschnittLink href="/schueler">Alle Schüler</AbschnittLink>}
            rahmen
          >
            {handlungsbedarf.length === 0 ? (
              <AbschnittLeer>Bei keinem Schüler fehlt gerade etwas.</AbschnittLeer>
            ) : (
              <ul className="divide-y divide-border">
                {handlungsbedarf.map(({ s, gruende }) => (
                  <li key={s.id}>
                    <Link
                      href={`/schueler/${s.id}`}
                      className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-muted"
                    >
                      <span className="w-40 shrink-0 truncate text-13 font-medium text-foreground">
                        {s.vorname} {s.nachname}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                        {gruende.map((g) => (
                          <Badge key={g} variant={g.startsWith("Praxisprüfung") ? "destructive" : "secondary"}>
                            {g}
                          </Badge>
                        ))}
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-foreground-tertiary transition-transform group-hover:translate-x-0.5"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Abschnitt>
        </div>

        {/* ------------------------------------------------ Rechte Spalte */}
        <div className="min-w-0 space-y-8">
          <Abschnitt
            titel="Aufgaben"
            meta={aufgaben.length > 0 ? `${aufgaben.length} offen` : undefined}
            aktion={<AbschnittLink href="/aufgaben">Alle</AbschnittLink>}
            rahmen
          >
            {aufgaben.length === 0 ? (
              <AbschnittLeer>Keine offenen Aufgaben.</AbschnittLeer>
            ) : (
              <ul className="divide-y divide-border">
                {aufgaben.map((a) => {
                  const ueberf = a.faellig_am != null && a.faellig_am < heute;
                  const heuteFaellig = a.faellig_am === heute;
                  return (
                    <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                      <form action={aufgabeStatusSetzen}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="status" value="erledigt" />
                        <button
                          type="submit"
                          aria-label={`„${a.titel}" erledigt`}
                          className="flex h-4 w-4 items-center justify-center rounded-sm border border-border-strong bg-card text-transparent transition-colors hover:border-foreground-tertiary hover:text-foreground-secondary"
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </button>
                      </form>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-13 text-foreground">{a.titel}</span>
                        {a.prioritaet === "hoch" && <span className="block text-xs text-destructive-text">Hohe Priorität</span>}
                      </span>
                      {a.faellig_am && (
                        <span
                          className={cn(
                            "shrink-0 text-xs tabular-nums",
                            ueberf ? "font-medium text-destructive-text" : heuteFaellig ? "font-medium text-foreground" : "text-foreground-secondary",
                          )}
                        >
                          {heuteFaellig ? "Heute" : formatDatum(a.faellig_am).slice(0, 6)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Abschnitt>

          <Abschnitt titel="Prüfungen" meta="nächste 7 Tage" aktion={<AbschnittLink href="/pruefungen">Alle</AbschnittLink>} rahmen>
            {pruefungen.length === 0 ? (
              <AbschnittLeer>Keine Prüfungen in den nächsten 7 Tagen.</AbschnittLeer>
            ) : (
              <ul className="divide-y divide-border">
                {pruefungen.map((p) => {
                  const t = kurzTag(p.datum);
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-12 shrink-0 text-center tabular-nums">
                        <span className="block text-xs text-foreground-tertiary">{t.tag}</span>
                        <span className="block text-13 font-semibold text-foreground">{t.datum}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-13 font-medium text-foreground">
                          {p.fahrschueler ? `${p.fahrschueler.vorname} ${p.fahrschueler.nachname}` : "—"}
                        </span>
                        <span className="block truncate text-xs text-foreground-secondary">
                          {p.art === "praxis" ? "Praxis" : "Theorie"}
                          {p.uhrzeit ? ` · ${formatUhrzeit(p.uhrzeit)} Uhr` : ""}
                          {p.pruefstelle ? ` · ${p.pruefstelle}` : ""}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Abschnitt>

          <Abschnitt titel="Terminbestätigungen" meta="nächste 3 Tage" aktion={<AbschnittLink href="/erinnerungen">Öffnen</AbschnittLink>} rahmen>
            {kommende.length === 0 ? (
              <AbschnittLeer>In den nächsten drei Tagen sind keine Fahrstunden geplant.</AbschnittLeer>
            ) : (
              <div className="p-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-13 text-foreground">
                    <span className="text-base font-semibold tabular-nums">{bestaetigt}</span>
                    <span className="text-foreground-secondary"> von {kommende.length} bestätigt</span>
                  </p>
                  <p className="text-13 tabular-nums text-foreground-secondary">{Math.round((bestaetigt / kommende.length) * 100)} %</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-success" style={{ width: `${(bestaetigt / kommende.length) * 100}%` }} />
                </div>
                {kommende.length - bestaetigt > 0 && (
                  <p className="mt-2 text-xs text-foreground-secondary">
                    {kommende.length - bestaetigt} Schüler haben noch nicht zugesagt.
                  </p>
                )}
              </div>
            )}
          </Abschnitt>

          <Abschnitt titel="Finanzen" aktion={<AbschnittLink href="/finanzen">Übersicht</AbschnittLink>} rahmen>
            <dl className="divide-y divide-border text-13">
              <div className="flex items-center justify-between px-4 py-2.5">
                <dt className="text-foreground-secondary">Offen</dt>
                <dd className="font-medium tabular-nums text-foreground">{formatEuro(offenerBetrag)}</dd>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <dt className="text-foreground-secondary">Überfällig</dt>
                <dd className={cn("font-medium tabular-nums", ueberfaellig.length > 0 ? "text-destructive-text" : "text-foreground")}>
                  {formatEuro(ueberfaelligBetrag)}
                </dd>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <dt className="text-foreground-secondary">Eingänge diesen Monat</dt>
                <dd className="font-medium tabular-nums text-foreground">{formatEuro(eingaengeMonat)}</dd>
              </div>
            </dl>
            {ueberfaellig.length > 0 && (
              <div className="border-t border-border px-4 py-2.5">
                <Link href="/rechnungslauf" className="inline-flex items-center gap-1.5 text-13 font-medium text-primary-text hover:underline">
                  Mahnlauf starten <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </div>
            )}
          </Abschnitt>
        </div>
      </div>
    </div>
  );
}
