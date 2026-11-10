/**
 * Impressum, Datenschutzerklärung und Nutzungsbedingungen als Text in der App
 * (Seiten /impressum, /datenschutz, /nutzungsbedingungen – auch im Browser).
 *
 * VOR DEM VERÖFFENTLICHEN: die Angaben in BETREIBER und SERVER_STANDORT
 * ausfüllen. Alles in [eckigen Klammern] ist noch ein Platzhalter; solange
 * einer übrig ist, zeigen die Seiten oben einen gelben Hinweis.
 */

export const BETREIBER = {
  /** Vor- und Nachname (bei einer Firma: Firmenname mit Rechtsform und Vertretung). */
  name: "[Vor- und Nachname]",
  strasse: "[Straße und Hausnummer]",
  ort: "[PLZ und Ort]",
  land: "Deutschland",
  /** E-Mail für Kontakt und Datenschutz – sonst die Support-Adresse aus der .env. */
  email: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "[E-Mail-Adresse]",
  /** Freiwillig, leer lassen = wird nicht gezeigt. */
  telefon: "",
  /** Nur falls vorhanden, sonst leer lassen. */
  ustId: "",
};

/** Region des Supabase-Projekts (Supabase → Project Settings → General). */
export const SERVER_STANDORT = "[Region des Supabase-Projekts, z. B. Frankfurt (EU)]";

/** Stand der Texte. */
export const STAND = "6. November 2026";

export const APP_NAME = "Fahrschul Pro";

/** Ein Absatz, eine Aufzählung oder ein Link auf eine andere Rechtsseite. */
export type Baustein = string | { liste: string[] } | { link: "/impressum" | "/datenschutz" | "/nutzungsbedingungen"; text: string };
export type Abschnitt = { titel: string; inhalt: Baustein[] };

const adresse = [BETREIBER.name, BETREIBER.strasse, BETREIBER.ort, BETREIBER.land].join("\n");

/** Gibt es noch Platzhalter? Dann zeigen die Seiten einen Hinweis. */
export function platzhalterOffen(abschnitte: Abschnitt[]): boolean {
  const text = JSON.stringify(abschnitte);
  return /\[[^\]]{3,}\]/.test(text);
}

// ---------------------------------------------------------------------------
// Impressum
// ---------------------------------------------------------------------------

export const IMPRESSUM: Abschnitt[] = [
  { titel: "Angaben gemäß § 5 DDG", inhalt: [adresse] },
  {
    titel: "Kontakt",
    inhalt: [[`E-Mail: ${BETREIBER.email}`, BETREIBER.telefon ? `Telefon: ${BETREIBER.telefon}` : null].filter(Boolean).join("\n")],
  },
  ...(BETREIBER.ustId ? [{ titel: "Umsatzsteuer-ID", inhalt: [`Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz: ${BETREIBER.ustId}`] }] : []),
  { titel: "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV", inhalt: [adresse] },
  {
    titel: "Verbraucherstreitbeilegung",
    inhalt: ["Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."],
  },
  {
    titel: "Inhalte von Nutzern",
    inhalt: [
      "Clips, Kommentare, Chat-Nachrichten und Live-Streams stammen von den jeweiligen Nutzern. Wir prüfen sie nicht vorab, entfernen rechtswidrige Inhalte aber, sobald wir davon erfahren. Melde solche Inhalte bitte direkt in der App oder per E-Mail.",
    ],
  },
  {
    titel: "Lerninhalte",
    inhalt: [
      `Die Erklärungen in ${APP_NAME} haben wir sorgfältig erstellt, eine Gewähr für Vollständigkeit und Richtigkeit können wir aber nicht übernehmen. ${APP_NAME} ist ein privates Lernangebot und steht in keiner Verbindung zu Prüforganisationen oder Behörden.`,
    ],
  },
  { titel: "Weitere Informationen", inhalt: [{ link: "/datenschutz", text: "Datenschutzerklärung" }, { link: "/nutzungsbedingungen", text: "Nutzungsbedingungen" }] },
];

// ---------------------------------------------------------------------------
// Datenschutzerklärung
// ---------------------------------------------------------------------------

export const DATENSCHUTZ: Abschnitt[] = [
  {
    titel: "1. Wer ist verantwortlich?",
    inhalt: [
      `Verantwortlich für die Verarbeitung deiner Daten in ${APP_NAME} (App und Browser-Version) ist:`,
      `${adresse}\nE-Mail: ${BETREIBER.email}`,
      "Bei Fragen zum Datenschutz oder um deine Rechte auszuüben, schreib uns einfach an diese Adresse.",
    ],
  },
  {
    titel: "2. Kurz gesagt",
    inhalt: [
      {
        liste: [
          "Du kannst die App ohne Konto nutzen. Dann bleibt dein Lernstand nur auf deinem Gerät.",
          "Mit Konto speichern wir die Angaben aus der Registrierung und deinen Lernstand, damit er auf allen Geräten gleich ist.",
          "Was du veröffentlichst (Profilbild, Name, Benutzername, Clips, Kommentare, Chat-Nachrichten, Lives), sehen andere Nutzer.",
          "Wir verwenden keine Werbung, kein Tracking und keine Analyse-Werkzeuge und verkaufen keine Daten.",
          "Du kannst dein Konto jederzeit selbst in der App löschen (Einstellungen → Daten → Konto löschen).",
        ],
      },
    ],
  },
  {
    titel: "3. Nutzung ohne Konto",
    inhalt: [
      "Ohne Konto speichert die App deinen Namen, deine Einstellungen und deinen Lernfortschritt nur lokal auf deinem Gerät. Diese Daten erreichen uns nicht. Zum Laden öffentlicher Inhalte (z. B. Clips und Lernvideos) verbindet sich die App mit unserem Server; dabei wird technisch bedingt deine IP-Adresse verarbeitet (Art. 6 Abs. 1 lit. f DSGVO – unser Interesse ist ein sicherer, funktionierender Betrieb).",
    ],
  },
  {
    titel: "4. Konto und Anmeldung",
    inhalt: [
      "Wenn du ein Konto erstellst, verarbeiten wir:",
      {
        liste: [
          "E-Mail-Adresse – angemeldet wird ohne Passwort mit einem Code, den wir dir per E-Mail schicken",
          "Vorname, Benutzername und Rolle (Fahrschüler oder Fahrlehrer) – Vorname und Benutzername sind für andere sichtbar",
          "freiwillig: Nachname, Telefonnummer, Geburtsdatum, Führerscheinklasse und Bundesland – Nachname, Telefon und Geburtsdatum sind nicht öffentlich",
          "Lernstand und Einstellungen (zur Synchronisierung zwischen deinen Geräten)",
          "freiwillig: ein Profilbild",
        ],
      },
      "Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO). Freiwillige Angaben verarbeiten wir auf Grundlage deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), die du jederzeit widerrufen kannst, indem du sie in den Einstellungen löschst oder uns schreibst.",
      "Zum Schutz vor Missbrauch speichern wir außerdem kurzzeitig fehlgeschlagene Anmeldeversuche und Zeitpunkte bestimmter Aktionen (Art. 6 Abs. 1 lit. f DSGVO).",
    ],
  },
  {
    titel: "5. Versand der Anmelde-Codes",
    inhalt: [
      "Zum Anmelden und Registrieren schicken wir dir einen Code per E-Mail. Die Mails versenden wir über den E-Mail-Dienst von Google (Gmail; Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland). Dabei verarbeitet Google deine E-Mail-Adresse und den Inhalt der Mail. Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO). Soweit Daten dabei in die USA gelangen, geschieht das auf Grundlage eines Angemessenheitsbeschlusses bzw. der EU-Standardvertragsklauseln.",
    ],
  },
  {
    titel: "6. Server und Speicherung (Supabase)",
    inhalt: [
      `Konto, Lernstand, Clips, Kommentare, Chat und Dateien speichern wir bei Supabase (Supabase Inc., 970 Toa Payoh North #07-04, Singapur). Unser Projekt liegt in der Region ${SERVER_STANDORT}. Supabase verarbeitet die Daten in unserem Auftrag auf Grundlage eines Vertrags zur Auftragsverarbeitung (Art. 28 DSGVO). Soweit Daten dabei in Länder außerhalb der EU übermittelt werden, geschieht das auf Grundlage der EU-Standardvertragsklauseln bzw. eines Angemessenheitsbeschlusses (Art. 45, 46 DSGVO).`,
    ],
  },
  {
    titel: "7. Clips, Kommentare, Folgen und Live-Streams",
    inhalt: [
      "Clips, Kommentare, Reaktionen, Likes, wem du folgst, Chat-Nachrichten in Lives sowie dein öffentliches Profil (Vorname, Benutzername, Profilbild, Bundesland) sind für andere Nutzer sichtbar. Wir speichern sie, bis du sie oder dein Konto löschst.",
      "Für Live-Streams nutzen wir LiveKit Cloud (LiveKit, Inc., San Jose, USA). Bild und Ton werden nur übertragen, während du selbst live bist; Zuschauer empfangen den Stream, ohne dass wir ihn aufzeichnen. Für die Übermittlung in die USA gelten die EU-Standardvertragsklauseln.",
      "Meldungen von Inhalten speichern wir mit dem gemeldeten Inhalt, um sie zu prüfen. Entfernen wir etwas, bekommt die Person, die es geschrieben hat, eine Begründung in der App; wer gemeldet hat, erfährt, dass geprüft wurde. Die Entscheidung halten wir in einem Protokoll fest. Wen du blockierst, speichern wir, damit dir die Inhalte dieser Person nicht mehr angezeigt werden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO und unser berechtigtes Interesse an einer sicheren Community (Art. 6 Abs. 1 lit. f DSGVO).",
    ],
  },
  {
    titel: "8. Mitteilungen",
    inhalt: [
      "Wenn du Mitteilungen erlaubst, speichern wir einen Push-Token deines Geräts, um dir z. B. Bescheid zu geben, wenn ein Live startet oder deine Fahrschule eine Nachricht schickt. Zugestellt werden die Mitteilungen über den Push-Dienst von Expo (650 Industries, Inc., USA) sowie Apple (Apple Push Notification Service) bzw. Google (Firebase Cloud Messaging). Die tägliche Lern-Erinnerung plant die App nur lokal auf deinem Gerät. Du kannst Mitteilungen jederzeit in den Einstellungen deines Geräts oder der App abschalten (Einwilligung, Art. 6 Abs. 1 lit. a DSGVO).",
    ],
  },
  {
    titel: "9. KI-Hilfe",
    inhalt: [
      "Wo die App eine KI-Hilfe anbietet, wird deine Frage zusammen mit dem jeweiligen Lerninhalt an Anthropic (Anthropic PBC, San Francisco, USA) gesendet, um eine Antwort zu erzeugen. Dein Name, deine E-Mail-Adresse und andere Kontodaten werden dabei nicht übermittelt. Nach Angaben des Anbieters werden die Daten nicht zum Training verwendet. Für die Übermittlung in die USA gelten die EU-Standardvertragsklauseln. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.",
    ],
  },
  {
    titel: "10. Kamera, Mikrofon und Fotos",
    inhalt: [
      "Die App fragt nur nach Kamera, Mikrofon oder Fotos, wenn du eine Funktion nutzt, die sie braucht: Kamera und Mikrofon für Live-Streams und Clips, die Kamera für die Schilder-Jagd, die Fotomediathek für Profilbild und Clips. Die Schilder-Jagd erkennt Verkehrszeichen direkt auf deinem Gerät – diese Kamerabilder verlassen dein Handy nicht. Den Zugriff kannst du jederzeit in den Einstellungen deines Geräts entziehen.",
    ],
  },
  {
    titel: "11. Speicherung auf deinem Gerät",
    inhalt: [
      "Die App speichert Einstellungen, Lernstand und die Anmeldung lokal auf deinem Gerät (im Browser im lokalen Speicher). Das ist für die Funktion der App nötig (§ 25 Abs. 2 TDDDG). Cookies für Werbung oder Tracking setzen wir nicht.",
    ],
  },
  {
    titel: "12. Verwaltung durch Fahrschule oder Betreiber",
    inhalt: [
      "Im Verwaltungsbereich sehen wir bzw. deine Fahrschule, welche Zugänge es gibt, und können sie einem Fahrlehrer zuordnen, pausieren, sperren oder löschen und eine kurze Notiz hinterlegen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.",
      "Damit deine Fahrschule dich gut vorbereiten kann, sieht sie dort auch deinen Lernstand (Fortschritt je Thema, Prüfungssimulationen, Lernzeit, Serie, gefundene Schilder) und deinen Prüfungstermin, wenn du ihn eingetragen hast. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit die App Teil deiner Ausbildung ist, sonst unser berechtigtes Interesse an einer guten Betreuung (Art. 6 Abs. 1 lit. f DSGVO). Möchtest du das nicht, schreib uns – dann löschen wir die Zuordnung.",
      "Löst du einen Einladungscode deiner Fahrschule ein, speichern wir, wer ihn wann eingelöst hat, und ordnen dich dem dazugehörigen Fahrlehrer zu.",
      "Nachrichten an dich (z. B. Mitteilungen der Fahrschule oder Hinweise zu Meldungen) speichern wir, bis du sie gelesen hast, und danach so lange wie dein Konto.",
      "Wer sich als Fahrlehrer registriert, wird von uns geprüft und bestätigt, bevor er Clips hochladen kann. Dafür sehen wir Name, Benutzername und E-Mail-Adresse.",
    ],
  },
  {
    titel: "13. Wie lange wir Daten speichern",
    inhalt: [
      "Wir speichern deine Daten, solange du dein Konto hast. Löschst du dein Konto, entfernen wir dein Profil, deinen Lernstand, deine Clips, Kommentare, Likes, Chat-Nachrichten und Dateien sofort. Technische Sicherungskopien des Anbieters werden nach dessen Fristen überschrieben. Angaben zum Schutz vor Missbrauch (z. B. Anmeldeversuche) löschen wir nach kurzer Zeit automatisch.",
    ],
  },
  {
    titel: "14. Deine Rechte",
    inhalt: [
      "Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Eine Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3).",
      "Viele Angaben kannst du direkt in den Einstellungen ändern, und dein Konto kannst du dort selbst löschen. Für alles andere genügt eine E-Mail an uns.",
      "Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, z. B. bei der Behörde deines Bundeslandes.",
    ],
  },
  {
    titel: "15. Kinder und Jugendliche",
    inhalt: [
      "Die App richtet sich an Fahrschülerinnen und Fahrschüler. Wer jünger als 16 Jahre ist, braucht für ein Konto die Zustimmung der Eltern.",
    ],
  },
  {
    titel: "16. Änderungen",
    inhalt: [`Wir passen diese Datenschutzerklärung an, wenn sich die App oder die Rechtslage ändert. Es gilt die jeweils in der App abrufbare Fassung. Stand: ${STAND}.`],
  },
];

// ---------------------------------------------------------------------------
// Nutzungsbedingungen
// ---------------------------------------------------------------------------

export const NUTZUNGSBEDINGUNGEN: Abschnitt[] = [
  {
    titel: "1. Worum es geht",
    inhalt: [
      `${APP_NAME} hilft dir beim Lernen für die Führerschein-Theorie. Anbieter ist ${BETREIBER.name} (Kontakt siehe Impressum). Diese Bedingungen gelten für die App und die Browser-Version. Die Nutzung ist kostenlos.`,
    ],
  },
  {
    titel: "2. Konto",
    inhalt: [
      "Für einige Funktionen brauchst du ein Konto. Angemeldet wird mit einem Code, den wir an deine E-Mail-Adresse schicken. Bitte mach wahre Angaben und schütze den Zugang zu deinem E-Mail-Postfach. Wer jünger als 16 Jahre ist, braucht die Zustimmung der Eltern. Du kannst dein Konto jederzeit in den Einstellungen löschen.",
    ],
  },
  {
    titel: "3. Lerninhalte",
    inhalt: [
      `Wir erstellen die Erklärungen sorgfältig, können aber nicht garantieren, dass sie vollständig, aktuell und fehlerfrei sind. ${APP_NAME} ersetzt keinen Unterricht in der Fahrschule, und wir versprechen nicht, dass du die Prüfung bestehst. ${APP_NAME} ist ein privates Angebot und steht in keiner Verbindung zu Prüforganisationen oder Behörden.`,
    ],
  },
  {
    titel: "4. Deine Inhalte",
    inhalt: [
      "Für Clips, Kommentare, Chat-Nachrichten, Lives und dein Profilbild bist du selbst verantwortlich. Du darfst nur Inhalte veröffentlichen, an denen du die nötigen Rechte hast und auf denen erkennbare Personen damit einverstanden sind.",
      `Damit wir deine Inhalte in ${APP_NAME} zeigen können, räumst du uns ein einfaches, kostenloses Recht ein, sie in der App zu speichern, anzuzeigen und dafür technisch anzupassen (z. B. zu verkleinern). Das Recht endet, wenn du den Inhalt oder dein Konto löschst.`,
    ],
  },
  {
    titel: "5. Was nicht erlaubt ist",
    inhalt: [
      {
        liste: [
          "Beleidigungen, Hetze, Bedrohungen, Mobbing oder Belästigung",
          "Gewalt-, Sex- oder sonst jugendgefährdende Inhalte",
          "gefährliches Verhalten im Straßenverkehr zu zeigen oder dazu aufzurufen",
          "Spam, Werbung ohne unsere Zustimmung oder irreführende Inhalte",
          "fremde Inhalte ohne Erlaubnis oder persönliche Daten anderer zu veröffentlichen",
          "die App zu stören, auszuspähen oder Sicherheitsmaßnahmen zu umgehen",
        ],
      },
    ],
  },
  {
    titel: "6. Melden, Blockieren und Moderation",
    inhalt: [
      "Du kannst Clips und Chat-Nachrichten melden und andere Personen blockieren. Wir prüfen Meldungen und können Inhalte entfernen sowie Konten pausieren oder sperren, wenn gegen diese Bedingungen oder gegen Gesetze verstoßen wird. Bei schweren Verstößen auch ohne Vorwarnung.",
      "Entfernen wir einen Inhalt von dir, bekommst du in der App eine Begründung. Bist du anderer Meinung, schreib uns über die Kontaktadresse im Impressum – wir prüfen die Entscheidung dann noch einmal. Wer gemeldet hat, erfährt, dass die Meldung geprüft wurde.",
      "Als Fahrlehrer registrierte Konten können erst Clips hochladen, wenn wir sie bestätigt haben.",
    ],
  },
  {
    titel: "7. Verfügbarkeit",
    inhalt: [
      "Wir bemühen uns, dass die App gut funktioniert, können aber keine ständige Verfügbarkeit zusagen. Funktionen können sich ändern, hinzukommen oder wegfallen.",
    ],
  },
  {
    titel: "8. Haftung",
    inhalt: [
      "Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Schäden an Leben, Körper oder Gesundheit. Bei leichter Fahrlässigkeit haften wir nur bei Verletzung wesentlicher Pflichten und begrenzt auf den typischen, vorhersehbaren Schaden. Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt.",
    ],
  },
  {
    titel: "9. Änderungen und Schluss",
    inhalt: [
      "Ändern sich diese Bedingungen, informieren wir dich in der App. Es gilt deutsches Recht; zwingende Verbraucherschutzvorschriften deines Wohnsitzlandes bleiben unberührt. Sollte eine Regelung unwirksam sein, bleiben die übrigen wirksam.",
      `Stand: ${STAND}`,
      { link: "/datenschutz", text: "Datenschutzerklärung" },
      { link: "/impressum", text: "Impressum" },
    ],
  },
];
