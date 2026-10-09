import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { useFenster } from "@/lib/fenster";
import { HauptKnopf } from "@/components/frage-rahmen";
import { Glas } from "@/components/glas";
import { DekoSvg } from "@/components/grafik";
import { Icon, type IconName } from "@/components/icon";
import { NutzerBild } from "@/components/profilbild";
import { tippen } from "@/lib/haptik";
import type { QuizSpieler } from "@/lib/live-quiz";
import { leuchten, schrift } from "@/lib/theme";

// Abschluss nach dem Live: Glühen hinter dem Profilbild, die Sendezeit groß,
// Zahlen, die hochzählen, die Quiz-Sieger, die aktivsten Leute aus dem Chat und
// ein Herzregen mit so vielen Herzen, wie geschickt wurden.

const ROT = "#FF2D55";
const RING = ["#FFB25C", "#FF6A2A", "#FF2D55"] as const;

export type TopChatter = { id: string; name: string; bild_pfad: string | null; anzahl: number };

function dauerText(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sek = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sek}` : `${m}:${sek}`;
}

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

/** Herzen, die quer über den Bildschirm nach oben schweben – eins je geschicktem Herz (höchstens 30). */
function HerzRegen({ anzahl }: { anzahl: number }) {
  const { width, height } = useFenster();
  const herzen = useRef(
    Array.from({ length: Math.min(anzahl, 30) }, (_, i) => ({
      id: i,
      wert: new Animated.Value(0),
      x: 12 + Math.random() * (width - 48),
      groesse: 16 + Math.round(Math.random() * 16),
      farbe: ["#FF2D55", "#FF5A5F", "#FC5B0E", "#FF8A2A", "#FF4F8B"][i % 5],
      drift: (Math.random() - 0.5) * 60,
      dauer: 2600 + Math.random() * 1800,
      start: Math.random() * 2400,
    })),
  ).current;
  useEffect(() => {
    herzen.forEach((h) => Animated.timing(h.wert, { toValue: 1, duration: h.dauer, delay: h.start, easing: Easing.out(Easing.quad), useNativeDriver: true }).start());
  }, [herzen]);
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      {herzen.map((h) => (
        <Animated.View
          key={h.id}
          style={{
            position: "absolute",
            left: h.x,
            top: height,
            opacity: h.wert.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 0.9, 0.6, 0] }),
            transform: [
              { translateY: h.wert.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.85] }) },
              { translateX: h.wert.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, h.drift, -h.drift * 0.4] }) },
              { scale: h.wert.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.5, 1, 0.8] }) },
            ],
          }}
        >
          <Icon name="heart" sf="heart.fill" size={h.groesse} color={h.farbe} />
        </Animated.View>
      ))}
    </View>
  );
}

function Kachel({ icon, sf, wert, text, verzoegerung }: { icon: IconName; sf: string; wert: number; text: string; verzoegerung: number }) {
  return (
    <Glas style={{ flex: 1, alignItems: "center", paddingTop: 14, paddingBottom: 12, borderRadius: 22, gap: 6 }}>
      <LinearGradient colors={RING} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} sf={sf as never} size={16} color="#FFFFFF" />
      </LinearGradient>
      <Hochzaehlen wert={wert} verzoegerung={verzoegerung} style={{ ...schrift.titel, fontSize: 24, lineHeight: 28, color: "#FFFFFF", fontVariant: ["tabular-nums"] }} />
      <Text style={{ ...schrift.textHalb, fontSize: 12, color: "rgba(255,255,255,0.62)" }}>{text}</Text>
    </Glas>
  );
}

const MEDAILLE = ["#F5C451", "#C9D1DB", "#D99A6C"];

/** Überschrift über einer Liste („QUIZ-SIEGER“, „AM AKTIVSTEN IM CHAT“). */
function Ueberschrift({ text, zusatz }: { text: string; zusatz?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
      <Text style={{ ...schrift.textFett, fontSize: 12, letterSpacing: 1.2, color: "rgba(255,255,255,0.5)" }}>{text}</Text>
      {zusatz ? <Text style={{ ...schrift.textMittel, fontSize: 12, color: "rgba(255,255,255,0.38)" }}>{zusatz}</Text> : null}
    </View>
  );
}

function Medaille({ platz }: { platz: number }) {
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: MEDAILLE[platz - 1] ?? "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ ...schrift.textFett, fontSize: 12, color: "#1A1208" }}>{platz}</Text>
    </View>
  );
}

export function LiveEnde({
  name,
  bildPfad,
  farbe,
  titel,
  dauerMs,
  zuschauer,
  herzen,
  nachrichten,
  topChatter,
  quizSieger = [],
  quizFragen = 0,
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
  const { width } = useFenster();
  const rein = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rein, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [rein]);
  const auf = (von: number) => ({
    opacity: rein.interpolate({ inputRange: [von, Math.min(1, von + 0.5)], outputRange: [0, 1], extrapolate: "clamp" }),
    transform: [{ translateY: rein.interpolate({ inputRange: [von, Math.min(1, von + 0.5)], outputRange: [18, 0], extrapolate: "clamp" }) }],
  });
  const vorname = name.split(" ")[0] || name;
  const glut = width * 1.5;

  return (
    <View style={{ flex: 1, backgroundColor: "#050304" }}>
      {/* Glühen oben hinter dem Profilbild und ein Hauch unten */}
      <DekoSvg width={glut} height={glut} style={{ position: "absolute", top: oben - glut * 0.42, left: (width - glut) / 2 }}>
        <Defs>
          <RadialGradient id="ende-glut" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FF4A2A" stopOpacity={0.55} />
            <Stop offset="0.35" stopColor="#FF2D55" stopOpacity={0.2} />
            <Stop offset="1" stopColor="#FF2D55" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={glut / 2} cy={glut / 2} r={glut / 2} fill="url(#ende-glut)" />
      </DekoSvg>
      <LinearGradient pointerEvents="none" colors={["rgba(252,91,14,0)", "rgba(252,91,14,0.12)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 260 }} />
      <HerzRegen anzahl={herzen} />

      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: oben, paddingBottom: 20, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
          {/* LIVE BEENDET */}
          <Animated.View style={[{ alignSelf: "center" }, auf(0)]}>
            <Glas style={{ flexDirection: "row", alignItems: "center", gap: 7, height: 30, paddingHorizontal: 13, borderRadius: 15 }}>
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "rgba(255,255,255,0.45)" }} />
              <Text style={{ ...schrift.textFett, fontSize: 11.5, letterSpacing: 1.4, color: "rgba(255,255,255,0.85)" }}>LIVE BEENDET</Text>
            </Glas>
          </Animated.View>

          {/* Profilbild mit Verlaufsring */}
          <Animated.View style={[{ alignItems: "center", marginTop: 26 }, auf(0.05)]}>
            <View style={[{ borderRadius: 56 }, leuchten(ROT, 0.55, 26, 0)]}>
              <LinearGradient colors={RING} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 112, height: 112, borderRadius: 56, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: "#050304", alignItems: "center", justifyContent: "center" }}>
                  <NutzerBild pfad={bildPfad} name={name} farbe={farbe} groesse={96} rand={0} />
                </View>
              </LinearGradient>
            </View>
            <Text style={{ ...schrift.titel, fontSize: 30, lineHeight: 36, color: "#FFFFFF", marginTop: 18 }}>Stark, {vorname}!</Text>
            <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 20, color: "rgba(255,255,255,0.65)", marginTop: 4, textAlign: "center" }} numberOfLines={2}>
              {titel ? `„${titel}“ ist vorbei.` : "Dein Live ist vorbei."}
            </Text>
          </Animated.View>

          {/* Sendezeit groß */}
          <Animated.View style={[{ alignItems: "center", marginTop: 26 }, auf(0.15)]}>
            <Text style={{ ...schrift.titel, fontSize: 64, lineHeight: 70, color: "#FFFFFF", fontVariant: ["tabular-nums"], textShadowColor: "rgba(255,74,42,0.55)", textShadowRadius: 24 }}>
              {dauerText(dauerMs)}
            </Text>
            <Text style={{ ...schrift.textFett, fontSize: 11.5, letterSpacing: 1.6, color: "#FF8A5C" }}>LIVE-ZEIT</Text>
          </Animated.View>

          {/* Zahlen */}
          <Animated.View style={[{ flexDirection: "row", gap: 10, marginTop: 24 }, auf(0.25)]}>
            <Kachel icon="eye" sf="eye.fill" wert={zuschauer} text="Zuschauer" verzoegerung={250} />
            <Kachel icon="heart" sf="heart.fill" wert={herzen} text="Herzen" verzoegerung={400} />
            <Kachel icon="chatbubble" sf="bubble.left.fill" wert={nachrichten} text="Nachrichten" verzoegerung={550} />
          </Animated.View>

          {/* Die Besten aus dem Quiz */}
          {quizSieger.length ? (
            <Animated.View style={[{ marginTop: 22 }, auf(0.3)]}>
              <Ueberschrift text="QUIZ-SIEGER" zusatz={quizFragen ? `${quizFragen} ${quizFragen === 1 ? "Frage" : "Fragen"}` : undefined} />
              <View style={{ gap: 8 }}>
                {quizSieger.slice(0, 3).map((s) => (
                  <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Medaille platz={s.platz} />
                    <NutzerBild pfad={s.bild_pfad} name={s.name} farbe={s.avatar_farbe} groesse={32} rand={0} />
                    <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#FFFFFF", flex: 1 }} numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text style={{ ...schrift.textFett, fontSize: 14, color: s.platz === 1 ? MEDAILLE[0] : "rgba(255,255,255,0.85)", fontVariant: ["tabular-nums"] }}>{s.punkte.toLocaleString("de-DE")} P.</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          ) : null}

          {/* Die aktivsten Leute im Chat */}
          {topChatter.length ? (
            <Animated.View style={[{ marginTop: 22 }, auf(0.35)]}>
              <Ueberschrift text="AM AKTIVSTEN IM CHAT" />
              <View style={{ gap: 8 }}>
                {topChatter.slice(0, 3).map((c, i) => (
                  <View key={c.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Medaille platz={i + 1} />
                    <NutzerBild pfad={c.bild_pfad} name={c.name} groesse={32} rand={0} />
                    <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#FFFFFF", flex: 1 }} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={{ ...schrift.textMittel, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                      {c.anzahl} {c.anzahl === 1 ? "Nachricht" : "Nachrichten"}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>
        {/* Weicher Übergang, wenn der Inhalt unter den Knöpfen weitergeht */}
        <LinearGradient pointerEvents="none" colors={["rgba(19,8,5,0)", "rgba(19,8,5,1)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 26 }} />
      </View>

      {/* Knöpfe fest unten */}
      <View style={{ paddingHorizontal: 20, paddingBottom: unten, paddingTop: 8 }}>
        <Animated.View style={[{ gap: 6 }, auf(0.45)]}>
          <HauptKnopf titel="Fertig" onPress={onFertig} />
          <Pressable
            onPress={() => {
              tippen();
              onNochmal();
            }}
            accessibilityRole="button"
            accessibilityLabel="Nochmal live gehen"
            style={({ pressed }) => ({ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 8, paddingHorizontal: 12, opacity: pressed ? 0.6 : 1 })}
          >
            <Icon name="radio" sf="dot.radiowaves.left.and.right" size={16} color="#FF6B85" />
            <Text style={{ ...schrift.textFett, fontSize: 15, color: "#FF6B85" }}>Nochmal live gehen</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
