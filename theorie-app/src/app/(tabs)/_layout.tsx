import { Platform } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Icon, Label, NativeTabs, VectorIcon } from "expo-router/unstable-native-tabs";

import { TabLeiste } from "@/components/tab-leiste";
import { farben } from "@/lib/theme";

/**
 * Native iOS-Tab-Leiste: ab iOS 26 automatisch im Liquid-Glass-Look,
 * schwebend und beim Scrollen kleiner – wie in den Apple-Apps.
 * iOS zeigt höchstens fünf Reiter (sonst kommt „Mehr“), daher ist
 * „Statistiken“ eine eigene Seite (Home → „Alle ansehen“, Profil).
 * Auf Android gibt es kein Liquid Glass – dort eine eigene Leiste im App-Look.
 */
export default function TabsLayout() {
  if (Platform.OS !== "ios") return <AndroidTabs />;
  return (
    <NativeTabs tintColor={farben.orange} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="heute">
        <Label>Home</Label>
        <Icon sf={{ default: "house", selected: "house.fill" }} androidSrc={<VectorIcon family={Ionicons} name="home" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="lernen">
        <Label>Lernen</Label>
        <Icon sf={{ default: "book", selected: "book.fill" }} androidSrc={<VectorIcon family={Ionicons} name="book" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="clips">
        <Label>Clips</Label>
        <Icon sf={{ default: "play.rectangle.on.rectangle", selected: "play.rectangle.on.rectangle.fill" }} androidSrc={<VectorIcon family={Ionicons} name="film" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pruefen">
        <Label>Prüfung</Label>
        <Icon sf={{ default: "checkmark.seal", selected: "checkmark.seal.fill" }} androidSrc={<VectorIcon family={Ionicons} name="ribbon" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profil">
        <Label>Profil</Label>
        <Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} androidSrc={<VectorIcon family={Ionicons} name="person-circle" />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function AndroidTabs() {
  return (
    <Tabs tabBar={(props) => <TabLeiste {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: farben.grund } }}>
      <Tabs.Screen name="heute" options={{ title: "Home" }} />
      <Tabs.Screen name="lernen" options={{ title: "Lernen" }} />
      <Tabs.Screen name="clips" options={{ title: "Clips" }} />
      <Tabs.Screen name="pruefen" options={{ title: "Prüfung" }} />
      <Tabs.Screen name="profil" options={{ title: "Profil" }} />
    </Tabs>
  );
}
