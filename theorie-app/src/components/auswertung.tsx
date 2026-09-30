import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Image, Pressable, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";

import { Glas } from "@/components/glas";
import { Ring } from "@/components/grafik";
import { KinoHeld } from "@/components/home";
import { Icon, type IconName } from "@/components/icon";
import { useFarbwelt } from "@/lib/darstellung";
import { themaFoto } from "@/lib/fotos";
import { themaVon, type Frage } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { leuchten, mitDeckkraft, RAND, schrift } from "@/lib/theme";

// Auswertung nach Training und Prüfungssimulation im Kino-Look: Foto oben,
// großer leuchtender Ring, bei der Prüfung ein Stempel, darunter die Fehler.

const VERLAEUFE = {
  orange: ["#FE8324", "#FD5406"],
  gruen: ["#86E88F", "#2DB14A"],
  rot: ["#FF8C7E", "#E5392C"],
} as const;

export type Ton = keyof typeof VERLAEUFE;

/** Foto über die ganze Breite mit Überschrift – darunter sitzt der Ring. */
export function ErgebnisHeld({ bild, oben, hoehe, label, titel, children }: { bild: ImageSourcePropType; oben: number; hoehe: number; label: string; titel: string; children?: ReactNode }) {
  const f = useFarbwelt();
  return (
    <KinoHeld bild={bild} hoehe={hoehe} ausblendenAb={f.hell ? 0.52 : 0.44}>
      <View style={{ position: "absolute", top: oben, left: RAND, right: RAND, alignItems: "center", gap: 2 }}>
        <Text style={{ ...schrift.textFett, fontSize: 12, letterSpacing: 1.6, color: "rgba(255,255,255,0.8)" }}>{label.toUpperCase()}</Text>
        <Text
          style={{ ...schrift.titel, fontSize: 30, lineHeight: 36, color: "#FFFFFF", textAlign: "center", textShadowColor: "rgba(0,0,0,0.45)", textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 } }}
          numberOfLines={2}
        >
          {titel}
        </Text>
      </View>
      <View style={{ position: "absolute", top: oben + 84, left: 0, right: 0, alignItems: "center" }}>{children}</View>
    </KinoHeld>
  );
}

/** Großer Ring mit Glas in der Mitte – fährt beim Öffnen hoch. */
export function ErgebnisRing({ anteil, wert, einheit, unter, ton, spur, groesse = 184 }: { anteil: number; wert: string; einheit?: string; unter: string; ton: Ton; spur?: string; groesse?: number }) {
  const f = useFarbwelt();
  const dicke = 12;
  const innen = groesse - dicke * 2 - 16;
  const auf = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(auf, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }).start();
  }, [auf]);
  const text = f.hell ? "#14171B" : "#FFFFFF";
  return (
    <Animated.View style={{ opacity: auf, transform: [{ scale: auf.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }] }}>
      <Ring anteil={anteil} groesse={groesse} dicke={dicke} verlauf={VERLAEUFE[ton]} spur={spur ?? (f.hell ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.16)")} leuchten>
        <Glas hell={f.hell} style={[{ width: innen, height: innen, borderRadius: innen / 2, alignItems: "center", justifyContent: "center" }, f.hell ? leuchten("#3C2C18", 0.12, 14, 4) : null]}>
          <Text style={{ ...schrift.titel, fontSize: 48, lineHeight: 54, color: text, fontVariant: ["tabular-nums"], letterSpacing: -1 }}>
            {wert}
            {einheit ? <Text style={{ fontSize: 22 }}>{einheit}</Text> : null}
          </Text>
          <Text style={{ ...schrift.textMittel, fontSize: 13, color: f.hell ? "rgba(20,23,27,0.62)" : "rgba(255,255,255,0.72)", marginTop: -2 }}>{unter}</Text>
        </Glas>
      </Ring>
    </Animated.View>
  );
}

/** Stempel „Bestanden“ / „Nicht bestanden“ (oder eigener Text) – knallt nach dem Ring aufs Foto. */
export function Stempel({ bestanden, text, style }: { bestanden: boolean; text?: string; style?: StyleProp<ViewStyle> }) {
  const c = bestanden ? "#4ED053" : "#FF5A4E";
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([Animated.delay(550), Animated.timing(w, { toValue: 1, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true })]).start();
  }, [w]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          opacity: w,
          transform: [{ rotate: "-8deg" }, { scale: w.interpolate({ inputRange: [0, 1], outputRange: [1.9, 1] }) }],
        },
        style,
      ]}
    >
      <View style={[{ padding: 3, borderRadius: 13, borderWidth: 3, borderColor: c, backgroundColor: "rgba(6,8,10,0.62)" }, leuchten(c, 0.45, 14, 0)]}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5, borderColor: mitDeckkraft(c, 0.75) }}>
          <Text style={{ ...schrift.titel, fontSize: text ? 23 : bestanden ? 25 : 21, lineHeight: 30, letterSpacing: 2.5, color: c }}>{text ?? (bestanden ? "BESTANDEN" : "NICHT BESTANDEN")}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export type ErgebnisWert = { icon: IconName; farbe: string; wert: string; label: string };

/** Drei Werte nebeneinander auf Glas, halb über dem Foto. */
export function ErgebnisWerte({ werte, style }: { werte: ErgebnisWert[]; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  const text = f.hell ? "#14171B" : "#FFFFFF";
  return (
    <Glas hell={f.hell} style={[{ borderRadius: 26, flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 4 }, f.hell ? leuchten("#3C2C18", 0.1, 14, 4) : null, style]}>
      {werte.map((w, i) => (
        <View key={w.label} style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          {i > 0 ? <View style={{ width: 1, alignSelf: "stretch", marginVertical: 4, backgroundColor: f.hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.14)" }} /> : null}
          <View style={{ flex: 1, alignItems: "center", gap: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Icon name={w.icon} size={16} color={w.farbe} />
              <Text style={{ ...schrift.titel, fontSize: 19, lineHeight: 24, color: text, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {w.wert}
              </Text>
            </View>
            <Text style={{ ...schrift.textMittel, fontSize: 12, color: f.hell ? "rgba(20,23,27,0.62)" : "rgba(255,255,255,0.72)" }} numberOfLines={1}>
              {w.label}
            </Text>
          </View>
        </View>
      ))}
    </Glas>
  );
}

/** Eine falsch beantwortete Frage: Themenfoto mit rotem Kreuz, Text, Punkte. */
export function FehlerKarte({ frage, onPress, style }: { frage: Frage; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  const rot = f.hell ? "#E5392C" : "#FF5A4E";
  const inhalt = (gedrueckt: boolean) => (
    <View
      style={[
        { flexDirection: "row", alignItems: "center", gap: 13, padding: 12, paddingRight: 14, borderRadius: 22, opacity: gedrueckt ? 0.85 : 1 },
        f.hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.07, 12, 4) } : { backgroundColor: f.flaeche, borderWidth: 1, borderColor: f.linie },
        style,
      ]}
    >
      <View>
        <Image source={themaFoto(frage.thema)} style={{ width: 52, height: 52, borderRadius: 15 }} resizeMode="cover" fadeDuration={0} />
        <View style={{ position: "absolute", right: -5, bottom: -5, width: 22, height: 22, borderRadius: 11, backgroundColor: rot, borderWidth: 2, borderColor: f.hell ? "#FFFFFF" : f.flaeche, alignItems: "center", justifyContent: "center" }}>
          <Icon name="close" size={12} color="#FFFFFF" weight="bold" />
        </View>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ ...schrift.textHalb, fontSize: 15, lineHeight: 20, color: f.text }} numberOfLines={2}>
          {frage.text}
        </Text>
        <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }} numberOfLines={1}>
          {themaVon(frage.thema).titel} · {frage.punkte} Punkte
        </Text>
      </View>
      {onPress ? <Icon name="chevron-forward" size={16} color={f.text3} /> : null}
    </View>
  );
  if (!onPress) return inhalt(false);
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={frage.text}
    >
      {({ pressed }) => inhalt(pressed)}
    </Pressable>
  );
}

/** Karte, wenn alles richtig war. */
export function AllesRichtig({ text, style }: { text: string; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  const gruen = f.hell ? "#23A548" : "#4ED053";
  return (
    <View
      style={[
        { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 22 },
        f.hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.07, 12, 4) } : { backgroundColor: f.flaeche, borderWidth: 1, borderColor: f.linie },
        style,
      ]}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: mitDeckkraft(gruen, 0.14), alignItems: "center", justifyContent: "center" }}>
        <Icon name="trophy" size={21} color={gruen} />
      </View>
      <Text style={{ ...schrift.textHalb, fontSize: 15, lineHeight: 21, color: f.text, flex: 1 }}>{text}</Text>
    </View>
  );
}

/** Ruhiger Zustand ohne Fragen: großes Symbol, Satz, Knopf. */
export function LeerZustand({ icon, titel, text, children }: { icon: IconName; titel: string; text: string; children?: ReactNode }) {
  const f = useFarbwelt();
  return (
    <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: RAND + 8, gap: 22 }}>
      <View style={[{ width: 84, height: 84, borderRadius: 42, backgroundColor: f.orangeSoft, borderWidth: 1, borderColor: mitDeckkraft(f.orange, 0.3), alignItems: "center", justifyContent: "center" }, leuchten(f.orange, 0.25, 18, 0)]}>
        <Icon name={icon} size={38} color={f.orange} />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={{ ...schrift.titel, fontSize: 30, lineHeight: 36, color: f.text }}>{titel}</Text>
        <Text style={{ ...schrift.text, fontSize: 16, lineHeight: 23, color: f.text2 }}>{text}</Text>
      </View>
      {children}
    </View>
  );
}
