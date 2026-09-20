# FahrschulApp – Marketing-Website

Öffentliche Marketing-Website (Landingpage + Unterseiten) für die SaaS-Software
**FahrschulApp**. Eigenständiges Next.js-Projekt, getrennt von der eigentlichen
Verwaltungs-Software.

Enthält u. a.: Startseite mit allen Sektionen, Funktionen-, Über-uns-, Demo-,
Kontakt- und Rechtsseiten, echte Produkt-UI-Mockups (in React/SVG), ein
funktionierendes Demo-Anfrage-Formular mit serverseitiger Verarbeitung,
SEO (Metadaten, `sitemap.xml`, `robots.txt`), Accessibility-Grundlagen.

## Tech-Stack

- Next.js 14 (App Router) · React · TypeScript
- Tailwind CSS mit eigenen Design-Tokens
- lucide-react (Icons)
- Server-Route für das Formular (`app/api/demo/route.ts`)

## Voraussetzungen

- Node.js ≥ 18.18

## Installation

```bash
cd website
npm install
```

## Entwicklung

```bash
npm run dev        # http://localhost:3000
```

## Production

```bash
npm run build
npm start
```

## Umgebungsvariablen

Kopiere `.env.example` nach `.env.local` und trage deine Werte ein:

```
DEMO_RECIPIENT_EMAIL=hallo@deine-domain.de
RESEND_API_KEY=            # optional (E-Mail-Versand)
DEMO_FROM_EMAIL=FahrschulApp <noreply@deine-domain.de>
NEXT_PUBLIC_SITE_URL=https://www.deine-domain.de
```

### E-Mail-Versand konfigurieren

Das Demo-Formular ist voll funktionsfähig (Validierung, Honeypot, Rate-Limit,
Server-Route). Für die Zustellung gibt es einen Adapter in `lib/mail.ts`:

- **Mit `RESEND_API_KEY`** (empfohlen): Anfragen werden per
  [Resend](https://resend.com) an `DEMO_RECIPIENT_EMAIL` gesendet, plus optionale
  Eingangsbestätigung an den Absender. Keine zusätzliche Abhängigkeit nötig.
- **Ohne Key** (Fallback): Die Anfrage wird serverseitig geloggt – ideal für die
  lokale Entwicklung. Hier kannst du stattdessen eine **Datenbank / ein CRM** oder
  **klassisches SMTP** anbinden (die Funktion `deliverLead` in `lib/mail.ts` ist
  die einzige Stelle, die du dafür anpassen musst).

Es werden nie Secrets im Browser oder in Fehlermeldungen ausgegeben.

## Persistenz (optional)

Standardmäßig werden Anfragen per E-Mail zugestellt bzw. geloggt. Wenn du sie
zusätzlich speichern willst, ergänze in `deliverLead` einen Datenbank-Aufruf
(z. B. Supabase/Postgres, ein Google-Sheet oder ein CRM). Die Struktur ist
bewusst als Adapter gehalten.

## Deployment

### Vercel (empfohlen)
1. Repository importieren.
2. **Root Directory** auf `website/` setzen (dieses Projekt liegt im Unterordner).
3. Environment-Variablen eintragen.
4. Deploy.

### Eigener Node-Server
```bash
npm run build
npm start   # standardmäßig Port 3000, per PORT anpassbar
```

## Projektstruktur (Auszug)

```
app/            Seiten & Routing (App Router), api/demo, sitemap, robots
components/     Header, Footer, UI-Primitives, Produkt-Mockups, Formular
lib/            Validierung, Rate-Limit, Mail-Adapter
```

## Anpassen vor dem Livegang

- **Impressum, Datenschutz, AGB** mit echten, rechtssicheren Texten füllen.
- **Kontaktdaten** (E-Mail, Telefon, Adresse) ersetzen.
- **Kundenstimmen** durch echte Zitate ersetzen (aktuell Platzhalter).
- **Produktname/Logo** anpassen, falls abweichend.
- `NEXT_PUBLIC_SITE_URL` auf die echte Domain setzen (SEO/Canonical/Sitemap).

## Design

Die Startseite folgt dem Aufbau etablierter Fahrschul-Software-Seiten: grüner
Hero mit Laptop-/Handy-Mockup, Fakten-Kacheln, Standards-Leiste, bunte
Modul-Kacheln, abwechselnde Feature-Zeilen mit Screenshots, Foto-Banner,
dunkle Highlight-Sektion, Umstiegs-Schritte, Zahlen, Pilotphase, FAQ und
Abschluss-CTA (`components/home/*`, `components/bits.tsx`). Schriften über
`next/font`: **Plus Jakarta Sans** (alles) und **Barlow Condensed** (große
Versalien-Banner und Kachel-Titel). Farben in `tailwind.config.ts`
(`brand` = Grün, `orange` = Conversion-Buttons, dazu `purple`, `sky`, `yellow`
für Kacheln). Buttons, Häkchen-Listen und Rubriken kommen aus `components/ui.tsx`,
der schwebende Demo-Button aus `components/sticky-cta.tsx`.

## Bilder / Fotos

Die Fotos liegen unter `public/images/` und werden per `next/image` eingebunden
(Foto-Banner, Schüler-App-Zeile, Zahlen-Sektion, Pilotphase, Über uns,
Abschluss-CTA). Sie stammen von [Pexels](https://www.pexels.com) und sind unter
der Pexels-Lizenz kostenlos, auch kommerziell und ohne Nennungspflicht, nutzbar.

Zum Austauschen einfach die JPGs in `public/images/` durch eigene Fotos mit
denselben Dateinamen ersetzen (z. B. echte Bilder deiner Fahrschule) – am
besten in ähnlichem Seitenverhältnis. Referenziert werden sie in
`components/home/*` und `components/bits.tsx`.

## App-Screenshots

Die Produktansichten in Laptop-, Browser- und Handy-Rahmen sind echte Aufnahmen
der Software (`public/images/app/`) mit Beispieldaten einer fiktiven
„Fahrschule Weber": Leitstand, Disposition, Schülerakte, Finanzen, Prüfungen,
Cockpit (1440 px breit, Disposition 1440 × 720) sowie Start und Fortschritt der
Schüler-App (390 × 760) – jeweils in doppelter Auflösung. Neue Aufnahmen einfach
unter denselben Dateinamen ablegen; eingebunden sind sie über `AppShot` und
`PhoneShot` in `components/mockups.tsx`.
