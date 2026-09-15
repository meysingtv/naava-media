"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/** Termin zusagen (öffentlich, per Token – kein Login nötig). */
export async function terminBestaetigen(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (!token) return;
  const supabase = createClient();
  await supabase.rpc("termin_bestaetigen", { p_token: token });
  revalidatePath(`/t/${token}`);
}

/** Termin absagen (öffentlich, per Token – kein Login nötig). */
export async function terminAbsagen(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (!token) return;
  const supabase = createClient();
  await supabase.rpc("termin_absagen", { p_token: token });
  revalidatePath(`/t/${token}`);
}
