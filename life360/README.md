# Circle – Family Locator (Life360-Style)

Expo-App mit **echter Apple-Karte** (`react-native-maps`) und **echtem GPS**
(`expo-location`). Vier Tabs (Karte / Familie / Orte / Profil), flüssig
bewegende Familie, Routen-Spur, Mitglieder-Details, Zonen, Einstellungen.

Projekt ist auf **Expo SDK 54** ausgelegt.

## 🍎 Auf dem MacBook im iOS-Simulator starten

Voraussetzung: **Xcode** (App Store) + **Node.js**. Wichtig: in einem
**neuen, leeren Ordner** arbeiten (nicht im bestehenden naava-media).

```bash
cd ~/Desktop
git clone https://github.com/meysingtv/naava-media.git circle-app
cd circle-app
git checkout claude/busy-franklin-j35abf
cd life360
npm install
npx expo install --fix
npx expo start
```

Dann im laufenden Expo-Terminal die Taste **i** drücken → iOS-Simulator öffnet sich.

> Standort im Simulator setzen: Simulator-Menü **Features → Location → Apple**.

## Falls `npm install` meckert (Peer-Konflikte)
```bash
npm install --legacy-peer-deps
npx expo install --fix
npx expo start
```

## Bulletproof-Variante (frisches Projekt, nur App.js übernehmen)
```bash
cd ~/Desktop
npx create-expo-app@latest circle --template blank
cd circle
npx expo install react-native-maps expo-location
# App.js aus life360/ in dieses Projekt kopieren, dann:
npx expo start
```

## Hinweis
Login & Familie sind **Demo**. Für echtes Standort-Teilen zwischen mehreren
Geräten braucht es ein Backend (z. B. Supabase Realtime).
