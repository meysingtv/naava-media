import { createClient } from "@/lib/supabase/server";
import type { Leistung } from "@/lib/types";
import { RechnungForm } from "../rechnung-form";

export const metadata = { title: "Neue Rechnung · FahrschulApp" };

export default async function NeueRechnungPage() {
  const supabase = createClient();
  const [schuelerRes, leistungRes] = await Promise.all([
    supabase.from("fahrschueler").select("*").order("nachname", { ascending: true }),
    supabase
      .from("leistung")
      .select("*")
      .eq("aktiv", true)
      .order("sortierung", { ascending: true })
      .order("name", { ascending: true })
      .returns<Leistung[]>(),
  ]);

  return <RechnungForm schueler={schuelerRes.data ?? []} leistungen={leistungRes.data ?? []} />;
}
