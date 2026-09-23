import type { ReactNode } from "react";
import { Image, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";

/**
 * Farbiger Kopf mit Verlauf (Blau → Türkis) und zwei weichen Kreisen als
 * Hintergrund-Deko. Unten abgerundet; Inhalte darunter dürfen per negativem
 * Abstand in den Kopf hineinragen.
 */
export function GradientKopf({
  titel,
  untertitel,
  oben,
  rechts,
  children,
  unten = space(6),
}: {
  titel?: string;
  untertitel?: string;
  /** Zeile über dem Titel (z. B. Fahrschule). */
  oben?: ReactNode;
  rechts?: ReactNode;
  children?: ReactNode;
  /** Innenabstand unten – größer, wenn eine Karte hineinragen soll. */
  unten?: number;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[colors.heroVon, colors.heroBis]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        paddingTop: insets.top + space(2),
        paddingHorizontal: space(5),
        paddingBottom: unten,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: "hidden",
      }}
    >
      {/* Deko */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.08)", top: -80, right: -70 }}
      />
      <View
        pointerEvents="none"
        style={{ position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.06)", bottom: -60, left: -40 }}
      />

      {oben || rechts ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 40, marginBottom: space(3) }}>
          <View style={{ flex: 1 }}>{oben}</View>
          {rechts}
        </View>
      ) : null}

      {titel ? (
        <Text style={{ fontSize: 30, fontWeight: "800", color: "#FFFFFF" }} numberOfLines={1}>
          {titel}
        </Text>
      ) : null}
      {untertitel ? <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>{untertitel}</Text> : null}
      {children}
    </LinearGradient>
  );
}

/** Fahrschule im Kopf: Logo oder Kürzel in weißer Kachel, daneben der Name. */
export function SchulMarke({ name, logoUrl }: { name?: string | null; logoUrl?: string | null }) {
  const kuerzel =
    (name ?? "F")
      .replace(/^fahrschule\s+/i, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "F";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space(2.5) }}>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#FFFFFF" }} />
      ) : (
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}>{kuerzel}</Text>
        </View>
      )}
      <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700", flexShrink: 1 }} numberOfLines={1}>
        {name ?? "Deine Fahrschule"}
      </Text>
    </View>
  );
}
