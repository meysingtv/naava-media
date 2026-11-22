import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";

import type { ClipBildKey } from "@/lib/clips";
import type { LeuchteKey } from "@/lib/fragen";
import { farben, schrift, svgSchrift } from "@/lib/theme";
import { ANDERE, ASPHALT, Auto, DU, GEHWEG, GRUND, Kreuzung, MARKIERUNG, NEUTRAL, RAND, Radfahrer } from "./lagen";
import { Kontrollleuchte, LEUCHTE_NAME } from "./leuchten";
import { Verkehrszeichen, ZeichenGrafik } from "./zeichen";
import type { ZeichenKey } from "@/lib/fragen";

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
    <View style={{ flex: 1, backgroundColor: "#060708", flexDirection: "row", flexWrap: "wrap", alignContent: "center", justifyContent: "center", paddingHorizontal: breite * 0.04 }}>
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
          <Text style={{ ...schrift.textHalb, fontSize: 11, color: farben.text3, marginTop: 2 }} numberOfLines={1}>
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
        ...schrift.titelFett,
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
        <SvgText x={start} y={206} fill={farben.text3} fontSize={11} fontFamily={svgSchrift.text} textAnchor="middle">
          Gefahr erkannt
        </SvgText>
        <SvgText x={start + reaktion + bremsen} y={206} fill={farben.text3} fontSize={11} fontFamily={svgSchrift.text} textAnchor="middle">
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
        <Rect x={212} y={0} width={42} height={SH} fill="#30343C" />
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
        <Circle cx={cx} cy={cy} r={33} fill="#1B1E23" stroke={RAND} strokeWidth={2} />
        <Circle cx={cx} cy={cy} r={20} fill="#232730" />
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
        <SvgText x={148} y={56} fill={farben.orange} fontSize={16} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle">
          50 m
        </SvgText>
        <SvgText x={62} y={210} fill={farben.text3} fontSize={11} fontFamily={svgSchrift.text} textAnchor="middle">
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
        <SvgText x={262} y={168.5} fill="#1E7F4F" fontSize={12} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle">
          H
        </SvgText>
        <Rect x={168} y={115} width={112} height={31} rx={6} fill="#FFC857" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Rect key={i} x={176 + i * 19} y={119} width={13} height={6} rx={1.5} fill="#0B0C0F" opacity={0.55} />
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
        <Text style={{ position: "absolute", left: 10, top: 10 * k, ...schrift.titel, fontSize: 15, color: farben.orange }}>1,5 m</Text>
      </Animated.View>
      <Fahrzeug k={k} farbe={ANDERE} rad winkel={90} x={radX} y={170 * k - g / 2} />
      <Fahrzeug k={k} farbe={DU} winkel={90} x={autoX} y={122 * k - g / 2} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Paket 1: Vorfahrt und Tempo
// ---------------------------------------------------------------------------

/** Fahrzeug, das sich beim Fahren dreht (Abbiegen). */
function DrehFahrzeug({ k, farbe, x, y, dreh, blinker }: { k: number; farbe: string; x: Wert; y: Wert; dreh: Animated.AnimatedInterpolation<string>; blinker?: { seite: "links" | "rechts"; an: Animated.AnimatedInterpolation<number> } }) {
  const g = 46 * k;
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: g, height: g, transform: [{ translateX: x }, { translateY: y }, { rotate: dreh }] }}>
      <Svg width={g} height={g} viewBox="-23 -23 46 46">
        <Auto x={0} y={0} farbe={farbe} />
      </Svg>
      {blinker ? (
        <Animated.View
          style={{
            position: "absolute",
            left: blinker.seite === "links" ? g / 2 - 13 * k : g / 2 + 7 * k,
            top: g / 2 - 22 * k,
            width: 6 * k,
            height: 6 * k,
            borderRadius: 3 * k,
            backgroundColor: "#FFB400",
            opacity: blinker.an,
          }}
        />
      ) : null}
    </Animated.View>
  );
}

/** Schild an einem Pfosten (Szenen-Koordinaten, oben links). */
function SchildAmPfosten({ zeichen, x, y, groesse = 26 }: { zeichen: ZeichenKey; x: number; y: number; groesse?: number }) {
  return (
    <G>
      <Line x1={x + groesse / 2} y1={y + groesse} x2={x + groesse / 2} y2={y + groesse + 12} stroke="#AEB6C8" strokeWidth={2} />
      <G transform={`translate(${x} ${y}) scale(${groesse / 100})`}>
        <ZeichenGrafik zeichen={zeichen} />
      </G>
    </G>
  );
}

/** Blinken: 0/1 im Wechsel innerhalb [von, bis] der Schleife. */
function blinkVon(v: Animated.Value, von: number, bis: number) {
  const schritte = 6;
  const ein: number[] = [0, von];
  const aus: number[] = [0, 0];
  for (let i = 0; i < schritte; i++) {
    const a = von + ((bis - von) * i) / schritte;
    const b = von + ((bis - von) * (i + 0.5)) / schritte;
    ein.push(a + 0.001, b);
    aus.push(1, 1);
    ein.push(b + 0.001, a + (bis - von) / schritte);
    aus.push(0, 0);
  }
  ein.push(1);
  aus.push(0);
  // Eingaben streng steigend halten
  const paare = ein.map((e, i) => [e, aus[i]] as const).sort((p, q) => p[0] - q[0]);
  const gefiltert = paare.filter((p, i) => i === 0 || p[0] > paare[i - 1][0]);
  return v.interpolate({ inputRange: gefiltert.map((p) => p[0]), outputRange: gefiltert.map((p) => p[1]), extrapolate: "clamp" });
}

function Abknickend({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const k = breite / SB;
  const g = 46 * k;
  const v = useSchleife(aktiv, 5200, 700, LINEAR);
  return (
    <View style={{ flex: 1 }}>
      <Szene breite={breite}>
        <Kreuzung />
        {/* Verlauf der Vorfahrtstraße: von unten nach links */}
        <Path d="M150,220 L150,150 Q150,115 115,115 L0,115" stroke="#FFC857" strokeWidth={6} fill="none" opacity={0.35} strokeLinejoin="round" />
        <SchildAmPfosten zeichen="z306" x={196} y={160} groesse={24} />
        {/* Zusatzzeichen: dicker Strich = Vorfahrtstraße knickt nach links ab */}
        <Rect x={194} y={186} width={28} height={20} fill="#FFFFFF" stroke="#0B0C0F" strokeWidth={1} />
        <Path d="M208,204 L208,196 L198,192" stroke="#0B0C0F" strokeWidth={3} fill="none" />
        <Path d="M208,196 L208,188 M208,196 L218,196" stroke="#0B0C0F" strokeWidth={1.2} fill="none" />
      </Szene>
      {/* Wartet auf der Nebenstraße rechts */}
      <Fahrzeug k={k} farbe={ANDERE} winkel={-90} x={lage(v, [0, 0.62, 1], [262, 262, -40], k, g)} y={97 * k - g / 2} />
      <DrehFahrzeug
        k={k}
        farbe={DU}
        x={lage(v, [0, 0.25, 0.42, 0.6], [167, 167, 128, -40], k, g)}
        y={lage(v, [0, 0.25, 0.42, 0.6], [200, 130, 97, 97], k, g)}
        dreh={v.interpolate({ inputRange: [0, 0.25, 0.42], outputRange: ["0deg", "0deg", "-90deg"], extrapolate: "clamp" })}
        blinker={{ seite: "links", an: blinkVon(v, 0.02, 0.42) }}
      />
    </View>
  );
}

function Stopp({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const k = breite / SB;
  const g = 46 * k;
  const v = useSchleife(aktiv, 6000, 600, LINEAR);
  const steht = v.interpolate({ inputRange: [0.2, 0.24, 0.6, 0.64], outputRange: [0, 1, 1, 0], extrapolate: "clamp" });
  return (
    <View style={{ flex: 1 }}>
      <Szene breite={breite}>
        <Kreuzung />
        <Line x1={152} y1={156} x2={184} y2={156} stroke="#FFFFFF" strokeWidth={5} />
        <SchildAmPfosten zeichen="z206" x={194} y={160} groesse={26} />
      </Szene>
      <Fahrzeug k={k} farbe={ANDERE} winkel={-90} x={lage(v, [0, 0.25, 0.5], [340, 340, -40], k, g)} y={97 * k - g / 2} />
      <Fahrzeug k={k} farbe={NEUTRAL} winkel={90} x={lage(v, [0, 0.3, 0.58], [-40, -40, 340], k, g)} y={133 * k - g / 2} />
      <Fahrzeug k={k} farbe={DU} x={167 * k - g / 2} y={lage(v, [0, 0.22, 0.62, 0.9], [230, 178, 178, -40], k, g)} />
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: 10 * k, top: 170 * k, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.55)", opacity: steht }}>
        <Text style={{ ...schrift.titelFett, fontSize: 13, color: "#FFFFFF" }}>Räder stehen still</Text>
      </Animated.View>
    </View>
  );
}

function Gruenpfeil({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const k = breite / SB;
  const g = 46 * k;
  const v = useSchleife(aktiv, 6200, 600, LINEAR);
  const fuss = lage(v, [0, 0.18, 0.5], [210, 210, 290], k, 12 * k);
  return (
    <View style={{ flex: 1 }}>
      <Szene breite={breite}>
        <Kreuzung />
        {/* Fußgängerfurt rechts */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Rect key={i} x={190 + i * 10} y={130} width={5} height={18} fill="rgba(255,255,255,0.55)" />
        ))}
        <Line x1={152} y1={156} x2={184} y2={156} stroke="#FFFFFF" strokeWidth={4} />
        {/* Ampel mit Rot und Grünpfeil-Schild */}
        <Rect x={196} y={156} width={14} height={34} rx={3} fill="#15171C" />
        <Circle cx={203} cy={163} r={4.5} fill="#FF3B30" />
        <Circle cx={203} cy={173} r={4} fill="#3A2E10" />
        <Circle cx={203} cy={183} r={4} fill="#0F2A17" />
        <Rect x={196} y={193} width={14} height={11} rx={1.5} fill="#0B0C0F" />
        <Path d="M199,198.5 L206,198.5 M203.5,195.5 L206.5,198.5 L203.5,201.5" stroke="#3CC45B" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      </Szene>
      {/* Fußgänger quert zuerst */}
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: 12 * k, height: 12 * k, borderRadius: 6 * k, backgroundColor: "#F2C9A5", borderWidth: 2, borderColor: ANDERE, transform: [{ translateX: fuss }, { translateY: 139 * k - 6 * k }] }} />
      <DrehFahrzeug
        k={k}
        farbe={DU}
        x={lage(v, [0, 0.15, 0.55, 0.7, 0.95], [167, 167, 167, 200, 340], k, g)}
        y={lage(v, [0, 0.15, 0.55, 0.7, 0.95], [230, 180, 180, 133, 133], k, g)}
        dreh={v.interpolate({ inputRange: [0, 0.55, 0.7], outputRange: ["0deg", "0deg", "90deg"], extrapolate: "clamp" })}
        blinker={{ seite: "rechts", an: blinkVon(v, 0.02, 0.7) }}
      />
    </View>
  );
}

function Linksabbiegen({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const k = breite / SB;
  const g = 46 * k;
  const v = useSchleife(aktiv, 5600, 700, LINEAR);
  return (
    <View style={{ flex: 1 }}>
      <Szene breite={breite}>
        <Kreuzung />
      </Szene>
      {/* Gegenverkehr fährt geradeaus durch */}
      <Fahrzeug k={k} farbe={ANDERE} winkel={180} x={133 * k - g / 2} y={lage(v, [0, 0.12, 0.5], [-40, -40, 260], k, g)} />
      <DrehFahrzeug
        k={k}
        farbe={DU}
        x={lage(v, [0, 0.18, 0.5, 0.66, 0.95], [167, 167, 167, 128, -40], k, g)}
        y={lage(v, [0, 0.18, 0.5, 0.66, 0.95], [230, 128, 128, 97, 97], k, g)}
        dreh={v.interpolate({ inputRange: [0, 0.5, 0.66], outputRange: ["0deg", "0deg", "-90deg"], extrapolate: "clamp" })}
        blinker={{ seite: "links", an: blinkVon(v, 0.02, 0.66) }}
      />
    </View>
  );
}

function Strassenbahn({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const k = breite / SB;
  const g = 46 * k;
  const v = useSchleife(aktiv, 6400, 700, LINEAR);
  const leute = [0, 1, 2];
  return (
    <View style={{ flex: 1 }}>
      <Szene breite={breite}>
        <Rect x={0} y={0} width={SB} height={SH} fill={GRUND} />
        <Rect x={0} y={24} width={SB} height={30} fill={GEHWEG} />
        <Rect x={0} y={54} width={SB} height={130} fill={ASPHALT} />
        <Rect x={0} y={184} width={SB} height={36} fill={GEHWEG} />
        {/* Gleise in der Mitte */}
        <Line x1={0} y1={100} x2={SB} y2={100} stroke="#8A8F99" strokeWidth={2} />
        <Line x1={0} y1={116} x2={SB} y2={116} stroke="#8A8F99" strokeWidth={2} />
        {/* Haltende Straßenbahn */}
        <Rect x={150} y={90} width={140} height={36} rx={8} fill="#E9EDF5" />
        <Rect x={150} y={112} width={140} height={8} fill="#FFC857" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Rect key={i} x={160 + i * 26} y={96} width={18} height={10} rx={2} fill="#0B0C0F" opacity={0.55} />
        ))}
        {/* Haltestellenschild */}
        <Line x1={240} y1={206} x2={240} y2={192} stroke="#AEB6C8" strokeWidth={2} />
        <Circle cx={240} cy={186} r={9} fill={farben.schildGelb} stroke="#1E7F4F" strokeWidth={2} />
        <SvgText x={240} y={190} fill="#1E7F4F" fontSize={11} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle">
          H
        </SvgText>
      </Szene>
      {/* Fahrgäste laufen von der Bahn zum Gehweg */}
      {leute.map((i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: (180 + i * 24) * k - 6 * k,
            top: 0,
            width: 12 * k,
            height: 12 * k,
            borderRadius: 6 * k,
            backgroundColor: "#F2C9A5",
            borderWidth: 2,
            borderColor: ANDERE,
            transform: [{ translateY: lage(v, [0.05 + i * 0.06, 0.4 + i * 0.06], [130, 196], k, 12 * k) }],
            opacity: v.interpolate({ inputRange: [0.04 + i * 0.06, 0.06 + i * 0.06], outputRange: [0, 1], extrapolate: "clamp" }),
          }}
        />
      ))}
      {/* Du wartest rechts neben der Bahn und fährst dann langsam vorbei */}
      <Fahrzeug k={k} farbe={DU} winkel={90} x={lage(v, [0, 0.12, 0.62, 1], [-40, 110, 110, 330], k, g)} y={154 * k - g / 2} />
    </View>
  );
}

function Tempolimits({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const v = useSchleife(aktiv, 3000, 1600, WEICH);
  const spalten: { zeichen: ZeichenKey; titel: string; unter: string }[] = [
    { zeichen: "z274_50", titel: "Innerorts", unter: "höchstens" },
    { zeichen: "z274_100", titel: "Außerorts", unter: "höchstens (Pkw)" },
    { zeichen: "z380", titel: "Autobahn", unter: "empfohlen" },
  ];
  const g = breite * 0.2;
  return (
    <View style={{ flex: 1, backgroundColor: "#0E1014", flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingHorizontal: breite * 0.03 }}>
      {spalten.map((sp, i) => {
        const ein = v.interpolate({ inputRange: [i * 0.25, i * 0.25 + 0.2], outputRange: [0, 1], extrapolate: "clamp" });
        return (
          <Animated.View key={sp.zeichen} style={{ alignItems: "center", gap: 6, opacity: ein, transform: [{ scale: ein.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
            <Text style={{ ...schrift.titelFett, fontSize: 14, color: "#FFFFFF" }}>{sp.titel}</Text>
            <Verkehrszeichen zeichen={sp.zeichen} groesse={g} />
            <Text style={{ ...schrift.textHalb, fontSize: 11, color: farben.text3 }}>{sp.unter}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

function Naesse({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const k = breite / SB;
  const g = 46 * k;
  const v = useSchleife(aktiv, 3600, 1500, LINEAR);
  const start = 30;
  const trocken = 100;
  const nass = 200;
  const bremse = (y: number, weg: number) => lage(v, [0, 0.2, 0.2 + (0.75 * weg) / nass], [start - 30, start, start + weg], k, g);
  return (
    <View style={{ flex: 1 }}>
      <Szene breite={breite}>
        <Rect x={0} y={0} width={SB} height={SH} fill={GRUND} />
        <Rect x={0} y={30} width={SB} height={60} fill={ASPHALT} />
        <Rect x={0} y={130} width={SB} height={60} fill="#2B3646" />
        {Array.from({ length: 22 }, (_, i) => (
          <Line key={i} x1={10 + ((i * 47) % 290)} y1={134 + ((i * 23) % 50)} x2={6 + ((i * 47) % 290)} y2={142 + ((i * 23) % 50)} stroke="#7FB4FF" strokeWidth={1.4} opacity={0.6} />
        ))}
        <SvgText x={8} y={24} fill={farben.text3} fontSize={11} fontFamily={svgSchrift.text}>
          trocken
        </SvgText>
        <SvgText x={8} y={124} fill="#7FB4FF" fontSize={11} fontFamily={svgSchrift.text}>
          nass
        </SvgText>
        <Line x1={start} y1={28} x2={start} y2={192} stroke={farben.text3} strokeWidth={1.2} strokeDasharray="4 4" />
        <SvgText x={start} y={210} fill={farben.text3} fontSize={10} fontFamily={svgSchrift.text} textAnchor="middle">
          Bremsbeginn
        </SvgText>
      </Szene>
      <Animated.Text style={{ position: "absolute", left: (start + trocken) * k - 20, top: 92 * k, ...schrift.titelFett, fontSize: 13, color: "#FFFFFF", opacity: v.interpolate({ inputRange: [0.6, 0.7], outputRange: [0, 1], extrapolate: "clamp" }) }}>1×</Animated.Text>
      <Animated.Text style={{ position: "absolute", left: (start + nass) * k - 30, top: 192 * k, ...schrift.titelFett, fontSize: 13, color: "#7FB4FF", opacity: v.interpolate({ inputRange: [0.9, 0.98], outputRange: [0, 1], extrapolate: "clamp" }) }}>bis 2×</Animated.Text>
      <Fahrzeug k={k} farbe={NEUTRAL} winkel={90} x={bremse(60, trocken)} y={60 * k - g / 2} />
      <Fahrzeug k={k} farbe={DU} winkel={90} x={bremse(160, nass)} y={160 * k - g / 2} />
    </View>
  );
}

function Reissverschluss({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const k = breite / SB;
  const g = 46 * k;
  const v = useSchleife(aktiv, 6000, 600, LINEAR);
  // Linker Streifen y=80, rechter y=140 (endet bei x≈210)
  const links = [20, 110];
  return (
    <View style={{ flex: 1 }}>
      <Szene breite={breite}>
        <Rect x={0} y={0} width={SB} height={SH} fill={GRUND} />
        <Polygon points={`0,50 ${SB},50 ${SB},110 240,110 200,170 0,170`} fill={ASPHALT} />
        <Line x1={0} y1={110} x2={200} y2={110} stroke={MARKIERUNG} strokeWidth={2} strokeDasharray="12 10" />
        <Line x1={0} y1={50} x2={SB} y2={50} stroke={RAND} strokeWidth={2} />
        <Path d="M0,170 L200,170 L240,110 L300,110" stroke={RAND} strokeWidth={2} fill="none" />
        <SvgText x={150} y={200} fill={farben.text3} fontSize={11} fontFamily={svgSchrift.text} textAnchor="middle">
          Fahrstreifen endet
        </SvgText>
      </Szene>
      {links.map((x0, i) => (
        <Fahrzeug key={i} k={k} farbe={NEUTRAL} winkel={90} x={lage(v, [0, 1], [x0, x0 + 260], k, g)} y={80 * k - g / 2} />
      ))}
      {/* Du fährst rechts bis kurz vor das Ende und fädelst in die Lücke ein */}
      <DrehFahrzeug
        k={k}
        farbe={DU}
        x={lage(v, [0, 0.4, 0.55, 1], [10, 175, 215, 330], k, g)}
        y={lage(v, [0, 0.4, 0.55, 1], [140, 140, 80, 80], k, g)}
        dreh={v.interpolate({ inputRange: [0, 0.4, 0.47, 0.55], outputRange: ["90deg", "90deg", "60deg", "90deg"], extrapolate: "clamp" })}
        blinker={{ seite: "links", an: blinkVon(v, 0.25, 0.55) }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Neuer Stil (Vorschau): helle lila Welt, runde Autos mit Schatten,
// Erklär-Pillen, Leuchtring für den, der Vorfahrt hat.
// ---------------------------------------------------------------------------

const NEU = {
  grund: "#EFE8FF",
  gehweg: "#FBF9FF",
  strasse: "#D8CCF6",
  strassenRand: "#C4B5F0",
  linie: "#FFFFFF",
  du: "#8A5FFF",
  duDunkel: "#6A3FE6",
  andere: "#FF7A59",
  andereDunkel: "#E0553A",
  tinte: "#2E2650",
  gruen: "#22B573",
};

/** Rundliches Auto von oben mit Schatten, Scheiben, Lichtern. Front oben. */
function AutoNeu({ farbe, dunkel, groesse }: { farbe: string; dunkel: string; groesse: number }) {
  return (
    <Svg width={groesse} height={groesse} viewBox="-30 -30 60 60">
      <Rect x={-15} y={-22} width={30} height={48} rx={13} fill="#2E2650" opacity={0.16} />
      <Rect x={-14} y={-25} width={28} height={48} rx={12} fill={dunkel} />
      <Rect x={-14} y={-26} width={28} height={44} rx={12} fill={farbe} />
      <Path d="M-10,-9 L10,-9 L8,-17 L-8,-17 Z" fill="#2E2650" opacity={0.55} />
      <Path d="M-9,10 L9,10 L7.5,15 L-7.5,15 Z" fill="#2E2650" opacity={0.45} />
      <Rect x={-9} y={-7} width={18} height={15} rx={4} fill="#FFFFFF" opacity={0.22} />
      <Rect x={-11} y={-26} width={6} height={3} rx={1.5} fill="#FFF6D6" />
      <Rect x={5} y={-26} width={6} height={3} rx={1.5} fill="#FFF6D6" />
      <Rect x={-11} y={17} width={5} height={2.5} rx={1.2} fill="#FF5A6E" />
      <Rect x={6} y={17} width={5} height={2.5} rx={1.2} fill="#FF5A6E" />
    </Svg>
  );
}

/** Weiße Pille mit Text (und optional Häkchen/Kreuz), blendet ein und aus. */
function Pille({ k, x, y, text, sichtbar, art = "info" }: { k: number; x: number; y: number; text: string; sichtbar: Animated.AnimatedInterpolation<number>; art?: "info" | "ok" | "warten" }) {
  const farbe = art === "ok" ? NEU.gruen : art === "warten" ? NEU.andere : NEU.du;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x * k,
        top: y * k,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 6,
        paddingLeft: 7,
        paddingRight: 12,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        shadowColor: "#6A3FE6",
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        opacity: sichtbar,
        transform: [{ translateY: sichtbar.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }, { scale: sichtbar.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
      }}
    >
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: farbe, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 12, color: "#FFFFFF", fontFamily: "Inter_700Bold", lineHeight: 14 }}>{art === "ok" ? "✓" : art === "warten" ? "!" : "i"}</Text>
      </View>
      <Text numberOfLines={1} style={{ fontFamily: "BarlowCondensed_700Bold", fontSize: 15, color: NEU.tinte }}>
        {text}
      </Text>
    </Animated.View>
  );
}

function RechtsVorLinksNeu({ breite, aktiv }: { breite: number; aktiv: boolean }) {
  const k = breite / SB;
  const g = 58 * k;
  const v = useSchleife(aktiv, 6800, 900, LINEAR);
  // Ablauf: 0–0.18 heranfahren · 0.18–0.34 erklären · 0.34–0.56 rechts fährt · 0.6–0.92 du fährst
  const ring = v.interpolate({ inputRange: [0.16, 0.22, 0.28, 0.34, 0.4, 0.5], outputRange: [0, 1, 0.55, 1, 0.55, 0] , extrapolate: "clamp" });
  const ringGross = v.interpolate({ inputRange: [0.16, 0.5], outputRange: [0.8, 1.3], extrapolate: "clamp" });
  const andereX = lage(v, [0, 0.16, 0.34, 0.58], [330, 222, 222, -50], k, g);
  const duY = lage(v, [0, 0.16, 0.6, 0.92], [250, 186, 186, -50], k, g);
  const spur = v.interpolate({ inputRange: [0.34, 0.4, 0.52, 0.58], outputRange: [0, 0.8, 0.8, 0], extrapolate: "clamp" });
  const spurDu = v.interpolate({ inputRange: [0.62, 0.68, 0.86, 0.92], outputRange: [0, 0.8, 0.8, 0], extrapolate: "clamp" });
  const ein = (von: number, bis: number) => v.interpolate({ inputRange: [von, von + 0.04, bis - 0.04, bis], outputRange: [0, 1, 1, 0], extrapolate: "clamp" });
  return (
    <View style={{ flex: 1, backgroundColor: NEU.grund }}>
      <Szene breite={breite}>
        <Rect x={0} y={0} width={SB} height={SH} fill={NEU.grund} />
        {/* Gehwege als weiche Inseln */}
        <Rect x={0} y={0} width={110} height={76} rx={18} fill={NEU.gehweg} />
        <Rect x={190} y={0} width={110} height={76} rx={18} fill={NEU.gehweg} />
        <Rect x={0} y={154} width={110} height={66} rx={18} fill={NEU.gehweg} />
        <Rect x={190} y={154} width={110} height={66} rx={18} fill={NEU.gehweg} />
        {/* Straßen */}
        <Rect x={117} y={0} width={66} height={SH} fill={NEU.strasse} />
        <Rect x={0} y={82} width={SB} height={66} fill={NEU.strasse} />
        <G stroke={NEU.linie} strokeWidth={2.5} strokeDasharray="10 9" strokeLinecap="round">
          <Line x1={150} y1={0} x2={150} y2={74} />
          <Line x1={150} y1={156} x2={150} y2={220} />
          <Line x1={0} y1={115} x2={109} y2={115} />
          <Line x1={191} y1={115} x2={300} y2={115} />
        </G>
        {/* Deko: Bäume auf den Gehwegen */}
        {[
          [86, 52],
          [262, 34],
          [240, 190],
          [40, 192],
        ].map(([x, y], i) => (
          <G key={i}>
            <Circle cx={x} cy={y + 3} r={11} fill="#2E2650" opacity={0.08} />
            <Circle cx={x} cy={y} r={11} fill={i % 2 ? "#9FD8A8" : "#7CCB8D"} />
            <Circle cx={x - 3} cy={y - 3} r={4} fill="#FFFFFF" opacity={0.35} />
          </G>
        ))}
        {/* Geplante Wege als gepunktete Linien */}
        <Path d="M222,99 L60,99" stroke={NEU.andere} strokeWidth={3} strokeDasharray="1 7" strokeLinecap="round" opacity={0.6} />
        <Path d="M167,170 L167,40" stroke={NEU.du} strokeWidth={3} strokeDasharray="1 7" strokeLinecap="round" opacity={0.6} />
      </Szene>

      {/* Leuchtring um das Auto mit Vorfahrt */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 222 * k - 34 * k,
          top: 99 * k - 34 * k,
          width: 68 * k,
          height: 68 * k,
          borderRadius: 34 * k,
          borderWidth: 3,
          borderColor: NEU.andere,
          backgroundColor: "rgba(255,122,89,0.12)",
          opacity: ring,
          transform: [{ scale: ringGross }],
        }}
      />

      {/* Leuchtende Spur hinter den Autos */}
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, top: 96 * k, width: 60 * k, height: 6 * k, borderRadius: 3 * k, backgroundColor: NEU.andere, opacity: spur, transform: [{ translateX: Animated.add(andereX, new Animated.Value(g / 2)) }] }} />
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: 164 * k, top: 0, width: 6 * k, height: 60 * k, borderRadius: 3 * k, backgroundColor: NEU.du, opacity: spurDu, transform: [{ translateY: Animated.add(duY, new Animated.Value(g / 2)) }] }} />

      {/* Autos */}
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, top: 99 * k - g / 2, width: g, height: g, transform: [{ translateX: andereX }, { rotate: "-90deg" }] }}>
        <AutoNeu farbe={NEU.andere} dunkel={NEU.andereDunkel} groesse={g} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: 167 * k - g / 2, top: 0, width: g, height: g, transform: [{ translateY: duY }] }}>
        <AutoNeu farbe={NEU.du} dunkel={NEU.duDunkel} groesse={g} />
      </Animated.View>

      {/* Erklärung Schritt für Schritt */}
      <Pille k={k} x={8} y={8} text="Von rechts = Vorfahrt" sichtbar={ein(0.18, 0.56)} />
      <Pille k={k} x={190} y={176} text="Du wartest" art="warten" sichtbar={ein(0.2, 0.58)} />
      <Pille k={k} x={190} y={176} text="Jetzt du!" art="ok" sichtbar={ein(0.6, 0.95)} />
    </View>
  );
}

const BILDER: Record<ClipBildKey, (p: { breite: number; aktiv: boolean }) => React.JSX.Element> = {
  leuchten: Leuchten,
  rechts_vor_links: RechtsVorLinksNeu,
  anhalteweg: Anhalteweg,
  rettungsgasse: Rettungsgasse,
  kreisverkehr: Kreisverkehr,
  abstand: Abstand,
  schulbus: Schulbus,
  radfahrer: Radabstand,
  abknickend: Abknickend,
  stopp: Stopp,
  gruenpfeil: Gruenpfeil,
  linksabbiegen: Linksabbiegen,
  strassenbahn: Strassenbahn,
  tempolimits: Tempolimits,
  naesse: Naesse,
  reissverschluss: Reissverschluss,
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
