import { useState, type ReactNode } from "react";
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

import { Glas } from "@/components/glas";
import { useFarbwelt } from "@/lib/darstellung";
import { mitDeckkraft } from "@/lib/theme";

// Glas-Flächen für Karten und Listen: Liquid Glass (iOS 26) bzw. der Nachbau
// aus <Glas>. Dahinter liegt auf den Seiten ein weicher Lichtgrund, damit das
// Glas etwas zum Brechen hat und nicht wie eine graue Fläche wirkt.

/** Karte aus Glas – hell oder dunkel passend zur Seite. */
export function GlasKarte({ children, style, toenung, pointerEvents }: { children?: ReactNode; style?: StyleProp<ViewStyle>; toenung?: string; pointerEvents?: "auto" | "none" | "box-none" | "box-only" }) {
  const f = useFarbwelt();
  return (
    <Glas hell={f.hell} toenung={toenung} pointerEvents={pointerEvents} style={[{ borderRadius: 22, overflow: "hidden" }, style]}>
      {children}
    </Glas>
  );
}

/** Zeilen untereinander in einer Glaskarte, getrennt durch feine Linien. */
export function GlasGruppe({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  const kinder = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <GlasKarte style={style}>
      {kinder.map((kind, i) => (
        <View key={i}>
          {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: f.hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.12)", marginLeft: 14 }} /> : null}
          {kind}
        </View>
      ))}
    </GlasKarte>
  );
}

// Warme Lichtfarben passend zum Orange der App
const LICHT = { orange: "#FC5B0E", gold: "#FFB23F" };

type Fleck = { id: string; cx: number; cy: number; rx: number; ry: number; farbe: string; a: number };

/** Große, weich verlaufende Farbflecken – ohne sichtbaren Ring am Rand. */
function Lichtflecken({ flecken, breite, hoehe }: { flecken: Fleck[]; breite: number; hoehe: number }) {
  return (
    <Svg width={breite} height={hoehe}>
      <Defs>
        {flecken.map((k) => (
          <RadialGradient key={k.id} id={`grund-${k.id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={k.farbe} stopOpacity={k.a} />
            <Stop offset="0.3" stopColor={k.farbe} stopOpacity={k.a * 0.72} />
            <Stop offset="0.6" stopColor={k.farbe} stopOpacity={k.a * 0.3} />
            <Stop offset="0.82" stopColor={k.farbe} stopOpacity={k.a * 0.08} />
            <Stop offset="1" stopColor={k.farbe} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      {flecken.map((k) => (
        <Ellipse key={k.id} cx={k.cx} cy={k.cy} rx={k.rx} ry={k.ry} fill={`url(#grund-${k.id})`} />
      ))}
    </Svg>
  );
}

/**
 * Weicher Lichtgrund hinter einer Seite: große, verlaufende Flecken in Orange
 * und Gold. Liegt fest hinter dem Inhalt – beim Scrollen wandert das Licht
 * durch die Glaskarten.
 *
 * Mit `ab` liegt der Grund stattdessen im ScrollView-Inhalt und scrollt mit:
 * für Seiten mit Titelfoto. Er beginnt dann bei `ab` (Unterkante des Fotos)
 * und blendet von dort weich ein, damit am Foto keine Kante entsteht.
 * `dezent`: weniger und schwächere Flecken.
 */
export function GlasGrund({ ab, dezent }: { ab?: number; dezent?: boolean }) {
  const f = useFarbwelt();
  const { width, height } = useWindowDimensions();
  const [inhaltHoehe, setInhaltHoehe] = useState(0);
  const s = f.hell ? 0.75 : 1;

  if (ab === undefined) {
    const flecken: Fleck[] = [
      { id: "o", cx: width * 0.95, cy: height * 0.12, rx: width * 0.8, ry: height * 0.34, farbe: LICHT.orange, a: 0.3 * s },
      { id: "g", cx: width * 0.05, cy: height * 0.55, rx: width * 0.75, ry: height * 0.32, farbe: LICHT.gold, a: 0.2 * s },
      { id: "u", cx: width * 0.9, cy: height * 0.95, rx: width * 0.8, ry: height * 0.32, farbe: LICHT.orange, a: 0.18 * s },
    ];
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Lichtflecken flecken={flecken} breite={width} hoehe={height} />
      </View>
    );
  }

  // Mitscrollend: abwechselnd rechts Orange, links Gold, alle ~0,6 Bildschirmhöhen (dezent: seltener)
  const abstand = height * (dezent ? 1.1 : 0.6);
  const staerke = dezent ? 0.6 : 1;
  const anzahl = Math.max(1, Math.ceil(inhaltHoehe / abstand));
  const flecken: Fleck[] = Array.from({ length: anzahl }, (_, i) => ({
    id: `m${i}`,
    cx: i % 2 ? width * 0.05 : width * 0.95,
    cy: height * 0.3 + i * abstand,
    rx: width * 0.8,
    ry: height * 0.34,
    farbe: i % 2 ? LICHT.gold : LICHT.orange,
    a: (i % 2 ? 0.2 : 0.26) * s * staerke,
  }));
  return (
    <View pointerEvents="none" onLayout={(e) => setInhaltHoehe(Math.round(e.nativeEvent.layout.height))} style={{ position: "absolute", top: ab, left: 0, right: 0, bottom: 0 }}>
      {inhaltHoehe > 0 ? <Lichtflecken flecken={flecken} breite={width} hoehe={inhaltHoehe} /> : null}
      {/* Oben weich aus dem Grund heraus – keine Kante unter dem Foto */}
      <LinearGradient colors={[f.grund, mitDeckkraft(f.grund, 0)]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: Math.min(260, height * 0.3) }} />
    </View>
  );
}
