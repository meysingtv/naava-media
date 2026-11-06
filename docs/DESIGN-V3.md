# Designsystem v3 „Werkbank" – verbindlicher Design Guide

**Status:** verbindlich. Dieser Guide ersetzt Designsystem v2 „Fahrschul OS" vollständig.
**Geltungsbereich:** `app/(dashboard)/**` (35 Seiten), `components/shared/**`, `components/ui/**`, `app/globals.css`, `tailwind.config.ts`, `app/layout.tsx`.
**Nicht betroffen:** `app/(marketing)`, `components/marketing`, `app/portal` (zieht Farben/Schrift automatisch mit, bekommt aber keine Shell-Bausteine), `@react-pdf`-Rechnungen.

Alle Angaben sind gegen den echten Code geprüft. Wo dieser Guide eine Zahl, eine Klasse oder einen Namen nennt, ist sie so zu bauen. Es gibt keine Alternativen und kein „oder".

**Eine neue Abhängigkeit, sonst keine:** `npm i @radix-ui/react-tooltip`.
`@radix-ui/react-popover` ist bereits installiert, wird aber bisher von **keiner** Datei importiert – `components/ui/popover.tsx` wird neu angelegt. `cmdk` wird **nicht** installiert; die Kommandopalette läuft auf Radix Dialog.

---

## 1. Grundsätze

1. v3 ist eine Werkbank für Bürokräfte, keine Produktseite: eine Navigationsebene links (dunkle Sidebar), eine 56-px-Kopfzeile pro Seite, darunter nur noch Inhalt.
2. Die Arbeitsfläche ist **warm-hell** (#F7F7F5), die Panels sind weiß mit weichem Schatten – die kühl-blaue Off-White-Fläche und die Haarlinien-Ränder aus v2 verschwinden restlos.
3. Die Tabelle ist die Grundform: jede Liste mit drei oder mehr Datenfeldern pro Zeile wird eine echte Datentabelle mit Filterleiste, Sortierung, Zeilenmenü, Auswahl und Pagination.
4. Farbe trägt Bedeutung, nie Dekor: Markengrün nur für Primäraktion, aktive Zustände und Links; vier Statusfarben für Status; alles andere ist Tinte, Grau und Weiß.
5. Jede Farbe existiert in drei Rollen – Fläche, Soft-Fläche, Text – und Text nutzt **immer** die dunkle `*-text`-Stufe, damit Lesbarkeit nie von der Markenfarbe abhängt.
6. Details öffnen sich rechts als Seitenpanel, nicht auf einer neuen Seite; Dialoge sind für Bestätigungen und kurze Formulare reserviert.
7. Die Schrift ist Inter in genau acht Stufen (11/12/13/14/16/18/22/28) und drei Gewichten (400/500/600), Zahlen immer tabellarisch.
8. Dichte vor Luft: 32-px-Sidebar-Einträge, 36-px-Buttons, 38-px-Felder, 44-px-Tabellenzeilen, 16-px-Panel-Innenabstand, 4-pt-Raster.
9. Jede Ansicht ist per Tastatur bedienbar: Skip-Link, ⌘K, ⌘B, sichtbarer Fokusring, Zeilennavigation, `Esc` schließt genau eine Ebene.
10. **Verboten:** Glas-, Neon- und Aurora-Effekte, Farbverläufe jeder Art, lila/blaue Deko-Töne, Emoji als Icon, gleichförmige Kachel-Raster mit Icon im Kreis, Begrüßungen („Guten Tag", „Willkommen zurück"), Zahlen ohne Label und Kontext, 3D-Illustrationen, Text-Schatten, gemischte Icon-Sets, Dark-Mode in Teilen – und alles aus v2: Top-Bar-Navigation, Bereichs-/Kontextleisten, Haarlinien-Panels, kühles Off-White, Versalien-Abschnittstitel, schwarz gefüllte Sekundärbuttons, Icon-Kacheln in Listenzeilen.

---

## 2. Tokens

### 2.1 Bestehende HSL-Variablen in `app/globals.css` – Namen bleiben, Werte werden ersetzt

Werte ohne `hsl()`-Wrapper, damit `hsl(var(--x) / <alpha>)` weiter funktioniert. Die Hex-Spalte ist der Zielwert, aus dem der HSL-Wert gerechnet ist.

| Variable | v2 (alt) | **v3 (neu)** | Hex | Verwendung |
|---|---|---|---|---|
| `--canvas` | `195 17% 96%` | `60 11% 96%` | #F7F7F5 | Arbeitsfläche hinter den Panels |
| `--background` | `195 17% 96%` | `60 11% 96%` | #F7F7F5 | `body`, `main`, Seitenkopf-Hintergrund |
| `--foreground` | `200 17% 13%` | `163 17% 8%` | #111816 | Primärtext, Überschriften, Tabellenwerte |
| `--card` | `0 0% 100%` | `0 0% 100%` | #FFFFFF | Panel-, Tabellen-, Dialog-, Sheet-Fläche |
| `--card-foreground` | `200 17% 13%` | `163 17% 8%` | #111816 | Text auf Panels |
| `--popover` | `0 0% 100%` | `0 0% 100%` | #FFFFFF | Menüs, Select, Palette, Tooltip-Grund |
| `--popover-foreground` | `200 17% 13%` | `163 17% 8%` | #111816 | Text in Popovern |
| `--surface` | `0 0% 100%` | `0 0% 100%` | #FFFFFF | Alias Weiß (46 bestehende `bg-surface*`-Aufrufe) |
| `--surface-muted` | `195 20% 97%` | `90 8% 95%` | #F2F3F1 | Tabellenkopf, Zeilen-Hover, Zonen, Skeleton |
| `--text-secondary` | `200 14% 34%` | `150 8% 39%` | #5B6B63 | Sekundärtext, 5,6:1 auf Weiß |
| `--muted` | `195 20% 96%` | `90 8% 95%` | #F2F3F1 | neutrale Füllfläche, Chips, `kbd` |
| `--muted-foreground` | `199 10% 52%` | `150 8% 39%` | #5B6B63 | **bewusst = Sekundär.** Der Token trägt im Bestand über 170 Stellen Fließ- und Metatext; #8A968F fiele dort mit 3,07:1 durch |
| `--text-disabled` | `199 12% 69%` | `144 6% 68%` | #A9B3AD | Platzhalter, deaktivierte Controls |
| `--primary` | `151 66% 30%` | `150 78% 35%` | #14A15A | Primärbutton-Fläche, aktiv, Fokusring, Fortschritt |
| `--primary-foreground` | `0 0% 100%` | `0 0% 100%` | #FFFFFF | Text auf Markengrün |
| `--primary-hover` | `151 68% 25%` | `150 80% 30%` | #0F8A4C | Hover Primärbutton |
| `--primary-pressed` | `151 70% 21%` | `150 80% 25%` | #0C7340 | Active Primärbutton |
| `--primary-soft` | `151 72% 93%` | `145 55% 94%` | #E7F8EE | Soft-Button, ausgewählte Zeile, KI-Block |
| `--primary-soft-strong` | `151 75% 78%` | `145 60% 84%` | #BFEFD3 | `::selection`, Soft-Button-Hover |
| `--primary-soft-border` | `151 52% 72%` | `148 44% 74%` | #9ED9BA | Kante auf Soft-Flächen, aktive Filter-Chips |
| `--accent-bright` | `151 62% 45%` | `147 66% 51%` | #2ED47A | **nur** Sidebar-Balken, Sidebar-Logo-Spur, Sparkline-Endpunkt auf Tinte |
| `--secondary` | `195 20% 96%` | `90 8% 95%` | #F2F3F1 | Fläche `Button variant="secondary"` (nicht mehr Tinte) |
| `--secondary-foreground` | `200 17% 13%` | `163 17% 8%` | #111816 | Text darauf |
| `--accent` | `195 20% 96%` | `90 8% 95%` | #F2F3F1 | Radix-Konvention: Hover in Menüs |
| `--accent-foreground` | `200 17% 13%` | `163 17% 8%` | #111816 | Text darauf |
| `--success` | `152 65% 34%` | `152 65% 34%` | #1E8E5A | Punkt, Balken, solide Erfolgsfläche |
| `--success-foreground` | `0 0% 100%` | `0 0% 100%` | #FFFFFF | Text auf soliderem Erfolg |
| `--success-soft` | `150 50% 93%` | `144 43% 93%` | #E6F5EC | Soft-Fläche Erfolg |
| `--warning` | `35 87% 41%` | `38 89% 44%` | #D48A0C | Punkt, Balken, Icon Warnung |
| `--warning-foreground` | `0 0% 100%` | `0 0% 100%` | #FFFFFF | Text auf solider Warnung |
| `--warning-soft` | `40 90% 92%` | `39 78% 93%` | #FBF1DE | Soft-Fläche Warnung |
| `--destructive` | `0 62% 54%` | `3 67% 55%` | #D9463D | Danger-Button-Fläche, Punkt, Jetzt-Linie |
| `--destructive-foreground` | `0 0% 100%` | `0 0% 100%` | #FFFFFF | Text auf Danger-Button |
| `--destructive-soft` | `0 80% 95%` | `3 76% 95%` | #FCEAE9 | Soft-Fläche Gefahr |
| `--border` | `197 14% 90%` | `100 6% 90%` | #E6E8E5 | **nur noch innerhalb** von Panels: Tabellenzeilen, Kopf-/Fußkanten, Separator |
| `--border-strong` | `198 12% 82%` | `132 5% 82%` | #CFD4D0 | Input-Rahmen, Outline-Button-Rahmen, Scrollbar |
| `--input` | `198 12% 82%` | `132 5% 82%` | #CFD4D0 | shadcn-Alias für den Feldrahmen |
| `--ring` | `151 66% 30%` | `150 78% 35%` | #14A15A | Fokusring |
| `--radius` | `0.375rem` | `0.5rem` | 8 px | Basisradius = Controls |

### 2.2 Neue Variablen (ergänzen in `:root`)

```css
/* Text-Stufe 3 – nie alleiniger Träger von Information (2,86:1 auf Canvas) */
--text-tertiary: 145 5% 56%;        /* #8A968F – Icons in Ruhe, Platzhalter, Trenner, kbd */

/* Lesbare Farbtexte (alle ≥ 4,5:1 auf Weiß) */
--primary-text: 150 80% 25%;        /* #0C7340 – Links, Soft-Button-Text, grüne Zahlen   5,9:1 */
--success-text: 154 66% 27%;        /* #17724A                                           5,9:1 */
--warning-text: 38 89% 29%;         /* #8A5A08                                           5,9:1 */
--destructive-text: 3 62% 43%;      /* #B3312A                                           6,2:1 */

/* Info-Status (löst bg-blue-600 / bg-indigo-600 aus lib/constants.ts ab) */
--info: 214 84% 56%;                /* #2F80ED */
--info-foreground: 0 0% 100%;
--info-soft: 214 84% 95%;           /* #E8F1FD */
--info-text: 215 71% 42%;           /* #1F5FB8                                           6,2:1 */

/* Rahmen-Hover (ersetzt die Rohwerte hsl(198 12% 70%) in input.tsx und
   hsl(205 18% 74%) in select.tsx) */
--border-hover: 132 5% 73%;         /* #B7BEB8 */

/* Sidebar („Tinte") – diese Tokens dürfen ausschließlich in der Sidebar
   und im Mobil-Drawer vorkommen, nie im Seiteninhalt */
--sidebar: 153 27% 8%;              /* #0F1A15 Fläche */
--sidebar-foreground: 137 10% 86%;  /* #D7DED9 Text            13,0:1 auf Tinte */
--sidebar-muted: 145 5% 56%;        /* #8A968F Gruppentitel     5,8:1 auf Tinte */
--sidebar-hover: 148 23% 11%;       /* #16231C Hover-Fläche, Suchfeld */
--sidebar-active: 148 22% 14%;      /* #1B2A22 aktive Fläche */
--sidebar-active-foreground: 0 0% 100%;  /* #FFFFFF aktiver Text + aktives Icon */
--sidebar-bar: 147 66% 51%;         /* #2ED47A 3-px-Balken       9,2:1 auf Tinte */
--sidebar-border: 150 18% 15%;      /* #1F2D26 Trennlinien Kopf/Fuß, Gruppentrenner */
--sidebar-badge: 150 16% 20%;       /* #2B3B33 Zähler-Badge, kbd, Avatar-Fläche */

/* Maße */
--sidebar-w: 256px;                 /* html[data-sidebar="collapsed"] → 68px */
--header-h: 56px;
--radius-control: 0.5rem;           /* 8 px  = --radius */
--radius-panel: 0.625rem;           /* 10 px */
--radius-dialog: 0.875rem;          /* 14 px */

/* Schatten – der 1-px-Ring gibt die Kante auf der warmen Fläche,
   der weiche Schatten die Höhe. Kein Rand, keine Haarlinie. */
--shadow-panel: 0 0 0 1px rgba(15,26,21,.04), 0 1px 2px rgba(15,26,21,.06), 0 8px 24px -12px rgba(15,26,21,.12);
--shadow-control: 0 1px 2px rgba(15,26,21,.06);
--shadow-popover: 0 0 0 1px rgba(15,26,21,.05), 0 4px 12px -2px rgba(15,26,21,.10), 0 12px 32px -8px rgba(15,26,21,.16);
--shadow-overlay: 0 0 0 1px rgba(15,26,21,.05), 0 8px 24px -8px rgba(15,26,21,.12), 0 24px 64px -16px rgba(15,26,21,.28);
```

### 2.3 Kontrast – gerechnete Werte, die die Regeln begründen

| Paar | Verhältnis | Folge |
|---|---|---|
| #FFFFFF auf #14A15A | 3,35:1 | Primärbutton: Text mindestens 13 px/500, nie kleiner. Icon-Buttons in Grün immer mit `aria-label`. |
| #FFFFFF auf #0F8A4C | 4,41:1 | Hover-Zustand ist AA – kein Handlungsbedarf. |
| #0C7340 auf Weiß | 5,9:1 | `--primary-text` für **jeden** grünen Text. |
| #5B6B63 auf Weiß / auf #F7F7F5 | 5,6:1 / 5,25:1 | Sekundärtext überall erlaubt. |
| #8A968F auf Weiß / auf #F7F7F5 | 3,07:1 / 2,86:1 | Tertiär **nur** Icons, Platzhalter, Trenner, `kbd`. |
| #D48A0C auf Weiß | 2,8:1 | Warnung nie als Text – dafür #8A5A08 (5,9:1). |
| #D9463D auf Weiß | 4,3:1 | Gefahr nie als Text – dafür #B3312A (6,2:1). |
| #1E8E5A auf Weiß | 4,1:1 | Erfolg nie als Text – dafür #17724A (5,9:1). |
| #2F80ED auf Weiß | 3,9:1 | Info nie als Text – dafür #1F5FB8 (6,2:1). |
| #D7DED9 auf #0F1A15 | 13,0:1 | Sidebar-Text sicher. |
| #8A968F auf #0F1A15 | 5,8:1 | Sidebar-Gruppentitel sicher (11 px, deshalb 600). |
| #2ED47A auf #0F1A15 | 9,2:1 | Aktiv-Balken und Fokusring in der Sidebar sicher. |
| #1B2A22 auf #0F1A15 | 1,19:1 | Aktive Fläche allein reicht nicht → Balken **und** weißer Text sind Pflicht. |

Wenn der Kunde AA auch für Primärbutton-Text verlangt: `--primary` auf `150 80% 30%` (#0F8A4C) heben. Eine Zeile, alles zieht mit. Bis dahin gilt der Wert aus dem Auftrag.

### 2.4 Radien

| Tailwind | Wert | Verwendung |
|---|---|---|
| `rounded-sm` | 6 px | Checkbox, Menü-Items, Sparkline-Legende |
| `rounded-md` | 8 px (`var(--radius)`) | Buttons, Inputs, Select, Sidebar-Einträge, Chips |
| `rounded-lg` | 10 px | Panels, Karten, Tabellen-Container, Popover-Flächen |
| `rounded-xl` | 10 px | Alias – die 47 bestehenden `rounded-xl`-Panels landen automatisch richtig |
| `rounded-2xl` | 14 px | Dialog, Kommandopalette |
| `rounded-full` | – | Badges, Avatare, Fortschrittsbalken, Punkte |

Das Sheet (Drawer rechts) ist **bündig ohne Radius** – es sitzt an der Fensterkante.

### 2.5 Typografie

**Schrift:** Inter über `next/font/google`, Variable `--font-sans`. Geist entfällt.

```tsx
// app/layout.tsx
import { Inter } from "next/font/google";
const sans = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-sans", display: "swap" });
// <body className={`${sans.variable} font-sans antialiased`}>
// <Toaster position="bottom-right" />   ← war top-right
```

`app/fonts/GeistVF.woff` und `app/fonts/GeistMonoVF.woff` werden gelöscht. GeistMono war ohnehin nirgends eingebunden; das eine `font-mono` in `schueler-akte.tsx` (Portal-Code) fällt auf den System-Monospace zurück – gewollt.

**Skala.** Die Tailwind-Standardgrößen werden **nicht** umdefiniert, weil `tailwind.config.ts` auch `app/(marketing)` und `app/portal` bedient (35 `text-sm`-Aufrufe allein dort). Die App-Skala besteht aus den Standardstufen plus zwei neuen Schlüsseln.

| Größe | Tailwind-Klasse | Line-Height | Gewicht | Verwendung |
|---|---|---|---|---|
| 11 px | `text-2xs` | 16 | 600 | Sidebar-Gruppentitel (Versalien), `kbd`, Zähler-Badge |
| 12 px | `text-xs` | 16 | 400/500 | Meta, Tabellenkopf, Badge, Hilfetext, Fehlertext, Pagination |
| 13 px | `text-13` | 20 | 400/500 | **Body**, Tabellenzellen, Buttons, Inputs, Menü-Items, Sidebar-Einträge, Breadcrumb |
| 14 px | `text-sm` | 20 | 600 | Panel-Titel, Formular-Sektionstitel, Leerzustand-Titel |
| 16 px | `text-base` | 24 | 600 | Seitentitel im 56-px-Kopf, Dialog-Titel, Sheet-Titel |
| 18 px | `text-lg` | 26 | 600 | Akten-Kopf (Schülername), Auth-Seiten |
| 22 px | `text-kpi` | 28 | 600 | KPI-Wert (Standard) |
| 28 px | `text-kpi-lg` | 34 | 600 | KPI-Wert hervorgehoben (Cockpit, Berichte) |

Gewichte: ausschließlich 400, 500, 600. Kein 700, kein Extrabold, keine Display-Schrift, keine Serifen. Zahlen überall tabellarisch. Versalien gibt es **nur** in Sidebar-Gruppentiteln und im Gruppentitel der Kommandopalette.

### 2.6 Abstände (4-pt-Raster)

| Regel | Wert |
|---|---|
| Seitengutter | `px-4` (16) · `md:px-6` (24) · `lg:px-8` (32) |
| Abstand Kopfzeile → Inhalt | `mb-5` (20) am Header |
| Abschnitt zu Abschnitt | `space-y-6` (24) |
| Panel zu Panel im Raster | `gap-4` (16) |
| Panel-Innenabstand | `p-4` (16); Tabellen/Listen `p-0` |
| Panel-Kopf | `h-12 px-4` (48 / 16) |
| Tabellenzelle horizontal | `px-3` (12), erste/letzte Spalte `pl-4`/`pr-4` |
| Formularfelder untereinander | `gap-4` (16); Spalten `gap-x-6` (24) |
| Sektion zu Sektion im Formular | `space-y-6` (24) |
| Inhaltsbreite | `mx-auto w-full max-w-[1440px]` |
| Formularbreite | `max-w-[880px]` |

Erlaubte Abstandswerte: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40. Kein `gap-6` mehr in KPI- und Panel-Rastern (das war v2-Luft).

### 2.7 Z-Ebenen

| Ebene | z | Regel |
|---|---|---|
| Klebender Tabellenkopf, SubNav | 10 | innerhalb der Seite |
| Seitenkopf (56 px) | 20 | `sticky top-0` |
| Sidebar | 30 | `fixed`, Desktop |
| Sheet / Mobil-Drawer | 40 | Overlay `bg-foreground/35` |
| Dialog | 50 | Overlay `bg-foreground/45` |
| **Popover, Dropdown, Select, Tooltip** | **60** | **bewusst über Sheet und Dialog** – ein Menü liegt immer über der Fläche, die es geöffnet hat. Damit funktionieren Radix-Portale in Sheets und Dialogen ohne Sonderfälle. |
| Kommandopalette | 70 | ⌘K gewinnt immer |
| Toast | 80 | über allem |

Regel: Ein Dialog darf aus einem Sheet geöffnet werden. Ein Sheet darf **nicht** aus einem Dialog geöffnet werden. Zwei Sheets gleichzeitig sind nicht erlaubt – Ausnahme: der KI-Assistent ist `modal={false}` und schließt ein offenes Detail-Sheet, bevor er öffnet.

### 2.8 Bewegung

`fast 120ms` (Farbe, Opazität) · `DEFAULT 150ms` · `overlay 180ms` (Dialog, Sheet) · Sidebar-Breite `180ms`. Kurve `cubic-bezier(.2,.8,.2,1)` (`ease-soft`, existiert bereits). Kein `transition-all`. Die `prefers-reduced-motion`-Regel aus v2 bleibt unverändert.

### 2.9 `tailwind.config.ts` – die Änderungen

```ts
extend: {
  colors: {
    // Marketing-Einträge (brand, mint, orange, yellow, purple, sky, ink, dark,
    // paper, line, line2) bleiben UNVERÄNDERT.
    foreground: {
      DEFAULT: "hsl(var(--foreground))",
      secondary: "hsl(var(--text-secondary))",
      tertiary: "hsl(var(--text-tertiary))",      // NEU
      disabled: "hsl(var(--text-disabled))",
    },
    border: {
      DEFAULT: "hsl(var(--border))",
      strong: "hsl(var(--border-strong))",
      hover: "hsl(var(--border-hover))",          // NEU
    },
    primary:     { /* bestehend */ text: "hsl(var(--primary-text))" },        // NEU
    success:     { /* bestehend */ text: "hsl(var(--success-text))" },        // NEU
    warning:     { /* bestehend */ text: "hsl(var(--warning-text))" },        // NEU
    destructive: { /* bestehend */ text: "hsl(var(--destructive-text))" },    // NEU
    info: {                                                                   // NEU
      DEFAULT: "hsl(var(--info))", foreground: "hsl(var(--info-foreground))",
      soft: "hsl(var(--info-soft))", text: "hsl(var(--info-text))",
    },
    sidebar: {                                                                // NEU
      DEFAULT: "hsl(var(--sidebar))", foreground: "hsl(var(--sidebar-foreground))",
      muted: "hsl(var(--sidebar-muted))", hover: "hsl(var(--sidebar-hover))",
      active: "hsl(var(--sidebar-active))",
      "active-foreground": "hsl(var(--sidebar-active-foreground))",
      bar: "hsl(var(--sidebar-bar))", border: "hsl(var(--sidebar-border))",
      badge: "hsl(var(--sidebar-badge))",
    },
  },
  borderRadius: {
    sm: "0.375rem",                 // 6  (war 4)
    md: "var(--radius-control)",    // 8  (war 6)
    lg: "var(--radius-panel)",      // 10 (war 8)
    xl: "var(--radius-panel)",      // 10 (unverändert im Wert)
    "2xl": "var(--radius-dialog)",  // 14 (war 12)
  },
  boxShadow: {
    xs: "var(--shadow-control)",    // war "none" – 18 bestehende Aufrufe werden zur feinen Kante
    sm: "var(--shadow-control)",    // war "none"
    DEFAULT: "var(--shadow-panel)", // war "none"
    panel: "var(--shadow-panel)",   // NEU
    md: "var(--shadow-popover)",
    lg: "var(--shadow-overlay)",
    card: "…", lift: "…", cta: "…", // Marketing unverändert
  },
  fontSize: {
    "2xs": ["0.6875rem", { lineHeight: "1rem" }],        // 11 – bestehend
    "13":  ["0.8125rem", { lineHeight: "1.25rem" }],     // 13 – bestehend
    kpi:      ["1.375rem", { lineHeight: "1.75rem" }],   // 22 – NEU
    "kpi-lg": ["1.75rem",  { lineHeight: "2.125rem" }],  // 28 – NEU
    // Tailwind-Standardgrößen xs/sm/base/lg werden NICHT überschrieben.
  },
  spacing: {
    "9.5": "2.375rem",              // 38 px – Inputs, Button size="lg"
    sidebar: "var(--sidebar-w)",
    header: "var(--header-h)",
  },
  zIndex: {
    sticky: "10", header: "20", sidebar: "30", sheet: "40",
    dialog: "50", popover: "60", palette: "70", toast: "80",
  },
  fontFamily: { sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"] /* mk, display bleiben */ },
  maxWidth: { wrap: "1240px" },     // unverändert (Marketing)
}
```

`darkMode: ["class"]` bleibt in der Config stehen, aber es wird **keine einzige** `dark:`-Klasse geschrieben. Die Sidebar ist dunkel durch eigene Tokens, nicht durch ein Theme.

### 2.10 `app/globals.css` – Basis und Utilities

```css
@layer base {
  :root { /* Tokens aus 2.1 + 2.2 */ }
  html[data-sidebar="collapsed"] { --sidebar-w: 68px; }

  * { @apply border-border; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    @apply bg-background text-foreground;
    font-size: 13px;
    line-height: 20px;
    font-variant-numeric: tabular-nums;            /* global – Business-App */
    font-feature-settings: "calt" 1, "liga" 1, "cv11" 1;  /* Inter: einstöckiges a */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  h1, h2, h3 { font-weight: 600; letter-spacing: -0.01em; }

  a, button, input, select, textarea, [role="button"] {
    transition-property: color, background-color, border-color, box-shadow, opacity, transform;
    transition-duration: 130ms;
    transition-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  ::selection { background: hsl(var(--primary-soft-strong)); color: hsl(var(--foreground)); }
  input[type="checkbox"], input[type="radio"] { accent-color: hsl(var(--primary)); }

  @media (prefers-reduced-motion: reduce) { /* unverändert aus v2 */ }
}

@layer utilities {
  .animate-page-in { /* unverändert */ }
  .animate-soft-pulse { /* unverändert */ }
  .tabular-nums { font-variant-numeric: tabular-nums; }

  /* label-caps wird NEU DEFINIERT: keine Versalien mehr. Damit verlieren alle
     29 bestehenden Aufrufe sofort den v2-Look, ohne dass eine Seite angefasst
     werden muss. Versalien gibt es in v3 nur noch in der Sidebar. */
  .label-caps {
    font-size: 12px; line-height: 16px; font-weight: 500;
    letter-spacing: 0; text-transform: none;
    color: hsl(var(--muted-foreground));
  }

  /* Sidebar-Gruppentitel – die einzige Versalien-Stelle im System */
  .nav-group {
    font-size: 11px; line-height: 16px; font-weight: 600;
    letter-spacing: 0.06em; text-transform: uppercase;
    color: hsl(var(--sidebar-muted));
  }

  .kbd {
    display: inline-flex; height: 18px; min-width: 18px; padding: 0 5px;
    align-items: center; justify-content: center; border-radius: 5px;
    background: hsl(var(--muted)); color: hsl(var(--text-tertiary));
    font-size: 11px; font-weight: 500;
    box-shadow: inset 0 -1px 0 hsl(var(--border-strong));
  }
  .sidebar .kbd { background: hsl(var(--sidebar-badge)); color: hsl(var(--sidebar-muted)); box-shadow: none; }

  .scrollbar-thin { /* unverändert */ }
  .scrollbar-sidebar { scrollbar-width: thin; scrollbar-color: hsl(var(--sidebar-badge)) transparent; }
}
```

`.hairline-y` wird **gelöscht** – die Utility wird von keiner Datei mehr verwendet.

---

## 3. Shell

### 3.1 Dateien

| Datei | Status |
|---|---|
| `components/shared/dashboard-shell.tsx` | umbauen, **Props unverändert** + optional `zaehler` |
| `components/shared/sidebar.tsx` | **neu** – `SidebarProvider`, `Sidebar`, `SidebarDrawer` |
| `components/shared/sidebar-nav.tsx` | **neu** – Gruppen + Einträge aus `bereicheFuer(rolle)` |
| `components/shared/sidebar-item.tsx` | **neu** – ein Eintrag inkl. Tooltip, Balken, Badge |
| `components/shared/fahrschul-switcher.tsx` | **neu** – Logik aus `top-bar.tsx` Z. 73–117 |
| `components/shared/neu-menu.tsx` | **neu** – Logik aus `top-bar.tsx` Z. 130–158 |
| `components/shared/nutzer-menu.tsx` | **neu** – Logik aus `top-bar.tsx` Z. 160–198 |
| `components/shared/page-header.tsx` | umbauen, **Props abwärtskompatibel** |
| `components/shared/mobile-menu-button.tsx` | **neu** – kleines Client-Blatt im Seitenkopf |
| `components/shared/header-sentinel.tsx` | **neu** – Client-Blatt, setzt `data-scrolled` |
| `components/shared/bereiche.ts` | additiv erweitern (Icons, `/hilfe`) |
| `components/shared/top-bar.tsx` | **löschen** |
| `components/shared/area-nav.tsx` | **löschen** (inkl. `MobileAreaBar` – ersatzlos) |

`top-bar.tsx` und `area-nav.tsx` werden ausschließlich von `dashboard-shell.tsx` importiert; nach dem Shell-Umbau ist das Löschen sicher.

### 3.2 `bereiche.ts` – additive Erweiterung, Rollen bleiben byte-gleich

`BEREICHE`, `bereicheFuer(rolle)` und `aktiverBereich(bereiche, pathname)` bleiben die **einzige** Quelle für Einträge und Rollen-Sichtbarkeit. Die Funktionssignaturen ändern sich nicht.

```ts
export interface BereichItem {
  href: string;
  label: string;
  rollen: FahrlehrerRolle[];
  icon: LucideIcon;              // NEU – Pflichtfeld, ein Icon je Eintrag
  badgeKey?: "aufgaben" | "rechnungen_ueberfaellig";  // NEU – optionaler Zähler-Slot
}
```

Ein neuer Eintrag kommt hinzu, sonst ändert sich an der Sichtbarkeit nichts:

```ts
// BETRIEB – neue Reihenfolge: Fahrzeuge · Rollen & Rechte · Einstellungen · Hilfe
{ href: "/fahrzeuge",        label: "Fahrzeuge",       rollen: CHEF_BUERO, icon: Car },
{ href: "/fahrlehrer/rollen",label: "Rollen & Rechte", rollen: ["chef"],   icon: ShieldCheck },
{ href: "/einstellungen",    label: "Einstellungen",   rollen: ["chef"],   icon: Settings },
{ href: "/hilfe",            label: "Hilfe",           rollen: ALLE,       icon: LifeBuoy },  // NEU
```

`/hilfe` existiert als Seite, hing bisher aber nur im Nutzer-Menü. „Rollen & Rechte" bleibt – der Auftrag nennt es nicht, aber der Eintrag ist rollengeschützt und darf nicht verschwinden.

**Icons je Eintrag (ausschließlich lucide, `strokeWidth 1.75`, aktiv 2):**

| Eintrag | Icon | Eintrag | Icon |
|---|---|---|---|
| Leitstand | `LayoutDashboard` | Rechnungen | `FileText` |
| Aufgaben | `CheckSquare` | Zahlungen | `ArrowDownToLine` |
| Kommunikation | `MessageSquare` | Rechnungslauf | `Repeat` |
| Schüler | `Users` | Kostenträger | `Building` |
| Fahrlehrer | `Contact` | Buchhaltung | `BookMarked` |
| Theorie | `BookOpen` | Lohn | `Banknote` |
| Kurse | `GraduationCap` | Fahrzeuge | `Car` |
| Prüfungen | `ClipboardCheck` | Rollen & Rechte | `ShieldCheck` |
| Kalender | `CalendarDays` | Einstellungen | `Settings` |
| Erinnerungen | `Bell` | Hilfe | `LifeBuoy` |
| Übersicht (Finanzen) | `Wallet` | Cockpit | `Gauge` |
| | | Berichte | `BarChart3` |

`Bereich.icon` (je Gruppe) bleibt im Typ erhalten, wird aber von der Sidebar nicht mehr gerendert.

### 3.3 Shell-Aufbau

```tsx
// components/shared/dashboard-shell.tsx – Server-Komponente, Props unverändert
<SidebarProvider>
  <a href="#inhalt" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-palette
     focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-13 focus:font-medium focus:shadow-md">
    Zum Inhalt springen
  </a>

  <div className="min-h-dvh bg-canvas">
    <Sidebar {...alleProps} />                      {/* fixed, z-sidebar, hidden lg:flex */}
    <SidebarDrawer {...alleProps} />                {/* Radix Dialog, < lg */}
    <div className="lg:pl-[var(--sidebar-w)] transition-[padding] duration-[180ms] ease-soft print:pl-0">
      <main id="inhalt" tabIndex={-1}
            className="mx-auto w-full max-w-[1440px] px-4 pb-16 md:px-6 lg:px-8 print:!p-0">
        {children}
      </main>
    </div>
  </div>
</SidebarProvider>
```

Die Seite (das Fenster) scrollt, nicht `main`. Dadurch funktionieren `sticky top-0` am Seitenkopf und `sticky top-14` am Tabellenkopf ohne Sonderfälle, und der Druck bleibt einfach.

**Flackerfreier Zustand.** Als erstes Kind des zurückgegebenen Baums in `app/(dashboard)/layout.tsx` (nicht in `app/layout.tsx` – Marketing und Portal dürfen das Attribut nicht bekommen):

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `try{if(localStorage.getItem("fsapp.sidebar")==="collapsed")document.documentElement.dataset.sidebar="collapsed"}catch(e){}`,
  }}
/>
```

Die Breite kommt ausschließlich aus CSS (`w-[var(--sidebar-w)]`), nie aus React-State. Der Client-Context liest den Zustand in `useLayoutEffect` aus `document.documentElement.dataset.sidebar` und spiegelt ihn nur für Tooltips und `aria`. Jeder `localStorage`-Zugriff steht in `try/catch`.

### 3.4 Sidebar – Zustände und Maße

| | Offen | Eingeklappt | Drawer |
|---|---|---|---|
| Breite | 256 px | 68 px | 288 px (`max-w-[85vw]`) |
| Bedingung | ≥ 1024 px, Standard | ≥ 1024 px, Nutzerwahl | < 1024 px |
| Persistenz | `localStorage["fsapp.sidebar"] = "open"` | `… = "collapsed"` + `html[data-sidebar="collapsed"]` | keine, startet immer geschlossen |
| Umschalten | Toggle-Eintrag im Fuß, `⌘B` / `Ctrl+B` | dito | Menü-Button im Seitenkopf |
| Eintragshöhe | 32 px (`h-8`) | 40 × 40 px zentriert | 40 px (Touch) |
| Icon | 16 px | 18 px | 18 px |
| Label | 13/500 | `sr-only` + Tooltip rechts | 13/500 |
| Gruppentitel | `.nav-group` 11/600 | `h-px mx-3 my-2 bg-sidebar-border` | wie offen |
| Innenabstand x | `px-3` | `px-3` | `px-3` |

Es gibt **keine** automatische Einklapp-Regel zwischen 1024 und 1280 px. Eine Regel, eine Nutzerwahl.

Container:

```tsx
<aside
  aria-label="Hauptnavigation"
  className="sidebar fixed inset-y-0 left-0 z-sidebar hidden w-[var(--sidebar-w)] flex-col
             bg-sidebar text-sidebar-foreground transition-[width] duration-[180ms] ease-soft
             lg:flex print:hidden"
>
```

Zwischen Sidebar und Arbeitsfläche gibt es **keinen Rand und keinen Schatten** – die Trennung ist der Farbsprung von Tinte zu Warm-Hell.

### 3.5 Sidebar – Anatomie von oben nach unten (offen, 256 px)

```
┌── 256 px ──────────────────────────────────────┐
│ A  Fahrschul-Umschalter                  h 56  │  px-3, border-b border-sidebar-border
│    [Logo 28] Name 13/600                       │  Ort 11/400 sidebar-muted, ChevronsUpDown 14
├────────────────────────────────────────────────┤
│ B  Suche                       h 36  mx-3 mt-3 │  Button (kein Input), rechts kbd ⌘K
├────────────────────────────────────────────────┤
│ C  Navigation            flex-1, overflow-y    │  px-3 pb-2 pt-1, scrollbar-sidebar
│    ÜBERSICHT                            h 16   │  .nav-group, px-2 pb-1 pt-4 (erste Gruppe pt-2)
│  ▎ ▣ Leitstand                          h 32   │  aktiv: Fläche + 3-px-Balken links außen
│    ▣ Aufgaben                     (12)  h 32   │  Badge rechts, nur wenn `zaehler` gesetzt
│    ▣ Kommunikation                             │
│    AUSBILDUNG · TERMINE · FINANZEN             │
│    BETRIEB · AUSWERTUNG                        │
├────────────────────────────────────────────────┤  border-t border-sidebar-border
│ D  Fuß                            p-3 space-y-1│
│    [ + Neu                          ⌄ ]  h 36  │  bg-primary, weiß, Plus 15 + ChevronDown 14
│    ✦ Assistent                    ⌘J     h 32  │  Sparkles 16 in sidebar-bar
│    [Avatar 28] Vorname Nachname          h 44  │  Rolle 11 sidebar-muted, ChevronsUpDown 14
│    ⟨ Einklappen                     ⌘B   h 32  │  nur ≥ lg
└────────────────────────────────────────────────┘
```

**A – Fahrschul-Umschalter.** `h-14 px-3 flex items-center border-b border-sidebar-border`. Trigger: `h-10 w-full rounded-md px-2 gap-2.5 hover:bg-sidebar-hover data-[state=open]:bg-sidebar-hover`. Inhalt: `logoUrl` als `<img className="h-7 w-7 rounded-[6px] object-cover" alt="" />`, sonst `<Logo compact tone="dark" />`; zwei Zeilen Name (`text-13 font-semibold text-sidebar-active-foreground truncate`) und Ort (`text-2xs text-sidebar-muted truncate`); rechts `ChevronsUpDown` 14 px in `text-sidebar-muted`. Menü (`DropdownMenuContent align="start" sideOffset={4} className="w-64"`): Label mit Name/Ort; bei `fahrschulen.length > 1` der Abschnitt „Fahrschule wechseln" mit den bestehenden `fahrschuleWechseln`-Formularen und `Check` in `text-primary` bei `aktiveFahrschuleId`; bei `rolle === "chef"` der Eintrag „Einstellungen". Eingeklappt: nur das Logo in einem 44 × 44-Button, Tooltip „{Name} · {Ort}".

**B – Suche.** Ein `<button>`, kein Input:

```tsx
<button type="button" onClick={oeffnePalette}
  className="mx-3 mt-3 flex h-9 items-center gap-2 rounded-md bg-sidebar-hover px-2.5
             text-13 text-sidebar-muted ring-1 ring-inset ring-sidebar-border
             hover:ring-sidebar-muted/40 focus-visible:outline-none focus-visible:ring-2
             focus-visible:ring-sidebar-bar/70">
  <Search className="h-[15px] w-[15px]" />
  <span className="flex-1 text-left">Suchen …</span>
  <kbd className="kbd">⌘K</kbd>
</button>
```

Eingeklappt: 40 × 40-Icon-Button, Tooltip „Suchen · ⌘K".

**C – Navigation.**

```tsx
<nav className="flex-1 overflow-y-auto scrollbar-sidebar px-3 pb-2 pt-1">
  {bereicheFuer(rolle).map((gruppe) => (
    <div key={gruppe.key}>
      <p className="nav-group px-2 pb-1 pt-4 first:pt-2">{gruppe.label.toUpperCase()}</p>
      <ul className="space-y-0.5">
        {gruppe.items.map((item) => <SidebarItem key={item.href} item={item} />)}
      </ul>
    </div>
  ))}
</nav>
```

Ein Eintrag:

```tsx
<Link
  href={item.href}
  aria-current={aktiv ? "page" : undefined}
  data-active={aktiv}
  className="group relative flex h-8 items-center gap-2.5 rounded-md px-2 text-13 font-medium
             text-sidebar-foreground/90
             hover:bg-sidebar-hover hover:text-sidebar-active-foreground
             data-[active=true]:bg-sidebar-active data-[active=true]:text-sidebar-active-foreground
             data-[active=true]:before:absolute data-[active=true]:before:-left-3
             data-[active=true]:before:top-1/2 data-[active=true]:before:h-5
             data-[active=true]:before:w-[3px] data-[active=true]:before:-translate-y-1/2
             data-[active=true]:before:rounded-r-full data-[active=true]:before:bg-sidebar-bar
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset
             focus-visible:ring-sidebar-bar/70"
>
  <Icon className="h-4 w-4 shrink-0 text-sidebar-muted transition-colors
                   group-hover:text-sidebar-foreground
                   group-data-[active=true]:text-sidebar-active-foreground"
        strokeWidth={aktiv ? 2 : 1.75} />
  <span className="truncate">{item.label}</span>
  {badge != null && (
    <span data-tone={ton}
      className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full
                 bg-sidebar-badge px-1.5 text-2xs font-semibold tabular-nums text-sidebar-foreground
                 data-[tone=danger]:bg-destructive data-[tone=danger]:text-white">
      {badge > 99 ? "99+" : badge}
    </span>
  )}
</Link>
```

Der Balken sitzt bei `-left-3` bündig an der Sidebar-Außenkante (die `nav` hat `px-3`). Aktiv-Erkennung ausschließlich über `aktiverBereich(bereicheFuer(rolle), pathname)`; der längste Präfix gewinnt, deshalb markiert `/fahrlehrer/rollen` „Rollen & Rechte" und nicht „Fahrlehrer", und `/schueler/neu` markiert „Schüler". Nach dem Mounten ruft die Sidebar `scrollIntoView({ block: "nearest" })` auf dem aktiven Eintrag.

**Zähler-Badges.** `DashboardShell` und `Sidebar` bekommen die optionale Prop
`zaehler?: Partial<Record<"aufgaben" | "rechnungen_ueberfaellig", number>>`.
`app/(dashboard)/layout.tsx` übergibt sie in dieser Etappe **nicht** – `getKontext()` liefert keine Zahlen, und ein zusätzlicher Query im Layout wäre ein neuer Datenzugriff. Bis eine Zahl ohne Extrakosten anfällt, gibt es keine Badges und keinen Platzhalter. Ton: `aufgaben` neutral (`bg-sidebar-badge`), `rechnungen_ueberfaellig` rot (`data-tone="danger"`).

**D – Fuß.** `mt-auto border-t border-sidebar-border p-3 space-y-1`.

- **„+ Neu"** – `DropdownMenuTrigger` als `h-9 w-full rounded-md bg-primary px-3 text-13 font-semibold text-primary-foreground hover:bg-primary-hover flex items-center gap-2`, `Plus` 15 px links, rechts `ChevronDown` 14 px in `opacity-70`. Menü `side="top" align="start" className="w-56"` mit exakt den vier Einträgen aus `top-bar.tsx`: Schüler anlegen (`/schueler/neu`, `UserPlus`), Termin planen (`/kalender`, `CalendarPlus`), Rechnung erstellen (`/rechnungen/neu`, `FilePlus2`), Aufgabe erfassen (`/aufgaben`, `ListPlus`). Rollenfilter: ein Eintrag erscheint nur, wenn sein Ziel-`href` in `bereicheFuer(rolle)` vorkommt. Eingeklappt: 40 × 40-Primär-Icon-Button, Tooltip „Neu".
- **KI-Assistent** – Eintrag im Nav-Stil (`h-8`), `Sparkles` 16 px in `text-sidebar-bar`, Label „Assistent", rechts `<kbd className="kbd">⌘J</kbd>`. Öffnet das Assistenten-Sheet. `data-state="open"` → `bg-sidebar-active`.
- **Nutzer** – `DropdownMenuTrigger` `h-11 w-full rounded-md px-2 gap-2.5 hover:bg-sidebar-hover`: Avatar 28 px (`bg-sidebar-badge text-sidebar-foreground text-2xs font-semibold`, Initialen über `initialen(vorname, nachname)`), zwei Zeilen `{vorname} {nachname}` (13/500, `text-sidebar-active-foreground`) und `ROLLEN[rolle]` (11, `text-sidebar-muted`), rechts `ChevronsUpDown` 14 px. Menü `side="top" align="start" className="w-60"`: Label (Name + `email ?? ROLLEN[rolle]`), Separator, „Einstellungen" (nur `chef` → `/einstellungen`), „Hilfe" (`/hilfe`), Separator, „Abmelden" (Formular `abmelden`, `text-destructive-text hover:bg-destructive-soft`).
- **Einklappen** – letzter Eintrag im Nav-Stil, `PanelLeftClose` / `PanelLeftOpen` 16 px, Label „Einklappen", `text-sidebar-muted`, rechts `kbd ⌘B`. Nur `≥ lg` sichtbar.

### 3.6 Eingeklappt (68 px)

Alle Einträge werden zu 40 × 40-Zielen, horizontal zentriert (`h-10 w-10 mx-auto justify-center px-0`), Labels `sr-only`. Der Aktiv-Balken bleibt an `-left-3`. Gruppentitel werden zu `h-px mx-3 my-2 bg-sidebar-border` zwischen den Gruppen (nicht vor der ersten) – die Gruppierung bleibt sichtbar. Ein Zähler wird zum 16-px-Kreis oben rechts am Icon (`absolute right-1 top-1 h-4 min-w-4 px-1 text-[10px]`).

**Tooltips** (`components/ui/tooltip.tsx`, neu, auf `@radix-ui/react-tooltip`): `side="right" sideOffset={10} delayDuration={150}`, Optik `z-popover rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-md`. Inhalt: Label, bei vorhandenem Kürzel zusätzlich `kbd`. Tooltips werden **nur** im eingeklappten Desktop-Zustand gerendert (`collapsed ? <Tooltip>…</Tooltip> : children`) – sonst läse ein Screenreader jedes Label doppelt. `TooltipProvider` wird genau einmal im `SidebarProvider` montiert. Jeder Icon-only-Link trägt zusätzlich `aria-label`.

### 3.7 Drawer (< 1024 px)

Radix `Dialog`. Content:

```tsx
className="fixed inset-y-0 left-0 z-sheet flex w-[288px] max-w-[85vw] flex-col bg-sidebar p-0
           data-[state=open]:animate-in data-[state=open]:slide-in-from-left
           data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left duration-overlay"
```

Overlay `bg-foreground/45`. Inhalt = identisches Sidebar-Innere im offenen Zustand, plus `X`-Button 36 × 36 oben rechts im Kopf. Geöffnet wird er über den Menü-Button in der Seiten-Kopfzeile. Er schließt bei Routenwechsel (`useEffect` auf `usePathname`), `Esc` und Overlay-Klick; Fokusfalle und Fokusrückgabe übernimmt Radix. Es gibt **keine** Bottom-Bar mehr, und `pb-20` in der Shell entfällt.

### 3.8 Seitenkopf (56 px)

`components/shared/page-header.tsx` bleibt eine **Server-Komponente**. Der Breadcrumb wird nicht aus dem Pfad geraten, sondern übergeben – so bleiben alle 26 bestehenden Aufrufe gültig, ohne dass `"use client"` durch den Baum wandert.

```ts
interface PageHeaderProps {
  title: string;
  description?: string;                              // Meta neben dem Titel, ≤ 40 Zeichen
  eyebrow?: string;                                  // Kompat: wird zur ersten Breadcrumb-Stufe
  breadcrumb?: { label: string; href?: string }[];   // NEU – explizite Stufen
  backHref?: string;                                 // NEU – Zurück-Chevron links
  actions?: React.ReactNode;                         // NEU – Alias für children
  notifications?: boolean;                           // NEU – Default true
  notificationCount?: number;                        // NEU – ohne Wert kein Punkt
  children?: React.ReactNode;
  className?: string;
}
```

```tsx
<header
  data-page-header
  className={cn(
    "sticky top-0 z-header -mx-4 mb-5 flex h-14 items-center gap-3 border-b border-transparent",
    "bg-background px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8",
    "data-[scrolled=true]:border-border print:static print:border-0",
    className,
  )}
>
  <MobileMenuButton className="lg:hidden" />                       {/* 36×36 ghost, Menu 20 */}
  {backHref && <BackLink href={backHref} />}                       {/* 36×36 ghost, ChevronLeft 18 */}

  <nav aria-label="Brotkrumen" className="flex min-w-0 items-center gap-1.5">
    {stufen.map((s) => (
      <Fragment key={s.label}>
        {s.href
          ? <Link href={s.href} className="hidden truncate text-13 text-muted-foreground hover:text-foreground sm:block">{s.label}</Link>
          : <span className="hidden truncate text-13 text-muted-foreground sm:block">{s.label}</span>}
        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-foreground-tertiary sm:block" aria-hidden />
      </Fragment>
    ))}
    <h1 className="truncate text-base font-semibold leading-6 text-foreground">{title}</h1>
    {description && (
      <span className="hidden shrink-0 truncate text-13 text-muted-foreground lg:block">· {description}</span>
    )}
  </nav>

  <div data-actions className="ml-auto flex shrink-0 items-center gap-2 print:hidden">
    {actions ?? children}
    <span className="mx-0.5 hidden h-5 w-px bg-border sm:block" />
    <NotificationsButton count={notificationCount} />              {/* Link → /erinnerungen */}
  </div>
</header>
```

**Regeln.**

1. Höhe exakt 56 px, eine Zeile. Kein zweites Navigationsband, keine Kontext-Tabs im Kopf. Unterbereiche sind Sidebar-Einträge oder `Tabs` als erstes Element im Inhalt.
2. Maximal drei Stufen: `Bereich › Liste › Detail`. Der `title` ist immer die letzte, nicht verlinkte Stufe und zugleich `<h1>`.
3. `eyebrow` wird als erste Stufe interpretiert, wenn kein `breadcrumb` übergeben ist. Die 17 bestehenden `eyebrow`-Aufrufe funktionieren unverändert.
4. Auf Listenseiten mit eindeutigem Titel (Kalender, Einstellungen, Leitstand) entfällt der Breadcrumb ganz – nie den Titel doppeln.
5. Unter `sm` bleiben nur Zurück-Chevron und Titel; Stufen und `description` sind ausgeblendet.
6. `description` ist Meta, kein Erklärsatz: maximal 40 Zeichen, sichtbar ab `lg`. Längere Erklärungen gehören in die Panel-Beschreibung.
7. Aktionen: höchstens ein `variant="default"`-Button, dazu bis zu zwei `outline`/`ghost`. Alles weitere in ein `⋯`-Menü (`MoreHorizontal`). Unter `sm` werden Textbuttons zu Icon-Buttons mit `aria-label`.
8. Auf Formularseiten („neu"/„bearbeiten") zeigt der Kopf `backHref` und „Abbrechen" (`ghost`). „Speichern" liegt **nur** in der klebenden Speichern-Leiste unten.
9. `NotificationsButton`: 36 × 36 `ghost` mit `Bell` 18 px als `Link` auf `/erinnerungen`, `aria-label="Erinnerungen"`. Ein 8-px-Punkt `bg-destructive` oben rechts erscheint nur, wenn `notificationCount` übergeben wurde – in dieser Etappe nirgends.
10. **Scrolltrennlinie:** `components/shared/header-sentinel.tsx` ist ein `h-px`-Element direkt über dem Header; ein `IntersectionObserver` setzt `data-scrolled="true"` auf dem Header, sobald es den Viewport verlässt. Kein `backdrop-blur`, keine Transparenz.
11. Klebende Tabellenköpfe innerhalb der Seite verwenden `top-14`.

### 3.9 Inhaltsraster

| Regel | Wert |
|---|---|
| Container | `mx-auto w-full max-w-[1440px]` |
| Gutter | `px-4 md:px-6 lg:px-8` |
| Unterer Rand | `pb-16`, bei Seiten mit Speichern-Leiste `pb-24` |
| Zwei Spalten Leitstand | `grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]` |
| Master/Detail | `grid gap-4 xl:grid-cols-[minmax(360px,2fr)_minmax(0,3fr)]` (≈ 40/60) |
| KPI-Zeile | `grid grid-cols-2 gap-4 lg:grid-cols-4` (bei 3 Karten `lg:grid-cols-3`) |
| Einstellungen | `grid gap-8 lg:grid-cols-[224px_minmax(0,1fr)]` |
| Formular | `max-w-[880px] space-y-6` |

Der Seitenkopf bricht über die negativen Margins (`-mx-4 md:-mx-6 lg:-mx-8`) bis zur Gutter-Kante aus; die klebende Speichern-Leiste ebenso.

### 3.10 Tastatur und Fokus

Tab-Reihenfolge: Skip-Link → Fahrschul-Umschalter → Suche → Nav-Einträge in Gruppenreihenfolge → „+ Neu" → Assistent → Nutzer → Einklappen → Menü-/Zurück-Button im Kopf → Seitenaktionen → Inhalt.

| Kürzel | Wirkung |
|---|---|
| `⌘K` / `Ctrl+K` | Kommandopalette öffnen |
| `⌘B` / `Ctrl+B` | Sidebar ein-/ausklappen |
| `⌘J` / `Ctrl+J` | KI-Assistent öffnen/schließen |
| `/` | Suchfeld der aktiven Datentabelle fokussieren |
| `.` | Zeilenmenü der fokussierten Tabellenzeile öffnen |
| `Esc` | schließt genau die oberste Ebene |
| `⌘S` | löst die Speichern-Leiste aus, wenn vorhanden |

Globale Einzeltasten (`/`, `.`) feuern nur, wenn `document.activeElement` kein `input`, `textarea`, `select` oder `contenteditable` ist und kein Dialog offen ist. Der Listener sitzt **einmal** im `SidebarProvider`, nicht verteilt.

Fokusring überall: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`. Der Ring läuft mit **voller Deckkraft** – `ring-ring` erreicht 3,12:1 auf der Arbeitsfläche `#F7F7F5` und 3,35:1 auf weißen Panels und erfüllt damit die 3:1-Schwelle aus WCAG 2.2 für Nicht-Text-Indikatoren; eine abgesenkte Deckkraft (`/40`) fällt auf rund 1,6:1 und ist unzulässig. In der Sidebar stattdessen `focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-bar/70` – ein heller Ring auf Tinte wäre unsichtbar (5,08:1).

### 3.11 Mobil (< 1024 px)

- Navigation ausschließlich über den Drawer, geöffnet aus dem Seitenkopf. Keine Bottom-Bar.
- Sheets werden zu Bottom-Sheets: `inset-x-0 bottom-0 top-auto h-[92dvh] rounded-t-2xl`, Eingabefelder respektieren `env(safe-area-inset-bottom)`.
- Tabellen: Spalten nach `hideBelow` ausblenden, sonst `mobileCard` (Karten-Liste). Zeilenmenüs sind auf Geräten ohne Hover immer sichtbar (`@media (hover: none)`).
- Touch: `size="sm"`-Buttons bekommen unter `md` per `@media (hover:none)` `min-h-[40px]`; Tabellenzeilen bleiben 44 px; Drawer-Einträge 40 px.
- Master/Detail wird zur Einzelansicht mit `backHref` im Kopf – exakt das heutige `?id=`-Verhalten, nur zentral in `SplitView`.

---

## 4. Komponenten-Katalog

**Konventionen für alles in diesem Kapitel.** Icons ausschließlich `lucide-react`; 15 px in Buttons, 16 px in Controls und Menüs, 18 px in Sidebar und Kopfzeile, 20 px in Leerzuständen; `strokeWidth 1.75` (aktive Sidebar-Icons 2, Häkchen 2,5). Fokus überall wie in 3.10. Übergänge 120–150 ms. Keine `dark:`-Klasse. Bestehende Props und Varianten bleiben ausnahmslos gültig – es werden nur Werte geändert und Props **hinzugefügt**, damit die 35 Seiten während des Umbaus jederzeit kompilieren.

### 4.1 `components/ui/button.tsx`

Props unverändert (`variant`, `size`, `asChild`), zwei optionale Props kommen dazu.

```
base: inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md
      text-13 font-medium leading-none transition-colors duration-fast ease-soft
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
      focus-visible:ring-offset-2 focus-visible:ring-offset-background
      disabled:pointer-events-none disabled:opacity-45
      [&_svg]:pointer-events-none [&_svg]:size-[15px] [&_svg]:shrink-0
```

| variant | Klassen | Einsatz |
|---|---|---|
| `default` | `bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed` | genau ein Stück pro Sichtbereich |
| `soft` **(neu)** | `bg-primary-soft text-primary-text hover:bg-primary-soft-strong/60 active:bg-primary-soft-strong` | weiche Primäraktion in Panels und Leerzuständen |
| `outline` | `border border-border-strong bg-card text-foreground shadow-xs hover:bg-surface-muted hover:border-border-hover active:bg-border` | Standard-Sekundäraktion (65 Aufrufe) |
| `secondary` | `bg-secondary text-foreground hover:bg-border active:bg-border-strong/60` | neutraler Grau-Button – **nicht mehr Tinte** (14 Aufrufe) |
| `ghost` | `text-foreground-secondary hover:bg-foreground/[0.05] hover:text-foreground` | Toolbars, Icon-Buttons, Kopfzeile |
| `destructive` | `bg-destructive text-destructive-foreground hover:bg-destructive-text` | endgültige Aktion im Dialog |
| `danger-soft` **(neu)** | `bg-destructive-soft text-destructive-text hover:bg-destructive/15` | Löschen-Trigger außerhalb von Dialogen |
| `success` | `bg-success text-success-foreground hover:bg-success-text` | bleibt für 9 Aufrufe, sparsam |
| `link` | `h-auto px-0 text-primary-text underline-offset-4 hover:underline` | inline im Text |

| size | Klassen | px |
|---|---|---|
| `default` | `h-9 px-3.5` | 36 |
| `lg` | `h-9.5 px-4` | 38 – Formular-Primär neben Inputs, Speichern-Leiste, Auth |
| `sm` | `h-8 px-2.5` | 32 – Toolbars, Panel-Köpfe, Tabellen (54 Aufrufe) |
| `xs` **(neu)** | `h-7 px-2 text-xs` | 28 – inline in Zellen |
| `icon` | `h-9 w-9` | 36 |
| `icon-sm` | `h-8 w-8` | 32 |
| `icon-xs` **(neu)** | `h-7 w-7` | 28 |

Neue optionale Props: `loading?: boolean` (zeigt `Loader2` mit `animate-spin` links, setzt `aria-busy` und `disabled`), `shortcut?: string` (rendert `<kbd className="kbd ml-1.5">` rechts, nur ab `md`).

```tsx
<Button asChild><Link href="/schueler/neu"><Plus /> Neuer Schüler</Link></Button>
<Button variant="outline" size="sm"><Download /> Export</Button>
<Button variant="ghost" size="icon-sm" aria-label="Mehr"><MoreHorizontal /></Button>
```

### 4.2 `input.tsx`, `textarea.tsx`, `select.tsx`, `label.tsx`, neu `field.tsx`

**Input** – Rahmen bleibt ein Rahmen (kein Ring-Wechsel), nur Höhe, Schrift und Tokens ändern sich:

```
flex h-9.5 w-full rounded-md border border-input bg-card px-3 text-13 text-foreground
transition-[border-color,box-shadow] duration-fast ease-soft
file:border-0 file:bg-transparent file:text-13 file:font-medium
placeholder:text-foreground-disabled
hover:border-border-hover
focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20
aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-[3px] aria-[invalid=true]:ring-destructive/15
disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-foreground-disabled
```

Der Rohwert `hover:border-[hsl(198_12%_70%)]` entfällt zugunsten von `border-hover`. Neue optionale Props: `leadingIcon?: LucideIcon` (16 px links, Input bekommt `pl-9`), `trailing?: React.ReactNode` (Einheit „€", „Min", `pr-9`), `inputSize?: "sm" | "default"` (`sm` = `h-8 px-2.5` für Filterleisten).

**Textarea** – gleiche Optik, `min-h-[96px] py-2.5 leading-5 resize-y`.

**Select** – Trigger identisch zum Input (`h-9.5`), Chevron 16 px `text-foreground-tertiary`; der Rohwert `hover:border-[hsl(205_18%_74%)]` wird `hover:border-border-hover`. `SelectContent`: `z-popover rounded-lg bg-popover p-1 shadow-md` ohne `border`. `SelectItem`: `h-8 rounded-sm pl-8 pr-2 text-13 focus:bg-accent data-[state=checked]:font-medium`, Häkchen `text-primary`. Neue Prop `triggerSize?: "sm" | "default"`.

**Label** – `block text-xs font-medium leading-4 text-foreground-secondary`, steht **über** dem Feld mit `mb-1.5`. Neue optionale Props: `required?: boolean` (hängt `<span className="ml-0.5 text-destructive-text">*</span>` an), `hint?: string` (rechts, `text-xs text-foreground-tertiary`).

**`components/ui/field.tsx` (neu)** – das Standardgerüst für jedes Formularfeld:

```ts
interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;          // 12 px tertiär unter dem Feld
  error?: string;         // ersetzt hint, 12 px destructive-text, role="alert", AlertCircle 12
  required?: boolean;
  className?: string;
  children: React.ReactElement;
}
```

`Field` verdrahtet `aria-invalid` und `aria-describedby` per `cloneElement` auf das Kind, wenn es ein `input`, `select` oder `textarea` ist.

```tsx
<Field label="E-Mail" htmlFor="email" hint="Für Portal-Zugang und Rechnungen." required>
  <Input id="email" name="email" type="email" defaultValue={s.email ?? ""} />
</Field>
```

**Checkbox** – `h-4 w-4 rounded-sm border border-border-strong bg-card hover:border-border-hover data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary`; Häkchen 12 px `strokeWidth 3`, `indeterminate` zeigt `Minus` (nötig für „alle auswählen" in Tabellen).

**Switch** – Props unverändert (`checked`, `onCheckedChange`, `disabled`, `aria-label`). `h-5 w-9 rounded-full`, Track `bg-border-strong`, aktiv `bg-primary`, Knopf 16 px weiß mit `shadow-xs`, Verschiebung 2 → 18 px.

**Progress** – Track `h-1.5 rounded-full bg-surface-muted`, Indikator `bg-primary`. `indicatorClassName` bleibt (wird in der Schülerakte für `bg-success` genutzt). Neue optionale Prop `tone?: "primary" | "success" | "warning" | "destructive"`.

**Separator** – unverändert (`bg-border`).

**Skeleton** – `animate-soft-pulse rounded-md bg-surface-muted` (unverändert). Zusätzlich exportiert dieselbe Datei `SkeletonTable({ rows = 8 })` (44-px-Zeilen) und `SkeletonKpiRow({ n = 4 })` für `app/(dashboard)/loading.tsx`.

**Avatar** – Root-Größe über neue Prop `size?: "xs" | "sm" | "md" | "lg" | "xl"` (20/24/28/36/48, Default `md` = 28). Fallback wird neutral: `bg-surface-muted text-foreground-secondary text-xs font-semibold` – Farbe gibt es nur beim `SchuelerAvatar`, weil sie dort Daten trägt.

### 4.3 `components/ui/badge.tsx` – StatusBadge

Die Varianten heißen wie bisher, damit alle 30 Aufrufe kompilieren; aus dem Punkt-mit-Text wird eine Pille mit Punkt. Der `[&_i]`-Mechanismus bleibt erhalten, damit die Klassen aus `lib/constants.ts` weiterhin nur den Punkt färben.

```
base: inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2
      text-xs font-medium leading-none
      [&_i]:h-1.5 [&_i]:w-1.5 [&_i]:shrink-0 [&_i]:rounded-full
```

| variant | Klassen |
|---|---|
| `default` | `bg-primary-soft text-primary-text [&_i]:bg-primary` |
| `success` | `bg-success-soft text-success-text [&_i]:bg-success` |
| `warning` | `bg-warning-soft text-warning-text [&_i]:bg-warning` |
| `destructive` | `bg-destructive-soft text-destructive-text [&_i]:bg-destructive` |
| `info` **(neu)** | `bg-info-soft text-info-text [&_i]:bg-info` |
| `secondary` | `bg-surface-muted text-foreground-secondary [&_i]:bg-foreground-tertiary` |
| `outline` | `bg-card text-foreground-secondary shadow-[0_0_0_1px_hsl(var(--border-strong))] [&_i]:bg-foreground-tertiary` |
| `solid` | `bg-foreground text-background [&_i]:hidden` |
| `neutral` **(neu)** | `bg-transparent px-0 text-foreground-secondary [&_i]:bg-foreground-tertiary` – nur Punkt + Text, für sehr dichte Tabellen |

Neue optionale Props: `dot?: boolean` (Default `true`; `false` blendet das `<i>` aus), `size?: "sm"` (18 px Höhe, `text-2xs`).

`lib/constants.ts` bekommt je Status-Map zusätzlich ein `variant`-Feld; `badge` und `dot` bleiben erhalten, weil Kalender und Punkte sie weiter nutzen. `bg-blue-600` und `bg-indigo-600` in `FAHRSTUNDE_TYPEN` werden zu `bg-info` bzw. `bg-primary` – Tailwind-Rohfarben sind in v3 verboten.

### 4.4 `components/ui/card.tsx` und neu `components/ui/panel.tsx`

**Card** (40 Dateien) – API unverändert, aus der Haarlinie wird der Schatten:

| Teil | v3-Klassen |
|---|---|
| `Card` | `rounded-xl bg-card text-card-foreground shadow-panel` (**kein `border`**) |
| `CardHeader` | `flex items-start justify-between gap-3 px-4 pb-2 pt-3.5` |
| `CardTitle` | `text-sm font-semibold leading-5 text-foreground` (14/600) |
| `CardDescription` | `text-xs text-muted-foreground` |
| `CardContent` | `px-4 pb-4 pt-0` |
| `CardFooter` | `flex items-center gap-2 border-t border-border px-4 py-3` |

`CardHeader` wird von `flex-col` zu `flex-row`. Damit bestehende Aufrufe mit Titel **und** Beschreibung nicht nebeneinander landen, wrappt `CardHeader` seine Kinder intern: alles außer dem letzten Element geht in einen `<div className="min-w-0 space-y-0.5">`, wenn mehr als ein Kind vorhanden ist und das letzte Kind ein Element mit `data-card-action` ist. Praktisch heißt das: Aktionen werden mit `<div data-card-action>…</div>` markiert; ohne diese Markierung bleibt das Verhalten wie bisher untereinander. Neue optionale Props auf `Card`: `padding?: "none" | "dense" | "default"`, `interactive?: boolean`.

**Panel (neu)** – die bevorzugte Hülle für alle neuen Seiten:

```ts
interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  title?: React.ReactNode;        // 14/600
  description?: React.ReactNode;  // 12 muted, hinter dem Titel mit „·"
  actions?: React.ReactNode;      // rechts im Kopf: Link „Alle", Button size="sm", Filter
  footer?: React.ReactNode;
  padding?: "none" | "dense" | "default";  // default = p-4; none = p-0 für Tabellen/Listen
  as?: "section" | "div";                  // default "section"
}
```

Kopf: `flex h-12 items-center justify-between gap-3 px-4`, plus `border-b border-border` genau dann, wenn `padding="none"` (die Tabelle sitzt direkt darunter). Ohne `title` gibt es keinen Kopf. Zusätzlich exportiert die Datei `PanelSection` (`px-4 py-3 border-b border-border last:border-0`, Titel als `.label-caps`).

```tsx
<Panel
  title="Überfällig"
  description={`${ueberfaellig.length} Rechnungen`}
  actions={<Button asChild variant="link" size="sm"><Link href="/rechnungslauf">Mahnlauf</Link></Button>}
  padding="none"
>
  <DataTable … />
</Panel>
```

### 4.5 `components/ui/table.tsx` – Primitives

Die Primitives werden heute von **keiner** Datei importiert und sind damit frei umzubauen. Exporte bleiben identisch.

| Teil | v3-Klassen |
|---|---|
| `Table` | Wrapper `relative w-full overflow-x-auto scrollbar-thin` + `table` `w-full caption-bottom text-13 tabular-nums` |
| `TableHeader` | `sticky top-0 z-sticky bg-surface-muted [&_tr]:border-b [&_tr]:border-border` |
| `TableHead` | `h-10 px-3 text-left align-middle text-xs font-medium text-foreground-secondary whitespace-nowrap first:pl-4 last:pr-4 [&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pr-0` – **Satzschrift, keine Versalien** |
| `TableBody` | `[&_tr:last-child]:border-0` |
| `TableRow` | `h-11 border-b border-border transition-colors duration-fast hover:bg-surface-muted/70 data-[state=selected]:bg-primary-soft/60 data-[state=selected]:shadow-[inset_3px_0_0_hsl(var(--primary))]` |
| `TableCell` | `h-11 px-3 align-middle first:pl-4 last:pr-4 [&:has([role=checkbox])]:pr-0` |
| `TableFooter` | `border-t border-border bg-surface-muted font-medium [&>tr]:last:border-b-0` |
| `TableCaption` | `mt-3 text-xs text-muted-foreground` |

Neue optionale Props: `TableHead` erhält `sortable?: boolean`, `sorted?: "asc" | "desc" | false`, `onSort?: () => void`, `align?: "left" | "right" | "center"` (rendert einen `<button>` mit `aria-sort` und `ArrowUp`/`ArrowDown` 14 px; unsortiert erscheint `ArrowUpDown` nur bei Hover). `TableCell` erhält `align`, `numeric?: boolean` (`text-right tabular-nums`), `muted?: boolean`.

### 4.6 `components/ui/tabs.tsx`

`TabsList`: `flex h-10 w-full items-end gap-5 border-b border-border overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`.
`TabsTrigger`: `relative -mb-px inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap px-0.5 text-13 font-medium text-muted-foreground transition-colors duration-fast hover:text-foreground focus-visible:outline-none focus-visible:text-foreground disabled:pointer-events-none disabled:opacity-50 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent after:transition-colors data-[state=active]:text-foreground data-[state=active]:after:bg-primary`.
`TabsContent`: `mt-5 animate-fade-in focus-visible:outline-none`.

Neue optionale Props: `count?: number` auf `TabsTrigger` (rendert `<span className="rounded-full bg-surface-muted px-1.5 text-2xs tabular-nums text-foreground-secondary data-[state=active]:bg-primary-soft data-[state=active]:text-primary-text">`), `variant?: "underline" | "pills"` auf `TabsList`. `pills` ist die Segment-Steuerung (Tag/Woche, Zeiträume): Liste `h-8 w-auto rounded-md border-0 bg-surface-muted p-0.5 gap-0.5`, Trigger `h-7 rounded-sm px-2.5 text-xs after:hidden data-[state=active]:bg-card data-[state=active]:shadow-xs data-[state=active]:text-foreground`.

Segmente sind **nie** schwarz gefüllt.

### 4.7 `components/ui/dialog.tsx`

Overlay `z-dialog bg-foreground/45`, kein Blur. Content:

```
fixed left-1/2 top-1/2 z-dialog grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2
gap-0 rounded-2xl bg-card p-0 shadow-lg
```

| Teil | Klassen |
|---|---|
| `DialogHeader` | `flex flex-col space-y-1 px-5 pb-3 pr-14 pt-5 text-left` |
| `DialogBody` **(neu)** | `max-h-[70dvh] overflow-y-auto px-5 pb-5 space-y-4` |
| `DialogFooter` | `flex flex-col-reverse gap-2 rounded-b-2xl border-t border-border bg-surface-muted/50 px-5 py-3 sm:flex-row sm:justify-end` |
| `DialogTitle` | `text-base font-semibold leading-6 text-foreground` |
| `DialogDescription` | `text-13 text-muted-foreground` |
| Schließen-Kreuz | `absolute right-4 top-4 h-8 w-8 rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground` |

**Kompatibilität.** Bisher lag `p-5` auf dem Content selbst; Header und Footer hatten keine eigene Polsterung. Damit bestehende Dialoge (`LoeschenDialog`, `KiLernstatusDialog` …) nicht randlos werden, bekommt `DialogContent` die Fallback-Regel `[&>*:not([data-slot])]:px-5 [&>*:not([data-slot])]:first:pt-5 [&>*:not([data-slot])]:last:pb-5`; `DialogHeader`, `DialogBody` und `DialogFooter` setzen `data-slot` und bringen ihre Polsterung selbst mit. Bestehende `className="max-w-md"`-Aufrufe funktionieren weiter.

Neue Prop `size?: "sm" | "md" | "lg" | "xl"` → `max-w-md` (420) / `max-w-lg` (512, Default) / `max-w-2xl` (720) / `max-w-4xl` (960). `⌘Enter` löst den Button mit `data-primary` im Footer aus.

### 4.8 `components/ui/sheet.tsx` (neu) – SidePanel / Drawer rechts

Auf `@radix-ui/react-dialog`. Das ist der Ort für Detailansichten, Termin-Details und den KI-Assistenten.

```ts
<Sheet open onOpenChange modal={true}>
  <SheetContent side="right" size="md" title="Fahrstunde" description="Di 14:00 · 90 Min"
                actions={<Button size="sm">Speichern</Button>}>
    <SheetBody>…</SheetBody>
    <SheetFooter>…</SheetFooter>
  </SheetContent>
</Sheet>
```

| Prop | Werte |
|---|---|
| `side` | `"right"` (Default) · `"left"` (nur Mobil-Drawer) |
| `size` | `"sm"` 400 · `"md"` 520 (Default) · `"lg"` 720 · `"xl"` 960 |
| `modal` | `true` (Default); `false` nur für den KI-Assistenten |
| `title`, `description`, `actions` | im Kopf |

```
Content: fixed inset-y-0 right-0 z-sheet flex w-full max-w-full flex-col bg-card shadow-lg
         sm:w-[400px] md:w-[520px] …  (je size)
         data-[state=open]:animate-in data-[state=open]:slide-in-from-right
         data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-overlay
Overlay: z-sheet bg-foreground/35
Kopf:    flex h-14 shrink-0 items-center gap-3 border-b border-border px-5
         (Titel text-base/600, Beschreibung text-13 tertiär, Aktionen rechts, X 36×36 ganz rechts)
Body:    flex-1 overflow-y-auto px-5 py-4 scrollbar-thin   (p-0 erlaubt für Tabs/Listen)
Fuß:     sticky bottom-0 shrink-0 border-t border-border bg-card px-5 py-3 flex justify-end gap-2
```

Bündig ohne Radius. Unter `sm` wird daraus ein Bottom-Sheet (`inset-x-0 bottom-0 top-auto h-[92dvh] rounded-t-2xl`). Enthält der Body `Tabs`, klebt die `TabsList` mit `sticky top-0 z-sticky bg-card px-5`.

### 4.9 `dropdown-menu.tsx`, neu `popover.tsx`, neu `tooltip.tsx`

**DropdownMenu** – Content `z-popover min-w-[11rem] overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md` (**kein `border`** mehr). Item `h-8 gap-2 rounded-sm px-2 text-13 focus:bg-accent [&_svg]:size-4 [&_svg]:text-foreground-tertiary`. Neue Prop `variant?: "default" | "danger"` auf `DropdownMenuItem` → `text-destructive-text focus:bg-destructive-soft [&_svg]:text-destructive`. Label `px-2 py-1.5 text-xs font-medium text-muted-foreground`. `DropdownMenuShortcut` rendert `<kbd className="kbd">`.

**Popover (neu, `@radix-ui/react-popover` liegt bereits im `package.json` und wird bisher nirgends importiert)** – Content `z-popover rounded-lg bg-popover p-2 shadow-md`. Wird von `FilterChip` und der Spaltenfilterung genutzt.

**Tooltip (neu)** – siehe 3.6.

### 4.10 `components/ui/sonner.tsx`

Die 3-px-Farbkante links ist ein v2-Merkmal und entfällt. Die Typfarbe trägt nur noch das Icon.

```ts
toastOptions: {
  duration: 3500,
  classNames: {
    toast: "group toast !font-sans !rounded-lg !border-0 !bg-card !text-foreground !shadow-lg !ring-1 !ring-black/[.06] !py-3 !pl-4 !pr-3",
    title: "!text-13 !font-medium !text-foreground",
    description: "!text-xs !text-muted-foreground",
    actionButton: "!bg-primary !text-primary-foreground !rounded-md !h-7 !px-2.5 !text-xs !font-medium",
    cancelButton: "!bg-surface-muted !text-foreground-secondary !rounded-md !h-7 !px-2.5 !text-xs !font-medium",
    closeButton: "!border-border !bg-card !text-muted-foreground hover:!bg-surface-muted",
    success: "[&_svg]:!text-success",
    error:   "[&_svg]:!text-destructive",
    warning: "[&_svg]:!text-warning",
    info:    "[&_svg]:!text-info",
    loading: "[&_svg]:!text-primary",
  },
}
```

`position="bottom-right"` in `app/layout.tsx`. `richColors` bleibt aus.

---

### 4.11 `components/shared/kpi-card.tsx` (neu) + `stat-card.tsx` als Hülle

```ts
interface KpiCardProps {
  label: string;                       // 12/500 muted, oben
  value: React.ReactNode;              // text-kpi (22/600) tabular; size="lg" → text-kpi-lg
  sub?: React.ReactNode;               // Kontextzeile: „12 Rechnungen · fällig ≤ 30 Tage"
  delta?: {
    value: number;
    unit?: "percent" | "currency" | "absolute";
    label?: string;                    // „vs. Vormonat"
    invert?: boolean;                  // true = weniger ist besser (Überfällig, Ausfälle)
  };
  trend?: number[];                    // 6–30 Werte → Sparkline 72 × 24 px
  tone?: "neutral" | "success" | "warning" | "destructive" | "info";
  href?: string;                       // ganze Karte klickbar
  size?: "default" | "lg";
  loading?: boolean;
  className?: string;
}
```

Optik: `Panel`-Fläche (`rounded-xl bg-card shadow-panel`), `p-4`, Mindesthöhe 104 px (`lg`: 128 px).

- Zeile 1: Label links (`text-xs font-medium text-muted-foreground`), Delta rechts als Pille `inline-flex h-5 items-center gap-0.5 rounded-full px-1.5 text-xs font-medium tabular-nums` mit `ArrowUpRight`/`ArrowDownRight` 12 px – gut: `bg-success-soft text-success-text`, schlecht: `bg-destructive-soft text-destructive-text`, null: `bg-surface-muted text-foreground-secondary` („±0"). `invert` dreht die Bewertung, nicht das Vorzeichen.
- Zeile 2: Wert `mt-1 text-kpi font-semibold text-foreground tabular-nums`. `tone="warning"`/`"destructive"` färbt den Wert in `text-warning-text`/`text-destructive-text`; alle anderen Töne lassen ihn schwarz. Keine bunten Kacheln.
- Zeile 3: `sub` (`text-xs text-muted-foreground`), dahinter `delta.label` in `text-foreground-tertiary`.
- Sparkline rechts unten, 72 × 24 px (`lg`: 96 × 28), Inline-SVG: `<polyline>` `stroke-[1.5]` in Tonfarbe, Fläche darunter **einfarbig** `fill-primary/10` (kein Verlauf – Verläufe sind verboten), letzter Punkt `r=2`. Ohne `trend` bleibt der Platz leer; es gibt keine Dummy-Linie.
- `href` macht die Karte zum Link; bei Hover erscheint `ArrowUpRight` 14 px oben rechts in `text-foreground-tertiary`.

**Pflichtregel:** Jede Geldsumme und jede nackte Zahl braucht `sub` **oder** `delta`. Zahlen ohne Kontext sind verboten.

`KpiRow` liegt in derselben Datei: `grid grid-cols-2 gap-4 lg:grid-cols-4` (bei drei Karten `lg:grid-cols-3`, bei sechs `xl:grid-cols-6`).

**`stat-card.tsx` bleibt bestehen** – gleiche Props (`label`, `value`, `icon`, `iconClassName`, `hint`) und delegiert an `KpiCard`:
`iconClassName` → `tone` (enthält `"success"`/`"warning"`/`"destructive"`, sonst `neutral`), `hint` → `sub`, `icon` wird **ignoriert** (KPI-Karten tragen kein Icon). Damit erhalten alle 28 bestehenden Aufrufe auf 9 Seiten sofort die neue Optik, ohne dass eine Seite angefasst wird.

### 4.12 `components/shared/data-table.tsx` (neu)

Client-Komponente, generisch, ohne externe Bibliothek.

```ts
interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number | null;   // sortierbar, wenn gesetzt
  align?: "left" | "right" | "center";
  numeric?: boolean;                                 // text-right tabular-nums
  width?: string;                                    // "140px" | "minmax(0,1fr)"
  hideBelow?: "sm" | "md" | "lg" | "xl";
  primary?: boolean;                                 // Identifikator; klebt bei h-Scroll, Kartentitel mobil
}

interface RowAction {
  label: string;
  icon?: LucideIcon;
  href?: string;
  onSelect?: () => void;
  variant?: "default" | "danger";
  separatorBefore?: boolean;
}

interface DataTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;

  rowHref?: (row: T) => string | undefined;   // Zeile als Link (Rechts-/Mittelklick funktioniert)
  onRowClick?: (row: T) => void;              // Master/Detail
  activeRowId?: string;                       // aktive Zeile im Master/Detail

  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (ids: Set<string>) => void;
  bulkActions?: (ids: string[]) => React.ReactNode;

  rowActions?: (row: T) => RowAction[];

  toolbar?: React.ReactNode;                  // <FilterBar …/>
  sort?: { key: string; dir: "asc" | "desc" };
  onSortChange?: (s: { key: string; dir: "asc" | "desc" }) => void;
  defaultSort?: { key: string; dir: "asc" | "desc" };

  pageSize?: number | false;                  // Default 25; false = keine Pagination
  page?: number; onPageChange?: (p: number) => void; total?: number;  // serverseitig

  mobileCard?: (row: T) => React.ReactNode;   // < md: Karten-Liste statt Tabelle
  emptyState?: React.ReactNode;               // <EmptyState variant="inline" …/>
  loading?: boolean;
  stickyHeaderOffset?: number;                // Default 56 (unter der Kopfzeile); 0 im eigenen Scroll-Container
  maxHeight?: string;                         // interner Scroll, z. B. "calc(100dvh - 220px)"
  density?: "default" | "compact";            // 44 / 36 px Zeilenhöhe
  footer?: React.ReactNode;                   // Summenzeile (TableFooter)
  caption?: string;                           // sr-only
  className?: string;
}
```

**Aufbau.** Der Container ist ein `Panel padding="none"`.

1. **Filterleiste** (`toolbar`) – `flex h-12 items-center gap-2 border-b border-border px-3`: links Suche (`Input inputSize="sm" leadingIcon={Search}` 220–240 px, `/` fokussiert), Segmente (`Tabs variant="pills"` mit `count`), Filter (`Select triggerSize="sm"` oder `FilterChip`), rechts (`ml-auto`) Ergebniszahl (`text-xs text-foreground-tertiary`, „213 Einträge"), Export (`ghost icon-sm`, `Download`), Primäraktion (`size="sm"`). Aktive Filter erscheinen als entfernbare Chips (`Badge variant="secondary"` + `X` 12 px) in einer zweiten Zeile.
2. **Bulk-Leiste** – sobald `selected.size > 0`, ersetzt sie die Filterleiste: `flex h-12 items-center gap-3 border-b border-border bg-primary-soft/60 px-3 text-13`, links „3 ausgewählt", dann `bulkActions`, rechts „Auswahl aufheben" (`ghost sm`).
3. **Tabelle** – `Table*`-Primitives. Kopf klebt (`top-[stickyHeaderOffset]px`, bei `maxHeight` `top-0`). Auswahl-Checkbox als erste Spalte (`w-10`, Kopf-Checkbox tri-state, `Shift+Klick` wählt einen Bereich). Zeilenmenü als letzte Spalte (`w-10`): `Button variant="ghost" size="icon-xs"` mit `MoreHorizontal`, `opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100`, auf Geräten ohne Hover per `@media (hover:none)` immer sichtbar; `DropdownMenu align="end"`, Danger-Einträge mit `variant="danger"`.
4. **Sortierung** – Klick auf den Kopf: aufsteigend → absteigend → aus. Zahlen und Datumswerte über `sortValue`, Text über `localeCompare("de")`. `aria-sort` wird gesetzt.
5. **Aktive Zeile** (`activeRowId`) – `bg-primary-soft/60 font-medium shadow-[inset_3px_0_0_hsl(var(--primary))]`, identisch zur Auswahl-Hervorhebung.
6. **Pagination** – `flex h-11 items-center justify-between border-t border-border px-3 text-xs text-muted-foreground`: links „1–25 von 312", rechts `Select triggerSize="sm"` (25/50/100) und zwei `ghost icon-xs` mit `ChevronLeft`/`ChevronRight`. Bei fokussierter Tabelle blättern `←`/`→`.
7. **Ladezustand** – acht Skeleton-Zeilen in Zeilenhöhe.
8. **Leerzustand** – `emptyState`, sonst ein Standard-`EmptyState variant="inline"`. Bei aktivem Filter lautet die Aktion „Filter zurücksetzen".
9. **Tastatur** – `↑`/`↓` bewegen die Fokuszeile, `Enter` folgt `rowHref`/`onRowClick`, `Leertaste` wählt aus, `⌘A` wählt alle (nur bei `selectable`), `.` öffnet das Zeilenmenü.
10. **Mobil** – Spalten nach `hideBelow` ausblenden; bleibt zu wenig übrig, rendert `mobileCard` eine Karten-Liste (`divide-y divide-border`, Primärspalte fett, zwei Meta-Zeilen, Badge rechts). Sonst horizontaler Scroll mit `primary`-Spalte `sticky left-0 bg-card`. Der klebende Kopf entfällt unter `md`.

**Pflicht:** Jede `DataTable` hat entweder `mobileCard` **oder** mindestens eine `primary`-Spalte.

### 4.13 `components/shared/filter-bar.tsx` (neu)

```ts
<FilterBar
  search={{ placeholder: "Nummer oder Schüler", value, onChange }}
  segments={<Tabs variant="pills" …/>}
  filters={<><FilterChip …/><Select triggerSize="sm" …/></>}
  count="213 Einträge"
  actions={<Button asChild size="sm"><Link href="/rechnungen/neu"><Plus /> Neue Rechnung</Link></Button>}
/>
```

Ebenfalls in dieser Datei: `FilterChip` – `h-8 rounded-full border border-border-strong px-2.5 text-xs`, aktiv `border-primary-soft-border bg-primary-soft text-primary-text`; öffnet ein `Popover` mit Checkbox-Liste (Suchfeld ab acht Optionen); ein aktiver Chip zeigt „Status · 2" und ein `X` 12 px.

### 4.14 `components/shared/empty-state.tsx`

Props unverändert (`icon`, `title`, `description`, `children`, `className`), zwei kommen dazu: `variant?: "panel" | "inline"` (Default `panel`, damit die 12 bestehenden Aufrufe weiter als Fläche wirken) und `action?: React.ReactNode` (Alias für `children`).

- `panel`: `flex flex-col items-center justify-center rounded-xl bg-card px-6 py-14 text-center shadow-panel`
- `inline`: dasselbe ohne Fläche und Schatten, `py-10` – für Tabellen, Panels und Sheets

Inhalt: Icon 20 px `strokeWidth 1.75` in `text-foreground-tertiary` – **ohne Kachel, ohne Kreis, ohne Fläche** (die v2-Kachel `h-9 w-9 rounded-md bg-surface-muted` entfällt). Titel `mt-3 text-sm font-semibold text-foreground`. Beschreibung `mt-1 max-w-[380px] text-13 text-muted-foreground` – **genau ein Satz**. Darunter genau eine Primäraktion, optional ein `link`-Button daneben.

```tsx
<EmptyState
  variant="inline"
  icon={Receipt}
  title="Noch keine Rechnungen."
  description="Lege die erste Rechnung an – Positionen kommen aus der Preisliste."
  action={<Button asChild><Link href="/rechnungen/neu"><Plus /> Neue Rechnung</Link></Button>}
/>
```

### 4.15 `components/shared/command-palette.tsx` (neu), `global-search.tsx` bleibt der Einstieg

`global-search.tsx` behält den Export `GlobalSearch` und wird zum Trigger; die gesamte Such- und KI-Logik (Debounce 250 ms, `globalSuche`, `kiSuche`, Stale-Schutz über `letzteQueryRef`, Gruppierung nach `schueler` / `benutzer` / `fahrzeug` / `rechnung`) zieht unverändert nach `command-palette.tsx`. Neue Props auf `GlobalSearch`: `variant?: "sidebar" | "icon"`, `collapsed?: boolean`.

Die Palette ist ein Radix `Dialog`:

```
Content: fixed left-1/2 top-[12vh] z-palette w-[640px] max-w-[calc(100%-2rem)] -translate-x-1/2
         overflow-hidden rounded-2xl bg-popover p-0 shadow-lg
Overlay: z-palette bg-foreground/45
Eingabe: h-12 flex items-center gap-3 border-b border-border px-4
         Search 18 tertiär (Ladezustand Loader2), <input> text-sm bg-transparent outline-none,
         Placeholder „Springen, suchen, anlegen – oder Frage stellen …", rechts <kbd>Esc</kbd>
Liste:   max-h-[min(60vh,480px)] overflow-y-auto p-2
         Gruppentitel: px-2 pt-2 pb-1 text-2xs font-semibold uppercase tracking-[.06em] text-foreground-tertiary
         Eintrag: flex h-10 items-center gap-3 rounded-md px-2 text-13 aria-selected:bg-accent
                  (Typ-Icon 16 links, Titel 13/500, Untertitel 12 tertiär, rechts ↵ nur beim aktiven)
Fuß:     h-9 border-t border-border px-4 flex items-center gap-4 text-2xs text-foreground-tertiary
         „↑↓ navigieren · ↵ öffnen · ⌘↵ KI fragen"
```

Gruppenreihenfolge: **Aktionen** (die vier „+ Neu"-Einträge, rollengefiltert) → **Springen zu** (alle sichtbaren Einträge aus `bereicheFuer(rolle)`; die Sidebar reicht `rolle` durch) → **Schüler / Benutzer / Fahrzeuge / Rechnungen** (Treffer aus `globalSuche`, ab 2 Zeichen) → **KI**. Die KI-Antwort erscheint als Block oben: `m-2 rounded-lg bg-primary-soft px-3 py-2.5 text-13` mit `Sparkles` 16 px.

`Enter` öffnet den markierten Eintrag; `⌘Enter` startet `kiSuche`; ohne markierten Eintrag startet `Enter` ebenfalls `kiSuche` (das heutige Verhalten). Navigation über `↑`/`↓` mit `role="combobox"` / `listbox` / `option` und `aria-activedescendant`. Beim Schließen gibt `onCloseAutoFocus` den Fokus an das vorher aktive Element zurück. Die statischen Einträge werden per einfacher `includes`-Suche auf dem Label gefiltert – kein `cmdk`.

### 4.16 `components/shared/assistent-widget.tsx`

Die Logik (`/api/assistent`, Nachrichtenliste, `WERKZEUG_LABEL`, `VORSCHLAEGE`) bleibt unverändert. Neu ist nur die Hülle: statt der schwebenden Karte ein `Sheet side="right" size="sm" modal={false}`.

Neue optionale Props: `open?: boolean`, `onOpenChange?: (o: boolean) => void`, `trigger?: React.ReactNode`. Ohne `trigger` rendert die Komponente wie bisher ihren eigenen Button, damit bestehende Aufrufe nicht brechen.

Kopf: `SheetHeader` mit Titel „Assistent" und `Badge variant="secondary" dot={false}` „KI · Beta".
Blasen: Nutzer `bg-foreground text-background rounded-xl rounded-br-sm px-3 py-2 text-13`, Assistent `bg-surface-muted rounded-xl rounded-bl-sm px-3 py-2 text-13`.
Werkzeug-Chips: `Badge variant="default" size="sm" dot={false}` mit `Wrench` 12 px.
Vorschläge: `Button variant="outline" size="sm" className="w-full justify-start"`.
Eingabe im `SheetFooter`: `Textarea` (auto-grow bis 96 px) + `Button size="icon" aria-label="Senden"` mit `ArrowUp`; `Enter` sendet, `Shift+Enter` bricht die Zeile um.

`modal={false}` bedeutet: kein Overlay, ein Klick daneben schließt nicht, `Esc` schließt. Öffnet der Nutzer den Assistenten bei offenem Detail-Sheet, schließt der `SidebarProvider` das Detail-Sheet zuerst – zwei Sheets gleichzeitig sind nicht erlaubt.

### 4.17 Die übrigen `components/shared`-Dateien

| Datei | Änderung (Props bleiben in allen Fällen unverändert) |
|---|---|
| `logo.tsx` | Neue Prop `tone?: "light" \| "dark"`. `light` (Default): Mark 24 px `rounded-md bg-primary` mit weißen Fahrbahnspuren, Wortmarke `text-foreground`, „App" **nicht mehr grün**. `dark` (Sidebar): Mark `bg-sidebar-badge`, Spuren `bg-sidebar-bar`, Wortmarke `text-sidebar-foreground`. Die v2-Mark (Tinte-Quadrat mit grünen Strichen) wird umgekehrt – die Marke darf nicht wiedererkennbar sein. |
| `schueler-avatar.tsx` | Fläche `${ton}1F`, Text `ton`, **kein** Inset-Ring mehr; Standardgröße 32 px (`h-8 w-8`), `text-13 font-semibold`. Die persönliche Farbe bleibt – sie trägt Daten, nicht Dekor. |
| `form-message.tsx` | `rounded-md px-3 py-2.5 text-13 flex gap-2.5` mit `bg-destructive-soft text-destructive-text` bzw. `bg-success-soft text-success-text`, Icon 16 px, **kein Rahmen**. |
| `submit-button.tsx` | nutzt `Button loading={pending}`; Standard `size="lg"` in der Speichern-Leiste. |
| `loeschen-dialog.tsx` | Trigger `variant="danger-soft"` mit `size={nurIcon ? "icon-sm" : "sm"}` (die heutige `outline`-plus-Rotfärbung entfällt). Dialog `size="sm"`; Footer: `outline` „Abbrechen" + `destructive` „Endgültig löschen" mit `data-primary`. Fehlt in `beschreibung` der Hinweis „nicht rückgängig", wird er automatisch angehängt. |
| `in-entwicklung.tsx` | `PageHeader` + `EmptyState variant="panel"` mit `Wrench`, Text genau ein Satz. |
| `copy-button.tsx` | Optik von `Button variant="ghost" size="xs"`; Bestätigung „Kopiert" mit `Check` in `text-success` für 1,5 s. |
| `signature-pad.tsx` | Canvas `rounded-lg border border-dashed border-border-strong bg-card`, Höhe 160 px, Hinweis „Hier unterschreiben" 13 px tertiär bis zum ersten Strich, Strichfarbe `#111816`; Buttons: Leeren `ghost sm`, Abbrechen `outline`, Übernehmen `default`. |
| `logo-upload.tsx` | Vorschau 56 × 56 `rounded-lg bg-surface-muted`, Drop-Zone `rounded-md border border-dashed border-border-strong bg-surface-muted hover:border-primary`, Buttons `outline sm` / `ghost sm`, Fehler in `text-destructive-text`. |

### 4.18 Weitere neue Shared-Bausteine

**`form-layout.tsx`** – `FormSection`, `FormGrid`, `SaveBar`.

```tsx
<FormSection title="Stammdaten" description="Name, Kontakt, Geburtsdatum">
  <FormGrid cols={2}>
    <Field label="Vorname" required><Input name="vorname" /></Field>
    <Field label="Nachname" required><Input name="nachname" /></Field>
    <Field label="E-Mail" className="sm:col-span-2"><Input name="email" type="email" /></Field>
  </FormGrid>
</FormSection>
```

`FormSection` ist ein `Panel` mit Kopf. `FormGrid`: `grid gap-x-6 gap-y-4 sm:grid-cols-2` (`cols={1}` → einspaltig).
`SaveBar`: `sticky bottom-0 z-sticky -mx-4 mt-8 flex h-14 items-center justify-between gap-3 border-t border-border bg-background px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 shadow-[0_-8px_24px_-16px_rgba(15,26,21,.18)]` – links `FormMessage` oder der Hinweis „Ungespeicherte Änderungen", rechts „Abbrechen" (`outline`) und `SubmitButton size="lg"` (`⌘S`). Die Seite bekommt `pb-24`.

**`split-view.tsx`** – Master/Detail an einer Stelle:

```ts
<SplitView
  master={<SchuelerListe …/>}
  detail={selected ? <SchuelerAkte schuelerId={selected.id} /> : null}
  detailOpen={Boolean(selected)}
  backHref="/schueler"
  emptyDetail={<EmptyState variant="inline" icon={Users} title="Schüler auswählen." description="Links einen Schüler anklicken – die Akte öffnet sich hier." />}
/>
```

Ab `xl`: `grid gap-4 xl:grid-cols-[minmax(360px,2fr)_minmax(0,3fr)] items-start`; das Detail ist `sticky top-[calc(var(--header-h)+16px)] max-h-[calc(100dvh-88px)] overflow-y-auto`. Unter `xl`: bei `detailOpen` nur das Detail (Seitenkopf mit `backHref`), sonst nur der Master – exakt das heutige `?id=`-Verhalten, nur zentral.

**`settings-nav.tsx`** – linke Unter-Navigation innerhalb einer Seite: `nav` `w-56 shrink-0 space-y-0.5 lg:sticky lg:top-[calc(var(--header-h)+16px)]`; Einträge `flex h-8 items-center rounded-md px-2 text-13 text-foreground-secondary hover:bg-foreground/[0.05] aria-[current=page]:bg-primary-soft aria-[current=page]:font-medium aria-[current=page]:text-primary-text`. Ziele sind Anker (`#profil`, `#branding`, `#preisliste`, `#portal`) oder Routen. Unter `lg` wird daraus eine `Tabs`-Leiste mit Unterstrich.

**`timeline.tsx`** – der Tagesplan im Leitstand: Zeitstrahl 07:00–20:00, linke Spalte 56 px mit Stundenmarken (`text-xs tabular-nums text-foreground-tertiary`), Raster `border-t border-border` alle 60 px, Einträge als Blöcke `rounded-md px-2.5 py-1.5 text-13` mit 3-px-Farbkante links aus `FAHRSTUNDE_TYPEN[typ].dot`, „Jetzt"-Linie `h-px bg-destructive` mit 6-px-Punkt, der nächste Termin zusätzlich `ring-1 ring-primary-soft-border bg-primary-soft/50`, ausgefallene Termine `line-through text-muted-foreground bg-surface-muted`.

**`charts.tsx`** (`components/ui`) – `BarPair`, `BarList`, `TrendLine`, `Sparkline` als Inline-SVG. Keine Chart-Bibliothek. Farben: erste Serie `fill-primary`, zweite Serie `fill-primary-soft-strong` oder `fill-info`, **nie** Lila, nie ein Verlauf. Gitterlinien `stroke-border`, Achsenbeschriftung 11 px `text-foreground-tertiary`, Werte im `<title>` und im Tooltip.

### 4.19 `app/(dashboard)/loading.tsx`

Wird an die neue Shell angepasst: eine 56-px-Kopfzeilen-Attrappe (`Skeleton h-6 w-40`), darunter `SkeletonKpiRow n={4}` und `SkeletonTable rows={8}`, alles mit `rounded-xl`.

---

## 5. Seitenmuster

Sechs Muster decken alle 35 Seiten ab. Jede Seite folgt genau einem davon.

### 5.1 Übersichtsseite (Leitstand, Finanzen-Übersicht)

```
┌─ Sidebar ─┬────────────────────────────────────────────────────────────────┐
│           │ Leitstand                        [Kalender] [+ Neu]      [🔔]  │ 56
│           ├────────────────────────────────────────────────────────────────┤
│           │ ┌──────────┐┌──────────┐┌──────────┐┌──────────┐               │
│           │ │ Termine  ││ Prüfungen││ Aufgaben ││ Offen    │  KPI-Zeile    │ 104
│           │ │ 14       ││ 6        ││ 12       ││ 4.320 €  │               │
│           │ │ Nächster ││ 7 Tage   ││ 3 überf. ││ 8 überf. │               │
│           │ └──────────┘└──────────┘└──────────┘└──────────┘               │
│           │ ┌───────────────────────────┐┌──────────────────────┐          │
│           │ │ Tagesplan            7fr  ││ Handlungsbedarf 5fr  │          │
│           │ │ 08 ─────────────────────  ││ ──────────────────── │          │
│           │ │ 09 ▎Mara Weber · B        ││ Aufgaben             │          │
│           │ │ 10 ▎Tim Krause · Überland ││ ──────────────────── │          │
│           │ │ ══ jetzt ═══════════════  ││ Prüfungen · 7 Tage   │          │
│           │ │ 12 ▎Lea Hoff · Nacht      ││ ──────────────────── │          │
│           │ └───────────────────────────┘│ Finanzstatus         │          │
│           │                              └──────────────────────┘          │
└───────────┴────────────────────────────────────────────────────────────────┘
```

**Regeln.** KPI-Zeile immer zuoberst, maximal vier Karten, jede mit `sub` oder `delta`. Darunter `grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]`: links das Zeitliche oder Große (Zeitstrahl, Diagramm) in einem `Panel padding="none"`, rechts ein `space-y-4`-Stapel kurzer Panels mit je höchstens acht Zeilen und einem „Alle"-Link im Kopf. Keine Begrüßung, kein Name, kein Datum als Überschrift – das Datum steht als `description` im Kopf. Alle Kennzahlen stammen aus Daten, die die Seite ohnehin lädt; es gibt keine neuen Queries.

### 5.2 Listenseite (Rechnungen, Zahlungen, Kostenträger, Buchhaltung, Lohn, Fahrzeuge, Kurse, Theorie, Prüfungen, Aufgaben, Erinnerungen, Kommunikation)

```
┌─ Sidebar ─┬────────────────────────────────────────────────────────────────┐
│           │ Finanzen › Rechnungen                  [Export] [+ Rechnung] 🔔 │ 56
│           ├────────────────────────────────────────────────────────────────┤
│           │ ┌────────────────────────────────────────────────────────────┐ │
│           │ │ [🔍 Nummer oder Schüler] (Alle)(Offen 12)(Überfällig 3)    │ │ 48
│           │ │                              213 Einträge  [⤓] [+ Rechnung]│ │
│           │ ├────────────────────────────────────────────────────────────┤ │
│           │ │ ☐ Nummer ▲ │ Schüler   │ Datum │ Fällig│  Betrag │ Status ⋯│ │ 40
│           │ ├────────────────────────────────────────────────────────────┤ │
│           │ │ ☐ R-2024-1 │ Mara Weber│ 12.03.│ 26.03.│ 1.240,00│ ● Offen ⋯│ │ 44
│           │ │ ☐ R-2024-2 │ Tim Krause│ 12.03.│ 26.03.│   680,00│ ● Bez.  ⋯│ │ 44
│           │ ├────────────────────────────────────────────────────────────┤ │
│           │ │ 1–25 von 213                       [25 ⌄]   [‹]  [›]       │ │ 44
│           │ └────────────────────────────────────────────────────────────┘ │
└───────────┴────────────────────────────────────────────────────────────────┘
```

**Regeln.** Ein `DataTable` in einem `Panel padding="none"` füllt die Seite. Die Primäraktion („+ Neue Rechnung") steht im Seitenkopf **und** in der Filterleiste – im Kopf für die Seite, in der Leiste für den Arbeitsfluss; im Leerzustand nur im Leerzustand. Erste Spalte trägt den Identifikator (`primary: true`), letzte Spalte Status, danach das Zeilenmenü. Geldbeträge rechtsbündig und tabellarisch. Keine Icon-Kacheln in Zeilen. Jede Listenseite hat Filterleiste, Sortierung, Pagination und einen Leerzustand mit Aktion.

### 5.3 Master/Detail (Schüler, Fahrlehrer, Fahrzeuge)

```
┌─ Sidebar ─┬────────────────────────────────────────────────────────────────┐
│           │ Ausbildung › Schüler              [KI-Lernstatus] [+ Schüler]🔔 │ 56
│           ├─────────────────────────────┬──────────────────────────────────┤
│           │ [🔍] (Alle 84)(Reif 12)…    │ ◯ Mara Weber          [⋯][Bearb.]│
│           │ ─────────────────────────── │ B · Kundennr. 1042 · Saldo 320 € │
│           │ ◯ Mara Weber   ▍▍▍▎  ● Reif │ ──────────────────────────────── │
│           │ ◯ Tim Krause   ▍▍▎▁  ● Theo │ Übersicht│Fahrstunden 24│Dok.│…  │
│           │ ◯ Lea Hoff     ▍▎▁▁  ● Hand │ ──────────────────────────────── │
│           │ ◯ Jan Roth     ▍▍▍▍  ● Fert │  Inhalt des aktiven Reiters      │
│           │ ─────────────────────────── │                                  │
│           │ 1–25 von 84        [‹] [›]  │                                  │
│           │        2fr (≈40 %)          │        3fr (≈60 %)               │
└───────────┴─────────────────────────────┴──────────────────────────────────┘
```

**Regeln.** `SplitView` mit `xl:grid-cols-[minmax(360px,2fr)_minmax(0,3fr)]`. Links eine `DataTable` mit `density="compact"`, `onRowClick`, `activeRowId` und eigenem Scroll (`maxHeight`, `stickyHeaderOffset={0}`). Die Auswahl steht in der URL (`?id=`), der aktive Reiter in `?tab=`. Rechts ein `Panel` mit Kopf (Avatar 40 px, Name 18/600, Meta-Zeile, Aktionen rechts) und `Tabs` mit `count`. Der Fortschritts-Rail bleibt als eigene Spalte (104 px). Unter `xl` wird das Detail zur Einzelansicht mit `backHref` im Seitenkopf und dem Namen als Titel. Wo eine Akte nicht die halbe Seite braucht (Fahrzeuge), tritt ein `Sheet size="lg"` an die Stelle der zweiten Spalte.

### 5.4 Formularseite (schueler/neu, schueler/bearbeiten, fahrlehrer/neu, rechnungen/neu, vertrag, mahnung …)

```
┌─ Sidebar ─┬────────────────────────────────────────────────────────────────┐
│           │ ‹  Schüler › Neuer Schüler                      [Abbrechen] 🔔  │ 56
│           ├────────────────────────────────────────────────────────────────┤
│           │ ┌──── max-w-[880px] ────────────────────────────────────────┐  │
│           │ │ Stammdaten                                                │  │
│           │ │ Name, Kontakt, Geburtsdatum                               │  │
│           │ │ ┌ Vorname ─────────┐  ┌ Nachname ────────┐                │  │
│           │ │ │                  │  │                  │   38 px        │  │
│           │ │ └──────────────────┘  └──────────────────┘                │  │
│           │ │ ┌ E-Mail ──────────────────────────────────┐              │  │
│           │ │ └──────────────────────────────────────────┘              │  │
│           │ │   Für Portal-Zugang und Rechnungen.                       │  │
│           │ └───────────────────────────────────────────────────────────┘  │
│           │ ┌ Ausbildung ───────────────────────────────────────────────┐  │
│           │ └───────────────────────────────────────────────────────────┘  │
│           ├────────────────────────────────────────────────────────────────┤
│           │ Ungespeicherte Änderungen        [Abbrechen]  [Speichern ⌘S]   │ 56 sticky
└───────────┴────────────────────────────────────────────────────────────────┘
```

**Regeln.** `max-w-[880px] space-y-6`, Sektionen als `FormSection`, Felder zweispaltig ab `sm` über `FormGrid`. Label **über** dem Feld, Hilfetext und Fehler **unter** dem Feld – beides über `Field`. Nie ein Placeholder als Label. Speichern liegt ausschließlich in der `SaveBar`; der Kopf trägt nur `backHref` und „Abbrechen". Die Seite bekommt `pb-24`. Sektionen für Schüler: Person · Ausbildung · Unterlagen · Abrechnung.

### 5.5 Einstellungsseite (einstellungen, fahrlehrer/rollen)

```
┌─ Sidebar ─┬────────────────────────────────────────────────────────────────┐
│           │ Einstellungen                                             🔔   │ 56
│           ├──────────────┬─────────────────────────────────────────────────┤
│           │ Fahrschule ▍ │ ┌ Fahrschule ─────────────────────────────────┐ │
│           │ Logo & Portal│ │  Felder …                        [Speichern]│ │
│           │ Preisliste   │ └─────────────────────────────────────────────┘ │
│           │ Rollen       │ ┌ Logo & Portal ──────────────────────────────┐ │
│           │              │ └─────────────────────────────────────────────┘ │
│           │   224 px     │ ┌ Preisliste ── DataTable density="compact" ──┐ │
│           │   sticky     │ └─────────────────────────────────────────────┘ │
└───────────┴──────────────┴─────────────────────────────────────────────────┘
```

**Regeln.** `grid gap-8 lg:grid-cols-[224px_minmax(0,1fr)]`, links `SettingsNav` (klebend), rechts `max-w-[880px] space-y-6` mit je einem `Panel` pro Sektion. Weil die Sektionen getrennte `form`-Elemente mit eigenen Server-Actions sind, hat jede ihre eigene Speichern-Aktion im `CardFooter` – hier gibt es **keine** globale `SaveBar`. Unter `lg` wird die Navigation zu Unterstrich-Tabs oben.

### 5.6 Auswertungsseite (Cockpit, Berichte)

```
┌─ Sidebar ─┬────────────────────────────────────────────────────────────────┐
│           │ Auswertung › Berichte        (30 Tage)(Quartal)(Jahr)  [⤓]  🔔 │ 56
│           ├────────────────────────────────────────────────────────────────┤
│           │ ┌────────┐┌────────┐┌────────┐┌────────┐   KPI, Wert 28 px     │
│           │ │ 128    ││ 92 %   ││ 4.320 €││ 18     │   je mit Delta        │
│           │ └────────┘└────────┘└────────┘└────────┘                       │
│           │ ┌ Umsatzverlauf · 12 Monate ────────────┐┌ Bestehensquote ────┐ │
│           │ │  ▁▂▃▅▆▇▆▅▃▂▁▂                         ││ Klasse B  ████ 88 %│ │
│           │ │                                       ││ Klasse A  ███  74 %│ │
│           │ └───────────────────────────────────────┘└────────────────────┘ │
└───────────┴────────────────────────────────────────────────────────────────┘
```

**Regeln.** KPI-Zeile mit `size="lg"` (28 px), jede Zahl mit Zeitraum und Delta. Darunter Panels mit `BarPair`, `BarList` oder `TrendLine`. Der Zeitraum ist eine `Tabs variant="pills"`-Steuerung in den Kopfaktionen, nicht im Inhalt. Achsen beschriftet, Legende als Punkte oben rechts, Werte im Tooltip. Keine Verläufe, keine Neonfarben, keine dritte Akzentfarbe.

### 5.7 Sonderfall Kalender / Disposition

Volle Breite, kein Raster. Kopf: Titel „Disposition", rechts `SmartVorschlag` als `Button variant="soft" size="sm"` mit `Sparkles` und „+ Termin" als `default`. Darunter ein `Panel padding="none"`: Steuerleiste 48 px (links `ghost icon-sm` ‹ ›, „Heute" als `outline sm`, Datum 14/600; Mitte `Tabs variant="pills"` Tag/Woche und Fahrlehrer/Fahrzeug; rechts `FilterChip`), darunter die Ressourcen-Zeitachse über die volle Breite mit klebender Ressourcenspalte (200 px, `sticky left-0 bg-card`), Stundenraster in `border-border`, Jetzt-Linie `bg-destructive`, Termin-Chips `rounded-md text-xs` mit den Typfarben aus `FAHRSTUNDE_TYPEN`. `fahrstunde-panel.tsx` wird ein `Sheet size="md"` statt einer klebenden Seitenspalte.

---

## 6. Rezeptbuch v2 → v3

18 Regeln. Jede nennt das v2-Muster aus dem echten Code und seinen v3-Ersatz. Wer eine Seite anfasst, arbeitet alle zutreffenden Regeln ab – keine halben Seiten.

### R1 – `PageHeader` mit `eyebrow` und Erklärsatz → Kopfzeile mit Breadcrumb und Aktion

```tsx
// vorher – app/(dashboard)/finanzen/page.tsx
<PageHeader eyebrow="Finanzen" title="Übersicht"
  description="Liquidität, offene Posten und Zahlungsfluss auf einen Blick." />

// nachher
<PageHeader
  breadcrumb={[{ label: "Finanzen", href: "/finanzen" }]}
  title="Übersicht"
  description={`${offen.length} offene Posten`}
  actions={<Button variant="outline" size="sm"><Download /> Export</Button>}
/>
```

`description` wird Meta (≤ 40 Zeichen), nicht Erklärung. Die Primäraktion der Seite wandert in den Kopf. Aufrufe mit `eyebrow` kompilieren unverändert weiter.

### R2 – Eigener Titelblock mit Begrüßung → Kopfzeile + KPI-Zeile

```tsx
// vorher – app/(dashboard)/dashboard/page.tsx
<p className="label-caps">{wochentag()}</p>
<h1 className="text-xl font-semibold …">Guten Tag, {vorname}.</h1>

// nachher
<PageHeader title="Leitstand" description={wochentag()}
  actions={<><Button asChild variant="outline" size="sm"><Link href="/kalender">Kalender</Link></Button><NeuMenuButton /></>} />
<KpiRow>
  <KpiCard label="Termine heute" value={termine.length}
    sub={naechster ? `Nächster ${formatUhrzeit(naechster.uhrzeit)}` : "Keine weiteren"} href="/kalender" />
  <KpiCard label="Prüfungen · 7 Tage" value={pruefungen.length} href="/pruefungen" />
  <KpiCard label="Offene Aufgaben" value={aufgaben.length}
    tone={ueberfaelligeAufgaben ? "warning" : "neutral"} sub={`${ueberfaelligeAufgaben} überfällig`} href="/aufgaben" />
  <KpiCard label="Offene Beträge" value={formatEuro(offenerBetrag)}
    sub={`${ueberfaellig.length} überfällig`} tone={ueberfaellig.length ? "destructive" : "neutral"} href="/finanzen" />
</KpiRow>
```

Keine Begrüßung, kein Vorname im Inhalt – der Name steht in der Sidebar.

### R3 – `rounded-xl border bg-card` → `Panel` (37 Vorkommen)

```tsx
// vorher – app/(dashboard)/finanzen/page.tsx
<section className="rounded-xl border bg-card p-4">
  <div className="mb-4 flex items-center justify-between">
    <h2 className="label-caps">Rechnungen vs. Zahlungseingänge · 6 Monate</h2>
    …
  </div>
  …
</section>

// nachher
<Panel title="Rechnungen vs. Zahlungseingänge" description="6 Monate"
       actions={<ChartLegende />}>
  <BarPair daten={monate} />
</Panel>
```

`border` verschwindet von jeder Fläche. `border` und `divide-y` bleiben ausschließlich **innerhalb** von Panels erlaubt.

### R4 – `<ul className="divide-y">`-Datensatzliste → `DataTable`

```tsx
// vorher – app/(dashboard)/rechnungen/page.tsx
<Card className="overflow-hidden"><CardContent className="p-0">
  <ul className="divide-y">{rechnungen.map((r) => (
    <li key={r.id}><Link href={`/rechnungen/${r.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-surface">
      <div className="flex h-9 w-9 … rounded-md bg-primary-soft text-primary"><FileText /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{r.nummer}</p>
        <p className="truncate text-[13px] text-muted-foreground">… · {formatDatum(r.rechnungsdatum)}</p>
      </div>
      <span className="text-sm font-semibold tabular-nums">{formatEuro(Number(r.betrag_brutto))}</span>
      <Badge variant="outline" className={status.badge}>{status.label}</Badge>
    </Link></li>))}
  </ul>
</CardContent></Card>

// nachher
<DataTable
  rows={rechnungen}
  getRowId={(r) => r.id}
  rowHref={(r) => `/rechnungen/${r.id}`}
  defaultSort={{ key: "datum", dir: "desc" }}
  toolbar={
    <FilterBar
      search={{ placeholder: "Nummer oder Schüler" }}
      segments={<Tabs variant="pills" /* Alle · Offen · Überfällig · Bezahlt, je mit count */ />}
      actions={<Button asChild size="sm"><Link href="/rechnungen/neu"><Plus /> Neue Rechnung</Link></Button>}
    />
  }
  columns={[
    { key: "nummer",   header: "Nummer",  primary: true, width: "140px",
      cell: (r) => <span className="font-medium">{r.nummer}</span>, sortValue: (r) => r.nummer },
    { key: "schueler", header: "Schüler",
      cell: (r) => r.fahrschueler ? `${r.fahrschueler.vorname} ${r.fahrschueler.nachname}` : "Ohne Schüler",
      sortValue: (r) => r.fahrschueler?.nachname ?? "" },
    { key: "datum",    header: "Datum",   width: "110px", hideBelow: "md",
      cell: (r) => formatDatum(r.rechnungsdatum), sortValue: (r) => r.rechnungsdatum ?? "" },
    { key: "faellig",  header: "Fällig",  width: "110px", hideBelow: "lg",
      cell: (r) => formatDatum(r.faelligkeitsdatum), sortValue: (r) => r.faelligkeitsdatum ?? "" },
    { key: "betrag",   header: "Betrag",  width: "130px", align: "right", numeric: true,
      cell: (r) => formatEuro(Number(r.betrag_brutto)), sortValue: (r) => Number(r.betrag_brutto) },
    { key: "status",   header: "Status",  width: "130px",
      cell: (r) => <Badge variant={RECHNUNG_STATUS[r.status].variant}>{RECHNUNG_STATUS[r.status].label}</Badge> },
  ]}
  rowActions={(r) => [
    { label: "Öffnen", href: `/rechnungen/${r.id}` },
    { label: "Mahnung", href: `/rechnungen/${r.id}/mahnung`, icon: Bell },
    { label: "Löschen", variant: "danger", separatorBefore: true, onSelect: () => loeschen(r.id) },
  ]}
  mobileCard={(r) => <RechnungCard r={r} />}
  emptyState={
    <EmptyState variant="inline" icon={Receipt} title="Noch keine Rechnungen."
      description="Lege die erste Rechnung an – Positionen kommen aus der Preisliste."
      action={<Button asChild><Link href="/rechnungen/neu"><Plus /> Neue Rechnung</Link></Button>} />
  }
/>
```

Gilt für: Rechnungen, Zahlungen, Kostenträger, Buchhaltung, Lohn, Fahrzeuge, Kurse, Theorie, Prüfungen, Aufgaben, Fahrlehrer, Erinnerungen, Kommunikation. Kurze Vorschaulisten (≤ 8 Zeilen, ≤ 2 Attribute) im Leitstand und in der Finanz-Übersicht bleiben Listen – dann aber als `Panel padding="none"` mit Zeilen `flex h-11 items-center gap-3 border-b border-border px-4 last:border-0 hover:bg-surface-muted/70`.

### R5 – Icon-Kachel vor Listenzeilen entfernen

```tsx
// vorher
<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
  <FileText className="h-4 w-4" strokeWidth={1.75} />
</div>

// nachher – ersatzlos streichen
```

Gleichförmige Icon-Kacheln sind ein KI-Tell. Die Identität der Zeile trägt die erste Spalte (Nummer, Kennzeichen, Name); bei Personen der `SchuelerAvatar` in 28 px.

### R6 – `label-caps`-Abschnittstitel → Panel-Titel

```tsx
// vorher – app/(dashboard)/dashboard/page.tsx (Komponente „Abschnitt")
<section><div className="mb-2 flex items-center justify-between">
  <h2 className="label-caps">Aufgaben</h2>
  <Link href="/aufgaben" className="… text-primary">Alle <ArrowRight /></Link>
</div><ul className="divide-y rounded-xl border bg-card">…</ul></section>

// nachher
<Panel title="Aufgaben" description={`${aufgaben.length} offen`}
  actions={<Button asChild variant="link" size="sm"><Link href="/aufgaben">Alle</Link></Button>}
  padding="none">
  …
</Panel>
```

Die lokale `Abschnitt`-Komponente im Leitstand wird gelöscht. `label-caps` bleibt nur noch für Mikro-Labels in Formularen und Panel-Unterabschnitten – und ist durch die neue Definition ohnehin keine Versalien-Klasse mehr.

### R7 – Schwarze Segment-Buttons → `Tabs variant="pills"`

```tsx
// vorher – app/(dashboard)/schueler/schueler-liste.tsx
<button className={cn("inline-flex h-7 … rounded-md px-2 text-xs font-medium",
  a ? "bg-foreground text-background" : "text-foreground-secondary hover:bg-foreground/[0.06]")}>
  {s.label}<span className="tabular-nums">{zaehl(s.key)}</span>
</button>

// nachher
<Tabs variant="pills" value={segment} onValueChange={setSegment}>
  <TabsList variant="pills">
    {SEGMENTE.map((s) => <TabsTrigger key={s.key} value={s.key} count={zaehl(s.key)}>{s.label}</TabsTrigger>)}
  </TabsList>
</Tabs>
```

Kein gefüllter Tinte-Button mehr: aktiv ist hell (weiße Fläche mit feiner Kante auf `surface-muted`). Dunkle Flächen gehören in v3 ausschließlich der Sidebar.

### R8 – Master/Detail mit `hidden xl:block` → `SplitView`

```tsx
// vorher – app/(dashboard)/schueler/page.tsx
<div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
  <div className={cn(selected && "hidden xl:block")}><SchuelerListe … /></div>
  <div className={cn(!selected && "hidden xl:block")}>
    {selected ? <Suspense …><SchuelerAkte schuelerId={selected.id} /></Suspense>
      : <div className="… rounded-xl border border-dashed border-border-strong …">
          <Users /><p>Schüler auswählen, um den Ausbildungsprozess zu sehen.</p></div>}
  </div>
</div>

// nachher
<SplitView
  backHref="/schueler"
  detailOpen={Boolean(selected)}
  master={<SchuelerListe schueler={schueler} selectedId={selectedId} saldoMap={saldoMap}
            lehrerMap={lehrerMap} fortschrittMap={fortschrittMap} />}
  detail={selected ? <Suspense key={selected.id} fallback={<AkteSkeleton />}>
            <SchuelerAkte schuelerId={selected.id} /></Suspense> : null}
  emptyDetail={<EmptyState variant="inline" icon={Users} title="Schüler auswählen."
            description="Links einen Schüler anklicken – die Akte öffnet sich hier." />}
/>
```

Das Verhältnis wird 40/60 statt 50/50. `border-dashed`-Leerflächen verschwinden restlos.

### R9 – Handgebaute Zeilen-Buttons und Inline-Hervorhebung → Tabellenzustände

```tsx
// vorher
<button className="grid w-full … hover:bg-surface"
  data-aktiv={aktiv} className="… bg-primary-soft/50 shadow-[inset_2px_0_0_hsl(var(--primary))]">

// nachher – nichts Eigenes mehr, nur DataTable-Zustände:
// hover        → hover:bg-surface-muted/70
// ausgewählt   → data-[state=selected]:bg-primary-soft/60 + inset 3px
// aktive Zeile → activeRowId (identische Optik)
```

### R10 – Statusfarbe als Text → `*-text`-Token

```tsx
// vorher
<span className="text-destructive">{formatEuro(saldo)}</span>
<span className="text-warning">· 2 Unterlagen fehlen</span>
<Link className="text-primary hover:text-primary-hover">Alle</Link>

// nachher
<span className="text-destructive-text">{formatEuro(saldo)}</span>
<span className="text-warning-text">· 2 Unterlagen fehlen</span>
<Link className="text-primary-text hover:underline">Alle</Link>
```

**Harte Regel:** `text-primary`, `text-success`, `text-warning`, `text-destructive` und `text-info` ohne `-text` dürfen nur noch auf Icons und Punkten stehen, nie auf Textknoten. Die Abnahme prüft das per Grep.

### R11 – Status-Klassen aus Konstanten → Varianten

```ts
// vorher – lib/constants.ts
export const RECHNUNG_STATUS = {
  offen:        { label: "Offen",       badge: "[&_i]:bg-warning" },
  bezahlt:      { label: "Bezahlt",     badge: "[&_i]:bg-success" },
  ueberfaellig: { label: "Überfällig",  badge: "[&_i]:bg-destructive" },
};

// nachher – `variant` kommt dazu, `badge`/`dot` bleiben für Kalender und Punkte
export const RECHNUNG_STATUS = {
  offen:        { label: "Offen",       badge: "[&_i]:bg-warning",     variant: "warning" },
  bezahlt:      { label: "Bezahlt",     badge: "[&_i]:bg-success",     variant: "success" },
  ueberfaellig: { label: "Überfällig",  badge: "[&_i]:bg-destructive", variant: "destructive" },
} satisfies Record<RechnungStatus, { label: string; badge: string; variant: BadgeProps["variant"] }>;
```

```tsx
// Aufruf vorher:  <Badge variant="outline" className={status.badge}>{status.label}</Badge>
// Aufruf nachher: <Badge variant={status.variant}>{status.label}</Badge>
```

Dieselbe Ergänzung für `FAHRSTUNDE_STATUS` und `FAHRSTUNDE_TYPEN`. In `FAHRSTUNDE_TYPEN` werden `bg-blue-600` → `bg-info` und `bg-indigo-600` → `bg-primary`; Tailwind-Rohfarben sind verboten.

### R12 – `StatCard`-Raster mit `gap-6` → `KpiRow` mit Kontext

```tsx
// vorher – app/(dashboard)/finanzen/page.tsx
<div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
  <StatCard label="Eingänge diesen Monat" value={formatEuro(eingaengeMonat)} iconClassName="success" />
  <StatCard label="Offen" value={formatEuro(offenSumme)} hint={`${offen.length} Rechnungen`} />
  …
</div>

// nachher
<KpiRow>
  <KpiCard label="Eingänge diesen Monat" value={formatEuro(eingaengeMonat)} tone="success"
    trend={monate.map((m) => m.zahlungen)}
    delta={{ value: deltaProzent, unit: "percent", label: "vs. Vormonat" }} />
  <KpiCard label="Offen" value={formatEuro(offenSumme)} sub={`${offen.length} Rechnungen`}
    href="/rechnungen?status=offen" />
  <KpiCard label="Überfällig" value={formatEuro(ueberfaelligSumme)} sub={`${ueberfaellig.length} Rechnungen`}
    tone={ueberfaellig.length ? "destructive" : "neutral"} href="/rechnungslauf"
    delta={{ value: deltaUeberfaellig, unit: "currency", invert: true, label: "vs. Vormonat" }} />
  <KpiCard label={`Umsatz ${jahr}`} value={formatEuro(umsatzJahr)} sub="Rechnungsbeträge brutto" />
</KpiRow>
```

`gap-6` wird `gap-4`. `delta` nur, wenn der Vergleichswert bereits geladen ist – die Finanz-Übersicht hat sechs Monate im Speicher, der Vormonat ist gratis. Sonst `sub`. Keine Zahl ohne `sub` oder `delta`.

### R13 – Formular als Stapel → `FormSection` + `Field` + `SaveBar`

```tsx
// vorher
<form className="space-y-4">
  <Card><CardHeader><CardTitle>Stammdaten</CardTitle></CardHeader>
    <CardContent className="grid gap-4">
      <div><Label htmlFor="vorname">Vorname</Label><Input id="vorname" name="vorname" /></div>
      …
      <Button type="submit">Speichern</Button>
    </CardContent>
  </Card>
</form>

// nachher
<form action={speichern} className="max-w-[880px] space-y-6 pb-24">
  <FormSection title="Stammdaten" description="Name, Kontakt, Geburtsdatum">
    <FormGrid cols={2}>
      <Field label="Vorname" htmlFor="vorname" required error={fehler.vorname}>
        <Input id="vorname" name="vorname" defaultValue={s.vorname} />
      </Field>
      <Field label="Nachname" htmlFor="nachname" required>
        <Input id="nachname" name="nachname" defaultValue={s.nachname} />
      </Field>
      <Field label="E-Mail" htmlFor="email" hint="Für Portal-Zugang und Rechnungen." className="sm:col-span-2">
        <Input id="email" name="email" type="email" defaultValue={s.email ?? ""} />
      </Field>
    </FormGrid>
  </FormSection>
  <FormSection title="Ausbildung" description="Klasse, Fahrlehrer, Startdatum">…</FormSection>
  <SaveBar cancelHref="/schueler" message={<FormMessage error={error} />}>
    <SubmitButton size="lg">Speichern</SubmitButton>
  </SaveBar>
</form>
```

### R14 – Inline-Leermeldungen → `EmptyState`

```tsx
// vorher – app/(dashboard)/dashboard/page.tsx
<p className="px-4 py-10 text-center text-[13px] text-muted-foreground">Heute sind keine Termine geplant.</p>

// nachher
<EmptyState variant="inline" icon={CalendarDays} title="Heute sind keine Termine geplant."
  action={<Button asChild variant="soft" size="sm"><Link href="/kalender"><Plus /> Termin planen</Link></Button>} />
```

Jeder Leerzustand ist ein Satz plus der nächste Schritt. In Tabellen mit aktivem Filter lautet die Aktion „Filter zurücksetzen".

### R15 – Button-Semantik richtigstellen

```tsx
<Button variant="secondary">Exportieren</Button>   →  <Button variant="outline"><Download /> Exportieren</Button>
<Button variant="secondary">Speichern</Button>     →  <Button>Speichern</Button>
<Button variant="outline" className="text-destructive hover:bg-destructive-soft">Löschen</Button>
                                                   →  <Button variant="danger-soft">Löschen</Button>
```

`secondary` war in v2 tintefarben und wurde als „starke Aktion" eingesetzt. In v3 ist es ein neutraler Grau-Button. Alle 14 Aufrufe werden gesichtet: Was eine starke Aktion war, wird `default`, alles andere `outline`. Pro Sichtbereich existiert genau ein `default`-Button.

### R16 – Kontext-Tabs oben → Sidebar-Eintrag oder Inhalts-Tabs

Die zweite Navigationsebene aus `area-nav.tsx` verschwindet ersatzlos. Die Finanz-Unterbereiche sind Sidebar-Einträge – dort ist nichts zu tun. Seiten mit internen Modi (Kalender Tag/Woche, Cockpit Lehrer/Fahrzeuge, Schülerakte) nutzen `Tabs` als erstes Element im Inhalt oder `Tabs variant="pills"` in der Toolbar. Nie im Seitenkopf.

### R17 – Willkürliche Größen und Rohwerte → Skala und Tokens

| vorher | nachher |
|---|---|
| `text-[13px]` | `text-13` |
| `text-[15px]` | `text-base` |
| `text-[12.5px]`, `text-[10px]` | `text-xs` bzw. `text-2xs` |
| `text-[22px]` (StatCard-Wert) | `text-kpi` |
| `text-xl` als Seitentitel | `text-base font-semibold` |
| `h-7`-Mini-Buttons | `size="sm"` (32 px) |
| `h-8` an Inputs | Primitive setzt 38 px |
| `hsl(198 12% 70%)`, `hsl(205 18% 74%)` | `border-hover` |
| `bg-blue-600`, `bg-indigo-600` | `bg-info`, `bg-primary` |
| `hover:bg-surface` | `hover:bg-surface-muted/70` |
| `bg-primary-soft/50` | `bg-primary-soft/60` |
| `rounded-lg`-Skeletons | `rounded-xl` (Panelmaß) |

Nach dem Umbau enthält keine Seite mehr einen Farb- oder Größen-Rohwert in eckigen Klammern – Ausnahme sind Abstände auf dem 4-pt-Raster, die Tailwind nicht kennt.

### R18 – Diagramme aus `<div>`-Balken → SVG mit Achse und Legende

```tsx
// vorher – app/(dashboard)/finanzen/page.tsx
<div className="flex h-44 items-end gap-3">{monate.map((m) => (
  <div className="… flex-1 …">
    <div className="w-[38%] rounded-t-[3px] bg-border-strong" style={{ height: `${…}%` }} />
    <div className="w-[38%] rounded-t-[3px] bg-primary"        style={{ height: `${…}%` }} />
    <span className="text-[10px] text-muted-foreground">{m.label}</span>
  </div>))}
</div>

// nachher
<Panel title="Rechnungen vs. Zahlungseingänge" description="6 Monate"
  actions={<ChartLegende reihen={[{ label: "Rechnungen", klasse: "bg-primary-soft-strong" },
                                  { label: "Zahlungen",  klasse: "bg-primary" }]} />}>
  <BarPair daten={monate} reihen={["rechnungen", "zahlungen"]} format={formatEuro} />
</Panel>
```

`BarPair` liegt in `components/ui/charts.tsx` und rendert `<svg>` mit drei Gitterlinien (`stroke-border`), Achsenbeschriftung 11 px tertiär, `<title>` je Balken und Tooltip. Die zweite Serie ist `primary-soft-strong` oder `info` – niemals Lila, niemals ein Verlauf. Die Monatswerte-Zeile unter dem Diagramm entfällt (sie doppelte die Information).

---

## 7. Abnahme

### 7.1 Umsetzungsreihenfolge

Die Etappen sind so geschnitten, dass `next build` nach jeder einzelnen grün ist.

1. **Tokens und Schrift** – `app/globals.css`, `tailwind.config.ts`, `app/layout.tsx` (Inter, Toaster `bottom-right`), `app/fonts/` löschen. Ohne eine einzige Seitenänderung wirkt die App sofort warm, schattig und in neuer Schrift; `label-caps` verliert die Versalien; `rounded-xl` und `shadow-sm` ziehen automatisch mit. Marketing und Portal einmal per Screenshot gegenprüfen.
2. **Primitives** – `components/ui/*` neu stylen; neu anlegen: `tooltip.tsx`, `popover.tsx`, `sheet.tsx`, `panel.tsx`, `field.tsx`, `kpi-card.tsx`, `data-table.tsx`, `charts.tsx`. `npm i @radix-ui/react-tooltip`.
3. **Shell** – `bereiche.ts` (Icons, `/hilfe`), `sidebar*.tsx`, `fahrschul-switcher.tsx`, `neu-menu.tsx`, `nutzer-menu.tsx`, `dashboard-shell.tsx`, `page-header.tsx`, `header-sentinel.tsx`, `mobile-menu-button.tsx`, Inline-Script in `app/(dashboard)/layout.tsx`. Danach `top-bar.tsx` und `area-nav.tsx` löschen.
4. **Shared** – `stat-card.tsx` (Hülle), `empty-state.tsx`, `command-palette.tsx` (+ `global-search.tsx` als Trigger), `assistent-widget.tsx`, `filter-bar.tsx`, `form-layout.tsx`, `split-view.tsx`, `settings-nav.tsx`, `timeline.tsx`, `logo.tsx`, `loeschen-dialog.tsx`, `loading.tsx`.
5. **Seiten** nach Rezeptbuch, in dieser Reihenfolge: Leitstand → Schüler → Rechnungen → Finanzen → Kalender → Zahlungen / Kostenträger / Buchhaltung / Lohn → Formulare → Einstellungen → Cockpit / Berichte → Rest.

### 7.2 Checkliste je Seite

Jede der 35 Seiten wird gegen diese sieben Blöcke abgenommen. Ein Nein irgendwo heißt: Seite ist nicht fertig.

**A – Struktur**
- [ ] Genau ein `PageHeader`, 56 px, eine Zeile, Breadcrumb mit maximal drei Stufen, Titel nicht gedoppelt.
- [ ] Höchstens ein `variant="default"`-Button im sichtbaren Bereich.
- [ ] Die Seite folgt genau einem Muster aus Kapitel 5.
- [ ] Keine zweite Navigationsleiste, keine Tabs im Kopf.
- [ ] Alle Funktionen, Routen, Server-Actions und Rollenregeln unverändert gegenüber v2.

**B – Kontrast AA**
- [ ] Kein `text-primary`, `text-success`, `text-warning`, `text-destructive` oder `text-info` ohne `-text` auf einem Textknoten.
- [ ] `text-foreground-tertiary` nur auf Icons, Platzhaltern, Trennern, `kbd` – nie als alleiniger Informationsträger.
- [ ] Jeder Text auf einer Soft-Fläche nutzt das passende `*-text`-Token.
- [ ] Primärbutton-Text mindestens 13 px/500; jeder Icon-only-Button hat `aria-label`.
- [ ] Der aktive Sidebar-Eintrag ist an Balken **und** weißem Text erkennbar, nicht nur an der Fläche.

**C – Tastatur**
- [ ] Skip-Link → Sidebar → Kopfzeile → Inhalt in dieser Reihenfolge, ohne Fokusverlust.
- [ ] Sichtbarer Fokusring auf jedem interaktiven Element (in der Sidebar `ring-inset ring-sidebar-bar/70`).
- [ ] `⌘K`, `⌘B`, `⌘J`, `/`, `.`, `Esc`, `⌘S` funktionieren; `Esc` schließt genau eine Ebene.
- [ ] Zeilenmenüs sind per Tab erreichbar, obwohl sie erst bei Hover sichtbar werden.
- [ ] Nach dem Schließen von Dialog, Sheet, Drawer oder Palette liegt der Fokus zurück auf dem Auslöser.
- [ ] Im eingeklappten Zustand zeigt jeder Icon-Eintrag seinen Tooltip auch bei `focus-visible`.

**D – Mobil (Prüfbreite 375 px)**
- [ ] Kein horizontaler Seitenscroll; 16 px Gutter.
- [ ] Navigation nur über den Drawer; er schließt bei Routenwechsel.
- [ ] Tabellen haben `mobileCard` oder eine `primary`-Spalte; Zeilenmenüs sind ohne Hover sichtbar.
- [ ] Master/Detail zeigt eine Ansicht mit Zurück-Chevron im Kopf.
- [ ] Touch-Ziele mindestens 40 px; Tabellenzeilen 44 px.
- [ ] Sheets sind Bottom-Sheets und respektieren `env(safe-area-inset-bottom)`.

**E – Kein v2-Rest**
- [ ] Kein `border` an einer Panel-Fläche; Schatten statt Haarlinie.
- [ ] Kein `rounded-xl border bg-card` mehr.
- [ ] Keine Versalien außer in Sidebar-Gruppentiteln und im Palettentitel.
- [ ] Kein tintefarbener Sekundärbutton, kein schwarzes Segment.
- [ ] Keine Icon-Kachel vor Listenzeilen.
- [ ] Keine `border-dashed`-Leerfläche.
- [ ] Keine Begrüßung, kein Vorname im Inhalt.

**F – Kein KI-Template**
- [ ] Kein `backdrop-blur`, kein `bg-gradient-*`, kein `drop-shadow`, kein `text-shadow`.
- [ ] Keine Emoji in `app/(dashboard)` oder `components`.
- [ ] Kein gleichförmiges Kachel-Raster mit Icon im Kreis.
- [ ] Nur lucide-Icons, `strokeWidth 1.75`, Größen 15/16/18/20.
- [ ] Keine Zahl ohne Label plus `sub` oder `delta`.
- [ ] Keine `dark:`-Klasse, kein Theme-Umschalter.
- [ ] Keine Tailwind-Rohfarbe (`bg-blue-*`, `bg-indigo-*`, `text-purple-*`, …).

**G – Daten und Verhalten**
- [ ] Keine neuen Datenbankzugriffe allein wegen der Optik; Sidebar-Zähler bleiben leer, solange `getKontext()` keine Zahlen liefert.
- [ ] Jede Listenseite hat Filterleiste, Sortierung, Pagination und einen Leerzustand mit Aktion.
- [ ] Rollen-Sichtbarkeit kommt ausschließlich aus `bereiche.ts`.
- [ ] Beim Drucken sind Sidebar, Kopf-Aktionen, Toolbars und Speichern-Leiste ausgeblendet; Panels drucken mit Linie statt Schatten (`print:shadow-none print:ring-1 print:ring-border`).

### 7.3 Greps, die vor dem Merge null Treffer liefern müssen

```bash
# v2-Reste
grep -rn "195 17% 96%" app components                        # altes kühles Off-White
grep -rn "top-bar\|area-nav\|MobileAreaBar" app components   # alte Navigation
grep -rn "GeistVF\|GeistMonoVF" app components               # alte Schrift
grep -rn "rounded-xl border bg-card" app components          # alte Panel-Optik
grep -rn "border-dashed border-border-strong" app/\(dashboard\)
grep -rn "bg-foreground text-background" app/\(dashboard\)   # schwarze Segmente/Buttons
grep -rn "Guten Tag\|Willkommen" app/\(dashboard\)

# Kontrast
grep -rnE "text-(primary|success|warning|destructive|info)\b(?!-)" app components   # rg -P
grep -rn "hsl(198 12%\|hsl(205 18%" app components           # Rohwerte in Primitives

# KI-Tells
grep -rn "backdrop-blur\|bg-gradient\|drop-shadow\|text-shadow" app/\(dashboard\) components
grep -rnE "bg-(blue|indigo|violet|purple|fuchsia)-[0-9]" app components lib
grep -rn "dark:" app/\(dashboard\) components/ui components/shared
grep -rnP "[\x{1F300}-\x{1FAFF}]" app/\(dashboard\) components
```

Zusätzlich manuell: `next build` grün, `next lint` ohne neue Fehler, Rollen-Sichttest mit `chef`, `buero` und `fahrlehrer` (Büro sieht keine Kalender-, Prüfungs-, Fahrlehrer-, Lohn- und Einstellungs-Einträge; Fahrlehrer sieht keine Finanzen, Fahrzeuge und Auswertung), sowie ein Tastatur-Durchlauf Skip-Link → Sidebar → Kopf → Tabelle → Zeilenmenü → Sheet → Dialog → `Esc`-Kette.

### 7.4 Bekannte Risiken und die getroffene Entscheidung

| Risiko | Entscheidung |
|---|---|
| Weiß auf `#14A15A` ist 3,35:1 – AA für UI, nicht für Text | Die Farbe stammt aus dem Auftrag und bleibt. Buttontext mindestens 13 px/500; jeder Farbtext nutzt `*-text`. Verlangt der Kunde AA auch hier: `--primary` auf `150 80% 30%`. |
| `shadow-xs`/`sm` wechseln von „none" auf einen echten Schatten | Betrifft 18 Stellen im App-Code – gewollt. Marketing nutzt `shadow-card`/`lift`/`cta` und bleibt unberührt. |
| `tailwind.config.ts` ist mit Marketing und Portal geteilt | Tailwind-Standardgrößen (`text-sm`, `text-base`, …) werden **nicht** umdefiniert. Neue Stufen heißen `text-kpi` und `text-kpi-lg`. `rounded-xl` behält seinen Wert. |
| `CardHeader` wird `flex-row` | Aktionen werden mit `data-card-action` markiert; ohne Markierung bleibt das bisherige Stapelverhalten. Vor dem Merge alle `CardHeader` mit mehr als zwei Kindern sichten. |
| `DialogContent` verliert sein pauschales `p-5` | Fallback-Regel in 4.7; `LoeschenDialog` und `KiLernstatusDialog` werden explizit getestet. |
| Radix-Portale (Select, Dropdown) in Sheets und Dialogen | Popover-Ebene liegt bewusst **über** Sheet und Dialog (z 60). Eine Regel, keine Sonderfälle. |
| Sidebar-Zustand flackert oder hydriert falsch | Breite kommt nur aus CSS (`html[data-sidebar]`), gesetzt vom Inline-Script vor dem ersten Paint. React liest, schreibt nie beim Mount. Jeder `localStorage`-Zugriff in `try/catch`; ohne Speicher immer „offen". |
| Zwei Sheets gleichzeitig | Nicht erlaubt. Der Assistent (`modal={false}`) schließt ein offenes Detail-Sheet, bevor er öffnet. |
| Klebende Ebenen kollidieren | Das Fenster scrollt, nicht `main`. Seitenkopf `top-0`, Tabellenkopf `top-14`, `SettingsNav` und Detail-Panel `top-[calc(var(--header-h)+16px)]`, `SaveBar` `bottom-0`. Tabellen mit eigenem Scroll setzen `stickyHeaderOffset={0}`. |
| Dark Mode | Wird nicht gebaut. `darkMode: ["class"]` bleibt in der Config, es entsteht keine `dark:`-Klasse. Ein halbfertiger Dark-Mode ist laut Auftrag verboten. |
| `font-mono` in `schueler-akte.tsx` | Bleibt und fällt auf den System-Monospace zurück – für den Portal-Code ist das gewollt. |
