import { redirect } from "next/navigation";

import { getKontext } from "@/lib/supabase/queries";
import { Sidebar } from "@/components/shared/sidebar";
import { MobileTopbar } from "@/components/shared/mobile-topbar";

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
    <div className="min-h-screen bg-background">
      <Sidebar
        fahrschuleName={fahrschule.name}
        vorname={fahrlehrer.vorname}
        nachname={fahrlehrer.nachname}
        rolle={fahrlehrer.rolle}
      />
      <MobileTopbar
        fahrschuleName={fahrschule.name}
        vorname={fahrlehrer.vorname}
        nachname={fahrlehrer.nachname}
        rolle={fahrlehrer.rolle}
      />
      <div className="md:pl-64 print:!pl-0">
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 print:!p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
