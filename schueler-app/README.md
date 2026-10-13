# Schüler-App (iOS)

Native iPhone-App (Expo / React Native) **für Fahrschüler**. Nutzt **dasselbe
Supabase-Backend** wie die Website und die Fahrlehrer-App (`../mobile`) –
Schüler sehen und ändern dabei nur ihre eigenen Daten.

**Funktionen**
- Anmelden oder Konto erstellen mit dem **Zugangscode** der Fahrschule
  (Schülerakte → Reiter „Portal“ → Zugang freischalten)
- **Start:** nächste Fahrstunde (zusagen/absagen), Fortschritt, offene Beträge
- **Termine:** anstehende Stunden, Verlauf und **Fahrstunden anfragen** –
  der Fahrlehrer nimmt die Anfrage an (Website oder Fahrlehrer-App), dann
  steht sie hier als Termin
- **Fortschritt:** Theorie, Sonderfahrten, Fahrstunden, Prüfungen
- **Rechnungen:** Positionen, online bezahlen oder Überweisungsdaten
- **Mitteilungen:** Erinnerung 1 Std. vor jeder Fahrstunde und sofortige
  Meldung, wenn eine Anfrage angenommen oder abgelehnt wurde (solange die App
  läuft)

## Einrichten

```bash
cd schueler-app
npm install
cp .env.example .env
```

In `.env` **dieselben Supabase-Werte** wie in der Web-App eintragen – nur mit
`EXPO_PUBLIC_` statt `NEXT_PUBLIC_`.

Voraussetzung in der Datenbank: Migration `0020_fahrstunden_anfragen.sql` ist
eingespielt und unter Einstellungen → Schülerportal sind Anfragen eingeschaltet.

## Auf dem Mac starten (Xcode)

Nach einem `git pull` mit neuen Paketen immer zuerst `npm install` – und die
App mit `npx expo run:ios` neu bauen (neue native Bausteine wie Farbverläufe
kommen erst mit einem neuen Build in die App).

```bash
npx expo run:ios
```

Oder das Xcode-Projekt erzeugen und in Xcode öffnen:

```bash
npx expo prebuild
open ios/Fahrschule.xcworkspace
```

Der `ios/`-Ordner wird lokal erzeugt und ist absichtlich nicht eingecheckt.
Nach Änderungen an `app.json` einfach erneut `npx expo prebuild` ausführen.
