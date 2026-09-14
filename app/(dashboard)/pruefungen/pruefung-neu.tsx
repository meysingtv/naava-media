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
import { pruefungErstellen, type PruefungState } from "./actions";

const initial: PruefungState = {};
const feld =
  "h-10 w-full rounded-md border border-border-strong bg-background px-3 text-sm shadow-xs focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20";

const PRUEFSTELLEN = ["TÜV Nord", "TÜV Süd", "TÜV Hessen", "TÜV Rheinland", "DEKRA"];

export function PruefungNeu({
  schueler,
  klassen,
}: {
  schueler: { id: string; label: string; klasse: string }[];
  klassen: string[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(pruefungErstellen, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const heute = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Prüfung eingetragen");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Prüfung anlegen
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prüfung anlegen</DialogTitle>
          <DialogDescription>Theorie- oder Praxisprüfung planen.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={action} className="space-y-4">
          <FormMessage error={state.error} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="art">Art</Label>
              <select id="art" name="art" defaultValue="theorie" className={feld}>
                <option value="theorie">Theorieprüfung</option>
                <option value="praxis">Praktische Prüfung</option>
              </select>
            </div>
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="schueler_id">Schüler</Label>
            <select id="schueler_id" name="schueler_id" defaultValue="" className={feld}>
              <option value="">— kein Schüler —</option>
              {schueler.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="datum">Datum *</Label>
              <Input id="datum" name="datum" type="date" required defaultValue={heute} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uhrzeit">Uhrzeit</Label>
              <Input id="uhrzeit" name="uhrzeit" type="time" defaultValue="08:00" />
            </div>
          </div>
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-3">
            <div className="space-y-2">
              <Label htmlFor="pruefstelle">Prüfstelle</Label>
              <select id="pruefstelle" name="pruefstelle" defaultValue="" className={feld}>
                <option value="">—</option>
                {PRUEFSTELLEN.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="versuch">Versuch</Label>
              <Input id="versuch" name="versuch" type="number" min={1} defaultValue={1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gebuehr">Gebühr €</Label>
              <Input id="gebuehr" name="gebuehr" type="number" step="0.01" min={0} placeholder="z. B. 22,90" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notiz">Notiz</Label>
            <Input id="notiz" name="notiz" placeholder="optional" />
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
