# Circle – Family Locator (Life360-Style)

Eine Expo-App in **einer Datei** (`App.js`): echte Karte (OpenStreetMap),
echter Standort, Login/Registrierung und Familien-Mitglieder auf der Karte.

Die Karte läuft über eine **WebView + Leaflet** (statt `react-native-maps`),
weil das in Expo Go / Expo Snack deutlich zuverlässiger ist.

## 📱 Am schnellsten: direkt am Handy mit Expo Snack

1. Im Handy-Browser **snack.expo.dev** öffnen.
2. Links die Datei **App.js** antippen, kompletten Inhalt löschen.
3. Inhalt von `App.js` aus diesem Ordner **komplett einfügen**.
4. Snack fragt, ob fehlende Pakete hinzugefügt werden sollen
   (`react-native-webview`, `expo-location`) → **Add / Ja**.
5. Unten **„My Device"** (oder QR scannen) → öffnet sich in **Expo Go**.
6. Beim Start **Standort erlauben** → Karte zeigt deine echte Position.

## 💻 Alternativ am Computer

```bash
npx create-expo-app circle
cd circle
# App.js durch die Datei aus diesem Ordner ersetzen
npx expo install react-native-webview expo-location
npx expo start
```

## Hinweis
Login & Familien-Mitglieder sind **Demo** (auf einem Gerät). Für echtes
Standort-Teilen zwischen mehreren Handys braucht es ein Backend
(z. B. Supabase Realtime) – lässt sich später ergänzen.
