import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { stoss, tippen } from "@/lib/haptik";
import { farben, schrift } from "@/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, [IconName, IconName]> = {
  heute: ["today", "today-outline"],
  lernen: ["map", "map-outline"],
  liga: ["podium", "podium-outline"],
  profil: ["person-circle", "person-circle-outline"],
};

export const TAB_HOEHE = 64;

/** Abstand am Seitenende – der Trainings-Knopf ragt etwas in den Inhalt. */
export const INHALT_UNTEN = 48;

/**
 * Tab-Leiste: ruhige Fläche mit Haarlinie. Die aktive Seite trägt eine
 * orange Markierung wie ein Fahrbahnstrich; in der Mitte startet der
 * orange Knopf direkt ein Training.
 */
export function TabLeiste({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const routen = state.routes;
  const mitte = Math.ceil(routen.length / 2);

  const tab = (index: number) => {
    const route = routen[index];
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
        <View style={{ position: "absolute", top: 0, width: 18, height: 3, borderRadius: 2, backgroundColor: aktiv ? farben.orange : "transparent" }} />
        <Ionicons name={aktiv ? an : aus} size={23} color={aktiv ? farben.text : farben.text4} />
        <Text style={{ fontFamily: schrift.textHalb, fontSize: 11, color: aktiv ? farben.text : farben.text4 }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: insets.bottom,
        paddingHorizontal: 6,
        backgroundColor: farben.grundHoch,
        borderTopWidth: 1,
        borderTopColor: farben.linie,
      }}
    >
      {routen.slice(0, mitte).map((_, i) => tab(i))}

      <View style={{ width: 76, alignItems: "center" }}>
        <Pressable
          accessibilityLabel="Training starten"
          onPress={() => {
            stoss();
            router.push({ pathname: "/training", params: { modus: "smart" } });
          }}
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            marginTop: -22,
            borderRadius: 28,
            backgroundColor: farben.orange,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 5,
            borderColor: farben.grund,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          })}
        >
          <Ionicons name="play" size={22} color={farben.aufOrange} style={{ marginLeft: 3 }} />
        </Pressable>
        <Text style={{ fontFamily: schrift.textHalb, fontSize: 11, color: farben.text3, marginTop: 3 }}>Training</Text>
      </View>

      {routen.slice(mitte).map((_, i) => tab(mitte + i))}
    </View>
  );
}
