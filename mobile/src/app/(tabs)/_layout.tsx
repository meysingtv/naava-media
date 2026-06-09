import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/lib/theme-context";
import { HeaderPlus } from "@/components/header-plus";

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.separator },
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { color: colors.text, fontWeight: "700" },
        headerShadowVisible: false,
        headerTintColor: colors.accent,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="heute"
        options={{
          title: "Heute",
          headerRight: () => <HeaderPlus href="/fahrstunde/neu" />,
          tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="kalender"
        options={{
          title: "Kalender",
          headerRight: () => <HeaderPlus href="/fahrstunde/neu" />,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schueler"
        options={{
          title: "Schüler",
          headerRight: () => <HeaderPlus href="/schueler/neu" />,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mehr"
        options={{
          title: "Mehr",
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
