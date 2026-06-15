# FahrschulApp – iPad-App

Eigenständige iPad-App (Expo/React Native), **getrennt** von der Handy-App
(`../mobile`). Gleiche Supabase-Datenbank/Anmeldung, aber **Website-Layout**:
feste Sidebar links + Inhalt rechts (statt unterer Tableiste).

## Einrichten

```bash
cd ipad
npm install
```

`.env` anlegen (gleiche Werte wie bei der Handy-App / Website):

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Starten

```bash
npm run ios     # iPad-Simulator
# oder
npm start       # QR-Code, dann auf einem echten iPad in Expo Go öffnen
```

## Stand

- ✅ Sidebar-Navigation im Website-Stil (Dashboard, Schüler, Terminplaner,
  Theorie, Rechnungen, Benutzer, Fahrzeuge, Einstellungen) + Abmelden.
- ✅ Login, Dashboard, Schüler, Terminplaner, Benutzer (Team), Fahrzeuge
  laufen (aus der bestehenden App übernommen).
- 🚧 Theorie & Rechnungen sind Platzhalter – kommen als Nächstes.
