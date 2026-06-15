import { redirect } from "next/navigation";

import { getKontext } from "@/lib/supabase/queries";
import { DashboardShell } from "@/components/shared/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const kontext = await getKontext();

  if (!kontext) {
    redirect("/auth/login");
  }
  if (!kontext.fahrlehrer || !kontext.fahrschule) {
    redirect("/auth/setup");
  }

  const { fahrlehrer, fahrschule } = kontext;

  return (
    <DashboardShell
      fahrschuleName={fahrschule.name}
      ort={fahrschule.ort}
      logoUrl={fahrschule.logo_url}
      vorname={fahrlehrer.vorname}
      nachname={fahrlehrer.nachname}
      rolle={fahrlehrer.rolle}
      email={kontext.email}
    >
      {children}
    </DashboardShell>
  );
}
