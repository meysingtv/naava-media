import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, FileSignature, FileText, Pencil, Smartphone } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Abschnitt, AbschnittLeer, AbschnittLink } from "@/components/ui/abschnitt";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eigenschaft, Eigenschaften } from "@/components/ui/eigenschaften";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailKopf } from "@/components/shared/detail-kopf";
import { LoeschenDialog } from "@/components/shared/loeschen-dialog";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { FAHRSTUNDE_TYPEN, RECHNUNG_STATUS, THEORIE_GRUNDSTOFF, pflichtFahrtenFuer, theoriePflichtFuer } from "@/lib/constants";
import { cn, formatDatum, formatEuro, formatUhrzeit } from "@/lib/utils";
import type { Dokument, Fahrschueler, Fahrstunde, Rate, Rechnung } from "@/lib/types";
import { darf } from "@/lib/zugriff";
import { portalZugangAktivieren, portalZugangSperren, schuelerLoeschen } from "./actions";
import { DokumenteBox } from "./dokumente-box";
import { RatenBox } from "./raten-box";

type FahrstundeDetail = Fahrstunde & {
  fahrlehrer: { vorname: string; nachname: string } | null;
  fahrzeug: { kennzeichen: string } | null;
};

function alterVon(geb: string | null): number | null {
  if (!geb) return null;
  const d = new Date(geb);
  if (Number.isNaN(d.getTime())) return null;
  const heute = new Date();
  let a = heute.getFullYear() - d.getFullYear();
  const m = heute.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && heute.getDate() < d.getDate())) a -= 1;
  return a;
}

function kurzDatum(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}

/** Fortschrittszeile: Bezeichnung, Balken, „4 von 5". */
function Fortschritt({ label, ist, soll }: { label: string; ist: number; soll: number }) {
  const prozent = soll > 0 ? Math.min(100, Math.round((ist / soll) * 100)) : 100;
  const fertig = soll > 0 && ist >= soll;
  return (
    <div className="grid grid-cols-[minmax(0,160px)_minmax(0,1fr)_72px] items-center gap-4 py-2">
      <span className="truncate text-13 text-foreground">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-muted">
        <span
          className={cn("block h-full rounded-full", fertig ? "bg-success" : "bg-primary")}
          style={{ width: `${prozent}%` }}
        />
      </span>
      <span className={cn("text-right text-13 tabular-nums", fertig ? "text-success-text" : "text-foreground-secondary")}>
        {ist} von {soll}
      </span>
    </div>
  );
}

/** Abschnitt der rechten Eigenschaftsspalte – ohne Kasten, getrennt durch Linien. */
function Seitenblock({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="py-5 first:pt-0">
      <h2 className="mb-2 text-13 font-semibold text-foreground">{titel}</h2>
      {children}
    </section>
  );
}

export async function SchuelerAkte({ schuelerId }: { schuelerId: string }) {
  const supabase = createClient();
  // Rechnungen, Raten und Kontostand nur für Rollen mit Zugriff auf Rechnungen.
  const zeigeFinanzen = await darf("/rechnungen");
  const zeigeKalender = await darf("/kalender");

  const { data: schueler } = await supabase.from("fahrschueler").select("*").eq("id", schuelerId).maybeSingle();
  if (!schueler) notFound();
  const s = schueler as Fahrschueler;

  const [fahrstundenRes, rechnungenRes, theorieRes, dokumentRes, ratenRes] = await Promise.all([
    supabase
      .from("fahrstunde")
      .select("*, fahrlehrer(vorname, nachname), fahrzeug(kennzeichen)")
      .eq("schueler_id", s.id)
      .order("datum", { ascending: false })
      .order("uhrzeit", { ascending: false })
      .returns<FahrstundeDetail[]>(),
    zeigeFinanzen
      ? supabase.from("rechnung").select("*").eq("schueler_id", s.id).order("rechnungsdatum", { ascending: false })
      : Promise.resolve({ data: [] as Rechnung[] }),
    supabase.from("theorie_teilnahme").select("id", { count: "exact", head: true }).eq("schueler_id", s.id).eq("anwesend", true),
    supabase
      .from("dokument")
      .select("id, name, kategorie, mime, groesse, datei")
      .eq("schueler_id", s.id)
      .order("created_at", { ascending: false })
      .returns<Pick<Dokument, "id" | "name" | "kategorie" | "mime" | "groesse" | "datei">[]>(),
    zeigeFinanzen
      ? supabase
          .from("rate")
          .select("id, betrag, faellig_am, bezahlt, notiz")
          .eq("schueler_id", s.id)
          .order("faellig_am", { ascending: true, nullsFirst: false })
          .returns<Pick<Rate, "id" | "betrag" | "faellig_am" | "bezahlt" | "notiz">[]>()
      : Promise.resolve({ data: [] as Pick<Rate, "id" | "betrag" | "faellig_am" | "bezahlt" | "notiz">[] }),
  ]);

  const fahrstunden = fahrstundenRes.data ?? [];
  const rechnungen = (rechnungenRes.data ?? []) as Rechnung[];
  const dokumente = dokumentRes.data ?? [];
  const raten = ratenRes.data ?? [];

  const heute = new Date().toISOString().slice(0, 10);
  const abgeschlossen = fahrstunden.filter((f) => f.status === "abgeschlossen");
  const zaehle = (typ: Fahrstunde["typ"]) => abgeschlossen.filter((f) => f.typ === typ).length;
  const ueberland = zaehle("ueberland");
  const autobahn = zaehle("autobahn");
  const nacht = zaehle("nacht");
  const fehlstunden = fahrstunden.filter((f) => f.status === "ausgefallen").length;
  const kommende = fahrstunden
    .filter((f) => f.status === "geplant" && f.datum >= heute)
    .sort((a, b) => (a.datum + a.uhrzeit).localeCompare(b.datum + b.uhrzeit))
    .slice(0, 5);

  const primaerKlasse = s.fuehrerscheinklassen?.[0] ?? "B";
  const pflicht = pflichtFahrtenFuer(primaerKlasse);
  const theorieBesucht = theorieRes.count ?? 0;
  const zusatzSoll = Math.max(theoriePflichtFuer(primaerKlasse) - THEORIE_GRUNDSTOFF, 0);
  const sonderfahrtenOk = ueberland >= pflicht.ueberland && autobahn >= pflicht.autobahn && nacht >= pflicht.nacht;
  const pruefungsreif = s.theorie_bestanden && sonderfahrtenOk;

  const gesamt = rechnungen.reduce((sum, r) => sum + Number(r.betrag_brutto ?? 0), 0);
  const bezahlt = rechnungen.filter((r) => r.status === "bezahlt").reduce((sum, r) => sum + Number(r.betrag_brutto ?? 0), 0);
  const offen = gesamt - bezahlt;

  const lehrerNamen = Array.from(
    new Set(fahrstunden.filter((f) => f.fahrlehrer).map((f) => `${f.fahrlehrer!.vorname} ${f.fahrlehrer!.nachname}`)),
  );
  const alter = alterVon(s.geburtsdatum);

  // Ausbildungsprozess: Stufen mit Status
  type Stufe = { key: string; label: string; sub: string; status: "done" | "current" | "todo" };
  const stufen: Stufe[] = [
    { key: "anmeldung", label: "Anmeldung", sub: formatDatum(s.anmeldedatum), status: "done" },
    {
      key: "theorie",
      label: "Theorie",
      sub: s.theorie_bestanden ? "Bestanden" : `${theorieBesucht} von ${THEORIE_GRUNDSTOFF} Lektionen`,
      status: s.theorie_bestanden ? "done" : "current",
    },
    {
      key: "sonder",
      label: "Sonderfahrten",
      sub: `${Math.min(ueberland, pflicht.ueberland) + Math.min(autobahn, pflicht.autobahn) + Math.min(nacht, pflicht.nacht)} von ${pflicht.ueberland + pflicht.autobahn + pflicht.nacht}`,
      status: sonderfahrtenOk ? "done" : s.theorie_bestanden ? "current" : "todo",
    },
    { key: "reif", label: "Prüfungsreif", sub: pruefungsreif ? "Ja" : "Noch nicht", status: pruefungsreif ? "done" : "todo" },
    {
      key: "praxis",
      label: "Praxisprüfung",
      sub: s.ausbildung_beendet ? "Bestanden" : s.pruefung_termin ? formatDatum(s.pruefung_termin) : "Kein Termin",
      status: s.ausbildung_beendet ? "done" : pruefungsreif ? "current" : "todo",
    },
    {
      key: "fertig",
      label: "Führerschein",
      sub: s.ausbildung_beendet ? "Ausgehändigt" : "Offen",
      status: s.ausbildung_beendet ? "done" : "todo",
    },
  ];
  if (!stufen.some((x) => x.status === "current")) {
    const idx = stufen.findIndex((x) => x.status === "todo");
    if (idx >= 0) stufen[idx].status = "current";
  }

  const unterlagen = [
    { label: "Sehtest", ok: Boolean(s.sehtest_am), datum: s.sehtest_am },
    { label: "Erste-Hilfe-Kurs", ok: Boolean(s.erste_hilfe_am), datum: s.erste_hilfe_am },
    { label: "Passbild", ok: s.passbild_ok, datum: null },
    { label: "Ausweiskopie", ok: s.ausweis_ok, datum: null },
    { label: "Antrag bei der Behörde", ok: Boolean(s.antrag_gestellt_am), datum: s.antrag_gestellt_am },
  ];

  return (
    <div>
      <DetailKopf
        zurueck={{ href: "/schueler", label: "Schüler" }}
        bild={<SchuelerAvatar vorname={s.vorname} nachname={s.nachname} className="h-11 w-11 text-sm" />}
        titel={`${s.vorname} ${s.nachname}`}
        status={
          s.ausbildung_beendet ? (
            <Badge variant="secondary">Abgeschlossen</Badge>
          ) : pruefungsreif ? (
            <Badge variant="success">Prüfungsreif</Badge>
          ) : (
            <Badge variant="default">In Ausbildung</Badge>
          )
        }
        meta={[
          `Klasse ${s.fuehrerscheinklassen?.join(", ") || "—"}`,
          s.kundennummer != null ? `Kd.-Nr. ${s.kundennummer}` : null,
          alter != null ? `${alter} Jahre` : null,
          s.filiale,
          `Angemeldet am ${formatDatum(s.anmeldedatum)}`,
        ]}
        aktionen={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/schueler/${s.id}/bearbeiten`}>
                <Pencil /> Bearbeiten
              </Link>
            </Button>
            <LoeschenDialog
              action={schuelerLoeschen}
              id={s.id}
              titel="Schüler löschen?"
              beschreibung="Der Schüler und alle zugehörigen Daten werden dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden."
              buttonLabel=""
            />
          </>
        }
      >
        {/* Ausbildungsweg – sechs Stufen als geteilte Leiste */}
        <ol className="mt-6 grid grid-cols-2 overflow-hidden rounded-xl bg-card shadow-panel sm:grid-cols-3 xl:grid-cols-6">
          {stufen.map((st) => (
            <li
              key={st.key}
              className="relative px-4 pb-3 pt-4 shadow-[-1px_0_0_0_hsl(var(--border)),0_-1px_0_0_hsl(var(--border))]"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 top-0 h-0.5",
                  st.status === "done" ? "bg-success" : st.status === "current" ? "bg-primary" : "bg-transparent",
                )}
              />
              <div className="flex items-center gap-2">
                {st.status === "done" ? (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success text-white">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-4 w-4 shrink-0 rounded-full border-[1.5px]",
                      st.status === "current" ? "border-primary bg-primary-soft" : "border-border-strong",
                    )}
                  />
                )}
                <span className={cn("truncate text-13 font-medium", st.status === "todo" ? "text-foreground-secondary" : "text-foreground")}>
                  {st.label}
                </span>
                <span className="sr-only">
                  {st.status === "done" ? "erledigt" : st.status === "current" ? "aktuell" : "offen"}
                </span>
              </div>
              <p className="mt-1 truncate pl-6 text-xs tabular-nums text-foreground-tertiary">{st.sub}</p>
            </li>
          ))}
        </ol>
      </DetailKopf>

      <Tabs defaultValue="uebersicht">
        <TabsList>
          <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
          <TabsTrigger value="fahrstunden" count={fahrstunden.length}>
            Fahrstunden
          </TabsTrigger>
          {zeigeFinanzen && (
            <TabsTrigger value="rechnungen" count={rechnungen.length}>
              Rechnungen
            </TabsTrigger>
          )}
          <TabsTrigger value="dokumente" count={dokumente.length}>
            Dokumente
          </TabsTrigger>
          <TabsTrigger value="portal">Portal</TabsTrigger>
        </TabsList>

        {/* ---------------- Übersicht ---------------- */}
        <TabsContent value="uebersicht" className="mt-6">
          <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 space-y-8">
              <Abschnitt titel="Ausbildungsstand" meta={`Klasse ${primaerKlasse}`} rahmen>
                <div className="px-4 py-2">
                  <Fortschritt label="Theorie · Grundstoff" ist={theorieBesucht} soll={THEORIE_GRUNDSTOFF} />
                  {zusatzSoll > 0 && <Fortschritt label="Theorie · Zusatzstoff" ist={0} soll={zusatzSoll} />}
                  <Fortschritt label="Überlandfahrten" ist={ueberland} soll={pflicht.ueberland} />
                  <Fortschritt label="Autobahnfahrten" ist={autobahn} soll={pflicht.autobahn} />
                  <Fortschritt label="Nachtfahrten" ist={nacht} soll={pflicht.nacht} />
                </div>
                <dl className="grid grid-cols-3 border-t border-border">
                  {[
                    { label: "Übungsstunden", wert: String(zaehle("normal")) },
                    { label: "Fehlstunden", wert: String(fehlstunden) },
                    { label: "Lernstand Theorie-App", wert: `${s.lernstatus ?? 0} %` },
                  ].map((k, i) => (
                    <div key={k.label} className={cn("px-4 py-3", i > 0 && "border-l border-border")}>
                      <dt className="truncate text-xs text-foreground-secondary">{k.label}</dt>
                      <dd className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{k.wert}</dd>
                    </div>
                  ))}
                </dl>
              </Abschnitt>

              <Abschnitt
                titel="Nächste Fahrstunden"
                aktion={zeigeKalender ? <AbschnittLink href="/kalender">Kalender öffnen</AbschnittLink> : undefined}
                rahmen
              >
                {kommende.length === 0 ? (
                  <AbschnittLeer>Keine Fahrstunden geplant.</AbschnittLeer>
                ) : (
                  <ul className="divide-y divide-border">
                    {kommende.map((f) => (
                      <li key={f.id} className="flex items-center gap-4 px-4 py-3">
                        <span className="w-24 shrink-0 tabular-nums">
                          <span className="block text-13 font-medium text-foreground">{kurzDatum(f.datum)}</span>
                          <span className="block text-xs text-foreground-secondary">{formatUhrzeit(f.uhrzeit)} Uhr</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-13 font-medium text-foreground">{FAHRSTUNDE_TYPEN[f.typ].label}</span>
                          <span className="block truncate text-xs text-foreground-secondary">
                            {f.fahrlehrer ? `${f.fahrlehrer.vorname} ${f.fahrlehrer.nachname}` : "Kein Fahrlehrer"}
                            {f.fahrzeug ? ` · ${f.fahrzeug.kennzeichen}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-13 tabular-nums text-foreground-secondary">{f.dauer_minuten} Min.</span>
                        <span className="w-28 shrink-0 text-right">
                          {f.bestaetigt_am ? (
                            <StatusDot ton="success">Bestätigt</StatusDot>
                          ) : (
                            <StatusDot ton="warning">Unbestätigt</StatusDot>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Abschnitt>

              {s.notizen && (
                <Abschnitt titel="Notizen" rahmen>
                  <p className="whitespace-pre-wrap px-4 py-3 text-13 text-foreground">{s.notizen}</p>
                </Abschnitt>
              )}
            </div>

            {/* Eigenschaftsspalte */}
            <aside className="min-w-0 self-start divide-y divide-border rounded-xl bg-card px-5 py-5 shadow-panel">
              <Seitenblock titel="Kontakt">
                <Eigenschaften breite="schmal">
                  <Eigenschaft label="Telefon">
                    {s.telefon && (
                      <a href={`tel:${s.telefon.replace(/\s/g, "")}`} className="hover:underline">
                        {s.telefon}
                      </a>
                    )}
                  </Eigenschaft>
                  <Eigenschaft label="E-Mail">
                    {s.email && (
                      <a href={`mailto:${s.email}`} className="block truncate hover:underline">
                        {s.email}
                      </a>
                    )}
                  </Eigenschaft>
                  <Eigenschaft label="Adresse">
                    {(s.strasse || s.ort) && (
                      <span>
                        {s.strasse}
                        {s.strasse && <br />}
                        {[s.plz, s.ort].filter(Boolean).join(" ")}
                      </span>
                    )}
                  </Eigenschaft>
                  <Eigenschaft label="Geburtstag">{s.geburtsdatum ? formatDatum(s.geburtsdatum) : null}</Eigenschaft>
                </Eigenschaften>
              </Seitenblock>

              <Seitenblock titel="Ausbildung">
                <Eigenschaften breite="schmal">
                  <Eigenschaft label="Fahrlehrer">{lehrerNamen.length ? lehrerNamen.join(", ") : null}</Eigenschaft>
                  <Eigenschaft label="Prüfstelle">{s.prueforganisation}</Eigenschaft>
                  <Eigenschaft label="Theorie">
                    {s.theorie_bestanden
                      ? "Bestanden"
                      : s.theorie_termin
                        ? `${formatDatum(s.theorie_termin)} · ${s.theorie_versuch ?? 1}. Versuch`
                        : null}
                  </Eigenschaft>
                  <Eigenschaft label="Praxis">
                    {s.ausbildung_beendet
                      ? "Bestanden"
                      : s.pruefung_termin
                        ? `${formatDatum(s.pruefung_termin)} · ${s.praxis_versuch ?? 1}. Versuch`
                        : null}
                  </Eigenschaft>
                  {zeigeFinanzen && <Eigenschaft label="Preisliste">{s.preisliste}</Eigenschaft>}
                  {zeigeFinanzen && <Eigenschaft label="Kostenträger">{s.kostentraeger}</Eigenschaft>}
                </Eigenschaften>
              </Seitenblock>

              <Seitenblock titel="Unterlagen">
                <ul className="space-y-0.5">
                  {unterlagen.map((u) => (
                    <li key={u.label} className="flex items-center justify-between gap-3 py-1 text-13">
                      <span className="flex min-w-0 items-center gap-2">
                        {u.ok ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.5} aria-label="vorhanden" />
                        ) : (
                          <span aria-label="fehlt" className="mx-[3px] h-2 w-2 shrink-0 rounded-full border-[1.5px] border-warning" />
                        )}
                        <span className={cn("truncate", u.ok ? "text-foreground" : "text-foreground-secondary")}>{u.label}</span>
                      </span>
                      <span className={cn("shrink-0 text-xs tabular-nums", u.ok ? "text-foreground-tertiary" : "text-warning-text")}>
                        {u.datum ? formatDatum(u.datum) : u.ok ? "Liegt vor" : "Fehlt"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Seitenblock>

              {zeigeFinanzen && (
                <Seitenblock titel="Konto">
                  <Eigenschaften breite="schmal">
                    <Eigenschaft label="Berechnet" className="tabular-nums">{formatEuro(gesamt)}</Eigenschaft>
                    <Eigenschaft label="Bezahlt" className="tabular-nums">{formatEuro(bezahlt)}</Eigenschaft>
                    <Eigenschaft label="Offen" className={cn("font-semibold tabular-nums", offen > 0 && "text-foreground")}>
                      {formatEuro(offen)}
                    </Eigenschaft>
                  </Eigenschaften>
                </Seitenblock>
              )}
            </aside>
          </div>
        </TabsContent>

        {/* ---------------- Fahrstunden ---------------- */}
        <TabsContent value="fahrstunden" className="mt-6">
          {fahrstunden.length === 0 ? (
            <div className="rounded-xl shadow-panel">
              <AbschnittLeer>Noch keine Fahrstunden. Termine legst du im Kalender an.</AbschnittLeer>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl bg-card shadow-panel">
              <Table>
                <TableHeader className="static">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Datum</TableHead>
                    <TableHead>Uhrzeit</TableHead>
                    <TableHead>Art</TableHead>
                    <TableHead className="hidden md:table-cell">Fahrlehrer</TableHead>
                    <TableHead className="hidden lg:table-cell">Fahrzeug</TableHead>
                    <TableHead align="right">Dauer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Unterschrift</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fahrstunden.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{formatDatum(f.datum)}</TableCell>
                      <TableCell muted>{formatUhrzeit(f.uhrzeit)}</TableCell>
                      <TableCell>{FAHRSTUNDE_TYPEN[f.typ].label}</TableCell>
                      <TableCell muted className="hidden md:table-cell">
                        {f.fahrlehrer ? `${f.fahrlehrer.vorname} ${f.fahrlehrer.nachname}` : "—"}
                      </TableCell>
                      <TableCell muted className="hidden lg:table-cell">
                        {f.fahrzeug?.kennzeichen ?? "—"}
                      </TableCell>
                      <TableCell numeric muted>
                        {f.dauer_minuten} Min.
                      </TableCell>
                      <TableCell>
                        {f.status === "abgeschlossen" ? (
                          <StatusDot ton="success">Gefahren</StatusDot>
                        ) : f.status === "ausgefallen" ? (
                          <StatusDot ton="neutral">Ausgefallen</StatusDot>
                        ) : (
                          <StatusDot ton="primary">Geplant</StatusDot>
                        )}
                      </TableCell>
                      <TableCell muted className="hidden sm:table-cell">
                        {f.unterschrift ? "Liegt vor" : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ---------------- Rechnungen ---------------- */}
        {zeigeFinanzen && (
          <TabsContent value="rechnungen" className="mt-6 space-y-8">
            <KpiRow cols={3}>
              <KpiCard label="Berechnet" value={formatEuro(gesamt)} sub={`${rechnungen.length} Rechnungen`} />
              <KpiCard label="Bezahlt" value={formatEuro(bezahlt)} sub={`${rechnungen.filter((r) => r.status === "bezahlt").length} Rechnungen`} />
              <KpiCard
                label="Offen"
                value={formatEuro(offen)}
                sub={`${rechnungen.filter((r) => r.status !== "bezahlt").length} Rechnungen`}
                tone={rechnungen.some((r) => r.status === "ueberfaellig") ? "destructive" : "neutral"}
              />
            </KpiRow>

            <Abschnitt
              titel="Rechnungen"
              aktion={
                <Button asChild variant="outline" size="sm">
                  <Link href="/rechnungen/neu">Rechnung schreiben</Link>
                </Button>
              }
              rahmen
            >
              {rechnungen.length === 0 ? (
                <AbschnittLeer>Noch keine Rechnungen für diesen Schüler.</AbschnittLeer>
              ) : (
                <Table>
                  <TableHeader className="static">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Nummer</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead className="hidden sm:table-cell">Fällig</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead align="right">Betrag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rechnungen.map((r) => {
                      const status = RECHNUNG_STATUS[r.status];
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            <Link href={`/rechnungen/${r.id}`} className="hover:underline">
                              {r.nummer}
                            </Link>
                          </TableCell>
                          <TableCell muted>{formatDatum(r.rechnungsdatum)}</TableCell>
                          <TableCell muted className="hidden sm:table-cell">
                            {formatDatum(r.faelligkeitsdatum)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell numeric className="font-medium">
                            {formatEuro(Number(r.betrag_brutto))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Abschnitt>

            <RatenBox schuelerId={s.id} raten={raten} />
          </TabsContent>
        )}

        {/* ---------------- Dokumente ---------------- */}
        <TabsContent value="dokumente" className="mt-6 space-y-8">
          <Abschnitt titel="Nachweise und Verträge">
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={`/schueler/${s.id}/ausbildungsnachweis`}
                className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-panel transition-shadow hover:shadow-[0_0_0_1px_hsl(var(--border-hover))]"
              >
                <FileText className="h-5 w-5 shrink-0 text-foreground-tertiary" strokeWidth={1.5} />
                <span className="min-w-0">
                  <span className="block text-13 font-medium text-foreground">Ausbildungsnachweis</span>
                  <span className="block text-xs text-foreground-secondary">Alle Fahrstunden mit Unterschrift</span>
                </span>
              </Link>
              <Link
                href={`/schueler/${s.id}/vertrag`}
                className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-panel transition-shadow hover:shadow-[0_0_0_1px_hsl(var(--border-hover))]"
              >
                <FileSignature className="h-5 w-5 shrink-0 text-foreground-tertiary" strokeWidth={1.5} />
                <span className="min-w-0">
                  <span className="block text-13 font-medium text-foreground">Ausbildungsvertrag</span>
                  <span className="block text-xs text-foreground-secondary">
                    {s.vertrag_am ? `Unterschrieben am ${formatDatum(s.vertrag_am)}` : "Noch nicht unterschrieben"}
                  </span>
                </span>
              </Link>
            </div>
          </Abschnitt>
          <DokumenteBox schuelerId={s.id} dokumente={dokumente} />
        </TabsContent>

        {/* ---------------- Portal ---------------- */}
        <TabsContent value="portal" className="mt-6">
          <Abschnitt titel="Schülerportal" rahmen className="max-w-2xl">
            {s.portal_aktiv ? (
              <div className="space-y-4 p-4">
                <Eigenschaften>
                  <Eigenschaft label="Status">
                    {s.user_id ? <Badge variant="success">Verbunden</Badge> : <Badge variant="warning">Wartet auf Anmeldung</Badge>}
                  </Eigenschaft>
                  <Eigenschaft label="Zugangscode">
                    {s.portal_code && (
                      <span className="font-mono text-sm font-semibold tracking-[0.2em] text-foreground">{s.portal_code}</span>
                    )}
                  </Eigenschaft>
                </Eigenschaften>
                <p className="text-13 text-foreground-secondary">
                  Der Schüler meldet sich im Portal mit E-Mail, Passwort und diesem Code an.
                </p>
                <form action={portalZugangSperren}>
                  <input type="hidden" name="id" value={s.id} />
                  <Button type="submit" variant="outline" size="sm" className="text-destructive-text">
                    Zugang sperren
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-4 p-4">
                <p className="text-13 text-foreground-secondary">
                  Mit dem Portal sieht der Schüler seine Termine, seinen Fortschritt und seine Rechnungen.
                </p>
                <form action={portalZugangAktivieren}>
                  <input type="hidden" name="id" value={s.id} />
                  <Button type="submit" size="sm">
                    <Smartphone /> Portal-Zugang aktivieren
                  </Button>
                </form>
              </div>
            )}
          </Abschnitt>
        </TabsContent>
      </Tabs>
    </div>
  );
}
