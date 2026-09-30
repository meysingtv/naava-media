import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { SFSymbol } from "expo-symbols";

import { Glas } from "@/components/glas";
import { Icon, type IconName } from "@/components/icon";
import { useFarbwelt } from "@/lib/darstellung";
import { tippen } from "@/lib/haptik";
import { leuchten, mitDeckkraft, RAND, schrift, verlauf } from "@/lib/theme";

// Rahmen für Fragen-Bildschirme (Training, Prüfung): Kopf mit Glas-Knöpfen,
// Fortschritt je Frage und die Leiste mit dem leuchtenden Hauptknopf.

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

/** Runder Glas-Knopf für den Kopf (Schließen, Merken). */
export function GlasRund({ icon, sf, farbe, label, onPress }: { icon: IconName; sf?: SFSymbol; farbe?: string; label: string; onPress: () => void }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.92 : 1 }] })}
    >
      <Glas hell={f.hell} style={[{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }, f.hell ? leuchten("#3C2C18", 0.08, 8, 2) : null]}>
        <Icon name={icon} sf={sf} size={19} color={farbe ?? f.text} weight="semibold" />
      </Glas>
    </Pressable>
  );
}

/** Glas-Knopf mit Text für den Kopf („Abgeben“). */
export function GlasPille({ titel, icon, farbe, onPress }: { titel: string; icon?: IconName; farbe?: string; onPress: () => void }) {
  const f = useFarbwelt();
  const c = farbe ?? f.orange;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={titel}
      hitSlop={6}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.95 : 1 }] })}
    >
      <Glas hell={f.hell} style={[{ height: 42, borderRadius: 21, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 6 }, f.hell ? leuchten("#3C2C18", 0.08, 8, 2) : null]}>
        {icon ? <Icon name={icon} size={15} color={c} weight="semibold" /> : null}
        <Text style={{ ...schrift.textHalb, fontSize: 15, color: c }}>{titel}</Text>
      </Glas>
    </Pressable>
  );
}

/** Kopf eines Fragen-Bildschirms: links und rechts Knöpfe, in der Mitte Titel und Unterzeile. */
export function FrageKopf({ oben, links, rechts, titel, unter, children }: { oben: number; links: ReactNode; rechts: ReactNode; titel: string; unter?: ReactNode; children?: ReactNode }) {
  const f = useFarbwelt();
  return (
    <View style={{ paddingTop: oben, paddingBottom: 10, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: RAND }}>
        {/* Beide Seiten gleich breit, damit der Titel wirklich mittig steht */}
        <View style={{ flex: 1, alignItems: "flex-start" }}>{links}</View>
        <View style={{ maxWidth: "58%", alignItems: "center", gap: 4 }}>
          <Text style={{ ...schrift.titelFett, fontSize: 17, color: f.text, fontVariant: ["tabular-nums"] }} numberOfLines={1}>
            {titel}
          </Text>
          {unter}
        </View>
        <View style={{ flex: 1, alignItems: "flex-end" }}>{rechts}</View>
      </View>
      {children}
    </View>
  );
}

/**
 * Nummern aller Fragen der Prüfung zum Springen: orange die aktuelle, hell
 * gefüllt die beantworteten, nur umrandet die offenen.
 */
export function FragenNavigator({ anzahl, aktiv, erledigt, onWahl }: { anzahl: number; aktiv: number; erledigt: (i: number) => boolean; onWahl: (i: number) => void }) {
  const f = useFarbwelt();
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const G = 38;
  const A = 8;

  // Die aktuelle Nummer bleibt sichtbar, möglichst in der Mitte.
  useEffect(() => {
    const x = RAND + aktiv * (G + A) - (width - G) / 2;
    scroll.current?.scrollTo({ x: Math.max(0, x), animated: true });
  }, [aktiv, width]);

  return (
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: RAND, paddingVertical: 6, gap: A }}>
      {Array.from({ length: anzahl }, (_, i) => {
        const ist = i === aktiv;
        const fertig = erledigt(i);
        return (
          <Pressable
            key={i}
            onPress={() => {
              tippen();
              onWahl(i);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Frage ${i + 1}${fertig ? ", beantwortet" : ""}`}
            accessibilityState={{ selected: ist }}
            style={({ pressed }) => [
              {
                width: G,
                height: G,
                borderRadius: 13,
                alignItems: "center",
                justifyContent: "center",
                transform: [{ scale: pressed ? 0.92 : 1 }],
              },
              ist
                ? leuchten(f.orange, f.hell ? 0.35 : 0.5, 8, 2)
                : fertig
                  ? f.hell
                    ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.08, 6, 2) }
                    : { backgroundColor: "rgba(255,255,255,0.11)" }
                  : { borderWidth: 1.5, borderColor: f.hell ? "rgba(20,23,27,0.11)" : "rgba(255,255,255,0.11)" },
            ]}
          >
            {ist ? <LinearGradient colors={verlauf.knopf} style={[FUELLEN, { borderRadius: 13 }]} /> : null}
            <Text style={{ ...schrift.textHalb, fontSize: 14, color: ist ? "#FFFFFF" : fertig ? f.text : f.text3, fontVariant: ["tabular-nums"] }}>{i + 1}</Text>
            {fertig && !ist ? <View style={{ position: "absolute", top: 5, right: 5, width: 5, height: 5, borderRadius: 3, backgroundColor: f.orange }} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Kleine Kapsel mit Symbol – Thema, Timer, Status. */
export function Kapsel({ icon, text, farbe, gefuellt }: { icon?: IconName; text: string; farbe?: string; gefuellt?: boolean }) {
  const f = useFarbwelt();
  const c = farbe ?? f.orange;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        maxWidth: "100%",
        height: 24,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: gefuellt ? c : mitDeckkraft(c, f.hell ? 0.1 : 0.14),
        borderWidth: gefuellt ? 0 : 1,
        borderColor: mitDeckkraft(c, 0.32),
      }}
    >
      {icon ? <Icon name={icon} size={12} color={gefuellt ? "#FFFFFF" : c} /> : null}
      <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 12, color: gefuellt ? "#FFFFFF" : c, flexShrink: 1, fontVariant: ["tabular-nums"] }}>
        {text}
      </Text>
    </View>
  );
}

export type Segment = "offen" | "aktiv" | "richtig" | "falsch";

/**
 * Fortschritt als Segmente – je Frage eins: grün richtig, rot falsch, orange die
 * aktuelle. Bei sehr vielen Fragen ein durchgehender Balken.
 */
export function FragenFortschritt({ segmente }: { segmente: Segment[] }) {
  const f = useFarbwelt();
  const spur = f.hell ? "rgba(20,23,27,0.08)" : "rgba(255,255,255,0.09)";
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const rot = f.hell ? "#E5392C" : "#FF5A4E";
  if (segmente.length > 30) {
    const fertig = segmente.filter((s) => s === "richtig" || s === "falsch").length;
    return (
      <View style={{ height: 6, borderRadius: 3, backgroundColor: spur, overflow: "hidden" }}>
        <LinearGradient colors={verlauf.balken} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: `${Math.max(3, (fertig / segmente.length) * 100)}%`, height: "100%", borderRadius: 3 }} />
      </View>
    );
  }
  return (
    <View style={{ flexDirection: "row", gap: segmente.length > 16 ? 3 : 4, height: 6 }}>
      {segmente.map((s, i) => (
        <View
          key={i}
          style={[
            { flex: 1, borderRadius: 3, backgroundColor: s === "richtig" ? gruen : s === "falsch" ? rot : s === "aktiv" ? f.orange : spur },
            s === "aktiv" ? leuchten(f.orange, 0.6, 5, 0) : null,
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Großer orangefarbener Knopf mit Schein und einem Glanz, der ab und zu
 * darüberläuft. Ausgegraut, solange er noch nicht geht.
 */
export function HauptKnopf({ titel, icon, onPress, deaktiviert, style }: { titel: string; icon?: IconName; onPress: () => void; deaktiviert?: boolean; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  const [breite, setBreite] = useState(0);
  const glanz = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (deaktiviert) return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(glanz, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(glanz, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [glanz, deaktiviert]);

  const x = glanz.interpolate({ inputRange: [0, 1], outputRange: [-120, breite + 40] });
  return (
    <Pressable
      disabled={deaktiviert}
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={titel}
      accessibilityState={{ disabled: deaktiviert }}
      onLayout={(e) => setBreite(e.nativeEvent.layout.width)}
      style={({ pressed }) => [
        { height: 56, borderRadius: 28, transform: [{ scale: pressed ? 0.98 : 1 }] },
        deaktiviert ? null : leuchten(f.orange, f.hell ? 0.3 : 0.45, 16, 6),
        style,
      ]}
    >
      <View style={{ flex: 1, borderRadius: 28, overflow: "hidden" }}>
        {deaktiviert ? (
          <View style={[FUELLEN, { backgroundColor: f.hell ? "#E6E1D8" : "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.08)", borderRadius: 28 }]} />
        ) : (
          <>
            <LinearGradient colors={verlauf.knopf} locations={[0, 0.5, 1]} style={FUELLEN} />
            <LinearGradient colors={verlauf.knopfSchein} locations={[0, 0.1, 0.25, 0.36]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={FUELLEN} />
            {breite > 0 ? (
              <Animated.View pointerEvents="none" style={{ position: "absolute", top: -10, bottom: -10, width: 80, transform: [{ translateX: x }, { skewX: "-20deg" }] }}>
                <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.32)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
              </Animated.View>
            ) : null}
          </>
        )}
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }}>
          <Text style={{ ...schrift.textFett, fontSize: 17, color: deaktiviert ? f.text3 : "#FFFFFF" }}>{titel}</Text>
          {icon ? <Icon name={icon} size={19} color={deaktiviert ? f.text3 : "#FFFFFF"} weight="semibold" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Zweiter Knopf neben dem Hauptknopf – ruhig, auf Glas. */
export function NebenKnopf({ titel, icon, onPress, deaktiviert, style }: { titel?: string; icon?: IconName; onPress: () => void; deaktiviert?: boolean; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <Pressable
      disabled={deaktiviert}
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={titel}
      style={({ pressed }) => [{ height: 56, borderRadius: 28, opacity: deaktiviert ? 0.4 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}
    >
      <Glas hell={f.hell} style={[{ flex: 1, borderRadius: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 }, f.hell ? leuchten("#3C2C18", 0.08, 10, 3) : null]}>
        {icon ? <Icon name={icon} size={18} color={f.text} weight="semibold" /> : null}
        {titel ? <Text style={{ ...schrift.textHalb, fontSize: 16, color: f.text }}>{titel}</Text> : null}
      </Glas>
    </Pressable>
  );
}

/** Untere Leiste: Inhalt läuft weich darunter aus, darauf die Knöpfe. */
export function AktionsLeiste({ unten, children }: { unten: number; children: ReactNode }) {
  const f = useFarbwelt();
  return (
    <View style={{ paddingHorizontal: RAND, paddingTop: 12, paddingBottom: unten + 10 }}>
      <LinearGradient pointerEvents="none" colors={[mitDeckkraft(f.grund, 0), mitDeckkraft(f.grund, 0.92), f.grund]} locations={[0, 0.35, 1]} style={[FUELLEN, { top: -26 }]} />
      <View style={{ flexDirection: "row", gap: 12 }}>{children}</View>
    </View>
  );
}
