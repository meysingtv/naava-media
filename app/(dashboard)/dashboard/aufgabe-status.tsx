"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aufgabeStatusSetzen } from "../aufgaben/actions";

/**
 * Status einer Aufgabe direkt in der Zeile ändern – ohne die Aufgabenseite
 * zu öffnen. Erledigte Aufgaben verschwinden nach dem Speichern aus dem
 * Leitstand.
 */
export function AufgabeStatus({ id, status, titel }: { id: string; status: string; titel: string }) {
  const [pending, start] = useTransition();

  function setzen(neu: string) {
    if (neu === status) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", neu);
    start(async () => {
      await aufgabeStatusSetzen(fd);
      toast.success(neu === "erledigt" ? `„${titel}" erledigt` : `„${titel}" wieder offen`);
    });
  }

  return (
    <Select value={status} onValueChange={setzen} disabled={pending}>
      <SelectTrigger triggerSize="sm" className="h-7 w-[108px] text-13" aria-label={`Status von „${titel}"`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="offen">Offen</SelectItem>
        <SelectItem value="erledigt">Erledigt</SelectItem>
      </SelectContent>
    </Select>
  );
}
