import { useRef, type ReactNode } from "react";
import { Animated, Image, RefreshControl, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTabPlatz } from "@/components/tab-leiste";
import { useZiehen } from "@/lib/use-loader";
import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";

/**
 * Farbiger Kopf mit Verlauf (oben Blau, unten Türkis) und zwei weichen
 * Kreisen als Deko. Unten abgerundet; Inhalte darunter dürfen per negativem
 * Abstand in den Kopf hineinragen. Die Oberkante ist durchgehend einfarbig,
 * damit der Kopf beim Herunterziehen nahtlos „wächst“.
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
      colors={[colors.heroVon, colors.heroVon, colors.heroBis]}
      locations={[0, 0.3, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{
        paddingTop: insets.top + space(2),
        paddingHorizontal: space(5),
        paddingBottom: unten,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: "hidden",
      }}
    >
      {/* Deko – berührt die Oberkante nicht, sonst entstünde beim Ziehen eine Kante. */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.08)", top: space(6), right: -90 }}
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
      {untertitel ? <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.88)", marginTop: 4 }}>{untertitel}</Text> : null}
      {children}
    </LinearGradient>
  );
}

const nichts = async () => {};

/**
 * Scroll-Seite mit Verlaufskopf. Oben bleibt es beim Herunterziehen blau
 * (weißer Lade-Kreisel), unten federt der Seitenhintergrund nach. Scrollt der
 * Kopf weg, blendet ein Streifen in Kopffarbe hinter der Statusleiste ein.
 */
export function KopfSeite({
  kopf,
  children,
  onRefresh,
}: {
  kopf: ReactNode;
  children: ReactNode;
  onRefresh?: () => Promise<unknown>;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const platz = useTabPlatz();
  const ziehen = useZiehen(onRefresh ?? nichts);
  const scrollY = useRef(new Animated.Value(0)).current;
  const streifen = scrollY.interpolate({ inputRange: [0, space(8)], outputRange: [0, 1], extrapolate: "clamp" });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.ScrollView
        style={{ flex: 1, backgroundColor: colors.heroVon }}
        contentContainerStyle={{ flexGrow: 1, backgroundColor: colors.bg, paddingBottom: platz }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={ziehen.refreshing} onRefresh={ziehen.onRefresh} tintColor="#FFFFFF" /> : undefined
        }
      >
        {kopf}
        {children}
        {/* Unter dem Inhalt: Seitenhintergrund statt Blau, wenn es unten nachfedert. */}
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 0, right: 0, top: "100%", height: 1000, backgroundColor: colors.bg }}
        />
      </Animated.ScrollView>

      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.heroVon, opacity: streifen }}
      />
    </View>
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
