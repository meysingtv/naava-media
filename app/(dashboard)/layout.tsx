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
    <>
      {/*
        Sidebar-Zustand vor dem ersten Paint setzen – sonst flackert die
        Breite. Nur im Dashboard, nicht in app/layout.tsx: Marketing und
        Portal dürfen das Attribut nicht bekommen.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(localStorage.getItem("fsapp.sidebar")==="collapsed")document.documentElement.dataset.sidebar="collapsed"}catch(e){}`,
        }}
      />
      <DashboardShell
        fahrschuleName={fahrschule.name}
        ort={fahrschule.ort}
        logoUrl={fahrschule.logo_url}
        vorname={fahrlehrer.vorname}
        nachname={fahrlehrer.nachname}
        rolle={fahrlehrer.rolle}
        email={kontext.email}
        fahrschulen={kontext.fahrschulen}
        aktiveFahrschuleId={fahrschule.id}
      >
        {children}
      </DashboardShell>
    </>
  );
}
