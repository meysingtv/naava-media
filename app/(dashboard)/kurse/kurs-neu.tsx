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
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { kursErstellen, type KursState } from "./actions";

const initial: KursState = {};
const feld =
  "h-10 w-full rounded-md border border-border-strong bg-background px-3 text-sm shadow-xs focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20";

export function KursNeu({ klassen }: { klassen: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(kursErstellen, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Kurs angelegt");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Kurs anlegen
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuer Kurs</DialogTitle>
          <DialogDescription>Theoriekurs für eine Gruppe planen.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={action} className="space-y-4">
          <FormMessage error={state.error} />
          <div className="space-y-2">
            <Label htmlFor="name">Kursname *</Label>
            <Input id="name" name="name" required placeholder="z. B. Abendkurs Klasse B – März" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="klasse">Klasse</Label>
              <select id="klasse" name="klasse" defaultValue="" className={feld}>
                <option value="">—</option>
                {klassen.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_datum">Start</Label>
              <Input id="start_datum" name="start_datum" type="date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung</Label>
            <Textarea id="beschreibung" name="beschreibung" rows={2} placeholder="optional" />
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
