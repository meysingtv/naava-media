import { useEffect, useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Glas } from "@/components/glas";
import { Icon } from "@/components/icon";
import { LiveAnsicht } from "@/components/live-ansicht";
import { LiveFeed } from "@/components/live-feed";
import { tippen } from "@/lib/haptik";
import { useLive } from "@/lib/live";

// Das Live im Vollbild (ohne Tab-Leiste) – Ziel der Mitteilung „… ist jetzt
// live“ (mit ?id=…) und der Kategorie „Live“ in Clips. Ohne Angabe und bei zwei
// Lives erst die Auswahl zum Durchscrollen, sonst das eine laufende Live.

export default function LiveSeite() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { alle } = useLive();
  // Läuft nur ein Live, bleibt es gewählt – auch wenn danach ein zweites startet.
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  useEffect(() => {
    if (!id && !gewaehlt && alle.length === 1) setGewaehlt(alle[0].id);
  }, [id, gewaehlt, alle]);
  const liveId = id ?? gewaehlt ?? undefined;

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar style="light" />
      {!liveId && alle.length > 1 ? (
        <>
          <LiveFeed lives={alle} hoehe={height} breite={width} unten={Math.max(insets.bottom, 12) + 4} aktiv onOeffnen={(neu) => router.push({ pathname: "/live", params: { id: neu } })} />
          <Pressable
            onPress={() => {
              tippen();
              router.back();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Schließen"
            style={{ position: "absolute", top: insets.top + 8, right: 14 }}
          >
            <Glas interaktiv style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
              <Icon name="close" sf="xmark" size={18} color="#FFFFFF" weight="semibold" />
            </Glas>
          </Pressable>
        </>
      ) : (
        <LiveAnsicht key={liveId ?? "erstes"} liveId={liveId} oben={insets.top + 8} unten={Math.max(insets.bottom, 12) + 4} aktiv onSchliessen={() => router.back()} />
      )}
    </View>
  );
}
