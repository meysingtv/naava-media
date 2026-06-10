"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { Info, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { fahrlehrerAnlegen, type FahrlehrerState } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { FUEHRERSCHEINKLASSEN, ROLLEN_BESCHREIBUNG } from "@/lib/constants";
import { cn } from "@/lib/utils";

const initial: FahrlehrerState = {};

export function EinladenDialog() {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(fahrlehrerAnlegen, initial);
  const [klassen, setKlassen] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setKlassen([]);
      toast.success("Mitarbeiter hinzugefügt");
      formRef.current?.reset();
    }
  }, [state]);

  function toggleKlasse(k: string) {
    setKlassen((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <UserPlus /> Mitarbeiter hinzufügen
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mitarbeiter hinzufügen</DialogTitle>
          <DialogDescription>
            Lege einen Fahrlehrer oder eine Bürokraft an und weise eine Rolle zu.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={action} className="space-y-4">
          <FormMessage error={state.error} />
          {klassen.map((k) => (
            <input key={k} type="hidden" name="klassen" value={k} />
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vorname">Vorname *</Label>
              <Input id="vorname" name="vorname" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nachname">Nachname *</Label>
              <Input id="nachname" name="nachname" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefon">Telefon</Label>
              <Input id="telefon" name="telefon" type="tel" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rolle">Rolle</Label>
            <Select name="rolle" defaultValue="fahrlehrer">
              <SelectTrigger id="rolle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fahrlehrer">Fahrlehrer – {ROLLEN_BESCHREIBUNG.fahrlehrer}</SelectItem>
                <SelectItem value="buero">Büro – {ROLLEN_BESCHREIBUNG.buero}</SelectItem>
                <SelectItem value="chef">Chef – {ROLLEN_BESCHREIBUNG.chef}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Führerscheinklassen</Label>
            <div className="flex flex-wrap gap-2">
              {FUEHRERSCHEINKLASSEN.map((k) => {
                const aktiv = klassen.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleKlasse(k)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-sm font-medium transition-colors",
                      aktiv
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent",
                    )}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="einladen"
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
            />
            Login-Zugang per E-Mail einladen
          </label>
          <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Ohne Einladung erscheint der Mitarbeiter sofort im Team und kann Fahrstunden
              zugewiesen bekommen. Mit Einladung erhält er zusätzlich eine E-Mail, um sein Passwort
              zu setzen und sich anzumelden (E-Mail-Adresse erforderlich).
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <SubmitButton>Hinzufügen</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
