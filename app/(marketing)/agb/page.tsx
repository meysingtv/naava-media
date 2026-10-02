import type { Metadata } from "next";

import { LegalShell } from "@/components/marketing/legal";

export const metadata: Metadata = { title: "AGB", alternates: { canonical: "/agb" }, robots: { index: false } };

export default function AgbPage() {
  return (
    <LegalShell title="Allgemeine Geschäftsbedingungen">
      <h2>1. Geltungsbereich</h2>
      <p>Diese AGB gelten für die Nutzung der Software und Leistungen von [Firmenname].</p>
      <h2>2. Vertragsgegenstand</h2>
      <p>Bereitstellung der Software „FahrschulApp" als webbasierter Dienst.</p>
      <h2>3. Laufzeit & Kündigung</h2>
      <p>[Platzhalter – z. B. monatlich kündbar, Details ergänzen].</p>
      <h2>4. Pflichten des Kunden</h2>
      <p>[Platzhalter].</p>
      <h2>5. Haftung</h2>
      <p>[Platzhalter].</p>
      <p className="text-[14px]">Hinweis: Platzhalter-Text. Bitte durch vollständige, rechtssicher geprüfte AGB ersetzen.</p>
    </LegalShell>
  );
}
