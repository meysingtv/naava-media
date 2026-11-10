import { useCallback, useRef, useState } from "react";
import { Animated, Text } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { useFarbwelt } from "@/lib/darstellung";
import { leuchten, mitDeckkraft, schrift } from "@/lib/theme";

/** Kurzer Hinweis oben im Bild („Karteikarte erstellt“ …). */
export type Hinweis = { icon: IconName; text: string; farbe?: string; textFarbe?: string };

export function useHinweis() {
  const wert = useRef(new Animated.Value(0)).current;
  const [inhalt, setInhalt] = useState<Hinweis | null>(null);
  const zeigen = useCallback(
    (h: Hinweis) => {
      setInhalt(h);
      wert.stopAnimation();
      wert.setValue(0);
      Animated.sequence([
        Animated.timing(wert, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.delay(1000),
        Animated.timing(wert, { toValue: 2, duration: 260, useNativeDriver: true }),
      ]).start();
    },
    [wert],
  );
  return { zeigen, wert, inhalt };
}

/** Kapsel mit Symbol, die kurz einblendet und nach oben verschwindet. */
export function HinweisAnzeige({ wert, inhalt, oben }: { wert: Animated.Value; inhalt: Hinweis | null; oben: number }) {
  const f = useFarbwelt();
  if (!inhalt) return null;
  const farbe = inhalt.farbe ?? f.orange;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: oben,
          alignSelf: "center",
          height: 40,
          paddingHorizontal: 16,
          borderRadius: 20,
          backgroundColor: f.hell ? "#FFFFFF" : "#1A2128",
          borderWidth: 1,
          borderColor: mitDeckkraft(farbe, f.hell ? 0.3 : 0.4),
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          opacity: wert.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
          transform: [
            { translateY: wert.interpolate({ inputRange: [0, 1, 2], outputRange: [8, 0, -10] }) },
            { scale: wert.interpolate({ inputRange: [0, 1, 2], outputRange: [0.94, 1, 0.98] }) },
          ],
        },
        f.hell ? leuchten("#3C2C18", 0.14, 16, 6) : leuchten("#000000", 0.5, 16, 6),
      ]}
    >
      <Icon name={inhalt.icon} size={15} color={farbe} />
      <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: inhalt.textFarbe ?? f.text }}>{inhalt.text}</Text>
    </Animated.View>
  );
}
