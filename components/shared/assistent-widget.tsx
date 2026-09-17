"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Wrench, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const feld =
  "w-full rounded-md border border-border-strong bg-background px-3 py-2 text-[13px] shadow-xs placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20";

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

export function AssistentWidget() {
  const [offen, setOffen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [nachrichten, setNachrichten] = useState<Nachricht[]>([]);
  const [eingabe, setEingabe] = useState("");
  const [laedt, setLaedt] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const endeRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (offen) endeRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [nachrichten, laedt, offen]);

  // Schließen bei Klick außerhalb + Escape.
  useEffect(() => {
    if (!offen) return;
    function beiKlick(e: MouseEvent) {
      const ziel = e.target as Node;
      if (panelRef.current?.contains(ziel) || launcherRef.current?.contains(ziel)) return;
      setOffen(false);
    }
    function beiTaste(e: KeyboardEvent) {
      if (e.key === "Escape") setOffen(false);
    }
    document.addEventListener("mousedown", beiKlick);
    document.addEventListener("keydown", beiTaste);
    return () => {
      document.removeEventListener("mousedown", beiKlick);
      document.removeEventListener("keydown", beiTaste);
    };
  }, [offen]);

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
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-label="Assistent"
        data-state={offen ? "open" : "closed"}
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium text-foreground outline-none transition-colors duration-fast hover:bg-foreground/[0.06] focus-visible:ring-2 focus-visible:ring-primary/35 data-[state=open]:bg-foreground/[0.06]"
      >
        <Sparkles className="h-[15px] w-[15px] text-primary" strokeWidth={2} />
        <span className="hidden md:inline">Assistent</span>
      </button>

      {mounted &&
        offen &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Assistent"
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden rounded-xl border bg-card shadow-lg animate-scale-in",
              "inset-x-3 top-14 bottom-3",
              "sm:inset-auto sm:right-3 sm:top-14 sm:h-[560px] sm:max-h-[calc(100vh-5rem)] sm:w-[380px]",
            )}
          >
            {/* Kopf */}
            <div className="flex items-center justify-between border-b px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <span className="text-[13px] font-semibold text-foreground">Assistent</span>
                <span className="text-[11px] text-muted-foreground">KI · Beta</span>
              </div>
              <button
                type="button"
                onClick={() => setOffen(false)}
                aria-label="Schließen"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Verlauf */}
            <div className="flex-1 space-y-4 overflow-y-auto p-3.5">
              {leer ? (
                <div className="pt-2">
                  <p className="px-1 text-[13px] text-foreground">Frag mich zu Schülern, Terminen, Prüfungen, Aufgaben oder Finanzen – oder lass mich Termine planen, Schüler anlegen oder Zahlungen erfassen.</p>
                  <div className="mt-3 space-y-1">
                    {VORSCHLAEGE.map((v) => (
                      <button
                        key={v}
                        onClick={() => senden(v)}
                        className="block w-full rounded-md border border-border-strong bg-card px-2.5 py-1.5 text-left text-[13px] text-foreground-secondary transition-colors hover:border-primary hover:text-primary"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                nachrichten.map((n, i) => (
                  <div key={i} className={cn("flex gap-2", n.role === "user" ? "justify-end" : "justify-start")}>
                    {n.role === "assistant" && (
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div className={cn("min-w-0 max-w-[85%]", n.role === "user" && "flex flex-col items-end")}>
                      <div
                        className={cn(
                          "whitespace-pre-wrap rounded-xl px-3 py-2 text-[13px] leading-relaxed",
                          n.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface-muted text-foreground",
                        )}
                      >
                        {n.content}
                      </div>
                      {n.actions && n.actions.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {n.actions.map((a, j) => (
                            <span key={j} className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-medium text-primary">
                              <Wrench className="h-3 w-3" /> {WERKZEUG_LABEL[a.tool] ?? a.tool}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {laedt && (
                <div className="flex gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex items-center gap-1 rounded-xl bg-surface-muted px-3 py-2.5">
                    <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-muted-foreground" />
                    <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={endeRef} />
            </div>

            {/* Eingabe – hauseigene App-Controls */}
            <div className="border-t p-2.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  senden(eingabe);
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  value={eingabe}
                  onChange={(e) => setEingabe(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      senden(eingabe);
                    }
                  }}
                  rows={1}
                  autoFocus
                  placeholder="Frage oder Anweisung …"
                  className={cn(feld, "max-h-24 min-h-[2.25rem] flex-1 resize-none")}
                />
                <Button type="submit" disabled={!eingabe.trim() || laedt} className="shrink-0">
                  Senden
                </Button>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
