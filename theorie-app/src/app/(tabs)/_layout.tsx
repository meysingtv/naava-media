import { Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Icon, Label, NativeTabs, VectorIcon } from "expo-router/unstable-native-tabs";

import { farben } from "@/lib/theme";

/**
 * Native iOS-Tab-Leiste: ab iOS 26 automatisch im Liquid-Glass-Look,
 * schwebend und beim Scrollen kleiner – wie in den Apple-Apps.
 * iOS zeigt höchstens fünf Reiter (sonst kommt „Mehr“), daher ist
 * „Statistiken“ eine eigene Seite (Home → „Alle ansehen“, Profil).
 */
export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={farben.orange}
      minimizeBehavior="onScrollDown"
      backgroundColor={Platform.OS === "android" ? farben.grundHoch : undefined}
      iconColor={Platform.OS === "android" ? { default: farben.text3, selected: farben.orange } : undefined}
      labelStyle={Platform.OS === "android" ? { default: { color: farben.text3 }, selected: { color: farben.orange } } : undefined}
    >
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
