import { createClient } from "@/lib/supabase/server";
import { heuteBerlin, plusTage } from "@/lib/zeit";
import type { FahrstundeAnfrage } from "@/lib/types";
import type { AnfrageRegeln } from "./anfrage-bereich";

const VIERZEHN_TAGE = 14 * 24 * 60 * 60 * 1000;

/**
 * Daten für die Anfragen im Portal: Regeln (Freischaltung, Vorlauf,
 * offene Anfragen), Fahrlehrer zur Auswahl und die eigenen Anfragen.
 * Ohne eingespielte Migration 0020 kommt einfach „nicht freigeschaltet".
 */
export async function ladePortalAnfragen() {
  const supabase = createClient();
  const [regelnRes, lehrerRes, anfragenRes] = await Promise.all([
    supabase.rpc("portal_anfragen_regeln"),
    supabase.rpc("portal_fahrlehrer"),
    supabase
      .from("fahrstunde_anfrage")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<FahrstundeAnfrage[]>(),
  ]);

  const r = !regelnRes.error && Array.isArray(regelnRes.data) ? regelnRes.data[0] : null;
  const regeln: AnfrageRegeln | null = r
    ? {
        erlaubt: Boolean(r.erlaubt),
        vorlaufStunden: Number(r.vorlauf_stunden ?? 24),
        maxOffen: Number(r.max_offen ?? 3),
        offen: Number(r.offen ?? 0),
      }
    : null;

  const fahrlehrer: { id: string; name: string }[] =
    !lehrerRes.error && Array.isArray(lehrerRes.data) ? (lehrerRes.data as { id: string; name: string }[]) : [];

  // Offene immer, beantwortete noch 14 Tage lang, zurückgezogene gar nicht.
  const grenze = Date.now() - VIERZEHN_TAGE;
  const anfragen = (anfragenRes.error ? [] : anfragenRes.data ?? []).filter(
    (a) =>
      a.status === "offen" ||
      ((a.status === "angenommen" || a.status === "abgelehnt") &&
        a.bearbeitet_am != null &&
        new Date(a.bearbeitet_am).getTime() >= grenze),
  );

  const vorlauf = regeln?.vorlaufStunden ?? 24;
  const minDatum = new Date(Date.now() + vorlauf * 60 * 60 * 1000).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Berlin",
  });
  const maxDatum = plusTage(heuteBerlin(), 90);

  return { regeln, fahrlehrer, anfragen, minDatum, maxDatum };
}
