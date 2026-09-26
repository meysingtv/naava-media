import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";

import { farben, schrift } from "@/lib/theme";

const AnimPath = Animated.createAnimatedComponent(Path);
const AnimCircle = Animated.createAnimatedComponent(Circle);

// ---------------------------------------------------------------------------
// Logo: Straße in Perspektive + Wortmarke
// ---------------------------------------------------------------------------

export function Logo({ groesse = 28, mitText = true }: { groesse?: number; mitText?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: groesse * 0.32 }}>
      <Svg width={groesse} height={groesse} viewBox="0 0 100 100">
        <Rect x={0} y={0} width={100} height={100} rx={24} fill={farben.flaeche2} />
        <Polygon points="24,86 32,86 49,18 46,18" fill={farben.text} />
        <Polygon points="76,86 68,86 51,18 54,18" fill={farben.text} />
        <Polygon points="48,86 52,86 51.6,70 48.4,70" fill={farben.orange} />
        <Polygon points="48.6,60 51.4,60 51.1,49 48.9,49" fill={farben.orange} />
        <Polygon points="49.1,41 50.9,41 50.7,33 49.3,33" fill={farben.orange} />
      </Svg>
      {mitText ? (
        <Text style={{ fontFamily: schrift.titel, fontSize: groesse * 0.82, color: farben.text, letterSpacing: -0.6 }}>spur</Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Ring (Fortschritt)
// ---------------------------------------------------------------------------

export function Ring({
  anteil,
  groesse = 64,
  dicke = 6,
  farbe = farben.orange,
  spur = farben.flaeche3,
  animiert = true,
  children,
}: {
  anteil: number;
  groesse?: number;
  dicke?: number;
  farbe?: string;
  spur?: string;
  animiert?: boolean;
  children?: React.ReactNode;
}) {
  const r = (groesse - dicke) / 2;
  const umfang = 2 * Math.PI * r;
  const wert = useRef(new Animated.Value(animiert ? 0 : anteil)).current;

  useEffect(() => {
    Animated.timing(wert, { toValue: Math.max(0, Math.min(1, anteil)), duration: animiert ? 900 : 0, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [anteil, animiert, wert]);

  return (
    <View style={{ width: groesse, height: groesse, alignItems: "center", justifyContent: "center" }}>
      <Svg width={groesse} height={groesse} style={{ position: "absolute" }}>
        <Circle cx={groesse / 2} cy={groesse / 2} r={r} stroke={spur} strokeWidth={dicke} fill="none" />
        <AnimCircle
          cx={groesse / 2}
          cy={groesse / 2}
          r={r}
          stroke={farbe}
          strokeWidth={dicke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${umfang} ${umfang}`}
          strokeDashoffset={wert.interpolate({ inputRange: [0, 1], outputRange: [umfang, 0] })}
          transform={`rotate(-90 ${groesse / 2} ${groesse / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tacho fürs Tagesziel
// ---------------------------------------------------------------------------

const TACHO_B = 280;
const TACHO_H = 196;
const CX = 140;
const CY = 124;
const R = 112;
const START = 150; // Grad, im Uhrzeigersinn, 0 = rechts
const BOGEN = 240;

function punkt(grad: number, radius: number) {
  const w = (grad * Math.PI) / 180;
  return { x: CX + radius * Math.cos(w), y: CY + radius * Math.sin(w) };
}

export function Tacho({ wert, ziel }: { wert: number; ziel: number }) {
  const anteil = Math.max(0, Math.min(1, ziel > 0 ? wert / ziel : 0));
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(a, { toValue: anteil, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [anteil, a]);

  const laenge = (R * BOGEN * Math.PI) / 180;
  const von = punkt(START, R);
  const bis = punkt(START + BOGEN, R);
  const bogen = `M${von.x},${von.y} A${R},${R} 0 1 1 ${bis.x},${bis.y}`;
  const erreicht = anteil >= 1;

  return (
    <View style={{ width: TACHO_B, height: TACHO_H }}>
      <Svg width={TACHO_B} height={TACHO_H}>
        {/* Skala */}
        {Array.from({ length: 25 }, (_, i) => {
          const grad = START + (BOGEN / 24) * i;
          const gross = i % 4 === 0;
          const p1 = punkt(grad, R - 17);
          const p2 = punkt(grad, R - (gross ? 27 : 22));
          return <Line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={gross ? farben.text3 : farben.text4} strokeWidth={gross ? 2 : 1.2} strokeLinecap="round" />;
        })}
        <Path d={bogen} stroke={farben.flaeche3} strokeWidth={12} fill="none" strokeLinecap="round" />
        <AnimPath
          d={bogen}
          stroke={erreicht ? farben.gruen : farben.orange}
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${laenge} ${laenge}`}
          strokeDashoffset={a.interpolate({ inputRange: [0, 1], outputRange: [laenge, 0] })}
        />
      </Svg>

      {/* Nadel – dreht um die Mitte */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: CX - R,
          top: CY - R,
          width: R * 2,
          height: R * 2,
          transform: [{ rotate: a.interpolate({ inputRange: [0, 1], outputRange: [`${START}deg`, `${START + BOGEN}deg`] }) }],
        }}
      >
        <Svg width={R * 2} height={R * 2}>
          <Line x1={R} y1={R} x2={R * 2 - 34} y2={R} stroke={farben.text} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={R} cy={R} r={8} fill={farben.text} />
          <Circle cx={R} cy={R} r={3.5} fill={farben.grund} />
        </Svg>
      </Animated.View>

      {/* Anzeige unter der Nadel */}
      <View style={{ position: "absolute", left: 0, right: 0, top: CY + 16, alignItems: "center" }}>
        <Text style={{ fontFamily: schrift.titel, fontSize: 40, lineHeight: 44, color: farben.text, letterSpacing: -1, fontVariant: ["tabular-nums"] }}>
          {wert}
        </Text>
        <Text style={{ fontFamily: schrift.textHalb, fontSize: 12, color: farben.text3, letterSpacing: 0.4 }}>von {ziel} Fragen</Text>
      </View>
      <Text style={{ position: "absolute", left: von.x - 22, top: von.y - 2, fontFamily: schrift.textHalb, fontSize: 11, color: farben.text4 }}>0</Text>
      <Text style={{ position: "absolute", left: bis.x + 12, top: bis.y - 2, fontFamily: schrift.textHalb, fontSize: 11, color: farben.text4 }}>{ziel}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tankanzeige (Prüfungsreife) – zehn Segmente
// ---------------------------------------------------------------------------

export function Segmente({ anteil, anzahl = 10, farbe = farben.orange }: { anteil: number; anzahl?: number; farbe?: string }) {
  const voll = Math.round(Math.max(0, Math.min(1, anteil)) * anzahl);
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {Array.from({ length: anzahl }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 10, borderRadius: 3, backgroundColor: i < voll ? farbe : farben.flaeche3, opacity: i < voll ? 0.55 + (0.45 * (i + 1)) / anzahl : 1 }} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Titelbild der Willkommensseite: Streckenplan mit Haltestellen
// ---------------------------------------------------------------------------

export function StreckenBild({ breite }: { breite: number }) {
  const hoehe = breite * 1.02;
  const strecke = "M-20,380 C80,360 60,280 150,262 C250,242 300,300 330,220 C356,150 250,150 210,110 C176,76 230,30 300,20 C340,14 380,30 420,10";
  const halte = [
    { x: 150, y: 262, titel: "Vorfahrt", lx: -22, ly: 34, anker: "middle" as const },
    { x: 316, y: 246, titel: "Zeichen", lx: -22, ly: 5, anker: "end" as const },
    { x: 224, y: 124, titel: "Tempo", lx: 22, ly: 5, anker: "start" as const },
    { x: 300, y: 20, titel: "Prüfung", lx: -24, ly: 5, anker: "end" as const, ziel: true },
  ];
  return (
    <Svg width={breite} height={hoehe} viewBox="0 0 400 408" preserveAspectRatio="xMidYMid slice">
      {/* Kartenraster */}
      {Array.from({ length: 11 }, (_, i) =>
        Array.from({ length: 11 }, (_, j) => <Circle key={`${i}-${j}`} cx={20 + i * 38} cy={20 + j * 38} r={1.1} fill={farben.text4} opacity={0.5} />),
      )}
      {/* Nebenstraßen */}
      <G stroke={farben.flaeche2} strokeWidth={10} fill="none" strokeLinecap="round">
        <Path d="M40,120 C120,140 150,200 150,262" />
        <Path d="M330,220 C360,280 380,330 420,350" />
        <Path d="M-10,200 C60,190 120,120 210,110" />
      </G>
      {/* Hauptstrecke */}
      <Path d={strecke} stroke={farben.flaeche3} strokeWidth={30} fill="none" strokeLinecap="round" />
      <Path d={strecke} stroke={farben.grund} strokeWidth={22} fill="none" strokeLinecap="round" opacity={0.35} />
      <Path d={strecke} stroke={farben.orange} strokeWidth={3} fill="none" strokeDasharray="12 10" strokeLinecap="round" />
      {halte.map((h) => (
        <G key={h.titel}>
          <Circle cx={h.x} cy={h.y} r={h.ziel ? 15 : 12} fill={h.ziel ? farben.orange : farben.grund} stroke={farben.orange} strokeWidth={3} />
          {h.ziel ? (
            <G transform={`translate(${h.x - 6} ${h.y - 7})`}>
              <Rect x={0} y={0} width={2.2} height={15} fill={farben.grund} />
              <Rect x={2} y={0} width={10} height={7} fill={farben.grund} />
            </G>
          ) : (
            <Circle cx={h.x} cy={h.y} r={4} fill={farben.orange} />
          )}
          <SvgText
            x={h.x + h.lx}
            y={h.y + h.ly}
            fill={h.ziel ? farben.text : farben.text2}
            fontSize={14}
            fontFamily={schrift.textHalb}
            fontWeight="600"
            textAnchor={h.anker}
          >
            {h.titel}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}
