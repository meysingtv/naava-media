import { GraduationCap, Receipt, Sun, Wallet } from "lucide-react";

import { getKontext } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/shared/page-header";
import type { FahrlehrerRolle } from "@/lib/types";
import { AnsichtAusbildung } from "./ansicht-ausbildung";
import { AnsichtFinanzen } from "./ansicht-finanzen";
import { AnsichtHeute } from "./ansicht-heute";
import { AnsichtUmschalter, type Ansicht } from "./widgets";
import { datumLang, gruss, heuteBerlin, jetztMinutenBerlin } from "./zeit";

export const metadata = { title: "Dashboard · FahrschulApp" };

/**
 * Welche Ansichten eine Rolle sieht:
 * - Geschäftsführung: Heute, Ausbildung, Finanzen (alles).
 * - Büro: Heute, Ausbildung und „Offene Posten" – die Arbeit an offenen
 *   Rechnungen und Raten, aber keine Einnahmen und kein Umsatz.
 * - Fahrlehrer: nur der eigene Tag und die eigenen Schüler, keine Finanzen.
 */
function ansichtenFuer(rolle: FahrlehrerRolle): Ansicht[] {
  if (rolle === "fahrlehrer") {
    return [
      { key: "heute", label: "Mein Tag", icon: Sun },
      { key: "ausbildung", label: "Meine Schüler", icon: GraduationCap },
    ];
  }
  return [
    { key: "heute", label: "Heute", icon: Sun },
    { key: "ausbildung", label: "Ausbildung", icon: GraduationCap },
    rolle === "buero"
      ? { key: "finanzen", label: "Offene Posten", icon: Receipt }
      : { key: "finanzen", label: "Finanzen", icon: Wallet },
  ];
}

export default async function DashboardPage({ searchParams }: { searchParams: { ansicht?: string } }) {
  const kontext = await getKontext();
  const rolle: FahrlehrerRolle = kontext?.fahrlehrer?.rolle ?? "fahrlehrer";
  const meId = kontext?.fahrlehrer?.id ?? null;
  const vorname = kontext?.fahrlehrer?.vorname ?? "";

  const ansichten = ansichtenFuer(rolle);
  // Unbekannte oder für die Rolle nicht freigegebene Ansichten fallen auf „Heute" zurück.
  const aktiv = ansichten.find((a) => a.key === searchParams.ansicht)?.key ?? "heute";

  const heute = heuteBerlin();
  const jetztMin = jetztMinutenBerlin();

  return (
    <div>
      <PageHeader title={`${gruss(jetztMin)}${vorname ? `, ${vorname}` : ""}`} description={datumLang(heute)}>
        <AnsichtUmschalter ansichten={ansichten} aktiv={aktiv} />
      </PageHeader>

      {aktiv === "heute" && <AnsichtHeute rolle={rolle} meId={meId} heute={heute} jetztMin={jetztMin} />}
      {aktiv === "ausbildung" && <AnsichtAusbildung rolle={rolle} meId={meId} heute={heute} />}
      {aktiv === "finanzen" && <AnsichtFinanzen variante={rolle === "chef" ? "voll" : "posten"} heute={heute} />}
    </div>
  );
}
