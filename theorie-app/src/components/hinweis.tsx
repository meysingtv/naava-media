import { useCallback, useRef, useState } from "react";
import { Animated } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { T } from "@/components/ui";
import { abstand, farben } from "@/lib/theme";

/** Kurzer Hinweis oben im Bild („+10 XP“, „Karteikarte erstellt“ …). */
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

export function HinweisAnzeige({ wert, inhalt, oben }: { wert: Animated.Value; inhalt: Hinweis | null; oben: number }) {
  if (!inhalt) return null;
  const farbe = inhalt.farbe ?? farben.orange;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: oben,
        alignSelf: "center",
        paddingHorizontal: abstand(3.5),
        paddingVertical: abstand(1.5),
        borderRadius: 999,
        backgroundColor: farben.flaeche2,
        borderWidth: 1,
        borderColor: farben.orangeLinie,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        opacity: wert.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
        transform: [{ translateY: wert.interpolate({ inputRange: [0, 1, 2], outputRange: [8, 0, -10] }) }],
      }}
    >
      <Icon name={inhalt.icon} size={14} color={farbe} />
      <T v="textStark" farbe={inhalt.textFarbe ?? farben.text} style={{ fontSize: 14 }}>
        {inhalt.text}
      </T>
    </Animated.View>
  );
}
