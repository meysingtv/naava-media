"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles, Wrench } from "lucide-react";

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
};

const VORSCHLAEGE = [
  "Wer ist prüfungsreif?",
  "Wie ist die Auslastung diese Woche?",
  "Zeig mir die offenen Rechnungen",
  "Finde freie Termine nächste Woche",
];

export function AssistentChat() {
  const [nachrichten, setNachrichten] = useState<Nachricht[]>([]);
  const [eingabe, setEingabe] = useState("");
  const [laedt, setLaedt] = useState(false);
  const endeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endeRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [nachrichten, laedt]);

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
    <div className="flex h-[calc(100vh-13rem)] flex-col rounded-xl border bg-card">
      {/* Verlauf */}
      <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
        {leer ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Sparkles className="h-6 w-6" />
            </span>
            <h2 className="text-[15px] font-semibold text-foreground">Wie kann ich helfen?</h2>
            <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
              Frag mich nach Schülern, Terminen, Auslastung oder Rechnungen – oder lass mich direkt eine Fahrstunde planen.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {VORSCHLAEGE.map((v) => (
                <button
                  key={v}
                  onClick={() => senden(v)}
                  className="rounded-full border border-border-strong bg-card px-3 py-1.5 text-[13px] text-foreground-secondary transition-colors hover:border-primary hover:text-primary"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ) : (
          nachrichten.map((n, i) => (
            <div key={i} className={cn("flex gap-3", n.role === "user" ? "justify-end" : "justify-start")}>
              {n.role === "assistant" && (
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
              )}
              <div className={cn("min-w-0 max-w-[80%]", n.role === "user" && "flex flex-col items-end")}>
                <div
                  className={cn(
                    "whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed",
                    n.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface-muted text-foreground",
                  )}
                >
                  {n.content}
                </div>
                {n.actions && n.actions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
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
          <div className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="flex items-center gap-1 rounded-2xl bg-surface-muted px-3.5 py-3">
              <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-muted-foreground" />
              <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={endeRef} />
      </div>

      {/* Eingabe */}
      <div className="border-t p-3">
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
            placeholder="Nachricht an den Assistenten …"
            className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border-strong bg-background px-3 py-2 text-[13px] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20"
          />
          <button
            type="submit"
            disabled={!eingabe.trim() || laedt}
            aria-label="Senden"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-40"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </form>
        <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
          Der Assistent kann Schüler, Termine, Auslastung und Rechnungen lesen und Fahrstunden anlegen.
        </p>
      </div>
    </div>
  );
}
