import type { ReactNode } from "react";
import { Image, Pressable, Text, View, useWindowDimensions, type ImageSourcePropType } from "react-native";

import { LinearGradient } from "expo-linear-gradient";

import { Icon, type IconName } from "@/components/icon";
import { lilaSchrift, useLila } from "@/components/lila-teile";
import { tippen } from "@/lib/haptik";

// Clips im lila Design: Bilder für Knöpfe und Hinweise, dazu der helle Grund
// mit Wolken und Welle für alles, was kein Video ist (leer, Fehler, kein Live).
// Die Videos selbst laufen weiter im Vollbild.

export const CLIPS_BILD = {
  plus: require("../../assets/images/clips/plus.png"),
  ton: require("../../assets/images/clips/ton.png"),
  freunde: require("../../assets/images/clips/freunde.png"),
  klappe: require("../../assets/images/clips/klappe.png"),
  livePille: require("../../assets/images/clips/live-pille.png"),
  liveKachel: require("../../assets/images/clips/live-kachel.png"),
  figur: require("../../assets/images/clips/figur-play.png"),
  wolke: require("../../assets/images/clips/wolke.png"),
  welle: require("../../assets/images/clips/welle.png"),
} satisfies Record<string, ImageSourcePropType>;

/** Heller Grund mit Welle unten. */
export function ClipsGrund({ unten = 0 }: { unten?: number }) {
  const l = useLila();
  const { width } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: l.grund }}>
      <Image source={CLIPS_BILD.welle} style={{ position: "absolute", left: 0, right: 0, bottom: unten, width: "100%", height: Math.round(width * 0.2), opacity: 0.85 }} resizeMode="stretch" />
    </View>
  );
}

/** Großer lila Knopf (Pille) mit Symbol – `zart` = weiß mit Rand. */
export function ClipsKnopf({ titel, icon, onPress, zart }: { titel: string; icon?: IconName; onPress: () => void; zart?: boolean }) {
  const l = useLila();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={titel}
      style={({ pressed }) => [
        { height: 58, borderRadius: 29, overflow: "hidden", transform: [{ scale: pressed ? 0.98 : 1 }] },
        zart ? { backgroundColor: l.karte, borderWidth: 1.5, borderColor: l.linie } : { shadowColor: "#6D5BC9", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      ]}
    >
      {zart ? null : <LinearGradient colors={["#9C8CEC", "#7B68DA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 29 }} />}
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}>
        {icon ? <Icon name={icon} size={24} color={zart ? "#8C7AE6" : "#FFFFFF"} /> : null}
        <Text style={{ ...lilaSchrift.titel, fontSize: 23, color: zart ? l.tinte : "#FFFFFF" }}>{titel}</Text>
      </View>
    </Pressable>
  );
}

/** Seitenverhältnis (Höhe ÷ Breite) der Bilder. */
const VERHAELTNIS: Partial<Record<keyof typeof CLIPS_BILD, number>> = { figur: 435 / 500, freunde: 143 / 240, klappe: 321 / 300, livePille: 151 / 240, liveKachel: 320 / 300, wolke: 160 / 300 };

/** Drei kleine Striche wie bei einem Ausruf (oben links neben dem Bild). */
function Funken({ x, y }: { x: number; y: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x, top: y, width: 60, height: 60 }}>
      {[
        { l: 26, t: 0, w: 22, r: 60 },
        { l: 2, t: 22, w: 26, r: 25 },
        { l: 0, t: 48, w: 22, r: 0 },
      ].map((f, i) => (
        <View key={i} style={{ position: "absolute", left: f.l, top: f.t, width: f.w, height: 6, borderRadius: 3, backgroundColor: "#8C7AE6", transform: [{ rotate: `${f.r}deg` }] }} />
      ))}
    </View>
  );
}

/** Hinweis in der Mitte: Bild auf Wolken, Titel, Text, Knöpfe. `deko` setzt Funken oder eine Filmklappe dazu. */
export function ClipsHinweis({
  bild,
  bildBreite = 150,
  titel,
  text,
  children,
  oben = 0,
  unten = 0,
  deko,
}: {
  bild: keyof typeof CLIPS_BILD;
  bildBreite?: number;
  titel: string;
  text: string;
  children?: ReactNode;
  oben?: number;
  unten?: number;
  deko?: "funken" | "klappe";
}) {
  const l = useLila();
  const hoehe = Math.round(bildBreite * (VERHAELTNIS[bild] ?? 1));
  const flaeche = Math.max(bildBreite + 140, 300);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 22, paddingTop: oben, paddingBottom: unten, gap: 10 }}>
      <View style={{ width: flaeche, height: hoehe + 30, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <Image source={CLIPS_BILD.wolke} style={{ position: "absolute", left: 0, bottom: 4, width: 150, height: 80, opacity: 0.55 }} resizeMode="contain" />
        <Image source={CLIPS_BILD.wolke} style={{ position: "absolute", right: 0, bottom: 22, width: 130, height: 70, opacity: 0.55 }} resizeMode="contain" />
        <Image source={CLIPS_BILD.wolke} style={{ position: "absolute", right: 14, top: 0, width: 90, height: 48, opacity: 0.6 }} resizeMode="contain" />
        {deko === "funken" ? <Funken x={flaeche / 2 - bildBreite / 2 - 58} y={0} /> : null}
        {deko === "klappe" ? <Image source={CLIPS_BILD.klappe} style={{ position: "absolute", left: flaeche / 2 - bildBreite / 2 - 70, top: 0, width: 96, height: 103, transform: [{ rotate: "-14deg" }] }} resizeMode="contain" /> : null}
        <Image source={CLIPS_BILD[bild]} style={{ width: bildBreite, height: hoehe }} resizeMode="contain" />
      </View>
      <Text style={{ ...lilaSchrift.titel, fontSize: 34, lineHeight: 37, color: l.tinte, textAlign: "center" }}>{titel}</Text>
      <Text style={{ ...lilaSchrift.text, fontSize: 16, lineHeight: 23, color: l.tinte2, textAlign: "center", maxWidth: 360 }}>{text}</Text>
      {children ? <View style={{ alignSelf: "stretch", gap: 12, marginTop: 18 }}>{children}</View> : null}
    </View>
  );
}
