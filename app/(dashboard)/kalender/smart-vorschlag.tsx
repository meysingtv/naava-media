"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, RotateCcw, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Auswahl } from "@/components/ui/auswahl";
import { Balken } from "@/components/ui/fortschritt";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/shared/form-message";
import { AKZENT } from "@/lib/farben";
import { FAHRSTUNDE_FARBE, FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { terminAusVorschlag, smartVorschlagBerechnen, type DispoVorschlag } from "./actions";
import type { Option } from "./fahrstunde-panel";

function formatSlot(datum: string, uhrzeit: string): string {
  const d = new Date(`${datum}T${uhrzeit}:00`);
  return `${d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}, ${uhrzeit} Uhr`;
}

function Sonderfahrt({ label, erledigt, soll }: { label: string; erledigt: number; soll: number }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)_40px] items-center gap-3 text-13">
      <span className="text-foreground-secondary">{label}</span>
      <Balken anteil={soll > 0 ? erledigt / soll : 1} farbe={erledigt >= soll ? AKZENT.smaragd : AKZENT.blau} />
      <span className="text-right font-medium tabular-nums text-foreground">
        {erledigt}/{soll}
      </span>
    </div>
  );
}

function Vorschlag({ v }: { v: DispoVorschlag }) {
  const typ = FAHRSTUNDE_TYPEN[v.typ];
  return (
    <div className="space-y-4">
      <div className="rounded-lg p-4" style={{ background: `${FAHRSTUNDE_FARBE[v.typ]}14`, boxShadow: `inset 3px 0 0 ${FAHRSTUNDE_FARBE[v.typ]}` }}>
        <p className="text-13 font-semibold text-foreground">{typ.label}</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{formatSlot(v.datum, v.uhrzeit)}</p>
        <p className="mt-0.5 text-13 text-foreground-secondary">
          {v.dauer_minuten} Min. · {v.fahrlehrerName ?? "Fahrlehrer offen"} · {v.fahrzeugKennzeichen ?? "Fahrzeug offen"}
        </p>
      </div>
      <p className="text-13 text-foreground-secondary">{v.begruendung}</p>
      <div className="space-y-2.5 border-t border-border pt-4">
        <p className="text-13 font-medium text-foreground">Sonderfahrten Klasse {v.klasse}</p>
        <Sonderfahrt label="Überland" erledigt={v.fortschritt.ueberland[0]} soll={v.fortschritt.ueberland[1]} />
        <Sonderfahrt label="Autobahn" erledigt={v.fortschritt.autobahn[0]} soll={v.fortschritt.autobahn[1]} />
        <Sonderfahrt label="Nacht" erledigt={v.fortschritt.nacht[0]} soll={v.fortschritt.nacht[1]} />
      </div>
    </div>
  );
}

/**
 * Schlägt für einen Schüler die nächste sinnvolle Fahrstunde vor – Art nach
 * offenen Sonderfahrten, freier Termin, passender Fahrlehrer und Fahrzeug.
 */
export function TerminVorschlag({ schueler }: { schueler: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [schuelerId, setSchuelerId] = useState("");
  const [vorschlag, setVorschlag] = useState<DispoVorschlag | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [berechnet, startBerechnen] = useTransition();
  const [legtAn, startAnlegen] = useTransition();

  function zuruecksetzen() {
    setVorschlag(null);
    setFehler(null);
    setSchuelerId("");
  }

  function berechnen() {
    setFehler(null);
    startBerechnen(async () => {
      const res = await smartVorschlagBerechnen(schuelerId);
      if (res.ok) setVorschlag(res.vorschlag);
      else {
        setVorschlag(null);
        setFehler(res.error);
      }
    });
  }

  function anlegen() {
    if (!vorschlag) return;
    startAnlegen(async () => {
      const res = await terminAusVorschlag({
        schueler_id: vorschlag.schueler_id,
        fahrlehrer_id: vorschlag.fahrlehrer_id,
        fahrzeug_id: vorschlag.fahrzeug_id,
        datum: vorschlag.datum,
        uhrzeit: vorschlag.uhrzeit,
        dauer_minuten: vorschlag.dauer_minuten,
        typ: vorschlag.typ,
      });
      if (res.ok) {
        toast.success("Termin eingetragen");
        setOpen(false);
        zuruecksetzen();
        router.refresh();
      } else {
        toast.error(res.error ?? "Der Termin konnte nicht angelegt werden.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) zuruecksetzen();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Wand2 /> Termin vorschlagen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nächste Fahrstunde vorschlagen</DialogTitle>
          <DialogDescription>Die App sucht einen freien Termin mit passendem Fahrlehrer und Fahrzeug – mit Blick auf offene Sonderfahrten.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <FormMessage error={fehler ?? undefined} />
          <Field label="Schüler">
            <Auswahl
              optionen={schueler.map((s) => ({ value: s.id, label: s.label }))}
              value={schuelerId}
              onChange={(v) => {
                setSchuelerId(v);
                setVorschlag(null);
                setFehler(null);
              }}
              placeholder="Schüler wählen"
            />
          </Field>
          {vorschlag && <Vorschlag v={vorschlag} />}
        </DialogBody>
        <DialogFooter>
          {!vorschlag ? (
            <Button size="sm" onClick={berechnen} disabled={!schuelerId} loading={berechnet} data-primary>
              <Wand2 /> Vorschlag berechnen
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setVorschlag(null)}>
                <RotateCcw /> Anderer Schüler
              </Button>
              <Button size="sm" onClick={anlegen} loading={legtAn} data-primary>
                <CalendarPlus /> Termin eintragen
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
