"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { fahrstundeSpeichern, fahrstundeLoeschen, fahrstundeStatusSetzen, type KalenderState } from "./actions";
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
import { Separator } from "@/components/ui/separator";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import type { Fahrstunde, FahrstundeTyp } from "@/lib/types";
import { useState } from "react";

export interface Option {
  id: string;
  label: string;
}

export interface FahrstundeInitial {
  datum?: string;
  uhrzeit?: string;
  dauer_minuten?: number;
  fahrlehrer_id?: string;
  typ?: FahrstundeTyp;
}

const initialState: KalenderState = {};

export function FahrstundeDialog({
  open,
  onOpenChange,
  options,
  fahrstunde,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: { schueler: Option[]; fahrlehrer: Option[]; fahrzeuge: Option[] };
  fahrstunde?: Fahrstunde;
  initial?: FahrstundeInitial;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [state, action] = useFormState(fahrstundeSpeichern, initialState);

  const heute = new Date().toISOString().slice(0, 10);
  const [schuelerId, setSchuelerId] = useState(fahrstunde?.schueler_id ?? "none");
  const [lehrerId, setLehrerId] = useState(
    fahrstunde?.fahrlehrer_id ?? initial?.fahrlehrer_id ?? "none",
  );
  const [fahrzeugId, setFahrzeugId] = useState(fahrstunde?.fahrzeug_id ?? "none");
  const [typ, setTyp] = useState<FahrstundeTyp>(fahrstunde?.typ ?? initial?.typ ?? "normal");

  useEffect(() => {
    if (state.ok) {
      onOpenChange(false);
      toast.success(fahrstunde ? "Fahrstunde aktualisiert" : "Fahrstunde eingetragen");
      onSaved?.();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const resolve = (v: string) => (v === "none" ? "" : v);
  const istBearbeiten = Boolean(fahrstunde);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{istBearbeiten ? "Fahrstunde bearbeiten" : "Neue Fahrstunde"}</DialogTitle>
          <DialogDescription>
            {istBearbeiten
              ? "Ändere die Details, verschiebe die Stunde oder setze den Status."
              : "Plane eine Fahrstunde für deinen Betrieb."}
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <FormMessage error={state.error} />
          {fahrstunde && <input type="hidden" name="id" value={fahrstunde.id} />}
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
                {options.schueler.map((s) => (
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
                  {options.fahrlehrer.map((f) => (
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
                  {options.fahrzeuge.map((f) => (
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
              <Input
                id="datum"
                name="datum"
                type="date"
                required
                defaultValue={fahrstunde?.datum ?? initial?.datum ?? heute}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uhrzeit">Uhrzeit</Label>
              <Input
                id="uhrzeit"
                name="uhrzeit"
                type="time"
                required
                defaultValue={fahrstunde?.uhrzeit?.slice(0, 5) ?? initial?.uhrzeit ?? "09:00"}
              />
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
                defaultValue={fahrstunde?.dauer_minuten ?? initial?.dauer_minuten ?? 45}
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
            <Textarea id="notiz" name="notiz" rows={2} defaultValue={fahrstunde?.notiz ?? undefined} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <SubmitButton>{istBearbeiten ? "Speichern" : "Eintragen"}</SubmitButton>
          </div>
        </form>

        {fahrstunde && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Status &amp; Aktionen</p>
              <div className="flex flex-wrap gap-2">
                <form action={fahrstundeStatusSetzen} onSubmit={() => onOpenChange(false)}>
                  <input type="hidden" name="id" value={fahrstunde.id} />
                  <input type="hidden" name="status" value="abgeschlossen" />
                  <Button type="submit" variant="success" size="sm">
                    Abgeschlossen
                  </Button>
                </form>
                <form action={fahrstundeStatusSetzen} onSubmit={() => onOpenChange(false)}>
                  <input type="hidden" name="id" value={fahrstunde.id} />
                  <input type="hidden" name="status" value="ausgefallen" />
                  <Button type="submit" variant="outline" size="sm">
                    Ausgefallen
                  </Button>
                </form>
                <form action={fahrstundeStatusSetzen} onSubmit={() => onOpenChange(false)}>
                  <input type="hidden" name="id" value={fahrstunde.id} />
                  <input type="hidden" name="status" value="geplant" />
                  <Button type="submit" variant="outline" size="sm">
                    Geplant
                  </Button>
                </form>
                <form action={fahrstundeLoeschen} onSubmit={() => onOpenChange(false)} className="ml-auto">
                  <input type="hidden" name="id" value={fahrstunde.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Löschen
                  </Button>
                </form>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
