"use client";

import * as React from "react";
import { AlertTriangle, Check, Inbox } from "lucide-react";
import { toast } from "sonner";

import { Auswahl, type AuswahlOption } from "@/components/ui/auswahl";
import { Button } from "@/components/ui/button";
import { DatumFeld } from "@/components/ui/datum-feld";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ZeitFeld } from "@/components/ui/zeit-feld";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { alsUhrzeit, minutenVon, wochentagKurz } from "@/lib/zeit";
import { formatDatum } from "@/lib/utils";
import type { FahrstundeAnfrage } from "@/lib/types";
import { anfrageAblehnen, anfrageAnnehmen } from "./anfrage-actions";

export type AnfrageMitNamen = FahrstundeAnfrage & {
  fahrschueler: { id: string; vorname: string; nachname: string } | null;
  wunsch: { id: string; vorname: string; nachname: string } | null;
};

/** Belegung zum Prüfen auf Überschneidungen (schlanker Auszug der Fahrstunden). */
export interface Belegung {
  fahrlehrerId: string | null;
  fahrzeugId: string | null;
  datum: string;
  uhrzeit: string;
  dauer: number;
  schueler: string;
}

function seit(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `vor ${Math.max(1, min)} Min.`;
  const std = Math.round(min / 60);
  if (std < 24) return `vor ${std} Std.`;
  const tage = Math.round(std / 24);
  return tage === 1 ? "gestern" : `vor ${tage} Tagen`;
}

function ueberschneidung(liste: Belegung[], feld: "fahrlehrerId" | "fahrzeugId", id: string, datum: string, zeit: string, dauer: number) {
  if (!id) return null;
  const a = minutenVon(zeit);
  const b = a + dauer;
  return (
    liste.find((s) => s[feld] === id && s.datum === datum && minutenVon(s.uhrzeit) < b && minutenVon(s.uhrzeit) + s.dauer > a) ?? null
  );
}

/**
 * Anfragen von Schülern aus dem Portal: Knopf im Kalenderkopf mit Zähler,
 * darin je Anfrage Fahrlehrer und Fahrzeug wählen, Zeit bei Bedarf ändern,
 * annehmen (legt die Fahrstunde an) oder mit Grund ablehnen.
 */
export function AnfragenDialog({
  anfragen,
  fahrlehrer,
  fahrzeuge,
  belegung,
  ichId,
  startOffen,
}: {
  anfragen: AnfrageMitNamen[];
  fahrlehrer: AuswahlOption[];
  fahrzeuge: AuswahlOption[];
  belegung: Belegung[];
  ichId: string | null;
  startOffen?: boolean;
}) {
  const [offen, setOffen] = React.useState(Boolean(startOffen) && anfragen.length > 0);

  if (anfragen.length === 0) return null;

  return (
    <Dialog open={offen} onOpenChange={setOffen}>
      <Button size="sm" variant="outline" onClick={() => setOffen(true)}>
        <Inbox /> Anfragen
        <span className="ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-primary-foreground">
          {anfragen.length}
        </span>
      </Button>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Anfragen von Schülern</DialogTitle>
          <DialogDescription>Annehmen legt die Fahrstunde an – der Schüler sieht sie sofort im Portal.</DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[70vh] space-y-3 overflow-y-auto scrollbar-thin">
          {anfragen.map((a) => (
            <AnfrageKarte key={a.id} a={a} fahrlehrer={fahrlehrer} fahrzeuge={fahrzeuge} belegung={belegung} ichId={ichId} />
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function AnfrageKarte({
  a,
  fahrlehrer,
  fahrzeuge,
  belegung,
  ichId,
}: {
  a: AnfrageMitNamen;
  fahrlehrer: AuswahlOption[];
  fahrzeuge: AuswahlOption[];
  belegung: Belegung[];
  ichId: string | null;
}) {
  const start = a.wunsch_fahrlehrer_id ?? (ichId && fahrlehrer.some((f) => f.value === ichId) ? ichId : "");
  const [lehrer, setLehrer] = React.useState(start);
  const [fahrzeug, setFahrzeug] = React.useState("");
  const [aendern, setAendern] = React.useState(false);
  const [datum, setDatum] = React.useState(a.datum);
  const [zeit, setZeit] = React.useState(a.uhrzeit.slice(0, 5));
  const [dauer, setDauer] = React.useState(a.dauer_minuten);
  const [ablehnen, setAblehnen] = React.useState(false);
  const [grund, setGrund] = React.useState("");
  const [fehler, setFehler] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const name = a.fahrschueler ? `${a.fahrschueler.vorname} ${a.fahrschueler.nachname}` : "Schüler";
  const lehrerKonflikt = ueberschneidung(belegung, "fahrlehrerId", lehrer, datum, zeit, dauer);
  const fahrzeugKonflikt = ueberschneidung(belegung, "fahrzeugId", fahrzeug, datum, zeit, dauer);
  const lehrerName = fahrlehrer.find((f) => f.value === lehrer)?.label;

  function zuruecksetzen() {
    setDatum(a.datum);
    setZeit(a.uhrzeit.slice(0, 5));
    setDauer(a.dauer_minuten);
  }

  function annehmen() {
    setFehler(null);
    startTransition(async () => {
      const r = await anfrageAnnehmen({ id: a.id, fahrlehrerId: lehrer || null, fahrzeugId: fahrzeug || null, datum, uhrzeit: zeit, dauer });
      if (r.error) setFehler(r.error);
      else toast.success(`Fahrstunde mit ${name} eingetragen`);
    });
  }

  function ablehnenBestaetigen() {
    setFehler(null);
    startTransition(async () => {
      const r = await anfrageAblehnen(a.id, grund);
      if (r.error) setFehler(r.error);
      else toast.success(`Anfrage von ${name} abgelehnt`);
    });
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-start gap-3">
        <SchuelerAvatar vorname={a.fahrschueler?.vorname} nachname={a.fahrschueler?.nachname} className="h-9 w-9 text-xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs text-foreground-tertiary">
            angefragt {seit(a.created_at)}
            {a.wunsch ? ` · Wunsch: ${a.wunsch.vorname} ${a.wunsch.nachname}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {wochentagKurz(a.datum)}, {formatDatum(a.datum)}
          </p>
          <p className="text-xs tabular-nums text-foreground-secondary">
            {a.uhrzeit.slice(0, 5)}–{alsUhrzeit(minutenVon(a.uhrzeit) + a.dauer_minuten)} · {a.dauer_minuten} Min.
          </p>
        </div>
      </div>

      {a.notiz && <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-13 text-foreground-secondary">„{a.notiz}“</p>}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Auswahl
          optionen={fahrlehrer}
          value={lehrer}
          onChange={setLehrer}
          placeholder="Fahrlehrer wählen"
          inputSize="sm"
          aria-label="Fahrlehrer"
        />
        <Auswahl
          optionen={fahrzeuge}
          value={fahrzeug}
          onChange={setFahrzeug}
          leerLabel="Ohne Fahrzeug"
          placeholder="Fahrzeug (optional)"
          inputSize="sm"
          aria-label="Fahrzeug"
        />
      </div>

      {aendern && (
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_110px_120px] gap-2">
          <DatumFeld value={datum} onChange={setDatum} inputSize="sm" aria-label="Datum" />
          <ZeitFeld value={zeit} onChange={setZeit} inputSize="sm" von={6} bis={21} />
          <Auswahl
            optionen={[
              { value: "45", label: "45 Min." },
              { value: "90", label: "90 Min." },
            ]}
            value={String(dauer)}
            onChange={(v) => setDauer(Number(v))}
            inputSize="sm"
            aria-label="Dauer"
          />
        </div>
      )}

      {(lehrerKonflikt || fahrzeugKonflikt) && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-warning-text">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
          {lehrerKonflikt
            ? `${lehrerName ?? "Der Fahrlehrer"} hat um ${lehrerKonflikt.uhrzeit.slice(0, 5)} Uhr schon eine Stunde (${lehrerKonflikt.schueler}).`
            : `Das Fahrzeug ist um ${fahrzeugKonflikt!.uhrzeit.slice(0, 5)} Uhr schon verplant.`}
        </p>
      )}
      {fehler && <p className="mt-2 text-xs text-destructive-text">{fehler}</p>}

      {ablehnen ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="min-w-[220px] flex-1">
            <Input
              inputSize="sm"
              value={grund}
              onChange={(e) => setGrund(e.target.value)}
              maxLength={500}
              placeholder="Grund für den Schüler (optional)"
              aria-label="Grund der Ablehnung"
              autoFocus
            />
          </div>
          <Button size="sm" variant="danger-soft" loading={pending} onClick={ablehnenBestaetigen}>
            Ablehnen
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAblehnen(false)}>
            Zurück
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" loading={pending} disabled={!lehrer} onClick={annehmen}>
            <Check /> Annehmen
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (aendern) zuruecksetzen();
              setAendern((v) => !v);
            }}
          >
            {aendern ? "Wie angefragt" : "Zeit ändern"}
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto text-destructive-text hover:text-destructive-text" onClick={() => setAblehnen(true)}>
            Ablehnen
          </Button>
        </div>
      )}
    </div>
  );
}
