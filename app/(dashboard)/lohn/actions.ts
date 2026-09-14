"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

export async function lohnSatzSetzen(formData: FormData): Promise<void> {
  const kontext = await getKontext();
  if (kontext?.fahrlehrer?.rolle !== "chef") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const proFahrstunde = String(formData.get("lohn_pro_fahrstunde") ?? "").trim();
  const stundenlohn = String(formData.get("stundenlohn") ?? "").trim();

  const supabase = createClient();
  await supabase
    .from("fahrlehrer")
    .update({
      lohn_pro_fahrstunde: proFahrstunde === "" ? null : Number(proFahrstunde),
      stundenlohn: stundenlohn === "" ? null : Number(stundenlohn),
    })
    .eq("id", id);
  revalidatePath("/lohn");
}
