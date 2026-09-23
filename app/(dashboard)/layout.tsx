import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { DashboardShell } from "@/components/shared/dashboard-shell";

function isoInTagen(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

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

  // Zähler für Navigation und Glocke – drei schlanke Abfragen, nur Anzahlen.
  const supabase = createClient();
  const heute = isoInTagen(0);
  const [aufgabenRes, rechnungRes, bestaetigungRes] = await Promise.all([
    supabase.from("aufgabe").select("id", { count: "exact", head: true }).eq("status", "offen"),
    supabase
      .from("rechnung")
      .select("status, faelligkeitsdatum")
      .neq("status", "bezahlt")
      .returns<{ status: string; faelligkeitsdatum: string | null }[]>(),
    supabase
      .from("fahrstunde")
      .select("id", { count: "exact", head: true })
      .eq("status", "geplant")
      .gte("datum", heute)
      .lte("datum", isoInTagen(3))
      .is("bestaetigt_am", null)
      .is("abgesagt_am", null),
  ]);
  const ueberfaellig = (rechnungRes.data ?? []).filter(
    (r) => r.status === "ueberfaellig" || (r.faelligkeitsdatum != null && r.faelligkeitsdatum < heute),
  ).length;

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
        zaehler={{ aufgaben: aufgabenRes.count ?? 0, rechnungen_ueberfaellig: ueberfaellig }}
        offeneBestaetigungen={bestaetigungRes.count ?? 0}
      >
        {children}
      </DashboardShell>
    </>
  );
}
