# Spur – Theorie-App

Eigenständige iOS-App zum Lernen der Führerschein-Theorie in Schwarz und
Orange mit Fotokarten: Home mit Tagesziel und Schnellstart, Kategorien mit
Favoriten und schwierigen Fragen, Fragen in der Fahrersicht, Training mit
Lernfächern, Prüfungssimulation mit Fehlerpunkten, „Mein Fortschritt“ mit
Lernzeit sowie Stärken und Schwächen, Clips (animierte Kurz-Erklärungen),
Online-Duelle (Rangliste mit Elo und Freundes-Code), Wochen-Liga für
Deutschland und je Bundesland, Serien-Schutz, Abzeichen.

Die Fotos stehen unter freien Lizenzen (CC0, Public Domain, CC BY, CC BY-SA);
die Nachweise sind in `src/lib/fotos.ts` und in der App unter
Einstellungen → Bildnachweise.

## Starten

```
cd theorie-app
npm install
npx expo run:ios
```

Ohne Server läuft die App im Gastmodus – der Lernstand bleibt auf dem Gerät.

## Server (Registrierung, Liga, Sicherung)

1. Neues Supabase-Projekt anlegen (am besten getrennt von der Fahrschul-Software).
2. Im SQL-Editor `supabase/schema.sql` ausführen (bei Updates einfach erneut –
   das Skript ist wiederholbar).
3. `.env.example` nach `.env` kopieren und URL + anon key eintragen.
4. Optional: Authentication → Sign In / Providers → Email → „Confirm email“
   ausschalten, dann sind neue Konten sofort aktiv.

## Fragen

`src/lib/fragen.ts` enthält selbst formulierte Beispielfragen. Der amtliche
Fragenkatalog (mit Bildern und Videos) ist lizenzpflichtig
(TÜV | DEKRA arge tp 21) und kann später im selben Format eingespielt werden.
