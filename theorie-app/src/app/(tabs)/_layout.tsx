import { Tabs } from "expo-router";

import { TabLeiste } from "@/components/tab-leiste";
import { farben } from "@/lib/theme";

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabLeiste {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: farben.grund } }}>
      <Tabs.Screen name="heute" options={{ title: "Heute" }} />
      <Tabs.Screen name="lernen" options={{ title: "Lernen" }} />
      <Tabs.Screen name="liga" options={{ title: "Liga" }} />
      <Tabs.Screen name="profil" options={{ title: "Profil" }} />
    </Tabs>
  );
}
