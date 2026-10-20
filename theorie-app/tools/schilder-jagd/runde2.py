"""Trainingsbilder, Runde 2 – robuster für echte Fotos (wird von daten.py benutzt).

Neu gegenüber Runde 1:
- Klasse "nichts" vor allem aus echten Alltagsfotos (gemeinfrei, CC0/PD), dazu
  Streifen-, Fenster- und Textschild-Muster, halb sichtbare Schilder, Fälschungen.
- Echte Schilder auch vor diesen Fotos, nachts, in Schwarzweiß und mit Nachbarschild.
"""
import glob
import json
import os
import random
import sys
from multiprocessing import Pool

import cv2
import numpy as np

S = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, S)
import basis as alt  # noqa: E402
from basis import ARBEIT, KEYS, KLASSEN, SCHILDER, farbe_verschieben, faelschungen, nachbearbeiten  # noqa: E402

NEG_PFADE = sorted(glob.glob(f"{S}/negativ/*.jpg"))
NEG_TRAIN = [p for i, p in enumerate(NEG_PFADE) if i % 10 != 0]
NEG_VAL = [p for i, p in enumerate(NEG_PFADE) if i % 10 == 0]
NEGATIVE = []
MODUS = {"val": False}
# Größte Drehung eines Schildes in Grad (daten.py erlaubt bei manchen Schildern mehr).
DREHUNG = {"max": 11.0}


def negative_laden():
    if NEGATIVE:
        return
    for p in NEG_VAL if MODUS["val"] else NEG_TRAIN:
        b = cv2.imread(p, cv2.IMREAD_COLOR)
        if b is None or min(b.shape[:2]) < 64:
            continue
        h, w = b.shape[:2]
        f = 480 / max(h, w)
        if f < 1:
            b = cv2.resize(b, (int(w * f), int(h * f)), interpolation=cv2.INTER_AREA)
        NEGATIVE.append(b)


def echter_ausschnitt(rng, klein=0.1, gross=1.0):
    b = NEGATIVE[rng.randrange(len(NEGATIVE))]
    h, w = b.shape[:2]
    kante = min(h, w)
    s = max(16, int(kante * rng.uniform(klein, gross)))
    y = rng.randint(0, h - s)
    x = rng.randint(0, w - s)
    crop = b[y:y + s, x:x + s]
    if rng.random() < 0.5:
        crop = crop[:, ::-1]
    return cv2.resize(crop, (ARBEIT, ARBEIT), interpolation=cv2.INTER_AREA if s > ARBEIT else cv2.INTER_LINEAR).astype(np.float32)


def hintergrund(rng):
    if rng.random() < 0.5:
        return echter_ausschnitt(rng, 0.12, 0.9)
    return alt.zufalls_hintergrund(rng)


def einfuegen(bild, schild_bgra, rng, groesse, mitte, effekte=True):
    """Schild (BGRA) mit Perspektive, Drehung und Farbe an `mitte` setzen."""
    groesse = max(8, int(groesse))
    s = cv2.resize(schild_bgra, (groesse, groesse), interpolation=cv2.INTER_AREA).astype(np.float32)
    src = np.float32([[0, 0], [groesse, 0], [groesse, groesse], [0, groesse]])
    d = groesse * rng.uniform(0.0, 0.16)
    kippen = rng.choice(["links", "rechts", "oben", "unten", "keins"])
    dst = src.copy()
    if kippen == "links":
        dst[0, 1] += d; dst[3, 1] -= d
    elif kippen == "rechts":
        dst[1, 1] += d; dst[2, 1] -= d
    elif kippen == "oben":
        dst[0, 0] += d; dst[1, 0] -= d
    elif kippen == "unten":
        dst[3, 0] += d; dst[2, 0] -= d
    dst += np.float32(np.random.default_rng(rng.randrange(1 << 30)).normal(0, groesse * 0.02, dst.shape))
    winkel = np.deg2rad(rng.uniform(-DREHUNG["max"], DREHUNG["max"]))
    c = np.float32([groesse / 2, groesse / 2])
    rot = np.float32([[np.cos(winkel), -np.sin(winkel)], [np.sin(winkel), np.cos(winkel)]])
    dst = (dst - c) @ rot.T + c
    dst += np.float32([mitte[0] - groesse / 2, mitte[1] - groesse / 2])
    M = cv2.getPerspectiveTransform(src, dst)
    warp = cv2.warpPerspective(s, M, (ARBEIT, ARBEIT), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    farbe = farbe_verschieben(warp[..., :3], rng)
    maske = (warp[..., 3:] / 255.0).astype(np.float32)
    if effekte:
        if rng.random() < 0.35:
            grau = np.full_like(farbe, rng.uniform(150, 235))
            a = rng.uniform(0.05, 0.35)
            farbe = farbe * (1 - a) + grau * a
        if rng.random() < 0.3:
            fleck = cv2.GaussianBlur(np.random.default_rng(rng.randrange(1 << 30)).normal(0, 1, (ARBEIT, ARBEIT)).astype(np.float32), (0, 0), rng.uniform(3, 10))[..., None]
            fleck = fleck / (np.abs(fleck).max() + 1e-6)
            farbe = farbe * (1 + fleck * rng.uniform(0.05, 0.2))
        if rng.random() < 0.3:
            yy, xx = np.mgrid[0:ARBEIT, 0:ARBEIT].astype(np.float32)
            cx, cy = rng.uniform(0, ARBEIT), rng.uniform(0, ARBEIT)
            r = rng.uniform(15, 60)
            farbe = farbe + np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * r * r))[..., None] * rng.uniform(40, 160)
        if rng.random() < 0.25:
            yy, xx = np.mgrid[0:ARBEIT, 0:ARBEIT].astype(np.float32)
            n = np.array([rng.uniform(-1, 1), rng.uniform(-1, 1)])
            n /= np.linalg.norm(n) + 1e-6
            schatten = ((xx - ARBEIT / 2) * n[0] + (yy - ARBEIT / 2) * n[1] + rng.uniform(-40, 40)) > 0
            farbe = farbe * np.where(schatten[..., None], rng.uniform(0.45, 0.8), 1.0)
    return bild * (1 - maske) + farbe * maske, maske


def schild_positiv(bild, key, rng):
    """Ein Katalog-Schild als Hauptmotiv – mit allen Varianten wie im echten Leben."""
    groesse = ARBEIT * rng.uniform(0.42, 1.05)
    mitte = (ARBEIT / 2 + rng.uniform(-0.12, 0.12) * ARBEIT, ARBEIT / 2 + rng.uniform(-0.12, 0.12) * ARBEIT)

    # Nachbarschild am Rand (nur teilweise im Bild)
    if rng.random() < 0.15:
        andere = [k for k in KEYS if k != key]
        quelle = SCHILDER[rng.choice(andere)] if rng.random() < 0.7 else faelschungen()[rng.randrange(len(faelschungen()))]
        g2 = groesse * rng.uniform(0.35, 0.7)
        seite = rng.choice([(-1, 0), (1, 0), (0, -1), (0, 1)])
        abstand = groesse / 2 + g2 * rng.uniform(0.05, 0.4)
        bild, _ = einfuegen(bild, quelle, rng, g2, (mitte[0] + seite[0] * abstand, mitte[1] + seite[1] * abstand))

    # Mast
    if rng.random() < 0.45:
        breite = rng.randint(5, 12)
        mx = int(mitte[0] + rng.uniform(-6, 6))
        g = rng.uniform(90, 200)
        cv2.rectangle(bild, (mx - breite // 2, 0 if rng.random() < 0.3 else int(mitte[1])), (mx + breite // 2, ARBEIT), (g, g, g * rng.uniform(0.95, 1.05)), -1)
    # Zusatzzeichen darunter
    if rng.random() < 0.2:
        oben = int(mitte[1] + groesse * rng.uniform(0.47, 0.56))
        b = int(groesse * rng.uniform(0.7, 1.0))
        x0 = int(mitte[0] - b / 2)
        cv2.rectangle(bild, (x0, oben), (x0 + b, oben + int(b * 0.45)), (245, 245, 245), -1)
        cv2.rectangle(bild, (x0, oben), (x0 + b, oben + int(b * 0.45)), (20, 20, 20), 2)
        for i in range(rng.randint(1, 3)):
            yy = oben + 6 + i * 9
            cv2.line(bild, (x0 + 8, yy), (x0 + b - 8 - rng.randint(0, 20), yy), (25, 25, 25), 3)

    nacht = rng.random() < 0.07
    if nacht:
        bild = bild * rng.uniform(0.05, 0.3)
    bild, maske = einfuegen(bild, SCHILDER[key], rng, groesse, mitte)
    if nacht:
        # Rückstrahlendes Schild im Licht: leichtes Überstrahlen
        schein = cv2.GaussianBlur(bild * maske, (0, 0), rng.uniform(2, 6))
        bild = bild + schein * rng.uniform(0.2, 0.7)
    if rng.random() < 0.15:
        for _ in range(rng.randint(1, 3)):
            p1 = (rng.randint(0, ARBEIT), rng.randint(0, ARBEIT))
            p2 = (rng.randint(0, ARBEIT), rng.randint(0, ARBEIT))
            ton = rng.uniform(20, 90)
            cv2.line(bild, p1, p2, (ton * 0.8, ton, ton * 0.7), rng.randint(2, 6))
    # Hände oder Gegenstände verdecken den Rand (Schild wird gehalten, Äste …)
    if rng.random() < 0.12:
        for _ in range(rng.randint(1, 2)):
            winkel = rng.uniform(0, 2 * np.pi)
            abstand = groesse * rng.uniform(0.35, 0.5)
            c = (int(mitte[0] + np.cos(winkel) * abstand), int(mitte[1] + np.sin(winkel) * abstand))
            haut = rng.choice([(150, 175, 225), (110, 140, 190), (70, 95, 140), (40, 50, 70), (180, 190, 200)])
            cv2.ellipse(bild, c, (int(groesse * rng.uniform(0.08, 0.16)), int(groesse * rng.uniform(0.06, 0.12))), rng.uniform(0, 180), 0, 360, haut, -1)
    # selten Schwarzweiß (alte Fotos) – nicht öfter, sonst verlernt das Netz, auf Rot zu achten
    if rng.random() < 0.015:
        grau = bild.mean(axis=2, keepdims=True)
        bild = np.repeat(grau, 3, axis=2)
    return bild


def muster(bild, rng):
    """Streifen, Fensterraster, Gitter, Textschilder – typische Fehlalarme."""
    bild = np.ascontiguousarray(np.clip(bild, 0, 255).astype(np.uint8))
    art = rng.random()
    zufallsfarbe = lambda: tuple(int(rng.uniform(0, 255)) for _ in range(3))
    if art < 0.35:
        # Parallele Streifen in einem Rechteck oder über das ganze Bild
        ebene = np.zeros((ARBEIT * 3, ARBEIT * 3, 3), np.uint8)
        ebene[:] = zufallsfarbe() if rng.random() < 0.5 else (235, 235, 235)
        farbe = zufallsfarbe() if rng.random() < 0.5 else (20, 20, 20)
        abstand = rng.randint(6, 26)
        dicke = rng.randint(2, max(3, abstand // 2))
        for y in range(0, ARBEIT * 3, abstand):
            cv2.line(ebene, (0, y), (ARBEIT * 3, y), farbe, dicke)
        M = cv2.getRotationMatrix2D((ARBEIT * 1.5, ARBEIT * 1.5), rng.uniform(0, 180), 1.0)
        ebene = cv2.warpAffine(ebene, M, (ARBEIT * 3, ARBEIT * 3))[ARBEIT:ARBEIT * 2, ARBEIT:ARBEIT * 2]
        if rng.random() < 0.5:
            bild = ebene
        else:
            x0, y0 = rng.randint(0, ARBEIT // 2), rng.randint(0, ARBEIT // 2)
            x1, y1 = rng.randint(x0 + 30, ARBEIT), rng.randint(y0 + 30, ARBEIT)
            bild[y0:y1, x0:x1] = ebene[y0:y1, x0:x1]
    elif art < 0.6:
        # Fenster / Kacheln / Gitter
        grund = zufallsfarbe()
        bild[:] = grund
        fx, fy = rng.randint(10, 40), rng.randint(10, 40)
        rand = rng.randint(2, 8)
        farbe = zufallsfarbe()
        for y in range(rng.randint(0, fy), ARBEIT, fy):
            for x in range(rng.randint(0, fx), ARBEIT, fx):
                cv2.rectangle(bild, (x, y), (x + fx - rand, y + fy - rand), farbe, -1 if rng.random() < 0.7 else 2)
    else:
        # Textschild (Straßenname, Hinweis, Wegweiser)
        # kein Gelb (Ortstafel) – Textschilder in Weiß, Blau, Grün, Braun
        grund = rng.choice([(245, 245, 245), (160, 90, 20), (40, 120, 30), (235, 235, 235), (40, 70, 120)])
        text = (20, 20, 20) if sum(grund) > 500 else (250, 250, 250)
        b = rng.randint(60, 128)
        h = rng.randint(28, 110)
        x0, y0 = rng.randint(0, ARBEIT - b), rng.randint(0, ARBEIT - h)
        cv2.rectangle(bild, (x0, y0), (x0 + b, y0 + h), grund, -1)
        if rng.random() < 0.6:
            cv2.rectangle(bild, (x0 + 3, y0 + 3), (x0 + b - 3, y0 + h - 3), text, 2)
        zeilen = max(1, min(4, h // 24))
        for i in range(zeilen):
            wort = "".join(rng.choice("ABCDEFGHIKLMNOPRSTUVWZaeinrstu") for _ in range(rng.randint(3, 10)))
            cv2.putText(bild, wort, (x0 + 6, y0 + 20 + i * 24), cv2.FONT_HERSHEY_SIMPLEX, rng.uniform(0.4, 0.8), text, rng.randint(1, 2))
        if rng.random() < 0.3 and grund != (160, 90, 20):
            cv2.arrowedLine(bild, (x0 + 8, y0 + h - 10), (x0 + b - 8, y0 + h - 10), text, 4, tipLength=0.3)
    return bild.astype(np.float32)


def teilschild(bild, rng):
    """Katalog-Schild, das fast ganz außerhalb liegt – das zählt nicht als Motiv."""
    g = ARBEIT * rng.uniform(0.6, 1.0)
    seite = rng.choice([(-1, 0), (1, 0), (0, -1), (0, 1)])
    versatz = ARBEIT / 2 + g * rng.uniform(0.18, 0.38)
    mitte = (ARBEIT / 2 + seite[0] * versatz + seite[1] * rng.uniform(-20, 20), ARBEIT / 2 + seite[1] * versatz + seite[0] * rng.uniform(-20, 20))
    bild, _ = einfuegen(bild, SCHILDER[rng.choice(KEYS)], rng, g, mitte)
    return bild


def ein_beispiel(args):
    klasse, saat, val = args
    rng = random.Random(saat)
    np.random.seed(saat % (2**32 - 1))
    MODUS["val"] = val
    alt.hintergruende_laden()
    negative_laden()
    if klasse == len(KEYS):
        r = rng.random()
        if r < 0.45:
            bild = echter_ausschnitt(rng)
        elif r < 0.65:
            f = faelschungen()
            bild = schild_positiv_ersatz(hintergrund(rng), f[rng.randrange(len(f))], rng)
        elif r < 0.76:
            bild = muster(hintergrund(rng), rng)
        elif r < 0.85:
            bild = alt.ablenkung(hintergrund(rng), rng)
        elif r < 0.93:
            bild = teilschild(hintergrund(rng), rng)
        else:
            bild = alt.zufalls_hintergrund(rng)
    else:
        bild = schild_positiv(hintergrund(rng), KEYS[klasse], rng)
    return nachbearbeiten(bild, rng)


def schild_positiv_ersatz(bild, schild_bgra, rng):
    """Fälschung genauso platzieren wie ein echtes Schild."""
    groesse = ARBEIT * rng.uniform(0.42, 1.05)
    mitte = (ARBEIT / 2 + rng.uniform(-0.12, 0.12) * ARBEIT, ARBEIT / 2 + rng.uniform(-0.12, 0.12) * ARBEIT)
    if rng.random() < 0.45:
        breite = rng.randint(5, 12)
        mx = int(mitte[0] + rng.uniform(-6, 6))
        g = rng.uniform(90, 200)
        cv2.rectangle(bild, (mx - breite // 2, int(mitte[1])), (mx + breite // 2, ARBEIT), (g, g, g), -1)
    bild, _ = einfuegen(bild, schild_bgra, rng, groesse, mitte)
    return bild


def erzeugen(je_klasse, nichts, saat, datei, val):
    auftraege = []
    for k in range(len(KEYS)):
        for i in range(je_klasse):
            auftraege.append((k, saat + k * 100000 + i, val))
    for i in range(nichts):
        auftraege.append((len(KEYS), saat + 9_000_000 + i, val))
    with Pool(4) as pool:
        bilder = pool.map(ein_beispiel, auftraege, chunksize=256)
    X = np.stack(bilder)
    y = np.array([a[0] for a in auftraege], np.int32)
    np.savez_compressed(datei, X=X, y=y)
    print(datei, X.shape, np.bincount(y).tolist()[-3:], flush=True)
