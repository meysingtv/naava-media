# Rechtlicher Stand der App

Stand: 6. November 2026. Notizen für später. Das ist keine Rechtsberatung, die
Prozentzahlen sind grobe Schätzungen und keine Statistik.

## Einschätzung

- **Wenn alle offenen Punkte unten erledigt sind:** etwa 95 %, dass es im
  ersten Jahr keinen Ärger gibt (keine Abmahnung, kein Bußgeld, keine Sperre im
  Store).
- **Die restlichen ~5 %** verhindert kein Text: Ein Nutzer lädt etwas
  Illegales hoch, ein Gericht sieht eine Klausel anders, ein neues Gesetz kommt.
  Gemeldete Inhalte deshalb schnell löschen.
- **Solange das Impressum Platzhalter hat:** deutlich weniger, denn das ist ein
  typischer Abmahngrund.
- **100 % gibt es nicht.** Mehr Sicherheit bringt nur eine Prüfung durch einen
  Anwalt für IT-Recht oder ein Dienst für Rechtstexte mit Abmahnschutz.

## Schon erledigt (Commit „Fragen bis zur Lizenz aus, Konto löschen, …“)

- Fragen sind abgeschaltet (`FRAGEN_AKTIV = false` in `src/lib/funktionen.ts`),
  bis die Lizenz für den amtlichen Katalog da ist. `src/lib/fragen.ts` enthält
  selbst formulierte Beispielfragen, nicht den amtlichen Katalog.
- Konto selbst löschen in der App (Einstellungen → Daten).
- Andere Personen blockieren (Clips, Kommentare, Live-Chat, Profil).
- Clips und Live-Chat-Nachrichten kann man melden.
- Impressum, Datenschutz und Nutzungsbedingungen als Seiten in der App
  (`/impressum`, `/datenschutz`, `/nutzungsbedingungen`), immer erreichbar.
- Bei der Registrierung ein Hinweis mit Links zu den Rechtstexten.

## Noch offen

1. Platzhalter in `src/lib/rechtliches.ts` ausfüllen: Name, Anschrift, E-Mail
   (oder `EXPO_PUBLIC_SUPPORT_EMAIL`) und Supabase-Region. Pflicht.
2. `supabase/update-konto.sql` im Supabase SQL Editor ausführen.
3. Verträge zur Auftragsverarbeitung abschließen mit Supabase, LiveKit und
   Anthropic. Prüfen, dass das Supabase-Projekt in der EU liegt.
4. Datenschutzseite online stellen; App Store und Play Store verlangen einen
   Link darauf.
5. „TÜV“ und „echte Prüfung“ aus Werbung und App-Texten nehmen (Punkt 5 der
   früheren Liste). Mit fremden Markennamen zu werben oder etwas Irreführendes
   zu versprechen, ist ein Risiko.
6. **Kommentare meldbar machen** und beim Löschen eines Inhalts dem
   Verfasser eine kurze Begründung schicken (DSA Art. 16 und 17, gilt auch für
   Kleinstanbieter). Noch nicht gebaut.
7. Gewerbe anmelden, sobald mit der App Geld verdient wird (z. B. Premium).
8. Code-Login: Absender-Mail über Gmail einrichten (`docs/login-einrichten.md`,
   Schritt 2) und `supabase/update-code-login.sql` ausführen. Google- und
   Apple-Login sind raus; die Datenschutzerklärung nennt dafür den Mailversand
   über Google.

## Gesetzeslage (recherchiert im November 2026)

- **DSGVO-Fehler sind abmahnbar.** BGH, 27. März 2025 („App-Zentrum“, I ZR
  186/17): Auch Konkurrenten und Verbände dürfen abmahnen. Eine vollständige
  Datenschutzerklärung ist deshalb wichtig.
- **Digital Services Act (DSA):** Die Meldefunktion für rechtswidrige Inhalte
  (Art. 16) und die Begründung beim Löschen (Art. 17) gelten auch für
  Kleinstanbieter. Ausgenommen sind nur die erweiterten Pflichten für
  Plattformen (Art. 19) und die Transparenzberichte.
- **KI-Verordnung Art. 50, seit 2. August 2026:** Nutzer müssen wissen, dass
  sie mit einer KI schreiben. Der Digital Omnibus (VO 2026/1744) hat das nicht
  verschoben, verschoben wurde nur die Hochrisiko-KI. Die KI-Hilfe der App ist
  mit den Fragen ausgeschaltet. Sie heißt „KI-Hilfe“, das sollte reichen. Beim
  Wiedereinschalten trotzdem prüfen.
- **Widerrufsbutton, seit 19. Juni 2026:** Erst wichtig, wenn Premium verkauft
  wird. Über In-App-Käufe regeln das weitgehend Apple und Google. Wer im
  Browser verkauft, muss den Knopf selbst einbauen.
- **Barrierefreiheitsstärkungsgesetz (BFSG), seit 28. Juni 2025:**
  Kleinstunternehmen, die Dienstleistungen erbringen (unter 10 Beschäftigte,
  höchstens 2 Mio. € Umsatz oder Bilanzsumme), sind ausgenommen. Wer sich
  darauf beruft, sollte das kurz schriftlich festhalten.
- **Impressum:** nach § 5 DDG (ersetzt seit 2024 das TMG). Die
  EU-Streitschlichtungsplattform gibt es seit Juli 2025 nicht mehr, ein Link
  darauf ist nicht nötig.

## Quellen

- BGH-Urteil 2025, DSGVO abmahnbar: https://www.it-anwalt-kanzlei.de/bgh-urteil-2025-dsgvo-verstoesse-sind-abmahnbar
- BGH, Abmahnung durch Mitbewerber: https://www.windweiss.de/aktuelles/bgh-dsgvo-abmahnfaehigkeit/
- DSA Art. 16: https://openlex.de/dsa/16 und https://sterne-advo.de/lexikon/dsa-notice-and-action/
- DSA-Pflichten für Unternehmen: https://www.windweiss.de/ratgeber/digital-services-act/
- KI-VO Art. 50: https://mbkanzlei.digital/blog/ki-vo-artikel-50-transparenzpflichten/
- Digital Omnibus: https://mbkanzlei.digital/blog/digital-omnibus-ki-vo-was-verschoben-wurde/
- Art. 50 seit 2. August 2026: https://www.morganlewis.com/blogs/sourcingatmorganlewis/2026/08/eu-ai-acts-transparency-rules-what-went-into-effect-on-2-august
- Widerrufsbutton (IHK Braunschweig): https://www.ihk.de/braunschweig/beratung-und-service/rechtsthemen/wirtschaftsrecht-von-a-bis-z/internet-und-recht2/widerrufs-button-verpflichtend-seit-juni-2026-7103310
- Widerrufsbutton FAQ: https://www.it-recht-kanzlei.de/widerrufsbutton-faq-leitfaden-online-handel.html
- BFSG Kleinstunternehmen: https://ohn.haendlerbund.de/recht/rechtsfragen/kleinstunternehmen-bfsg-ausnahme
