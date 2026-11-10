# Supabase – Datenbank-Setup

## Schema anwenden

### Variante A: SQL Editor (empfohlen für den Start)

1. Supabase-Projekt öffnen → **SQL Editor** → **New query**.
2. Inhalt von `migrations/0001_init.sql` einfügen und ausführen (**Run**).

Damit werden angelegt:

- Alle Tabellen (`fahrschule`, `fahrlehrer`, `fahrschueler`,
  `schueler_fortschritt`, `fahrzeug`, `fahrstunde`, `rechnung`,
  `rechnung_position`, `theoriestunde`, `theorie_teilnahme`)
- Enums für Rollen, Fahrstunden-Typ/-Status und Rechnungsstatus
- **Row Level Security** auf allen Tabellen
- Hilfsfunktionen `current_fahrschule_id()`, `current_rolle()`
- Onboarding-Funktion `setup_fahrschule(...)`

### Variante B: Supabase CLI

```bash
supabase link --project-ref <dein-ref>
supabase db push
```

## Sicherheitskonzept (RLS)

Die Zugehörigkeit eines Nutzers zu einer Fahrschule wird über die Tabelle
`fahrlehrer` (Spalte `user_id` → `auth.users.id`) abgebildet.

`current_fahrschule_id()` liefert per `SECURITY DEFINER` die Fahrschul-ID des
angemeldeten Nutzers, ohne RLS-Rekursion auszulösen. Alle Policies prüfen
`fahrschule_id = current_fahrschule_id()`, sodass jede Fahrschule strikt nur
ihre eigenen Daten sieht. Kindtabellen (z. B. `rechnung_position`) sind über
ihren Eltern-Datensatz abgesichert.

Das Anlegen einer Fahrschule erfolgt ausschließlich über
`setup_fahrschule(...)` (ebenfalls `SECURITY DEFINER`), die Fahrschule **und**
zugehörigen Chef-Datensatz atomar erstellt.

## E-Mail-Einstellungen

Für Bestätigungs-/Reset-Links unter **Authentication → URL Configuration** die
**Site URL** auf die Deployment-Domain setzen (lokal `http://localhost:3000`)
und `/auth/callback` als Redirect erlauben.

Wenn keine E-Mail-Bestätigung gewünscht ist, kann sie unter
**Authentication → Providers → Email** deaktiviert werden – dann wird nach der
Registrierung sofort eine Session erstellt und direkt zum Firmen-Setup geleitet.
