"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { lohnVon } from "@/lib/lohn";
import { cn, formatEuro } from "@/lib/utils";
import { lohnSatzSetzen } from "./actions";

export interface LohnZeile {
  id: string;
  name: string;
  anzahl: number;
  minuten: number;
  proFahrstunde: number | null;
  stundenlohn: number | null;
}

const zahl = (text: string): number | null => {
  const t = text.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

function Zeile({ z }: { z: LohnZeile }) {
  const [pro, setPro] = useState(z.proFahrstunde != null ? String(z.proFahrstunde) : "");
  const [std, setStd] = useState(z.stundenlohn != null ? String(z.stundenlohn) : "");
  const [pending, startTransition] = useTransition();

  const geaendert = zahl(pro) !== z.proFahrstunde || zahl(std) !== z.stundenlohn;
  const vorschau = lohnVon({ ...z, proFahrstunde: zahl(pro), stundenlohn: zahl(std) });
  const ohneSatz = z.anzahl > 0 && zahl(pro) == null && zahl(std) == null;

  function speichern() {
    const daten = new FormData();
    daten.set("id", z.id);
    daten.set("lohn_pro_fahrstunde", pro.replace(",", "."));
    daten.set("stundenlohn", std.replace(",", "."));
    startTransition(async () => {
      await lohnSatzSetzen(daten);
      toast.success(`Lohnsatz für ${z.name} gespeichert`);
    });
  }

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-4 py-2.5">
        <span className="block font-medium text-foreground">{z.name}</span>
        {ohneSatz && <span className="block text-xs text-warning-text">Kein Lohnsatz hinterlegt</span>}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{z.anzahl}</td>
      <td className="hidden px-4 py-2.5 text-right tabular-nums text-foreground-secondary sm:table-cell">
        {(z.minuten / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })}
      </td>
      <td className="px-4 py-2">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (geaendert) speichern();
          }}
        >
          <div className="w-[96px] shrink-0">
            <Input
              inputSize="sm"
              inputMode="decimal"
              value={pro}
              onChange={(e) => setPro(e.target.value)}
              placeholder="—"
              trailing="€"
              aria-label={`Lohn je Fahrstunde für ${z.name}`}
              className="text-right tabular-nums"
            />
          </div>
          <div className="w-[96px] shrink-0">
            <Input
              inputSize="sm"
              inputMode="decimal"
              value={std}
              onChange={(e) => setStd(e.target.value)}
              placeholder="—"
              trailing="€"
              aria-label={`Stundenlohn für ${z.name}`}
              className="text-right tabular-nums"
            />
          </div>
          <Button
            type="submit"
            size="xs"
            variant="outline"
            loading={pending}
            className={cn("transition-opacity", geaendert ? "opacity-100" : "pointer-events-none opacity-0")}
            tabIndex={geaendert ? 0 : -1}
          >
            <Check /> <span className="sr-only xl:not-sr-only">Speichern</span>
          </Button>
        </form>
      </td>
      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-foreground">{formatEuro(vorschau)}</td>
    </tr>
  );
}

export function LohnTabelle({ zeilen }: { zeilen: LohnZeile[] }) {
  const gesamt = zeilen.reduce((s, z) => s + lohnVon(z), 0);

  return (
    <Panel padding="none">
      <div className="overflow-x-auto">
        <table className="w-full text-13">
          <thead>
            <tr className="border-b border-border text-left text-xs text-foreground-secondary">
              <th className="h-10 px-4 font-medium">Fahrlehrer</th>
              <th className="h-10 px-4 text-right font-medium">Fahrstunden</th>
              <th className="hidden h-10 px-4 text-right font-medium sm:table-cell">Stunden</th>
              <th className="h-10 px-4 font-medium">
                <span className="inline-flex w-[96px] justify-end">je Fahrstunde</span>
                <span className="ml-2 inline-flex w-[96px] justify-end">je Stunde</span>
              </th>
              <th className="h-10 px-4 text-right font-medium">Lohn</th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((z) => (
              <Zeile key={z.id} z={z} />
            ))}
            {zeilen.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-foreground-secondary">
                  Keine Fahrlehrer vorhanden.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-surface-muted/50">
              <td className="px-4 py-3 font-semibold text-foreground" colSpan={4}>
                Gesamt
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">{formatEuro(gesamt)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}
