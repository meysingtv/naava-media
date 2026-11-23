import Link from "next/link";
import { Check, ChevronRight, Mail, Sparkles } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Balken } from "@/components/ui/fortschritt";
import { Karte } from "@/components/ui/karte";
import { PageHeader } from "@/components/shared/page-header";
import { AKZENT } from "@/lib/farben";
import { cn } from "@/lib/utils";
import { Fragen, type Frage } from "./fragen";

export const metadata = { title: "Hilfe · FahrschulApp" };

const FRAGEN: Frage[] = [
  {
    thema: "Schüler und Ausbildung",
    frage: "Wie lege ich einen neuen Schüler an?",
    antwort:
      "Unter Schüler auf „Schüler anlegen“ klicken – oder oben in der Leiste über „Neu“. Pflicht sind nur Vorname, Nachname und das Anmeldedatum; alles Weitere kannst du später in der Schülerakte ergänzen.",
  },
  {
    thema: "Schüler und Ausbildung",
    frage: "Wo sehe ich, ob ein Schüler prüfungsreif ist?",
    antwort:
      "In der Schülerliste zeigt die Spalte Status „Prüfungsreif“, sobald die Theorie bestanden und alle Pflicht-Sonderfahrten (Überland, Autobahn, Nacht) gefahren sind. Die Segmente „Prüfungsreif“ und „Handlungsbedarf“ filtern die Liste entsprechend.",
  },
  {
    thema: "Schüler und Ausbildung",
    frage: "Wie trage ich ein Prüfungsergebnis ein?",
    antwort:
      "Unter Ausbildung → Prüfungen stehen vergangene Prüfungen ohne Ergebnis im Segment „Ergebnis fehlt“. Dort klickst du in der Zeile auf „Bestanden“ oder „Nicht bestanden“. Eine bestandene Theorieprüfung wird automatisch in der Schülerakte vermerkt.",
  },
  {
    thema: "Kalender",
    frage: "Wie trage ich eine Fahrstunde ein?",
    antwort:
      "Im Kalender in der Spalte des Fahrlehrers mit der Maus von der Start- bis zur Endzeit ziehen – oder auf „Termin“ klicken. Rechts öffnet sich das Formular: Art wählen, Schüler und Fahrzeug eintragen, speichern. Mit „Speichern und neu“ legst du gleich den nächsten Termin an.",
  },
  {
    thema: "Kalender",
    frage: "Wie erinnere ich Schüler an ihre Termine?",
    antwort:
      "Unter Kommunikation → Terminerinnerungen stehen alle Termine der nächsten drei Tage. Ein Klick auf WhatsApp, SMS oder E-Mail öffnet eine fertige Nachricht mit Link, über den der Schüler zu- oder absagt. Die Antwort siehst du direkt in der Liste.",
  },
  {
    thema: "Rechnungen und Zahlungen",
    frage: "Wie schreibe ich eine Rechnung?",
    antwort:
      "Finanzen → Rechnungen → „Rechnung schreiben“. Positionen übernimmst du mit einem Klick aus der Preisliste oder trägst sie frei ein; Summe und Mehrwertsteuer rechnen sich mit. Die Rechnungsnummer wird fortlaufend vergeben.",
  },
  {
    thema: "Rechnungen und Zahlungen",
    frage: "Wie erfasse ich einen Zahlungseingang?",
    antwort:
      "Finanzen → Zahlungen → „Zahlung erfassen“. Wählst du dabei eine offene Rechnung aus, wird der Betrag übernommen und die Rechnung automatisch als bezahlt markiert.",
  },
  {
    thema: "Rechnungen und Zahlungen",
    frage: "Wie mahne ich überfällige Rechnungen?",
    antwort:
      "Finanzen → Rechnungslauf zeigt alle überfälligen Rechnungen. „Alle anmahnen“ erhöht die Mahnstufe in einem Schritt. Das Mahnschreiben selbst druckst du in der jeweiligen Rechnung.",
  },
  {
    thema: "Rechnungen und Zahlungen",
    frage: "Wie ziehe ich Beträge per Lastschrift ein?",
    antwort:
      "Einmalig in den Einstellungen unter „Rechnungen und Zahlung“ IBAN und Gläubiger-ID der Fahrschule hinterlegen. Beim Schüler IBAN und SEPA-Mandat eintragen. Danach erzeugt der Rechnungslauf eine SEPA-Datei, die du in dein Online-Banking importierst.",
  },
  {
    thema: "Rechnungen und Zahlungen",
    frage: "Wie bekomme ich die Daten für den Steuerberater?",
    antwort:
      "Finanzen → Buchhaltung: Jahr wählen und „DATEV-Export“ klicken. Die Datei enthält alle Rechnungen des Jahres als Buchungsstapel. Auf derselben Seite siehst du die Umsatzsteuer je Quartal für die Voranmeldung.",
  },
  {
    thema: "Team und Zugang",
    frage: "Wie lade ich einen Mitarbeiter ein?",
    antwort:
      "Team → „Mitarbeiter anlegen“. Entweder vergibst du direkt ein Passwort oder setzt den Haken „Stattdessen per E-Mail einladen“ – dann legt die Person ihr Passwort selbst fest.",
  },
  {
    thema: "Team und Zugang",
    frage: "Was sehen Fahrlehrer und Büro?",
    antwort:
      "Fahrlehrer sehen ihr Dashboard, den Kalender, die Schüler, Ausbildung, Nachrichten und Aufgaben – aber keine Rechnungen, Beträge oder Umsätze. Das Büro sieht Schüler, Ausbildung, Finanzen, Fahrzeuge und Auswertungen, jedoch keine Umsatzzahlen und keine Löhne. Die Geschäftsführung sieht alles.",
  },
  {
    thema: "Team und Zugang",
    frage: "Wie bekommen Schüler Zugang zum Schülerportal?",
    antwort:
      "In der Schülerakte im Reiter „Portal“ schaltest du den Zugang frei. Im Portal sehen Schüler ihre Termine, ihren Ausbildungsstand und ihre Rechnungen – und können Rechnungen online bezahlen, wenn du in den Einstellungen einen Zahlungslink hinterlegt hast.",
  },
];

export default async function HilfePage() {
  const kontext = await getKontext();
  const chef = kontext?.fahrlehrer?.rolle === "chef";
  const fs = kontext?.fahrschule;

  // Erste Schritte – nur für die Geschäftsführung, mit echtem Stand aus den Daten
  let schritte: { titel: string; text: string; href: string; erledigt: boolean }[] = [];
  if (chef) {
    const supabase = createClient();
    const anzahl = async (tabelle: string) =>
      (await supabase.from(tabelle).select("id", { count: "exact", head: true })).count ?? 0;
    const [leistungen, team, fahrzeuge, schueler, stunden] = await Promise.all([
      anzahl("leistung"),
      anzahl("fahrlehrer"),
      anzahl("fahrzeug"),
      anzahl("fahrschueler"),
      anzahl("fahrstunde"),
    ]);
    schritte = [
      { titel: "Fahrschule vervollständigen", text: "Anschrift, Kontakt und Logo", href: "/einstellungen", erledigt: Boolean(fs?.strasse && fs?.telefon) },
      { titel: "Bankverbindung hinterlegen", text: "Für Rechnungen und Lastschrift", href: "/einstellungen?bereich=zahlung", erledigt: Boolean(fs?.iban) },
      { titel: "Preisliste anlegen", text: "Übungsstunde, Sonderfahrten, Gebühren", href: "/einstellungen?bereich=preisliste", erledigt: leistungen > 0 },
      { titel: "Team einladen", text: "Fahrlehrer und Büro", href: "/fahrlehrer/neu", erledigt: team > 1 },
      { titel: "Fahrzeuge anlegen", text: "Mit Klassen und HU-Termin", href: "/fahrzeuge/neu", erledigt: fahrzeuge > 0 },
      { titel: "Ersten Schüler anlegen", text: "Stammdaten und Ausbildung", href: "/schueler/neu", erledigt: schueler > 0 },
      { titel: "Ersten Termin eintragen", text: "Im Kalender per Ziehen", href: "/kalender", erledigt: stunden > 0 },
    ];
  }
  const erledigt = schritte.filter((s) => s.erledigt).length;

  return (
    <div>
      <PageHeader title="Hilfe" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="min-w-0 space-y-6">
          {chef && erledigt < schritte.length && (
            <Karte titel="Erste Schritte" meta={`${erledigt} von ${schritte.length} erledigt`} inhaltClassName="pb-2">
              <div className="px-5 pb-3">
                <Balken anteil={erledigt / schritte.length} farbe={AKZENT.blau} />
              </div>
              <ul className="divide-y divide-border border-t border-border">
                {schritte.map((s) => (
                  <li key={s.titel}>
                    <Link href={s.href} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-muted/60">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                          s.erledigt ? "border-primary bg-primary text-primary-foreground" : "border-border-strong text-transparent",
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-13 font-medium", s.erledigt ? "text-foreground-tertiary line-through" : "text-foreground")}>
                          {s.titel}
                        </span>
                        <span className="block text-xs text-foreground-secondary">{s.text}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-foreground-tertiary transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Karte>
          )}

          <Fragen fragen={FRAGEN} />
        </div>

        <aside className="min-w-0 space-y-6">
          <Karte titel="Direkt fragen" inhaltClassName="px-5 pb-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: `${AKZENT.violett}1A`, color: AKZENT.violett }}>
                <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <p className="text-13 leading-5 text-foreground-secondary">
                Der <span className="font-medium text-foreground">Assistent</span> unten links in der Navigation beantwortet Fragen zu deinen Daten – etwa „Wer ist prüfungsreif?“ oder „Welche Rechnungen sind offen?“.
              </p>
            </div>
          </Karte>

          <Karte titel="Kontakt" inhaltClassName="px-5 pb-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: `${AKZENT.blau}1A`, color: AKZENT.blau }}>
                <Mail className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <div className="text-13 leading-5 text-foreground-secondary">
                <p>Keine Antwort gefunden oder einen Fehler entdeckt? Schreib uns über das Kontaktformular.</p>
                <Link href="/kontakt" className="mt-2 inline-flex font-medium text-primary-text hover:underline">
                  Zum Kontaktformular
                </Link>
              </div>
            </div>
          </Karte>
        </aside>
      </div>
    </div>
  );
}
