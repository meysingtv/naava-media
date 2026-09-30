import { useEffect } from "react";
import { Platform, Pressable, Switch } from "react-native";
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { useFarbwelt } from "@/lib/darstellung";
import { farben } from "@/lib/theme";

// An/Aus-Schalter. Auf dem iPhone der native. Auf Android der iPhone-Look:
// breite Kapsel, weißer Knopf, der beim Drücken in die Breite geht.

const BREITE = 51;
const HOEHE = 31;
const KNOPF = 27;
const RAND = 2;

export function Schalter({ wert, onWechsel, farbe }: { wert: boolean; onWechsel: (an: boolean) => void; farbe?: string }) {
  const f = useFarbwelt();
  const an = farbe ?? f.orange;
  // Ausgeschaltet: auf hellen Seiten hellgrau, sonst dunkelgrau
  const aus = f.hell ? "#E3DED5" : farben.flaeche3;
  if (Platform.OS === "ios") {
    return <Switch value={wert} onValueChange={onWechsel} trackColor={{ true: an, false: aus }} thumbColor="#FFFFFF" ios_backgroundColor={aus} />;
  }
  return <IosSchalter wert={wert} onWechsel={onWechsel} farbe={an} aus={aus} />;
}

function IosSchalter({ wert, onWechsel, farbe, aus }: { wert: boolean; onWechsel: (an: boolean) => void; farbe: string; aus: string }) {
  const an = useSharedValue(wert ? 1 : 0);
  const druck = useSharedValue(0);

  useEffect(() => {
    an.value = withTiming(wert ? 1 : 0, { duration: 220 });
  }, [wert, an]);

  const spur = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(an.value, [0, 1], [aus, farbe]) }));
  const knopf = useAnimatedStyle(() => {
    const breite = KNOPF + 6 * druck.value;
    return {
      width: breite,
      transform: [{ translateX: interpolate(an.value, [0, 1], [0, BREITE - 2 * RAND - breite]) }],
    };
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: wert }}
      onPressIn={() => (druck.value = withSpring(1, { damping: 15, stiffness: 260 }))}
      onPressOut={() => (druck.value = withSpring(0, { damping: 15, stiffness: 260 }))}
      onPress={() => onWechsel(!wert)}
      hitSlop={8}
    >
      <Animated.View style={[{ width: BREITE, height: HOEHE, borderRadius: HOEHE / 2, padding: RAND }, spur]}>
        <Animated.View
          style={[{ height: KNOPF, borderRadius: KNOPF / 2, backgroundColor: "#FFFFFF", boxShadow: "0px 2px 5px rgba(0,0,0,0.3)" }, knopf]}
        />
      </Animated.View>
    </Pressable>
  );
}
