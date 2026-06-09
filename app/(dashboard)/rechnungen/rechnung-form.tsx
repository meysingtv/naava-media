"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { Plus, Trash2 } from "lucide-react";

import { rechnungErstellen, type RechnungState } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { STEUERSAETZE } from "@/lib/constants";
import { formatEuro } from "@/lib/utils";

interface SchuelerOption {
  id: string;
  vorname: string;
  nachname: string;
}

interface Position {
  key: number;
  beschreibung: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
}

const initial: RechnungState = {};
let counter = 0;
const neuePosition = (): Position => ({
  key: counter++,
  beschreibung: "",
  menge: 1,
  einheit: "Stk",
  einzelpreis: 0,
});

export function RechnungForm({ schueler }: { schueler: SchuelerOption[] }) {
  const [state, action] = useFormState(rechnungErstellen, initial);
  const [schuelerId, setSchuelerId] = useState("none");
  const [satz, setSatz] = useState(19);
  const [positionen, setPositionen] = useState<Position[]>([neuePosition()]);

  const heute = new Date().toISOString().slice(0, 10);

  const netto = useMemo(
    () => positionen.reduce((s, p) => s + (p.menge || 0) * (p.einzelpreis || 0), 0),
    [positionen],
  );
  const steuer = netto * (satz / 100);
  const brutto = netto + steuer;

  function aktualisiere(key: number, feld: keyof Position, wert: string) {
    setPositionen((prev) =>
      prev.map((p) =>
        p.key === key
          ? {
              ...p,
              [feld]:
                feld === "menge" || feld === "einzelpreis" ? Number(wert.replace(",", ".")) || 0 : wert,
            }
          : p,
      ),
    );
  }

  return (
    <form action={action} className="space-y-6">
      <FormMessage error={state.error} />
      <input type="hidden" name="schueler_id" value={schuelerId === "none" ? "" : schuelerId} />
      <input type="hidden" name="steuersatz" value={satz} />

      <Card>
        <CardHeader>
          <CardTitle>Rechnungsdaten</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Schüler</Label>
            <Select value={schuelerId} onValueChange={setSchuelerId}>
              <SelectTrigger>
                <SelectValue placeholder="Schüler wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ohne Schüler</SelectItem>
                {schueler.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.vorname} {s.nachname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nummer">Rechnungsnummer</Label>
            <Input id="nummer" name="nummer" placeholder="Automatisch (z. B. RE-2026-0001)" />
          </div>
          <div className="space-y-2">
            <Label>MwSt.-Satz</Label>
            <Select value={String(satz)} onValueChange={(v) => setSatz(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STEUERSAETZE.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rechnungsdatum">Rechnungsdatum</Label>
            <Input id="rechnungsdatum" name="rechnungsdatum" type="date" defaultValue={heute} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="faelligkeitsdatum">Fällig bis</Label>
            <Input id="faelligkeitsdatum" name="faelligkeitsdatum" type="date" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Positionen</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPositionen((p) => [...p, neuePosition()])}
          >
            <Plus className="h-4 w-4" /> Position
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {positionen.map((p) => (
            <div key={p.key} className="grid grid-cols-12 items-end gap-2">
              <div className="col-span-12 space-y-1 sm:col-span-5">
                <Label className="text-xs">Beschreibung</Label>
                <Input
                  name="pos_beschreibung"
                  value={p.beschreibung}
                  onChange={(e) => aktualisiere(p.key, "beschreibung", e.target.value)}
                  placeholder="z. B. Fahrstunde 45 Min"
                />
              </div>
              <div className="col-span-3 space-y-1 sm:col-span-2">
                <Label className="text-xs">Menge</Label>
                <Input
                  name="pos_menge"
                  type="number"
                  step="0.5"
                  min="0"
                  value={p.menge}
                  onChange={(e) => aktualisiere(p.key, "menge", e.target.value)}
                />
              </div>
              <div className="col-span-3 space-y-1 sm:col-span-2">
                <Label className="text-xs">Einheit</Label>
                <Input
                  name="pos_einheit"
                  value={p.einheit}
                  onChange={(e) => aktualisiere(p.key, "einheit", e.target.value)}
                />
              </div>
              <div className="col-span-4 space-y-1 sm:col-span-2">
                <Label className="text-xs">Einzelpreis</Label>
                <Input
                  name="pos_einzelpreis"
                  type="number"
                  step="0.01"
                  min="0"
                  value={p.einzelpreis}
                  onChange={(e) => aktualisiere(p.key, "einzelpreis", e.target.value)}
                />
              </div>
              <div className="col-span-2 flex justify-end sm:col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    setPositionen((prev) =>
                      prev.length > 1 ? prev.filter((x) => x.key !== p.key) : prev,
                    )
                  }
                  aria-label="Position entfernen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="ml-auto w-full max-w-xs space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Netto</span>
              <span>{formatEuro(netto)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>MwSt. ({satz}%)</span>
              <span>{formatEuro(steuer)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Gesamt</span>
              <span>{formatEuro(brutto)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 pt-6">
          <Label htmlFor="notiz">Notiz (optional)</Label>
          <Textarea id="notiz" name="notiz" rows={2} placeholder="Zahlungshinweis, Verwendungszweck …" />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline" type="button">
          <a href="/rechnungen">Abbrechen</a>
        </Button>
        <SubmitButton>Rechnung erstellen</SubmitButton>
      </div>
    </form>
  );
}
