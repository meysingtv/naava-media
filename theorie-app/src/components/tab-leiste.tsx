import { useCallback, useEffect, useMemo, useRef } from "react";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { tippen } from "@/lib/haptik";
import { leisteAufklappen, leisteKlein } from "@/lib/leisten-scroll";
import { farben, schrift } from "@/lib/theme";

// Auf dem iPhone ist die Tab-Leiste die native iOS-Leiste mit Liquid Glass
// (siehe app/(tabs)/_layout.tsx). Auf Android baut diese Leiste Look und
// Verhalten nach:
//  • schwebende Glaskapsel mit echter Unschärfe, Lichtkante und Glanz
//  • Glasblase hinter dem aktiven Reiter, die beim Wechsel als Tropfen gleitet
//  • Finger drauf → die Blase wird zur Lupe, wächst über die Leiste hinaus
//    und folgt dem Finger; bei jedem Reiter ein kurzes Ticken
//  • beim Runterscrollen klappt die Leiste zur kleinen Kapsel zusammen

/** Höhe der Glaskapsel. */
const KAPSEL = 62;
/** Eingeklappt: kleine Kapsel mit dem aktiven Symbol. */
const KLEIN_HOEHE = 52;
const KLEIN_BREITE = 60;
/** Abstand der Kapsel über der Android-Navigation bzw. dem unteren Rand. */
const UNTEN = 8;
/** Abstand der Kapsel zum Bildschirmrand. */
const SEITE = 16;
/** Innenabstand – so hat die Blase rundum etwas Luft. */
const INNEN = 5;

const FEDER_BLASE = { damping: 18, stiffness: 190, mass: 0.9 };
const FEDER_LUPE = { damping: 13, stiffness: 240, mass: 0.7 };

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

function symbolVon(name: string): { an: IconName; aus: IconName } {
  return SYMBOLE[name] ?? { an: "ellipse", aus: "ellipse-outline" };
}

/** Ein Reiter: Symbol und Beschriftung; unter der Lupe etwas größer. */
function Reiter({
  index,
  titel,
  name,
  aktiv,
  breite,
  unterFinger,
  lupe,
  onWahl,
}: {
  index: number;
  titel: string;
  name: string;
  aktiv: boolean;
  breite: number;
  unterFinger: SharedValue<number>;
  lupe: SharedValue<number>;
  onWahl: () => void;
}) {
  const symbol = symbolVon(name);
  const farbe = aktiv ? farben.orange : "rgba(255,255,255,0.78)";
  const stil = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.14 * lupe.value * (unterFinger.value === index ? 1 : 0) }],
  }));
  return (
    <Animated.View
      accessible
      accessibilityRole="tab"
      accessibilityState={{ selected: aktiv }}
      accessibilityLabel={titel}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={onWahl}
      style={[{ width: breite, alignItems: "center", justifyContent: "center", gap: 2 }, stil]}
    >
      <Icon name={aktiv ? symbol.an : symbol.aus} size={22} color={farbe} />
      <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 10.5, lineHeight: 13, color: farbe }}>
        {titel}
      </Text>
    </Animated.View>
  );
}

/** Tab-Leiste für Android im Liquid-Glass-Look. */
export function TabLeiste({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const anzahl = state.routes.length;
  const breite = width - 2 * SEITE;
  const feld = (breite - 2 * INNEN) / anzahl;

  const feldW = useSharedValue(feld);
  const aktivIndex = useSharedValue(state.index);
  const blaseX = useSharedValue(state.index * feld);
  const dehnung = useSharedValue(1);
  const lupe = useSharedValue(0);
  const unterFinger = useSharedValue(state.index);
  /** Nach einem Wisch sitzt die Blase schon – dann ohne zweiten Tropfen. */
  const nachWisch = useRef(false);

  useEffect(() => {
    feldW.value = feld;
  }, [feld, feldW]);

  // Neuer Reiter: Blase gleitet als Tropfen hin, Leiste klappt auf.
  const erstesMal = useRef(true);
  useEffect(() => {
    aktivIndex.value = state.index;
    unterFinger.value = state.index;
    leisteAufklappen();
    if (erstesMal.current) {
      erstesMal.current = false;
      blaseX.value = state.index * feldW.value;
      return;
    }
    blaseX.value = withSpring(state.index * feldW.value, FEDER_BLASE);
    if (nachWisch.current) {
      nachWisch.current = false;
      return;
    }
    dehnung.value = withSequence(withTiming(1.16, { duration: 120 }), withSpring(1, { damping: 11, stiffness: 170 }));
  }, [state.index, aktivIndex, unterFinger, blaseX, dehnung, feldW]);

  const waehlen = useCallback(
    (i: number, gewischt: boolean) => {
      const route = state.routes[i];
      if (!route) return;
      const ereignis = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (i !== state.index && !ereignis.defaultPrevented) {
        nachWisch.current = gewischt;
        tippen();
        navigation.navigate(route.name, route.params);
      } else {
        blaseX.value = withSpring(state.index * feldW.value, FEDER_BLASE);
      }
    },
    [state.routes, state.index, navigation, blaseX, feldW],
  );

  const ticken = useCallback(() => tippen(), []);

  // Eine Geste für alles: antippen = Lupe springt hin und wählt beim Loslassen,
  // wischen = Lupe folgt dem Finger. Eingeklappt: antippen klappt auf.
  const geste = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((e) => {
          if (leisteKlein.value > 0.5) return;
          const f = feldW.value;
          const i = Math.min(anzahl - 1, Math.max(0, Math.floor((e.x - INNEN) / f)));
          unterFinger.value = i;
          blaseX.value = withSpring(i * f, FEDER_LUPE);
          lupe.value = withSpring(1, FEDER_LUPE);
        })
        .onUpdate((e) => {
          if (leisteKlein.value > 0.5) return;
          const f = feldW.value;
          const x = Math.min(Math.max(e.x - INNEN - f / 2, 0), f * (anzahl - 1));
          blaseX.value = x;
          const i = Math.round(x / f);
          if (i !== unterFinger.value) {
            unterFinger.value = i;
            runOnJS(ticken)();
          }
        })
        .onEnd((e) => {
          if (leisteKlein.value > 0.5) {
            runOnJS(leisteAufklappen)();
            return;
          }
          const f = feldW.value;
          const x = Math.min(Math.max(e.x - INNEN - f / 2, 0), f * (anzahl - 1));
          const i = Math.round(x / f);
          blaseX.value = withSpring(i * f, FEDER_BLASE);
          runOnJS(waehlen)(i, Math.abs(e.translationX) > 8);
        })
        .onFinalize((_e, ok) => {
          lupe.value = withSpring(0, FEDER_LUPE);
          if (!ok && leisteKlein.value <= 0.5) blaseX.value = withSpring(aktivIndex.value * feldW.value, FEDER_BLASE);
        }),
    [anzahl, feldW, unterFinger, blaseX, lupe, aktivIndex, ticken, waehlen],
  );

  // Kapsel: offen ↔ eingeklappt
  const kapselStil = useAnimatedStyle(() => ({
    width: interpolate(leisteKlein.value, [0, 1], [breite, KLEIN_BREITE]),
    height: interpolate(leisteKlein.value, [0, 1], [KAPSEL, KLEIN_HOEHE]),
  }));
  const reiterStil = useAnimatedStyle(() => ({
    opacity: interpolate(leisteKlein.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
  }));
  const miniStil = useAnimatedStyle(() => ({
    opacity: interpolate(leisteKlein.value, [0.55, 1], [0, 1], Extrapolation.CLAMP),
  }));

  // Blase bzw. Lupe
  const blaseStil = useAnimatedStyle(() => ({
    opacity: interpolate(leisteKlein.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateX: blaseX.value }, { scaleX: dehnung.value * (1 + 0.16 * lupe.value) }, { scaleY: 1 + 0.4 * lupe.value }],
  }));
  const blaseFuellung = useAnimatedStyle(() => ({ opacity: 1 - 0.5 * lupe.value }));
  const lupenKante = useAnimatedStyle(() => ({ opacity: lupe.value }));

  const mini = symbolVon(state.routes[state.index]?.name ?? "");

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: insets.bottom + UNTEN + KAPSEL + 34 }}>
      {/* Inhalt läuft unten weich aus – wie der Rand-Effekt unter der iOS-Leiste */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(3,5,7,0)", "rgba(3,5,7,0.7)", "rgba(3,5,7,0.92)"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <GestureDetector gesture={geste}>
        <Animated.View style={[{ position: "absolute", left: SEITE, bottom: insets.bottom + UNTEN, borderRadius: KAPSEL / 2 }, kapselStil]}>
          {/* Weicher Schatten unter der Kapsel */}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: KAPSEL / 2, boxShadow: "0px 12px 32px rgba(0,0,0,0.55)" }]} />

          {/* Das Glas: Unschärfe, Tönung, Glanz, Lichtkante */}
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { borderRadius: KAPSEL / 2, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }]}
          >
            <BlurView tint="dark" intensity={75} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(14,16,20,0.3)" }]} />
            <LinearGradient
              colors={["rgba(255,255,255,0.16)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0)", "rgba(255,255,255,0.05)"]}
              locations={[0, 0.4, 0.75, 1]}
              style={StyleSheet.absoluteFill}
            />
            {/* Lichtkante oben (hell) und unten (schwach) – wie Licht auf Glas */}
            <LinearGradient
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.6)", "rgba(255,255,255,0.15)", "rgba(255,255,255,0)"]}
              locations={[0.08, 0.35, 0.7, 0.92]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.2 }}
            />
            <LinearGradient
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0.28)", "rgba(255,255,255,0)"]}
              locations={[0.1, 0.4, 0.75, 0.92]}
              style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1 }}
            />
          </View>

          {/* Glasblase – wird beim Antippen und Wischen zur Lupe und wächst über die Leiste hinaus */}
          <Animated.View pointerEvents="none" style={[{ position: "absolute", top: INNEN, bottom: INNEN, left: INNEN, width: feld, borderRadius: KAPSEL / 2 }, blaseStil]}>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: KAPSEL / 2, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
                blaseFuellung,
              ]}
            >
              <LinearGradient colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0)"]} locations={[0, 0.6]} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: KAPSEL / 2,
                  borderWidth: 1.5,
                  borderColor: "rgba(255,255,255,0.42)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  boxShadow: "0px 6px 18px rgba(0,0,0,0.35)",
                },
                lupenKante,
              ]}
            />
          </Animated.View>

          {/* Reiter, auf die Kapselform zugeschnitten */}
          <View style={[StyleSheet.absoluteFill, { borderRadius: KAPSEL / 2, overflow: "hidden" }]}>
            <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, left: INNEN, width: breite - 2 * INNEN, flexDirection: "row" }, reiterStil]}>
              {state.routes.map((route, i) => (
                <Reiter
                  key={route.key}
                  index={i}
                  name={route.name}
                  titel={descriptors[route.key]?.options.title ?? route.name}
                  aktiv={state.index === i}
                  breite={feld}
                  unterFinger={unterFinger}
                  lupe={lupe}
                  onWahl={() => waehlen(i, false)}
                />
              ))}
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[{ position: "absolute", top: 0, bottom: 0, left: 0, width: KLEIN_BREITE, alignItems: "center", justifyContent: "center" }, miniStil]}
            >
              <Icon name={mini.an} size={24} color={farben.orange} />
            </Animated.View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
