"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import type { Rechnung } from "@/lib/types";

/** Erhöht bei allen überfälligen, offenen Rechnungen die Mahnstufe um 1. */
export async function mahnlaufAusfuehren(): Promise<void> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return;

  const supabase = createClient();
  const heute = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("rechnung")
    .select("id, mahnstufe")
    .neq("status", "bezahlt")
    .lt("faelligkeitsdatum", heute)
    .returns<Pick<Rechnung, "id" | "mahnstufe">[]>();

  const posten = data ?? [];
  for (const r of posten) {
    await supabase
      .from("rechnung")
      .update({
        mahnstufe: Math.min((r.mahnstufe ?? 0) + 1, 3),
        letzte_mahnung: heute,
        status: "ueberfaellig",
      })
      .eq("id", r.id);
  }

  revalidatePath("/rechnungslauf");
  revalidatePath("/rechnungen");
}
