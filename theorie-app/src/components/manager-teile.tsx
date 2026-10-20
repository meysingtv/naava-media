import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, Text, TextInput, View, type PressableStateCallbackType, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Icon, type IconName } from "@/components/icon";
import { useFarbwelt, type Farbwelt } from "@/lib/darstellung";
import { ROLLE_TEXT, STATUS_TEXT, type Rolle, type ZugangStatus } from "@/lib/manager";
import { leuchten, mitDeckkraft, schrift, verlauf } from "@/lib/theme";

// Bausteine des Managers (Web-Panel): Karten, Plaketten, Felder, ein Blatt von
// rechts und ein Fenster in der Mitte – im Look der App, aber für Maus und
// große Bildschirme gemacht (Hover, Tabellen, breitere Abstände).

/** Hover gibt es nur im Browser – React Native kennt den Zustand nicht. */
export type Zustand = PressableStateCallbackType & { hovered?: boolean };

export const ROT_HELL = "#E5392C";
export const ROT_DUNKEL = "#FF4A3D";
export const GELB = "#E59B00";
export const BLAU = "#3B8EF0";

export function rotVon(f: Farbwelt): string {
  return f.hell ? ROT_HELL : ROT_DUNKEL;
}

/** Fläche einer Karte im Manager: hell weiß mit weichem Schatten, dunkel mit Kante. */
export function mFlaeche(f: Farbwelt): ViewStyle {
  return f.hell
    ? { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(28,22,14,0.06)", ...leuchten("#3C2C18", 0.06, 14, 4) }
    : { backgroundColor: f.flaeche, borderWidth: 1, borderColor: f.linie };
}

export function MKarte({ children, style, titel, rechts }: { children: ReactNode; style?: StyleProp<ViewStyle>; titel?: string; rechts?: ReactNode }) {
  const f = useFarbwelt();
  return (
    <View style={[{ borderRadius: 22, padding: 20 }, mFlaeche(f), style]}>
      {titel ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 42, marginTop: -8, marginBottom: 8, gap: 10 }}>
          <Text style={{ ...schrift.titelFett, fontSize: 16.5, color: f.text }}>{titel}</Text>
          {rechts}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Kleine Zahl-Kachel für die Übersicht. */
export function ZahlKachel({ icon, farbe, wert, titel, unter, onPress }: { icon: IconName; farbe: string; wert: string | number; titel: string; unter?: string; onPress?: () => void }) {
  const f = useFarbwelt();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={(z: Zustand) => [
        { flex: 1, minWidth: 180, borderRadius: 22, padding: 18, gap: 14 },
        mFlaeche(f),
        z.hovered && onPress ? { transform: [{ translateY: -2 }], ...leuchten(f.hell ? "#3C2C18" : "#000000", f.hell ? 0.1 : 0.5, 18, 8) } : null,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <LinearGradient colors={[mitDeckkraft(farbe, 0.95), mitDeckkraft(farbe, 0.72)]} style={{ width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={19} color="#FFFFFF" />
        </LinearGradient>
        {onPress ? <Icon name="arrow-forward" size={16} color={f.text3} /> : null}
      </View>
      <View style={{ gap: 2 }}>
        <Text style={{ ...schrift.titel, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: f.text, fontVariant: ["tabular-nums"] }}>{wert}</Text>
        <Text style={{ ...schrift.textHalb, fontSize: 14, color: f.text }}>{titel}</Text>
        {unter ? <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }}>{unter}</Text> : null}
      </View>
    </Pressable>
  );
}

export function statusFarbe(f: Farbwelt, s: ZugangStatus): string {
  return s === "aktiv" ? f.gruen : s === "pausiert" ? GELB : rotVon(f);
}

/** Status als kleine Kapsel mit Punkt. */
export function StatusPlakette({ status, bis }: { status: ZugangStatus; bis?: string | null }) {
  const f = useFarbwelt();
  const c = statusFarbe(f, status);
  const text = status === "pausiert" && bis ? `Pausiert bis ${new Date(bis).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}` : STATUS_TEXT[status];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: mitDeckkraft(c, f.hell ? 0.1 : 0.16) }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c }} />
      <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: c }} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export function RolleMarke({ rolle, inhaber }: { rolle: Rolle; inhaber?: boolean }) {
  const f = useFarbwelt();
  const c = inhaber ? f.orange : rolle === "fahrlehrer" ? BLAU : f.text2;
  const icon: IconName = inhaber ? "star" : rolle === "fahrlehrer" ? "school" : "person";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", height: 26, paddingHorizontal: 9, borderRadius: 8, backgroundColor: inhaber || rolle === "fahrlehrer" ? mitDeckkraft(c.startsWith("#") ? c : "#888888", f.hell ? 0.1 : 0.16) : f.hell ? "rgba(20,23,27,0.05)" : "rgba(255,255,255,0.06)" }}>
      <Icon name={icon} size={12} color={c} />
      <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: c }}>{inhaber ? "Inhaber" : ROLLE_TEXT[rolle]}</Text>
    </View>
  );
}

/** Feld mit Beschriftung darüber. */
export function Feld({ titel, hinweis, children, style }: { titel: string; hinweis?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <View style={[{ gap: 7 }, style]}>
      <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.text2 }}>{titel}</Text>
      {children}
      {hinweis ? <Text style={{ ...schrift.text, fontSize: 12.5, lineHeight: 17, color: f.text3 }}>{hinweis}</Text> : null}
    </View>
  );
}

/** Eingabefeld im Manager: etwas niedriger als in der App, mit Fokus-Rahmen in Orange. */
export function MEingabe({ icon, rechts, mehrzeilig, ...props }: TextInputProps & { icon?: IconName; rechts?: ReactNode; mehrzeilig?: boolean }) {
  const f = useFarbwelt();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: mehrzeilig ? "flex-start" : "center",
        gap: 10,
        minHeight: mehrzeilig ? 92 : 46,
        paddingHorizontal: 14,
        paddingVertical: mehrzeilig ? 12 : 0,
        borderRadius: 14,
        backgroundColor: f.hell ? "#FFFFFF" : f.flaeche2,
        borderWidth: 1,
        borderColor: f.hell ? "rgba(20,23,27,0.12)" : f.linieStark,
      }}
    >
      {icon ? <Icon name={icon} size={17} color={f.text3} /> : null}
      <TextInput
        placeholderTextColor={f.hell ? "#A3A8AF" : "#5C626A"}
        selectionColor={f.orange}
        multiline={mehrzeilig}
        {...props}
        style={[{ flex: 1, minWidth: 0, ...schrift.textMittel, fontSize: 15, color: f.text, minHeight: mehrzeilig ? 68 : 44 }, mehrzeilig ? { textAlignVertical: "top" } : null, props.style]}
      />
      {rechts}
    </View>
  );
}

/** Knopf im Manager (kompakter als in der App, mit Hover). */
export function MKnopf({
  titel,
  icon,
  onPress,
  art = "primaer",
  laedt,
  deaktiviert,
  style,
}: {
  titel: string;
  icon?: IconName;
  onPress: () => void;
  art?: "primaer" | "sekundaer" | "gefahr" | "leise";
  laedt?: boolean;
  deaktiviert?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const f = useFarbwelt();
  const rot = rotVon(f);
  const vorder = art === "primaer" ? "#FFFFFF" : art === "gefahr" ? rot : art === "leise" ? f.text2 : f.text;
  const aus = deaktiviert || laedt;
  return (
    <Pressable
      onPress={onPress}
      disabled={aus}
      accessibilityRole="button"
      accessibilityLabel={titel}
      style={(z: Zustand) => [
        {
          height: 42,
          paddingHorizontal: 16,
          borderRadius: 21,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          overflow: "hidden",
          opacity: deaktiviert ? 0.45 : 1,
          transform: [{ scale: z.pressed && !aus ? 0.97 : 1 }],
        },
        art === "primaer" ? leuchten(f.orange, z.hovered && !aus ? 0.5 : 0.32, z.hovered && !aus ? 14 : 10, 4) : null,
        art === "sekundaer"
          ? { backgroundColor: z.hovered ? (f.hell ? "#F6F3EE" : "rgba(255,255,255,0.1)") : f.hell ? "#FFFFFF" : "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: f.hell ? "rgba(20,23,27,0.12)" : f.linieStark }
          : null,
        art === "gefahr" ? { backgroundColor: mitDeckkraft(rot, z.hovered ? 0.18 : f.hell ? 0.09 : 0.14) } : null,
        art === "leise" ? { backgroundColor: z.hovered ? (f.hell ? "rgba(20,23,27,0.05)" : "rgba(255,255,255,0.07)") : "transparent" } : null,
        style,
      ]}
    >
      {art === "primaer" ? <LinearGradient colors={verlauf.knopf} locations={[0, 0.5, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} /> : null}
      {laedt ? (
        <Drehung farbe={vorder} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={16} color={vorder} /> : null}
          <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: vorder }} numberOfLines={1}>
            {titel}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Kleiner Lade-Kreis. */
export function Drehung({ farbe, groesse = 16 }: { farbe: string; groesse?: number }) {
  const dreh = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(dreh, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [dreh]);
  const rotate = dreh.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return <Animated.View style={{ width: groesse, height: groesse, borderRadius: groesse / 2, borderWidth: 2, borderColor: mitDeckkraft(farbe.startsWith("#") ? farbe : "#FFFFFF", 0.25), borderTopColor: farbe, transform: [{ rotate }] }} />;
}

/** Auswahl als Reihe von Kapseln (statt Dropdown). */
export function Auswahl<W extends string>({ optionen, wert, onWechsel }: { optionen: { id: W; titel: string; icon?: IconName }[]; wert: W; onWechsel: (w: W) => void }) {
  const f = useFarbwelt();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {optionen.map((o) => {
        const aktiv = o.id === wert;
        return (
          <Pressable
            key={o.id}
            onPress={() => onWechsel(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: aktiv }}
            style={(z: Zustand) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              height: 36,
              paddingHorizontal: 13,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: aktiv ? f.orange : f.hell ? "rgba(20,23,27,0.12)" : f.linieStark,
              backgroundColor: aktiv ? f.orangeSoft : z.hovered ? (f.hell ? "#F6F3EE" : "rgba(255,255,255,0.07)") : f.hell ? "#FFFFFF" : "transparent",
            })}
          >
            {o.icon ? <Icon name={o.icon} size={14} color={aktiv ? f.orange : f.text2} /> : null}
            <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: aktiv ? f.orange : f.text2 }}>{o.titel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Hinweis-Zeile in einer getönten Fläche (Fehler, Info, Erfolg). */
export function Hinweis({ art = "info", children }: { art?: "info" | "fehler" | "ok"; children: ReactNode }) {
  const f = useFarbwelt();
  const c = art === "fehler" ? rotVon(f) : art === "ok" ? f.gruen : BLAU;
  const icon: IconName = art === "fehler" ? "alert-circle" : art === "ok" ? "checkmark-circle" : "information-circle";
  return (
    <View style={{ flexDirection: "row", gap: 10, padding: 12, borderRadius: 14, backgroundColor: mitDeckkraft(c, f.hell ? 0.08 : 0.13), alignItems: "flex-start" }}>
      <Icon name={icon} size={18} color={c} />
      <Text style={{ flex: 1, ...schrift.textMittel, fontSize: 13.5, lineHeight: 19, color: f.text }}>{children}</Text>
    </View>
  );
}

/** Fenster in der Mitte mit abgedunkeltem Hintergrund. */
export function Fenster({ offen, onSchliessen, titel, unter, breite = 560, children }: { offen: boolean; onSchliessen: () => void; titel: string; unter?: string; breite?: number; children: ReactNode }) {
  const f = useFarbwelt();
  return (
    <Modal visible={offen} transparent animationType="fade" onRequestClose={onSchliessen}>
      <Pressable onPress={onSchliessen} style={{ flex: 1, backgroundColor: "rgba(6,8,12,0.55)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Pressable
          onPress={() => {}}
          style={[{ width: "100%", maxWidth: breite, maxHeight: "100%", borderRadius: 26, overflow: "hidden" }, f.hell ? { backgroundColor: "#FBFAF7", ...leuchten("#1C140A", 0.25, 30, 14) } : { backgroundColor: "#0D1317", borderWidth: 1, borderColor: f.linieStark, ...leuchten("#000000", 0.6, 30, 14) }]}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 6 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ ...schrift.titel, fontSize: 22, letterSpacing: -0.4, color: f.text }}>{titel}</Text>
              {unter ? <Text style={{ ...schrift.text, fontSize: 14, color: f.text3 }}>{unter}</Text> : null}
            </View>
            <SchliessenTaste onPress={onSchliessen} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 14, gap: 18 }}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function SchliessenTaste({ onPress }: { onPress: () => void }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Schließen"
      style={(z: Zustand) => ({ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: z.hovered ? (f.hell ? "rgba(20,23,27,0.08)" : "rgba(255,255,255,0.1)") : f.hell ? "rgba(20,23,27,0.04)" : "rgba(255,255,255,0.05)" })}
    >
      <Icon name="close" size={19} color={f.text2} />
    </Pressable>
  );
}

/** Blatt, das von rechts hereinfährt (Details eines Zugangs). */
export function SeitenBlatt({ offen, onSchliessen, children }: { offen: boolean; onSchliessen: () => void; children: ReactNode }) {
  const f = useFarbwelt();
  const x = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: offen ? 0 : 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [offen, x]);
  return (
    <Modal visible={offen} transparent animationType="fade" onRequestClose={onSchliessen}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <Pressable onPress={onSchliessen} style={{ flex: 1, backgroundColor: "rgba(6,8,12,0.45)" }} accessibilityLabel="Schließen" />
        <Animated.View
          style={[
            { width: 500, maxWidth: "100%", height: "100%", transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 520] }) }] },
            f.hell ? { backgroundColor: "#FBFAF7", ...leuchten("#1C140A", 0.22, 30, 0) } : { backgroundColor: "#0B1014", borderLeftWidth: 1, borderLeftColor: f.linieStark },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

/** „vor 3 Tagen“ – für „Zuletzt aktiv“. */
export function wannText(iso: string | null): string {
  if (!iso) return "noch nie";
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 90) return "gerade eben";
  if (s < 3600) return `vor ${Math.round(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.round(s / 3600)} Std.`;
  const t = Math.round(s / 86400);
  if (t === 1) return "gestern";
  if (t < 30) return `vor ${t} Tagen`;
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function datumText(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}
