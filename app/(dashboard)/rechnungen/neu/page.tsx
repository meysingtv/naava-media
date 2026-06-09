import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { RechnungForm } from "../rechnung-form";

export const metadata = { title: "Neue Rechnung · FahrschulApp" };

export default async function NeueRechnungPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("fahrschueler")
    .select("*")
    .order("nachname", { ascending: true });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Neue Rechnung"
        description="Erstelle eine Rechnung mit Positionen und Mehrwertsteuer."
      />
      <RechnungForm schueler={data ?? []} />
    </div>
  );
}
