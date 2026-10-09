import { createClient } from "@/lib/supabase/server";
import { heuteBerlin, plusTage } from "@/lib/zeit";
import { CockpitView, type CockpitFahrzeug, type CockpitLehrer, type CockpitRechnung, type CockpitStunde } from "./cockpit-view";

export const metadata = { title: "Cockpit · FahrschulApp" };

export default async function CockpitPage() {
  const supabase = createClient();
  const heute = heuteBerlin();

  const [stundenRes, lehrerRes, fahrzeugRes, offeneRes] = await Promise.all([
    supabase
      .from("fahrstunde")
      .select("datum, dauer_minuten, status, fahrlehrer_id, fahrzeug_id")
      .gte("datum", plusTage(heute, -30))
      .lte("datum", plusTage(heute, 10))
      .returns<CockpitStunde[]>(),
    supabase.from("fahrlehrer").select("id, vorname, nachname").eq("aktiv", true).order("nachname").returns<CockpitLehrer[]>(),
    supabase.from("fahrzeug").select("id, kennzeichen, name").eq("aktiv", true).order("kennzeichen").returns<CockpitFahrzeug[]>(),
    supabase
      .from("rechnung")
      .select("betrag_brutto, status, faelligkeitsdatum, rechnungsdatum")
      .in("status", ["offen", "ueberfaellig"])
      .returns<CockpitRechnung[]>(),
  ]);

  return (
    <CockpitView
      stunden={stundenRes.data ?? []}
      lehrer={lehrerRes.data ?? []}
      fahrzeuge={fahrzeugRes.data ?? []}
      offene={offeneRes.data ?? []}
      heute={heute}
    />
  );
}
