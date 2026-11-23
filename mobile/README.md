# FahrschulApp – Mobile (iOS)

Native iOS-App (Expo / React Native) zur Fahrschul-Verwaltung. Nutzt **dasselbe
Supabase-Backend** wie die Web-App – gleiche Zugangsdaten, gleiche Daten.

**Screens:** Login · Heute (Fahrstunden des Tages) · Kalender (kommende Stunden) ·
Schüler (Liste mit Suche).

## Einrichten

```bash
cd mobile
npm install
cp .env.example .env
```

Trage in `.env` **dieselben Supabase-Werte** wie in der Web-App ein – nur mit dem
Prefix `EXPO_PUBLIC_` statt `NEXT_PUBLIC_`:

```
EXPO_PUBLIC_SUPABASE_URL=...        # = NEXT_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=...   # = NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## In Xcode öffnen & testen (Mac)

```bash
npx expo prebuild               # erzeugt den nativen ios/-Ordner (Xcode-Projekt)
open ios/FahrschulApp.xcworkspace
```

In Xcode oben einen Simulator (oder dein iPhone) wählen und auf ▶️ **Run** drücken.

Alternativ alles in einem Befehl (baut & startet den Simulator über die Xcode-Toolchain):

```bash
npx expo run:ios
```

> Der `ios/`-Ordner wird lokal generiert und ist absichtlich nicht eingecheckt
> (Expo „Continuous Native Generation"). Nach Änderungen an `app.json`/Plugins
> einfach erneut `npx expo prebuild` ausführen.

## Schnelltest ohne Build (optional)

Mit der **Expo Go**-App aus dem App Store:

```bash
npx expo start
```

Dann den QR-Code mit der Kamera/Expo Go scannen (iPhone im selben WLAN).

## Veröffentlichung (später)

Echte App-Store-Builds über **EAS** (`eas build` / `eas submit`) – funktioniert
auch ohne Mac in der Cloud. Voraussetzung: Apple Developer Account.
