import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useFenster } from "@/lib/fenster";
import { Icon } from "@/components/icon";
import { StricheSvg } from "@/components/live-tafel";
import { stoss, tippen } from "@/lib/haptik";
import { liveBildUrl, type BildLage, type LiveBild } from "@/lib/live-bild";
import type { Strich } from "@/lib/live-tafel";
import { schrift } from "@/lib/theme";

// Bild aus der Galerie im Live. Es klebt auf dem Video: Lage und Größe zählen in
// Anteilen des freien Kamerabereichs (unter der Kopfzeile), darum wandert es
// beim geteilten Bildschirm (Quiz, Prüfung) mit der Kamera nach oben. Der
// Gastgeber verschiebt es mit einem Finger, zoomt mit zwei und zieht es zum
// Löschen in die Leiste unten.

const LIVE_ROT = "#FF2D55";
/** Höhe der Löschleiste über dem unteren Rand. */
const KORB_HOEHE = 150;
/** So oft gehen Bewegungen an die Zuschauer (ms). */
const TAKT = 70;

function zwischen(wert: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, wert));
}

/**
 * Bezugshöhe für die Bildgröße: der freie Kamerabereich unter der Kopfzeile.
 * Wird er beim Teilen klein, schrumpft das Bild mit – aber höchstens auf 60 %,
 * damit es oben im Kamerabild gut zu sehen bleibt.
 */
export function bildBasis(flaeche: number, fenster: number, oben: number) {
  "worklet";
  return Math.max(1, flaeche - oben, (fenster - oben) * 0.6);
}

/** Löschleiste unten – erscheint beim Festhalten, wird rot, sobald das Bild darüber ist. */
function Papierkorb({ sichtbar, ueber, unten }: { sichtbar: boolean; ueber: boolean; unten: number }) {
  const da = useSharedValue(0);
  const drauf = useSharedValue(0);
  useEffect(() => {
    da.value = withTiming(sichtbar ? 1 : 0, { duration: sichtbar ? 200 : 160, easing: Easing.out(Easing.cubic) });
  }, [sichtbar, da]);
  useEffect(() => {
    drauf.value = withSpring(ueber ? 1 : 0, { damping: 14, stiffness: 260 });
  }, [ueber, drauf]);
  const leiste = useAnimatedStyle(() => ({ opacity: da.value, transform: [{ translateY: (1 - da.value) * 40 }] }));
  const kreis = useAnimatedStyle(() => ({ transform: [{ scale: 1 + drauf.value * 0.28 }] }));
  const rot = useAnimatedStyle(() => ({ opacity: drauf.value }));

  return (
    <Reanimated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, bottom: 0, height: KORB_HOEHE + unten, zIndex: 40, elevation: 40 }, leiste]}>
      <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.78)"]} locations={[0, 0.55, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 10, paddingBottom: unten + 14 }}>
        <Reanimated.View style={[{ width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.32)" }, kreis]}>
          <Reanimated.View style={[{ position: "absolute", top: -1, left: -1, right: -1, bottom: -1, borderRadius: 31, backgroundColor: LIVE_ROT }, rot]} />
          <Icon name={ueber ? "trash" : "trash-outline"} sf={ueber ? "trash.fill" : "trash"} size={25} color="#FFFFFF" weight="semibold" />
        </Reanimated.View>
        <Text style={{ ...schrift.textFett, fontSize: 13, color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }}>{ueber ? "Loslassen zum Löschen" : "Zum Löschen hierher ziehen"}</Text>
      </View>
    </Reanimated.View>
  );
}

/**
 * Das Bild über dem Video. `flaeche` ist die (animierte) Höhe des Videobereichs,
 * der oben am Bildschirm beginnt; die Lage zählt im freien Teil unter der
 * Kopfzeile (`oben`). Nur der Gastgeber kann es bewegen (`bearbeitbar`); bei
 * Zuschauern gleitet es weich zur neuen Lage.
 */
export function LiveBildEbene({
  bild,
  flaeche,
  oben = 0,
  bearbeitbar = false,
  unten = 0,
  striche,
  onBewegt,
  onFertig,
  onLoeschen,
}: {
  bild: LiveBild | null;
  flaeche: SharedValue<number>;
  /** Unterkante der Kopfzeile – darüber liegt das Bild nur, wenn man es hinzieht. */
  oben?: number;
  bearbeitbar?: boolean;
  /** Sicherer Abstand unten (für die Löschleiste). */
  unten?: number;
  /** Striche von der Tafel, die auf dem Bild liegen bleiben. */
  striche?: Strich[] | null;
  /** Während der Geste, gedrosselt – für die Zuschauer. */
  onBewegt?: (lage: BildLage) => void;
  /** Geste vorbei: neue Lage. */
  onFertig?: (lage: BildLage) => void;
  /** In die Löschleiste gezogen. */
  onLoeschen?: () => void;
}) {
  const { width: breite, height: fenster } = useFenster();
  const [zieht, setZieht] = useState(false);
  const [ueber, setUeber] = useState(false);

  const x = useSharedValue(bild?.x ?? 0.5);
  const y = useSharedValue(bild?.y ?? 0.5);
  const g = useSharedValue(bild?.g ?? 0.3);
  const start = useSharedValue({ x: 0, y: 0, g: 0 });
  /** Laufende Gesten als Bits: 1 Ziehen, 2 Zoomen, 4 Festhalten. */
  const aktiv = useSharedValue(0);
  const imKorb = useSharedValue(0);
  const skala = useSharedValue(1);
  const korbAnteil = useSharedValue(0);
  const weg = useSharedValue(0);
  const geladen = useSharedValue(0);
  const zuletzt = useSharedValue(0);

  // Zuschauer: zur neuen Lage gleiten (kommt etwa alle 70 ms). Beim Gastgeber
  // bewegt nur die Geste das Bild.
  const pfad = bild?.pfad ?? null;
  const bx = bild?.x;
  const by = bild?.y;
  const bg = bild?.g;
  useEffect(() => {
    if (bearbeitbar || bx == null || by == null || bg == null) return;
    x.value = withTiming(bx, { duration: TAKT + 30 });
    y.value = withTiming(by, { duration: TAKT + 30 });
    g.value = withTiming(bg, { duration: TAKT + 30 });
  }, [bx, by, bg, bearbeitbar, x, y, g]);

  // Neues Bild: frisch einblenden.
  useEffect(() => {
    weg.value = 0;
    imKorb.value = 0;
    korbAnteil.value = 0;
    skala.value = 1;
    geladen.value = 0;
    if (bx != null && by != null && bg != null) {
      x.value = bx;
      y.value = by;
      g.value = bg;
    }
    // nur beim Wechsel des Bilds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pfad]);

  const korbOben = fenster - unten - KORB_HOEHE;

  function bewegt(lx: number, ly: number, lg: number) {
    onBewegt?.({ x: lx, y: ly, g: lg });
  }
  function fertig(lx: number, ly: number, lg: number) {
    onFertig?.({ x: lx, y: ly, g: lg });
  }
  function halten(an: boolean) {
    setZieht(an);
    if (!an) setUeber(false);
    if (an) stoss();
  }
  function korb(an: boolean) {
    setUeber(an);
    tippen();
  }
  function loeschen() {
    setZieht(false);
    setUeber(false);
    onLoeschen?.();
  }

  function festhalten(bit: number) {
    "worklet";
    const vorher = aktiv.value;
    aktiv.value = vorher | bit;
    if (vorher) return;
    start.value = { x: x.value, y: y.value, g: g.value };
    skala.value = withSpring(1.04, { damping: 16, stiffness: 300 });
    scheduleOnRN(halten, true);
  }

  // Erst wenn alle Finger weg sind: im Korb löschen, sonst Lage zurechtrücken und sichern.
  function loslassen(bit: number) {
    "worklet";
    if (!(aktiv.value & bit)) return;
    aktiv.value = aktiv.value & ~bit;
    if (aktiv.value) return;
    if (imKorb.value) {
      skala.value = withTiming(0.2, { duration: 170 });
      weg.value = withTiming(1, { duration: 170 }, (ok) => {
        if (ok) scheduleOnRN(loeschen);
      });
      return;
    }
    const nx = zwischen(x.value, 0.04, 0.96);
    const ny = zwischen(y.value, 0.04, 0.96);
    const ng = zwischen(g.value, 0.08, 1.1);
    x.value = withSpring(nx, { damping: 18, stiffness: 220 });
    y.value = withSpring(ny, { damping: 18, stiffness: 220 });
    g.value = withSpring(ng, { damping: 18, stiffness: 220 });
    skala.value = withSpring(1, { damping: 16, stiffness: 300 });
    scheduleOnRN(halten, false);
    scheduleOnRN(fertig, nx, ny, ng);
  }

  function senden() {
    "worklet";
    const jetzt = Date.now();
    if (jetzt - zuletzt.value < TAKT) return;
    zuletzt.value = jetzt;
    scheduleOnRN(bewegt, zwischen(x.value, 0.04, 0.96), zwischen(y.value, 0.04, 0.96), zwischen(g.value, 0.08, 1.1));
  }

  const ziehen = Gesture.Pan()
    .enabled(bearbeitbar)
    .averageTouches(true)
    .onStart(() => {
      festhalten(1);
      start.value = { ...start.value, x: x.value, y: y.value };
    })
    .onUpdate((e) => {
      const frei = Math.max(1, flaeche.value - oben);
      x.value = start.value.x + e.translationX / breite;
      y.value = start.value.y + e.translationY / frei;
      const drin = e.absoluteY > korbOben ? 1 : 0;
      if (drin !== imKorb.value) {
        imKorb.value = drin;
        korbAnteil.value = withTiming(drin, { duration: 160 });
        skala.value = withTiming(drin ? 0.38 : 1.04, { duration: 160 });
        scheduleOnRN(korb, drin === 1);
      }
      if (!drin) senden();
    })
    .onFinalize(() => {
      loslassen(1);
    });

  const zoomen = Gesture.Pinch()
    .enabled(bearbeitbar)
    .onStart(() => {
      festhalten(2);
      start.value = { ...start.value, g: g.value };
    })
    .onUpdate((e) => {
      g.value = zwischen(start.value.g * e.scale, 0.06, 1.25);
      senden();
    })
    .onFinalize(() => {
      loslassen(2);
    });

  const druecken = Gesture.LongPress()
    .enabled(bearbeitbar)
    .minDuration(220)
    .maxDistance(100000)
    .onStart(() => {
      festhalten(4);
    })
    .onFinalize(() => {
      loslassen(4);
    });

  const gesten = Gesture.Simultaneous(ziehen, zoomen, druecken);

  const seite = bild?.seite ?? 1;
  const stil = useAnimatedStyle(() => {
    const frei = Math.max(1, flaeche.value - oben);
    const hoehe = g.value * bildBasis(flaeche.value, fenster, oben);
    const b = hoehe * seite;
    return {
      width: b,
      height: hoehe,
      opacity: geladen.value * (1 - weg.value) * (1 - 0.3 * korbAnteil.value),
      transform: [{ translateX: x.value * breite - b / 2 }, { translateY: oben + y.value * frei - hoehe / 2 }, { scale: skala.value }],
    };
  });

  if (!bild) return null;

  const inhalt = (
    <Reanimated.View
      pointerEvents={bearbeitbar ? "auto" : "none"}
      accessibilityLabel={bearbeitbar ? "Bild im Live – zum Verschieben ziehen, zum Löschen festhalten und nach unten ziehen" : "Bild vom Gastgeber"}
      style={[{ position: "absolute", top: 0, left: 0, borderRadius: 16, shadowColor: "#000000", shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }, stil]}
    >
      <Image
        source={{ uri: liveBildUrl(bild.pfad) }}
        resizeMode="cover"
        onLoad={() => {
          geladen.value = withTiming(1, { duration: 260 });
        }}
        style={{ width: "100%", height: "100%", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" }}
      />
      {striche?.length ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16, overflow: "hidden" }}>
          <StricheSvg striche={striche} seite={bild.seite} />
        </View>
      ) : null}
    </Reanimated.View>
  );

  return (
    <>
      <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: fenster, zIndex: zieht ? 30 : 0, elevation: zieht ? 30 : 0 }}>
        {bearbeitbar ? <GestureDetector gesture={gesten}>{inhalt}</GestureDetector> : inhalt}
      </View>
      {bearbeitbar ? <Papierkorb sichtbar={zieht} ueber={ueber} unten={unten} /> : null}
    </>
  );
}
