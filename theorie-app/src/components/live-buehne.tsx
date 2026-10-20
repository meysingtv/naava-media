import { useEffect } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Icon } from "@/components/icon";
import type { LiveBuehneProps } from "@/lib/live";
import { schrift } from "@/lib/theme";

// Im Web (Vorschau) gibt es kein Live-Video – LiveKit läuft nur in der App.
// Die Version für iPhone und Android steht in live-buehne.native.tsx.

export const liveVideoMoeglich = false;

export function LiveBuehne({ onVerbindung, onBildWeg, style }: LiveBuehneProps) {
  useEffect(() => {
    onVerbindung?.("verbunden");
    onBildWeg?.(false);
    // nur beim Öffnen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={[{ backgroundColor: "#07090C", alignItems: "center", justifyContent: "center" }, style]}>
      <LinearGradient colors={["#1B0F08", "#07090C", "#07090C"]} locations={[0, 0.5, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <Icon name="videocam-outline" sf="video" size={34} color="rgba(255,255,255,0.35)" />
      <Text style={{ ...schrift.textHalb, fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 10 }}>Das Live-Video läuft in der App</Text>
    </View>
  );
}
