import { Ionicons } from "@expo/vector-icons";
import { Icon, Label, NativeTabs, VectorIcon } from "expo-router/unstable-native-tabs";

import { farben } from "@/lib/theme";

/**
 * Echte iOS-Tab-Leiste (UITabBar, ab iOS 26 im Glas-Stil) mit SF Symbols.
 * Der aktive Reiter leuchtet orange wie in der Vorlage.
 */
export default function TabsLayout() {
  return (
    <NativeTabs tintColor={farben.orange} minimizeBehavior="never" disableTransparentOnScrollEdge>
      <NativeTabs.Trigger name="heute">
        <Label>Home</Label>
        <Icon sf={{ default: "house", selected: "house.fill" }} androidSrc={<VectorIcon family={Ionicons} name="home" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="lernen">
        <Label>Lernen</Label>
        <Icon sf={{ default: "book", selected: "book.fill" }} androidSrc={<VectorIcon family={Ionicons} name="book" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pruefen">
        <Label>Prüfung</Label>
        <Icon sf={{ default: "play.circle", selected: "play.circle.fill" }} androidSrc={<VectorIcon family={Ionicons} name="play-circle" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="liga">
        <Label>Rangliste</Label>
        <Icon sf={{ default: "trophy", selected: "trophy.fill" }} androidSrc={<VectorIcon family={Ionicons} name="trophy" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profil">
        <Label>Profil</Label>
        <Icon sf={{ default: "person", selected: "person.fill" }} androidSrc={<VectorIcon family={Ionicons} name="person" />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
