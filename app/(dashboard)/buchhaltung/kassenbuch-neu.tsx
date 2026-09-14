"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";

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
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { kassenEintragErstellen, type KassenState } from "./actions";

const initial: KassenState = {};
const feld =
  "h-10 w-full rounded-md border border-border-strong bg-background px-3 text-sm shadow-xs focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20";

export function KassenbuchNeu() {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(kassenEintragErstellen, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const heute = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Kassenbuch-Eintrag gespeichert");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus /> Kassen-Eintrag
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kassenbuch-Eintrag</DialogTitle>
          <DialogDescription>Bareinnahme oder -ausgabe erfassen.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={action} className="space-y-4">
          <FormMessage error={state.error} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="typ">Art</Label>
              <select id="typ" name="typ" defaultValue="einnahme" className={feld}>
                <option value="einnahme">Einnahme</option>
                <option value="ausgabe">Ausgabe</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="betrag">Betrag € *</Label>
              <Input id="betrag" name="betrag" type="number" step="0.01" min="0" required placeholder="0,00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="datum">Datum</Label>
              <Input id="datum" name="datum" type="date" defaultValue={heute} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="beleg">Beleg-Nr.</Label>
              <Input id="beleg" name="beleg" placeholder="z. B. B-2026-001" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kategorie">Kategorie</Label>
            <Input id="kategorie" name="kategorie" placeholder="z. B. Barzahlung Fahrstunde, Tanken, Büro" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung</Label>
            <Input id="beschreibung" name="beschreibung" placeholder="optional" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <SubmitButton>Speichern</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
