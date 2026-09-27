"""Kleines CNN für die Schilder-Jagd trainieren (48x48 RGB, 29 Schilder + "nichts")."""
import json
import os
import sys

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

S = os.path.dirname(os.path.abspath(__file__))
KLASSEN = json.load(open(f"{S}/schild-keys.json")) + ["nichts"]
N = len(KLASSEN)
FILTER = [int(v) for v in os.environ.get("FILTER", "16,32,64,96").split(",")]
EPOCHEN = int(os.environ.get("EPOCHEN", "32"))
NAME = os.environ.get("NAME", "modell")

DATEN = os.environ.get("DATEN", "daten")
tr = np.load(f"{S}/{DATEN}_train.npz")
va = np.load(f"{S}/{DATEN}_val.npz")
Xtr, ytr = tr["X"], tr["y"]
Xva, yva = va["X"], va["y"]
print("train", Xtr.shape, "val", Xva.shape, "Klassen", N, "Filter", FILTER)


def modell():
    ein = keras.Input((48, 48, 3), name="bild")
    x = ein
    # leichte zusätzliche Variation nur beim Training
    x = layers.RandomTranslation(0.05, 0.05, fill_mode="reflect", name="aug_verschieben")(x)
    x = layers.RandomZoom((-0.08, 0.08), fill_mode="reflect", name="aug_zoom")(x)
    for i, f in enumerate(FILTER):
        x = layers.Conv2D(f, 3, padding="same", use_bias=False, name=f"c{i}")(x)
        x = layers.BatchNormalization(name=f"bn{i}")(x)
        x = layers.ReLU(name=f"r{i}")(x)
        if i < len(FILTER) - 1:
            x = layers.MaxPooling2D(2, name=f"p{i}")(x)
    x = layers.GlobalAveragePooling2D(name="gap")(x)
    x = layers.Dropout(0.25, name="drop")(x)
    aus = layers.Dense(N, name="kopf")(x)
    return keras.Model(ein, aus)


def datensatz(X, y, mischen):
    ds = tf.data.Dataset.from_tensor_slices((X, y))
    if mischen:
        ds = ds.shuffle(len(X), reshuffle_each_iteration=True)
    ds = ds.batch(128)

    def vorbereiten(b, l):
        b = tf.cast(b, tf.float32) / 255.0
        if mischen:
            # Helligkeit/Kontrast/Sättigung leicht variieren
            b = tf.image.random_brightness(b, 0.08)
            b = tf.image.random_contrast(b, 0.85, 1.15)
            b = tf.image.random_saturation(b, 0.8, 1.2)
            b = tf.clip_by_value(b, 0.0, 1.0)
        return b, l

    return ds.map(vorbereiten, num_parallel_calls=tf.data.AUTOTUNE).prefetch(tf.data.AUTOTUNE)


# START=pfad/zu/modell.keras trainiert ein vorhandenes Modell weiter (Feinschliff).
START = os.environ.get("START")
m = keras.models.load_model(START) if START else modell()
m.summary(print_fn=lambda s: print(s) if "Total" in s or "params" in s.lower() else None)
schritte = EPOCHEN * int(np.ceil(len(Xtr) / 128))
lr = keras.optimizers.schedules.CosineDecay(float(os.environ.get("LR", "6e-4" if START else "3e-3")), schritte, alpha=0.02)
m.compile(
    optimizer=keras.optimizers.Adam(lr),
    loss=keras.losses.CategoricalCrossentropy(from_logits=True, label_smoothing=0.05),
    metrics=["accuracy"],
)
ytr1 = keras.utils.to_categorical(ytr, N)
yva1 = keras.utils.to_categorical(yva, N)
m.fit(datensatz(Xtr, ytr1, True), validation_data=datensatz(Xva, yva1, False), epochs=EPOCHEN, verbose=2)
m.save(f"{S}/{NAME}.keras")

# Auswertung
logits = m.predict(Xva.astype(np.float32) / 255.0, batch_size=256, verbose=0)
p = tf.nn.softmax(logits).numpy()
vorh = p.argmax(1)
print("Val-Genauigkeit:", (vorh == yva).mean())
fehler = {}
for a, b in zip(yva, vorh):
    if a != b:
        fehler[(KLASSEN[a], KLASSEN[b])] = fehler.get((KLASSEN[a], KLASSEN[b]), 0) + 1
for (a, b), n in sorted(fehler.items(), key=lambda t: -t[1])[:25]:
    print(f"  {a:>8} -> {b:<8} {n}")
