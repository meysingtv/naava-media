# FahrschulApp – iPad-App

Eigenständige iPad-App (Expo), **getrennt** von der Handy-App (`../mobile`).

Diese App ist **1:1 die Website** – sie zeigt die echte Web-App (gleicher Code,
gleiches Design, alle Tabs, alle Funktionen) in einer nativen App-Hülle
(WebView). So ist sie garantiert identisch zur Website.

## Einrichten

```bash
cd ipad
npm install
```

Falls `npm install` über die WebView-Version meckert:

```bash
npx expo install react-native-webview
```

### Welche Website wird geladen?

Standard ist `http://192.168.178.78:3000` (dein Mac im LAN). Zum Ändern in
`ipad/.env`:

```
EXPO_PUBLIC_SITE_URL=http://192.168.178.78:3000
```

(Später, wenn die Website online/deployt ist, hier einfach die `https://…`-Domain
eintragen.)

## Starten

1. **Website muss laufen & erreichbar sein.** Im Hauptordner:
   ```bash
   npm run dev:netz
   ```
   (bindet an 0.0.0.0, damit das iPad im selben WLAN sie unter der IP erreicht)
2. iPad-App starten:
   ```bash
   cd ipad
   npx expo start
   ```
   Dann `shift` + `i` drücken und ein **iPad** auswählen.

## Hinweis

Lokal über `http://` funktioniert das Laden in **Expo Go**. Für einen echten
App-Store-Build sollte die Website über **HTTPS** laufen (Domain eintragen).
