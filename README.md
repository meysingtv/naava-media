# FahrschulApp

Moderne Web-App zur Verwaltung von Fahrschulen in Deutschland – Schüler,
Kalender, Rechnungen und Team an einem Ort. Schneller, übersichtlicher und
günstiger als bestehende Lösungen.

## Tech-Stack

- **Framework:** Next.js 14 (App Router) · TypeScript
- **Styling:** Tailwind CSS · shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security)
- **Deployment:** Vercel

## Schnellstart

### 1. Abhängigkeiten installieren

```bash
npm install
```

### 2. Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) ein neues Projekt erstellen.
2. Im **SQL Editor** den Inhalt von `supabase/migrations/0001_init.sql`
   ausführen. Damit werden alle Tabellen, Enums, Funktionen und die
   Row-Level-Security-Policies angelegt.
3. Unter **Project Settings → API** die Projekt-URL und den `anon`-Key kopieren.

> Details siehe [`supabase/README.md`](./supabase/README.md).

### 3. Umgebungsvariablen setzen

`.env.example` nach `.env.local` kopieren und ausfüllen:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Entwicklungsserver starten

```bash
npm run dev
```

→ [http://localhost:3000](http://localhost:3000)

## Onboarding-Flow

`Registrieren` → (E-Mail bestätigen) → `Anmelden` → `Fahrschule einrichten`
(Firmen-Setup, der Ersteller wird automatisch **Chef**) → `Dashboard`.

## Funktionen (Phase 1)

| Bereich          | Status | Umfang                                                                 |
| ---------------- | :----: | ---------------------------------------------------------------------- |
| Auth & Onboarding |   ✅   | Registrierung, Login, Passwort vergessen/zurücksetzen, Firmen-Setup    |
| Rollen            |   ✅   | Chef / Fahrlehrer / Büro (Navigation & Zugriff rollenabhängig)         |
| Dashboard         |   ✅   | Heutige Fahrstunden, offene Rechnungen, Prüfungen, Auslastung          |
| Schüler           |   ✅   | Liste + Suche/Filter, Anlegen/Bearbeiten, Detail mit Prüfungsreife     |
| Terminplaner      |   ✅   | Zeitraster (Tag/3 Tage/Woche) wie in der App, Klick-zum-Anlegen, bearbeiten/verschieben, Status, Fahrzeug-Konflikt |
| Theorie           |   ✅   | Theoriestunden planen, Anwesenheit abhaken, Theorie-Fortschritt je Schüler |
| Rechnungen        |   ✅   | Erstellen (Positionen, MwSt.), Liste, **PDF-Download** + Druckansicht   |
| Fahrlehrer        |   ✅   | Team-Liste, anlegen, **Einladung per E-Mail**, Rolle zuweisen, deaktivieren |
| Fahrzeuge         |   ✅   | Flotte verwalten, aktiv/inaktiv                                        |
| Einstellungen     |   ✅   | Firmenprofil (Stammdaten, Kontakt, Rechnungsdaten)                     |

> **Hinweis zur Fahrlehrer-Einladung:** Der E-Mail-Versand nutzt die Supabase
> Admin-API und benötigt `SUPABASE_SERVICE_ROLE_KEY` (server-seitig) sowie einen
> in Supabase konfigurierten E-Mail-Versand. Ohne Key funktioniert das Anlegen
> im Team weiterhin – nur ohne automatische Einladungs-Mail.

**Noch offen / nächste Schritte:**

- Kalender-Sync (universelles iCal-Abo, danach Exchange/Microsoft-Graph)
- DATEV-Export (CSV)
- E-Mail-Benachrichtigungen, Schüler-Portal
- Mobile-App (Expo / React Native, iOS)

## Projektstruktur

```
app/
  (dashboard)/        # Geschützter Bereich mit Sidebar-Navigation
    dashboard/        # Hauptübersicht
    schueler/         # Liste, Detail, Anlegen/Bearbeiten
    kalender/         # Wochenkalender
    rechnungen/       # Liste, Erstellen, Detail (Druck)
    fahrlehrer/       # Team-Verwaltung
    fahrzeuge/        # Flotte
    einstellungen/    # Firmenprofil
  auth/               # login, registrieren, setup, passwort-*
components/
  ui/                 # shadcn/ui-Komponenten
  shared/             # Eigene wiederverwendbare Komponenten
lib/
  supabase/           # Browser-/Server-Clients, Middleware, Queries
  types.ts            # TypeScript-Typen aller Modelle
  constants.ts        # Klassen, Pflichtfahrten, Rollen, Farben
supabase/
  migrations/         # SQL-Schema inkl. Row Level Security
```

## Hinweise

- **Sicherheit:** Jede Fahrschule sieht ausschließlich ihre eigenen Daten –
  durchgesetzt per Row Level Security in der Datenbank (nicht nur im Frontend).
- **Typsicherheit:** Die Query-Ergebnisse werden über Domänen-Typen abgesichert.
  Volle End-to-End-Typisierung lässt sich später mit
  `supabase gen types typescript` erzeugen und in `lib/types.ts` einsetzen.

## Marketing-Website (Startseite)

Die öffentliche Website liegt im selben Projekt: Routen unter `app/(marketing)/`
(`/`, `/funktionen`, `/ueber-uns`, `/demo`, `/kontakt`, `/impressum`,
`/datenschutz`, `/agb`), Komponenten unter `components/marketing/`, Fotos und
App-Screenshots unter `public/images/`. Das Demo-Formular sendet an
`app/api/demo` (Validierung, Rate-Limit, Mail-Versand über `lib/marketing/`;
ohne `RESEND_API_KEY` landet die Anfrage im Server-Log).

Kurz-URLs: `/login` → Anmeldung, `/register` → Registrierung. Wer angemeldet
ist, sieht im Website-Kopf „Zum Dashboard" statt „Login".

Die Marketing-Tokens (Farben `brand`, `orange`, `ink`, `paper` …, Schriften
`font-mk`/`font-display`) sind in `tailwind.config.ts` markiert. Die Fotos
stammen von Pexels (kostenlos, auch kommerziell) und lassen sich unter
denselben Dateinamen durch eigene ersetzen; die App-Screenshots sind echte
Aufnahmen der Software mit Beispieldaten.
