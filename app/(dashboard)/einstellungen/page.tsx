import { redirect } from "next/navigation";

import { getKontext } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/shared/page-header";
import { EinstellungenForm } from "./einstellungen-form";

export const metadata = { title: "Einstellungen · FahrschulApp" };

export default async function EinstellungenPage() {
  const kontext = await getKontext();

  if (!kontext?.fahrschule) {
    redirect("/auth/login");
  }
  // Nur der Chef darf das Firmenprofil bearbeiten.
  if (kontext.fahrlehrer?.rolle !== "chef") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Einstellungen"
        description="Verwalte das Profil deiner Fahrschule."
      />
      <div className="max-w-3xl">
        <EinstellungenForm fahrschule={kontext.fahrschule} />
      </div>
    </div>
  );
}
