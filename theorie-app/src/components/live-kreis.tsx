import { useEffect, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { bildBasis } from "@/components/live-bild";
import { stoss, tippen } from "@/lib/haptik";
import { KREIS_GRENZEN, type KreisLage } from "@/lib/zweitkamera";

// Griff für den Kamera-Kreis im Live (nur Gastgeber). Das Bild im Kreis rechnet
// das iPhone selbst ins Video (ZweitkameraProzessor) – hier liegt nur eine
// unsichtbare Fläche darüber: mit einem Finger verschieben, mit zwei größer oder
// kleiner, antippen tauscht die Kameras. Lage und Größe zählen wie beim Bild aus
// der Galerie in Anteilen des Kamerabereichs, darum wandert der Kreis beim Quiz mit.

/** So oft gehen Bewegungen an das native Modul (ms). */
const TAKT = 33;

function zwischen(wert: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, wert));
}

export function KameraKreisGriff({
  lage,
  flaeche,
  oben,
  onBewegt,
  onFertig,
  onTippen,
}: {
  lage: KreisLage;
  /** Höhe des Videobereichs (animiert, beginnt oben am Bildschirm). */
  flaeche: SharedValue<number>;
  /** Unterkante der Kopfzeile. */
  oben: number;
  /** Während der Geste, gedrosselt. */
  onBewegt: (lage: KreisLage) => void;
  /** Geste vorbei: neue Lage. */
  onFertig: (lage: KreisLage) => void;
  onTippen: () => void;
}) {
  const { width: breite, height: fenster } = useWindowDimensions();
  const [beruehrt, setBeruehrt] = useState(false);
  const g = KREIS_GRENZEN;

  const x = useSharedValue(lage.x);
  const y = useSharedValue(lage.y);
  const d = useSharedValue(lage.d);
  const start = useSharedValue({ x: 0, y: 0, d: 0 });
  /** Laufende Gesten als Bits: 1 Ziehen, 2 Zoomen. */
  const aktiv = useSharedValue(0);
  const zuletzt = useSharedValue(0);
  const ring = useSharedValue(0);

  // Lage von außen (z. B. zurückgesetzt) übernehmen, solange keine Geste läuft.
  useEffect(() => {
    if (aktiv.value) return;
    x.value = lage.x;
    y.value = lage.y;
    d.value = lage.d;
  }, [lage.x, lage.y, lage.d, aktiv, x, y, d]);

  function bewegt(lx: number, ly: number, ld: number) {
    onBewegt({ x: lx, y: ly, d: ld });
  }
  function fertig(lx: number, ly: number, ld: number) {
    setBeruehrt(false);
    onFertig({ x: lx, y: ly, d: ld });
  }
  function halten() {
    setBeruehrt(true);
    stoss();
  }
  function getippt() {
    tippen();
    onTippen();
  }

  function festhalten(bit: number) {
    "worklet";
    const vorher = aktiv.value;
    aktiv.value = vorher | bit;
    if (vorher) return;
    start.value = { x: x.value, y: y.value, d: d.value };
    ring.value = withTiming(1, { duration: 140 });
    scheduleOnRN(halten);
  }

  function loslassen(bit: number) {
    "worklet";
    if (!(aktiv.value & bit)) return;
    aktiv.value = aktiv.value & ~bit;
    if (aktiv.value) return;
    const nx = zwischen(x.value, g.xMin, g.xMax);
    const ny = zwischen(y.value, g.yMin, g.yMax);
    const nd = zwischen(d.value, g.dMin, g.dMax);
    x.value = withSpring(nx, { damping: 18, stiffness: 220 });
    y.value = withSpring(ny, { damping: 18, stiffness: 220 });
    d.value = withSpring(nd, { damping: 18, stiffness: 220 });
    ring.value = withTiming(0, { duration: 220 });
    scheduleOnRN(fertig, nx, ny, nd);
  }

  function senden() {
    "worklet";
    const jetzt = Date.now();
    if (jetzt - zuletzt.value < TAKT) return;
    zuletzt.value = jetzt;
    scheduleOnRN(bewegt, zwischen(x.value, g.xMin, g.xMax), zwischen(y.value, g.yMin, g.yMax), zwischen(d.value, g.dMin, g.dMax));
  }

  const ziehen = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      festhalten(1);
      start.value = { ...start.value, x: x.value, y: y.value };
    })
    .onUpdate((e) => {
      const frei = Math.max(1, flaeche.value - oben);
      x.value = start.value.x + e.translationX / breite;
      y.value = start.value.y + e.translationY / frei;
      senden();
    })
    .onFinalize(() => {
      loslassen(1);
    });

  const zoomen = Gesture.Pinch()
    .onStart(() => {
      festhalten(2);
      start.value = { ...start.value, d: d.value };
    })
    .onUpdate((e) => {
      d.value = zwischen(start.value.d * e.scale, g.dMin * 0.8, g.dMax * 1.1);
      senden();
    })
    .onFinalize(() => {
      loslassen(2);
    });

  const antippen = Gesture.Tap()
    .maxDuration(260)
    .onEnd((_e, ok) => {
      if (ok) scheduleOnRN(getippt);
    });

  // Erst Verschieben/Zoomen – nur wenn sich nichts bewegt hat, zählt es als Tippen.
  const gesten = Gesture.Exclusive(Gesture.Simultaneous(ziehen, zoomen), antippen);

  const stil = useAnimatedStyle(() => {
    const frei = Math.max(1, flaeche.value - oben);
    const groesse = Math.min(d.value * bildBasis(flaeche.value, fenster, oben), breite * 0.96);
    return {
      width: groesse,
      height: groesse,
      borderRadius: groesse / 2,
      borderColor: `rgba(255,255,255,${0.55 * ring.value})`,
      transform: [{ translateX: x.value * breite - groesse / 2 }, { translateY: oben + y.value * frei - groesse / 2 }],
    };
  });

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: fenster, zIndex: beruehrt ? 30 : 0, elevation: beruehrt ? 30 : 0 }}>
      <GestureDetector gesture={gesten}>
        <Reanimated.View
          accessibilityRole="button"
          accessibilityLabel="Zweite Kamera – ziehen zum Verschieben, mit zwei Fingern größer oder kleiner, antippen zum Tauschen"
          style={[{ position: "absolute", top: 0, left: 0, borderWidth: 2, backgroundColor: "rgba(255,255,255,0.001)" }, stil]}
        />
      </GestureDetector>
    </View>
  );
}
