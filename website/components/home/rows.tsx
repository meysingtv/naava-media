import Image from "next/image";

import { Container } from "@/components/ui";
import { FeatureRow, SectionHead } from "@/components/bits";
import { AppShot, BrowserFrame, PhoneShot } from "@/components/mockups";

export function FeatureRows() {
  return (
    <section id="funktionen" className="bg-white py-16 md:py-20">
      <Container>
        <SectionHead
          center
          eyebrow="So sieht das in echt aus"
          title="Jede Ansicht so gebaut, dass man sie zwischen zwei Fahrstunden versteht."
          sub="Keine Attrappen: Das sind Aufnahmen aus der Software – mit Beispieldaten einer fiktiven Fahrschule."
          className="mb-4"
        />

        <FeatureRow
          id="disposition"
          kick="Disposition"
          title="Jede Fahrstunde dort, wo sie hingehört."
          text="Plane Fahrlehrer, Fahrzeuge und Schüler auf einer klaren Zeitachse. Verfügbarkeiten, Prüfungen und Sperrzeiten inklusive – Konflikte erkennt das System, bevor sie entstehen."
          points={["Ressourcen-Board für Fahrlehrer und Fahrzeuge", "Freie Slots und Farbcodierung auf einen Blick", "Smart-Disposition: nächste sinnvolle Stunde per Klick"]}
          cta={{ href: "/funktionen", label: "Mehr zur Disposition" }}
          tone="brand"
        >
          <BrowserFrame url="app.fahrschulapp.de/kalender">
            <AppShot src="/images/app/disposition.jpg" ratio="aspect-[2/1]" alt="Disposition: Fahrlehrer-Zeilen mit Fahrstunden auf der Tagesachse, Auslastung je Fahrlehrer" />
          </BrowserFrame>
        </FeatureRow>

        <FeatureRow
          id="schuelerakte"
          reverse
          kick="Schülerakte"
          title="Jeder Schüler. Jede Info. Eine digitale Akte."
          text="Stammdaten, Ausbildungsfortschritt, Theorie, Praxis, Dokumente, Termine und Zahlungen – papierlos und immer aktuell. Der Ausbildungsnachweis läuft automatisch mit."
          points={["Fortschritt und Prüfungsreife automatisch", "Ausbildungsnachweis mit E-Signatur", "Unterlagen-Checkliste und Dokumente"]}
          tone="purple"
        >
          <BrowserFrame url="app.fahrschulapp.de/schueler">
            <AppShot src="/images/app/schuelerakte.jpg" alt="Schülerliste mit Fortschritt und Saldo, daneben die geöffnete Akte von Lena Hoffmann" />
          </BrowserFrame>
        </FeatureRow>

        <FeatureRow
          id="finanzen"
          kick="Finanzen"
          title="Finanzen, die nicht hinterherlaufen."
          text="Von der Rechnung über Ratenpläne bis zum Mahnwesen. Mit SEPA-Lastschrift, XRechnung und DATEV-Export ist der Zahlungsstatus jederzeit klar."
          points={["Rechnungen, Ratenpläne, Mahnwesen", "Offene Posten nach Alter", "SEPA · XRechnung · DATEV-Export"]}
          tone="orange"
        >
          <BrowserFrame url="app.fahrschulapp.de/finanzen">
            <AppShot src="/images/app/finanzen.jpg" alt="Finanzen: Eingänge, offene und überfällige Rechnungen, Sechs-Monats-Verlauf und Mahnlauf" />
          </BrowserFrame>
        </FeatureRow>

        <FeatureRow
          id="pruefungen"
          reverse
          kick="Theorie & Prüfungen"
          title="Wer ist bereit? Wer braucht noch etwas?"
          text="Theoriefortschritt, Prüfungstermine und offene Voraussetzungen an einem Ort. So weißt du früh, wer prüfungsreif ist – und wer noch eine Stunde braucht."
          points={["Prüfungstermine und Status je Schüler", "Erinnerungen an offene Voraussetzungen", "Theorie und Praxis laufen zusammen"]}
          tone="sky"
        >
          <BrowserFrame url="app.fahrschulapp.de/pruefungen">
            <AppShot src="/images/app/pruefungen.jpg" alt="Prüfungen: anstehende Termine bei TÜV und DEKRA, Bestehensquote und Ergebnisse" />
          </BrowserFrame>
        </FeatureRow>

        <FeatureRow
          id="schueler-app"
          kick="Schüler-App"
          title="Die Schüler sehen, was als Nächstes kommt."
          text="Termine, Fortschritt, Nachrichten, Zahlungen und Rechnungen – in einer eigenen App im Design deiner Fahrschule. Termine bestätigen die Schüler mit einem Tipp."
          points={["Termine bestätigen, online bezahlen", "Fortschritt und nächste Schritte", "Weniger Rückfragen im Büro"]}
          tone="yellow"
        >
          <div className="relative pb-6 pr-4 pt-20 sm:pr-10 sm:pt-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image src="/images/schueler-lachen.jpg" alt="Fahrschüler lacht am Steuer" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-2 right-0 origin-bottom-right scale-[0.66] sm:scale-[0.82]">
              <PhoneShot src="/images/app/portal-fortschritt.jpg" alt="Schüler-App: Theorie bestanden, Fortschritt bei Überland-, Autobahn- und Nachtfahrten" />
            </div>
          </div>
        </FeatureRow>

        <FeatureRow
          id="cockpit"
          reverse
          kick="Chef-Cockpit"
          title="Die Zahlen, bevor du danach suchen musst."
          text="Live-Auslastung je Fahrlehrer und Fahrzeug, No-Show-Quote und offene Posten nach Alter. Das Cockpit zeigt dir, wo du hinschauen musst – nicht, wo alles gut ist."
          points={["Auslastung je Fahrlehrer und Fahrzeug", "No-Show-Quote in Echtzeit", "Offene Posten nach Alter"]}
          tone="paper"
        >
          <BrowserFrame url="app.fahrschulapp.de/cockpit">
            <AppShot src="/images/app/cockpit.jpg" alt="Chef-Cockpit: Auslastung der Woche, No-Show-Quote, offene Posten nach Alter, Ausfälle je Fahrlehrer" />
          </BrowserFrame>
        </FeatureRow>
      </Container>
    </section>
  );
}
