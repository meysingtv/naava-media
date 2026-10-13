"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Auswahl } from "@/components/ui/auswahl";
import { Button } from "@/components/ui/button";
import { teilnehmerHinzufuegen } from "../actions";

/** Schüler auswählen und dem Kurs hinzufügen – die Auswahl leert sich danach. */
export function TeilnehmerHinzufuegen({
  kursId,
  schueler,
}: {
  kursId: string;
  schueler: { id: string; label: string }[];
}) {
  const [wahl, setWahl] = useState("");
  const [pending, startTransition] = useTransition();

  function hinzufuegen() {
    const s = schueler.find((x) => x.id === wahl);
    if (!s) return;
    const daten = new FormData();
    daten.set("kurs_id", kursId);
    daten.set("schueler_id", s.id);
    startTransition(async () => {
      await teilnehmerHinzufuegen(daten);
      setWahl("");
      toast.success(`${s.label} hinzugefügt`);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Auswahl
        optionen={schueler.map((s) => ({ value: s.id, label: s.label }))}
        value={wahl}
        onChange={setWahl}
        placeholder="Schüler hinzufügen"
        inputSize="sm"
        className="w-[220px]"
      />
      <Button type="button" size="sm" variant="outline" disabled={!wahl} loading={pending} onClick={hinzufuegen}>
        <Plus /> Hinzufügen
      </Button>
    </div>
  );
}
