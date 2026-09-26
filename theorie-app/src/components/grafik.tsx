import { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Circle, Polygon, Rect } from "react-native-svg";

import { farben, svgSchrift } from "@/lib/theme";

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
        <Text style={{ fontFamily: svgSchrift.schild, fontSize: groesse * 0.82, color: farben.text, letterSpacing: -0.6 }}>spur</Text>
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
