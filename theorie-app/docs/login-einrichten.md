# Login einrichten: Code per E-Mail, Fahrlehrer

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

## 2. E-Mail-Anbieter (SMTP) eintragen – Pflicht

Supabase schickt mit dem eingebauten Versand nur sehr wenige Mails pro Stunde
und nur an Adressen aus deinem Supabase-Team. Für echte Nutzer:

Supabase → Authentication → **SMTP Settings** → eigenen Anbieter eintragen
(z. B. Resend, Brevo, Postmark). Danach unter Authentication → **Rate Limits**
„Emails sent per hour“ hochsetzen.

## 3. Code in die E-Mail schreiben

Supabase → Authentication → **Email Templates**. In **Magic Link** und
**Confirm signup** den Link durch den Code ersetzen, z. B.:

```html
<h2>Dein Code für Fahrschul Pro</h2>
<p>Gib diesen Code in der App ein:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>Der Code gilt eine Stunde. Hast du ihn nicht angefordert, ignoriere diese Mail.</p>
```

Betreff z. B. „Dein Code: {{ .Token }}“ – dann sieht man ihn schon in der
Mitteilung, und iOS schlägt ihn über der Tastatur vor.

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
- Jeder kann sich als „Fahrlehrer“ eintragen – eine Prüfung gibt es noch nicht.
- Telefonnummer, Nachname und Geburtsdatum liegen nur im Konto (nicht im
  öffentlichen Profil der Rangliste).
