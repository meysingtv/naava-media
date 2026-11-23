import { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

// Ladekreis. Auf dem iPhone der native. Auf Android sieht der native
// Ladekreis ganz anders aus (Material-Ring) – dort das iPhone-Speichenrad:
// acht Speichen, die hellste läuft im Uhrzeigersinn herum.

type Groesse = "small" | "large" | number;

export function Lader({ color = "#999999", size = "small", style }: { color?: string; size?: Groesse; style?: StyleProp<ViewStyle> }) {
  if (Platform.OS === "ios") return <ActivityIndicator color={color} size={size} style={style} />;
  return <Speichenrad farbe={color} groesse={size} style={style} />;
}

function Speichenrad({ farbe, groesse, style }: { farbe: string; groesse: Groesse; style?: StyleProp<ViewStyle> }) {
  const d = typeof groesse === "number" ? groesse : groesse === "large" ? 36 : 20;
  const lang = d * 0.28;
  const breit = Math.max(2, d * 0.1);

  const lauf = useSharedValue(0);
  useEffect(() => {
    lauf.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1, false);
  }, [lauf]);
  // In Achtelschritten wie beim iPhone, nicht stufenlos.
  const drehung = useAnimatedStyle(() => ({ transform: [{ rotate: `${Math.floor(lauf.value * 8) * 45}deg` }] }));

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Lädt" style={[{ width: d, height: d }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, drehung]}>
        {Array.from({ length: 8 }, (_, i) => (
          <View
            key={i}
            style={{ position: "absolute", left: d / 2 - breit / 2, top: 0, width: breit, height: d, alignItems: "center", transform: [{ rotate: `${i * 45}deg` }] }}
          >
            <View style={{ width: breit, height: lang, borderRadius: breit / 2, backgroundColor: farbe, opacity: i === 0 ? 1 : 0.22 + (0.72 * i) / 7 }} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
