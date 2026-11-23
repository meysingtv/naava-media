# Login einrichten: Code per E-Mail, Fahrlehrer

Kurz: SQL ausführen (Schritt 1 und `supabase/update-code-login.sql`,
Abschnitt 28), Gmail als Absender eintragen (Schritt 2), Code in die
Mail-Vorlagen (Schritt 3), Code-Länge prüfen (Schritt 4), neu bauen.

Anmelden und Registrieren laufen ohne Passwort: Man gibt die E-Mail ein,
bekommt einen 6-stelligen Code und tippt ihn in der App ein. Google und Apple
gibt es nicht mehr.

## 1. Datenbank aktualisieren

Im Supabase-SQL-Editor einmal `supabase/update-rollen-login.sql` ausführen
(steht auch als Abschnitt 13 in `schema.sql`). Danach gibt es:

- die Rolle **Fahrschüler / Fahrlehrer** im Profil,
- **Clips hochladen für alle Fahrlehrer** (zusätzlich zu dir und freigeschalteten Erstellern).

Beim Registrieren gehen Name, Benutzername, Rolle, Klasse usw. wie bisher als
Konto-Daten mit; der Trigger legt daraus das Profil an, sobald der Code stimmt.

## 2. Absender: deine Gmail-Adresse (SMTP) – Pflicht

Ohne eigenen Versand kommen die Mails von einer Supabase-Adresse – und
Supabase schickt dann nur sehr wenige Mails pro Stunde. So kommen die Codes
von deiner Adresse, z. B. **fahrschulpro@gmail.com**, mit dem Namen
„Fahrschul Pro“:

1. **Zwei-Faktor-Schutz im Google-Konto einschalten** (nötig für Schritt 2):
   myaccount.google.com → Sicherheit → Bestätigung in zwei Schritten.
2. **App-Passwort anlegen:** myaccount.google.com/apppasswords → Name z. B.
   „Supabase“ → Erstellen. Das 16-stellige Passwort kopieren (wird nur einmal
   gezeigt). Es ist **nicht** dein normales Google-Passwort.
3. **In Supabase eintragen:** Authentication → Emails → **SMTP Settings** →
   „Enable custom SMTP“:

   | Feld | Wert |
   |---|---|
   | Sender email | `fahrschulpro@gmail.com` (deine Gmail-Adresse) |
   | Sender name | `Fahrschul Pro` |
   | Host | `smtp.gmail.com` |
   | Port | `465` (falls es nicht klappt: `587`) |
   | Username | `fahrschulpro@gmail.com` |
   | Password | das App-Passwort aus Schritt 2 (ohne Leerzeichen) |

4. Authentication → **Rate Limits** → „Emails sent per hour“ hochsetzen,
   z. B. auf 100.
5. Testen: In der App „Anmelden“ → eigene Adresse → Code senden. Die Mail
   muss von „Fahrschul Pro <fahrschulpro@gmail.com>“ kommen.

**Grenzen:** Ein normales Gmail-Konto schafft rund 500 Mails am Tag – für den
Anfang reicht das gut. Wird es mehr, lohnt sich eine eigene Domain (z. B.
`noreply@fahrschulpro.de`) über Resend oder Brevo. Wichtig: Eine
`@gmail.com`-Adresse als Absender funktioniert nur über Googles eigenen
Server wie oben. Über andere Anbieter landen solche Mails im Spam oder werden
abgelehnt.

Das App-Passwort gehört nur in die Supabase-Einstellungen – nie in den Code
oder in eine Datei im Projekt.

## 3. Code in die E-Mail schreiben

Supabase → Authentication → **Emails** → Reiter **Templates**. Fertige
Vorlagen im Design der App (Orange) liegen in `supabase/mail-vorlagen/`:

| Vorlage in Supabase | Datei | Betreff |
|---|---|---|
| **Magic Link** (Anmelden) | `code-anmelden.html` | `Dein Code: {{ .Token }}` |
| **Confirm sign up** (Registrieren) | `code-registrieren.html` | `Dein Code: {{ .Token }}` |

Datei öffnen (z. B. mit TextEdit), alles kopieren, in Supabase den alten
Inhalt im Feld „Message body“ löschen, einfügen, Betreff eintragen, **Save**.
`{{ .Token }}` ersetzt Supabase durch den Code. Den Code im Betreff sieht man
schon in der Mitteilung, und iOS schlägt ihn über der Tastatur vor.

Impressum und Datenschutz in der Fußzeile verlinken auf
`lernen.fahrschulpro.de` – die Links gehen, sobald die Website online ist
(`docs/website-online.md`).

## 4. Code-Länge und Gültigkeit

Supabase → Authentication → Providers → **Email**:

- **Email OTP Length**: `6` (muss zu `CODE_LAENGE` in `src/lib/konto.tsx` passen)
- **Email OTP Expiration**: `3600` Sekunden (die App sagt „gilt eine Stunde“)
- „Confirm email“ darf an oder aus sein – mit dem Code gilt die Adresse als bestätigt.

Google und Apple unter Authentication → Providers kannst du ausschalten.

## 5. Neuer Build

Die App braucht einen neuen Build, weil `expo-apple-authentication` und
`expo-web-browser` rausgeflogen sind (und die Fähigkeit „Sign in with Apple“).

## Gut zu wissen

- **Anmelden** schickt nur an Adressen, zu denen es schon ein Konto gibt –
  sonst kommt „Zu dieser E-Mail gibt es noch kein Konto“.
- **Registrieren** mit einer Adresse, die es schon gibt, meldet einfach im
  vorhandenen Konto an; die neuen Angaben werden dann nicht übernommen.
- Anmelden mit Benutzername geht nicht mehr – der Code geht immer an die E-Mail.
- Bestehende Konten (auch frühere Google-/Apple-Konten und im Manager angelegte
  Zugänge) melden sich einfach mit ihrer E-Mail und dem Code an.
- „Code erneut senden“ geht nach 60 Sekunden wieder (Supabase-Grenze pro Adresse).
- Wer sich als „Fahrlehrer“ einträgt, kann erst Clips hochladen, wenn du ihn in
  der Verwaltung unter **Freigaben** bestätigt hast (`supabase/update-verwaltung.sql`).
- Telefonnummer, Nachname und Geburtsdatum liegen nur im Konto (nicht im
  öffentlichen Profil der Rangliste).
