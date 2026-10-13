"""Grundbausteine für die Trainingsbilder der Schilder-Jagd (siehe README.md).

Aus den gerenderten Schildgrafiken (PNG mit Transparenz) entstehen viele
Varianten, wie sie ein Handyfoto im Sucherrahmen zeigen würde: schräg,
verdreht, zu nah/zu weit, hell/dunkel, verblasst, spiegelnd, unscharf,
verrauscht, JPEG-Artefakte, Mast und Zusatzzeichen, vor echten Fotos.
Dazu eine Klasse "nichts" (kein Schild im Bild).
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
APP = os.path.abspath(os.path.join(S, "..", ".."))
GROESSE = 64          # Eingabe des Netzes
ARBEIT = 128          # Arbeitsauflösung

KEYS = json.load(open(f"{S}/schild-keys.json"))
KLASSEN = KEYS + ["nichts"]

SCHILDER = {}
for k in KEYS:
    bild = cv2.imread(f"{S}/schilder/{k}.png", cv2.IMREAD_UNCHANGED)  # BGRA
    SCHILDER[k] = bild

# Hintergründe: die Fotos der App (Nachweise stehen in der App unter „Bildnachweise“).
HINTERGRUENDE_PFADE = glob.glob(f"{APP}/assets/images/fotos/*.jpg")
HINTERGRUENDE = []


def hintergruende_laden():
    global HINTERGRUENDE
    if HINTERGRUENDE:
        return
    for p in HINTERGRUENDE_PFADE:
        b = cv2.imread(p, cv2.IMREAD_COLOR)
        if b is None:
            continue
        h, w = b.shape[:2]
        f = 640 / max(h, w)
        if f < 1:
            b = cv2.resize(b, (int(w * f), int(h * f)), interpolation=cv2.INTER_AREA)
        HINTERGRUENDE.append(b)


def zufalls_hintergrund(rng):
    art = rng.random()
    if art < 0.72 and HINTERGRUENDE:
        b = HINTERGRUENDE[rng.randrange(len(HINTERGRUENDE))]
        h, w = b.shape[:2]
        s = rng.randint(int(min(h, w) * 0.12), int(min(h, w) * 0.9))
        y = rng.randint(0, h - s)
        x = rng.randint(0, w - s)
        crop = b[y:y + s, x:x + s]
        if rng.random() < 0.5:
            crop = crop[:, ::-1]
        return cv2.resize(crop, (ARBEIT, ARBEIT), interpolation=cv2.INTER_AREA).astype(np.float32)
    # Himmel / Wolken / einfarbig mit Verlauf und Rauschen
    oben = np.array([rng.uniform(120, 250), rng.uniform(110, 230), rng.uniform(80, 220)], np.float32)
    unten = oben * rng.uniform(0.5, 1.1)
    t = np.linspace(0, 1, ARBEIT, dtype=np.float32)[:, None, None]
    bild = oben * (1 - t) + unten * t
    bild = np.repeat(bild, ARBEIT, axis=1)
    rausch = cv2.GaussianBlur(np.random.default_rng(rng.randrange(1 << 30)).normal(0, rng.uniform(4, 30), (ARBEIT, ARBEIT, 3)).astype(np.float32), (0, 0), rng.uniform(2, 12))
    return np.clip(bild + rausch, 0, 255)


def farbe_verschieben(bgr, rng):
    """Helligkeit, Kontrast, Sättigung, Farbton, Weißabgleich, Gamma."""
    b = bgr.astype(np.float32) / 255.0
    hsv = cv2.cvtColor(np.clip(b, 0, 1), cv2.COLOR_BGR2HSV)
    hsv[..., 0] = (hsv[..., 0] + rng.uniform(-7, 7)) % 360
    hsv[..., 1] = np.clip(hsv[..., 1] * rng.uniform(0.55, 1.2), 0, 1)
    b = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    b = b * rng.uniform(0.45, 1.3)
    mitte = b.mean()
    b = (b - mitte) * rng.uniform(0.65, 1.25) + mitte
    wb = np.array([rng.uniform(0.85, 1.15), rng.uniform(0.92, 1.08), rng.uniform(0.85, 1.15)], np.float32)
    b = b * wb
    b = np.clip(b, 0, 1) ** rng.uniform(0.75, 1.35)
    return b * 255.0


def schild_platzieren(bild, schild_bgra, rng):
    """Schild perspektivisch verzerrt auf den Hintergrund setzen. Liefert Bild und Maske."""
    groesse = int(ARBEIT * rng.uniform(0.5, 1.02))
    s = cv2.resize(schild_bgra, (groesse, groesse), interpolation=cv2.INTER_AREA).astype(np.float32)

    # Perspektive + Drehung
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
    winkel = np.deg2rad(rng.uniform(-11, 11))
    c = np.float32([groesse / 2, groesse / 2])
    rot = np.float32([[np.cos(winkel), -np.sin(winkel)], [np.sin(winkel), np.cos(winkel)]])
    dst = (dst - c) @ rot.T + c
    # Position im Rahmen
    ox = (ARBEIT - groesse) / 2 + rng.uniform(-0.12, 0.12) * ARBEIT
    oy = (ARBEIT - groesse) / 2 + rng.uniform(-0.12, 0.12) * ARBEIT
    dst += np.float32([ox, oy])
    M = cv2.getPerspectiveTransform(src, dst)
    warp = cv2.warpPerspective(s, M, (ARBEIT, ARBEIT), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))

    farbe = farbe_verschieben(warp[..., :3], rng)
    maske = (warp[..., 3:] / 255.0).astype(np.float32)

    # verblasst / verschmutzt
    if rng.random() < 0.35:
        grau = np.full_like(farbe, rng.uniform(150, 235))
        a = rng.uniform(0.05, 0.35)
        farbe = farbe * (1 - a) + grau * a
    if rng.random() < 0.3:
        fleck = cv2.GaussianBlur(np.random.default_rng(rng.randrange(1 << 30)).normal(0, 1, (ARBEIT, ARBEIT)).astype(np.float32), (0, 0), rng.uniform(3, 10))[..., None]
        fleck = fleck / (np.abs(fleck).max() + 1e-6)
        farbe = farbe * (1 + fleck * rng.uniform(0.05, 0.2))
    # Spiegelung / Sonnenfleck
    if rng.random() < 0.3:
        yy, xx = np.mgrid[0:ARBEIT, 0:ARBEIT].astype(np.float32)
        cx, cy = rng.uniform(0, ARBEIT), rng.uniform(0, ARBEIT)
        r = rng.uniform(15, 60)
        glanz = np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * r * r))[..., None]
        farbe = farbe + glanz * rng.uniform(40, 140)
    # Schatten über einen Teil des Schildes
    if rng.random() < 0.25:
        yy, xx = np.mgrid[0:ARBEIT, 0:ARBEIT].astype(np.float32)
        n = np.array([rng.uniform(-1, 1), rng.uniform(-1, 1)])
        n /= np.linalg.norm(n) + 1e-6
        schatten = ((xx - ARBEIT / 2) * n[0] + (yy - ARBEIT / 2) * n[1] + rng.uniform(-40, 40)) > 0
        farbe = farbe * np.where(schatten[..., None], rng.uniform(0.45, 0.8), 1.0)

    # Mast hinter dem Schild
    if rng.random() < 0.45:
        breite = rng.randint(5, 12)
        mx = int(ARBEIT / 2 + rng.uniform(-6, 6))
        grauwert = rng.uniform(90, 200)
        cv2.rectangle(bild, (mx - breite // 2, 0 if rng.random() < 0.3 else ARBEIT // 2), (mx + breite // 2, ARBEIT), (grauwert, grauwert, grauwert * rng.uniform(0.95, 1.05)), -1)
    # Zusatzzeichen darunter (teilweise im Bild)
    if rng.random() < 0.2:
        oben = int(oy + groesse * rng.uniform(0.95, 1.08))
        b = int(groesse * rng.uniform(0.7, 1.0))
        x0 = int(ARBEIT / 2 - b / 2)
        cv2.rectangle(bild, (x0, oben), (x0 + b, oben + int(b * 0.45)), (245, 245, 245), -1)
        cv2.rectangle(bild, (x0, oben), (x0 + b, oben + int(b * 0.45)), (20, 20, 20), 2)
        for i in range(rng.randint(1, 3)):
            yy = oben + 6 + i * 9
            cv2.line(bild, (x0 + 8, yy), (x0 + b - 8 - rng.randint(0, 20), yy), (25, 25, 25), 3)

    bild = bild * (1 - maske) + farbe * maske

    # Zweige/Verdeckung
    if rng.random() < 0.15:
        for _ in range(rng.randint(1, 3)):
            p1 = (rng.randint(0, ARBEIT), rng.randint(0, ARBEIT))
            p2 = (rng.randint(0, ARBEIT), rng.randint(0, ARBEIT))
            ton = rng.uniform(20, 90)
            cv2.line(bild, p1, p2, (ton * 0.8, ton, ton * 0.7), rng.randint(2, 6))
    return bild


SCHRIFT = f"{APP}/node_modules/@expo-google-fonts/archivo/800ExtraBold/Archivo_800ExtraBold.ttf"
FAELSCHUNGEN = []


def _text(bild, text, mitte, hoehe, farbe):
    """Text mit der Schildschrift mittig einzeichnen (BGRA-Bild, uint8)."""
    from PIL import Image, ImageDraw, ImageFont
    pil = Image.fromarray(cv2.cvtColor(bild, cv2.COLOR_BGRA2RGBA))
    d = ImageDraw.Draw(pil)
    groesse = int(hoehe * 1.35)
    while True:
        f = ImageFont.truetype(SCHRIFT, groesse)
        l, o, r, u = d.textbbox((0, 0), text, font=f)
        if r - l <= hoehe * 1.75 or groesse < 20:
            break
        groesse = int(groesse * 0.92)
    d.text((mitte[0] - (l + r) / 2, mitte[1] - (o + u) / 2), text, font=f, fill=(farbe[2], farbe[1], farbe[0], 255))
    return cv2.cvtColor(np.array(pil), cv2.COLOR_RGBA2BGRA)


def _pfeil(bild, mitte, laenge, winkel_grad, farbe, dicke):
    w = np.deg2rad(winkel_grad)
    richt = np.array([np.cos(w), -np.sin(w)])
    a = np.array(mitte) - richt * laenge / 2
    b = np.array(mitte) + richt * laenge / 2
    cv2.line(bild, tuple(int(v) for v in a), tuple(int(v) for v in (b - richt * dicke * 1.2)), farbe, dicke)
    quer = np.array([richt[1], -richt[0]])
    spitze = np.array([b, b - richt * dicke * 2.4 + quer * dicke * 1.5, b - richt * dicke * 2.4 - quer * dicke * 1.5], np.int32)
    cv2.fillPoly(bild, [spitze], farbe)


def faelschungen():
    """Schilder, die es im Katalog nicht gibt (Tempo 90, Buchstaben statt Piktogramm, …).
    Sie gehören zur Klasse "nichts", damit das Netz auf den Inhalt achtet. Nur Inhalte,
    die mit keinem der 100 Katalog-Schilder verwechselt werden können."""
    global FAELSCHUNGEN
    if FAELSCHUNGEN:
        return FAELSCHUNGEN
    rng = random.Random(4242)
    ring = SCHILDER["z250"]
    dreieck = SCHILDER["z101"].copy()
    # Ausrufezeichen entfernen: alles, was nicht rot ist, wird weiß (BGR)
    d = dreieck.astype(np.int32)
    nicht_rot = (d[..., 2] - np.maximum(d[..., 0], d[..., 1]) < 60) & (d[..., 3] > 0)
    dreieck[nicht_rot, :3] = 255
    blau = SCHILDER["z209"].copy()
    yy, xx = np.mgrid[0:512, 0:512]
    innen = ((xx - 248.5) ** 2 + (yy - 248.5) ** 2) < 212 ** 2
    blau[innen, :3] = blau[248, 50, :3].copy()
    quadrat = SCHILDER["z314"].copy()
    innenq = (xx > 58) & (xx < 434) & (yy > 58) & (yy < 434)
    quadrat[innenq, :3] = quadrat[250, 64, :3].copy()

    SCHWARZ = (20, 20, 20, 255)
    WEISS = (255, 255, 255, 255)
    zahlen = ["5", "7", "15", "25", "35", "45", "90", "110", "3", "8", "95", "65"]
    for z in zahlen:
        FAELSCHUNGEN.append(_text(ring.copy(), z, (248, 252), 150, SCHWARZ))
    for _ in range(14):
        FAELSCHUNGEN.append(_text(ring.copy(), rng.choice("ABEFGKLMNRSUVWZ"), (248, 250), 170, SCHWARZ))
    for _ in range(18):
        FAELSCHUNGEN.append(_text(dreieck.copy(), rng.choice("AEGKMNRSUVWZ"), (252, 300), 120, SCHWARZ))
    # Pfeile schräg nach oben – die gibt es im Katalog nicht (rechts, links, geradeaus, schräg unten schon)
    for w in [45, 135, 45, 135, 60, 120, 50, 130]:
        b = blau.copy()
        _pfeil(b, (248, 248), rng.uniform(250, 320), w + rng.uniform(-4, 4), WEISS, rng.randint(34, 46))
        FAELSCHUNGEN.append(b)
    for _ in range(10):
        FAELSCHUNGEN.append(_text(blau.copy(), rng.choice("AEGKMNRSUVWZ"), (248, 250), 170, WEISS))
    for _ in range(10):
        b = quadrat.copy()
        b = _text(b, rng.choice(["i", "A", "E", "H", "K", "U", "W", "Z", "M", "R"]), (246, 246), 230, WEISS)
        FAELSCHUNGEN.append(b)
    return FAELSCHUNGEN


def ablenkung(bild, rng):
    """Formen, die kein Schild sind (für die Klasse "nichts")."""
    bild = np.ascontiguousarray(np.clip(bild, 0, 255).astype(np.uint8))
    for _ in range(rng.randint(0, 3)):
        farbe = tuple(float(v) for v in np.array([rng.uniform(0, 255) for _ in range(3)]))
        art = rng.random()
        if art < 0.35:
            cv2.circle(bild, (rng.randint(0, ARBEIT), rng.randint(0, ARBEIT)), rng.randint(8, 50), farbe, -1 if rng.random() < 0.6 else rng.randint(2, 8))
        elif art < 0.7:
            x, y = rng.randint(0, ARBEIT), rng.randint(0, ARBEIT)
            cv2.rectangle(bild, (x, y), (x + rng.randint(10, 70), y + rng.randint(10, 70)), farbe, -1 if rng.random() < 0.6 else rng.randint(2, 8))
        else:
            cv2.putText(bild, str(rng.randint(0, 999)), (rng.randint(0, 60), rng.randint(30, 120)), cv2.FONT_HERSHEY_SIMPLEX, rng.uniform(0.6, 1.8), farbe, rng.randint(1, 4))
    return bild.astype(np.float32)


def nachbearbeiten(bild, rng):
    if rng.random() < 0.6:
        bild = cv2.GaussianBlur(bild, (0, 0), rng.uniform(0.3, 2.2))
    if rng.random() < 0.15:
        k = rng.randint(3, 9)
        kern = np.zeros((k, k), np.float32)
        if rng.random() < 0.5:
            kern[k // 2, :] = 1.0 / k
        else:
            kern[:, k // 2] = 1.0 / k
        bild = cv2.filter2D(bild, -1, kern)
    bild = bild + np.random.default_rng(rng.randrange(1 << 30)).normal(0, rng.uniform(0, 9), bild.shape)
    bild = np.clip(bild, 0, 255).astype(np.uint8)
    # auf Netzgröße, dann wie ein Handy-JPEG
    klein = cv2.resize(bild, (GROESSE, GROESSE), interpolation=cv2.INTER_AREA)
    ok, enc = cv2.imencode(".jpg", klein, [cv2.IMWRITE_JPEG_QUALITY, rng.randint(35, 95)])
    klein = cv2.imdecode(enc, cv2.IMREAD_COLOR)
    return cv2.cvtColor(klein, cv2.COLOR_BGR2RGB)


def ein_beispiel(args):
    klasse, saat = args
    rng = random.Random(saat)
    np.random.seed(saat % (2**32 - 1))
    hintergruende_laden()
    bild = zufalls_hintergrund(rng)
    if klasse == len(KEYS):
        if rng.random() < 0.45:
            f = faelschungen()
            bild = schild_platzieren(bild, f[rng.randrange(len(f))], rng)
        else:
            bild = ablenkung(bild, rng)
    else:
        bild = schild_platzieren(bild, SCHILDER[KEYS[klasse]], rng)
    return nachbearbeiten(bild, rng)


def erzeugen(je_klasse, nichts, saat, datei):
    auftraege = []
    for k in range(len(KEYS)):
        for i in range(je_klasse):
            auftraege.append((k, saat + k * 100000 + i))
    for i in range(nichts):
        auftraege.append((len(KEYS), saat + 9_000_000 + i))
    with Pool(4) as pool:
        bilder = pool.map(ein_beispiel, auftraege, chunksize=256)
    X = np.stack(bilder)
    y = np.array([a[0] for a in auftraege], np.int32)
    np.savez_compressed(datei, X=X, y=y)
    print(datei, X.shape, np.bincount(y).tolist()[:3], "...")
