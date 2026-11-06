"""Trainingsbilder für die Schilder-Jagd erzeugen (siehe README.md).

Aufbau in drei Stufen: basis.py (Schild platzieren, Fälschungen, Nachbearbeitung),
runde2.py (echte CC0-Fotos als "nichts", Muster, Teilschilder) und dieses Skript:

- Farbstiche (Natriumdampf-Laternen, Dämmerung), Nacht mit Lichtpunkten
- Tempo-Schilder zusätzlich prozedural: verschiedene Schriften, schmal gestaucht,
  Ringstärke variiert, Tempo 30 auch als Zonen-Schild; Fälschungen genauso (60, 80, …)
- stärker ausgeblichene Schilder, Schilder am Rand angeschnitten
- Andreaskreuz zusätzlich prozedural (schlanke Balken, mehrere Streifen)
- Ortstafeln (Anfang/Ende) mit zufälligen Ortsnamen; nicht gelbe Textschilder als "nichts"
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


def kreis_schild(text, rng, zone=False, ende=False, blau=False, pfeile=None):
    """Rundes Schild mit Zahl/Text (BGRA 512×512): Tempo, Gewicht, Breite, Höhe,
    Mindesttempo (blau), als Zonen-Schild und/oder als graues Ende-Schild."""
    g = 512
    bild = np.zeros((g, g, 4), np.uint8)
    dunkel = 90 if ende else 20
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
        bereich[..., :3] = (bereich[..., :3] * (1 - a) + dunkel * a).astype(np.uint8)
    else:
        r_aussen = g // 2 - 6
        mitte = (g // 2, g // 2)
        cv2.circle(bild, mitte, r_aussen, (250, 250, 250, 255), -1)
    ring = rng.uniform(0.07, 0.125) * 2 * r_aussen
    r_rot = int(r_aussen * rng.uniform(0.92, 0.97))
    if blau:
        cv2.circle(bild, mitte, r_rot, (163, 88, 0, 255), -1)
    elif ende:
        cv2.circle(bild, mitte, r_rot, (40, 40, 40, 255), max(3, int(ring * 0.18)))
    else:
        cv2.circle(bild, mitte, r_rot, ROT + (255,), -1)
        cv2.circle(bild, mitte, int(r_rot - ring), (250, 250, 250, 255), -1)
    if len(text) <= 2:
        hoehe = r_aussen * rng.uniform(0.78, 0.98)
    elif len(text) == 3:
        hoehe = r_aussen * rng.uniform(0.62, 0.78)
    else:
        hoehe = r_aussen * rng.uniform(0.48, 0.6)
    z = ziffern(text, hoehe, rng.choice(SCHRIFTEN), rng.uniform(0.68, 0.95))
    platz = r_aussen * (1.45 if not pfeile else 0.98)
    if z.shape[1] > platz:
        z = cv2.resize(z, (int(platz), z.shape[0]), interpolation=cv2.INTER_AREA)
    y = mitte[1] - z.shape[0] // 2
    x = mitte[0] - z.shape[1] // 2
    bereich = bild[y:y + z.shape[0], x:x + z.shape[1]]
    a = z[..., None] / 255.0
    ton = 250 if blau else dunkel
    bereich[..., :3] = (bereich[..., :3] * (1 - a) + ton * a).astype(np.uint8)
    if pfeile:
        # Dreiecke, die von außen auf die Zahl zeigen (Breite: links/rechts, Höhe: oben/unten)
        k = int(r_aussen * 0.72)
        s = int(r_aussen * 0.15)
        for vz in (-1, 1):
            if pfeile == "breite":
                basis = mitte[0] + vz * k
                spitze = (basis - vz * s, mitte[1])
                ecken = [(basis, mitte[1] - s), (basis, mitte[1] + s), spitze]
            else:
                basis = mitte[1] + vz * k
                spitze = (mitte[0], basis - vz * s)
                ecken = [(mitte[0] - s, basis), (mitte[0] + s, basis), spitze]
            cv2.fillPoly(bild, [np.array(ecken, np.int32)], (20, 20, 20, 255))
    if ende:
        # Schrägstriche nur innerhalb des Kreises
        striche = np.zeros_like(bild)
        for k in range(-2, 3):
            versatz = int(k * r_aussen * 0.22)
            p1 = (mitte[0] + versatz - int(r_aussen * 0.7), mitte[1] + int(r_aussen * 0.7) + versatz)
            p2 = (mitte[0] + versatz + int(r_aussen * 0.7), mitte[1] - int(r_aussen * 0.7) + versatz)
            cv2.line(striche, p1, p2, (40, 40, 40, 255), max(3, int(r_aussen * 0.035)))
        maske = np.zeros((g, g), np.uint8)
        cv2.circle(maske, mitte, r_rot, 255, -1)
        striche[maske == 0] = 0
        a = striche[..., 3:] / 255.0
        bild[..., :3] = (bild[..., :3] * (1 - a) + striche[..., :3] * a).astype(np.uint8)
    return bild


VORSILBEN = ["Neu", "Alt", "Ober", "Unter", "Groß", "Klein", "Bad ", "Hohen", "Nieder", "Wester", "Oster", "Frei", "Wolf",
             "Rosen", "Linden", "Eich", "Tann", "Mühl", "Kirch", "Sonnen", "Wald", "Stein", "Hasel", "Bern", "Lau", "Mar", "Wil"]
NACHSILBEN = ["berg", "dorf", "hausen", "feld", "bach", "stadt", "heim", "ingen", "au", "burg", "rode", "hagen", "kirchen",
              "weiler", "brück", "stein", "furt", "wald", "see", "stedt", "leben", "hof", "tal", "ow", "itz"]


def ortsname(rng):
    name = rng.choice(VORSILBEN) + rng.choice(NACHSILBEN)
    if rng.random() < 0.15:
        name += " " + rng.choice(["a. d. Aller", "am Main", "(Saale)", "i. Allgäu", "Nord", "West"])
    return name


def text_einsetzen(bild, text, mitte, hoehe, breite_max, farbe, rng):
    z = ziffern(text, hoehe, rng.choice(SCHRIFTEN), rng.uniform(0.8, 1.0))
    if z.shape[1] > breite_max:
        z = cv2.resize(z, (int(breite_max), z.shape[0]), interpolation=cv2.INTER_AREA)
    y = int(mitte[1] - z.shape[0] / 2)
    x = int(mitte[0] - z.shape[1] / 2)
    bereich = bild[y:y + z.shape[0], x:x + z.shape[1]]
    a = z[: bereich.shape[0], : bereich.shape[1], None] / 255.0
    bereich[..., :3] = (bereich[..., :3] * (1 - a) + np.array(farbe, np.float64) * a).astype(np.uint8)


def ortstafel(rng, ende=False, gelb=True):
    """Ortstafel mit zufälligem Ortsnamen (BGRA 512×512). Nicht gelb = andere Textschilder ("nichts")."""
    g = 512
    bild = np.zeros((g, g, 4), np.uint8)
    h = int(g * rng.uniform(0.34, 0.56))
    y0 = (g - h) // 2
    if gelb:
        grund = (int(rng.uniform(0, 30)), int(rng.uniform(185, 215)), int(rng.uniform(230, 252)))
    else:
        grund = rng.choice([(245, 245, 245), (230, 232, 235), (210, 215, 220), (60, 120, 40), (140, 80, 20)])
    cv2.rectangle(bild, (4, y0), (g - 4, y0 + h), (250, 250, 250, 255), -1)
    cv2.rectangle(bild, (14, y0 + 10), (g - 14, y0 + h - 10), grund + (255,), -1)
    tinte = (20, 20, 20) if sum(grund) > 350 else (245, 245, 245)
    cv2.rectangle(bild, (26, y0 + 22), (g - 26, y0 + h - 22), tinte + (255,), max(3, int(h * 0.02)))
    if ende:
        teil = y0 + int(h * rng.uniform(0.36, 0.44))
        text_einsetzen(bild, f"{ortsname(rng)} {rng.randint(1, 19)} km", (g // 2, (y0 + 22 + teil) // 2), (teil - y0 - 22) * 0.55, g * 0.8, tinte, rng)
        cv2.line(bild, (26, teil), (g - 26, teil), tinte + (255,), max(3, int(h * 0.015)))
        text_einsetzen(bild, ortsname(rng), (g // 2, (teil + y0 + h - 22) // 2), (y0 + h - 22 - teil) * 0.55, g * 0.85, tinte, rng)
        cv2.line(bild, (40, y0 + h - 34), (g - 40, teil + 12), (46, 16, 200, 255), max(8, int(h * 0.07)))
    else:
        zeilen = rng.random() < 0.7
        text_einsetzen(bild, ortsname(rng), (g // 2, y0 + int(h * (0.42 if zeilen else 0.5))), h * rng.uniform(0.26, 0.36), g * 0.85, tinte, rng)
        if zeilen:
            text_einsetzen(bild, rng.choice(["Landkreis ", "Kreis ", "Gemeinde ", "Stadt "]) + ortsname(rng), (g // 2, y0 + int(h * 0.72)), h * 0.12, g * 0.7, tinte, rng)
    return bild


STRASSEN = ["straße", "weg", "allee", "platz", "gasse", "ring", "damm", "ufer", "steig", "chaussee"]


def strassenschild(rng):
    """Straßennamen- und andere Textschilder: schwarze Schrift auf Weiß (oder Weiß auf Blau)."""
    g = 512
    bild = np.zeros((g, g, 4), np.uint8)
    h = int(g * rng.uniform(0.22, 0.5))
    y0 = (g - h) // 2
    hell = rng.random() < 0.75
    grund = rng.choice([(250, 250, 250), (238, 240, 242), (225, 228, 230)]) if hell else rng.choice([(150, 80, 20), (120, 60, 10)])
    tinte = (20, 20, 20) if hell else (245, 245, 245)
    cv2.rectangle(bild, (4, y0), (g - 4, y0 + h), grund + (255,), -1)
    if rng.random() < 0.7:
        rand = max(4, int(h * rng.uniform(0.03, 0.06)))
        cv2.rectangle(bild, (4 + rand * 2, y0 + rand * 2), (g - 4 - rand * 2, y0 + h - rand * 2), tinte + (255,), rand)
    if rng.random() < 0.5:
        text_einsetzen(bild, ortsname(rng) + rng.choice(STRASSEN), (g // 2, y0 + h // 2), h * rng.uniform(0.35, 0.55), g * 0.86, tinte, rng)
    else:
        text_einsetzen(bild, ortsname(rng).upper(), (g // 2, y0 + int(h * 0.33)), h * rng.uniform(0.24, 0.32), g * 0.86, tinte, rng)
        text_einsetzen(bild, ortsname(rng).upper(), (g // 2, y0 + int(h * 0.7)), h * rng.uniform(0.2, 0.28), g * 0.8, tinte, rng)
    return bild


def tempo_schild(zahl, rng, zone=False, ende=False):
    return kreis_schild(str(zahl), rng, zone=zone, ende=ende)


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


# Schilder mit Richtung (Pfeile, Kurven, Steigung) – die nicht stark drehen
NICHT_DREHBAR = {"z103_10", "z103_20", "z105_20", "z108", "z110", "z125", "z208", "z209", "z209_10", "z209_30", "z211", "z214", "z214_10", "z215", "z220", "z220_10", "z222", "z222_10", "z308"}

TEMPO = {"z274_10": 10, "z274_20": 20, "z274_30": 30, "z274_40": 40, "z274_50": 50, "z274_60": 60, "z274_70": 70, "z274_80": 80, "z274_100": 100, "z274_120": 120}
MASSE = {
    "z262": ["2,8t", "3,5t", "5,5t", "7,5t", "12t", "16t", "3t", "6t"],
    "z264": ["2m", "2,2m", "2,3m", "2,5m", "2,1m"],
    "z265": ["3m", "3,5m", "3,8m", "4m", "4,2m", "3,3m"],
}
# Zahlen, die es auf keinem Katalog-Schild gibt
FALSCHE_ZAHLEN = [5, 7, 15, 25, 35, 45, 90, 110]


def quelle_fuer(key, rng):
    """Schildbild für eine Klasse – bei Tempo oft prozedural."""
    r = rng.random()
    if key in TEMPO and r < 0.55:
        return kreis_schild(str(TEMPO[key]), rng)
    if key == "z274_1" and r < 0.55:
        return kreis_schild("30", rng, zone=True)
    if key == "z274_2" and r < 0.55:
        return kreis_schild("30", rng, zone=True, ende=True)
    if key == "z278" and r < 0.6:
        return kreis_schild(str(rng.choice([30, 40, 50, 60, 70, 80, 100, 120])), rng, ende=True)
    if key == "z275" and r < 0.5:
        return kreis_schild(str(rng.choice([30, 40, 50, 60, 80])), rng, blau=True)
    if key in MASSE and r < 0.6:
        return kreis_schild(rng.choice(MASSE[key]), rng, pfeile={"z264": "breite", "z265": "hoehe"}.get(key))
    if key == "z201" and r < 0.6:
        return andreaskreuz(rng)
    if key in ("z310", "z311") and r < 0.65:
        return ortstafel(rng, ende=key == "z311")
    schild = SCHILDER[key]
    if rng.random() < 0.12:
        schild = ausbleichen(schild, rng)
    return schild


def positiv(key, rng):
    # Manche Schilder hängen schief oder liegen am Boden – die dürfen stärker gedreht sein.
    r2.DREHUNG["max"] = 24.0 if key not in NICHT_DREHBAR and rng.random() < 0.25 else 11.0
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
    if r < 0.05:
        # Textschilder wie Ortstafeln, aber nicht gelb (Ortsschilder anderer Länder, Hinweisschilder)
        bild = r2.schild_positiv_ersatz(r2.hintergrund(rng), ortstafel(rng, ende=rng.random() < 0.3, gelb=False), rng)
    elif r < 0.12:
        # Straßennamenschilder – schmale schwarze Schrift darf nicht wie Tempo-Ziffern wirken
        bild = r2.schild_positiv_ersatz(r2.hintergrund(rng), strassenschild(rng), rng)
    elif r < 0.2:
        # Tempo-Fälschungen in derselben Machart (Zahlen, die es nicht gibt; Zonen außer 30)
        if rng.random() < 0.8:
            schild = kreis_schild(str(rng.choice(FALSCHE_ZAHLEN)), rng)
        else:
            schild = kreis_schild(str(rng.choice([10, 20, 40, 50])), rng, zone=True)
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
        erzeugen(1100, 18000, 31, f"{S}/daten_train.npz", False)
        erzeugen(150, 1500, 666_000_000, f"{S}/daten_val.npz", True)
