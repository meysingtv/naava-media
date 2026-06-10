"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { theoriestundeErstellen, type TheoriestundeState } from "./actions";
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
import { THEORIE_THEMEN } from "@/lib/constants";

const initial: TheoriestundeState = {};

export function TheoriestundeDialog() {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(theoriestundeErstellen, initial);
  const formRef = useRef<HTMLFormElement>(null);

  const heute = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Theoriestunde angelegt");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus /> Neue Theoriestunde
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Theoriestunde</DialogTitle>
          <DialogDescription>
            Plane einen Theorie-Termin. Die Anwesenheit trägst du danach beim Termin ein.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={action} className="space-y-4">
          <FormMessage error={state.error} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="datum">Datum *</Label>
              <Input id="datum" name="datum" type="date" required defaultValue={heute} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uhrzeit">Uhrzeit *</Label>
              <Input id="uhrzeit" name="uhrzeit" type="time" required defaultValue="18:00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="thema">Thema</Label>
            <Input
              id="thema"
              name="thema"
              list="theorie-themen"
              placeholder="z. B. Grundstoff 1"
            />
            <datalist id="theorie-themen">
              {THEORIE_THEMEN.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_teilnehmer">Max. Teilnehmer</Label>
            <Input
              id="max_teilnehmer"
              name="max_teilnehmer"
              type="number"
              min={1}
              defaultValue={20}
            />
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
