# Android-App

Die App ist mit Expo gebaut – iPhone und Android kommen aus demselben Code.
Design und Funktionen sind auf Android gleich wie auf dem iPhone. Unterschiede
gibt es nur da, wo Android etwas nicht hat oder anders macht:

| Was | iPhone | Android |
| --- | --- | --- |
| Tab-Leiste unten | native Liquid-Glass-Leiste | nachgebautes Liquid Glass: schwebende Kapsel mit echter Unschärfe, Lichtkante und Glasblase; Finger drauf macht die Blase zur Lupe, die dem Finger folgt; beim Runterscrollen klappt sie zur kleinen Kapsel zusammen |
| Symbole | Apple-Symbole (SF Symbols) | Ionicons (sehen fast gleich aus) |
| Schrift | San Francisco | Inter |
| Leuchten/Schatten | iOS-Schatten | boxShadow (gleiche Werte) |
| Menü „Mehr“ bei Clips | natives Apple-Menü | eigenes Menü von unten im gleichen Stil |
| Mit Apple anmelden | Apple-Fenster auf dem iPhone | über die Apple-Seite im Browser (Einrichtung siehe unten) |
| Zurück | Wischen vom Rand | Zurück-Taste/-Geste – bei Training, Prüfung und Duell mit Rückfrage wie der Schließen-Knopf |

## Auf einem Android-Handy testen

**Schnell (Expo Go):** Expo Go aus dem Play Store installieren, im Projekt
`npx expo start` und den QR-Code mit Expo Go scannen.

**Echte App (APK zum Installieren):**

```
cd theorie-app
npx eas-cli login
npx eas-cli init          # einmalig, verknüpft das Projekt mit deinem Expo-Konto
npx eas-cli build -p android --profile preview
```

Am Ende gibt es einen Link zur APK – auf dem Handy öffnen und installieren.
Die Server-Daten (`EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
müssen dafür bei Expo unter Project → Environment variables stehen.

## Im Play Store veröffentlichen

1. Google-Play-Entwicklerkonto anlegen (einmalig 25 $): https://play.google.com/console
2. `npx eas-cli build -p android --profile production` – erzeugt das App-Bundle (AAB).
3. In der Play Console eine App anlegen (Name „Fahrschule Pro“), Store-Eintrag,
   Datenschutzerklärung und den Fragebogen „Datensicherheit“ ausfüllen.
4. Bundle hochladen (oder `npx eas-cli submit -p android`), zuerst in den
   internen Test, dann in die Produktion.

## Mit Apple anmelden auf Android

Auf Android läuft die Apple-Anmeldung über den Browser. Dafür braucht Supabase
zusätzlich die Web-Variante:

1. Apple Developer → Identifiers → **Services ID** anlegen (z. B. `de.spur.theorie.web`),
   „Sign in with Apple“ aktivieren, als Return-URL
   `https://<dein-projekt>.supabase.co/auth/v1/callback` eintragen.
2. Apple Developer → Keys → Schlüssel mit „Sign in with Apple“ anlegen und herunterladen.
3. Supabase → Authentication → Providers → Apple: Services ID bei **Client IDs**
   zusätzlich eintragen (Komma-getrennt nach `de.spur.theorie`) und das
   **Secret** aus dem Schlüssel erzeugen (Supabase hat dafür ein Werkzeug in der Doku).
   Das Secret läuft nach 6 Monaten ab und muss dann erneuert werden.

Ohne diese Einrichtung zeigt der Apple-Knopf auf Android „Diese Anmeldung ist
auf dem Server noch nicht eingeschaltet“.

## Rechte der Android-App

Kamera (Schilder-Jagd), Mitteilungen (Lern-Erinnerung), Internet. Nicht
enthalten bzw. gesperrt: Mikrofon, „Über anderen Apps einblenden“, Speicher
schreiben. Die App ist vom Android-Backup ausgenommen, und keine Seite der App
lässt sich von fremden Apps direkt starten (außer dem normalen Start und den
Anmelde-Links).
