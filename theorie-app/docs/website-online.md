# Lern-Website online stellen (Subdomain bei Strato)

Ziel: Die Web-Fassung der App (Lernen am PC und die Verwaltung unter
`/manager`) läuft unter **https://lernen.fahrschulpro.de**. Die Hauptseite
fahrschulpro.de bleibt, wie sie ist.

## 1. Web-Fassung bauen (auf dem Mac)

```
cd ~/Documents/naava-media/theorie-app
git pull
npm run panel -- --neu
```

Danach liegt die fertige Website im Ordner `theorie-app/dist-web`. Das Panel,
das dabei startet, mit Ctrl + C beenden. Die `.env` muss im Ordner liegen –
die Werte darin (Supabase-Adresse und öffentlicher Schlüssel) sind für die
Website gedacht und dürfen öffentlich sein.

## 2. Subdomain bei Strato anlegen

1. strato.de → Login → dein Paket.
2. **Domains** → **Domainverwaltung** → bei fahrschulpro.de **Subdomain
   anlegen** → Name `lernen`.
3. Bei der neuen Subdomain einstellen, dass sie auf einen **Ordner im
   Webspace** zeigt, z. B. `/lernen` (Strato nennt das „Umleitung“ bzw.
   „Verweis auf Verzeichnis“).
4. **SSL** für `lernen.fahrschulpro.de` einschalten (im Bereich SSL bzw.
   Sicherheit, bei den meisten Paketen kostenlos).

Bis die Subdomain erreichbar ist, kann es ein paar Minuten bis Stunden dauern.

## 3. Dateien hochladen

1. Zugangsdaten für SFTP stehen bei Strato unter **Hosting** → **SFTP/SSH**
   (Host meist `ssh.strato.de`, Benutzer ist deine Domain bzw. die dort
   angezeigte Kennung).
2. Mit **FileZilla** (kostenlos) verbinden.
3. **Den Inhalt** von `dist-web` (nicht den Ordner selbst) in den Ordner aus
   Schritt 2.3 hochladen, also `index.html`, `_expo`, `assets`, `.htaccess` …

Wichtig: `.htaccess` ist eine versteckte Datei. Der Finder zeigt sie nicht an
(ein-/ausblenden mit Cmd + Shift + Punkt), FileZilla schon. Ohne sie geht
beim Neuladen einer Unterseite (z. B. `/manager`) „Seite nicht gefunden“.

## 4. Testen

- https://lernen.fahrschulpro.de → Lern-Website
- https://lernen.fahrschulpro.de/manager → Verwaltung (nur mit Inhaber-Konto)
- Eine Unterseite öffnen und neu laden – sie muss wieder erscheinen.

## Updates

Nach Änderungen am Code: Schritt 1 wiederholen und den Inhalt von `dist-web`
erneut hochladen (alte Dateien vorher im Ordner löschen).

## Gut zu wissen

- Die Verwaltung ist zwar unter `/manager` erreichbar, zeigt aber nur dem
  Inhaber etwas – geprüft wird auf dem Server, nicht im Browser.
- Impressum und Datenschutz sind in der Website eingebaut (`/impressum`,
  `/datenschutz`). Cookies für Werbung oder Tracking gibt es nicht, ein
  Cookie-Banner ist deshalb nicht nötig.
