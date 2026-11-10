# Sicherheit

## Einmal ausführen

Im Supabase-SQL-Editor `supabase/update-sicherheit.sql` ausführen (steht auch
als Abschnitt 14 in `schema.sql`). Mehrfaches Ausführen ist unschädlich.

## Was geschützt ist

**Server (Datenbank)**

- Ohne Konto sind nur noch Clips, Kommentare und Profile ansehen, „Benutzername
  frei?“ und „Anmelden mit Benutzername“ erlaubt. Vorher konnte man fast jede
  Funktion ohne Anmeldung aufrufen (Supabase erlaubt das standardmäßig).
- Punkte (XP) je Aufruf und je Tag gedeckelt (höchstens 5000 XP und 2000 Fragen
  am Tag) – Punkte-Farmen per Dauerschleife bringt nichts mehr. Die Serie kann
  nicht länger sein, als es das Konto gibt.
- Duelle: nur gültige Fragen, höchstens 60 Duelle am Tag. Ein Ergebnis, das
  schneller kommt, als man die Fragen lesen kann, zählt 0 Punkte. Freundes-Codes
  durchprobieren ist nach 30 Versuchen in 10 Minuten gesperrt.
- Mengenbremse gegen Spam: Likes und Reaktionen (600/Std.), Folgen (300/Std.),
  Kommentare (10/Min., 300/Tag), Teilen (60/Std.), Meldungen (30/Tag),
  Clips (20/Tag), Benutzername ändern (10/Tag), Rolle wechseln (20/Tag).
- Eingaben geprüft: Name höchstens 40 Zeichen, Klasse, Farbe und Bundesland nur
  gültige Werte, Lernstand höchstens 5 MB. Punkte, Elo und Rolle lassen sich
  nicht direkt ändern, nur über die Funktionen mit ihren Regeln.
- Speicher: höchstens 10 Profilbilder und 400 Clip-Dateien je Konto, jeder nur
  im eigenen Ordner.

- Crew (Abschnitt 16): Tabellen nur über Funktionen erreichbar. Beitreten
  per Code höchstens 10 Versuche in 10 Minuten, Gründen 5/Tag, Einladungen
  20/Tag, Anstupsen je Person höchstens alle 3 Stunden. Boss-Treffer höchstens
  30 Antworten je Aufruf und 200 am Tag. Crew-Mitglieder sehen voneinander nur
  Name, Profilbild, heutige Fragenzahl und Tagesziel. Die internen Hilfen
  (Push senden, Mitglied aufnehmen) liegen im Schema `lern_intern`, das die App
  nicht erreicht.

**App**

- Anmelde-Links (Google, Apple im Browser, Bestätigung, Passwort vergessen)
  nutzen PKCE: Im Link steht nur ein Einmal-Code, der ausschließlich mit einem
  Geheimnis auf dem eigenen Handy einlösbar ist. Abgefangene oder von fremden
  Apps/Webseiten untergeschobene Links melden niemanden an.
  Folge: Den Link aus „Passwort vergessen“ auf dem Handy öffnen, auf dem er
  angefordert wurde.
- Die Anmeldung liegt verschlüsselt im Schlüsselbund (iPhone) bzw. Keystore
  (Android), nicht mehr im normalen App-Speicher.
- „Mit Apple anmelden“ auf dem iPhone mit Einmalwert (Nonce) gegen
  wiederverwendete Anmeldungen.
- Android: kein Backup der App-Daten, unnötige Rechte gesperrt, keine Seite von
  außen startbar.
- Im Code steht nur der öffentliche Supabase-Schlüssel (anon key). Den
  `service_role`-Schlüssel niemals in die App oder ins Repository.

## In Supabase prüfen

- Authentication → Sign In / Providers → Email: **Confirm email aus**
  (Anmelden ohne Bestätigungs-Mail), Mindestlänge Passwort 8. Konten mit
  E-Mail + Passwort tragen dann „email_ungeprueft“ (Abschnitt 15 in
  `schema.sql`) und bekommen keine Inhaber-Rechte über die Adresse – außer mit
  Google/Apple-Anmeldung.
- Authentication → URL Configuration → Redirect URLs: nur `spur://**`
  (und `exp://**` zum Testen mit Expo Go).
- Authentication → Rate Limits: Standardwerte lassen (begrenzen Anmeldeversuche
  und Mails).
- Falls verfügbar: Authentication → „Leaked password protection“ einschalten.

## Was bleibt

- Wer sich als Fahrlehrer einträgt, darf Clips hochladen – das wird nicht
  geprüft. Unpassende Clips kannst du als Inhaber löschen; Meldungen siehst du
  in der Tabelle `lern_clip_meldung`.
- Alle Fragen und Antworten stecken in der App. Wer sich viel Mühe macht, kann
  in Duellen also immer noch mogeln – die Grenzen oben machen es aber
  aufwendig und begrenzen den Schaden.
