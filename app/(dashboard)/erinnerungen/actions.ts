"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/** Markiert eine Fahrstunde als „Erinnerung gesendet". */
export async function erinnerungGesendet(id: string): Promise<void> {
  if (!id) return;
  const supabase = createClient();
  await supabase.from("fahrstunde").update({ erinnerung_gesendet_am: new Date().toISOString() }).eq("id", id);
  revalidatePath("/erinnerungen");
}
