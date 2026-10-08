# Fahrschul Pro – Theorie-App

Eigenständige App (iPhone und Android) zum Lernen der Führerschein-Theorie in Schwarz und
Orange mit Fotokarten: Home mit Tagesziel und Schnellstart, Kategorien mit
Favoriten und schwierigen Fragen, Fragen in der Fahrersicht, Training mit
Lernfächern, Prüfungssimulation mit Fehlerpunkten, „Mein Fortschritt“ mit
Lernzeit sowie Stärken und Schwächen, Clips (animierte Kurz-Erklärungen),
Online-Duelle (Rangliste mit Elo und Freundes-Code), Wochen-Liga für
Deutschland und je Bundesland, Serien-Schutz, Abzeichen.

Die Fotos stehen unter freien Lizenzen (CC0, Public Domain, CC BY, CC BY-SA);
die Nachweise sind in `src/lib/fotos.ts` und in der App unter
Einstellungen → Bildnachweise.

## Starten

```
cd theorie-app
npm install
npx expo run:ios      # oder: npx expo run:android
```

Auf dem eigenen iPhone mit QR-Code: Expo Go geht nicht (die App hat eigene
native Teile, und Expo Go aus dem App Store kann nur die neueste Expo-Version).
Stattdessen kommt die App einmal als „Development Build“ aufs iPhone – per
Kabel mit `npx expo run:ios --device` (iPhone: Entwicklermodus an; Xcode:
Apple-ID mit Zertifikat). Danach reicht `npx expo start`: Den QR-Code im
Terminal mit der iPhone-Kamera scannen, die App lädt den aktuellen Stand vom
Mac (gleiches WLAN). Neu bauen nur, wenn native Pakete dazukommen.

Android (Unterschiede, Testen, Play Store): `docs/android.md`.
Sicherheit (was geschützt ist, was in Supabase einzustellen ist): `docs/sicherheit.md`.

Ohne Server läuft die App im Gastmodus – der Lernstand bleibt auf dem Gerät.

## Server (Registrierung, Liga, Sicherung)

1. Neues Supabase-Projekt anlegen (am besten getrennt von der Fahrschul-Software).
2. Im SQL-Editor `supabase/schema.sql` ausführen (bei Updates einfach erneut –
   das Skript ist wiederholbar).
3. `.env.example` nach `.env` kopieren und URL + anon key eintragen.
4. Authentication → Sign In / Providers → Email → „Confirm email“ **ausschalten**:
   Nach der Registrierung ist man sofort angemeldet, ohne Bestätigungs-Mail.
   `schema.sql` (Abschnitt 15) bestätigt neue Konten ohnehin automatisch. Weil
   die Adresse dabei nie geprüft wird, gibt es Inhaber-Rechte über die E-Mail nur
   für Konten von vor der Umstellung oder mit Google/Apple-Anmeldung.
5. Authentication → URL Configuration → Redirect URLs: `spur://**` eintragen.
   Dann öffnen die Links aus der Passwort-Mail direkt die App (auf dem iPhone)
   und melden an.

## Tab-Leiste

Die Leiste unten ist die native iOS-Tab-Leiste (ab iOS 26 im Liquid-Glass-Look,
schwebend und beim Scrollen kleiner). iOS zeigt höchstens fünf Reiter:
Home, Lernen, Clips, Prüfung, Profil. „Mein Fortschritt“ (Statistiken) ist
über Home → „Alle ansehen“, die Statistik-Kachel und das Profil erreichbar.

## Startseite und Darstellung

Oben ein großes Foto, das mit der Tageszeit wechselt (Morgen, Tag, Abend,
Nacht) und sich langsam bewegt. Darauf Begrüßung, der Countdown zur Prüfung in
Handschrift und auf Glas Prüfungsreife, Serie und Tagesziel. Darunter der
Startknopf, Schnellstart, das Thema mit dem meisten Nachholbedarf, alle Themen
als Karussell, die Prüfungssimulation, die Crew und ein Spruch des Tages.

Unter Einstellungen → Darstellung gibt es „Nachtfahrt (dunkel)“ und
„Tagfahrt (hell)“. Die helle Darstellung gilt für die ganze App – nur Clips,
der Kamera-Scanner und Anmelden/Registrieren bleiben bewusst dunkel. Auf den
Tabs ist dann auch die Tab-Leiste unten helles Glas. Auf dem iPhone
schaltet die App dafür das Fenster auf hell (`DarstellungBruecke` in
`src/lib/darstellung.tsx`), weil die native Liquid-Glass-Leiste sich nach der
Darstellung des Fensters richtet; fürs System ist die App sonst fest dunkel.

Ebenfalls unter Darstellung: „XP, HP & Abzeichen einblenden“ – von Haus aus
**aus**. Dann gibt es beim Lernen keine XP-Kapseln, keine Treffer-Anzeige für
den Crew-Boss und keinen Hinweis auf neue Abzeichen; in den Auswertungen steht
statt XP die Zeit. XP und Abzeichen werden trotzdem gesammelt (Liga, Profil).
Die Einstellung gilt fürs Gerät (`belohnungen` in `src/lib/darstellung.tsx`).

Unterseiten nutzen dieselben Bausteine: `Seite` (Farbwelt, Statusleiste),
`FotoKopf` (Titelfoto mit Glas-Knöpfen, läuft in den Grund aus), `GrossKopf`
(großer Titel ohne Foto), `StandKarte` und `WerteReihe` in
`src/components/seite.tsx`; Knöpfe, Chips, Listen, Karten und Eingaben aus
`src/components/ui.tsx` richten sich nach der Farbwelt.

## Lernen und Prüfung

**Lernen** zeigt oben eine schräge Wand aus allen Themenfotos, die langsam
vorbeizieht. Darauf die Suche und der Stand aller Fragen (sicher, offene Fehler,
noch neu) als geteilter Balken. Darunter „Smart lernen“, die Lernmodi
(Karteikarten, Schilder-Jagd, Fehler üben, Favoriten, schwierige Fragen,
Verkehrszeichen, Formeln, Kurz erklärt) und alle Themen als Poster mit Filter
nach Schwierigkeit (`src/components/lernen.tsx`).

**Prüfung** zeigt die Prüfungsreife als Tacho (grüner Bereich ab 90 %, beim
ersten Öffnen einmal Vollausschlag wie beim Motorstart), den Startknopf für die
Simulation, den Prüfungstermin als Ticket, die Fehlerpunkte der letzten zehn
Simulationen mit der Grenze bei 10 Punkten, die schwächsten Themen zum Üben und
den Ablauf der Prüfung (`src/components/pruefen.tsx`).

**Fragen** (Training und Simulation) sind hell und dunkel: oben Glas-Knöpfe,
im Training ein Fortschritt je Frage (grün richtig, rot falsch), in der
Simulation Uhr und Nummern zum Springen. Die Frage steht auf einer Karte mit
Bild oder Themenfoto, die Antworten sind Karten mit Buchstaben, die beim Wählen
zum Haken werden. Nach dem Prüfen zeigt ein Banner das Ergebnis mit XP, darunter
„Richtig ist“ und „Merke dir“. Die Auswertung hat ein Foto, einen leuchtenden
Ring und bei der Simulation einen Stempel „Bestanden“ / „Nicht bestanden“
(`src/components/frage-ansicht.tsx`, `frage-rahmen.tsx`, `auswertung.tsx`).

**Erklärung zur Frage:** Gibt es zu einer Frage ein Erklärvideo oder eine
Animation, steht im Training unten neben der KI-Hilfe ein Play-Knopf. Er öffnet
die Erklärung; gibt es beides, schaltet oben „Video | Animation“ um.

- **Animationen** sind eingebaut für alle Fragen mit Lageplan (rechts vor links,
  Linksabbiegen, Kreisverkehr, Rechtsabbiegen mit Radfahrer, Rettungsgasse,
  Schulbus): Die Fahrzeuge fahren Schritt für Schritt in der richtigen
  Reihenfolge, mit Nummern, Blinker, Schulterblick und Text zu jedem Schritt.
  Antippen hält an, die Leiste darunter springt zu einem Schritt, am Ende kommt
  „Merke“. Daten in `src/lib/erklaer-animationen.ts`, gezeichnet in
  `src/components/erklaer-animation.tsx`.
- **Erklärvideos** lädt nur der Inhaber hoch: Einstellungen → Lernen →
  „Erklärvideos“ → Frage suchen → „Video hochladen“ (bis 5 Minuten, 50 MB; das
  iPhone rechnet auf 720p herunter). Dort auch ansehen, ersetzen und löschen.
  Einrichten: `supabase/update-erklaervideos.sql` im SQL-Editor ausführen
  (Abschnitt 21 in `schema.sql`, wiederholbar) – legt die Tabelle
  `lern_erklaervideo` und den Speicher `lern-erklaervideos` an.

## Clips (kurze Videos)

Der Reiter „Clips“ zeigt kurze Videos: oben „Entdecken“ und „Folge ich“,
rechts Gefällt mir, Kommentare, Teilen und Mehr, oben rechts Ton an/aus.
Ansehen geht für alle, Liken, Kommentieren und Folgen mit Konto.

- `supabase/schema.sql` (Abschnitt 10) legt Tabellen, Rechte und den Speicher
  `lern-clips` an. Das Skript einfach erneut ausführen – es ist wiederholbar.
- Inhaber ist, wer mit einer E-Mail aus der Tabelle `lern_inhaber` angemeldet
  ist. Eingetragen ist `leon.scheulen@gmail.com`. Das bestehende Konto mit
  dieser Adresse ist Inhaber; ein neues Konto mit einer Inhaber-Adresse nur,
  wenn es sich mit Google/Apple anmeldet (Adresse geprüft). Dann erscheint im
  Clips-Reiter oben links das „+“ zum Hochladen.
- Andere freischalten: Einstellungen → Clips → „Clip-Ersteller verwalten“,
  Benutzername oder E-Mail eingeben.
- Videos werden beim Auswählen auf 720p (H.264) verkleinert. Im kostenlosen
  Supabase-Tarif sind höchstens 50 MB je Datei erlaubt.

## Crew (gemeinsam lernen)

2 bis 6 Freunde lernen zusammen. Die Crew findet man auf Home unter „Serie und
Woche“, außerdem unter Profil → Meine Crew.

- **Crew-Flamme:** Sie wächst jeden Tag, an dem alle ihr Tagesziel schaffen,
  und zeigt, wer heute schon fertig ist. Wer fehlt, kann angestupst werden.
- **Wochen-Boss:** Jeden Montag kommt ein Boss aus dem schwächsten Thema der
  Crew. Jede richtige Antwort in diesem Thema macht 5 Schaden, jede falsche
  heilt ihn um 3. Die Boss-Seite zeigt die Lebenspunkte als Ring, wie viele
  richtige Antworten noch fehlen, den Schaden je Mitglied in dieser Woche und
  den Kampfverlauf live. Beim Lernen erscheint „−5 HP“ (wenn eingeschaltet).
  Nach dem Sieg bekommen alle eine XP-Truhe (+150 XP) und das Abzeichen
  „Bossbezwinger“.
- **Einladen:** per Link, QR-Code oder Code (Meine Crew). Auf fremden
  Profilen gibt es „In Crew einladen“; die Einladung erscheint dort auf Home.

Einrichten:

1. `supabase/update-crew.sql` im SQL-Editor ausführen (steht auch als
   Abschnitt 16 in `schema.sql`, wiederholbar). Wer die Crew schon eingerichtet
   hat, braucht für den Schaden je Mitglied nur noch
   `supabase/update-boss-schaden.sql`.
2. Push-Mitteilungen (Anstupsen, Einladung, Boss besiegt) verschickt die
   Datenbank selbst über die Erweiterung `pg_net` (Database → Extensions →
   pg_net; das Skript schaltet sie ein, wenn es darf). Ohne `pg_net`
   funktioniert alles, nur ohne Push.
3. Die App braucht dafür eine EAS-Projekt-ID (`eas init`, landet in `app.json`
   unter `extra.eas.projectId`). iPhone: Beim ersten `eas build` den Push-Key
   anlegen lassen. Android: Firebase (FCM) in EAS eintragen.

## KI-Hilfe

Eine Sprechblase aus Glas, die auf den KI-Knopf zeigt: „Ich verstehe diese
Frage nicht“ erklärt die Frage, im Feld darunter kann man alles Mögliche
fragen – auch ohne Bezug zur Frage. Danach gibt es „Erklärung in leichter
Sprache“, „Gib mir ein Beispiel“, einen Merksatz und Daumen hoch/runter.

- **Wo:** im Training über den ✨-Knopf unten links (auch vor dem Antworten),
  in der Auflösung der Prüfungssimulation über „KI-Hilfe“. In der laufenden
  Simulation gibt es keine Hilfe.
- **Ohne Einrichtung** antwortet die App aus dem eigenen Lernstoff (Fragen,
  Verkehrszeichen, Kurz erklärt, Faustformeln – z. B. „Bremsweg bei 80?“).
  Solche Antworten tragen den Hinweis „Aus dem Lernstoff der App“.
- **Mit echter KI** (Claude von Anthropic) beantwortet sie jede Frage. Der
  API-Schlüssel liegt nur auf dem Server (Supabase Edge Function), nie in der
  App. Nur angemeldete Nutzer, höchstens 40 Anfragen pro Person und Tag
  (`LIMIT_PRO_TAG` in `supabase/functions/ki-hilfe/index.ts`). Gäste und
  Fehlerfälle bekommen die Antwort aus dem Lernstoff.

Einrichten:

1. API-Schlüssel anlegen: console.anthropic.com → Settings → API Keys (und
   unter Billing Guthaben aufladen).
2. Supabase → Edge Functions → Secrets: `ANTHROPIC_API_KEY` (der Schlüssel)
   und `KI_MODELL` (die Modell-ID aus der Anthropic-Doku, „Models overview“).
3. Funktion bereitstellen – per Terminal im Ordner `theorie-app`:
   `npx supabase login`, `npx supabase link --project-ref <Projekt-ID>`,
   `npx supabase functions deploy ki-hilfe`. Oder im Dashboard: Edge
   Functions → „Deploy a new function“ → Name `ki-hilfe` → Inhalt von
   `supabase/functions/ki-hilfe/index.ts` einfügen → Deploy.
4. Die Tabelle `lern_limit` (für das Tageslimit) kommt aus `schema.sql` bzw.
   `update-crew.sql`. Unter Edge Functions → Logs steht je Antwort, wie viele
   Tokens sie gebraucht hat.

## Live-Stream in Clips

Nur der Inhaber der App (E-Mail in `lern_inhaber`) geht live, direkt aus der
App. Alle anderen schauen in Clips zu, schreiben im Chat und schicken Herzen.

- **Live gehen:** In Clips oben die Kategorie „Live“ → „Live gehen“ (den
  Knopf sieht nur der Inhaber). Erst kommt eine Kamera-Vorschau mit Thema, dann „Live gehen“,
  ein Countdown und das Live. Oben stehen Laufzeit und Zuschauer. Rechts
  dreht man die Kamera und schaltet das Mikrofon. Lange auf eine
  Chat-Nachricht drücken: löschen oder die Person stummschalten.
  „Beenden“ oder die Seite verlassen beendet das Live. Ohne Lebenszeichen der
  App (z. B. leerer Akku) verschwindet es nach 2 Minuten von selbst.
- **Zuschauen:** Läuft ein Live, hat der Clips-Reiter unten einen roten Punkt
  und die Kategorie „Live“ oben in Clips einen pulsierenden Punkt. Das Live
  öffnet sich im Vollbild ohne Tab-Leiste (einmal von selbst, wenn man Clips
  öffnet, sonst über „Live“); das ✕ oben rechts führt zurück zu Clips. Gäste schauen zu; schreiben kann nur, wer angemeldet ist (ohne
  Links, mit Tempolimit und Schimpfwort-Sperre). Nachrichten lassen sich
  melden (Tabelle `lern_live_meldung`).
- **Mitteilung beim Start:** Nur für alle, die zugestimmt haben – über die
  Glocke im Live, auf der Live-Seite oder unter Einstellungen → Mitteilungen →
  „Live-Streams“. Das verlangt Apple bei solchen Mitteilungen. Pushes kommen
  nur auf echten Geräten an und brauchen `eas init` (wie die Crew).
- **Live-Quiz:** Im Live rechts auf „Quiz“ tippen, eine Frage aus dem Katalog
  wählen (Zufallsfrage, Suche oder nach Thema; schon gestellte sind markiert),
  Zeit einstellen (15/20/30 s) und starten. Dann teilt sich bei allen der
  Bildschirm: oben die Kamera, unten das Quiz über die ganze Breite, weich ins
  Video übergeblendet; Chat und Herzen sind so lange aus. Die Zuschauer kreuzen
  an wie in der Prüfung (eine oder mehrere richtige Antworten). Der Inhaber sieht die Stimmen live und die Lösung
  vorab, nach Ablauf der Zeit löst die App von selbst auf (oder früher mit
  „Jetzt auflösen“). Dann sieht jeder Verteilung, Erklärung und seine Punkte:
  500 fürs Richtige plus bis zu 500 fürs Tempo. „Rangliste“ zeigt allen die
  Top 5 im Live, der Abschluss nach dem Live die Quiz-Sieger. Mitspielen geht
  nur mit Konto; stummgeschaltete Leute spielen nicht mit.
- **Live-Prüfung:** Rechts auf „Prüfung“ tippen → alle schreiben gleichzeitig
  eine echte Prüfung: 20 Fragen aus allen Themen, 10 Minuten, Fehlerpunkte wie
  in der App (bestanden bis 10, zwei falsche 5-Punkte-Fragen = durchgefallen).
  Der Bildschirm teilt sich wie beim Quiz; die Zuschauer springen über den
  Navigator zwischen den Fragen und geben ab (bei Zeitende automatisch). Der
  Inhaber sieht einen Live-Zähler: wer schreibt, wer abgegeben hat, wie viele
  bestehen und wie weit jeder ist. Mit „+1 Min“ / „+3 Min“ gibt er allen mehr
  Zeit (insgesamt höchstens eine Stunde), „Beenden“ wertet sofort für alle.
  Danach sehen alle Quote, Ø Fehlerpunkte, das Podest und ihre Fehler mit der
  richtigen Lösung, der Inhaber zusätzlich die schwersten Fragen. Die Lösungen
  kennt nur der Server, er wertet beim Abgeben.
- **XP fürs Mitspielen:** Jede Quizfrage und jede Live-Prüfung zählt wie
  Lernen (Lernstand, Prüfungs-Liste, Serie). Quiz: 10 XP für richtig (2 für
  falsch) plus bis zu 10 Tempo-XP. Prüfung: XP je beantworteter Frage plus 60
  fürs Bestehen (20 sonst), fehlerfrei 40 extra. Jede Runde zählt nur einmal,
  auch nach einem Neustart. Die XP stehen im Ergebnis, wenn „XP, HP &
  Abzeichen“ eingeschaltet ist.
- **Bild aus der Galerie:** Rechts auf „Bild“ → ein Foto wählen; es liegt dann
  bei allen auf dem Video. Mit einem Finger verschieben, mit zwei größer oder
  kleiner machen – die Zuschauer sehen jede Bewegung sofort. Festhalten zeigt
  unten die Löschleiste; hineinziehen und loslassen löscht das Bild. Startet
  ein Quiz oder eine Prüfung, wandert das Bild mit der Kamera nach oben. Noch
  einmal auf „Bild“ tippen: anderes Bild oder entfernen. Wer später dazukommt,
  sieht das Bild an der letzten Stelle; nach dem Live wird es gelöscht
  (Speicher `lern-live`, nur der Inhaber darf hochladen).
- **Greenscreen (nur iPhone):** Rechts auf „Greenscreen“ → ein Bild oder Video
  aus der Galerie wählen. Die App stellt dich im Kamerabild frei und legt den
  Hintergrund dahinter – immer über den ganzen Ausschnitt, nicht verschieb- oder
  skalierbar; ein Video läuft stumm in Schleife. Startet ein Quiz oder eine
  Prüfung, füllt der Hintergrund weiter den (kleineren) Kamerabereich. Noch
  einmal tippen: anderer Hintergrund oder „Greenscreen aus“. Gerechnet wird auf
  dem iPhone direkt vor dem Senden (`modules/live-greenscreen`, Apple Vision),
  die Zuschauer brauchen nichts. Braucht einen neuen App-Build und eine echte
  Kamera – im Simulator und auf Android fehlt der Knopf.
- **Zwei Kameras (nur iPhone ab XS/XR):** Rechts auf „2 Kameras“ → groß die
  Rückkamera, die Frontkamera als runder Kreis darüber. Kreis mit einem Finger
  verschieben, mit zwei größer oder kleiner machen, antippen (oder „Tauschen“
  oben rechts) tauscht die Kameras. Beim Quiz und bei der Prüfung wandert der
  Kreis mit dem Kamerabereich nach oben. Gerechnet wird auf dem iPhone direkt vor
  dem Senden (`modules/live-greenscreen`, ZweitkameraProzessor) – alle Zuschauer,
  auch auf Android, sehen dasselbe Bild. Greenscreen und zweite Kamera gehen nicht
  gleichzeitig. Braucht einen neuen App-Build; auf älteren iPhones fehlt der Knopf.
- **Themenrad:** Rechts auf „Rad“ → bei allen dreht gleichzeitig ein Glücksrad
  mit den Lernthemen. Danach startet der Inhaber eine Frage aus dem Thema als
  Quiz.
- **Tafel:** Rechts auf „Tafel“ → eine große Zeichenfläche auf dem Bild aus der
  Galerie oder einer Vorlage (Kreuzung, Kreisverkehr, leer). Der Inhaber malt
  Striche und Pfeile, alle sehen jeden Strich live.
- **Technik:** Bild und Ton über [LiveKit](https://livekit.io) (WebRTC, kaum
  Verzögerung), Status, Chat, Quiz und Prüfung über Supabase
  (`update-live.sql`, `update-live-quiz.sql`, `update-live-pruefung.sql` und
  `update-live-tafel.sql`, Abschnitt 17 bis 20, mit Echtzeit; Neues bei Quiz und Prüfung meldet die App
  des Inhabers zusätzlich über LiveKit, ebenso jede Bewegung des Bilds). Die Edge Function
  `live-token` gibt die Zugänge aus: senden darf nur der Inhaber, alle anderen
  nur empfangen. LiveKit rechnet nach Minuten und Zuschauern ab – den
  Verbrauch zeigt cloud.livekit.io.

Einrichten:

1. `supabase/update-live.sql`, danach `supabase/update-live-quiz.sql`,
   `supabase/update-live-pruefung.sql` und `supabase/update-live-tafel.sql`
   (Themenrad und Tafel) im SQL-Editor ausführen. Sie hängen die
   Tabellen an die Echtzeit-Publikation `supabase_realtime` (gibt es in jedem
   Supabase-Projekt) – darüber kommen Chat, Live-Status, Quizfragen und
   Prüfungen sofort an. Die letzte Datei legt auch den Speicher `lern-live`
   für das Bild aus der Galerie an.
2. Auf cloud.livekit.io ein Projekt anlegen und unter Settings → API Keys einen
   Schlüssel erzeugen (URL `wss://…livekit.cloud`, API Key, API Secret).
3. Supabase → Edge Functions → Secrets: `LIVEKIT_URL`, `LIVEKIT_API_KEY`,
   `LIVEKIT_API_SECRET`. Dann die Funktion bereitstellen – per Terminal im
   Ordner `theorie-app`: `npx supabase functions deploy live-token --no-verify-jwt`
   (Gäste schauen ohne Konto zu; wer senden will, prüft die Funktion selbst).
   Im Dashboard: „Deploy a new function“ → Name `live-token` → Inhalt von
   `supabase/functions/live-token/index.ts` → „Enforce JWT verification“ aus.
4. Neuer App-Build (neue native Teile: LiveKit, WebRTC, Mikrofon, Greenscreen, zweite Kamera):
   `npm install`, `npx expo prebuild --clean -p ios`, `npx expo run:ios --device`.
   Senden geht nur auf einem echten iPhone (der Simulator hat keine Kamera),
   zuschauen auch im Simulator. Android kann nur zuschauen (das Mikrofon ist
   dort bewusst gesperrt).

## Live-Aktivität (Sperrbildschirm und Dynamic Island)

Nur iPhone ab iOS 16.2; die Dynamic Island gibt es ab iPhone 14 Pro.

- **Prüfungssimulation:** Frage X von 30, offene Fragen und die Restzeit der
  45 Minuten. Ist die Zeit um, gibt die App automatisch ab. War die App in dem
  Moment nicht offen, zeigt die Aktivität „Zeit abgelaufen“, und die App
  gibt ab, sobald man sie öffnet. Nach dem Abgeben erscheinen Ergebnis und
  Fehlerpunkte, die dann noch 15 Minuten auf dem Sperrbildschirm stehen.
- **Prüfungstag:** Im Prüfen-Tab den Prüfungstermin eintragen. Am Morgen des
  Prüfungstags kommt eine Mitteilung. Öffnet man danach die App, startet ein
  Countdown bis zur Prüfung (höchstens 8 Stunden vorher, das ist Apples
  Grenze); ab dem Termin zeigt er „Viel Erfolg“. Auf Android gibt es nur die
  Mitteilung.

Aufbau:

- `targets/pruefung-live/`: SwiftUI-Ansichten (Widget-Erweiterung, wird von
  `@bacons/apple-targets` bei `expo prebuild` angelegt, Bundle-ID
  `de.spur.theorie.pruefunglive`).
- `modules/live-aktivitaet/`: kleines natives Modul (ActivityKit) zum
  Starten, Aktualisieren und Beenden.
- `src/lib/live-aktivitaet.ts` (JS-Anbindung) und `src/lib/pruefungstag.tsx`
  (Termin, Countdown, Mitteilung).
- `Attribute.swift` gibt es zweimal (Erweiterung und Modul). Die beiden
  Dateien müssen gleich bleiben, weil iOS die Aktivität über den Typnamen
  zuordnet.

Bauen: Die Erweiterung braucht einen nativen Build, Expo Go reicht nicht.
Gibt es schon einen `ios`-Ordner von einem älteren Build, einmal
`npx expo prebuild --clean -p ios` ausführen: `npx expo run:ios` legt den
Ordner nicht neu an, und ohne das fehlt die Erweiterung. Beim Entwickeln steht
im Terminal nach dem Start einer Simulation, ob die Live-Aktivität läuft und
wenn nicht, warum. Mit
`eas build -p ios` legt EAS für beide Bundle-IDs Zertifikate und Profile an.
Für Builds in Xcode die Team-ID unter `ios.appleTeamId` in `app.json`
eintragen (developer.apple.com → Membership). Zum Testen im Simulator ein
iPhone 15 oder neuer wählen. Live-Aktivitäten lassen sich unter
Einstellungen → Fahrschul Pro → Live-Aktivitäten ausschalten; dann macht
die App einfach ohne weiter.

## Fragen

`src/lib/fragen.ts` enthält selbst formulierte Beispielfragen. Der amtliche
Fragenkatalog (mit Bildern und Videos) ist lizenzpflichtig
(TÜV | DEKRA arge tp 21) und kann später im selben Format eingespielt werden.
