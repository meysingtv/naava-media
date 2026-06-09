"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { fahrstundeErstellen, type KalenderState } from "./actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import type { FahrstundeTyp } from "@/lib/types";

interface Option {
  id: string;
  label: string;
}

const initial: KalenderState = {};

export function KalenderDialog({
  schueler,
  fahrlehrer,
  fahrzeuge,
  defaultDatum,
}: {
  schueler: Option[];
  fahrlehrer: Option[];
  fahrzeuge: Option[];
  defaultDatum: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(fahrstundeErstellen, initial);
  const [schuelerId, setSchuelerId] = useState("none");
  const [lehrerId, setLehrerId] = useState("none");
  const [fahrzeugId, setFahrzeugId] = useState("none");
  const [typ, setTyp] = useState<FahrstundeTyp>("normal");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Fahrstunde eingetragen");
      formRef.current?.reset();
    }
  }, [state]);

  const resolve = (v: string) => (v === "none" ? "" : v);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Neue Fahrstunde
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Fahrstunde</DialogTitle>
          <DialogDescription>Plane eine Fahrstunde für deinen Betrieb.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={action} className="space-y-4">
          <FormMessage error={state.error} />
          <input type="hidden" name="schueler_id" value={resolve(schuelerId)} />
          <input type="hidden" name="fahrlehrer_id" value={resolve(lehrerId)} />
          <input type="hidden" name="fahrzeug_id" value={resolve(fahrzeugId)} />
          <input type="hidden" name="typ" value={typ} />

          <div className="space-y-2">
            <Label>Schüler</Label>
            <Select value={schuelerId} onValueChange={setSchuelerId}>
              <SelectTrigger>
                <SelectValue placeholder="Schüler wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ohne Schüler</SelectItem>
                {schueler.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fahrlehrer</Label>
              <Select value={lehrerId} onValueChange={setLehrerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Lehrer</SelectItem>
                  {fahrlehrer.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fahrzeug</Label>
              <Select value={fahrzeugId} onValueChange={setFahrzeugId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Fahrzeug</SelectItem>
                  {fahrzeuge.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="datum">Datum</Label>
              <Input id="datum" name="datum" type="date" defaultValue={defaultDatum} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uhrzeit">Uhrzeit</Label>
              <Input id="uhrzeit" name="uhrzeit" type="time" defaultValue="09:00" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dauer_minuten">Dauer (Min)</Label>
              <Input
                id="dauer_minuten"
                name="dauer_minuten"
                type="number"
                step="5"
                min="15"
                defaultValue={45}
              />
            </div>
            <div className="space-y-2">
              <Label>Art</Label>
              <Select value={typ} onValueChange={(v) => setTyp(v as FahrstundeTyp)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FAHRSTUNDE_TYPEN) as FahrstundeTyp[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {FAHRSTUNDE_TYPEN[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notiz">Notiz</Label>
            <Textarea id="notiz" name="notiz" rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <SubmitButton>Eintragen</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
