import type { Metadata } from "next";

import { LegalShell } from "@/components/legal";

export const metadata: Metadata = { title: "Datenschutz", alternates: { canonical: "/datenschutz" }, robots: { index: false } };

export default function DatenschutzPage() {
  return (
    <LegalShell title="Datenschutzerklärung">
      <h2>1. Verantwortlicher</h2>
      <p>[Firmenname, Anschrift, Kontakt] — siehe Impressum.</p>
      <h2>2. Erhebung und Verarbeitung personenbezogener Daten</h2>
      <p>
        Beim Besuch der Website werden technisch notwendige Daten (z. B. IP-Adresse, Zeitpunkt) verarbeitet. Über das
        Demo-Formular übermittelte Angaben (Name, Fahrschule, Ort, E-Mail, Telefon, Anzahl Fahrlehrer, Nachricht) verwenden
        wir ausschließlich zur Bearbeitung deiner Anfrage.
      </p>
      <h2>3. Rechtsgrundlage</h2>
      <p>Art. 6 Abs. 1 lit. b und f DSGVO (Anbahnung/Erfüllung, berechtigtes Interesse).</p>
      <h2>4. Speicherung & Löschung</h2>
      <p>Anfragedaten werden gelöscht, sobald sie für den Zweck nicht mehr erforderlich sind und keine Aufbewahrungspflichten bestehen.</p>
      <h2>5. Deine Rechte</h2>
      <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch gemäß DSGVO sowie Beschwerderecht bei einer Aufsichtsbehörde.</p>
      <p className="text-[14px]">Hinweis: Platzhalter-Text. Bitte vor Veröffentlichung durch eine vollständige, rechtssichere Datenschutzerklärung ersetzen.</p>
    </LegalShell>
  );
}
