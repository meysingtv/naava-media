# Circle – Family Locator (Life360-Style)

Expo-App mit **echter Apple-Karte** (`react-native-maps`) und **echtem GPS**
(`expo-location`). Vier Tabs (Karte / Familie / Orte / Profil), flüssig
bewegende Familie, Routen-Spur, Mitglieder-Details, Zonen, Einstellungen.

## 🍎 Auf dem MacBook im iOS-Simulator starten

Voraussetzung: **Xcode** (aus dem App Store) + **Node.js** installiert.

```bash
# 1. Repo holen (falls noch nicht da)
git clone https://github.com/meysingtv/naava-media.git
cd naava-media/life360

# 2. Pakete installieren
npm install

# 3. Versionen passend zum Expo-SDK ausrichten (wichtig!)
npx expo install react-native-maps expo-location

# 4. Starten
npx expo start
# Im Terminal "i" drücken  →  iOS-Simulator öffnet sich und lädt die App
```

> Standort im Simulator setzen: im Simulator-Menü **Features → Location →
> Apple** (oder „Custom…"), dann zeigt die Karte deinen „Standort".

### Voll-nativer Build (optional, mit Xcode)
```bash
npx expo run:ios
```
Baut die App mit Xcode und startet sie im Simulator (dauert beim ersten Mal länger).

## Wenn `npm install` zickt
Frisches Projekt erzeugen und nur `App.js` ersetzen:
```bash
npx create-expo-app@latest circle --template blank
cd circle
npx expo install react-native-maps expo-location
# App.js aus diesem Ordner nach circle/App.js kopieren
npx expo start   # dann "i"
```

## Hinweis
Login & Familie sind **Demo** (auf einem Gerät). Für echtes Standort-Teilen
zwischen mehreren Geräten braucht es ein Backend (z. B. Supabase Realtime).
