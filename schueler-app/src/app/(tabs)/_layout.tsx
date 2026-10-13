import { Tabs } from "expo-router";

import { TabLeiste } from "@/components/tab-leiste";
import { TabZaehlerProvider } from "@/lib/tab-zaehler";
import { useTheme } from "@/lib/theme-context";

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <TabZaehlerProvider>
      <Tabs
        tabBar={(props) => <TabLeiste {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      >
        <Tabs.Screen name="start" options={{ title: "Start" }} />
        <Tabs.Screen name="termine" options={{ title: "Termine" }} />
        <Tabs.Screen name="fortschritt" options={{ title: "Fortschritt" }} />
        <Tabs.Screen name="rechnungen" options={{ title: "Bezahlen" }} />
      </Tabs>
    </TabZaehlerProvider>
  );
}
