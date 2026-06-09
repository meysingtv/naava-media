import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schüler bearbeiten"
        description={`${data.vorname} ${data.nachname}`}
      />
      <SchuelerForm schueler={data as Fahrschueler} />
    </div>
  );
}
