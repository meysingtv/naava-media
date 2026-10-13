import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, Rect, Stop } from "react-native-svg";

import { farben, svgSchrift } from "@/lib/theme";

const AnimPath = Animated.createAnimatedComponent(Path);

/**
 * SVG nur als Schmuck (Leuchten, Ränder, Überlagerungen). Auf dem iPhone fängt
 * <Svg> Berührungen ab – auch mit pointerEvents="none" –, dann reagieren Knöpfe
 * und Eingabefelder darunter nicht. Die Hülle lässt alle Berührungen durch.
 */
export function DekoSvg({
  width,
  height,
  viewBox,
  preserveAspectRatio,
  style,
  children,
}: {
  width: number;
  height: number;
  viewBox?: string;
  preserveAspectRatio?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <View pointerEvents="none" style={[{ width, height }, style]}>
      <Svg width={width} height={height} viewBox={viewBox} preserveAspectRatio={preserveAspectRatio}>
        {children}
      </Svg>
    </View>
  );
}

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
        <Text style={{ fontFamily: svgSchrift.schild, fontSize: groesse * 0.82, color: farben.text, letterSpacing: -0.6 }}>
          Fahrschul<Text style={{ color: farben.orange }}> Pro</Text>
        </Text>
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
  verlauf,
  leuchten,
  animiert = true,
  children,
}: {
  anteil: number;
  groesse?: number;
  dicke?: number;
  farbe?: string;
  spur?: string;
  /** Verlauf des Bogens von oben nach unten (statt einer Farbe). */
  verlauf?: readonly [string, string];
  /** Weiches Leuchten nur entlang des farbigen Bogens (nicht um den ganzen Ring). */
  leuchten?: boolean;
  animiert?: boolean;
  children?: React.ReactNode;
}) {
  const r = (groesse - dicke) / 2;
  const umfang = 2 * Math.PI * r;
  // Rand um die Zeichenfläche, damit das Leuchten nicht abgeschnitten wird.
  const rand = leuchten ? Math.round(dicke * 1.2 + 6) : 0;
  const flaeche = groesse + rand * 2;
  const m = flaeche / 2;
  // Kreis als Pfad, der oben beginnt und im Uhrzeigersinn läuft (ohne Drehung,
  // damit der Verlauf wirklich von oben nach unten geht).
  const bogen = `M ${m} ${m - r} A ${r} ${r} 0 1 1 ${m} ${m + r} A ${r} ${r} 0 1 1 ${m} ${m - r}`;
  const wert = useRef(new Animated.Value(animiert ? 0 : anteil)).current;

  useEffect(() => {
    Animated.timing(wert, { toValue: Math.max(0, Math.min(1, anteil)), duration: animiert ? 900 : 0, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [anteil, animiert, wert]);

  const strich = verlauf ? `url(#ring-${groesse})` : farbe;
  const versatz = wert.interpolate({ inputRange: [0, 1], outputRange: [umfang, 0] });
  const sichtbar = anteil > 0.001;

  return (
    <View style={{ width: groesse, height: groesse, alignItems: "center", justifyContent: "center" }}>
      <DekoSvg width={flaeche} height={flaeche} style={{ position: "absolute", top: -rand, left: -rand }}>
        {verlauf ? (
          <Defs>
            <LinearGradient id={`ring-${groesse}`} gradientUnits="userSpaceOnUse" x1={0} y1={rand} x2={0} y2={rand + groesse}>
              <Stop offset="0" stopColor={verlauf[0]} />
              <Stop offset="1" stopColor={verlauf[1]} />
            </LinearGradient>
          </Defs>
        ) : null}
        <Circle cx={m} cy={m} r={r} stroke={spur} strokeWidth={dicke} fill="none" />
        {/* Leuchten: breitere, sehr transparente Kopien genau hinter dem Bogen */}
        {sichtbar && leuchten
          ? [0.1, 0.07, 0.045, 0.025, 0.012].map((deckkraft, i) => (
              <AnimPath
                key={i}
                d={bogen}
                stroke={strich}
                strokeOpacity={deckkraft}
                strokeWidth={dicke + ((i + 1) * rand * 2) / 5}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${umfang} ${umfang}`}
                strokeDashoffset={versatz}
              />
            ))
          : null}
        {sichtbar ? (
          <AnimPath
            d={bogen}
            stroke={strich}
            strokeWidth={dicke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${umfang} ${umfang}`}
            strokeDashoffset={versatz}
          />
        ) : null}
      </DekoSvg>
      {children}
    </View>
  );
}
