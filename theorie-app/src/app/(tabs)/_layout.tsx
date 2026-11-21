import { Tabs } from "expo-router";

import { LilaTabLeiste } from "@/components/lila-leiste";
import { useLila } from "@/components/lila-teile";
import { useDesktop } from "@/lib/fenster";
import { FRAGEN_AKTIV } from "@/lib/funktionen";

/**
 * Reiter unten im lila Design (components/lila-leiste.tsx) – auf iPhone,
 * Android und im Browser gleich. Am PC navigiert die Seitenleiste links
 * (web/rahmen.tsx), unten ist dann keine Leiste.
 */
export default function TabsLayout() {
  const desktop = useDesktop();
  const l = useLila();
  return (
    <Tabs tabBar={(props) => (desktop ? null : <LilaTabLeiste {...props} />)} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: l.grund } }}>
      <Tabs.Screen name="heute" options={{ title: "Home" }} />
      <Tabs.Screen name="lernen" options={{ title: "Lernen" }} />
      <Tabs.Screen name="clips" options={{ title: "Clips" }} />
      <Tabs.Screen name="pruefen" options={{ title: "Prüfung", href: FRAGEN_AKTIV ? undefined : null }} />
      <Tabs.Screen name="profil" options={{ title: "Profil" }} />
    </Tabs>
  );
}
