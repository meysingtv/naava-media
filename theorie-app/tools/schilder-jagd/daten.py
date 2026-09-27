"""Trainingsbilder für die Schilder-Jagd erzeugen (siehe README.md).

Aufbau in drei Stufen: basis.py (Schild platzieren, Fälschungen, Nachbearbeitung),
runde2.py (echte CC0-Fotos als "nichts", Muster, Teilschilder) und dieses Skript:

- Farbstiche (Natriumdampf-Laternen, Dämmerung), Nacht mit Lichtpunkten
- Tempo-Schilder zusätzlich prozedural: verschiedene Schriften, schmal gestaucht,
  Ringstärke variiert, Tempo 30 auch als Zonen-Schild; Fälschungen genauso (60, 80, …)
- stärker ausgeblichene Schilder, Schilder am Rand angeschnitten
- Andreaskreuz zusätzlich prozedural (schlanke Balken, mehrere Streifen)
- Schilder ohne Richtungspfeil teils stärker gedreht (schief, am Boden)
- Hintergründe nur aus App-Fotos (Bildnachweise in der App) und CC0/PD-Fotos
"""
import os
import random
import sys
from multiprocessing import Pool

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

S = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, S)
import basis as alt  # noqa: E402
import runde2 as r2  # noqa: E402
from basis import ARBEIT, KEYS, SCHILDER, faelschungen, nachbearbeiten  # noqa: E402

# Schriften für die Ziffern der Tempo-Schilder (was fehlt, wird übersprungen)
SCHRIFTEN = [
    p
    for p in [
        f"{alt.APP}/node_modules/@expo-google-fonts/archivo/800ExtraBold/Archivo_800ExtraBold.ttf",
        f"{alt.APP}/node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf",
        f"{alt.APP}/node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
    ]
    if os.path.exists(p)
]
ROT = (46, 16, 200)  # BGR


def ziffern(text, hoehe, schrift, stauchung):
    """Schwarzer Text als Graustufen-Maske, horizontal gestaucht."""
    f = ImageFont.truetype(schrift, int(hoehe * 1.4))
    l, o, r, u = f.getbbox(text)
    b, h = r - l, u - o
    bild = Image.new("L", (b + 8, h + 8), 0)
    ImageDraw.Draw(bild).text((4 - l, 4 - o), text, font=f, fill=255)
    m = np.array(bild)
    neue_h = int(hoehe)
    neue_b = max(1, int(m.shape[1] * neue_h / m.shape[0] * stauchung))
    return cv2.resize(m, (neue_b, neue_h), interpolation=cv2.INTER_AREA)


def tempo_schild(zahl, rng, zone=False, ende=False):
    """Rundes Tempo-Schild (BGRA 512×512), optional als Zonen-Schild oder Ende-Schild."""
    g = 512
    bild = np.zeros((g, g, 4), np.uint8)
    if zone:
        # Weißes Hochformat-Schild mit Rahmen, Kreis oben, "ZONE" unten
        breite = int(g * 0.78)
        x0 = (g - breite) // 2
        cv2.rectangle(bild, (x0, 8), (x0 + breite, g - 8), (250, 250, 250, 255), -1)
        cv2.rectangle(bild, (x0 + 10, 18), (x0 + breite - 10, g - 18), (25, 25, 25, 255), 5)
        r_aussen = int(breite * 0.4)
        mitte = (g // 2, 30 + r_aussen + 10)
        z = ziffern("ZONE", g * 0.13, rng.choice(SCHRIFTEN), rng.uniform(0.8, 1.0))
        y = g - 40 - z.shape[0]
        x = g // 2 - z.shape[1] // 2
        bereich = bild[y:y + z.shape[0], x:x + z.shape[1]]
        a = z[..., None] / 255.0
        bereich[..., :3] = (bereich[..., :3] * (1 - a) + 20 * a).astype(np.uint8)
    else:
        r_aussen = g // 2 - 6
        mitte = (g // 2, g // 2)
        cv2.circle(bild, mitte, r_aussen, (250, 250, 250, 255), -1)
    ring = rng.uniform(0.07, 0.125) * 2 * r_aussen
    r_rot = int(r_aussen * rng.uniform(0.92, 0.97))
    if ende:
        cv2.circle(bild, mitte, r_rot, (40, 40, 40, 255), max(3, int(ring * 0.18)))
    else:
        cv2.circle(bild, mitte, r_rot, ROT + (255,), -1)
        cv2.circle(bild, mitte, int(r_rot - ring), (250, 250, 250, 255), -1)
    z = ziffern(str(zahl), r_aussen * rng.uniform(0.78, 0.98), rng.choice(SCHRIFTEN), rng.uniform(0.68, 0.95))
    if z.shape[1] > r_aussen * 1.5:
        z = cv2.resize(z, (int(r_aussen * 1.5), z.shape[0]), interpolation=cv2.INTER_AREA)
    y = mitte[1] - z.shape[0] // 2
    x = mitte[0] - z.shape[1] // 2
    bereich = bild[y:y + z.shape[0], x:x + z.shape[1]]
    a = z[..., None] / 255.0
    ton = 90 if ende else 18
    bereich[..., :3] = (bereich[..., :3] * (1 - a) + ton * a).astype(np.uint8)
    if ende:
        for k in range(-2, 3):
            versatz = int(k * r_aussen * 0.22)
            p1 = (mitte[0] + versatz - int(r_aussen * 0.7), mitte[1] + int(r_aussen * 0.7) + versatz)
            p2 = (mitte[0] + versatz + int(r_aussen * 0.7), mitte[1] - int(r_aussen * 0.7) + versatz)
            cv2.line(bild, p1, p2, (40, 40, 40, 255), max(3, int(r_aussen * 0.035)))
        # Striche nur innerhalb des Kreises
        maske = np.zeros((g, g), np.uint8)
        cv2.circle(maske, mitte, r_rot, 255, -1)
        bild[maske == 0] = 0
        cv2.circle(bild, mitte, r_rot, (40, 40, 40, 255), max(3, int(ring * 0.18)))
    return bild


def farbstich(bild, rng):
    """Ganzes Bild einfärben: Laternenlicht, Dämmerung, Leuchtstoff."""
    art = rng.random()
    if art < 0.45:
        stich = np.array([rng.uniform(0.35, 0.6), rng.uniform(0.65, 0.85), 1.0], np.float32)  # orange (BGR)
    elif art < 0.75:
        stich = np.array([1.0, rng.uniform(0.8, 0.95), rng.uniform(0.6, 0.8)], np.float32)  # bläulich
    else:
        stich = np.array([rng.uniform(0.75, 0.9), 1.0, rng.uniform(0.75, 0.9)], np.float32)  # grünlich
    return bild * stich * rng.uniform(0.8, 1.15)


def lichtpunkte(bild, rng):
    """Nacht: dunkel mit hellen, unscharfen Lichtern."""
    bild = bild * rng.uniform(0.05, 0.3)
    ebene = np.zeros_like(bild)
    for _ in range(rng.randint(2, 9)):
        c = (rng.randint(0, ARBEIT), rng.randint(0, ARBEIT))
        farbe = (rng.uniform(80, 200), rng.uniform(170, 240), 255) if rng.random() < 0.6 else (230, 230, 255)
        cv2.circle(ebene, c, rng.randint(2, 9), farbe, -1)
    return bild + cv2.GaussianBlur(ebene, (0, 0), rng.uniform(1.5, 5))


def ausbleichen(schild_bgra, rng):
    """Rot wird orange/rosa, Blau wird blass – wie bei alten Schildern."""
    b = schild_bgra.copy()
    hsv = cv2.cvtColor(b[..., :3], cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 0] = (hsv[..., 0] + rng.uniform(3, 10)) % 180
    hsv[..., 1] *= rng.uniform(0.35, 0.75)
    hsv[..., 2] = np.clip(hsv[..., 2] * rng.uniform(1.0, 1.25), 0, 255)
    b[..., :3] = cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR)
    return b


def andreaskreuz(rng):
    """Andreaskreuz wie in echt: schlanke weiße Balken mit mehreren roten Streifen."""
    g = 512
    bild = np.zeros((g, g, 4), np.uint8)
    winkel = np.deg2rad(rng.uniform(44, 60))  # gegen die Waagerechte
    laenge = g * rng.uniform(0.9, 1.02) / np.sin(winkel) * 0.98
    laenge = min(laenge, g * 1.25)
    breite = laenge * rng.uniform(0.1, 0.15)
    streifen = rng.choice([2, 3, 3])
    rand = max(2, int(breite * 0.06))
    for vz in (1, -1):
        balken = np.zeros((int(breite) + 2 * rand, int(laenge), 4), np.uint8)
        balken[:] = (60, 60, 60, 255)
        balken[rand:-rand, rand:-rand] = (245, 245, 245, 255)
        # rote Streifen: an beiden Enden und dazwischen gleichmäßig, die Mitte bleibt weiß
        halb = laenge / 2
        feld = halb / (streifen * 2)
        for k in range(streifen):
            for seite in (0, 1):
                a = int(k * 2 * feld) if seite == 0 else int(laenge - (k * 2 + 1) * feld)
                balken[rand:-rand, max(rand, a):min(int(laenge) - rand, int(a + feld))] = ROT + (255,)
        h, w = balken.shape[:2]
        M = cv2.getRotationMatrix2D((w / 2, h / 2), np.rad2deg(winkel) * vz, 1.0)
        M[0, 2] += g / 2 - w / 2
        M[1, 2] += g / 2 - h / 2
        schicht = cv2.warpAffine(balken, M, (g, g), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
        a = schicht[..., 3:] / 255.0
        bild = (bild * (1 - a) + schicht * a).astype(np.uint8)
    return bild


# Schilder, deren Bedeutung sich beim Drehen nicht ändert (keine Pfeile)
DREHBAR = {"z101", "z102", "z131", "z201", "z205", "z206", "z250", "z267", "z274_30", "z274_50", "z274_70", "z276", "z283", "z286", "z314", "z350", "z357", "z224", "z237"}

TEMPO = {"z274_30": 30, "z274_50": 50, "z274_70": 70}
FALSCHE_ZAHLEN = [5, 7, 10, 20, 40, 60, 60, 80, 80, 90, 100, 100, 120, 15, 25, 3]


def quelle_fuer(key, rng):
    """Schildbild für eine Klasse – bei Tempo oft prozedural."""
    if key in TEMPO and rng.random() < 0.55:
        return tempo_schild(TEMPO[key], rng, zone=key == "z274_30" and rng.random() < 0.35)
    if key == "z201" and rng.random() < 0.6:
        return andreaskreuz(rng)
    schild = SCHILDER[key]
    if rng.random() < 0.12:
        schild = ausbleichen(schild, rng)
    return schild


def positiv(key, rng):
    # Manche Schilder hängen schief oder liegen am Boden – die dürfen stärker gedreht sein.
    r2.DREHUNG["max"] = 24.0 if key in DREHBAR and rng.random() < 0.25 else 11.0
    bild = r2.hintergrund(rng)
    nacht = rng.random() < 0.08
    if nacht:
        bild = lichtpunkte(bild, rng)
    quelle = quelle_fuer(key, rng)
    # Schild wie in Runde 2 platzieren, aber mit eigener Quelle und manchmal angeschnitten
    alt_schilder = SCHILDER[key]
    SCHILDER[key] = quelle
    try:
        bild = r2.schild_positiv(bild, key, rng)
    finally:
        SCHILDER[key] = alt_schilder
    if rng.random() < 0.12:
        bild = farbstich(bild, rng)
    return bild


def negativ(rng):
    r = rng.random()
    if r < 0.12:
        # Tempo-Fälschungen und Ende-Schilder in derselben Machart
        if rng.random() < 0.75:
            schild = tempo_schild(rng.choice(FALSCHE_ZAHLEN), rng, zone=rng.random() < 0.2)
        else:
            schild = tempo_schild(rng.choice([30, 50, 60, 70, 80, 100]), rng, ende=True)
        bild = r2.schild_positiv_ersatz(r2.hintergrund(rng), schild, rng)
    else:
        rest = random.Random(rng.randrange(1 << 30))
        bild = None
        q = rest.random()
        if q < 0.45:
            bild = r2.echter_ausschnitt(rest)
        elif q < 0.62:
            f = faelschungen()
            bild = r2.schild_positiv_ersatz(r2.hintergrund(rest), f[rest.randrange(len(f))], rest)
        elif q < 0.74:
            bild = r2.muster(r2.hintergrund(rest), rest)
        elif q < 0.84:
            bild = alt.ablenkung(r2.hintergrund(rest), rest)
        elif q < 0.93:
            bild = r2.teilschild(r2.hintergrund(rest), rest)
        else:
            bild = alt.zufalls_hintergrund(rest)
    if rng.random() < 0.06:
        bild = lichtpunkte(bild, rng)
    if rng.random() < 0.12:
        bild = farbstich(bild, rng)
    return bild


def ein_beispiel(args):
    klasse, saat, val = args
    rng = random.Random(saat)
    np.random.seed(saat % (2**32 - 1))
    r2.MODUS["val"] = val
    alt.hintergruende_laden()
    r2.negative_laden()
    bild = negativ(rng) if klasse == len(KEYS) else positiv(KEYS[klasse], rng)
    return nachbearbeiten(np.clip(bild, 0, 255), rng)


def erzeugen(je_klasse, nichts, saat, datei, val):
    auftraege = [(k, saat + k * 100000 + i, val) for k in range(len(KEYS)) for i in range(je_klasse)]
    auftraege += [(len(KEYS), saat + 9_000_000 + i, val) for i in range(nichts)]
    with Pool(4) as pool:
        bilder = pool.map(ein_beispiel, auftraege, chunksize=256)
    X = np.stack(bilder)
    y = np.array([a[0] for a in auftraege], np.int32)
    np.savez_compressed(datei, X=X, y=y)
    print(datei, X.shape, np.bincount(y).tolist()[-3:], flush=True)


if __name__ == "__main__":
    teil = sys.argv[1] if len(sys.argv) > 1 else "alles"
    if teil == "probe":
        erzeugen(4, 60, 21, f"{S}/daten_probe.npz", False)
    elif teil == "kreuz":
        rng = random.Random(5)
        teile = []
        for _ in range(8):
            b = andreaskreuz(rng).astype(np.float32)
            a = b[..., 3:] / 255
            teile.append(cv2.resize((b[..., :3] * a + np.array([90, 140, 90]) * (1 - a)).astype(np.uint8), (160, 160)))
        cv2.imwrite(f"{S}/kreuz.jpg", np.concatenate(teile, 1))
    elif teil == "tempo":
        rng = random.Random(3)
        teile = []
        for z, zone, ende in [(30, False, False), (30, True, False), (50, False, False), (70, False, False), (60, False, False), (80, True, False), (30, False, True), (100, False, False)]:
            b = tempo_schild(z, rng, zone=zone, ende=ende).astype(np.float32)
            a = b[..., 3:] / 255
            teile.append(cv2.resize((b[..., :3] * a + np.array([90, 140, 90]) * (1 - a)).astype(np.uint8), (160, 160)))
        cv2.imwrite(f"{S}/tempo.jpg", np.concatenate(teile, 1))
    else:
        erzeugen(2000, 15000, 31, f"{S}/daten_train.npz", False)
        erzeugen(250, 1800, 666_000_000, f"{S}/daten_val.npz", True)
