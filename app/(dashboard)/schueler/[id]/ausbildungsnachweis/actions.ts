"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

export async function unterschriftSpeichern(input: {
  fahrstundeId: string;
  schuelerId: string;
  unterschrift: string;
}): Promise<{ ok?: boolean; error?: string }> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Nicht angemeldet." };
  if (!input.fahrstundeId || !input.unterschrift) return { error: "Ungültige Daten." };
  // Sehr grobe Größenbegrenzung (Data-URL) gegen versehentliche Riesenbilder.
  if (input.unterschrift.length > 400_000) return { error: "Unterschrift zu groß." };

  const supabase = createClient();
  const { error } = await supabase
    .from("fahrstunde")
    .update({ unterschrift: input.unterschrift })
    .eq("id", input.fahrstundeId);
  if (error) return { error: error.message };

  revalidatePath(`/schueler/${input.schuelerId}/ausbildungsnachweis`);
  return { ok: true };
}
