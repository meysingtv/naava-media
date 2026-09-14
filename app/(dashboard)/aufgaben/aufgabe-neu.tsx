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
import { aufgabeErstellen, type AufgabeState } from "./actions";

const initial: AufgabeState = {};
const feld =
  "h-10 w-full rounded-md border border-border-strong bg-background px-3 text-sm shadow-xs focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20";

export function AufgabeNeu({ schueler }: { schueler: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(aufgabeErstellen, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Aufgabe angelegt");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Neue Aufgabe
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Aufgabe</DialogTitle>
          <DialogDescription>Lege ein To-do für dein Team an.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={action} className="space-y-4">
          <FormMessage error={state.error} />
          <div className="space-y-2">
            <Label htmlFor="titel">Titel *</Label>
            <Input id="titel" name="titel" required placeholder="z. B. Sehtest nachfordern" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prioritaet">Priorität</Label>
              <select id="prioritaet" name="prioritaet" defaultValue="mittel" className={feld}>
                <option value="niedrig">Niedrig</option>
                <option value="mittel">Mittel</option>
                <option value="hoch">Hoch</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="faellig_am">Fällig am</Label>
              <Input id="faellig_am" name="faellig_am" type="date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schueler_id">Schüler (optional)</Label>
            <select id="schueler_id" name="schueler_id" defaultValue="" className={feld}>
              <option value="">— kein Schüler —</option>
              {schueler.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <SubmitButton>Anlegen</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
