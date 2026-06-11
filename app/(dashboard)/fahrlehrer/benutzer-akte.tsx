import Link from "next/link";
import { Mail, MapPin, Pencil, Phone } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ROLLEN } from "@/lib/constants";
import { formatDatum, initialen } from "@/lib/utils";
import type { Fahrlehrer } from "@/lib/types";

function Datenzeile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function BenutzerAkte({
  benutzer: b,
  selfUserId,
  rollenMap = {},
}: {
  benutzer: Fahrlehrer;
  selfUserId: string;
  rollenMap?: Record<string, string>;
}) {
  const kuerzel = b.kuerzel?.trim() || initialen(b.vorname, b.nachname);
  const rolleName = (b.benutzerrolle_id && rollenMap[b.benutzerrolle_id]) || ROLLEN[b.rolle];

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex items-start justify-between gap-3 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {kuerzel}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">
                  {b.vorname} {b.nachname}
                </h1>
                {b.user_id === selfUserId && <Badge variant="outline">Du</Badge>}
                {!b.aktiv && <Badge variant="secondary">Archiviert</Badge>}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{rolleName}</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/fahrlehrer/${b.id}/bearbeiten`}>
              <Pencil className="h-4 w-4" /> Bearbeiten
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Kontakt &amp; Person
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5 p-4 pt-0 text-sm">
          {b.email && (
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" /> <span className="truncate">{b.email}</span>
            </p>
          )}
          {b.telefon && (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" /> {b.telefon} <span className="text-xs text-muted-foreground">(Mobil)</span>
            </p>
          )}
          {b.telefon_privat && (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" /> {b.telefon_privat} <span className="text-xs text-muted-foreground">(Privat)</span>
            </p>
          )}
          {(b.strasse || b.ort) && (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                {b.strasse}
                {b.strasse && <br />}
                {[b.plz, b.ort].filter(Boolean).join(" ")}
              </span>
            </p>
          )}
          <Separator />
          <Datenzeile label="Kürzel">{kuerzel}</Datenzeile>
          <Datenzeile label="Geburtsdatum">{b.geburtsdatum ? formatDatum(b.geburtsdatum) : "—"}</Datenzeile>
          <Datenzeile label="Geburtsort">{b.geburtsort || "—"}</Datenzeile>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ausbildungsklassen
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {b.fuehrerscheinklassen?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {b.fuehrerscheinklassen.map((k) => (
                <Badge key={k} variant="secondary">{k}</Badge>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Keine Klassen hinterlegt.</span>
          )}
        </CardContent>
      </Card>

      {b.notiz && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Notiz</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{b.notiz}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
