import { type ReactNode } from "react";
import { Pressable, ScrollView, Text, View, type PressableStateCallbackType, type StyleProp, type ViewStyle } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { useFarbwelt, type Farbwelt } from "@/lib/darstellung";
import { useFenster } from "@/lib/fenster";
import { leuchten, schrift } from "@/lib/theme";

// Bausteine für die PC-Ansicht im Browser: Seite über die ganze Breite mit
// großzügigen Rändern, Kopf mit großem Titel, Karten und Abschnitte mit Hover.
// Farben und Formen wie in der App, Aufteilung für Querformat und Maus.

/** Hover gibt es nur im Browser – React Native kennt den Zustand nicht. */
export type Zustand = PressableStateCallbackType & { hovered?: boolean };

/** Größte Breite des Inhalts auf sehr breiten Bildschirmen. */
export const DESKTOP_MAX = 1600;
/** Rand links und rechts. */
export const DESKTOP_RAND = 40;
/** Abstand zwischen Spalten und Karten. */
export const LUECKE = 24;

/** Breite, die einer Seite innen zur Verfügung steht. */
export function useDesktopBreite(): number {
  const { width } = useFenster();
  return Math.min(width - 2 * DESKTOP_RAND, DESKTOP_MAX);
}

/** Kartenfläche am PC: hell weiß mit weichem Schatten, dunkel mit feiner Kante. */
export function dFlaeche(f: Farbwelt, schwebt?: boolean): ViewStyle {
  return f.hell
    ? { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(28,22,14,0.06)", ...leuchten("#3C2C18", schwebt ? 0.13 : 0.06, schwebt ? 20 : 14, schwebt ? 10 : 4) }
    : { backgroundColor: f.flaeche, borderWidth: 1, borderColor: schwebt ? f.linieStark : f.linie, ...(schwebt ? leuchten("#000000", 0.5, 20, 10) : null) };
}

/** Scrollende Seite mit Rand und mittiger Höchstbreite. */
export function DesktopSeite({ children, gap = 32 }: { children: ReactNode; gap?: number }) {
  const f = useFarbwelt();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: f.grund }} contentContainerStyle={{ paddingHorizontal: DESKTOP_RAND, paddingTop: 34, paddingBottom: 64 }}>
      <View style={{ width: "100%", maxWidth: DESKTOP_MAX, alignSelf: "center", gap }}>{children}</View>
    </ScrollView>
  );
}

/** Kopf einer Seite: kleine Zeile, großer Titel, rechts Knöpfe. */
export function DesktopKopf({ ueber, titel, unter, rechts }: { ueber?: string; titel: string; unter?: string; rechts?: ReactNode }) {
  const f = useFarbwelt();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
      <View style={{ flex: 1, minWidth: 320, gap: 4 }}>
        {ueber ? <Text style={{ ...schrift.textHalb, fontSize: 14, color: f.text3 }}>{ueber}</Text> : null}
        <Text style={{ ...schrift.titel, fontSize: 38, lineHeight: 44, letterSpacing: -0.8, color: f.text }}>{titel}</Text>
        {unter ? <Text style={{ ...schrift.text, fontSize: 16, lineHeight: 22, color: f.text2 }}>{unter}</Text> : null}
      </View>
      {rechts ? <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>{rechts}</View> : null}
    </View>
  );
}

/** Abschnitt mit Überschrift und optionalem Link rechts. */
export function DesktopAbschnitt({ titel, link, onLink, children, style }: { titel: string; link?: string; onLink?: () => void; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <View style={[{ gap: 14 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 30 }}>
        <Text style={{ ...schrift.titel, fontSize: 22, letterSpacing: -0.3, color: f.text }}>{titel}</Text>
        {link && onLink ? (
          <Pressable onPress={onLink} style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: z.hovered ? (f.hell ? "rgba(20,23,27,0.05)" : "rgba(255,255,255,0.07)") : "transparent" })}>
            <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.text2 }}>{link}</Text>
            <Icon name="chevron-forward" size={15} color={f.text2} />
          </Pressable>
        ) : link ? (
          <Text style={{ ...schrift.textMittel, fontSize: 14.5, color: f.text3 }}>{link}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Karte; mit onPress hebt sie sich beim Drüberfahren leicht an. */
export function DKarte({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const f = useFarbwelt();
  if (!onPress) return <View style={[{ borderRadius: 26, padding: 24 }, dFlaeche(f), style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={(z: Zustand) => [{ borderRadius: 26, padding: 24 }, dFlaeche(f, z.hovered), z.hovered ? { transform: [{ translateY: -2 }] } : null, z.pressed ? { transform: [{ scale: 0.99 }] } : null, style]}
    >
      {children}
    </Pressable>
  );
}

/** Kapsel-Knopf für den Kopf (z. B. Prüfungstermin). */
export function KopfKapsel({ icon, text, onPress, farbe }: { icon: IconName; text: string; onPress: () => void; farbe?: string }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={(z: Zustand) => [{ flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 16, borderRadius: 22 }, dFlaeche(f, z.hovered)]}
    >
      <Icon name={icon} size={17} color={farbe ?? f.orange} />
      <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.text }}>{text}</Text>
    </Pressable>
  );
}

/** Runde Taste für den Kopf (Glocke, Einstellungen …). */
export function KopfRund({ icon, label, onPress, punkt }: { icon: IconName; label: string; onPress: () => void; punkt?: boolean }) {
  const f = useFarbwelt();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={(z: Zustand) => [{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, dFlaeche(f, z.hovered)]}>
      <Icon name={icon} size={19} color={f.text} />
      {punkt ? <View style={{ position: "absolute", top: 10, right: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: f.orange, borderWidth: 1.5, borderColor: f.hell ? "#FFFFFF" : f.flaeche }} /> : null}
    </Pressable>
  );
}
