# Login einrichten: Benutzername, Google, Apple, Fahrlehrer

## 1. Datenbank aktualisieren

Im Supabase-SQL-Editor einmal `supabase/update-rollen-login.sql` ausführen
(steht auch als Abschnitt 13 in `schema.sql`). Danach gibt es:

- die Rolle **Fahrschüler / Fahrlehrer** im Profil,
- **Clips hochladen für alle Fahrlehrer** (zusätzlich zu dir und freigeschalteten Erstellern),
- **Anmelden mit Benutzername**: Die App bekommt die E-Mail nur, wenn das Passwort
  stimmt; nach 10 Fehlversuchen in 15 Minuten ist der Benutzername kurz gesperrt.

## 2. Weiterleitungen

Supabase → Authentication → URL Configuration → Redirect URLs:

- `spur://**` (App)
- `exp://**` (nur falls du mit Expo Go testest)

## 3. Mit Google anmelden

1. Google Cloud Console → APIs & Dienste → Anmeldedaten → **OAuth-Client-ID**,
   Typ **Webanwendung**.
2. Autorisierte Weiterleitungs-URI: `https://<dein-projekt>.supabase.co/auth/v1/callback`
3. Client-ID und Client-Secret in Supabase → Authentication → Providers → **Google**
   eintragen und einschalten.

## 4. Mit Apple anmelden (iPhone)

1. Apple Developer → Identifiers → App-ID `de.spur.theorie` → **Sign in with Apple** aktivieren.
2. Supabase → Authentication → Providers → **Apple** einschalten und bei
   **Client IDs** `de.spur.theorie` eintragen.

## 4b. Mit Apple anmelden auf Android

Siehe `docs/android.md` → „Mit Apple anmelden auf Android“ (Services ID und Secret).

## 5. Neuer Build

Die App braucht einen neuen Build (EAS), weil zwei native Module dazugekommen sind
(`expo-apple-authentication`, `expo-web-browser`) und die Apple-Anmeldung als
Fähigkeit in der App stehen muss.

## Gut zu wissen

- Anmelde-Links laufen über PKCE (Einmal-Code): Den Link aus „Passwort
  vergessen“ bitte auf dem Handy öffnen, auf dem er angefordert wurde.
  Die Bestätigungs-Mail bestätigt die Adresse auch auf einem anderen Gerät –
  danach einfach anmelden.

- Jeder kann sich als „Fahrlehrer“ eintragen – eine Prüfung gibt es noch nicht.
  Clips kannst du als Inhaber weiterhin löschen.
- Telefonnummer, Nachname und Geburtsdatum liegen nur im Konto (nicht im
  öffentlichen Profil der Rangliste).
