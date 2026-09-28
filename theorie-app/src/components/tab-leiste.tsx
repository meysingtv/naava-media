import { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { tippen } from "@/lib/haptik";
import { farben, schrift } from "@/lib/theme";

// Auf dem iPhone ist die Tab-Leiste die native iOS-Leiste mit Liquid Glass
// (siehe app/(tabs)/_layout.tsx). Auf Android baut diese Leiste den Look
// nach: eine schwebende Glaskapsel mit echter Unschärfe dahinter, Glanzkante
// und einer Glasblase, die zum aktiven Reiter gleitet.

/** Höhe der Glaskapsel. */
const KAPSEL = 62;
/** Abstand der Kapsel über der Android-Navigation bzw. dem unteren Rand. */
const UNTEN = 8;
/** Abstand der Kapsel zum Bildschirmrand. */
const SEITE = 14;
/** Innenabstand – so hat die Blase rundum etwas Luft. */
const INNEN = 5;

/** Höhe, die die Leiste unten belegt (inkl. Home-Indikator bzw. Android-Navigation). */
export function useLeistenHoehe(): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === "ios" ? insets.bottom + 58 : insets.bottom + UNTEN + KAPSEL;
}

/** Platz unter dem Inhalt einer Tab-Seite, damit nichts unter der Leiste endet. */
export function useInhaltUnten(): number {
  return useLeistenHoehe() + 18;
}

const SYMBOLE: Record<string, { an: IconName; aus: IconName }> = {
  heute: { an: "home", aus: "home-outline" },
  lernen: { an: "book", aus: "book-outline" },
  clips: { an: "film", aus: "film-outline" },
  pruefen: { an: "shield-checkmark", aus: "shield-checkmark-outline" },
  profil: { an: "person-circle", aus: "person-circle-outline" },
};

/** Tab-Leiste für Android im Liquid-Glass-Look. */
export function TabLeiste({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [breite, setBreite] = useState(0);
  const anzahl = state.routes.length;
  // Breite eines Reiters: Kapsel ohne Rand (2 × 1 px) und ohne Innenabstand.
  const feld = breite > 0 ? (breite - 2 - 2 * INNEN) / anzahl : 0;

  // Die Blase gleitet mit einer Feder zum neuen Reiter und dehnt sich dabei
  // kurz in die Breite – wie ein Tropfen.
  const position = useRef(new Animated.Value(state.index)).current;
  const dehnung = useRef(new Animated.Value(1)).current;
  const erstesMal = useRef(true);
  useEffect(() => {
    if (erstesMal.current) {
      erstesMal.current = false;
      return;
    }
    Animated.parallel([
      Animated.spring(position, { toValue: state.index, useNativeDriver: true, damping: 17, stiffness: 180, mass: 0.9 }),
      Animated.sequence([
        Animated.timing(dehnung, { toValue: 1.16, duration: 120, useNativeDriver: true }),
        Animated.spring(dehnung, { toValue: 1, useNativeDriver: true, damping: 11, stiffness: 170 }),
      ]),
    ]).start();
  }, [state.index, position, dehnung]);

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: SEITE, paddingBottom: insets.bottom + UNTEN }}>
      {/* Inhalt läuft unten weich aus – wie der Rand-Effekt unter der iOS-Leiste */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(3,5,7,0)", "rgba(3,5,7,0.7)", "rgba(3,5,7,0.92)"]}
        locations={[0, 0.55, 1]}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: insets.bottom + UNTEN + KAPSEL + 28 }}
      />
      {/* Außen: nur der weiche Schatten unter der Kapsel */}
      <View style={{ height: KAPSEL, borderRadius: KAPSEL / 2, boxShadow: "0px 10px 30px rgba(0,0,0,0.55)" }}>
        {/* Innen: das Glas, auf die Kapselform zugeschnitten */}
        <View
          onLayout={(e) => setBreite(e.nativeEvent.layout.width)}
          style={{ flex: 1, borderRadius: KAPSEL / 2, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" }}
        >
          <BlurView tint="dark" intensity={60} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(14,16,20,0.34)" }]} />
          {/* Glanz oben wie bei echtem Glas */}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(255,255,255,0.17)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0)"]}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFill}
          />

          {feld > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: INNEN,
                bottom: INNEN,
                left: INNEN,
                width: feld,
                borderRadius: KAPSEL / 2,
                overflow: "hidden",
                backgroundColor: "rgba(255,255,255,0.11)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.16)",
                transform: [
                  { translateX: position.interpolate({ inputRange: [0, Math.max(1, anzahl - 1)], outputRange: [0, feld * Math.max(1, anzahl - 1)] }) },
                  { scaleX: dehnung },
                ],
              }}
            >
              <LinearGradient colors={["rgba(255,255,255,0.16)", "rgba(255,255,255,0)"]} locations={[0, 0.6]} style={StyleSheet.absoluteFill} />
            </Animated.View>
          ) : null}

          <View style={{ flex: 1, flexDirection: "row", paddingHorizontal: INNEN }}>
            {state.routes.map((route, i) => {
              const aktiv = state.index === i;
              const titel = descriptors[route.key]?.options.title ?? route.name;
              const symbol = SYMBOLE[route.name] ?? { an: "ellipse", aus: "ellipse-outline" };
              const farbe = aktiv ? farben.orange : "rgba(255,255,255,0.74)";
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: aktiv }}
                  accessibilityLabel={titel}
                  onPress={() => {
                    const ereignis = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                    if (!aktiv && !ereignis.defaultPrevented) {
                      tippen();
                      navigation.navigate(route.name, route.params);
                    }
                  }}
                  onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
                  style={({ pressed }) => ({ flex: 1, alignItems: "center", justifyContent: "center", gap: 2, transform: [{ scale: pressed ? 0.9 : 1 }] })}
                >
                  <Icon name={aktiv ? symbol.an : symbol.aus} size={22} color={farbe} />
                  <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 10.5, lineHeight: 13, color: farbe }}>
                    {titel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}
