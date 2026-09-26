import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { tippen } from "@/lib/haptik";
import { farben, schrift } from "@/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, [IconName, IconName]> = {
  heute: ["home", "home-outline"],
  lernen: ["book", "book-outline"],
  pruefen: ["play-circle", "play-circle-outline"],
  liga: ["trophy", "trophy-outline"],
  profil: ["person", "person-outline"],
};

export const TAB_HOEHE = 62;

/** Luft am Seitenende über der Tab-Leiste. */
export const INHALT_UNTEN = 28;

/**
 * Tab-Leiste wie in der Vorlage: dunkle Fläche mit runden oberen Ecken und
 * feiner Kante, fünf Reiter, der aktive leuchtet orange.
 */
export function TabLeiste({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ backgroundColor: farben.grund }}>
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 6,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: "#121417",
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: farben.linieStark,
        }}
      >
        {state.routes.map((route, index) => {
          const aktiv = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === "string" ? options.title : route.name;
          const [an, aus] = ICONS[route.name] ?? ["ellipse", "ellipse-outline"];
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
              style={{ flex: 1, alignItems: "center", justifyContent: "center", height: TAB_HOEHE, gap: 4 }}
            >
              <View style={aktiv ? { shadowColor: farben.orange, shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } } : null}>
                <Ionicons name={aktiv ? an : aus} size={25} color={aktiv ? farben.orange : farben.text2} />
              </View>
              <Text style={{ fontFamily: aktiv ? schrift.textFett : schrift.textMittel, fontSize: 11.5, color: aktiv ? farben.orange : farben.text2 }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
