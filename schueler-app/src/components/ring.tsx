import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "@/lib/theme-context";

/** Fortschrittsring mit Wert in der Mitte. */
export function Ring({
  anteil,
  farbe,
  groesse = 76,
  dicke = 8,
  mitte,
  unter,
}: {
  anteil: number;
  farbe: string;
  groesse?: number;
  dicke?: number;
  mitte: string;
  unter?: string;
}) {
  const { colors } = useTheme();
  const r = (groesse - dicke) / 2;
  const umfang = 2 * Math.PI * r;
  const wert = Math.max(0, Math.min(1, anteil));

  return (
    <View style={{ width: groesse, height: groesse, alignItems: "center", justifyContent: "center" }}>
      <Svg width={groesse} height={groesse} style={{ position: "absolute" }}>
        <Circle cx={groesse / 2} cy={groesse / 2} r={r} stroke={colors.fill} strokeWidth={dicke} fill="none" />
        <Circle
          cx={groesse / 2}
          cy={groesse / 2}
          r={r}
          stroke={farbe}
          strokeWidth={dicke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${umfang} ${umfang}`}
          strokeDashoffset={umfang * (1 - wert)}
          transform={`rotate(-90 ${groesse / 2} ${groesse / 2})`}
        />
      </Svg>
      <Text style={{ fontSize: groesse * 0.22, fontWeight: "800", color: colors.text }}>{mitte}</Text>
      {unter ? <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: -1 }}>{unter}</Text> : null}
    </View>
  );
}
