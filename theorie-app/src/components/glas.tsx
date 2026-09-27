import type { ReactNode } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

/**
 * Liquid Glass wie in iOS 26/27. Auf älteren Systemen (und im Web) eine
 * dunkle, leicht durchscheinende Fläche mit feiner heller Kante.
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
  return (
    <View
      pointerEvents={pointerEvents}
      style={[{ backgroundColor: toenung ?? (klar ? "rgba(18,20,24,0.42)" : "rgba(18,20,24,0.66)"), borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }, style]}
    >
      {children}
    </View>
  );
}
