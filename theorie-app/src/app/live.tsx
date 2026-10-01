import { View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LiveAnsicht } from "@/components/live-ansicht";

// Das Live im Vollbild (ohne Tab-Leiste) – Ziel der Mitteilung „… ist jetzt
// live“ und der Kategorie „Live“ in Clips, sobald ein Live läuft.

export default function LiveSeite() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar style="light" />
      <LiveAnsicht oben={insets.top + 8} unten={Math.max(insets.bottom, 12) + 4} aktiv onSchliessen={() => router.back()} />
    </View>
  );
}
