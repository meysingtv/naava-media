# Circle – Family Locator (Life360-Style)

Eine Expo-App in **einer Datei** (`App.js`): echte Karte, echter Standort,
Login/Registrierung und Familien-Mitglieder auf der Karte.

## 📱 Am schnellsten: direkt am Handy mit Expo Snack

1. Im Handy-Browser **snack.expo.dev** öffnen.
2. Links die Datei **App.js** antippen, kompletten Inhalt löschen.
3. Den Inhalt von `App.js` aus diesem Ordner **komplett einfügen**.
4. Snack fragt evtl., ob fehlende Pakete hinzugefügt werden sollen
   (`react-native-maps`, `expo-location`, `@react-native-async-storage/async-storage`)
   → **Ja / Add**.
5. Unten auf **„My Device"** (oder QR scannen) → wird in **Expo Go** geöffnet.
6. Beim Start **Standort erlauben** → Karte zeigt deine echte Position.

> Tipp iPhone: Karte ist Apple Maps (kein API-Key nötig). Läuft direkt in Expo Go.

## 💻 Alternativ am Computer

```bash
npx create-expo-app circle
cd circle
# App.js durch die Datei aus diesem Ordner ersetzen
npx expo install react-native-maps expo-location @react-native-async-storage/async-storage
npx expo start
```
Dann QR-Code mit der **Expo Go**-App scannen.

## Hinweis
Der Login ist eine **lokale Demo** (im Gerät gespeichert), und die
Familien-Mitglieder sind **Demo-Daten**, die sich leicht bewegen.
Für echtes Standort-Teilen zwischen mehreren Handys braucht es ein Backend
(z. B. Supabase Realtime) – das lässt sich später ergänzen.
