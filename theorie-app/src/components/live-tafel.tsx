import { memo, useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Circle, G, Line, Path, Polygon, Rect } from "react-native-svg";

import { useFenster } from "@/lib/fenster";
import { Icon, type IconName } from "@/components/icon";
import { lilaSchrift } from "@/components/lila-teile";
import { tippen } from "@/lib/haptik";
import { liveBildUrl, type LiveBild } from "@/lib/live-bild";
import {
  GRUND_NAMEN,
  pfeilSpitze,
  SPITZE,
  STRICH_BREITE,
  strichPfad,
  TAFEL_FARBEN,
  vereinfachen,
  VORLAGE_SEITE,
  type LiveTafel,
  type Strich,
  type TafelGrund,
} from "@/lib/live-tafel";
import { leuchten } from "@/lib/theme";

// Tafel im Live: große Zeichenfläche (Bild aus der Galerie oder Vorlage), darauf
// Striche und Pfeile. Der Gastgeber malt mit dem Finger, alle sehen jeden Strich
// live. Die Striche liegen in Anteilen der Fläche (0–1000) und passen deshalb
// auch auf das kleine Bild im Video, wenn die Tafel zu ist.

/** Striche auf einer Fläche mit Seitenverhältnis `seite` (füllt den Elternbereich). */
export const StricheSvg = memo(function StricheSvg({ striche, zug, seite }: { striche: Strich[]; zug?: Strich | null; seite: number }) {
  const w = 1000 * seite;
  const breite = STRICH_BREITE * w;
  const spitze = SPITZE * w;
  const zeichnen = (s: Strich, key: string) => (
    <G key={key}>
      <Path d={strichPfad(s.p, seite, 1)} stroke="rgba(255,255,255,0.75)" strokeWidth={breite * 1.7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={strichPfad(s.p, seite, 1)} stroke={s.f} strokeWidth={breite} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {s.a && s.p.length >= 4 ? <Polygon points={pfeilSpitze(s.p, seite, 1, spitze)} fill={s.f} stroke="rgba(255,255,255,0.75)" strokeWidth={breite * 0.35} strokeLinejoin="round" /> : null}
    </G>
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${w} 1000`} preserveAspectRatio="none">
        {striche.map((s, i) => zeichnen(s, String(i)))}
        {zug ? zeichnen(zug, "zug") : null}
      </Svg>
    </View>
  );
});

// Vorlagen im hellen lila Stil (wie „Kurz erklärt“).
const T = { grund: "#EFE8FF", gehweg: "#FBF9FF", strasse: "#D8CCF6", rand: "#C4B5F0", linie: "#FFFFFF", insel: "#C8E8D2", inselRand: "#A9D9B8" };

function KreuzungHell() {
  return (
    <G>
      <Rect x={0} y={0} width={300} height={220} fill={T.grund} />
      <Rect x={0} y={0} width={109} height={74} rx={14} fill={T.gehweg} />
      <Rect x={191} y={0} width={109} height={74} rx={14} fill={T.gehweg} />
      <Rect x={0} y={156} width={109} height={64} rx={14} fill={T.gehweg} />
      <Rect x={191} y={156} width={109} height={64} rx={14} fill={T.gehweg} />
      <Rect x={115} y={0} width={70} height={220} fill={T.strasse} />
      <Rect x={0} y={80} width={300} height={70} fill={T.strasse} />
      <G stroke={T.linie} strokeWidth={2.6} strokeDasharray="10 9" strokeLinecap="round">
        <Line x1={150} y1={2} x2={150} y2={72} />
        <Line x1={150} y1={158} x2={150} y2={218} />
        <Line x1={2} y1={115} x2={107} y2={115} />
        <Line x1={193} y1={115} x2={298} y2={115} />
      </G>
    </G>
  );
}

function KreisverkehrHell() {
  const cx = 150;
  const cy = 112;
  return (
    <G>
      <Rect x={0} y={0} width={300} height={220} fill={T.grund} />
      <Rect x={125} y={0} width={50} height={60} fill={T.strasse} />
      <Rect x={125} y={164} width={50} height={56} fill={T.strasse} />
      <Rect x={0} y={87} width={98} height={50} fill={T.strasse} />
      <Rect x={202} y={87} width={98} height={50} fill={T.strasse} />
      <Circle cx={cx} cy={cy} r={68} fill={T.strasse} />
      <Circle cx={cx} cy={cy} r={33} fill={T.insel} stroke={T.inselRand} strokeWidth={3} />
      <Circle cx={cx} cy={cy} r={50} fill="none" stroke={T.linie} strokeWidth={2.4} strokeDasharray="9 9" />
      <G stroke={T.linie} strokeWidth={2.6} strokeDasharray="8 8" strokeLinecap="round">
        <Line x1={150} y1={2} x2={150} y2={40} />
        <Line x1={150} y1={184} x2={150} y2={218} />
        <Line x1={2} y1={112} x2={78} y2={112} />
        <Line x1={222} y1={112} x2={298} y2={112} />
      </G>
    </G>
  );
}

/** Hintergrund der Tafel. */
function Grund({ grund, bild }: { grund: TafelGrund; bild: LiveBild | null }) {
  if (grund === "bild" && bild) return <Image source={{ uri: liveBildUrl(bild.pfad) }} resizeMode="cover" style={StyleSheet.absoluteFill} />;
  if (grund === "kreuzung" || grund === "kreisverkehr") {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 300 220" preserveAspectRatio="none">
          {grund === "kreuzung" ? <KreuzungHell /> : <KreisverkehrHell />}
        </Svg>
      </View>
    );
  }
  // Leere Tafel: weiß mit feinem lila Punktraster
  const w = 1000 * VORLAGE_SEITE.leer;
  const punkte: { x: number; y: number }[] = [];
  for (let x = 40; x < w; x += 62) for (let y = 40; y < 1000; y += 62) punkte.push({ x, y });
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${w} 1000`} preserveAspectRatio="none">
        {punkte.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={2.6} fill="#DCD2F7" />
        ))}
      </Svg>
    </View>
  );
}

const LEISTE = 54;

function Chip({ titel, aktiv, onPress }: { titel: string; aktiv: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: aktiv }}
      accessibilityLabel={`Hintergrund ${titel}`}
      style={({ pressed }) => ({
        height: 34,
        paddingHorizontal: 14,
        borderRadius: 17,
        justifyContent: "center",
        backgroundColor: aktiv ? "#EEE6FF" : "#FFFFFF",
        borderWidth: 1.5,
        borderColor: aktiv ? "#8A5FFF" : "#E1DDF0",
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text style={{ ...lilaSchrift.textFett, fontSize: 13, color: aktiv ? "#6A3FE6" : "#2E2650" }}>{titel}</Text>
    </Pressable>
  );
}

function Werkzeug({ icon, label, aktiv, aus, onPress }: { icon: IconName; label: string; aktiv?: boolean; aus?: boolean; onPress: () => void }) {
  return (
    <Pressable
      disabled={aus}
      onPress={() => {
        tippen();
        onPress();
      }}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: aktiv, disabled: aus }}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: aktiv ? "#8A5FFF" : "transparent",
        opacity: aus ? 0.35 : pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={19} color={aktiv ? "#FFFFFF" : "#6E6888"} />
    </Pressable>
  );
}

export function TafelBuehne({
  tafel,
  bild,
  zug,
  bearbeitbar,
  oben,
  unten,
  name,
  onZug,
  onStrich,
  onRueckgaengig,
  onLeeren,
  onGrund,
  onFertig,
}: {
  tafel: LiveTafel;
  bild: LiveBild | null;
  /** Strich, der gerade gezogen wird (Zuschauer: vom Gastgeber) */
  zug?: Strich | null;
  bearbeitbar: boolean;
  oben: number;
  unten: number;
  /** Name des Gastgebers (für „… zeichnet“) */
  name?: string;
  onZug?: (s: Strich | null) => void;
  onStrich?: (s: Strich) => void;
  onRueckgaengig?: () => void;
  onLeeren?: () => void;
  onGrund?: (g: TafelGrund) => void;
  onFertig?: () => void;
}) {
  const { width, height } = useFenster();
  const [farbe, setFarbe] = useState<string>(TAFEL_FARBEN[0]);
  const [pfeil, setPfeil] = useState(false);
  const [eigen, setEigen] = useState<Strich | null>(null);
  const zugRef = useRef<{ s: Strich; lx: number; ly: number } | null>(null);
  const gesendet = useRef(0);

  const seite = tafel.grund === "bild" ? (bild?.seite ?? 1) : VORLAGE_SEITE[tafel.grund];
  // Die Fläche sitzt mittig zwischen Kopf und Werkzeugleiste (Gastgeber, unten am
  // Daumen) bzw. Chat (Zuschauer: `unten` hält ihn frei).
  const bereichOben = oben + (bearbeitbar ? 58 : 50);
  const bereichUnten = height - unten - (bearbeitbar ? LEISTE + 14 : 0);
  const maxHoehe = bereichUnten - bereichOben - 12;
  const bw = Math.min(width - 24, maxHoehe * seite);
  const bh = bw / seite;
  const flaecheOben = bereichOben + Math.max(0, (bereichUnten - bereichOben - bh) / 2);

  const auftritt = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    auftritt.setValue(0);
    Animated.spring(auftritt, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }).start();
  }, [tafel.grund, auftritt]);

  function punkt(x: number, y: number) {
    return [Math.min(1000, Math.max(0, (x / bw) * 1000)), Math.min(1000, Math.max(0, (y / bh) * 1000))] as const;
  }
  function weiter(s: Strich) {
    setEigen(s);
    const jetzt = Date.now();
    if (jetzt - gesendet.current > 50) {
      gesendet.current = jetzt;
      onZug?.(s);
    }
  }
  function beginnen(x: number, y: number) {
    const [nx, ny] = punkt(x, y);
    const s: Strich = { f: farbe, a: pfeil || undefined, p: pfeil ? [nx, ny, nx, ny] : [nx, ny] };
    zugRef.current = { s, lx: x, ly: y };
    gesendet.current = 0;
    weiter(s);
  }
  function ziehen(x: number, y: number) {
    const z = zugRef.current;
    if (!z) return;
    const [nx, ny] = punkt(x, y);
    if (z.s.a) {
      z.s = { ...z.s, p: [z.s.p[0], z.s.p[1], nx, ny] };
    } else {
      if (Math.hypot(x - z.lx, y - z.ly) < 2.5) return;
      z.s = { ...z.s, p: [...z.s.p, nx, ny] };
      z.lx = x;
      z.ly = y;
    }
    weiter(z.s);
  }
  function beenden() {
    const z = zugRef.current;
    zugRef.current = null;
    setEigen(null);
    if (!z) return;
    // Fertige Striche ersetzen den laufenden; nur ein verworfener muss ihn wegnehmen.
    if (z.s.a) {
      const lang = Math.hypot(((z.s.p[2] - z.s.p[0]) / 1000) * bw, ((z.s.p[3] - z.s.p[1]) / 1000) * bh);
      if (lang < 14) {
        onZug?.(null);
        return;
      }
      onStrich?.({ ...z.s, p: z.s.p.map(Math.round) });
      return;
    }
    onStrich?.({ ...z.s, p: vereinfachen(z.s.p) });
  }

  const malen = Gesture.Pan()
    .enabled(bearbeitbar)
    .runOnJS(true)
    .minDistance(0)
    .maxPointers(1)
    .shouldCancelWhenOutside(false)
    .onBegin((e) => beginnen(e.x, e.y))
    .onUpdate((e) => ziehen(e.x, e.y))
    .onFinalize(() => beenden());

  const laufend = bearbeitbar ? eigen : zug;
  const spitze = laufend && laufend.p.length >= 2 ? { x: (laufend.p[laufend.p.length - 2] / 1000) * bw, y: (laufend.p[laufend.p.length - 1] / 1000) * bh } : null;

  const flaeche = (
    <View style={{ width: bw, height: bh, borderRadius: 18, overflow: "hidden", backgroundColor: "#FFFFFF" }}>
      <Grund grund={tafel.grund} bild={bild} />
      <StricheSvg striche={tafel.striche} zug={laufend} seite={seite} />
      {/* Stiftspitze: Zuschauer sehen, wo gerade gemalt wird */}
      {!bearbeitbar && spitze ? (
        <View pointerEvents="none" style={{ position: "absolute", left: spitze.x - 9, top: spitze.y - 9, width: 18, height: 18, borderRadius: 9, backgroundColor: "rgba(138,95,255,0.18)", borderWidth: 2, borderColor: laufend?.f ?? "#8A5FFF" }} />
      ) : null}
    </View>
  );

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#F4F2FC" }]} />

      {/* Kopf: Hintergrund wählen + Fertig (Gastgeber) bzw. Hinweis (Zuschauer) */}
      {bearbeitbar ? (
        <View style={{ position: "absolute", top: oben + 8, left: 0, right: 0, flexDirection: "row", alignItems: "center" }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingLeft: 12, paddingRight: 8, alignItems: "center" }}>
            {(bild ? (["bild", "kreuzung", "kreisverkehr", "leer"] as TafelGrund[]) : (["kreuzung", "kreisverkehr", "leer"] as TafelGrund[])).map((g) => (
              <Chip key={g} titel={GRUND_NAMEN[g]} aktiv={tafel.grund === g} onPress={() => g !== tafel.grund && onGrund?.(g)} />
            ))}
          </ScrollView>
          <Pressable
            onPress={() => {
              tippen();
              onFertig?.();
            }}
            accessibilityRole="button"
            accessibilityLabel="Tafel fertig"
            style={({ pressed }) => [{ marginRight: 12, borderRadius: 17, transform: [{ scale: pressed ? 0.96 : 1 }] }, leuchten("#6A3FE6", 0.3, 10, 4)]}
          >
            <LinearGradient colors={["#9B74FF", "#7A4BF2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 34, borderRadius: 17, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Icon name="checkmark" size={15} color="#FFFFFF" />
              <Text style={{ ...lilaSchrift.textFett, fontSize: 14, color: "#FFFFFF" }}>Fertig</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <View pointerEvents="none" style={{ position: "absolute", top: Math.max(oben + 8, flaecheOben - 42), left: 0, right: 0, alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#E1DDF0" }}>
            <Icon name="brush" size={13} color="#8A5FFF" />
            <Text style={{ ...lilaSchrift.textFett, fontSize: 12.5, color: "#2E2650" }}>{zug ? `${name ?? "Gastgeber"} zeichnet …` : "Tafel"}</Text>
          </View>
        </View>
      )}

      {/* Fläche */}
      <Animated.View
        style={[
          { position: "absolute", top: flaecheOben, left: (width - bw) / 2, borderRadius: 18 },
          leuchten("#6A3FE6", 0.16, 22, 10),
          { opacity: auftritt, transform: [{ scale: auftritt.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] },
        ]}
      >
        {bearbeitbar ? <GestureDetector gesture={malen}>{flaeche}</GestureDetector> : flaeche}
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18, borderWidth: 1.5, borderColor: "#E1DDF0" }} />
      </Animated.View>

      {/* Werkzeuge (Gastgeber) */}
      {bearbeitbar ? (
        <View style={{ position: "absolute", bottom: unten, left: 0, right: 0, alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2, height: LEISTE, paddingHorizontal: 8, borderRadius: LEISTE / 2, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#E1DDF0", ...leuchten("#6A3FE6", 0.14, 16, 6) }}>
            {TAFEL_FARBEN.map((f) => {
              const gewaehlt = f === farbe;
              return (
                <Pressable
                  key={f}
                  onPress={() => {
                    tippen();
                    setFarbe(f);
                  }}
                  hitSlop={3}
                  accessibilityRole="button"
                  accessibilityLabel={`Farbe ${f}`}
                  accessibilityState={{ selected: gewaehlt }}
                  style={{ width: 32, height: 36, alignItems: "center", justifyContent: "center" }}
                >
                  <View style={{ width: gewaehlt ? 26 : 20, height: gewaehlt ? 26 : 20, borderRadius: 13, backgroundColor: f, borderWidth: gewaehlt ? 3 : 0, borderColor: "#FFFFFF", ...(gewaehlt ? { shadowColor: f, shadowOpacity: 0.6, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 3 } : null) }} />
                </Pressable>
              );
            })}
            <View style={{ width: 1, height: 26, backgroundColor: "#E1DDF0", marginHorizontal: 4 }} />
            <Werkzeug icon="brush" label="Stift" aktiv={!pfeil} onPress={() => setPfeil(false)} />
            <Werkzeug icon="arrow-forward" label="Pfeil" aktiv={pfeil} onPress={() => setPfeil(true)} />
            <View style={{ width: 1, height: 26, backgroundColor: "#E1DDF0", marginHorizontal: 4 }} />
            <Werkzeug icon="arrow-undo" label="Rückgängig" aus={!tafel.striche.length} onPress={() => onRueckgaengig?.()} />
            <Werkzeug icon="trash-outline" label="Alles löschen" aus={!tafel.striche.length} onPress={() => onLeeren?.()} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
