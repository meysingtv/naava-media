"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetFooter } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Nachricht {
  role: "user" | "assistant";
  content: string;
  actions?: { tool: string; summary: string }[];
}

const WERKZEUG_LABEL: Record<string, string> = {
  schueler_finden: "Schüler gesucht",
  pruefungsreife: "Prüfungsreife geprüft",
  freie_slots: "Freie Termine gesucht",
  termin_anlegen: "Termin angelegt",
  offene_rechnungen: "Rechnungen geprüft",
  auslastung: "Auslastung berechnet",
  termine_am_tag: "Tagesplan geöffnet",
  schueler_details: "Schüler-Akte geöffnet",
  pruefungen_anstehend: "Prüfungen geprüft",
  offene_aufgaben: "Aufgaben geprüft",
  umsatz_statistik: "Monats-Kennzahlen",
  schueler_anlegen: "Schüler angelegt",
  aufgabe_anlegen: "Aufgabe angelegt",
  termin_absagen: "Termin abgesagt",
  zahlung_erfassen: "Zahlung erfasst",
};

const VORSCHLAEGE = ["Was steht heute an?", "Wer ist prüfungsreif?", "Wie läuft der Monat?", "Freie Termine nächste Woche"];

/**
 * KI-Assistent v3: gleiche Logik wie bisher (`/api/assistent`,
 * Nachrichtenliste, Werkzeug-Chips, Vorschläge) – neu ist nur die Hülle:
 * ein rechtes Seitenpanel mit `modal={false}`, also ohne Overlay. `Esc`
 * schließt, ein Klick daneben nicht.
 *
 * Ohne `open`/`onOpenChange` rendert die Komponente wie bisher ihren
 * eigenen Auslöser, damit bestehende Aufrufe nicht brechen.
 */
export function AssistentWidget({
  open,
  onOpenChange,
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  trigger?: React.ReactNode;
} = {}) {
  const [internOffen, setInternOffen] = useState(false);
  const offen = open ?? internOffen;
  const setOffen = onOpenChange ?? setInternOffen;

  const [nachrichten, setNachrichten] = useState<Nachricht[]>([]);
  const [eingabe, setEingabe] = useState("");
  const [laedt, setLaedt] = useState(false);
  const endeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (offen) endeRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [nachrichten, laedt, offen]);

  async function senden(text: string) {
    const frage = text.trim();
    if (!frage || laedt) return;
    const neu: Nachricht[] = [...nachrichten, { role: "user", content: frage }];
    setNachrichten(neu);
    setEingabe("");
    setLaedt(true);
    try {
      const res = await fetch("/api/assistent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: neu.map((n) => ({ role: n.role, content: n.content })) }),
      });
      const daten = await res.json();
      setNachrichten((m) => [...m, { role: "assistant", content: daten.text ?? "…", actions: daten.actions }]);
    } catch {
      setNachrichten((m) => [...m, { role: "assistant", content: "Verbindung zum Assistenten fehlgeschlagen." }]);
    } finally {
      setLaedt(false);
    }
  }

  const leer = nachrichten.length === 0;

  return (
    <>
      {trigger ??
        (open === undefined && (
          <Button variant="ghost" size="sm" onClick={() => setOffen(true)}>
            <Sparkles className="text-primary" strokeWidth={1.75} />
            <span className="hidden md:inline">Assistent</span>
          </Button>
        ))}

      <Sheet open={offen} onOpenChange={setOffen} modal={false}>
        <SheetContent
          side="right"
          size="sm"
          modal={false}
          title="Assistent"
          actions={
            <Badge variant="secondary" size="sm" dot={false}>
              KI · Beta
            </Badge>
          }
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <SheetBody className="space-y-4">
            {leer ? (
              <div>
                <p className="text-13 text-foreground">
                  Frag mich zu Schülern, Terminen, Prüfungen, Aufgaben oder Finanzen – oder lass mich Termine
                  planen, Schüler anlegen oder Zahlungen erfassen.
                </p>
                <div className="mt-3 space-y-1">
                  {VORSCHLAEGE.map((v) => (
                    <Button
                      key={v}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => senden(v)}
                    >
                      {v}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              nachrichten.map((n, i) => (
                <div key={i} className={cn("flex", n.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("min-w-0 max-w-[85%]", n.role === "user" && "flex flex-col items-end")}>
                    <div
                      className={cn(
                        "whitespace-pre-wrap px-3 py-2 text-13",
                        n.role === "user"
                          ? "rounded-xl rounded-br-sm bg-foreground text-background"
                          : "rounded-xl rounded-bl-sm bg-surface-muted text-foreground",
                      )}
                    >
                      {n.content}
                    </div>
                    {n.actions && n.actions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {n.actions.map((a, j) => (
                          <Badge key={j} variant="default" size="sm" dot={false}>
                            <Wrench className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
                            {WERKZEUG_LABEL[a.tool] ?? a.tool}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {laedt && (
              <div className="flex items-center gap-1 rounded-xl rounded-bl-sm bg-surface-muted px-3 py-2.5 w-fit">
                <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-muted-foreground" />
                <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
              </div>
            )}
            <div ref={endeRef} />
          </SheetBody>

          <SheetFooter className="justify-stretch">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                senden(eingabe);
              }}
              className="flex w-full items-end gap-2"
            >
              <Textarea
                value={eingabe}
                onChange={(e) => setEingabe(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    senden(eingabe);
                  }
                }}
                rows={1}
                placeholder="Frage oder Anweisung …"
                className="max-h-24 min-h-9.5 flex-1 resize-none py-2"
              />
              <Button type="submit" size="icon" aria-label="Senden" disabled={!eingabe.trim() || laedt}>
                <ArrowUp />
              </Button>
            </form>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
