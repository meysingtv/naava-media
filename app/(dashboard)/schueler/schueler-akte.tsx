import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  Hash,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Receipt,
  Smartphone,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { LoeschenDialog } from "@/components/shared/loeschen-dialog";
import {
  FAHRSTUNDE_TYPEN,
  RECHNUNG_STATUS,
  THEORIE_GRUNDSTOFF,
  pflichtFahrtenFuer,
  theoriePflichtFuer,
} from "@/lib/constants";
import { cn, formatDatum, formatEuro, formatUhrzeit, initialen } from "@/lib/utils";
import type { Fahrschueler, Fahrstunde, Rechnung } from "@/lib/types";
import { schuelerLoeschen } from "./actions";

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

function Datenzeile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function FortschrittZeile({ label, ist, soll }: { label: string; ist: number; soll: number }) {
  const prozent = soll > 0 ? Math.min(100, Math.round((ist / soll) * 100)) : 100;
  const fertig = ist >= soll;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={fertig ? "font-semibold text-success" : "text-muted-foreground"}>
          {ist} / {soll}
        </span>
      </div>
      <Progress value={prozent} indicatorClassName={fertig ? "bg-success" : "bg-primary"} />
    </div>
  );
}

export async function SchuelerAkte({ schuelerId }: { schuelerId: string }) {
  const supabase = createClient();

  const { data: schueler } = await supabase
    .from("fahrschueler")
    .select("*")
    .eq("id", schuelerId)
    .maybeSingle();

  if (!schueler) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Schüler nicht gefunden.</CardContent>
      </Card>
    );
  }
  const s = schueler as Fahrschueler;

  const [fahrstundenRes, rechnungenRes, theorieRes] = await Promise.all([
    supabase
      .from("fahrstunde")
      .select("*, fahrlehrer(vorname, nachname), fahrzeug(kennzeichen)")
      .eq("schueler_id", s.id)
      .order("datum", { ascending: false })
      .order("uhrzeit", { ascending: false })
      .returns<FahrstundeDetail[]>(),
    supabase
      .from("rechnung")
      .select("*")
      .eq("schueler_id", s.id)
      .order("rechnungsdatum", { ascending: false }),
    supabase
      .from("theorie_teilnahme")
      .select("id", { count: "exact", head: true })
      .eq("schueler_id", s.id)
      .eq("anwesend", true),
  ]);

  const fahrstunden = fahrstundenRes.data ?? [];
  const rechnungen = (rechnungenRes.data ?? []) as Rechnung[];

  const abgeschlossen = fahrstunden.filter((f) => f.status === "abgeschlossen");
  const zaehle = (typ: Fahrstunde["typ"]) => abgeschlossen.filter((f) => f.typ === typ).length;
  const ueberland = zaehle("ueberland");
  const autobahn = zaehle("autobahn");
  const nacht = zaehle("nacht");
  const normalfahrten = zaehle("normal");
  const fehlstunden = fahrstunden.filter((f) => f.status === "ausgefallen").length;

  const primaerKlasse = s.fuehrerscheinklassen?.[0] ?? "B";
  const pflicht = pflichtFahrtenFuer(primaerKlasse);
  const theorieBesucht = theorieRes.count ?? 0;
  const theorieSoll = theoriePflichtFuer(primaerKlasse);
  const zusatzSoll = Math.max(theorieSoll - THEORIE_GRUNDSTOFF, 0);
  const sonderfahrtenOk =
    ueberland >= pflicht.ueberland && autobahn >= pflicht.autobahn && nacht >= pflicht.nacht;
  const pruefungsreif = s.theorie_bestanden && sonderfahrtenOk;

  const gesamt = rechnungen.reduce((sum, r) => sum + Number(r.betrag_brutto ?? 0), 0);
  const bezahlt = rechnungen
    .filter((r) => r.status === "bezahlt")
    .reduce((sum, r) => sum + Number(r.betrag_brutto ?? 0), 0);
  const saldo = bezahlt - gesamt;

  const lehrerMap = new Map<string, string>();
  for (const f of fahrstunden) {
    if (f.fahrlehrer) {
      lehrerMap.set(
        `${f.fahrlehrer.vorname} ${f.fahrlehrer.nachname}`,
        initialen(f.fahrlehrer.vorname, f.fahrlehrer.nachname),
      );
    }
  }
  const lehrerKuerzel = Array.from(lehrerMap.entries());
  const alter = alterVon(s.geburtsdatum);

  return (
    <div className="space-y-4">
      <Link
        href="/schueler"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
      >
        <ChevronLeft className="h-4 w-4" /> Zurück zur Liste
      </Link>

      {/* Kopf */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <SchuelerAvatar
              vorname={s.vorname}
              nachname={s.nachname}
              farbe={s.avatar_farbe}
              className="h-14 w-14 text-lg"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">
                  {s.vorname} {s.nachname}
                </h1>
                {pruefungsreif ? (
                  <Badge variant="success">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Prüfungsreif
                  </Badge>
                ) : (
                  <Badge variant="outline">In Ausbildung</Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {s.kundennummer != null && (
                  <span className="inline-flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" /> {s.kundennummer}
                  </span>
                )}
                {s.geburtsdatum && (
                  <span>
                    {formatDatum(s.geburtsdatum)}
                    {alter != null ? ` (${alter})` : ""}
                  </span>
                )}
                {s.filiale && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> {s.filiale}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {s.fuehrerscheinklassen?.length ? (
                  s.fuehrerscheinklassen.map((k) => (
                    <Badge key={k} variant="secondary">
                      {k}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Keine Klasse</span>
                )}
                {lehrerKuerzel.length > 0 && <Separator orientation="vertical" className="h-4" />}
                {lehrerKuerzel.map(([name, kuerzel]) => (
                  <Badge key={name} variant="outline" title={`Fahrlehrer: ${name}`}>
                    {kuerzel}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/schueler/${s.id}/bearbeiten`}>
                <Pencil className="h-4 w-4" /> Bearbeiten
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
        </CardContent>
      </Card>

      {/* Kontakt · Finanzen · Lern-Apps */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Kontakt &amp; Person</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 p-4 pt-0 text-sm">
            {s.telefon && (
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {s.telefon}
              </p>
            )}
            {s.email && (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{s.email}</span>
              </p>
            )}
            {(s.strasse || s.ort) && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  {s.strasse}
                  {s.strasse && <br />}
                  {[s.plz, s.ort].filter(Boolean).join(" ")}
                </span>
              </p>
            )}
            <Separator />
            <Datenzeile label="Angemeldet">{formatDatum(s.anmeldedatum)}</Datenzeile>
            <Datenzeile label="Kostenträger">{s.kostentraeger || "—"}</Datenzeile>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between p-4">
            <CardTitle className="text-base">Finanzen</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2.5 p-4 pt-0">
            <Datenzeile label="Zu zahlen">{formatEuro(gesamt)}</Datenzeile>
            <Datenzeile label="Bezahlt">{formatEuro(bezahlt)}</Datenzeile>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Saldo</span>
              <span className={cn("text-lg font-bold", saldo < 0 ? "text-destructive" : "text-success")}>
                {formatEuro(saldo)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between p-4">
            <CardTitle className="text-base">Lern-Apps</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Theorie-Lernstatus</span>
                <span className="text-muted-foreground">{s.lernstatus ?? 0}%</span>
              </div>
              <Progress value={s.lernstatus ?? 0} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline">drive.buzz</Badge>
              <Badge variant="outline">abibaro</Badge>
              <Badge variant="outline">ClassicPay</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Ansicht – Anbindung folgt.</p>
          </CardContent>
        </Card>
      </div>

      {/* Ausbildung · Prüfung */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between p-4">
            <CardTitle className="text-base">Ausbildung (Klasse {primaerKlasse})</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium">Theorieprüfung</span>
              {s.theorie_bestanden ? (
                <Badge variant="success">Bestanden</Badge>
              ) : (
                <Badge variant="outline">Offen</Badge>
              )}
            </div>
            <FortschrittZeile label="Theorie – Grundstoff" ist={theorieBesucht} soll={THEORIE_GRUNDSTOFF} />
            <FortschrittZeile label="Theorie – Zusatzstoff" ist={0} soll={zusatzSoll} />
            <FortschrittZeile label="Überlandfahrten" ist={ueberland} soll={pflicht.ueberland} />
            <FortschrittZeile label="Autobahnfahrten" ist={autobahn} soll={pflicht.autobahn} />
            <FortschrittZeile label="Nachtfahrten" ist={nacht} soll={pflicht.nacht} />
            <Separator />
            <Datenzeile label="Übungsstunden (normal)">{normalfahrten}</Datenzeile>
            <Datenzeile label="Fehlstunden">{fehlstunden}</Datenzeile>
            <Datenzeile label="Abgeschlossen gesamt">{abgeschlossen.length}</Datenzeile>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Prüfung &amp; Verwaltung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 p-4 pt-0 text-sm">
            <Datenzeile label="Theorieprüfung">
              {s.theorie_termin ? formatDatum(s.theorie_termin) : "—"}
              <span className="ml-1 text-muted-foreground">({s.theorie_versuch ?? 1}. Versuch)</span>
            </Datenzeile>
            <Datenzeile label="Praktische Prüfung">
              {s.pruefung_termin ? formatDatum(s.pruefung_termin) : "—"}
              <span className="ml-1 text-muted-foreground">({s.praxis_versuch ?? 1}. Versuch)</span>
            </Datenzeile>
            <Separator />
            <Datenzeile label="Prüforganisation">{s.prueforganisation || "—"}</Datenzeile>
            <Datenzeile label="Preisliste">{s.preisliste || "—"}</Datenzeile>
            <Datenzeile label="Intensivkurs">
              {s.intensivkurs ? <Badge variant="secondary">Ja</Badge> : "Nein"}
            </Datenzeile>
            <Datenzeile label="IBAN">{s.iban || "—"}</Datenzeile>
          </CardContent>
        </Card>
      </div>

      {/* Fahrstunden · Rechnungen */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Fahrstunden</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {fahrstunden.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Noch keine Fahrstunden"
                description="Trage im Terminplaner Fahrstunden ein."
              />
            ) : (
              <ul className="divide-y">
                {fahrstunden.slice(0, 10).map((f) => {
                  const typ = FAHRSTUNDE_TYPEN[f.typ];
                  return (
                    <li key={f.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                      <div className="w-16 shrink-0 text-sm">
                        <p className="font-medium">{formatDatum(f.datum)}</p>
                        <p className="text-xs text-muted-foreground">{formatUhrzeit(f.uhrzeit)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <Badge variant="outline" className={typ.badge}>
                          {typ.kurz}
                        </Badge>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {f.fahrlehrer ? `${f.fahrlehrer.vorname} ${f.fahrlehrer.nachname}` : "Kein Lehrer"}
                          {f.fahrzeug ? ` · ${f.fahrzeug.kennzeichen}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{f.dauer_minuten} Min</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Rechnungen</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {rechnungen.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Noch keine Rechnungen"
                description="Für diesen Schüler gibt es noch keine Rechnungen."
              />
            ) : (
              <ul className="divide-y">
                {rechnungen.map((r) => {
                  const status = RECHNUNG_STATUS[r.status];
                  return (
                    <li key={r.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.nummer}</p>
                        <p className="text-xs text-muted-foreground">{formatDatum(r.rechnungsdatum)}</p>
                      </div>
                      <span className="text-sm font-medium">{formatEuro(Number(r.betrag_brutto))}</span>
                      <Badge variant="outline" className={status.badge}>
                        {status.label}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {s.notizen && (
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-base">Notizen</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{s.notizen}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
