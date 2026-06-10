import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Receipt,
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
  pflichtFahrtenFuer,
  theoriePflichtFuer,
} from "@/lib/constants";
import { formatDatum, formatEuro, formatUhrzeit } from "@/lib/utils";
import type { Fahrschueler, Fahrstunde, Rechnung } from "@/lib/types";
import { schuelerLoeschen } from "../actions";

type FahrstundeDetail = Fahrstunde & {
  fahrlehrer: { vorname: string; nachname: string } | null;
  fahrzeug: { kennzeichen: string } | null;
};

function FortschrittZeile({
  label,
  ist,
  soll,
}: {
  label: string;
  ist: number;
  soll: number;
}) {
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

export default async function SchuelerDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: schueler } = await supabase
    .from("fahrschueler")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!schueler) {
    notFound();
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

  const primaerKlasse = s.fuehrerscheinklassen?.[0] ?? "B";
  const pflicht = pflichtFahrtenFuer(primaerKlasse);
  const theorieBesucht = theorieRes.count ?? 0;
  const theorieSoll = theoriePflichtFuer(primaerKlasse);
  const sonderfahrtenOk =
    ueberland >= pflicht.ueberland && autobahn >= pflicht.autobahn && nacht >= pflicht.nacht;
  const pruefungsreif = s.theorie_bestanden && sonderfahrtenOk;

  return (
    <div className="space-y-6">
      {/* Kopf */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <SchuelerAvatar
              vorname={s.vorname}
              nachname={s.nachname}
              farbe={s.avatar_farbe}
              className="h-14 w-14 text-lg"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {s.vorname} {s.nachname}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {s.fuehrerscheinklassen?.length ? (
                  s.fuehrerscheinklassen.map((k) => (
                    <Badge key={k} variant="secondary">
                      Klasse {k}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">Keine Klasse hinterlegt</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline">
              <Link href={`/schueler/${s.id}/bearbeiten`}>
                <Pencil className="h-4 w-4" /> Bearbeiten
              </Link>
            </Button>
            <LoeschenDialog
              action={schuelerLoeschen}
              id={s.id}
              titel="Schüler löschen?"
              beschreibung="Der Schüler und alle zugehörigen Daten (Fortschritt, Fahrstunden-Zuordnung) werden dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden."
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Linke Spalte */}
        <div className="space-y-6">
          {/* Kontakt */}
          <Card>
            <CardHeader>
              <CardTitle>Kontaktdaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {s.telefon ? (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {s.telefon}
                </p>
              ) : null}
              {s.email ? (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {s.email}
                </p>
              ) : null}
              {s.strasse || s.ort ? (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>
                    {s.strasse}
                    {s.strasse && <br />}
                    {[s.plz, s.ort].filter(Boolean).join(" ")}
                  </span>
                </p>
              ) : null}
              {!s.telefon && !s.email && !s.strasse && !s.ort && (
                <p className="text-muted-foreground">Keine Kontaktdaten hinterlegt.</p>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Geburtsdatum</span>
                <span>{formatDatum(s.geburtsdatum)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Angemeldet seit</span>
                <span>{formatDatum(s.anmeldedatum)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Fortschritt / Prüfungsreife */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Fortschritt (Klasse {primaerKlasse})</CardTitle>
              {pruefungsreif ? (
                <Badge variant="success">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Prüfungsreif
                </Badge>
              ) : (
                <Badge variant="outline">In Ausbildung</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="font-medium">Theorieprüfung</span>
                {s.theorie_bestanden ? (
                  <Badge variant="success">Bestanden</Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                    Offen
                  </Badge>
                )}
              </div>
              <FortschrittZeile
                label="Theoriestunden besucht"
                ist={theorieBesucht}
                soll={theorieSoll}
              />
              <FortschrittZeile label="Überlandfahrten" ist={ueberland} soll={pflicht.ueberland} />
              <FortschrittZeile label="Autobahnfahrten" ist={autobahn} soll={pflicht.autobahn} />
              <FortschrittZeile label="Nachtfahrten" ist={nacht} soll={pflicht.nacht} />
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Abgeschlossene Fahrstunden gesamt</span>
                <span className="font-semibold">{abgeschlossen.length}</span>
              </div>
              {s.theorie_termin && (
                <p className="text-xs text-muted-foreground">
                  Theorieprüfung am {formatDatum(s.theorie_termin)}
                </p>
              )}
              {s.pruefung_termin && (
                <p className="text-xs text-muted-foreground">
                  Praktische Prüfung am {formatDatum(s.pruefung_termin)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rechte Spalte */}
        <div className="space-y-6 lg:col-span-2">
          {/* Fahrstunden */}
          <Card>
            <CardHeader>
              <CardTitle>Fahrstunden</CardTitle>
            </CardHeader>
            <CardContent>
              {fahrstunden.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="Noch keine Fahrstunden"
                  description="Trage im Kalender Fahrstunden für diesen Schüler ein."
                />
              ) : (
                <ul className="divide-y">
                  {fahrstunden.slice(0, 12).map((f) => {
                    const typ = FAHRSTUNDE_TYPEN[f.typ];
                    return (
                      <li key={f.id} className="flex items-center gap-3 py-3 first:pt-0">
                        <div className="w-20 shrink-0 text-sm">
                          <p className="font-medium">{formatDatum(f.datum)}</p>
                          <p className="text-xs text-muted-foreground">{formatUhrzeit(f.uhrzeit)}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <Badge variant="outline" className={typ.badge}>
                            {typ.kurz}
                          </Badge>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {f.fahrlehrer
                              ? `${f.fahrlehrer.vorname} ${f.fahrlehrer.nachname}`
                              : "Kein Lehrer"}
                            {f.fahrzeug ? ` · ${f.fahrzeug.kennzeichen}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {f.dauer_minuten} Min
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Rechnungen */}
          <Card>
            <CardHeader>
              <CardTitle>Rechnungen</CardTitle>
            </CardHeader>
            <CardContent>
              {rechnungen.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="Noch keine Rechnungen"
                  description="Für diesen Schüler wurden noch keine Rechnungen erstellt."
                />
              ) : (
                <ul className="divide-y">
                  {rechnungen.map((r) => {
                    const status = RECHNUNG_STATUS[r.status];
                    return (
                      <li key={r.id} className="flex items-center gap-3 py-3 first:pt-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{r.nummer}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDatum(r.rechnungsdatum)}
                          </p>
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

          {/* Notizen */}
          {s.notizen && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" /> Notizen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{s.notizen}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
