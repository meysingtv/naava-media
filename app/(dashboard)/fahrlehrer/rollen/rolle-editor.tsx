"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Check, X } from "lucide-react";

import { rolleSpeichern, type RolleState } from "../rollen-actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { Switch } from "@/components/ui/switch";
import { SIDEBAR_BEREICHE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Benutzerrolle, RolleRecht } from "@/lib/types";

const initial: RolleState = {};

const feld =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const ZUGANGSART_VORSCHLAEGE = ["Verwaltung", "Fahrlehrer", "Büro", "Eingeschränkt"];

function Abschnitt({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function F({ label, children, req }: { label: string; children: React.ReactNode; req?: boolean }) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[13px] text-foreground/70">
        {label}
        {req && <span className="text-destructive"> *</span>}
      </label>
      {children}
    </div>
  );
}

export function RolleEditor({ rolle }: { rolle?: Benutzerrolle }) {
  const [state, action] = useFormState(rolleSpeichern, initial);
  const [tab, setTab] = useState<"allgemein" | "rechte">("allgemein");
  const [webZugang, setWebZugang] = useState(rolle?.web_zugang ?? true);
  const [sidebar, setSidebar] = useState<Record<string, RolleRecht>>(
    () => (rolle?.rechte?.sidebar as Record<string, RolleRecht>) ?? {},
  );

  const titel = rolle ? rolle.name || "Rolle bearbeiten" : "Neue Rolle";

  function setRecht(key: string, art: "ansehen" | "bearbeiten", value: boolean) {
    setSidebar((prev) => {
      const aktuell = { ...(prev[key] ?? {}) };
      aktuell[art] = value;
      if (art === "bearbeiten" && value) aktuell.ansehen = true;
      if (art === "ansehen" && !value) aktuell.bearbeiten = false;
      return { ...prev, [key]: aktuell };
    });
  }

  const rechteJson = JSON.stringify({ sidebar });

  const tabCls = (aktiv: boolean) =>
    cn(
      "border-b-2 pb-1.5 text-sm font-medium transition-colors",
      aktiv ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
    );

  return (
    <form action={action}>
      {rolle && <input type="hidden" name="id" value={rolle.id} />}
      <input type="hidden" name="web_zugang" value={String(webZugang)} />
      <input type="hidden" name="rechte" value={rechteJson} />

      <div className="rounded-md border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <h1 className="text-sm font-bold tracking-tight">{titel}</h1>
            <div className="flex items-center gap-5">
              <button type="button" onClick={() => setTab("allgemein")} className={tabCls(tab === "allgemein")}>
                Allgemein
              </button>
              <button type="button" onClick={() => setTab("rechte")} className={tabCls(tab === "rechte")}>
                Berechtigungen
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button asChild variant="outline" size="sm" type="button">
              <a href="/fahrlehrer/rollen">
                <X className="h-4 w-4" /> Abbrechen
              </a>
            </Button>
            <SubmitButton size="sm">
              <Check className="h-4 w-4" /> Speichern
            </SubmitButton>
          </div>
        </div>

        {state.error && (
          <div className="border-b px-4 py-2">
            <FormMessage error={state.error} />
          </div>
        )}

        {/* Allgemein */}
        <div className={cn("space-y-6 p-4", tab !== "allgemein" && "hidden")}>
          <Abschnitt title="Rolle">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <F label="Rollenname" req>
                  <input name="name" required defaultValue={rolle?.name ?? ""} placeholder="z. B. Büro" className={feld} />
                </F>
              </div>
              <div className="sm:col-span-2">
                <F label="Beschreibung">
                  <input
                    name="beschreibung"
                    defaultValue={rolle?.beschreibung ?? undefined}
                    placeholder="Kurze Beschreibung"
                    className={feld}
                  />
                </F>
              </div>
              <F label="Zugangsart">
                <input
                  name="zugangsart"
                  list="zugangsart-vorschlaege"
                  defaultValue={rolle?.zugangsart ?? undefined}
                  placeholder="z. B. Verwaltung"
                  className={feld}
                />
                <datalist id="zugangsart-vorschlaege">
                  {ZUGANGSART_VORSCHLAEGE.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </F>
            </div>
          </Abschnitt>

          <Abschnitt title="Allgemeiner Zugang">
            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Web-Zugang</p>
                <p className="text-xs text-muted-foreground">
                  Aus = der Benutzer kann sich nur über die mobile App anmelden.
                </p>
              </div>
              <Switch checked={webZugang} onCheckedChange={setWebZugang} aria-label="Web-Zugang" />
            </div>
          </Abschnitt>
        </div>

        {/* Berechtigungen */}
        <div className={cn("space-y-3 p-4", tab !== "rechte" && "hidden")}>
          <div className="overflow-hidden rounded-md border">
            <div className="grid grid-cols-[1fr_4rem_5rem] items-center gap-2 border-b bg-muted/60 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <span>Bereich</span>
              <span className="text-center">Ansehen</span>
              <span className="text-center">Bearbeiten</span>
            </div>
            <div className="divide-y">
              {SIDEBAR_BEREICHE.map((b) => {
                const recht = sidebar[b.key] ?? {};
                return (
                  <div key={b.key} className="grid grid-cols-[1fr_4rem_5rem] items-center gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{b.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{b.beschreibung}</p>
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={Boolean(recht.ansehen)}
                        onCheckedChange={(v) => setRecht(b.key, "ansehen", v)}
                        aria-label={`${b.label} ansehen`}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={Boolean(recht.bearbeiten)}
                        onCheckedChange={(v) => setRecht(b.key, "bearbeiten", v)}
                        aria-label={`${b.label} bearbeiten`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Bearbeiten schließt Ansehen automatisch mit ein.</p>
        </div>
      </div>
    </form>
  );
}
