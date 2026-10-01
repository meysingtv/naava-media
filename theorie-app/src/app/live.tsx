import { View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LiveAnsicht } from "@/components/live-ansicht";

// Das Live als eigene Seite – Ziel der Mitteilung „… ist jetzt live“.
// In Clips steckt dieselbe Ansicht in der Kategorie „Live“.

export default function LiveSeite() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar style="light" />
      <LiveAnsicht oben={insets.top + 8} unten={Math.max(insets.bottom, 12) + 4} aktiv onSchliessen={() => router.back()} />
    </View>
  );
}
