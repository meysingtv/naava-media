"use client";

import * as React from "react";
import { AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FeldGitter } from "@/components/ui/formular";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { cn } from "@/lib/utils";
import { anfragenEinstellungenSpeichern, schuelerAnfragenSetzen } from "./actions";
import { EinstellungsKarte } from "./einstellungen-form";

export interface AnfrageSchueler {
  id: string;
  vorname: string;
  nachname: string;
  portal_aktiv: boolean;
  anfragen_gesperrt: boolean;
}

/**
 * Online-Anfragen im Schülerportal: Hauptschalter für alle, Regeln
 * (Vorlauf, offene Anfragen) und Freigabe je Schüler.
 */
export function AnfragenEinstellungen({
  aktiv,
  vorlaufStunden,
  maxOffen,
  schueler,
  migrationFehlt,
}: {
  aktiv: boolean;
  vorlaufStunden: number;
  maxOffen: number;
  schueler: AnfrageSchueler[];
  migrationFehlt: boolean;
}) {
  const [an, setAn] = React.useState(aktiv);
  const [vorlauf, setVorlauf] = React.useState(String(vorlaufStunden));
  const [maxAnzahl, setMaxAnzahl] = React.useState(String(maxOffen));
  const [speichert, startSpeichern] = React.useTransition();

  function speichern(naechstesAn = an) {
    startSpeichern(async () => {
      const r = await anfragenEinstellungenSpeichern({
        aktiv: naechstesAn,
        vorlaufStunden: Number(vorlauf),
        maxOffen: Number(maxAnzahl),
      });
      if (r.error) {
        toast.error(r.error);
        setAn(aktiv);
      } else if (r.message) toast.success(r.message);
    });
  }

  return (
    <div className="space-y-6">
      {migrationFehlt && (
        <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-13 text-warning-text">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          Für diese Funktion fehlt noch das Datenbank-Update 0020. Spiel es einmal im Supabase-SQL-Editor ein, danach
          funktionieren die Schalter.
        </p>
      )}

      <EinstellungsKarte
        titel="Fahrstunden-Anfragen"
        beschreibung="Schüler fragen im Portal einen Wunschtermin an. Ein Fahrlehrer nimmt ihn an oder lehnt ihn ab – erst dann steht die Stunde fest."
      >
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Anfragen im Schülerportal erlauben</p>
              <p className="mt-0.5 text-13 text-foreground-secondary">Gilt für alle Schüler mit Portalzugang – einzelne kannst du unten ausnehmen.</p>
            </div>
            <Switch
              checked={an}
              disabled={speichert || migrationFehlt}
              aria-label="Anfragen im Schülerportal erlauben"
              onCheckedChange={(v) => {
                setAn(v);
                speichern(v);
              }}
            />
          </div>

          <FeldGitter>
            <Field label="Mindestvorlauf" hint="So viele Stunden vorher muss angefragt werden.">
              <Input
                type="number"
                min={0}
                max={336}
                inputMode="numeric"
                value={vorlauf}
                onChange={(e) => setVorlauf(e.target.value)}
                trailing="Std."
                disabled={migrationFehlt}
              />
            </Field>
            <Field label="Offene Anfragen je Schüler" hint="Mehr gleichzeitig offene Anfragen sind nicht möglich.">
              <Input
                type="number"
                min={1}
                max={20}
                inputMode="numeric"
                value={maxAnzahl}
                onChange={(e) => setMaxAnzahl(e.target.value)}
                disabled={migrationFehlt}
              />
            </Field>
          </FeldGitter>

          <div className="flex justify-end">
            <Button size="sm" loading={speichert} disabled={migrationFehlt} onClick={() => speichern()}>
              Regeln speichern
            </Button>
          </div>
        </div>
      </EinstellungsKarte>

      <SchuelerFreigaben schueler={schueler} gesperrtGesamt={!an} migrationFehlt={migrationFehlt} />
    </div>
  );
}

function SchuelerFreigaben({
  schueler,
  gesperrtGesamt,
  migrationFehlt,
}: {
  schueler: AnfrageSchueler[];
  gesperrtGesamt: boolean;
  migrationFehlt: boolean;
}) {
  const [gesperrt, setGesperrt] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(schueler.map((s) => [s.id, s.anfragen_gesperrt])),
  );
  const [suche, setSuche] = React.useState("");
  const [laeuft, startTransition] = React.useTransition();

  const q = suche.trim().toLowerCase();
  const sichtbar = q ? schueler.filter((s) => `${s.vorname} ${s.nachname}`.toLowerCase().includes(q)) : schueler;
  const anzahlGesperrt = schueler.filter((s) => gesperrt[s.id]).length;

  function setzen(ids: string[], wert: boolean) {
    const vorher = { ...gesperrt };
    setGesperrt((g) => ({ ...g, ...Object.fromEntries(ids.map((id) => [id, wert])) }));
    startTransition(async () => {
      const r = await schuelerAnfragenSetzen(ids, wert);
      if (r.error) {
        toast.error(r.error);
        setGesperrt(vorher);
      }
    });
  }

  return (
    <EinstellungsKarte
      titel="Einzelne Schüler"
      beschreibung={
        gesperrtGesamt
          ? "Gilt, sobald Anfragen oben eingeschaltet sind."
          : anzahlGesperrt > 0
            ? `${anzahlGesperrt} ${anzahlGesperrt === 1 ? "Schüler ist" : "Schüler sind"} von Anfragen ausgenommen.`
            : "Alle Schüler mit Portalzugang dürfen anfragen."
      }
    >
      {schueler.length === 0 ? (
        <p className="text-13 text-foreground-secondary">Noch keine Schüler in Ausbildung.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[200px] flex-1">
              <Input inputSize="sm" leadingIcon={Search} value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Schüler suchen" aria-label="Schüler suchen" />
            </div>
            <Button size="sm" variant="outline" disabled={laeuft || migrationFehlt} onClick={() => setzen(schueler.map((s) => s.id), false)}>
              Alle freigeben
            </Button>
            <Button size="sm" variant="outline" disabled={laeuft || migrationFehlt} onClick={() => setzen(schueler.map((s) => s.id), true)}>
              Alle sperren
            </Button>
          </div>

          <ul className="max-h-[420px] divide-y divide-border overflow-y-auto rounded-lg border border-border scrollbar-thin">
            {sichtbar.map((s) => {
              const darf = !gesperrt[s.id];
              return (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                  <SchuelerAvatar vorname={s.vorname} nachname={s.nachname} className="h-7 w-7 text-[11px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-13 font-medium text-foreground">
                      {s.vorname} {s.nachname}
                    </span>
                    <span className={cn("block text-xs", s.portal_aktiv ? "text-foreground-tertiary" : "text-warning-text")}>
                      {s.portal_aktiv ? (darf ? "Darf anfragen" : "Gesperrt") : "Kein Portalzugang"}
                    </span>
                  </span>
                  <Switch
                    checked={darf}
                    disabled={migrationFehlt}
                    aria-label={`${s.vorname} ${s.nachname} darf anfragen`}
                    onCheckedChange={(v) => setzen([s.id], !v)}
                  />
                </li>
              );
            })}
            {sichtbar.length === 0 && <li className="px-3 py-6 text-center text-13 text-foreground-secondary">Kein Schüler gefunden.</li>}
          </ul>
        </div>
      )}
    </EinstellungsKarte>
  );
}
