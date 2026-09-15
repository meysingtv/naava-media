"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { smartVorschlagBerechnen, terminAusVorschlag, type DispoVorschlag } from "./actions";
import type { Option } from "./fahrstunde-panel";

function formatSlot(datum: string, uhrzeit: string): string {
  const d = new Date(`${datum}T${uhrzeit}:00`);
  const tag = d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
  return `${tag} · ${uhrzeit} Uhr`;
}

function FortschrittReihe({ label, done, soll }: { label: string; done: number; soll: number }) {
  const quote = soll > 0 ? Math.min(100, Math.round((done / soll) * 100)) : 100;
  const fertig = done >= soll;
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
        <div className={cn("h-full rounded-full", fertig ? "bg-success" : "bg-primary")} style={{ width: `${quote}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">
        {done}/{soll}
      </span>
    </div>
  );
}

export function VorschlagKarte({ v }: { v: DispoVorschlag }) {
  const typ = FAHRSTUNDE_TYPEN[v.typ];
  return (
    <div className="space-y-3 rounded-lg border bg-surface-muted p-3">
      <div className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", typ.dot)} />
        <span className="text-[13px] font-semibold text-foreground">{typ.label}</span>
        <span className="ml-auto text-xs text-muted-foreground">Klasse {v.klasse}</span>
      </div>
      <p className="text-xs text-foreground-secondary">{v.begruendung}</p>

      <div className="rounded-md border bg-card px-3 py-2">
        <p className="text-[13px] font-semibold text-foreground">{formatSlot(v.datum, v.uhrzeit)}</p>
        <p className="text-xs text-muted-foreground">
          {v.dauer_minuten} Min · {v.fahrlehrerName ?? "Fahrlehrer offen"} · {v.fahrzeugKennzeichen ?? "Fahrzeug offen"}
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="label-caps">Pflicht-Sonderfahrten</p>
        <FortschrittReihe label="Überland" done={v.fortschritt.ueberland[0]} soll={v.fortschritt.ueberland[1]} />
        <FortschrittReihe label="Autobahn" done={v.fortschritt.autobahn[0]} soll={v.fortschritt.autobahn[1]} />
        <FortschrittReihe label="Nacht" done={v.fortschritt.nacht[0]} soll={v.fortschritt.nacht[1]} />
      </div>
    </div>
  );
}

export function SmartVorschlag({ schueler }: { schueler: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [schuelerId, setSchuelerId] = useState("");
  const [vorschlag, setVorschlag] = useState<DispoVorschlag | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [berechnePending, startBerechnen] = useTransition();
  const [anlegenPending, startAnlegen] = useTransition();

  function reset() {
    setVorschlag(null);
    setFehler(null);
    setSchuelerId("");
  }

  function berechnen() {
    setFehler(null);
    startBerechnen(async () => {
      const res = await smartVorschlagBerechnen(schuelerId);
      if (res.ok) setVorschlag(res.vorschlag);
      else {
        setVorschlag(null);
        setFehler(res.error);
      }
    });
  }

  function anlegen() {
    if (!vorschlag) return;
    startAnlegen(async () => {
      const res = await terminAusVorschlag({
        schueler_id: vorschlag.schueler_id,
        fahrlehrer_id: vorschlag.fahrlehrer_id,
        fahrzeug_id: vorschlag.fahrzeug_id,
        datum: vorschlag.datum,
        uhrzeit: vorschlag.uhrzeit,
        dauer_minuten: vorschlag.dauer_minuten,
        typ: vorschlag.typ,
      });
      if (res.ok) {
        toast.success("Termin angelegt");
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast.error(res.error ?? "Termin konnte nicht angelegt werden.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="h-4 w-4 text-primary" /> Smart-Vorschlag
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Smart-Vorschlag</DialogTitle>
          <DialogDescription>
            Nächste sinnvolle Fahrstunde automatisch planen – passender Termin, Fahrlehrer und Fahrzeug.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[13px] text-foreground/70">Schüler</label>
            <Select
              value={schuelerId}
              onValueChange={(v) => {
                setSchuelerId(v);
                setVorschlag(null);
                setFehler(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Schüler wählen …" />
              </SelectTrigger>
              <SelectContent>
                {schueler.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fehler && <p className="text-xs text-destructive">{fehler}</p>}
          {vorschlag && <VorschlagKarte v={vorschlag} />}
        </div>

        <DialogFooter>
          {!vorschlag ? (
            <Button onClick={berechnen} disabled={!schuelerId || berechnePending}>
              <Wand2 className="h-4 w-4" />
              {berechnePending ? "Berechne …" : "Vorschlag berechnen"}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setVorschlag(null)}>
                <RotateCcw className="h-4 w-4" /> Neu
              </Button>
              <Button onClick={anlegen} disabled={anlegenPending}>
                <CalendarPlus className="h-4 w-4" />
                {anlegenPending ? "Lege an …" : "Termin anlegen"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
