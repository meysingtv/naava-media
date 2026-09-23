"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  lernfortschrittAuswerten,
  lernfortschrittSpeichern,
  type KiVorschlag,
} from "./ki-actions";

export function KiLernstatusDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [vorschlaege, setVorschlaege] = useState<KiVorschlag[] | null>(null);
  const [hinweise, setHinweise] = useState<string[]>([]);
  const [ausgewaehlt, setAusgewaehlt] = useState<Set<string>>(new Set());

  function reset() {
    setText("");
    setVorschlaege(null);
    setHinweise([]);
    setAusgewaehlt(new Set());
    setBusy(false);
  }

  async function auswerten() {
    setBusy(true);
    const res = await lernfortschrittAuswerten(text);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setVorschlaege(res.updates ?? []);
    setHinweise(res.hinweise ?? []);
    setAusgewaehlt(new Set((res.updates ?? []).map((u) => u.id)));
  }

  async function uebernehmen() {
    const updates = (vorschlaege ?? [])
      .filter((v) => ausgewaehlt.has(v.id))
      .map((v) => ({ id: v.id, neu: v.neu }));
    if (updates.length === 0) {
      toast.error("Nichts ausgewählt.");
      return;
    }
    setBusy(true);
    const res = await lernfortschrittSpeichern(updates);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`${updates.length} Schüler aktualisiert`);
    reset();
    setOpen(false);
    router.refresh();
  }

  function toggle(id: string) {
    setAusgewaehlt((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
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
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles /> Lernstand aktualisieren
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lernstatus per KI aktualisieren</DialogTitle>
          <DialogDescription>
            Schreib die Fortschritte frei rein – die KI ordnet sie den Schülern zu. Du bestätigst
            alles, bevor gespeichert wird.
          </DialogDescription>
        </DialogHeader>

        {!vorschlaege ? (
          <>
            <DialogBody>
              <Textarea
                rows={7}
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label="Lernstand der Schüler"
                placeholder={"z. B.\nBerta 45 %\nTom Schmidt 60\nLena 80"}
              />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
              <Button type="button" size="sm" onClick={auswerten} disabled={!text.trim()} loading={busy} data-primary>
                Auswerten
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
          <DialogBody>
            {vorschlaege.length === 0 ? (
              <p className="rounded-md bg-surface-muted/60 px-3 py-6 text-center text-13 text-foreground-secondary">
                Keine eindeutigen Zuordnungen gefunden.
              </p>
            ) : (
              <ul className="max-h-64 divide-y overflow-y-auto rounded-md border">
                {vorschlaege.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={ausgewaehlt.has(v.id)}
                      onChange={() => toggle(v.id)}
                      className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary/25"
                    />
                    <span className="flex-1 truncate font-medium">{v.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {v.alt}% →{" "}
                      <span className="font-semibold text-foreground">{v.neu}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {hinweise.length > 0 && (
              <div className="rounded-md bg-warning-soft p-3 text-xs text-warning-text">
                <p className="mb-1 font-medium">Bitte prüfen:</p>
                <ul className="list-disc space-y-0.5 pl-4">
                  {hinweise.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setVorschlaege(null)}>
              Zurück
            </Button>
            <Button type="button" size="sm" onClick={uebernehmen} disabled={ausgewaehlt.size === 0} loading={busy} data-primary>
              {ausgewaehlt.size} übernehmen
            </Button>
          </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
