import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/lib/theme-context";

export default function TabsLayout() {
  const { colors } = useTheme();
  const icon =
    (an: keyof typeof Ionicons.glyphMap, aus: keyof typeof Ionicons.glyphMap) =>
    ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
      <Ionicons name={focused ? an : aus} size={size} color={color} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.separator },
        tabBarLabelStyle: { fontWeight: "600", fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="start" options={{ title: "Start", tabBarIcon: icon("home", "home-outline") }} />
      <Tabs.Screen name="termine" options={{ title: "Termine", tabBarIcon: icon("calendar", "calendar-outline") }} />
      <Tabs.Screen name="fortschritt" options={{ title: "Fortschritt", tabBarIcon: icon("ribbon", "ribbon-outline") }} />
      <Tabs.Screen name="rechnungen" options={{ title: "Rechnungen", tabBarIcon: icon("receipt", "receipt-outline") }} />
    </Tabs>
  );
}
