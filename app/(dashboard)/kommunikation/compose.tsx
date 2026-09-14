"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { nachrichtLoggen } from "./actions";

export interface Segmente {
  alle: string[];
  theorie_offen: string[];
  offene_rechnung: string[];
  pruefung_naht: string[];
}

const SEGMENT_LABEL: { key: keyof Segmente; label: string }[] = [
  { key: "alle", label: "Alle mit E-Mail" },
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
    name: "Termin-Info",
    betreff: "Wichtige Info zu deinem Termin",
    text: "Hallo,\n\nkurze Info zu deinem nächsten Termin:\n\n\n\nViele Grüße\nDeine Fahrschule",
  },
  { name: "Leer", betreff: "", text: "" },
];

export function Compose({ segmente }: { segmente: Segmente }) {
  const [segment, setSegment] = useState<keyof Segmente>("alle");
  const [betreff, setBetreff] = useState("");
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  const empfaenger = useMemo(() => segmente[segment] ?? [], [segmente, segment]);

  function mailtoOeffnen() {
    if (empfaenger.length === 0) {
      toast.error("In diesem Segment ist niemand mit E-Mail-Adresse.");
      return;
    }
    const bcc = empfaenger.join(",");
    const href = `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(
      betreff,
    )}&body=${encodeURIComponent(text)}`;
    window.location.href = href;
    start(async () => {
      const res = await nachrichtLoggen({
        betreff,
        text,
        empfaenger: `${SEGMENT_LABEL.find((s) => s.key === segment)?.label} (${empfaenger.length})`,
        anzahl: empfaenger.length,
      });
      if (res.ok) toast.success("Im Verlauf protokolliert");
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
    <Card>
      <CardHeader>
        <CardTitle>Neue Nachricht</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Empfänger-Segment</Label>
          <div className="flex flex-wrap gap-2">
            {SEGMENT_LABEL.map((s) => {
              const aktiv = s.key === segment;
              const n = segmente[s.key]?.length ?? 0;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSegment(s.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-fast",
                    aktiv
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border-strong bg-background text-foreground-secondary hover:bg-surface",
                  )}
                >
                  {s.label}
                  <Badge variant={aktiv ? "default" : "secondary"} className="h-4 px-1.5 text-2xs">
                    {n}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Vorlage</Label>
          <div className="flex flex-wrap gap-2">
            {VORLAGEN.map((v) => (
              <Button
                key={v.name}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setBetreff(v.betreff);
                  setText(v.text);
                }}
              >
                {v.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="betreff">Betreff</Label>
          <Input id="betreff" value={betreff} onChange={(e) => setBetreff(e.target.value)} placeholder="Betreff …" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="text">Nachricht</Label>
          <Textarea id="text" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Text …" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={mailtoOeffnen} disabled={pending}>
            <Send /> An {empfaenger.length} senden
          </Button>
          <Button type="button" variant="outline" onClick={kopieren}>
            <Copy /> Adressen kopieren
          </Button>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> öffnet dein E-Mail-Programm (BCC)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
