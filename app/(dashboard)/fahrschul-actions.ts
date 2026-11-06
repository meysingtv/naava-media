"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Wechselt die aktive Fahrschule des Nutzers (für Filialketten). */
export async function fahrschuleWechseln(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = createClient();
  // Setzt die aktive Fahrschule – serverseitig gegen Mitgliedschaft geprüft.
  await supabase.rpc("set_aktive_fahrschule", { p_id: id });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
