import { createClient } from "@/lib/supabase/server";
import { initialen } from "@/lib/utils";
import type { Fahrlehrer } from "@/lib/types";

export interface FahrlehrerOption {
  id: string;
  kuerzel: string;
  name: string;
}

/** Aktive Fahrlehrer mit Kürzel – für die Auswahl und Anzeige am Fahrzeug. */
export async function fahrlehrerOptionen(): Promise<FahrlehrerOption[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("fahrlehrer")
    .select("id, vorname, nachname, kuerzel")
    .eq("aktiv", true)
    .order("nachname")
    .returns<Pick<Fahrlehrer, "id" | "vorname" | "nachname" | "kuerzel">[]>();

  return (data ?? []).map((f) => ({
    id: f.id,
    kuerzel: f.kuerzel?.trim() || initialen(f.vorname, f.nachname),
    name: `${f.vorname} ${f.nachname}`,
  }));
}
