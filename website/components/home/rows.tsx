import Image from "next/image";

import { Container, cn } from "@/components/ui";
import { FeatureRow, SectionHead } from "@/components/bits";
import { BrowserFrame, CockpitMock, DispoMock, FinanzenMock, PhoneMock, SchuelerakteMock } from "@/components/mockups";

function PruefungenMock() {
  const rows = [
    { d: "Di 18.09", n: "Mia Schäfer", a: "Praxis", o: "TÜV Nord", c: "bg-brand-light text-brand-dark" },
    { d: "Do 19.09", n: "Sophie Bauer", a: "Theorie", o: "TÜV Süd", c: "bg-orange-light text-orange-dark" },
    { d: "Mo 23.09", n: "Ben Krüger", a: "Praxis", o: "DEKRA", c: "bg-brand-light text-brand-dark" },
    { d: "Mi 25.09", n: "Leon Fischer", a: "Praxis", o: "TÜV Nord", c: "bg-brand-light text-brand-dark" },
  ];
  return (
    <div className="bg-white p-4">
      <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
        <span>Anstehende Prüfungen</span>
        <span className="tnum">KW 38 – 39</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-line">
        {rows.map((r, i) => (
          <div key={r.n} className={cn("flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]", i > 0 && "border-t border-line")}>
            <span className="tnum w-16 font-bold">{r.d}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{r.n}</span>
            <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-bold", r.c)}>{r.a}</span>
            <span className="text-muted">{r.o}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeatureRows() {
  return (
    <section id="funktionen" className="bg-white py-16 md:py-20">
      <Container>
        <SectionHead
          center
          eyebrow="So sieht das in echt aus"
          title="Jede Ansicht so gebaut, dass man sie zwischen zwei Fahrstunden versteht."
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
          <BrowserFrame url="app.fahrschulapp.de/disposition">
            <DispoMock />
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
            <SchuelerakteMock />
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
            <FinanzenMock />
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
            <PruefungenMock />
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
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image src="/images/schueler-lachen.jpg" alt="Fahrschüler lacht am Steuer" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
            </div>
            <div className="absolute -bottom-4 right-3 origin-bottom-right scale-[0.8] sm:right-6 sm:scale-90">
              <PhoneMock />
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
            <CockpitMock />
          </BrowserFrame>
        </FeatureRow>
      </Container>
    </section>
  );
}
