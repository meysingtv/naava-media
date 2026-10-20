import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { useTabZaehler } from "@/lib/tab-zaehler";
import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";

export const TAB_LEISTE_HOEHE = 64;
const INNEN = 6;

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, [IconName, IconName]> = {
  start: ["home", "home-outline"],
  termine: ["calendar", "calendar-outline"],
  fortschritt: ["trophy", "trophy-outline"],
  rechnungen: ["wallet", "wallet-outline"],
};

/** Abstand der schwebenden Leiste zum unteren Bildschirmrand. */
function abstandUnten(insetUnten: number) {
  return Math.max(insetUnten - 10, space(3));
}

/** So viel Platz brauchen Inhalte unten, damit nichts unter der Leiste verschwindet. */
export function useTabPlatz() {
  const insets = useSafeAreaInsets();
  return TAB_LEISTE_HOEHE + abstandUnten(insets.bottom) + space(6);
}

/**
 * Schwebende Tab-Leiste: helle Kapsel mit weichem Schatten. Die aktive Seite
 * sitzt auf einer farbigen Pille, die beim Wechsel hinübergleitet.
 */
export function TabLeiste({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, schema } = useTheme();
  const insets = useSafeAreaInsets();
  const zaehler = useTabZaehler();
  const [breite, setBreite] = useState(0);
  const position = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(position, { toValue: state.index, useNativeDriver: true, damping: 20, stiffness: 220, mass: 0.8 }).start();
  }, [state.index, position]);

  const feld = breite > 0 ? (breite - INNEN * 2) / state.routes.length : 0;
  const unten = abstandUnten(insets.bottom);
  const dunkel = schema === "dark";

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
      {/* Inhalte laufen unter der Leiste weich aus. */}
      <LinearGradient
        pointerEvents="none"
        colors={[colors.bg + "00", colors.bg + "F0"]}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: TAB_LEISTE_HOEHE + unten + space(6) }}
      />

      <View
        onLayout={(e) => setBreite(e.nativeEvent.layout.width)}
        style={{
          marginHorizontal: space(4),
          marginBottom: unten,
          height: TAB_LEISTE_HOEHE,
          borderRadius: TAB_LEISTE_HOEHE / 2,
          paddingHorizontal: INNEN,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.card,
          borderWidth: dunkel ? 1 : 0,
          borderColor: colors.separator,
          shadowColor: colors.schatten,
          shadowOpacity: dunkel ? 0.5 : 0.14,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        }}
      >
        {feld > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: INNEN,
              top: INNEN,
              bottom: INNEN,
              width: feld,
              borderRadius: (TAB_LEISTE_HOEHE - INNEN * 2) / 2,
              backgroundColor: colors.accentSoft,
              transform: [{ translateX: Animated.multiply(position, feld) }],
            }}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const aktiv = state.index === index;
          const label = typeof options.title === "string" ? options.title : route.name;
          const [an, aus] = ICONS[route.name] ?? ["ellipse", "ellipse-outline"];
          const farbe = aktiv ? colors.accent : colors.textMuted;
          const badge = zaehler[route.name] ?? 0;

          function druecken() {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!aktiv && !event.defaultPrevented) {
              Haptics.selectionAsync().catch(() => {});
              navigation.navigate(route.name, route.params);
            }
          }

          return (
            <Pressable
              key={route.key}
              onPress={druecken}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: aktiv }}
              accessibilityLabel={badge > 0 ? `${label}, ${badge} offen` : label}
              style={({ pressed }) => ({
                flex: 1,
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              })}
            >
              <View>
                <Ionicons name={aktiv ? an : aus} size={23} color={farbe} />
                {badge > 0 ? (
                  <View
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -11,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      paddingHorizontal: 4,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.danger,
                      borderWidth: 2,
                      borderColor: colors.card,
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "800" }}>{badge > 9 ? "9+" : badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontSize: 11, fontWeight: aktiv ? "800" : "600", color: farbe }} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
