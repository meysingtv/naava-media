import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { lilaSchrift } from "@/components/lila-teile";
import { useFenster } from "@/lib/fenster";
import { tippen } from "@/lib/haptik";
import type { QuizSpieler } from "@/lib/live-quiz";

// Abschluss nach dem Live: Szene mit der Figur auf der Straße, „Live beendet“,
// die Zahlen (Zuschauer, Herzen, Nachrichten), „Fertig“ und „Nochmal live
// gehen“. Grafiken aus assets/images/live-ende, Schrift und Zahlen echt.

const BILD = {
  grund: require("../../assets/images/live-ende/grund.jpg"),
  wellen: require("../../assets/images/live-ende/wellen.png"),
  figur: require("../../assets/images/live-ende/figur.png"),
  badge: require("../../assets/images/live-ende/badge.png"),
  karte: require("../../assets/images/live-ende/karte.png"),
  knopf: require("../../assets/images/live-ende/knopf.png"),
  knopfZart: require("../../assets/images/live-ende/knopf-zart.png"),
  auge: require("../../assets/images/live-ende/auge.png"),
  herz: require("../../assets/images/live-ende/herz.png"),
  nachricht: require("../../assets/images/live-ende/nachricht.png"),
  funk: require("../../assets/images/live-ende/funk.png"),
};

const TINTE = "#2E2650";
const LILA = "#7B5CE0";

export type TopChatter = { id: string; name: string; bild_pfad: string | null; anzahl: number };

/** Zahl, die beim Erscheinen von 0 hochzählt. */
function Hochzaehlen({ wert, verzoegerung = 0, style }: { wert: number; verzoegerung?: number; style: object }) {
  const [anzeige, setAnzeige] = useState(0);
  useEffect(() => {
    const a = new Animated.Value(0);
    const id = a.addListener(({ value }) => setAnzeige(Math.round(value * wert)));
    Animated.timing(a, { toValue: 1, duration: 1100, delay: verzoegerung, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => a.removeListener(id);
  }, [wert, verzoegerung]);
  return <Text style={style}>{anzeige.toLocaleString("de-DE")}</Text>;
}

/** Knopf als Grafik mit echtem Text darauf. */
function BildKnopf({ bild, onPress, children, label }: { bild: number; onPress: () => void; children: React.ReactNode; label: string }) {
  const { width } = useFenster();
  const b = Math.min(width, 520) - 48;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: b, height: Math.round((b * 140) / 800), alignSelf: "center", transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <Image source={bild} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} resizeMode="stretch" />
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}>{children}</View>
    </Pressable>
  );
}

export function LiveEnde({
  name,
  zuschauer,
  herzen,
  nachrichten,
  oben,
  unten,
  onFertig,
  onNochmal,
}: {
  name: string;
  bildPfad: string | null | undefined;
  farbe?: string;
  titel: string;
  dauerMs: number;
  zuschauer: number;
  herzen: number;
  nachrichten: number;
  topChatter: TopChatter[];
  /** Die Besten aus dem Live-Quiz (nach der letzten Auflösung). */
  quizSieger?: QuizSpieler[];
  /** Wie viele Quizfragen gestellt wurden. */
  quizFragen?: number;
  oben: number;
  unten: number;
  onFertig: () => void;
  onNochmal: () => void;
}) {
  const { width, height } = useFenster();
  const rein = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rein, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [rein]);
  const auf = (von: number) => ({
    opacity: rein.interpolate({ inputRange: [von, Math.min(1, von + 0.5)], outputRange: [0, 1], extrapolate: "clamp" }),
    transform: [{ translateY: rein.interpolate({ inputRange: [von, Math.min(1, von + 0.5)], outputRange: [16, 0], extrapolate: "clamp" }) }],
  });

  // Hintergrund so legen, dass der Straßenrand bei knapp einem Drittel der Höhe liegt
  const bildH = Math.round((width * 1973) / 900);
  const klein = height < 800;
  const strasse = oben + Math.min(klein ? 240 : 290, height * (klein ? 0.27 : 0.3));
  const bildOben = Math.round(strasse - bildH * 0.54);
  const figurB = Math.min(width * (klein ? 0.5 : 0.58), 300);
  const karteB = Math.min(width, 520) - 48;
  // Ganzer Name, wenn er passt – sonst nur der erste Teil
  const ganz = name.trim();
  const vorname = ganz.length <= 16 ? ganz || "du" : ganz.split(/\s+/)[0];

  const werte = [
    { bild: BILD.auge, wert: zuschauer, label: zuschauer === 1 ? "Zuschauer" : "Zuschauer" },
    { bild: BILD.herz, wert: herzen, label: "Herzen" },
    { bild: BILD.nachricht, wert: nachrichten, label: nachrichten === 1 ? "Nachricht" : "Nachrichten" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#EFE8FE" }}>
      {/* Szene */}
      <Image source={BILD.grund} style={{ position: "absolute", top: bildOben, left: 0, width, height: bildH }} resizeMode="cover" />
      <Image source={BILD.wellen} style={{ position: "absolute", left: 0, right: 0, bottom: 0, width, height: Math.round((width * 340) / 1170) }} resizeMode="stretch" />

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: oben, paddingBottom: unten + 12, alignItems: "center" }} showsVerticalScrollIndicator={false}>
        {/* „Live beendet“ */}
        <Animated.View style={[{ width: 220, height: 44, justifyContent: "center", alignItems: "center" }, auf(0)]}>
          <Image source={BILD.badge} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} resizeMode="stretch" />
          <Text style={{ ...lilaSchrift.titel, fontSize: 20, letterSpacing: 0.6, color: TINTE, marginLeft: 22 }}>LIVE BEENDET</Text>
        </Animated.View>

        {/* Figur auf der Straße */}
        <Animated.View style={[{ height: strasse - oben - 44 + figurB * 0.32, justifyContent: "flex-end" }, auf(0.1)]}>
          <Image source={BILD.figur} style={{ width: figurB, height: Math.round((figurB * 383) / 517) }} resizeMode="contain" accessibilityLabel="Die Figur zwinkert dir zu" />
        </Animated.View>

        <Animated.View style={[{ alignItems: "center", paddingHorizontal: 24, marginTop: klein ? 10 : 18, gap: 4 }, auf(0.2)]}>
          <Text style={{ ...lilaSchrift.titel, fontSize: klein ? 36 : 42, lineHeight: klein ? 40 : 46, letterSpacing: -0.4, color: TINTE, textAlign: "center" }}>
            Stark, <Text style={{ color: LILA }}>{vorname}!</Text>
          </Text>
          <Text style={{ ...lilaSchrift.textMittel, fontSize: 17.5, color: "#5E5878", textAlign: "center" }}>Dein Live ist jetzt vorbei.</Text>
        </Animated.View>

        {/* Zahlen */}
        <Animated.View style={[{ width: karteB, height: klein ? 140 : 156, marginTop: klein ? 18 : 26 }, auf(0.3)]}>
          <Image source={BILD.karte} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} resizeMode="stretch" />
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 10 }}>
            {werte.map((w, i) => (
              <View key={w.label} style={{ flex: 1, flexDirection: "row", alignItems: "center", alignSelf: "stretch" }}>
                {i > 0 ? <View style={{ width: 1.5, alignSelf: "stretch", marginVertical: 22, backgroundColor: "#E4DDF6" }} /> : null}
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2 }}>
                  <Image source={w.bild} style={{ width: klein ? 44 : 50, height: klein ? 44 : 50, marginBottom: 4 }} resizeMode="contain" />
                  <Hochzaehlen wert={w.wert} verzoegerung={400 + i * 150} style={{ ...lilaSchrift.titel, fontSize: 34, lineHeight: 37, color: TINTE }} />
                  <Text style={{ ...lilaSchrift.textMittel, fontSize: 15, color: "#5E5878" }}>{w.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={{ flex: 1, minHeight: 20 }} />

        {/* Knöpfe */}
        <Animated.View style={[{ gap: klein ? 10 : 14, marginTop: 10 }, auf(0.4)]}>
          <BildKnopf bild={BILD.knopf} onPress={onFertig} label="Fertig">
            <Icon name="checkmark" size={28} color="#FFFFFF" weight="bold" />
            <Text style={{ ...lilaSchrift.titel, fontSize: 25, color: "#FFFFFF" }}>Fertig</Text>
          </BildKnopf>
          <BildKnopf bild={BILD.knopfZart} onPress={onNochmal} label="Nochmal live gehen">
            <Image source={BILD.funk} style={{ width: 30, height: 30 }} resizeMode="contain" />
            <Text style={{ ...lilaSchrift.titel, fontSize: 24, color: TINTE }}>Nochmal live gehen</Text>
          </BildKnopf>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
