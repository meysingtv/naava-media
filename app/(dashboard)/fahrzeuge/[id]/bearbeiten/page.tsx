import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Fahrzeug } from "@/lib/types";
import { fahrlehrerOptionen } from "../../daten";
import { FahrzeugForm } from "../../fahrzeug-form";

export const metadata = { title: "Fahrzeug bearbeiten · FahrschulApp" };

export default async function FahrzeugBearbeitenPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data }, options] = await Promise.all([
    supabase.from("fahrzeug").select("*").eq("id", params.id).maybeSingle(),
    fahrlehrerOptionen(),
  ]);
  if (!data) notFound();

  return <FahrzeugForm fahrzeug={data as Fahrzeug} options={options} />;
}
