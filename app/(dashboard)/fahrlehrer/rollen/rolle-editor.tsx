"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Check, Globe, LayoutGrid, ShieldCheck, Smartphone, Trash2, X } from "lucide-react";

import { rolleSpeichern, rolleLoeschen, type RolleState } from "../rollen-actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { Switch } from "@/components/ui/switch";
import { SIDEBAR_BEREICHE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Benutzerrolle, RolleRecht } from "@/lib/types";

const initialState: RolleState = {};

const feld =
  "h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10";

const ZUGANGSART_VORSCHLAEGE = ["Verwaltung", "Fahrlehrer", "Büro", "Eingeschränkt"];

export function RolleEditor({ rolle }: { rolle?: Benutzerrolle }) {
  const [state, action] = useFormState(rolleSpeichern, initialState);
  const [tab, setTab] = useState<"sidebar" | "allgemein">("sidebar");
  const [webZugang, setWebZugang] = useState(rolle?.web_zugang ?? true);
  const [sidebar, setSidebar] = useState<Record<string, RolleRecht>>(
    () => (rolle?.rechte?.sidebar as Record<string, RolleRecht>) ?? {},
  );
  const [confirmDel, setConfirmDel] = useState(false);

  const istBearbeiten = Boolean(rolle);
  const titel = istBearbeiten ? rolle!.name || "Rolle bearbeiten" : "Neue Rolle";

  function setRecht(key: string, art: "ansehen" | "bearbeiten", value: boolean) {
    setSidebar((prev) => {
      const aktuell = { ...(prev[key] ?? {}) };
      aktuell[art] = value;
      // Bearbeiten setzt Ansehen voraus; ohne Ansehen kein Bearbeiten.
      if (art === "bearbeiten" && value) aktuell.ansehen = true;
      if (art === "ansehen" && !value) aktuell.bearbeiten = false;
      return { ...prev, [key]: aktuell };
    });
  }

  const rechteJson = JSON.stringify({ sidebar });

  const tabCls = (aktiv: boolean) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      aktiv ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-5">
        {rolle && <input type="hidden" name="id" value={rolle.id} />}
        <input type="hidden" name="web_zugang" value={String(webZugang)} />
        <input type="hidden" name="rechte" value={rechteJson} />

        {/* Kopf der Editor-Karte: Titel links, Aktionen oben rechts */}
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-[18px] w-[18px]" />
              </span>
              <h2 className="truncate text-base font-semibold tracking-tight">{titel}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
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

          <div className="space-y-4 p-6">
            {state.error && <FormMessage error={state.error} />}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-foreground/80">
                  Rollenname <span className="text-destructive">*</span>
                </label>
                <input
                  name="name"
                  required
                  defaultValue={rolle?.name ?? ""}
                  placeholder="z. B. Büro"
                  className={feld}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-foreground/80">Beschreibung</label>
                <input
                  name="beschreibung"
                  defaultValue={rolle?.beschreibung ?? undefined}
                  placeholder="Kurze Beschreibung der Rolle"
                  className={feld}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground/80">Zugangsart</label>
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
              </div>
            </div>
          </div>
        </div>

        {/* Berechtigungen mit Tabs */}
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b px-6 py-4">
            <h3 className="text-base font-semibold tracking-tight">Berechtigungen</h3>
            <div className="ml-auto inline-flex rounded-lg border bg-muted/40 p-1">
              <button type="button" onClick={() => setTab("sidebar")} className={tabCls(tab === "sidebar")}>
                Sidebar-Zugang
              </button>
              <button type="button" onClick={() => setTab("allgemein")} className={tabCls(tab === "allgemein")}>
                Allgemeiner Zugang
              </button>
            </div>
          </div>

          {/* Sidebar-Zugang */}
          <div className={cn("p-6", tab !== "sidebar" && "hidden")}>
            <div className="overflow-hidden rounded-xl border">
              <div className="grid grid-cols-[1fr_4rem_4.5rem] items-center gap-3 border-b bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[1fr_5rem_5rem]">
                <span>Bereich</span>
                <span className="text-center">Ansehen</span>
                <span className="text-center">Bearbeiten</span>
              </div>
              <div className="divide-y">
                {SIDEBAR_BEREICHE.map((b) => {
                  const recht = sidebar[b.key] ?? {};
                  return (
                    <div
                      key={b.key}
                      className="grid grid-cols-[1fr_4rem_4.5rem] items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_5rem_5rem]"
                    >
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
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">Bearbeiten</span> schließt{" "}
              <span className="font-medium text-foreground">Ansehen</span> automatisch mit ein.
            </p>
          </div>

          {/* Allgemeiner Zugang */}
          <div className={cn("p-6", tab !== "allgemein" && "hidden")}>
            <div className="rounded-xl border">
              <div className="flex items-center justify-between gap-4 px-4 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {webZugang ? (
                      <Globe className="h-[18px] w-[18px]" />
                    ) : (
                      <Smartphone className="h-[18px] w-[18px]" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Web-Zugang</p>
                    <p className="text-xs text-muted-foreground">
                      Anmeldung über die Web-App erlauben. Ist er deaktiviert, kann sich der Benutzer nur
                      über die mobile App anmelden.
                    </p>
                  </div>
                </div>
                <Switch checked={webZugang} onCheckedChange={setWebZugang} aria-label="Web-Zugang" />
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Löschen (eigenes Formular – Formulare dürfen nicht verschachtelt sein) */}
      {istBearbeiten && (
        <div className="flex justify-end">
          {confirmDel ? (
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
              <span className="text-sm text-muted-foreground">Diese Rolle wirklich löschen?</span>
              <form action={rolleLoeschen}>
                <input type="hidden" name="id" value={rolle!.id} />
                <Button type="submit" variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4" /> Löschen
                </Button>
              </form>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDel(false)}>
                Abbrechen
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDel(true)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Rolle löschen
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
