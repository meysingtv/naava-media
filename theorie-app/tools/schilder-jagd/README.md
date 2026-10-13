# Schilder-Jagd – Erkennungsmodell

Die Kamera-Erkennung der Schilder-Jagd ist ein kleines Faltungsnetz für 100 Schilder
(Eingabe 64 × 64 Pixel, eine normale und fünf separierbare Faltungen wie bei MobileNet,
rund 79 000 Gewichte). Es läuft komplett auf dem Handy in reinem JavaScript
(`src/lib/schild-netz.ts`), ohne Internet und ohne dass ein Foto das Gerät verlässt.
Die Gewichte stehen in `src/lib/schilder-modell.ts` (float16, base64) und werden mit den
Skripten in diesem Ordner erzeugt.

## Woraus das Modell lernt

- **Schilder:** nur die eigenen Zeichnungen der App (`schilder/*.png`, 512 px, transparent),
  tausendfach verändert: schräg, verdreht, nah/fern, verblasst, nachts, Laternenlicht,
  Spiegelung, Unschärfe, Mast, Zusatzzeichen, Nachbarschilder, verdeckende Hände. Zusätzlich
  prozedural nachgebaut: Tempo-, Gewichts-, Breiten- und Höhenschilder mit echten Schriftarten
  (auch Tempo-30-Zone und Ende-Zeichen), Andreaskreuze und Ortstafeln mit zufälligen Ortsnamen.
- **„Kein Schild“:** rund 780 gemeinfreie Alltagsfotos (CC0 / Public Domain über Openverse),
  Streifen-/Fenster-/Textmuster, Schilder, die es im Album nicht gibt (Tempo 90, Buchstaben
  statt Piktogramm, weiße Ortsschilder anderer Länder …) und angeschnittene Schilder.
- **Hintergründe:** die Fotos der App (Nachweise in der App unter „Bildnachweise“) und die
  CC0/PD-Fotos. Keine fremden Schilderfotos, keine Datensätze mit unklarer Lizenz.

## Neu trainieren

```bash
cd theorie-app/tools/schilder-jagd
python3 -m venv .venv
.venv/bin/pip install tensorflow opencv-python-headless numpy pillow
.venv/bin/python negativ_laden.py   # einmalig: ~780 CC0/PD-Fotos nach negativ/
.venv/bin/python daten.py           # 128 000 Trainings- und 16 500 Prüfbilder (ca. 15 Minuten)
.venv/bin/python trainieren.py      # ca. 75 Minuten auf 4 CPU-Kernen
.venv/bin/python exportieren.py     # schreibt src/lib/schilder-modell.ts
```

Ein vorhandenes Modell lässt sich mit `START=modell.keras EPOCHEN=10 .venv/bin/python trainieren.py`
weitertrainieren (Feinschliff), z. B. nach kleinen Änderungen an den Trainingsbildern.

`daten.py probe` erzeugt nur eine kleine Stichprobe, `daten.py tempo` und `daten.py kreuz`
zeigen die nachgebauten Tempo-Schilder bzw. Andreaskreuze als Bild.

## Ein neues Schild aufnehmen

1. Zeichnung in `src/components/zeichen.tsx` und Eintrag in `ZEICHEN_INFO` ergänzen.
2. Das Schild als PNG (512 × 512, transparenter Hintergrund) nach `schilder/<key>.png`
   rendern – zum Beispiel über den Web-Export der App mit einer temporären Seite, die nur
   `<Verkehrszeichen zeichen="<key>" groesse={256} />` zeigt, und einem Screenshot mit
   doppelter Pixeldichte ohne Hintergrund.
3. Den Key in `schild-keys.json` eintragen.
4. Neu trainieren und exportieren (siehe oben). Das Album in der App richtet sich
   automatisch nach den Klassen im Modell.
