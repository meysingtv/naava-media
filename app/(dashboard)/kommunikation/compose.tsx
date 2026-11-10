"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, Send } from "lucide-react";
import { toast } from "sonner";

import { Auswahl } from "@/components/ui/auswahl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Karte } from "@/components/ui/karte";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { nachrichtLoggen } from "./actions";

export interface Segmente {
  alle: string[];
  theorie_offen: string[];
  offene_rechnung: string[];
  pruefung_naht: string[];
}

const SEGMENT_LABEL: { key: keyof Segmente; label: string }[] = [
  { key: "alle", label: "Alle Schüler" },
  { key: "theorie_offen", label: "Theorie noch offen" },
  { key: "offene_rechnung", label: "Offene Rechnung" },
  { key: "pruefung_naht", label: "Prüfung steht an" },
];

const VORLAGEN: { name: string; betreff: string; text: string }[] = [
  {
    name: "Erinnerung Theorieprüfung",
    betreff: "Deine Theorieprüfung steht an",
    text:
      "Hallo,\n\ndeine Theorieprüfung rückt näher. Denk bitte daran, weiter fleißig zu lernen – in der Lern-App siehst du deinen Fortschritt.\n\nViele Grüße\nDeine Fahrschule",
  },
  {
    name: "Zahlungserinnerung",
    betreff: "Freundliche Zahlungserinnerung",
    text:
      "Hallo,\n\nauf deinem Konto ist noch ein offener Betrag. Bitte gleiche diesen in den nächsten Tagen aus. Bei Fragen melde dich gern.\n\nViele Grüße\nDeine Fahrschule",
  },
  {
    name: "Info zum Termin",
    betreff: "Wichtige Info zu deinem Termin",
    text: "Hallo,\n\nkurze Info zu deinem nächsten Termin:\n\n\n\nViele Grüße\nDeine Fahrschule",
  },
];

/**
 * Sammel-E-Mail an eine Schülergruppe: Gruppe wählen, Vorlage übernehmen,
 * Text anpassen – „Senden" öffnet das E-Mail-Programm mit allen Adressen in
 * BCC und trägt die Nachricht in den Verlauf ein.
 */
export function Compose({ segmente }: { segmente: Segmente }) {
  const [segment, setSegment] = useState<keyof Segmente>("alle");
  const [vorlage, setVorlage] = useState("");
  const [betreff, setBetreff] = useState("");
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  const empfaenger = useMemo(() => segmente[segment] ?? [], [segmente, segment]);

  function vorlageWaehlen(name: string) {
    setVorlage(name);
    const v = VORLAGEN.find((x) => x.name === name);
    if (v) {
      setBetreff(v.betreff);
      setText(v.text);
    }
  }

  function senden() {
    if (empfaenger.length === 0) {
      toast.error("In dieser Gruppe hat niemand eine E-Mail-Adresse.");
      return;
    }
    const href = `mailto:?bcc=${encodeURIComponent(empfaenger.join(","))}&subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(text)}`;
    window.location.href = href;
    start(async () => {
      const res = await nachrichtLoggen({
        betreff,
        text,
        empfaenger: `${SEGMENT_LABEL.find((s) => s.key === segment)?.label} (${empfaenger.length})`,
        anzahl: empfaenger.length,
      });
      if (res.ok) toast.success("Im Verlauf eingetragen");
    });
  }

  async function kopieren() {
    if (empfaenger.length === 0) return;
    try {
      await navigator.clipboard.writeText(empfaenger.join(", "));
      toast.success(`${empfaenger.length} E-Mail-Adressen kopiert`);
    } catch {
      toast.error("Kopieren nicht möglich");
    }
  }

  return (
    <Karte titel="Neue Nachricht" inhaltClassName="flex flex-col">
      <div className="space-y-5 px-5 pb-5">
        <div>
          <p className="mb-1.5 text-13 font-medium text-foreground">An</p>
          <div role="radiogroup" aria-label="Empfänger" className="flex flex-wrap gap-1.5">
            {SEGMENT_LABEL.map((s) => {
              const aktiv = s.key === segment;
              const n = segmente[s.key]?.length ?? 0;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="radio"
                  aria-checked={aktiv}
                  onClick={() => setSegment(s.key)}
                  className={cn(
                    "inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-13 font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
                    aktiv
                      ? "border-primary bg-primary-soft text-primary-text"
                      : "border-border-strong bg-card text-foreground-secondary hover:bg-surface-muted hover:text-foreground",
                  )}
                >
                  {s.label}
                  <span className={cn("tabular-nums", aktiv ? "text-primary-text/70" : "text-foreground-tertiary")}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Field label="Vorlage">
          <Auswahl
            optionen={VORLAGEN.map((v) => ({ value: v.name, label: v.name }))}
            value={vorlage}
            onChange={vorlageWaehlen}
            placeholder="Ohne Vorlage"
            className="sm:max-w-xs"
          />
        </Field>

        <Field label="Betreff">
          <Input value={betreff} onChange={(e) => setBetreff(e.target.value)} placeholder="z. B. Neue Öffnungszeiten ab Oktober" />
        </Field>
        <Field label="Nachricht">
          <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Hallo …" />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
        <p className="mr-auto text-13 text-foreground-secondary">Öffnet dein E-Mail-Programm, alle Empfänger stehen in BCC.</p>
        <Button type="button" variant="outline" size="sm" onClick={kopieren} disabled={empfaenger.length === 0}>
          <Copy /> Adressen kopieren
        </Button>
        <Button type="button" size="sm" onClick={senden} disabled={pending || empfaenger.length === 0}>
          <Send /> An {empfaenger.length} senden
        </Button>
      </div>
    </Karte>
  );
}
