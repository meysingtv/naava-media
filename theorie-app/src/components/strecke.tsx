import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";

import { T } from "@/components/ui";
import type { Thema } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import type { Statistik } from "@/lib/stand";
import { abstand, farben } from "@/lib/theme";

const KNOTEN = 32;
const SCHIENE = 44;
const FERTIG_AB = 0.8;

function Knoten({ nummer, anteil, aktuell }: { nummer: number; anteil: number; aktuell: boolean }) {
  const puls = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!aktuell) return;
    const schleife = Animated.loop(
      Animated.sequence([
        Animated.timing(puls, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(puls, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    schleife.start();
    return () => schleife.stop();
  }, [aktuell, puls]);

  if (anteil >= FERTIG_AB) {
    return (
      <View style={{ width: KNOTEN, height: KNOTEN, borderRadius: KNOTEN / 2, backgroundColor: farben.orange, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="checkmark" size={18} color={farben.aufOrange} />
      </View>
    );
  }

  const r = KNOTEN / 2 - 2;
  const umfang = 2 * Math.PI * r;
  return (
    <View style={{ width: KNOTEN, height: KNOTEN, alignItems: "center", justifyContent: "center" }}>
      {aktuell ? (
        <Animated.View
          style={{
            position: "absolute",
            width: KNOTEN,
            height: KNOTEN,
            borderRadius: KNOTEN / 2,
            borderWidth: 2,
            borderColor: farben.orange,
            opacity: puls.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
            transform: [{ scale: puls.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
          }}
        />
      ) : null}
      <Svg width={KNOTEN} height={KNOTEN} style={{ position: "absolute" }}>
        <Circle cx={KNOTEN / 2} cy={KNOTEN / 2} r={r} fill={farben.grund} stroke={aktuell ? farben.orangeLinie : farben.linieStark} strokeWidth={2.5} />
        {anteil > 0 ? (
          <Circle
            cx={KNOTEN / 2}
            cy={KNOTEN / 2}
            r={r}
            fill="none"
            stroke={farben.orange}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={`${umfang * anteil} ${umfang}`}
            transform={`rotate(-90 ${KNOTEN / 2} ${KNOTEN / 2})`}
          />
        ) : null}
      </Svg>
      <T v="klein" farbe={aktuell ? farben.orange : farben.text3} style={{ fontSize: 12 }}>
        {nummer}
      </T>
    </View>
  );
}

/**
 * Streckenplan: Jedes Thema ist eine Haltestelle auf deiner Linie zur
 * Prüfung. Erledigte Abschnitte sind orange, die nächste Haltestelle pulsiert.
 */
export function Streckenplan({ themen, onWahl }: { themen: { thema: Thema; stat: Statistik }[]; onWahl: (thema: Thema) => void }) {
  const aktuellIndex = themen.findIndex((t) => t.stat.anteil < FERTIG_AB);

  return (
    <View>
      {themen.map(({ thema, stat }, i) => {
        const fertig = stat.anteil >= FERTIG_AB;
        const aktuell = i === aktuellIndex;
        const obenFarbe = i === 0 ? "transparent" : i <= aktuellIndex || aktuellIndex === -1 ? farben.orange : farben.linieStark;
        const untenFarbe = i === themen.length - 1 ? "transparent" : i < aktuellIndex || aktuellIndex === -1 ? farben.orange : farben.linieStark;
        return (
          <Pressable
            key={thema.id}
            onPress={() => {
              tippen();
              onWahl(thema);
            }}
            style={({ pressed }) => ({ flexDirection: "row", opacity: pressed ? 0.75 : 1 })}
          >
            {/* Schiene */}
            <View style={{ width: SCHIENE, alignItems: "center" }}>
              <View style={{ width: 3, height: 22, backgroundColor: obenFarbe }} />
              <Knoten nummer={i + 1} anteil={stat.anteil} aktuell={aktuell} />
              <View style={{ width: 3, flex: 1, backgroundColor: untenFarbe }} />
            </View>

            {/* Haltestelle */}
            <View
              style={{
                flex: 1,
                marginLeft: abstand(2),
                marginVertical: abstand(1.5),
                paddingVertical: abstand(3.5),
                paddingHorizontal: abstand(4),
                borderRadius: 18,
                backgroundColor: aktuell ? farben.flaeche2 : "transparent",
                borderWidth: 1,
                borderColor: aktuell ? farben.orangeLinie : "transparent",
                flexDirection: "row",
                alignItems: "center",
                gap: abstand(3),
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                {aktuell ? (
                  <T v="mini" farbe={farben.orange}>
                    Nächster Halt
                  </T>
                ) : null}
                <T v="h3">{thema.titel}</T>
                <T v="klein" numberOfLines={1}>
                  {stat.gesamt} Fragen · {stat.sicher} sicher{stat.fehler > 0 ? ` · ${stat.fehler} offen` : ""}
                </T>
              </View>
              <T v="klein" farbe={fertig ? farben.orange : farben.text2} style={{ fontVariant: ["tabular-nums"] }}>
                {Math.round(stat.anteil * 100)} %
              </T>
              <Ionicons name="chevron-forward" size={16} color={farben.text4} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
