import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";

import type { ClipBildKey } from "@/lib/clips";
import type { LeuchteKey } from "@/lib/fragen";
import { farben, schrift } from "@/lib/theme";
import { ANDERE, ASPHALT, Auto, DU, GEHWEG, GRUND, Kreuzung, MARKIERUNG, NEUTRAL, RAND, Radfahrer } from "./lagen";
import { Kontrollleuchte, LEUCHTE_NAME } from "./leuchten";

// Bewegte Grafiken für die Clips. Gezeichnet wird in Szenen-Koordinaten
// (300 × 220) und auf die Breite skaliert; Fahrzeuge fahren als eigene
// Ebenen darüber (Animationen laufen nativ).

const SB = 300;
const SH = 220;
// Feste Referenzen – sonst startet die Schleife bei jedem Rendern neu.
const WEICH = Easing.inOut(Easing.quad);
const LINEAR = Easing.linear;

/** Endlosschleife 0 → 1, läuft nur, solange der Clip sichtbar ist. */
function useSchleife(aktiv: boolean, dauer: number, pause = 700, easing = WEICH) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!aktiv) {
      v.stopAnimation();
      v.setValue(0);
      return;
    }
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: dauer, easing, useNativeDriver: true }),
        Animated.delay(pause),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [aktiv, dauer, pause, easing, v]);
  return v;
}

type Wert = Animated.AnimatedInterpolation<number> | number;

/** Szenen-Koordinate → Pixel, zentriert auf eine Figur der Größe `g`. */
function lage(v: Animated.Value, eingaben: number[], werte: number[], k: number, g: number): Animated.AnimatedInterpolation<number> {
  return v.interpolate({ inputRange: eingaben, outputRange: werte.map((w) => w * k - g / 2), extrapolate: "clamp" });
}

/** Fahrzeug als eigene Ebene. */
function Fahrzeug({ k, farbe, winkel = 0, x, y, rad }: { k: number; farbe: string; winkel?: number; x: Wert; y: Wert; rad?: boolean }) {
  const g = 46 * k;
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: g, height: g, transform: [{ translateX: x }, { translateY: y }] }}>
      <Svg width={g} height={g} viewBox="-23 -23 46 46">
        {rad ? (
          <G transform={`rotate(${winkel})`}>
            <Radfahrer x={0} y={0} />
          </G>
        ) : (
          <Auto x={0} y={0} winkel={winkel} farbe={farbe} />
        )}
      </Svg>
    </Animated.View>
  );
}

function Szene({ breite, children }: { breite: number; children: React.ReactNode }) {
  return (
    <Svg width={breite} height={(breite * SH) / SB} viewBox={`0 0 ${SB} ${SH}`} style={{ position: "absolute", left: 0, top: 0 }}>
      {children}
    </Svg>
  );
}

// ---------------------------------------------------------------------------

function Leuchten({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const v = useSchleife(aktiv, 3000, 1400, LINEAR);
  const liste: LeuchteKey[] = ["leuchte_oel", "leuchte_batterie", "leuchte_bremse", "leuchte_kuehlmittel", "leuchte_motor", "leuchte_fernlicht"];
  const g = breite * 0.2;
  return (
    <View style={{ flex: 1, backgroundColor: "#05080F", flexDirection: "row", flexWrap: "wrap", alignContent: "center", justifyContent: "center", paddingHorizontal: breite * 0.04 }}>
      {liste.map((l, i) => (
        <View key={l} style={{ width: "33%", alignItems: "center", marginVertical: breite * 0.02 }}>
          <View style={{ width: g, height: g }}>
            <View style={{ position: "absolute" }}>
              <Kontrollleuchte leuchte={l} groesse={g} aus />
            </View>
            <Animated.View style={{ opacity: v.interpolate({ inputRange: [i / 7, i / 7 + 0.06], outputRange: [0, 1], extrapolate: "clamp" }) }}>
              <Kontrollleuchte leuchte={l} groesse={g} />
            </Animated.View>
          </View>
          <Text style={{ fontFamily: schrift.textHalb, fontSize: 11, color: farben.text3, marginTop: 2 }} numberOfLines={1}>
            {LEUCHTE_NAME[l]}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RechtsVorLinks({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const k = breite / SB;
  const g = 46 * k;
  const v = useSchleife(aktiv, 4200, 600, LINEAR);
  return (
    <View style={{ flex: 1 }}>
      <Szene breite={breite}>
        <Kreuzung />
      </Szene>
      <Fahrzeug k={k} farbe={ANDERE} winkel={-90} x={lage(v, [0, 0.55], [262, -40], k, g)} y={97 * k - g / 2} />
      <Fahrzeug k={k} farbe={DU} x={167 * k - g / 2} y={lage(v, [0, 0.5, 1], [184, 184, -40], k, g)} />
    </View>
  );
}

function Anhalteweg({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const k = breite / SB;
  const g = 46 * k;
  const v = useSchleife(aktiv, 3400, 1500, LINEAR);
  const start = 40;
  const reaktion = 82.5;
  const bremsen = 137.5;
  const balken = (von: number, laenge: number, farbe: string, bis: [number, number]) => {
    const w = laenge * k;
    const s = v.interpolate({ inputRange: bis, outputRange: [0.001, 1], extrapolate: "clamp" });
    return (
      <Animated.View
        style={{
          position: "absolute",
          left: von * k,
          top: 84 * k,
          width: w,
          height: 10 * k,
          borderRadius: 3,
          backgroundColor: farbe,
          transform: [{ translateX: v.interpolate({ inputRange: bis, outputRange: [-w / 2, 0], extrapolate: "clamp" }) }, { scaleX: s }],
        }}
      />
    );
  };
  const label = (x: number, text: string, farbe: string, ab: number) => (
    <Animated.Text
      style={{
        position: "absolute",
        left: x * k - 40,
        width: 80,
        top: 58 * k,
        textAlign: "center",
        fontFamily: schrift.titelFett,
        fontSize: 13,
        color: farbe,
        opacity: v.interpolate({ inputRange: [ab, ab + 0.08], outputRange: [0, 1], extrapolate: "clamp" }),
      }}
    >
      {text}
    </Animated.Text>
  );
  return (
    <View style={{ flex: 1 }}>
      <Szene breite={breite}>
        <Rect x={0} y={0} width={SB} height={SH} fill={GRUND} />
        <Rect x={0} y={122} width={SB} height={56} fill={ASPHALT} />
        <Line x1={0} y1={122} x2={SB} y2={122} stroke={RAND} strokeWidth={2} />
        <Line x1={0} y1={178} x2={SB} y2={178} stroke={RAND} strokeWidth={2} />
        <Line x1={0} y1={150} x2={SB} y2={150} stroke={MARKIERUNG} strokeWidth={2} strokeDasharray="12 10" />
        <Line x1={start} y1={80} x2={start} y2={110} stroke={farben.text3} strokeWidth={1.5} />
        <Line x1={start + reaktion + bremsen} y1={80} x2={start + reaktion + bremsen} y2={110} stroke={farben.text3} strokeWidth={1.5} />
        <SvgText x={start} y={206} fill={farben.text3} fontSize={11} fontFamily={schrift.textHalb} textAnchor="middle">
          Gefahr erkannt
        </SvgText>
        <SvgText x={start + reaktion + bremsen} y={206} fill={farben.text3} fontSize={11} fontFamily={schrift.textHalb} textAnchor="middle">
          Stillstand
        </SvgText>
      </Szene>
      {balken(start, reaktion, farben.blau, [0, 0.35])}
      {balken(start + reaktion, bremsen, farben.orange, [0.35, 1])}
      {label(start + reaktion / 2, "15 m", farben.blau, 0.1)}
      {label(start + reaktion + bremsen / 2, "25 m", farben.orange, 0.6)}
      <Fahrzeug k={k} farbe={DU} winkel={90} x={lage(v, [0, 0.35, 1], [start, start + reaktion, start + reaktion + bremsen - 14], k, g)} y={164 * k - g / 2} />
    </View>
  );
}

function Rettungsgasse({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const k = breite / SB;
  const g = 46 * k;
  const v = useSchleife(aktiv, 3800, 900);
  const reihen = [40, 96, 152];
  const seite = (x: number, dx: number) => lage(v, [0, 0.3], [x, x + dx], k, g);
  return (
    <View style={{ flex: 1 }}>
      <Szene breite={breite}>
        <Rect x={0} y={0} width={SB} height={SH} fill={GRUND} />
        <Rect x={58} y={0} width={196} height={SH} fill={ASPHALT} />
        <Rect x={212} y={0} width={42} height={SH} fill="#26304A" />
        <Line x1={61} y1={0} x2={61} y2={SH} stroke={MARKIERUNG} strokeWidth={2.4} />
        <Line x1={211} y1={0} x2={211} y2={SH} stroke={MARKIERUNG} strokeWidth={2.4} />
        <Line x1={110} y1={0} x2={110} y2={SH} stroke={MARKIERUNG} strokeWidth={2} strokeDasharray="14 12" />
        <Line x1={160} y1={0} x2={160} y2={SH} stroke={MARKIERUNG} strokeWidth={2} strokeDasharray="14 12" />
      </Szene>
      {reihen.map((y) => (
        <View key={y} pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
          <Fahrzeug k={k} farbe={y === 152 ? DU : NEUTRAL} x={seite(85, -16)} y={y * k - g / 2} />
          <Fahrzeug k={k} farbe={NEUTRAL} x={seite(135, 14)} y={y * k - g / 2} />
          <Fahrzeug k={k} farbe={NEUTRAL} x={seite(185, 12)} y={y * k - g / 2} />
        </View>
      ))}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 110 * k - 12 * k,
          top: 0,
          width: 24 * k,
          height: 46 * k,
          borderRadius: 5,
          backgroundColor: "#E9EDF5",
          transform: [{ translateY: v.interpolate({ inputRange: [0.35, 1], outputRange: [SH * k + 10, -60 * k], extrapolate: "clamp" }) }],
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 3 }}>
          <View style={{ width: 7 * k, height: 4 * k, borderRadius: 1, backgroundColor: "#2F7BFF" }} />
          <View style={{ width: 7 * k, height: 4 * k, borderRadius: 1, backgroundColor: "#2F7BFF" }} />
        </View>
      </Animated.View>
    </View>
  );
}

function Kreisverkehr({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const k = breite / SB;
  const g = 46 * k;
  const v = useSchleife(aktiv, 5200, 300, LINEAR);
  const cx = 150;
  const cy = 112;
  const r = 50;
  return (
    <View style={{ flex: 1 }}>
      <Szene breite={breite}>
        <Rect x={0} y={0} width={SB} height={SH} fill={GRUND} />
        <Rect x={125} y={0} width={50} height={60} fill={ASPHALT} />
        <Rect x={125} y={164} width={50} height={56} fill={ASPHALT} />
        <Rect x={0} y={87} width={98} height={50} fill={ASPHALT} />
        <Rect x={202} y={87} width={98} height={50} fill={ASPHALT} />
        <Circle cx={cx} cy={cy} r={68} fill={ASPHALT} />
        <Circle cx={cx} cy={cy} r={33} fill="#16213B" stroke={RAND} strokeWidth={2} />
        <Circle cx={cx} cy={cy} r={20} fill="#1B2A48" />
      </Szene>
      {/* Drehteller: das Auto fährt gegen den Uhrzeigersinn im Kreis */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: (cx - r) * k,
          top: (cy - r) * k,
          width: 2 * r * k,
          height: 2 * r * k,
          transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-360deg"] }) }],
        }}
      >
        <View style={{ position: "absolute", left: -g / 2, top: r * k - g / 2, width: g, height: g }}>
          <Svg width={g} height={g} viewBox="-23 -23 46 46">
            <Auto x={0} y={0} winkel={180} farbe={DU} />
          </Svg>
          {/* Blinker rechts – nur beim Hinausfahren */}
          <Animated.View
            style={{
              position: "absolute",
              left: g / 2 - 16 * k,
              top: g / 2 + 12 * k,
              width: 8 * k,
              height: 8 * k,
              borderRadius: 4 * k,
              backgroundColor: farben.orange,
              opacity: v.interpolate({ inputRange: [0, 0.7, 0.72, 0.77, 0.79, 0.84, 0.86, 0.91, 0.93, 1], outputRange: [0, 0, 1, 1, 0, 1, 0, 1, 0, 0] }),
            }}
          />
        </View>
      </Animated.View>
    </View>
  );
}

function Abstand({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const k = breite / SB;
  const g = 46 * k;
  const v = useSchleife(aktiv, 1600, 0, LINEAR);
  return (
    <View style={{ flex: 1, overflow: "hidden" }}>
      <Szene breite={breite}>
        <Rect x={0} y={0} width={SB} height={SH} fill={GRUND} />
        <Rect x={0} y={96} width={SB} height={92} fill={ASPHALT} />
        <Line x1={0} y1={96} x2={SB} y2={96} stroke={MARKIERUNG} strokeWidth={2} />
        <Line x1={0} y1={188} x2={SB} y2={188} stroke={MARKIERUNG} strokeWidth={2} />
        <Line x1={0} y1={142} x2={SB} y2={142} stroke={MARKIERUNG} strokeWidth={2} strokeDasharray="12 10" />
        <Line x1={86} y1={70} x2={210} y2={70} stroke={farben.orange} strokeWidth={2} />
        <Line x1={86} y1={63} x2={86} y2={77} stroke={farben.orange} strokeWidth={2} />
        <Line x1={210} y1={63} x2={210} y2={77} stroke={farben.orange} strokeWidth={2} />
        <SvgText x={148} y={56} fill={farben.orange} fontSize={16} fontFamily={schrift.titel} fontWeight="800" textAnchor="middle">
          50 m
        </SvgText>
        <SvgText x={62} y={210} fill={farben.text3} fontSize={11} fontFamily={schrift.textHalb} textAnchor="middle">
          100 km/h
        </SvgText>
      </Szene>
      {/* Leitpfosten ziehen vorbei – alle 50 m einer */}
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, top: 88 * k, flexDirection: "row", transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -124 * k] }) }] }}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <View key={i} style={{ width: 124 * k, alignItems: "flex-start" }}>
            <View style={{ width: 4 * k, height: 12 * k, borderRadius: 1, backgroundColor: "#E9EDF5" }}>
              <View style={{ width: 4 * k, height: 3 * k, backgroundColor: farben.orange }} />
            </View>
          </View>
        ))}
      </Animated.View>
      <Fahrzeug k={k} farbe={DU} winkel={90} x={70 * k - g / 2} y={165 * k - g / 2} />
      <Fahrzeug k={k} farbe={NEUTRAL} winkel={90} x={226 * k - g / 2} y={165 * k - g / 2} />
    </View>
  );
}

function Schulbus({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const k = breite / SB;
  const g = 46 * k;
  const blink = useSchleife(aktiv, 700, 0, LINEAR);
  const fahrt = useSchleife(aktiv, 5200, 900, LINEAR);
  const lichter = [
    [170, 117],
    [278, 117],
    [170, 144],
    [278, 144],
  ];
  return (
    <View style={{ flex: 1 }}>
      <Szene breite={breite}>
        <Rect x={0} y={0} width={SB} height={SH} fill={GRUND} />
        <Rect x={0} y={40} width={SB} height={28} fill={GEHWEG} />
        <Rect x={0} y={152} width={SB} height={40} fill={GEHWEG} />
        <Rect x={0} y={70} width={SB} height={80} fill={ASPHALT} />
        <Line x1={0} y1={110} x2={SB} y2={110} stroke={MARKIERUNG} strokeWidth={2} strokeDasharray="12 10" />
        <Line x1={262} y1={186} x2={262} y2={170} stroke="#AEB6C8" strokeWidth={2} />
        <Circle cx={262} cy={164} r={10} fill={farben.schildGelb} stroke="#1E7F4F" strokeWidth={2} />
        <SvgText x={262} y={168.5} fill="#1E7F4F" fontSize={12} fontFamily={schrift.titel} fontWeight="800" textAnchor="middle">
          H
        </SvgText>
        <Rect x={168} y={115} width={112} height={31} rx={6} fill="#FFC857" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Rect key={i} x={176 + i * 19} y={119} width={13} height={6} rx={1.5} fill="#0A0F1E" opacity={0.55} />
        ))}
        <Circle cx={158} cy={162} r={4.5} fill="#F2C9A5" />
        <Rect x={153} y={167} width={10} height={12} rx={4} fill={ANDERE} />
      </Szene>
      {lichter.map(([x, y]) => (
        <Animated.View
          key={`${x}-${y}`}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: (x - 8) * k,
            top: (y - 8) * k,
            width: 16 * k,
            height: 16 * k,
            borderRadius: 8 * k,
            backgroundColor: farben.orange,
            opacity: blink.interpolate({ inputRange: [0, 0.5, 0.51, 1], outputRange: [1, 1, 0.15, 0.15] }),
          }}
        />
      ))}
      {/* Gegenverkehr: ebenfalls nur Schrittgeschwindigkeit */}
      <Fahrzeug k={k} farbe={DU} winkel={-90} x={lage(fahrt, [0, 1], [320, -30], k, g)} y={90 * k - g / 2} />
    </View>
  );
}

function Radabstand({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const k = breite / SB;
  const g = 46 * k;
  const v = useSchleife(aktiv, 3600, 700, LINEAR);
  const radX = lage(v, [0, 1], [110, 170], k, g);
  const autoX = lage(v, [0, 1], [-30, 330], k, g);
  const sichtbar = v.interpolate({ inputRange: [0.32, 0.4, 0.55, 0.63], outputRange: [0, 1, 1, 0], extrapolate: "clamp" });
  return (
    <View style={{ flex: 1 }}>
      <Szene breite={breite}>
        <Rect x={0} y={0} width={SB} height={SH} fill={GRUND} />
        <Rect x={0} y={60} width={SB} height={126} fill={ASPHALT} />
        <Line x1={0} y1={60} x2={SB} y2={60} stroke={RAND} strokeWidth={2} />
        <Line x1={0} y1={186} x2={SB} y2={186} stroke={RAND} strokeWidth={2} />
        <Line x1={0} y1={100} x2={SB} y2={100} stroke={MARKIERUNG} strokeWidth={2} strokeDasharray="12 10" />
      </Szene>
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: 150 * k - 34, top: 128 * k, alignItems: "center", opacity: sichtbar }}>
        <View style={{ width: 2, height: 36 * k, backgroundColor: farben.orange }} />
        <Text style={{ position: "absolute", left: 10, top: 10 * k, fontFamily: schrift.titel, fontSize: 15, color: farben.orange }}>1,5 m</Text>
      </Animated.View>
      <Fahrzeug k={k} farbe={ANDERE} rad winkel={90} x={radX} y={170 * k - g / 2} />
      <Fahrzeug k={k} farbe={DU} winkel={90} x={autoX} y={122 * k - g / 2} />
    </View>
  );
}

const BILDER: Record<ClipBildKey, (p: { breite: number; aktiv: boolean }) => React.JSX.Element> = {
  leuchten: Leuchten,
  rechts_vor_links: RechtsVorLinks,
  anhalteweg: Anhalteweg,
  rettungsgasse: Rettungsgasse,
  kreisverkehr: Kreisverkehr,
  abstand: Abstand,
  schulbus: Schulbus,
  radfahrer: Radabstand,
};

/** Bewegte Grafik eines Clips (Seitenverhältnis 300 : 220). */
export function ClipBild({ bild, breite, aktiv }: { bild: ClipBildKey; breite: number; aktiv: boolean }) {
  const Inhalt = BILDER[bild];
  return (
    <View style={{ width: breite, height: (breite * SH) / SB, backgroundColor: GRUND, overflow: "hidden" }}>
      <Inhalt breite={breite} aktiv={aktiv} />
    </View>
  );
}
