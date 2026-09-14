"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

export async function vertragUnterschreiben(input: {
  schuelerId: string;
  unterschrift: string;
}): Promise<{ ok?: boolean; error?: string }> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Nicht angemeldet." };
  if (!input.schuelerId || !input.unterschrift) return { error: "Ungültige Daten." };
  if (input.unterschrift.length > 400_000) return { error: "Unterschrift zu groß." };

  const supabase = createClient();
  const { error } = await supabase
    .from("fahrschueler")
    .update({
      vertrag_unterschrift: input.unterschrift,
      vertrag_am: new Date().toISOString().slice(0, 10),
    })
    .eq("id", input.schuelerId);
  if (error) return { error: error.message };

  revalidatePath(`/schueler/${input.schuelerId}/vertrag`);
  return { ok: true };
}
