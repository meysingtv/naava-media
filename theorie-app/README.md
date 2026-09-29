# Fahrschule Pro – Theorie-App

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

Bauen: Die Erweiterung braucht einen nativen Build, Expo Go reicht nicht. Mit
`eas build -p ios` legt EAS für beide Bundle-IDs Zertifikate und Profile an.
Für Builds in Xcode die Team-ID unter `ios.appleTeamId` in `app.json`
eintragen (developer.apple.com → Membership). Zum Testen im Simulator ein
iPhone 15 oder neuer wählen. Live-Aktivitäten lassen sich unter
Einstellungen → Fahrschule Pro → Live-Aktivitäten ausschalten; dann macht
die App einfach ohne weiter.

## Fragen

`src/lib/fragen.ts` enthält selbst formulierte Beispielfragen. Der amtliche
Fragenkatalog (mit Bildern und Videos) ist lizenzpflichtig
(TÜV | DEKRA arge tp 21) und kann später im selben Format eingespielt werden.
