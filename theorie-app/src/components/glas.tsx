import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Liquid Glass wie in iOS 26/27. Ohne Liquid Glass (Android, ältere iPhones,
 * Web) nachgebaut: durchscheinende Fläche mit Glanz von oben und heller
 * Lichtkante. Bewusst ohne Unschärfe – das Glas liegt über Video und Kamera,
 * und die kann die Android-Unschärfe nicht erfassen (das Glas würde schwarz).
 */
export function Glas({
  style,
  children,
  toenung,
  klar,
  interaktiv,
  pointerEvents,
}: {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Farbton des Glases, z. B. Orange für aktive Elemente. */
  toenung?: string;
  /** Durchsichtigeres Glas (für Flächen über Videos). */
  klar?: boolean;
  /** Glas reagiert auf Berührung (nur iOS 26+). */
  interaktiv?: boolean;
  pointerEvents?: "auto" | "none" | "box-none" | "box-only";
}) {
  if (Platform.OS === "ios" && isLiquidGlassAvailable()) {
    return (
      <GlassView
        style={style}
        glassEffectStyle={klar ? "clear" : "regular"}
        tintColor={toenung}
        isInteractive={interaktiv}
        colorScheme="dark"
        pointerEvents={pointerEvents}
      >
        {children}
      </GlassView>
    );
  }
  const radius = Number(StyleSheet.flatten(style)?.borderRadius ?? 0);
  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        {
          overflow: "hidden",
          backgroundColor: toenung ?? (klar ? "rgba(22,24,28,0.34)" : "rgba(22,24,28,0.58)"),
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.17)",
        },
        style,
      ]}
    >
      {/* Glanz von oben, unten ein Hauch Licht – wie gewölbtes Glas */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.05)", "rgba(255,255,255,0)", "rgba(255,255,255,0.06)"]}
        locations={[0, 0.42, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* Lichtkante oben */}
      <LinearGradient
        pointerEvents="none"
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.65)", "rgba(255,255,255,0)"]}
        style={{ position: "absolute", top: 0, left: radius * 0.7, right: radius * 0.7, height: 1 }}
      />
      {children}
    </View>
  );
}
