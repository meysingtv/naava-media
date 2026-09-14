import Link from "next/link";
import { CalendarClock, Hash, Pencil } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDatum } from "@/lib/utils";
import type { Fahrzeug } from "@/lib/types";

function Datenzeile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function FahrzeugAkte({
  fahrzeug: f,
  fahrlehrerMap,
}: {
  fahrzeug: Fahrzeug;
  fahrlehrerMap: Record<string, string>;
}) {
  const name = f.name || [f.marke, f.modell].filter(Boolean).join(" ") || f.kennzeichen;
  const klassen = f.klassen?.length ? f.klassen : f.klasse ? [f.klasse] : [];
  const kuerzel = (f.fahrlehrer_ids ?? []).map((id) => fahrlehrerMap[id]).filter(Boolean);

  return (
    <div className="space-y-3">
      {/* Kopf */}
      <Card>
        <CardContent className="flex items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">{name}</h1>
              {f.aktiv ? (
                <Badge variant="secondary">Aktiv</Badge>
              ) : (
                <Badge variant="outline">Archiviert</Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
              {f.nummer != null && (
                <span className="inline-flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5" /> {f.nummer}
                </span>
              )}
              <span>{f.kennzeichen}</span>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/fahrzeuge?id=${f.id}&edit=1`}>
              <Pencil className="h-4 w-4" /> Bearbeiten
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Stammdaten */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Stammdaten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 p-4 pt-0 text-sm">
          <Datenzeile label="Kennzeichen">{f.kennzeichen}</Datenzeile>
          <Datenzeile label="Getriebeart">{f.getriebeart || "—"}</Datenzeile>
          <Datenzeile label="Fahrzeug-ID-Nr.">{f.fahrzeug_id_nr || "—"}</Datenzeile>
          <Datenzeile label="Anhänger">{f.anhaenger ? "Ja" : "Nein"}</Datenzeile>
          <Separator />
          <div>
            <p className="mb-1.5 text-muted-foreground">Ausbildungsklassen</p>
            {klassen.length ? (
              <div className="flex flex-wrap gap-1.5">
                {klassen.map((k) => (
                  <Badge key={k} variant="secondary">
                    {k}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-muted-foreground">Fahrlehrer</p>
            {kuerzel.length ? (
              <div className="flex flex-wrap gap-1.5">
                {kuerzel.map((k, i) => (
                  <Badge key={`${k}-${i}`} variant="outline">
                    {k}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Termine */}
      <Card>
        <CardHeader className="flex-row items-center justify-between p-4 pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Termine
          </CardTitle>
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2.5 p-4 pt-0 text-sm">
          <Datenzeile label="Saisonale Sperrung">
            {f.saison_von || f.saison_bis
              ? `${f.saison_von ? formatDatum(f.saison_von) : "—"} – ${f.saison_bis ? formatDatum(f.saison_bis) : "—"}`
              : "—"}
          </Datenzeile>
          <Datenzeile label="Hauptuntersuchung">
            {f.hauptuntersuchung ? (
              <span className="inline-flex items-center gap-2">
                {formatDatum(f.hauptuntersuchung)}
                <FristBadge datum={f.hauptuntersuchung} />
              </span>
            ) : (
              "—"
            )}
          </Datenzeile>
          <Datenzeile label="Nächste Wartung">
            {f.naechste_wartung ? (
              <span className="inline-flex items-center gap-2">
                {formatDatum(f.naechste_wartung)}
                <FristBadge datum={f.naechste_wartung} />
              </span>
            ) : (
              "—"
            )}
          </Datenzeile>
          <Datenzeile label="Versicherung">{f.versicherung || "—"}</Datenzeile>
          <Datenzeile label="Kilometerstand">
            {f.km_stand != null ? `${f.km_stand.toLocaleString("de-DE")} km` : "—"}
          </Datenzeile>
        </CardContent>
      </Card>
    </div>
  );
}

/** Zeigt eine Ampel, wenn ein Termin bald fällig oder überfällig ist. */
function FristBadge({ datum }: { datum: string }) {
  const heute = new Date().toISOString().slice(0, 10);
  const tage = Math.round((Date.parse(datum) - Date.parse(heute)) / 86400000);
  if (Number.isNaN(tage)) return null;
  if (tage < 0) return <Badge variant="destructive">überfällig</Badge>;
  if (tage <= 30) return <Badge variant="warning">in {tage} T.</Badge>;
  return null;
}
