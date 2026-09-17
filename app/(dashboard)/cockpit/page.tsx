import { createClient } from "@/lib/supabase/server";
import { DEMO, demoCockpitFahrzeuge, demoCockpitLehrer, demoCockpitOffene, demoCockpitStunden } from "@/lib/demo";
import { CockpitView, type CockpitFahrzeug, type CockpitLehrer, type CockpitRechnung, type CockpitStunde } from "./cockpit-view";

export const metadata = { title: "Cockpit · FahrschulApp" };

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function plusTage(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
}

export default async function CockpitPage() {
  const supabase = createClient();
  const vor30 = plusTage(-30);
  const bis = plusTage(10);

  const [stundenRes, lehrerRes, fahrzeugRes, offeneRes] = await Promise.all([
    supabase
      .from("fahrstunde")
      .select("datum, dauer_minuten, status, fahrlehrer_id, fahrzeug_id")
      .gte("datum", vor30)
      .lte("datum", bis)
      .returns<CockpitStunde[]>(),
    supabase.from("fahrlehrer").select("id, vorname, nachname").eq("aktiv", true).order("nachname").returns<CockpitLehrer[]>(),
    supabase.from("fahrzeug").select("id, kennzeichen").eq("aktiv", true).order("kennzeichen").returns<CockpitFahrzeug[]>(),
    supabase
      .from("rechnung")
      .select("betrag_brutto, status, faelligkeitsdatum, rechnungsdatum")
      .in("status", ["offen", "ueberfaellig"])
      .returns<CockpitRechnung[]>(),
  ]);

  return (
    <CockpitView
      stunden={DEMO ? demoCockpitStunden : (stundenRes.data ?? [])}
      lehrer={DEMO ? demoCockpitLehrer : (lehrerRes.data ?? [])}
      fahrzeuge={DEMO ? demoCockpitFahrzeuge : (fahrzeugRes.data ?? [])}
      offene={DEMO ? demoCockpitOffene : (offeneRes.data ?? [])}
    />
  );
}
