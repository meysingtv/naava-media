"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { formatEuro } from "@/lib/utils";
import type { Leistung } from "@/lib/types";
import { leistungErstellen, leistungLoeschen, type LeistungState } from "./leistungen-actions";

const initial: LeistungState = {};

export function Preisliste({ leistungen }: { leistungen: Leistung[] }) {
  const [state, action] = useFormState(leistungErstellen, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Leistung gespeichert");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preisliste / Leistungen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Definiere Standard-Leistungen mit Preisen – beim Rechnung-Erstellen fügst du sie mit einem Klick ein.
        </p>

        {leistungen.length > 0 && (
          <div className="divide-y rounded-lg border">
            {leistungen.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{l.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.kategorie ? `${l.kategorie} · ` : ""}
                    pro {l.einheit}
                    {l.klasse ? ` · Klasse ${l.klasse}` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="tabular-nums">
                  {formatEuro(Number(l.preis))}
                </Badge>
                <form action={leistungLoeschen}>
                  <input type="hidden" name="id" value={l.id} />
                  <button
                    type="submit"
                    aria-label="Löschen"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form ref={formRef} action={action} className="space-y-3 rounded-lg border bg-surface/50 p-3">
          <FormMessage error={state.error} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <div className="space-y-1 sm:col-span-3">
              <Label className="text-xs">Name *</Label>
              <Input name="name" required placeholder="z. B. Fahrstunde 45 Min" />
            </div>
            <div className="space-y-1 sm:col-span-1">
              <Label className="text-xs">Preis €</Label>
              <Input name="preis" type="number" step="0.01" min="0" placeholder="0,00" />
            </div>
            <div className="space-y-1 sm:col-span-1">
              <Label className="text-xs">Einheit</Label>
              <Input name="einheit" defaultValue="Stk" />
            </div>
            <div className="space-y-1 sm:col-span-1">
              <Label className="text-xs">Klasse</Label>
              <Input name="klasse" placeholder="z. B. B" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <div className="space-y-1 sm:col-span-3">
              <Label className="text-xs">Kategorie</Label>
              <Input name="kategorie" placeholder="Fahrstunde / Gebühr / Material" />
            </div>
            <div className="flex items-end sm:col-span-3">
              <SubmitButton className="ml-auto">
                <Plus /> Leistung hinzufügen
              </SubmitButton>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
