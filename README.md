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
| Kalender          |   ✅   | Wochenansicht, Fahrstunde anlegen, Fahrzeug-Konflikterkennung          |
| Rechnungen        |   ✅   | Erstellen (Positionen, MwSt.), Liste, druckbare Ansicht (PDF via Druck)|
| Fahrlehrer        |   ✅   | Team-Liste, Mitarbeiter anlegen, Rolle zuweisen, deaktivieren          |
| Fahrzeuge         |   ✅   | Flotte verwalten, aktiv/inaktiv                                        |
| Einstellungen     |   ✅   | Firmenprofil (Stammdaten, Kontakt, Rechnungsdaten)                     |

**Noch offen / nächste Schritte:**

- E-Mail-Einladung für Fahrlehrer (benötigt Supabase Service-Role + SMTP)
- Echte PDF-Generierung & DATEV-Export (CSV)
- Instruktor-Spalten im Kalender mit Zeitraster (Slot-Klick)
- E-Mail-Benachrichtigungen, Schüler-Portal, Mobile-App

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
