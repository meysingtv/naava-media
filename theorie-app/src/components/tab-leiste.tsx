import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { SFSymbol } from "expo-symbols";

import { Icon, type IconName } from "@/components/icon";
import { tippen } from "@/lib/haptik";
import { farben, schrift } from "@/lib/theme";

type Reiter = { aus: [IconName, SFSymbol]; an: [IconName, SFSymbol] };

const REITER: Record<string, Reiter> = {
  heute: { aus: ["home-outline", "house"], an: ["home", "house.fill"] },
  lernen: { aus: ["book-outline", "book"], an: ["book", "book.fill"] },
  pruefen: { aus: ["play-circle-outline", "play.square"], an: ["play-circle", "play.square.fill"] },
  statistik: { aus: ["stats-chart-outline", "chart.bar"], an: ["stats-chart", "chart.bar.fill"] },
  profil: { aus: ["person-outline", "person"], an: ["person", "person.fill"] },
};

const LEISTE_HOEHE = 58;

/** Platz unter dem Inhalt einer Tab-Seite: Die Leiste liegt über dem Inhalt. */
export function useInhaltUnten(): number {
  const insets = useSafeAreaInsets();
  return LEISTE_HOEHE + Math.max(insets.bottom - 6, 8) + 18;
}

/**
 * Tab-Leiste wie in der Vorlage im klassischen iOS-Stil: dunkle Fläche mit
 * runden oberen Ecken und feiner Kante, fünf Reiter mit SF Symbols, der
 * aktive leuchtet orange. Sie liegt über dem Inhalt, der darunter weiterläuft.
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
        flexDirection: "row",
        paddingHorizontal: 4,
        paddingTop: 4,
        paddingBottom: Math.max(insets.bottom - 6, 8),
        backgroundColor: farben.tabLeiste,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: "rgba(255,255,255,0.09)",
      }}
    >
      {state.routes.map((route, index) => {
        const aktiv = state.index === index;
        const { options } = descriptors[route.key];
        const label = typeof options.title === "string" ? options.title : route.name;
        const reiter = REITER[route.name];
        const [ion, sf] = reiter ? (aktiv ? reiter.an : reiter.aus) : (["ellipse-outline", "circle"] as [IconName, SFSymbol]);
        const farbe = aktiv ? farben.orange : "#C4C8CE";
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktiv }}
            accessibilityLabel={label}
            onPress={() => {
              const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!aktiv && !e.defaultPrevented) {
                tippen();
                navigation.navigate(route.name, route.params);
              }
            }}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", height: LEISTE_HOEHE, gap: 4 }}
          >
            <Icon name={ion} sf={sf} size={25} color={farbe} weight={aktiv ? "semibold" : "regular"} />
            <Text style={{ ...(aktiv ? schrift.textHalb : schrift.textMittel), fontSize: 11.5, color: farbe }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
