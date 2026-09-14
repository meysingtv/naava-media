"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { formatEuro } from "@/lib/utils";
import { zahlungErfassen, type ZahlungState } from "./actions";

const initial: ZahlungState = {};
const feld =
  "h-10 w-full rounded-md border border-border-strong bg-background px-3 text-sm shadow-xs focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20";

export interface OffeneRechnung {
  id: string;
  nummer: string;
  betrag: number;
  schueler_id: string | null;
  schueler: string;
}

export function ZahlungNeu({
  schueler,
  offene,
}: {
  schueler: { id: string; label: string }[];
  offene: OffeneRechnung[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(zahlungErfassen, initial);
  const formRef = useRef<HTMLFormElement>(null);

  const [rechnungId, setRechnungId] = useState("");
  const [schuelerId, setSchuelerId] = useState("");
  const [betrag, setBetrag] = useState("");

  const gewaehlt = useMemo(() => offene.find((o) => o.id === rechnungId), [offene, rechnungId]);

  useEffect(() => {
    if (gewaehlt) {
      setBetrag(String(gewaehlt.betrag.toFixed(2)));
      if (gewaehlt.schueler_id) setSchuelerId(gewaehlt.schueler_id);
    }
  }, [gewaehlt]);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      toast.success("Zahlung erfasst");
      formRef.current?.reset();
      setRechnungId("");
      setSchuelerId("");
      setBetrag("");
    }
  }, [state]);

  const heute = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Zahlung erfassen
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zahlung erfassen</DialogTitle>
          <DialogDescription>Zahlungseingang buchen – optional direkt einer Rechnung zuordnen.</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={action} className="space-y-4">
          <FormMessage error={state.error} />

          <div className="space-y-2">
            <Label htmlFor="rechnung_id">Offene Rechnung (optional)</Label>
            <select
              id="rechnung_id"
              name="rechnung_id"
              value={rechnungId}
              onChange={(e) => setRechnungId(e.target.value)}
              className={feld}
            >
              <option value="">— keine Zuordnung —</option>
              {offene.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nummer} · {o.schueler} · {formatEuro(o.betrag)}
                </option>
              ))}
            </select>
            {rechnungId && (
              <p className="text-xs text-primary">Diese Rechnung wird automatisch als „bezahlt“ markiert.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="betrag">Betrag € *</Label>
              <Input
                id="betrag"
                name="betrag"
                type="number"
                step="0.01"
                min="0"
                required
                value={betrag}
                onChange={(e) => setBetrag(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="art">Zahlart</Label>
              <select id="art" name="art" defaultValue="ueberweisung" className={feld}>
                <option value="ueberweisung">Überweisung</option>
                <option value="bar">Bar</option>
                <option value="lastschrift">Lastschrift</option>
                <option value="karte">Karte</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="schueler_id">Schüler</Label>
              <select
                id="schueler_id"
                name="schueler_id"
                value={schuelerId}
                onChange={(e) => setSchuelerId(e.target.value)}
                className={feld}
              >
                <option value="">— keiner —</option>
                {schueler.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="datum">Datum</Label>
              <Input id="datum" name="datum" type="date" defaultValue={heute} />
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
            <SubmitButton>Buchen</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
