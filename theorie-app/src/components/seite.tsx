import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFenster } from "@/lib/fenster";
import { Ring } from "@/components/grafik";
import { kartenFlaeche, kopfOben, KopfTaste, zurueck } from "@/components/ui";
import { FarbweltBereich, NACHT, useDarstellung, useFarbwelt } from "@/lib/darstellung";
import { mitDeckkraft, RAND, schrift, verlauf } from "@/lib/theme";

// Rahmen für Unterseiten im Kino-Look: Seite legt die Farbwelt fest (hell oder
// dunkel wie eingestellt), FotoKopf ist ein Titelfoto mit Glas-Knöpfen, das
// unten in den Grund ausläuft, GrossKopf ein großer Titel ohne Foto.

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

/** Farbwelt, Statusleiste und Grund einer Unterseite. `dunkel` hält sie immer dunkel. */
export function Seite({ children, dunkel }: { children: ReactNode; dunkel?: boolean }) {
  const { farbwelt } = useDarstellung();
  const f = dunkel ? NACHT : farbwelt;
  const fokus = useIsFocused();
  return (
    <FarbweltBereich farbwelt={f}>
      {fokus ? <StatusBar style={f.hell ? "dark" : "light"} /> : null}
      <View style={{ flex: 1, backgroundColor: f.grund }}>{children}</View>
    </FarbweltBereich>
  );
}

/**
 * Titelfoto über die ganze Breite: fährt langsam heran, oben Glas-Knöpfe, unten
 * läuft es in den Grund aus – dort stehen Titel und Unterzeile.
 */
export function FotoKopf({
  bild,
  hoehe = 250,
  titel,
  unter,
  ueber,
  schliessen,
  onZurueck,
  ohneZurueck,
  rechts,
  children,
}: {
  bild: ImageSourcePropType;
  /** Höhe ohne den oberen Rand (Statusleiste). */
  hoehe?: number;
  titel: string;
  unter?: string;
  /** Kleine Zeile über dem Titel (z. B. eine Kapsel). */
  ueber?: ReactNode;
  schliessen?: boolean;
  onZurueck?: () => void;
  ohneZurueck?: boolean;
  rechts?: ReactNode;
  /** Weitere Inhalte unter dem Titel (z. B. Werte). */
  children?: ReactNode;
}) {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const { width } = useFenster();
  const h = insets.top + hoehe;
  const fahrt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(fahrt, { toValue: 1, duration: 16000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(fahrt, { toValue: 0, duration: 16000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [fahrt]);

  const grund = (a: number) => mitDeckkraft(f.grund, a);
  const scale = fahrt.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1.13] });

  return (
    <View>
      <View style={{ width, height: h, overflow: "hidden", backgroundColor: f.grund }}>
        <Animated.Image source={bild} resizeMode="cover" fadeDuration={0} style={{ position: "absolute", width, height: h, transform: [{ scale }] }} />
        <View style={[FUELLEN, { backgroundColor: f.hell ? "rgba(244,241,236,0.1)" : "rgba(3,5,7,0.28)" }]} />
        {/* Oben etwas Grund für Statusleiste und Knöpfe, unten weich in den Grund */}
        <LinearGradient colors={[grund(f.hell ? 0.75 : 0.7), grund(0)]} locations={[0, 0.34]} style={FUELLEN} />
        <LinearGradient colors={[grund(0), grund(0.5), grund(0.88), f.grund]} locations={[0.42, 0.66, 0.86, 1]} style={[FUELLEN, { bottom: -1 }]} />
        <View style={{ position: "absolute", top: kopfOben(insets.top), left: RAND, right: RAND, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          {ohneZurueck ? <View /> : <KopfTaste icon={schliessen ? "close" : "chevron-back"} label={schliessen ? "Schließen" : "Zurück"} onPress={onZurueck ?? zurueck} />}
          <View style={{ flexDirection: "row", gap: 10 }}>{rechts}</View>
        </View>
        <View style={{ position: "absolute", left: RAND, right: RAND, bottom: 10, gap: 4 }}>
          {ueber}
          <Text style={{ ...schrift.titel, fontSize: 32, lineHeight: 38, letterSpacing: -0.5, color: f.text }} numberOfLines={2}>
            {titel}
          </Text>
          {unter ? (
            <Text style={{ ...schrift.textMittel, fontSize: 15, lineHeight: 20, color: f.text2 }} numberOfLines={2}>
              {unter}
            </Text>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );
}

export type StandWert = { wert: string | number; label: string; farbe?: string };

/** Karte mit leuchtendem Ring (Anteil) und daneben zwei bis drei Werten. */
export function StandKarte({ anteil, werte, ringText, style }: { anteil: number; werte: StandWert[]; ringText?: string; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingLeft: 14, paddingRight: 6, borderRadius: 24 }, kartenFlaeche(f), style]}>
      <Ring anteil={anteil} groesse={64} dicke={6} verlauf={verlauf.ring} spur={f.hell ? "rgba(20,23,27,0.08)" : "rgba(255,255,255,0.12)"} leuchten>
        <Text style={{ ...schrift.titel, fontSize: 16, color: f.text, fontVariant: ["tabular-nums"] }}>{ringText ?? `${Math.round(anteil * 100)}%`}</Text>
      </Ring>
      {werte.map((w, i) => (
        <View key={w.label} style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          {i > 0 ? <View style={{ width: 1, alignSelf: "stretch", marginVertical: 6, backgroundColor: f.linie }} /> : null}
          <View style={{ flex: 1, alignItems: "center", gap: 1 }}>
            <Text style={{ ...schrift.titel, fontSize: 21, lineHeight: 26, color: w.farbe ?? f.text, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {w.wert}
            </Text>
            <Text style={{ ...schrift.textMittel, fontSize: 12, color: f.text3 }} numberOfLines={1}>
              {w.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Zwei bis vier Werte nebeneinander in einer Karte, getrennt durch feine Linien. */
export function WerteReihe({ werte, style }: { werte: StandWert[]; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 4, borderRadius: 22 }, kartenFlaeche(f), style]}>
      {werte.map((w, i) => (
        <View key={w.label} style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          {i > 0 ? <View style={{ width: 1, alignSelf: "stretch", marginVertical: 4, backgroundColor: f.linie }} /> : null}
          <View style={{ flex: 1, alignItems: "center", gap: 1 }}>
            <Text style={{ ...schrift.titel, fontSize: 20, lineHeight: 25, color: w.farbe ?? f.text, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {w.wert}
            </Text>
            <Text style={{ ...schrift.textMittel, fontSize: 12, color: f.text3 }} numberOfLines={1}>
              {w.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Kopf ohne Foto: Glas-Knopf oben, darunter ein großer Titel wie auf den Tabs. */
export function GrossKopf({
  titel,
  unter,
  schliessen,
  onZurueck,
  ohneZurueck,
  rechts,
}: {
  titel: string;
  unter?: string;
  schliessen?: boolean;
  onZurueck?: () => void;
  ohneZurueck?: boolean;
  rechts?: ReactNode;
}) {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: kopfOben(insets.top), paddingHorizontal: RAND, paddingBottom: 6, gap: 12 }}>
      <View style={{ minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {ohneZurueck ? <View /> : <KopfTaste icon={schliessen ? "close" : "chevron-back"} label={schliessen ? "Schließen" : "Zurück"} onPress={onZurueck ?? zurueck} />}
        <View style={{ flexDirection: "row", gap: 10 }}>{rechts}</View>
      </View>
      <View style={{ gap: 3 }}>
        <Text style={{ ...schrift.titel, fontSize: 32, lineHeight: 38, letterSpacing: -0.5, color: f.text }}>{titel}</Text>
        {unter ? <Text style={{ ...schrift.textMittel, fontSize: 15, lineHeight: 20, color: f.text2 }}>{unter}</Text> : null}
      </View>
    </View>
  );
}
