import Link from "next/link";
import { Check, ChevronLeft, FileSignature, FileText, Mail, MapPin, Pencil, Phone, Smartphone } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { LoeschenDialog } from "@/components/shared/loeschen-dialog";
import { FAHRSTUNDE_TYPEN, RECHNUNG_STATUS, THEORIE_GRUNDSTOFF, pflichtFahrtenFuer, theoriePflichtFuer } from "@/lib/constants";
import { cn, formatDatum, formatEuro, formatUhrzeit, initialen } from "@/lib/utils";
import type { Dokument, Fahrschueler, Fahrstunde, Rate, Rechnung } from "@/lib/types";
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

/** Kompakte Datenzeile: Label links, Wert rechts. */
function Zeile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  );
}

/** Fortschrittsbalken mit Soll/Ist. */
function Balken({ label, ist, soll }: { label: string; ist: number; soll: number }) {
  const prozent = soll > 0 ? Math.min(100, Math.round((ist / soll) * 100)) : 100;
  const fertig = ist >= soll;
  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-center justify-between text-[13px]">
        <span className="text-foreground">{label}</span>
        <span className={cn("tabular-nums", fertig ? "font-semibold text-success" : "text-muted-foreground")}>
          {ist} / {soll}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div className={cn("h-full rounded-full", fertig ? "bg-success" : "bg-primary")} style={{ width: `${prozent}%` }} />
      </div>
    </div>
  );
}

/** Panel-Abschnitt in der Akte. */
function Block({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card px-4 py-3", className)}>
      <h3 className="label-caps mb-1.5">{title}</h3>
      {children}
    </section>
  );
}

export async function SchuelerAkte({ schuelerId }: { schuelerId: string }) {
  const supabase = createClient();

  const { data: schueler } = await supabase.from("fahrschueler").select("*").eq("id", schuelerId).maybeSingle();
  if (!schueler) {
    return <div className="rounded-xl border bg-card p-6 text-[13px] text-muted-foreground">Schüler nicht gefunden.</div>;
  }
  const s = schueler as Fahrschueler;

  const [fahrstundenRes, rechnungenRes, theorieRes, dokumentRes, ratenRes] = await Promise.all([
    supabase
      .from("fahrstunde")
      .select("*, fahrlehrer(vorname, nachname), fahrzeug(kennzeichen)")
      .eq("schueler_id", s.id)
      .order("datum", { ascending: false })
      .order("uhrzeit", { ascending: false })
      .returns<FahrstundeDetail[]>(),
    supabase.from("rechnung").select("*").eq("schueler_id", s.id).order("rechnungsdatum", { ascending: false }),
    supabase.from("theorie_teilnahme").select("id", { count: "exact", head: true }).eq("schueler_id", s.id).eq("anwesend", true),
    supabase
      .from("dokument")
      .select("id, name, kategorie, mime, groesse, datei")
      .eq("schueler_id", s.id)
      .order("created_at", { ascending: false })
      .returns<Pick<Dokument, "id" | "name" | "kategorie" | "mime" | "groesse" | "datei">[]>(),
    supabase
      .from("rate")
      .select("id, betrag, faellig_am, bezahlt, notiz")
      .eq("schueler_id", s.id)
      .order("faellig_am", { ascending: true, nullsFirst: false })
      .returns<Pick<Rate, "id" | "betrag" | "faellig_am" | "bezahlt" | "notiz">[]>(),
  ]);

  const fahrstunden = fahrstundenRes.data ?? [];
  const rechnungen = (rechnungenRes.data ?? []) as Rechnung[];
  const dokumente = dokumentRes.data ?? [];
  const raten = ratenRes.data ?? [];

  const abgeschlossen = fahrstunden.filter((f) => f.status === "abgeschlossen");
  const zaehle = (typ: Fahrstunde["typ"]) => abgeschlossen.filter((f) => f.typ === typ).length;
  const ueberland = zaehle("ueberland");
  const autobahn = zaehle("autobahn");
  const nacht = zaehle("nacht");
  const fehlstunden = fahrstunden.filter((f) => f.status === "ausgefallen").length;

  const primaerKlasse = s.fuehrerscheinklassen?.[0] ?? "B";
  const pflicht = pflichtFahrtenFuer(primaerKlasse);
  const theorieBesucht = theorieRes.count ?? 0;
  const zusatzSoll = Math.max(theoriePflichtFuer(primaerKlasse) - THEORIE_GRUNDSTOFF, 0);
  const sonderfahrtenOk = ueberland >= pflicht.ueberland && autobahn >= pflicht.autobahn && nacht >= pflicht.nacht;
  const pruefungsreif = s.theorie_bestanden && sonderfahrtenOk;

  const gesamt = rechnungen.reduce((sum, r) => sum + Number(r.betrag_brutto ?? 0), 0);
  const bezahlt = rechnungen.filter((r) => r.status === "bezahlt").reduce((sum, r) => sum + Number(r.betrag_brutto ?? 0), 0);
  const saldo = bezahlt - gesamt;

  const lehrerMap = new Map<string, string>();
  for (const f of fahrstunden) {
    if (f.fahrlehrer) lehrerMap.set(`${f.fahrlehrer.vorname} ${f.fahrlehrer.nachname}`, initialen(f.fahrlehrer.vorname, f.fahrlehrer.nachname));
  }
  const lehrerKuerzel = Array.from(lehrerMap.entries());
  const alter = alterVon(s.geburtsdatum);

  // Ausbildungsprozess: Stufen mit Status
  type Stufe = { key: string; label: string; sub: string; status: "done" | "current" | "todo" };
  const stufen: Stufe[] = [];
  stufen.push({ key: "anmeldung", label: "Anmeldung", sub: formatDatum(s.anmeldedatum), status: "done" });
  const theorieDone = s.theorie_bestanden;
  stufen.push({
    key: "theorie",
    label: "Theorie",
    sub: theorieDone ? "bestanden" : `${theorieBesucht}/${THEORIE_GRUNDSTOFF} Einheiten`,
    status: theorieDone ? "done" : "current",
  });
  stufen.push({
    key: "sonder",
    label: "Sonderfahrten",
    sub: `${ueberland + autobahn + nacht}/${pflicht.ueberland + pflicht.autobahn + pflicht.nacht}`,
    status: sonderfahrtenOk ? "done" : theorieDone ? "current" : "todo",
  });
  stufen.push({
    key: "reif",
    label: "Prüfungsreif",
    sub: pruefungsreif ? "ja" : "noch nicht",
    status: pruefungsreif ? "done" : "todo",
  });
  stufen.push({
    key: "praxis",
    label: "Praxisprüfung",
    sub: s.ausbildung_beendet ? "bestanden" : s.pruefung_termin ? formatDatum(s.pruefung_termin) : "kein Termin",
    status: s.ausbildung_beendet ? "done" : pruefungsreif ? "current" : "todo",
  });
  stufen.push({
    key: "fertig",
    label: "Führerschein",
    sub: s.ausbildung_beendet ? "abgeschlossen" : "offen",
    status: s.ausbildung_beendet ? "done" : "todo",
  });
  // Erste "current" ermitteln, falls keine gesetzt
  if (!stufen.some((x) => x.status === "current")) {
    const idx = stufen.findIndex((x) => x.status === "todo");
    if (idx >= 0) stufen[idx].status = "current";
  }

  const unterlagen = [
    { label: "Sehtest", ok: Boolean(s.sehtest_am), datum: s.sehtest_am },
    { label: "Erste-Hilfe-Kurs", ok: Boolean(s.erste_hilfe_am), datum: s.erste_hilfe_am },
    { label: "Passbild", ok: s.passbild_ok, datum: null },
    { label: "Ausweiskopie", ok: s.ausweis_ok, datum: null },
    { label: "Antrag Behörde", ok: Boolean(s.antrag_gestellt_am), datum: s.antrag_gestellt_am },
  ];

  return (
    <div className="space-y-3">
      <Link href="/schueler" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground xl:hidden">
        <ChevronLeft className="h-3.5 w-3.5" /> Zurück zur Liste
      </Link>

      {/* Kopf */}
      <div className="rounded-xl border bg-card">
        <div className="flex flex-col gap-3 px-4 pb-3 pt-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <SchuelerAvatar vorname={s.vorname} nachname={s.nachname} farbe={s.avatar_farbe} className="h-11 w-11 text-sm" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="text-[17px] font-semibold leading-6 tracking-[-0.01em] text-foreground">
                  {s.vorname} {s.nachname}
                </h2>
                {s.ausbildung_beendet ? (
                  <Badge variant="secondary">Abgeschlossen</Badge>
                ) : pruefungsreif ? (
                  <Badge variant="success">Prüfungsreif</Badge>
                ) : (
                  <Badge variant="default">In Ausbildung</Badge>
                )}
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <span>Klasse {s.fuehrerscheinklassen?.join(", ") || "—"}</span>
                {s.kundennummer != null && <span>· #{s.kundennummer}</span>}
                {s.geburtsdatum && <span>· {formatDatum(s.geburtsdatum)}{alter != null ? ` (${alter})` : ""}</span>}
                {s.filiale && <span>· {s.filiale}</span>}
                {lehrerKuerzel.length > 0 && <span>· Fahrlehrer {lehrerKuerzel.map(([, k]) => k).join(", ")}</span>}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
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
          </div>
        </div>

        {/* Ausbildungsprozess */}
        <ol className="grid grid-cols-3 gap-px border-t bg-border sm:grid-cols-6">
          {stufen.map((st) => (
            <li key={st.key} className="bg-card px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border text-[9px]",
                    st.status === "done" && "border-success bg-success text-white",
                    st.status === "current" && "border-primary bg-primary-soft text-primary",
                    st.status === "todo" && "border-border-strong text-transparent",
                  )}
                >
                  {st.status === "done" ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : st.status === "current" ? "●" : ""}
                </span>
                <span className={cn("truncate text-xs font-medium", st.status === "todo" ? "text-muted-foreground" : "text-foreground")}>
                  {st.label}
                </span>
              </div>
              <p className="mt-0.5 truncate pl-[22px] text-[11px] tabular-nums text-muted-foreground">{st.sub}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Reiter */}
      <Tabs defaultValue="uebersicht">
        <TabsList className="w-full gap-5 px-1">
          <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
          <TabsTrigger value="fahrstunden">Fahrstunden ({fahrstunden.length})</TabsTrigger>
          <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
          <TabsTrigger value="finanzen">Finanzen</TabsTrigger>
          <TabsTrigger value="portal">Portal</TabsTrigger>
        </TabsList>

        <TabsContent value="uebersicht" className="mt-3 grid gap-3 xl:grid-cols-2">
          <Block title={`Ausbildung · Klasse ${primaerKlasse}`}>
            <Balken label="Theorie – Grundstoff" ist={theorieBesucht} soll={THEORIE_GRUNDSTOFF} />
            {zusatzSoll > 0 && <Balken label="Theorie – Zusatzstoff" ist={0} soll={zusatzSoll} />}
            <Balken label="Überlandfahrten" ist={ueberland} soll={pflicht.ueberland} />
            <Balken label="Autobahnfahrten" ist={autobahn} soll={pflicht.autobahn} />
            <Balken label="Nachtfahrten" ist={nacht} soll={pflicht.nacht} />
            <div className="mt-1 border-t pt-1">
              <Zeile label="Übungsstunden (normal)">{zaehle("normal")}</Zeile>
              <Zeile label="Fehlstunden">{fehlstunden}</Zeile>
              <Zeile label="Lernstand Theorie-App">{s.lernstatus ?? 0}%</Zeile>
            </div>
          </Block>

          <div className="space-y-3">
            <Block title="Prüfungen">
              <Zeile label="Theorieprüfung">
                {s.theorie_bestanden ? (
                  <Badge variant="success">bestanden</Badge>
                ) : s.theorie_termin ? (
                  `${formatDatum(s.theorie_termin)} · ${s.theorie_versuch ?? 1}. Versuch`
                ) : (
                  "—"
                )}
              </Zeile>
              <Zeile label="Praktische Prüfung">
                {s.ausbildung_beendet ? (
                  <Badge variant="success">bestanden</Badge>
                ) : s.pruefung_termin ? (
                  `${formatDatum(s.pruefung_termin)} · ${s.praxis_versuch ?? 1}. Versuch`
                ) : (
                  "—"
                )}
              </Zeile>
              <Zeile label="Prüforganisation">{s.prueforganisation || "—"}</Zeile>
            </Block>

            <Block title="Unterlagen">
              <ul className="divide-y">
                {unterlagen.map((u) => (
                  <li key={u.label} className="flex items-center justify-between gap-2 py-1.5 text-[13px]">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-3.5 w-3.5 items-center justify-center rounded-full border",
                          u.ok ? "border-success bg-success text-white" : "border-border-strong",
                        )}
                      >
                        {u.ok && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                      </span>
                      <span className={u.ok ? "text-foreground" : "text-muted-foreground"}>{u.label}</span>
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {u.datum ? formatDatum(u.datum) : u.ok ? "vorhanden" : "offen"}
                    </span>
                  </li>
                ))}
              </ul>
            </Block>

            <Block title="Kontakt">
              <div className="space-y-1.5 text-[13px]">
                {s.telefon && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {s.telefon}
                  </p>
                )}
                {s.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> <span className="truncate">{s.email}</span>
                  </p>
                )}
                {(s.strasse || s.ort) && (
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>
                      {s.strasse}
                      {s.strasse ? ", " : ""}
                      {[s.plz, s.ort].filter(Boolean).join(" ")}
                    </span>
                  </p>
                )}
                {!s.telefon && !s.email && !s.strasse && <p className="text-muted-foreground">Keine Kontaktdaten hinterlegt.</p>}
              </div>
              <div className="mt-2 border-t pt-1">
                <Zeile label="Kostenträger">{s.kostentraeger || "—"}</Zeile>
                <Zeile label="Preisliste">{s.preisliste || "—"}</Zeile>
              </div>
            </Block>
          </div>

          {s.notizen && (
            <Block title="Notizen" className="xl:col-span-2">
              <p className="whitespace-pre-wrap text-[13px] text-foreground-secondary">{s.notizen}</p>
            </Block>
          )}
        </TabsContent>

        <TabsContent value="fahrstunden" className="mt-3">
          <div className="rounded-xl border bg-card">
            {fahrstunden.length === 0 ? (
              <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">Noch keine Fahrstunden – im Kalender eintragen.</p>
            ) : (
              <ul className="divide-y">
                {fahrstunden.map((f) => {
                  const typ = FAHRSTUNDE_TYPEN[f.typ];
                  return (
                    <li key={f.id} className="flex items-center gap-3 px-4 py-2 text-[13px]">
                      <span className="w-[76px] shrink-0 tabular-nums">
                        <span className="block font-medium text-foreground">{formatDatum(f.datum)}</span>
                        <span className="block text-xs text-muted-foreground">{formatUhrzeit(f.uhrzeit)}</span>
                      </span>
                      <span className={cn("h-7 w-0.5 shrink-0 rounded-full", f.status === "ausgefallen" ? "bg-border-strong" : typ.dot)} />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate font-medium text-foreground", f.status === "ausgefallen" && "line-through text-muted-foreground")}>
                          {typ.label}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {f.fahrlehrer ? `${f.fahrlehrer.vorname} ${f.fahrlehrer.nachname}` : "Kein Lehrer"}
                          {f.fahrzeug ? ` · ${f.fahrzeug.kennzeichen}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{f.dauer_minuten} Min</span>
                      {f.unterschrift && <Check className="h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.5} aria-label="unterschrieben" />}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="dokumente" className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/schueler/${s.id}/ausbildungsnachweis`}>
                <FileText /> Ausbildungsnachweis
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/schueler/${s.id}/vertrag`}>
                <FileSignature /> Ausbildungsvertrag{s.vertrag_am ? " · unterschrieben" : ""}
              </Link>
            </Button>
          </div>
          <DokumenteBox schuelerId={s.id} dokumente={dokumente} />
        </TabsContent>

        <TabsContent value="finanzen" className="mt-3 grid gap-3 xl:grid-cols-2">
          <div className="space-y-3">
            <Block title="Konto">
              <Zeile label="Rechnungen gesamt">{formatEuro(gesamt)}</Zeile>
              <Zeile label="Bezahlt">{formatEuro(bezahlt)}</Zeile>
              <div className="mt-1 flex items-center justify-between border-t pt-2">
                <span className="text-[13px] font-medium">Saldo</span>
                <span className={cn("text-[17px] font-semibold tabular-nums", saldo < 0 ? "text-destructive" : "text-success")}>
                  {formatEuro(saldo)}
                </span>
              </div>
            </Block>
            <RatenBox schuelerId={s.id} raten={raten} />
          </div>
          <Block title="Rechnungen">
            {rechnungen.length === 0 ? (
              <p className="py-4 text-[13px] text-muted-foreground">Noch keine Rechnungen.</p>
            ) : (
              <ul className="divide-y">
                {rechnungen.map((r) => {
                  const status = RECHNUNG_STATUS[r.status];
                  return (
                    <li key={r.id}>
                      <Link href={`/rechnungen/${r.id}`} className="flex items-center gap-3 py-2 text-[13px] hover:text-primary">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{r.nummer}</span>
                          <span className="block text-xs text-muted-foreground">{formatDatum(r.rechnungsdatum)}</span>
                        </span>
                        <span className="tabular-nums font-medium text-foreground">{formatEuro(Number(r.betrag_brutto))}</span>
                        <Badge variant="outline" className={status.badge}>
                          {status.label}
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Block>
        </TabsContent>

        <TabsContent value="portal" className="mt-3">
          <Block title="Schüler-Portal">
            {s.portal_aktiv ? (
              <div className="space-y-3 text-[13px]">
                <Zeile label="Status">
                  {s.user_id ? <Badge variant="success">verbunden</Badge> : <Badge variant="warning">wartet auf Anmeldung</Badge>}
                </Zeile>
                {s.portal_code && (
                  <div className="rounded-md border bg-surface-muted px-3 py-2">
                    <p className="text-xs text-muted-foreground">Zugangscode</p>
                    <p className="font-mono text-lg font-semibold tracking-[0.2em] text-foreground">{s.portal_code}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Der Schüler meldet sich auf der Portal-Domain mit E-Mail, Passwort und diesem Code an.</p>
                <form action={portalZugangSperren}>
                  <input type="hidden" name="id" value={s.id} />
                  <Button type="submit" variant="outline" size="sm" className="text-destructive hover:bg-destructive-soft hover:text-destructive">
                    Zugang sperren
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-3 text-[13px]">
                <p className="text-muted-foreground">Gib dem Schüler Zugriff auf Termine, Fortschritt und Rechnungen im eigenen Portal.</p>
                <form action={portalZugangAktivieren}>
                  <input type="hidden" name="id" value={s.id} />
                  <Button type="submit" size="sm">
                    <Smartphone /> Portal-Zugang aktivieren
                  </Button>
                </form>
              </div>
            )}
          </Block>
        </TabsContent>
      </Tabs>
    </div>
  );
}
