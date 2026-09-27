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
4. Authentication → Sign In / Providers → Email → „Confirm email“ **anlassen**:
   Nur wer seine E-Mail bestätigt, bekommt Sonderrechte (z. B. als Inhaber).

## Clips (Videos wie bei TikTok)

Der Reiter „Clips“ zeigt kurze Videos: oben „Entdecken“ und „Folge ich“,
rechts Gefällt mir, Kommentare, Teilen und Mehr, oben rechts Ton an/aus.
Ansehen geht für alle, Liken, Kommentieren und Folgen mit Konto.

- `supabase/schema.sql` (Abschnitt 10) legt Tabellen, Rechte und den Speicher
  `lern-clips` an. Das Skript einfach erneut ausführen – es ist wiederholbar.
- Inhaber ist, wer mit einer E-Mail aus der Tabelle `lern_inhaber` angemeldet
  ist (bestätigt). Eingetragen ist `leon.scheulen@gmail.com`. Mit dieser
  E-Mail registrieren, E-Mail bestätigen, anmelden – dann erscheint im
  Clips-Reiter oben links das „+“ zum Hochladen.
- Andere freischalten: Einstellungen → Clips → „Clip-Ersteller verwalten“,
  Benutzername oder E-Mail eingeben.
- Videos werden beim Auswählen auf 720p (H.264) verkleinert. Im kostenlosen
  Supabase-Tarif sind höchstens 50 MB je Datei erlaubt.

## Fragen

`src/lib/fragen.ts` enthält selbst formulierte Beispielfragen. Der amtliche
Fragenkatalog (mit Bildern und Videos) ist lizenzpflichtig
(TÜV | DEKRA arge tp 21) und kann später im selben Format eingespielt werden.
