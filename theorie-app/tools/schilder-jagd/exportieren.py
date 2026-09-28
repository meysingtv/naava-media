"""Trainiertes Keras-Modell in ein TS-Modul für die App schreiben (BN eingerechnet, float16, base64)."""
import base64
import json
import os
import sys

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
import numpy as np
from tensorflow import keras

S = os.path.dirname(os.path.abspath(__file__))
NAME = os.environ.get("NAME", "modell")
ZIEL = os.path.abspath(os.path.join(S, "..", "..", "src", "lib", "schilder-modell.ts"))
KLASSEN = json.load(open(f"{S}/schild-keys.json")) + ["nichts"]

m = keras.models.load_model(f"{S}/{NAME}.keras")
schichten = []
teile = []
i = 0
while True:
    try:
        schicht = m.get_layer(f"L{i}")
    except ValueError:
        break
    bn = m.get_layer(f"bn{i}")
    gamma, beta, mean, var = [a.astype(np.float64) for a in bn.get_weights()]
    faktor = gamma / np.sqrt(var + bn.epsilon)
    b = beta - mean * faktor
    try:
        m.get_layer(f"p{i}")
        pool = True
    except ValueError:
        pool = False
    if isinstance(schicht, keras.layers.SeparableConv2D):
        tief, punkt = [w.astype(np.float64) for w in schicht.get_weights()]  # (3,3,ein,1), (1,1,ein,aus)
        tief = tief[..., 0]  # [ky][kx][ein]
        punkt = punkt[0, 0] * faktor  # [ein][aus], BatchNorm eingerechnet
        schichten.append({"art": "sep", "ein": int(punkt.shape[0]), "aus": int(punkt.shape[1]), "pool": pool})
        teile += [tief.astype(np.float16).ravel(), punkt.astype(np.float16).ravel(), b.astype(np.float16).ravel()]
    else:
        w = schicht.get_weights()[0].astype(np.float64) * faktor  # (3,3,ein,aus)
        schichten.append({"art": "conv", "ein": int(w.shape[2]), "aus": int(w.shape[3]), "pool": pool})
        teile += [w.astype(np.float16).ravel(), b.astype(np.float16).ravel()]
    i += 1
kopf = m.get_layer("kopf")
w, b = kopf.get_weights()
schichten.append({"art": "dense", "ein": int(w.shape[0]), "aus": int(w.shape[1])})
teile += [w.astype(np.float16).ravel(), b.astype(np.float16).ravel()]

roh = np.concatenate(teile).astype("<f2").tobytes()
b64 = base64.b64encode(roh).decode()
zeilen = [b64[k:k + 120] for k in range(0, len(b64), 120)]

with open(ZIEL, "w") as f:
    f.write("// Automatisch erzeugt – Gewichte des Schilder-Netzes (Schilder-Jagd).\n")
    f.write("// Trainiert mit den eigenen Schildzeichnungen der App vor App-Fotos und gemeinfreien\n")
    f.write("// Fotos (CC0/PD). Neu erzeugen: siehe tools/schilder-jagd/README.md.\n")
    f.write("// Format: float16 (little endian), je Schicht erst Gewichte, dann Bias.\n")
    f.write("// conv: [ky][kx][ein][aus]; sep: tiefenweise [ky][kx][ein], dann punktweise [ein][aus];\n")
    f.write("// dense: [ein][aus]. BatchNorm ist eingerechnet.\n\n")
    f.write(f"export const SCHILD_GROESSE = {int(m.input_shape[1])};\n\n")
    f.write(f"export const SCHILD_KLASSEN = {json.dumps(KLASSEN)} as const;\n\n")
    f.write("export const SCHILD_SCHICHTEN = [\n")
    for s in schichten:
        if s["art"] in ("conv", "sep"):
            f.write(f'  {{ art: "{s["art"]}", ein: {s["ein"]}, aus: {s["aus"]}, pool: {"true" if s["pool"] else "false"} }},\n')
        else:
            f.write(f'  {{ art: "dense", ein: {s["ein"]}, aus: {s["aus"]} }},\n')
    f.write("] as const;\n\n")
    # Flaches Array statt einer langen "+"-Kette – die würde Babel zu tief verschachteln.
    f.write("export const SCHILD_GEWICHTE = [\n")
    for z in zeilen:
        f.write(f'  "{z}",\n')
    f.write('].join("");\n')
print("geschrieben:", ZIEL, len(roh), "Bytes,", len(b64), "Zeichen base64", schichten)

# Testvektoren für den Abgleich mit der JS-Umsetzung
va = np.load(f"{S}/daten_val.npz")
idx = np.random.default_rng(3).choice(len(va["X"]), 40, replace=False)
X = va["X"][idx].astype(np.float32) / 255.0
logits = m.predict(X, verbose=0)
json.dump({"X": X.round(6).tolist(), "logits": logits.tolist(), "y": va["y"][idx].tolist()}, open(f"{S}/schild-test.json", "w"))
print("Testvektoren:", len(idx))
