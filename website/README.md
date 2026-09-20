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

Die Seite ist wie ein Magazin aufgebaut: Cover-Hero, Laufband, Inhaltsverzeichnis
und acht nummerierte Kapitel (`components/home/*`). Schriften über `next/font`:
**Fraunces** (Überschriften), **Hanken Grotesk** (Lesetext), **IBM Plex Mono**
(Meta-Zeilen, Bildunterschriften, Zahlen). Farben und Papierkorn liegen in
`tailwind.config.ts` und `app/globals.css` (`.grain`). Buttons, Links und
Rubriken kommen aus `components/ui.tsx`.

## Bilder / Fotos

Die Fotos liegen unter `public/images/` und werden per `next/image` eingebunden
(Hero, Kapitel „Der Alltag", Produkt-Spread Schüler-App, Bildstrecke, Wirkung,
Abschluss-CTA). Sie stammen von [Pexels](https://www.pexels.com) und sind unter
der Pexels-Lizenz kostenlos, auch kommerziell und ohne Nennungspflicht, nutzbar.

Zum Austauschen einfach die JPGs in `public/images/` durch eigene Fotos mit
denselben Dateinamen ersetzen (z. B. echte Bilder deiner Fahrschule) – am
besten in ähnlichem Seitenverhältnis. Referenziert werden sie in
`components/home/*` und `components/bits.tsx`.
