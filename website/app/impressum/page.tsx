import type { Metadata } from "next";

import { LegalShell } from "@/components/legal";

export const metadata: Metadata = { title: "Impressum", alternates: { canonical: "/impressum" }, robots: { index: false } };

export default function ImpressumPage() {
  return (
    <LegalShell title="Impressum">
      <h2>Angaben gemäß § 5 DDG / § 5 TMG</h2>
      <p>
        [Firmenname / Inhaber]
        <br />
        [Straße Hausnummer]
        <br />
        [PLZ Ort]
      </p>
      <h2>Kontakt</h2>
      <p>
        Telefon: [Platzhalter]
        <br />
        E-Mail: hallo@beispiel.de
      </p>
      <h2>Umsatzsteuer-ID</h2>
      <p>[falls vorhanden, USt-IdNr. gemäß § 27 a UStG]</p>
      <h2>Verantwortlich für den Inhalt</h2>
      <p>[Name, Anschrift]</p>
      <p className="text-[14px]">Hinweis: Diese Angaben sind Platzhalter und müssen vor Veröffentlichung durch echte, korrekte Daten ersetzt werden.</p>
    </LegalShell>
  );
}
