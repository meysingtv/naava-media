import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { SFSymbol } from "expo-symbols";

import { Glas } from "@/components/glas";
import { Icon, type IconName } from "@/components/icon";
import { tippen } from "@/lib/haptik";
import { schrift } from "@/lib/theme";

// Kleines Menü, das direkt am Knopf aufklappt – wie die Menüs in iOS:
// Text links, Symbol rechts, Glas als Fläche. Tippen daneben schließt es.

export type MenuePunkt = { text: string; icon: IconName; sf?: SFSymbol; onPress: () => void };

export function AufklappMenue({ offen, oben, links, punkte, onSchliessen }: { offen: boolean; oben: number; links: number; punkte: MenuePunkt[]; onSchliessen: () => void }) {
  const wert = useRef(new Animated.Value(0)).current;
  const [sichtbar, setSichtbar] = useState(offen);

  useEffect(() => {
    if (offen) {
      setSichtbar(true);
      Animated.spring(wert, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 5 }).start();
      return;
    }
    Animated.timing(wert, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setSichtbar(false);
    });
  }, [offen, wert]);

  if (!sichtbar) return null;

  function waehlen(p: MenuePunkt) {
    tippen();
    onSchliessen();
    // Erst schließen, dann die nächste Seite öffnen (sonst stört das Menü den Wechsel).
    setTimeout(p.onPress, 160);
  }

  return (
    <Modal supportedOrientations={["portrait", "landscape"]} visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onSchliessen}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onSchliessen} accessibilityLabel="Menü schließen">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.32)", opacity: wert }]} />
      </Pressable>
      <Animated.View
        style={{
          position: "absolute",
          top: oben,
          left: links,
          width: 236,
          opacity: wert,
          transformOrigin: "top left",
          transform: [{ scale: wert.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
        }}
      >
        <Glas style={{ borderRadius: 18, overflow: "hidden" }}>
          {punkte.map((p, i) => (
            <View key={p.text}>
              {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.16)" }} /> : null}
              <Pressable onPress={() => waehlen(p)} accessibilityRole="menuitem" accessibilityLabel={p.text}>
                {({ pressed }) => (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      height: 50,
                      paddingHorizontal: 16,
                      backgroundColor: pressed ? "rgba(255,255,255,0.1)" : "transparent",
                    }}
                  >
                    <Text style={{ ...schrift.textMittel, fontSize: 16.5, color: "#FFFFFF" }}>{p.text}</Text>
                    <Icon name={p.icon} sf={p.sf} size={19} color="#FFFFFF" />
                  </View>
                )}
              </Pressable>
            </View>
          ))}
        </Glas>
      </Animated.View>
    </Modal>
  );
}
