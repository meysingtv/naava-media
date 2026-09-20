import Link from "next/link";
import { ArrowRight, Check, ClipboardCheck, ListChecks } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
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
  return new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
}

type AufgabeRow = Aufgabe & { fahrschueler: Pick<Fahrschueler, "vorname" | "nachname"> | null };
type PruefungRow = Pruefung & { fahrschueler: Pick<Fahrschueler, "id" | "vorname" | "nachname"> | null };

/** Abschnitts-Titel im Leitstand: Versalien-Label + optionaler Link rechts. */
function Abschnitt({
  label,
  href,
  hrefLabel,
  children,
  className,
}: {
  label: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0", className)}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="label-caps">{label}</h2>
        {href && (
          <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-primary-text hover:underline">
            {hrefLabel ?? "Alle"} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function LeitstandPage() {
  const supabase = createClient();
  const heute = iso(new Date());
  const inSieben = inTagen(7);
  const jetztMin = new Date().getHours() * 60 + new Date().getMinutes();

  const [heuteRes, offeneRes, aufgabenRes, pruefungRes, schuelerRes, zahlungMonatRes] = await Promise.all([
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
  ]);

  const termine = heuteRes.data ?? [];
  const offene = offeneRes.data ?? [];
  const aufgaben = aufgabenRes.data ?? [];
  const pruefungen = pruefungRes.data ?? [];
  const schueler = schuelerRes.data ?? [];
  const eingaengeMonat = (zahlungMonatRes.data ?? []).reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);

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
      if (!s.erste_hilfe_am) gruende.push("Erste-Hilfe fehlt");
      if (!s.passbild_ok) gruende.push("Passbild fehlt");
      return { s, gruende };
    })
    .filter((x) => x.gruende.length > 0)
    .sort((a, b) => b.gruende.length - a.gruende.length)
    .slice(0, 6);

  const naechster = termine.find((t) => {
    const [h, m] = t.uhrzeit.split(":").map(Number);
    return t.status !== "ausgefallen" && h * 60 + m >= jetztMin;
  });

  const ueberfaelligeAufgaben = aufgaben.filter((a) => a.faellig_am && a.faellig_am < heute).length;

  return (
    <div className="space-y-6">
      {/* Kopfzeile (56 px) + Kennzahlen – keine Begrüßung, kein Vorname im Inhalt */}
      <PageHeader
        title="Leitstand"
        description={wochentag()}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/kalender">Kalender</Link>
          </Button>
        }
      />

      <KpiRow>
        <KpiCard
          label="Termine heute"
          value={termine.length}
          sub={naechster ? `Nächster ${formatUhrzeit(naechster.uhrzeit)}` : "Keine weiteren"}
          href="/kalender"
        />
        <KpiCard
          label="Prüfungen · 7 Tage"
          value={pruefungen.length}
          sub={pruefungen.length === 1 ? "1 Termin" : `${pruefungen.length} Termine`}
          href="/pruefungen"
        />
        <KpiCard
          label="Offene Aufgaben"
          value={aufgaben.length}
          sub={`${ueberfaelligeAufgaben} überfällig`}
          tone={ueberfaelligeAufgaben > 0 ? "warning" : "neutral"}
          href="/aufgaben"
        />
        <KpiCard
          label="Offene Beträge"
          value={formatEuro(offenerBetrag)}
          sub={`${ueberfaellig.length} überfällig`}
          tone={ueberfaellig.length > 0 ? "destructive" : "neutral"}
          href="/finanzen"
        />
      </KpiRow>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* Linke Spalte: Heute als Zeitachse */}
        <div className="space-y-6">
          <Abschnitt label="Heute" href="/kalender" hrefLabel="Kalender">
            <div className="rounded-xl bg-card shadow-panel">
              {termine.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">Heute sind keine Termine geplant.</p>
              ) : (
                <ol className="divide-y">
                  {termine.map((t) => {
                    const typ = FAHRSTUNDE_TYPEN[t.typ];
                    const ausgefallen = t.status === "ausgefallen";
                    const istNaechster = naechster?.id === t.id;
                    const name = t.fahrschueler ? `${t.fahrschueler.vorname} ${t.fahrschueler.nachname}` : typ.label;
                    return (
                      <li key={t.id} className={cn("flex items-stretch gap-3 px-4", istNaechster && "bg-primary-soft/40")}>
                        <div className="w-12 shrink-0 py-3 text-[13px] font-semibold tabular-nums text-foreground">
                          {formatUhrzeit(t.uhrzeit)}
                        </div>
                        <div className={cn("my-2.5 w-0.5 shrink-0 rounded-full", ausgefallen ? "bg-border-strong" : typ.dot)} />
                        <div className="min-w-0 flex-1 py-3">
                          <div className="flex items-center gap-2">
                            <p className={cn("truncate text-[13px] font-medium text-foreground", ausgefallen && "line-through text-muted-foreground")}>
                              {name}
                            </p>
                            {istNaechster && (
                              <Badge variant="default">
                                als Nächstes
                              </Badge>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {typ.kurz} · {t.dauer_minuten} Min
                            {t.fahrlehrer ? ` · ${t.fahrlehrer.vorname} ${t.fahrlehrer.nachname}` : ""}
                            {t.fahrzeug ? ` · ${t.fahrzeug.kennzeichen}` : ""}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </Abschnitt>

          <Abschnitt label="Schüler mit Handlungsbedarf" href="/schueler" hrefLabel="Alle Schüler">
            {handlungsbedarf.length === 0 ? (
              <p className="rounded-xl bg-card shadow-panel px-4 py-8 text-center text-[13px] text-muted-foreground">
                Alles im grünen Bereich – kein Schüler braucht gerade Aufmerksamkeit.
              </p>
            ) : (
              <ul className="divide-y rounded-xl bg-card shadow-panel">
                {handlungsbedarf.map(({ s, gruende }) => (
                  <li key={s.id}>
                    <Link href={`/schueler?id=${s.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-muted">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-foreground">
                          {s.vorname} {s.nachname}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{gruende.join(" · ")}</span>
                      </span>
                      <span className={cn("shrink-0 text-xs font-medium tabular-nums", gruende.length >= 3 ? "text-destructive" : "text-warning")}>
                        {gruende.length} {gruende.length === 1 ? "Punkt" : "Punkte"}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Abschnitt>
        </div>

        {/* Rechte Spalte */}
        <div className="space-y-6">
          <Abschnitt label="Aufgaben" href="/aufgaben">
            {aufgaben.length === 0 ? (
              <p className="rounded-xl bg-card shadow-panel px-4 py-8 text-center text-[13px] text-muted-foreground">Keine offenen Aufgaben.</p>
            ) : (
              <ul className="divide-y rounded-xl bg-card shadow-panel">
                {aufgaben.map((a) => {
                  const ueberf = a.faellig_am != null && a.faellig_am < heute;
                  return (
                    <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                      <form action={aufgabeStatusSetzen}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="status" value="erledigt" />
                        <button
                          type="submit"
                          aria-label="Erledigt"
                          className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-border-strong bg-card text-transparent transition-colors hover:border-primary hover:text-primary"
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </button>
                      </form>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{a.titel}</span>
                      {a.faellig_am && (
                        <span className={cn("shrink-0 text-xs tabular-nums", ueberf ? "font-medium text-destructive" : "text-muted-foreground")}>
                          {formatDatum(a.faellig_am)}
                        </span>
                      )}
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          a.prioritaet === "hoch" ? "bg-destructive" : a.prioritaet === "mittel" ? "bg-warning" : "bg-border-strong",
                        )}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </Abschnitt>

          <Abschnitt label="Prüfungen · nächste 7 Tage" href="/pruefungen">
            {pruefungen.length === 0 ? (
              <p className="rounded-xl bg-card shadow-panel px-4 py-6 text-center text-[13px] text-muted-foreground">
                <ClipboardCheck className="mx-auto mb-1 h-4 w-4" strokeWidth={1.75} />
                Keine Prüfungen in den nächsten 7 Tagen.
              </p>
            ) : (
              <ul className="divide-y rounded-xl bg-card shadow-panel">
                {pruefungen.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                    <span className="w-14 shrink-0 font-semibold tabular-nums">{formatDatum(p.datum).slice(0, 5)}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {p.fahrschueler ? `${p.fahrschueler.vorname} ${p.fahrschueler.nachname}` : "—"}
                      <span className="text-muted-foreground"> · {p.art === "praxis" ? "Praxis" : "Theorie"}</span>
                    </span>
                    {p.pruefstelle && <span className="shrink-0 text-xs text-muted-foreground">{p.pruefstelle}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Abschnitt>

          <Abschnitt label="Finanzstatus" href="/finanzen" hrefLabel="Finanzen">
            <div className="rounded-xl bg-card shadow-panel px-4 py-3">
              <dl className="grid grid-cols-3 divide-x">
                <div className="pr-3">
                  <dt className="text-xs text-muted-foreground">Offen</dt>
                  <dd className="text-[15px] font-semibold tabular-nums text-foreground">{formatEuro(offenerBetrag)}</dd>
                  <dd className="text-xs text-muted-foreground">{offene.length} Rechnungen</dd>
                </div>
                <div className="px-3">
                  <dt className="text-xs text-muted-foreground">Überfällig</dt>
                  <dd className={cn("text-[15px] font-semibold tabular-nums", ueberfaellig.length > 0 ? "text-destructive" : "text-foreground")}>
                    {formatEuro(ueberfaelligBetrag)}
                  </dd>
                  <dd className="text-xs text-muted-foreground">{ueberfaellig.length} Rechnungen</dd>
                </div>
                <div className="pl-3">
                  <dt className="text-xs text-muted-foreground">Eingänge Monat</dt>
                  <dd className="text-[15px] font-semibold tabular-nums text-success">{formatEuro(eingaengeMonat)}</dd>
                  <dd className="text-xs text-muted-foreground">bezahlt</dd>
                </div>
              </dl>
              {ueberfaellig.length > 0 && (
                <Link href="/rechnungslauf" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary-text hover:underline">
                  <ListChecks className="h-3.5 w-3.5" /> Mahnlauf starten
                </Link>
              )}
            </div>
          </Abschnitt>
        </div>
      </div>
    </div>
  );
}
