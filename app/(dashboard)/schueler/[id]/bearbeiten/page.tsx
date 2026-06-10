import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SchuelerForm } from "../../schueler-form";
import type { Fahrschueler } from "@/lib/types";

export const metadata = { title: "Schüler bearbeiten · FahrschulApp" };

export default async function SchuelerBearbeitenPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("fahrschueler")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  return <SchuelerForm schueler={data as Fahrschueler} />;
}
