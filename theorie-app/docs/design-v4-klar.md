# Design v4 „Klar“ – Hell und Dunkel

Nachfolger von v3 (siehe `design-v3-schwarz-orange.md`). Ruhige, flache Flächen,
feine Linien und Orange nur dort, wo es etwas zu tun gibt – ohne Glühen und Verläufe.

## Farbschemata

- **Dunkel** (Standard): fast schwarzer, neutraler Grund `#09090B`, Karten `#141417`.
- **Hell** (Weiß/Orange): weißer Grund, hellgraue Karten `#F4F4F6`, Orange `#F9600F`.
- **Wie iPhone**: folgt der Einstellung des Geräts.

Umschalten: Einstellungen → Darstellung. Die Wahl wird gespeichert (`spur-erscheinung`).

## So funktioniert es im Code

- `lib/theme.ts`: Paletten `DUNKEL` und `HELL`; `farben` ist die aktuelle Palette.
- `lib/erscheinung.tsx`: merkt sich die Wahl, tauscht die Palette und baut die
  Navigation neu auf; ein Schleier verdeckt den Wechsel, danach geht es zurück
  zur Seite, auf der umgeschaltet wurde.
- Neue Farben immer über `farben.x` (nie feste Hex-Werte) – außer auf Fotos
  (`farben.fotoText`) und bei Verkehrszeichen/Lageplänen (feste Farben).
- Geteilte Bausteine (`components/ui.tsx`, Profilbild) lesen `useFarben()`.

## Immer dunkel

Clips (Tab, Clip-Ansicht, Ersteller-Profil, Kommentare) und der Schild-Scanner
bleiben in beiden Modi dunkel: Sie nutzen `DUNKEL` und sind in `ImmerDunkel`
eingepackt; die Statusleiste ist dort hell (`useHelleStatusleiste`).
