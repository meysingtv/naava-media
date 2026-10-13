# Design v3 „Schwarz/Orange“ – gesichert

Gesichert am 28.09.2026, bevor das neue, cleane Design mit Hell/Dunkel-Modus kam.

**Stand im Code:** Commit `5b966c7` auf dem Branch `claude/busy-franklin-j35abf`
(„Theorie-App: Antworten mal in Katalog-Reihenfolge, mal gemischt“). Das ist der
letzte Stand mit genau diesem Design.

## Zurückholen oder vergleichen

```bash
# Einzelne Datei im alten Design ansehen
git show 5b966c7:theorie-app/src/lib/theme.ts
git show 5b966c7:theorie-app/src/components/ui.tsx

# Eine Datei auf das alte Design zurücksetzen
git checkout 5b966c7 -- theorie-app/src/components/ui.tsx

# Alle Design-Änderungen seitdem sehen
git diff 5b966c7 HEAD -- theorie-app/src
```

Achtung: Ein komplettes `git checkout 5b966c7 -- theorie-app/src` nimmt auch alle
späteren Funktionen zurück. Besser dateiweise zurückholen.

## So sah es aus

- **Grund** fast schwarz (`#030507`), Karten sehr dunkel (`#0D1317`) mit feiner heller Kante.
- **Orange** als Signalfarbe: Knöpfe mit Verlauf (hell oben, tief unten) und orangem Schein,
  Fortschrittsbalken mit Leuchten, aktive Chips mit Verlauf.
- **Home:** großes Titelfoto, das weich ins Schwarz übergeht, Begrüßung mit Namen,
  Slogan in Handschrift mit orangem Pinselstrich, „Lernen starten“ als Pillen-Knopf mit
  hellem Kreis rechts, vier Glas-Kacheln (Themen, Prüfung, Statistiken, Favoriten) mit
  Verlaufs-Symbolen, Fortschritts-Karte mit Ring, Serie + Wochenpunkte, Zitat-Karte mit Foto.
- **Lernen:** Kategorie-Zeilen mit Symbol links und Foto rechts, das in die Karte verblendet.
- **Fragen:** Frage in eigener Karte mit Kapseln, eckige Kästchen, Status-Leiste und
  Erklär-Karte mit „Richtig ist“ / „Merke dir“.
- **Schrift:** Systemschrift (San Francisco) auf dem iPhone, sonst Inter; Titel sehr fett (800).
- **Tab-Leiste:** native iOS-Leiste (Liquid Glass), Orange als Akzent.

## Farbwerte (lib/theme.ts)

```ts
export const farben = {
  grund: "#030507",
  grundHoch: "#07090C",
  flaeche: "#0D1317",
  flaeche2: "#131A21",
  flaeche3: "#2B3138",
  option: "#111A20",
  linie: "rgba(255,255,255,0.08)",
  linieStark: "rgba(255,255,255,0.14)",
  text: "#FFFFFF",
  text2: "#D3D7DC",
  text3: "#8F959D",
  text4: "#5C626A",
  orange: "#FC5B0E",
  orangeHell: "#F97A1A",
  orangeTief: "#F8470D",
  orangeSoft: "rgba(252,91,14,0.15)",
  orangeLinie: "rgba(252,91,14,0.6)",
  orangeDunkel: "#2A1A0B",
  aufOrange: "#FFFFFF",
  flamme: "#FC6F14",
  blau: "#4DA3FF",
  gruen: "#4ED053",
  gruenDunkel: "#0B1B13",
  gruenOption: "#132E1C",
  rot: "#FF4A3D",
  gelb: "#FFB400",
  iconKreis: "#1B262D",
  ringSpur: "#262B31",
  kachelWeiss: "#FFFBF5",
};

export const verlauf = {
  knopf: ["#FE7212", "#FC5D0D", "#F9490D"],
  knopfSchein: ["rgba(255,150,60,0.68)", "rgba(255,150,60,0.4)", "rgba(255,150,60,0.06)", "rgba(255,150,60,0)"],
  chip: ["#FC8A22", "#FC6C12", "#FC540B"],
  segment: ["#FD8A25", "#FC6619"],
  balken: ["#FB5412", "#FE6616"],
  kategorie: ["#FC7822", "#FD711C"],
  saeule: ["#FCA422", "#FE8E12", "#FC6A0C", "#F9570A"],
  ring: ["#FE8324", "#FD5406"],
};
```
