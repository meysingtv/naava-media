import { Pressable, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { tippen } from "@/lib/haptik";
import { farben, schrift } from "@/lib/theme";

// Auf dem iPhone ist die Tab-Leiste die native iOS-Leiste (siehe
// app/(tabs)/_layout.tsx). Auf Android liegt diese eigene Leiste über dem
// Inhalt – gleich hoch, damit alle Seiten auf beiden Systemen gleich passen.

/** Höhe der Leiste ohne den Systembereich unten. */
const LEISTE = 58;
/** Voll deckend – ohne Glas würde Inhalt darunter durchscheinen. */
const GRUND = "#090D10";

/** Höhe, die die Leiste unten belegt (inkl. Home-Indikator bzw. Android-Navigation). */
export function useLeistenHoehe(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + LEISTE;
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

/**
 * Tab-Leiste für Android: dunkel wie die App, das aktive Symbol sitzt in
 * einer orangen Kapsel (wie bei Android üblich), Beschriftung darunter.
 */
export function TabLeiste({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: LEISTE + insets.bottom,
        paddingBottom: insets.bottom,
        flexDirection: "row",
        backgroundColor: GRUND,
        borderTopWidth: 1,
        borderColor: farben.linie,
      }}
    >
      {state.routes.map((route, i) => {
        const aktiv = state.index === i;
        const titel = descriptors[route.key]?.options.title ?? route.name;
        const symbol = SYMBOLE[route.name] ?? { an: "ellipse", aus: "ellipse-outline" };
        const farbe = aktiv ? farben.orange : farben.text3;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktiv }}
            accessibilityLabel={titel}
            android_ripple={{ color: "rgba(252,91,14,0.16)", borderless: true, radius: 38 }}
            onPress={() => {
              const ereignis = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!aktiv && !ereignis.defaultPrevented) {
                tippen();
                navigation.navigate(route.name, route.params);
              }
            }}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3 }}
          >
            <View style={{ width: 56, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: aktiv ? farben.orangeSoft : "transparent" }}>
              <Icon name={aktiv ? symbol.an : symbol.aus} size={21} color={farbe} />
            </View>
            <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 11, lineHeight: 13, color: farbe }}>
              {titel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
