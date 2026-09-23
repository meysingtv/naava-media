import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/lib/theme-context";

export default function TabsLayout() {
  const { colors } = useTheme();
  const icon =
    (an: keyof typeof Ionicons.glyphMap, aus: keyof typeof Ionicons.glyphMap) =>
    ({ color, focused }: { color: string; size: number; focused: boolean }) => (
      <Ionicons name={focused ? an : aus} size={25} color={color} />
    );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 0,
          shadowColor: colors.schatten,
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
        },
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="start" options={{ title: "Start", tabBarIcon: icon("home", "home-outline") }} />
      <Tabs.Screen name="termine" options={{ title: "Termine", tabBarIcon: icon("calendar", "calendar-outline") }} />
      <Tabs.Screen name="fortschritt" options={{ title: "Fortschritt", tabBarIcon: icon("trophy", "trophy-outline") }} />
      <Tabs.Screen name="rechnungen" options={{ title: "Rechnungen", tabBarIcon: icon("wallet", "wallet-outline") }} />
    </Tabs>
  );
}
