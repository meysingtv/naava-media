import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import type { SFSymbol } from "expo-symbols";

import { Glas } from "@/components/glas";
import { Icon, type IconName } from "@/components/icon";
import { tippen } from "@/lib/haptik";
import { schrift } from "@/lib/theme";

// Kleines Menü, das direkt am Knopf (oder am Finger) aufklappt – wie die Menüs
// in iOS: Text links, Symbol rechts. Auf dem iPhone mit Liquid Glass echtes Glas
// (mit Unschärfe), sonst eine feste Fläche, damit nichts durchscheint.
// Tippen daneben schließt es.

const ECHTES_GLAS = Platform.OS === "ios" && isLiquidGlassAvailable();

export const MENUE_BREITE = 248;
export const MENUE_ZEILE = 50;
export const MENUE_TITEL = 38;

export type MenueEintrag = { text: string; icon?: IconName; sf?: SFSymbol; gefahr?: boolean };
export type MenuePunkt = MenueEintrag & { onPress: () => void };

/** Die Menü-Fläche selbst (ohne Lage und Animation). */
export function MenueKarte({ titel, eintraege, hell, onWahl }: { titel?: string; eintraege: MenueEintrag[]; hell?: boolean; onWahl: (i: number) => void }) {
  const text = hell ? "#14171B" : "#FFFFFF";
  const rot = hell ? "#E5392C" : "#FF5A4F";
  const linie = hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.1)";
  const inhalt = (
    <>
      {titel ? (
        <View style={{ height: MENUE_TITEL, justifyContent: "center", paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: linie }}>
          <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 13, color: hell ? "#7A8089" : "rgba(255,255,255,0.6)" }}>
            {titel}
          </Text>
        </View>
      ) : null}
      {eintraege.map((p, i) => (
        <View key={`${i}-${p.text}`}>
          {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: linie }} /> : null}
          <Pressable
            onPress={() => {
              tippen();
              onWahl(i);
            }}
            accessibilityRole="menuitem"
            accessibilityLabel={p.text}
          >
            {({ pressed }) => (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  height: MENUE_ZEILE,
                  paddingHorizontal: 16,
                  backgroundColor: pressed ? (hell ? "rgba(20,23,27,0.07)" : "rgba(255,255,255,0.1)") : "transparent",
                }}
              >
                <Text numberOfLines={1} style={{ ...schrift.textMittel, fontSize: 16.5, color: p.gefahr ? rot : text, flexShrink: 1 }}>
                  {p.text}
                </Text>
                {p.icon ? <Icon name={p.icon} sf={p.sf} size={19} color={p.gefahr ? rot : text} /> : null}
              </View>
            )}
          </Pressable>
        </View>
      ))}
    </>
  );
  if (ECHTES_GLAS) return <Glas hell={hell} style={{ borderRadius: 18, overflow: "hidden" }}>{inhalt}</Glas>;
  return (
    <View
      style={{
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: hell ? "#FFFFFF" : "#25262B",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.12)",
      }}
    >
      {inhalt}
    </View>
  );
}

/** Menü in eigenem Fenster: aufklappen mit kleiner Federung, schließen per Tippen daneben. */
export function MenueFenster({
  offen,
  lage,
  ursprung,
  hell,
  titel,
  eintraege,
  onWahl,
  onSchliessen,
  onZu,
}: {
  offen: boolean;
  lage: Pick<ViewStyle, "top" | "left">;
  /** Ecke, aus der das Menü aufklappt. */
  ursprung: "top left" | "bottom left";
  hell?: boolean;
  titel?: string;
  eintraege: MenueEintrag[];
  onWahl: (i: number) => void;
  onSchliessen: () => void;
  /** Nach dem Zuklappen (Fenster weg). */
  onZu?: () => void;
}) {
  const wert = useRef(new Animated.Value(0)).current;
  const [sichtbar, setSichtbar] = useState(offen);
  const zuRef = useRef(onZu);
  zuRef.current = onZu;

  useEffect(() => {
    if (offen) {
      setSichtbar(true);
      Animated.spring(wert, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 5 }).start();
      return;
    }
    Animated.timing(wert, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setSichtbar(false);
      zuRef.current?.();
    });
  }, [offen, wert]);

  if (!sichtbar) return null;
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onSchliessen}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onSchliessen} accessibilityLabel="Menü schließen">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: hell ? "rgba(20,16,10,0.2)" : "rgba(0,0,0,0.42)", opacity: wert }]} />
      </Pressable>
      <Animated.View
        style={{
          position: "absolute",
          ...lage,
          width: MENUE_BREITE,
          opacity: wert,
          shadowColor: "#000000",
          shadowOpacity: hell ? 0.18 : 0.45,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
          transformOrigin: ursprung,
          transform: [{ scale: wert.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
        }}
      >
        <MenueKarte titel={titel} eintraege={eintraege} hell={hell} onWahl={onWahl} />
      </Animated.View>
    </Modal>
  );
}

/** Menü an einem Knopf: wählt einen Punkt und führt ihn nach dem Zuklappen aus. */
export function AufklappMenue({ offen, oben, links, punkte, onSchliessen }: { offen: boolean; oben: number; links: number; punkte: MenuePunkt[]; onSchliessen: () => void }) {
  const gewaehlt = useRef<MenuePunkt | null>(null);
  return (
    <MenueFenster
      offen={offen}
      lage={{ top: oben, left: links }}
      ursprung="top left"
      eintraege={punkte}
      onWahl={(i) => {
        gewaehlt.current = punkte[i] ?? null;
        onSchliessen();
      }}
      onSchliessen={onSchliessen}
      onZu={() => {
        // Erst zuklappen, dann die nächste Seite öffnen (sonst stört das Menü den Wechsel).
        const p = gewaehlt.current;
        gewaehlt.current = null;
        p?.onPress();
      }}
    />
  );
}
