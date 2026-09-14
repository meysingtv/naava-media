"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

export async function nachrichtLoggen(input: {
  betreff: string;
  text: string;
  empfaenger: string;
  anzahl: number;
  kanal?: "email" | "sms" | "notiz";
}): Promise<{ ok?: boolean; error?: string }> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) return { error: "Nicht angemeldet." };

  const supabase = createClient();
  const { error } = await supabase.from("nachricht").insert({
    fahrschule_id: kontext.fahrschule.id,
    kanal: input.kanal ?? "email",
    betreff: input.betreff || null,
    text: input.text || "",
    empfaenger: input.empfaenger || null,
    anzahl: input.anzahl,
    status: "gesendet",
  });
  if (error) return { error: error.message };

  revalidatePath("/kommunikation");
  return { ok: true };
}
