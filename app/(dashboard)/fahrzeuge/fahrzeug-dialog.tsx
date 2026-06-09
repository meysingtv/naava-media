"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { fahrzeugErstellen, type FahrzeugState } from "./actions";
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
import { FUEHRERSCHEINKLASSEN } from "@/lib/constants";

const initial: FahrzeugState = {};

export function FahrzeugDialog() {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(fahrzeugErstellen, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Fahrzeug hinzugefügt");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Neues Fahrzeug
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Fahrzeug</DialogTitle>
          <DialogDescription>Füge ein Fahrzeug zur Flotte deiner Fahrschule hinzu.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={action} className="space-y-4">
          <FormMessage error={state.error} />
          <div className="space-y-2">
            <Label htmlFor="kennzeichen">Kennzeichen *</Label>
            <Input id="kennzeichen" name="kennzeichen" required placeholder="M-AB 1234" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="marke">Marke</Label>
              <Input id="marke" name="marke" placeholder="VW" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modell">Modell</Label>
              <Input id="modell" name="modell" placeholder="Golf" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="klasse">Führerscheinklasse</Label>
            <Select name="klasse">
              <SelectTrigger id="klasse">
                <SelectValue placeholder="Klasse wählen" />
              </SelectTrigger>
              <SelectContent>
                {FUEHRERSCHEINKLASSEN.map((k) => (
                  <SelectItem key={k} value={k}>
                    Klasse {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
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
