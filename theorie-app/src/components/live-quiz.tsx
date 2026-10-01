import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Circle } from "react-native-svg";

import { DekoSvg } from "@/components/grafik";
import { Icon } from "@/components/icon";
import { Lageplan } from "@/components/lagen";
import { Kontrollleuchte } from "@/components/leuchten";
import { NutzerBild } from "@/components/profilbild";
import { Verkehrszeichen } from "@/components/zeichen";
import { FRAGEN, THEMEN, themaVon, type Frage, type LageKey, type LeuchteKey, type ThemaId, type ZeichenKey } from "@/lib/fragen";
import { erfolg, fehler as fehlerRuetteln, stoss, tippen } from "@/lib/haptik";
import { QUIZ_DAUERN, QUIZ_FRAGEN, quizLoesung, quizRestzeit, type LiveQuiz, type QuizLage, type QuizSpieler, type QuizStand, type QuizZwischenstand } from "@/lib/live-quiz";
import { farben, leuchten, mitDeckkraft, schrift, verlauf } from "@/lib/theme";

// Live-Quiz über dem Video: die Karte für Zuschauer (antworten, Auflösung,
// Rangliste), die Karte für den Gastgeber (Stimmen live, auflösen, weiter) und
// die Auswahl der Frage aus dem Katalog. Immer dunkel und fast deckend, damit
// man die Frage auch über einem hellen Video gut lesen kann.

const BUCHSTABEN = ["A", "B", "C", "D", "E", "F"];
const GRUEN = farben.gruen;
const ROT = "#FF5A4E";
const LIVE_ROT = "#FF2D55";
const GOLD = "#F5C451";
const MEDAILLE = [GOLD, "#C9D1DB", "#D99A6C"];
const LIVE_VERLAUF = ["#FF5A5F", "#FF2D55", "#E0124A"] as const;
const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;
const BEKANNTE_BILDER = new Set<string>(FRAGEN.flatMap((f) => (f.bild ? [f.bild] : [])));

type Zustand = "offen" | "gewaehlt" | "richtig" | "falsch" | "verpasst";

const zahl = (n: number) => n.toLocaleString("de-DE");
const prozent = (teil: number, ganz: number) => (ganz > 0 ? Math.round((teil / ganz) * 100) : 0);

/** „A und C“ – Buchstaben der richtigen Antworten in Anzeige-Reihenfolge. */
function loesungText(quiz: LiveQuiz, richtig: number[]): string {
  const b = quiz.reihenfolge.flatMap((i, p) => (richtig.includes(i) ? [BUCHSTABEN[p]] : []));
  return b.length > 1 ? `${b.slice(0, -1).join(", ")} und ${b[b.length - 1]}` : (b[0] ?? "");
}

/** Restzeit der offenen Frage, viermal pro Sekunde neu. */
function useRestzeit(quiz: LiveQuiz | null): number {
  const [rest, setRest] = useState(() => (quiz?.status === "offen" ? quizRestzeit(quiz) : 0));
  useEffect(() => {
    if (!quiz || quiz.status !== "offen") {
      setRest(0);
      return;
    }
    const tick = () => setRest(quizRestzeit(quiz));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [quiz]);
  return rest;
}

/** Ist die Zeit der offenen Frage um? Schaltet genau einmal um (statt jede Sekunde neu zu zeichnen). */
function useZeitUm(quiz: LiveQuiz | null): boolean {
  const [um, setUm] = useState(false);
  useEffect(() => {
    if (!quiz || quiz.status !== "offen") {
      setUm(false);
      return;
    }
    const rest = quizRestzeit(quiz);
    setUm(rest <= 0);
    if (rest <= 0) return;
    const t = setTimeout(() => setUm(true), rest);
    return () => clearTimeout(t);
  }, [quiz]);
  return um;
}

/** Karte erscheint von oben, sobald eine neue Frage kommt. */
function useAuftritt(schluessel: string | null) {
  const wert = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!schluessel) return;
    wert.setValue(0);
    Animated.spring(wert, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }).start();
  }, [schluessel, wert]);
  return {
    opacity: wert.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
    transform: [{ translateY: wert.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }, { scale: wert.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
  };
}

// ---------------------------------------------------------------------------
// Bausteine
// ---------------------------------------------------------------------------

/** Dunkle Karte mit warmem Schein oben (grün oder rot nach der Auflösung). */
function Rahmen({ schein = farben.orange, children }: { schein?: string; children: ReactNode }) {
  return (
    <View style={[{ borderRadius: 26 }, leuchten("#000000", 0.45, 18, 6)]}>
      <View style={{ borderRadius: 26, overflow: "hidden", backgroundColor: "rgba(12,13,17,0.9)", borderWidth: 1, borderColor: "rgba(255,255,255,0.11)" }}>
        <LinearGradient pointerEvents="none" colors={[mitDeckkraft(schein, 0.24), mitDeckkraft(schein, 0)]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 110 }} />
        {children}
      </View>
    </View>
  );
}

/** Zündschnur oben an der Karte: läuft in der Antwortzeit ab. */
function ZeitBalken({ quiz }: { quiz: LiveQuiz }) {
  const wert = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const rest = quizRestzeit(quiz);
    wert.setValue(Math.min(1, rest / Math.max(1, quiz.dauer * 1000)));
    const a = Animated.timing(wert, { toValue: 0, duration: rest, easing: Easing.linear, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [quiz, wert]);
  return (
    <View style={{ height: 4, backgroundColor: "rgba(255,255,255,0.08)" }}>
      <Animated.View style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "100%", transformOrigin: "left", transform: [{ scaleX: wert }] }}>
        <LinearGradient colors={["#FFB25C", farben.orange, LIVE_ROT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={FUELLEN} />
      </Animated.View>
    </View>
  );
}

/** Sekunden im Ring, die letzten fünf rot. */
function Countdown({ quiz }: { quiz: LiveQuiz }) {
  const rest = useRestzeit(quiz);
  const sek = Math.ceil(rest / 1000);
  const anteil = Math.min(1, rest / Math.max(1, quiz.dauer * 1000));
  const knapp = sek <= 5;
  const r = 17;
  const umfang = 2 * Math.PI * r;
  return (
    <View style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }} accessibilityLabel={`Noch ${sek} Sekunden`}>
      <DekoSvg width={42} height={42} style={{ position: "absolute", top: 0, left: 0 }}>
        <Circle cx={21} cy={21} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={3.5} fill="rgba(0,0,0,0.25)" />
        <Circle
          cx={21}
          cy={21}
          r={r}
          stroke={knapp ? LIVE_ROT : "#FF8A2A"}
          strokeWidth={3.5}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${umfang} ${umfang}`}
          strokeDashoffset={umfang * (1 - anteil)}
          transform="rotate(-90 21 21)"
        />
      </DekoSvg>
      <Text style={{ ...schrift.titel, fontSize: 15, color: knapp ? "#FF6B85" : "#FFFFFF", fontVariant: ["tabular-nums"] }}>{sek}</Text>
    </View>
  );
}

function QuizMarke() {
  return (
    <LinearGradient colors={verlauf.knopf} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 24, paddingHorizontal: 9, borderRadius: 12 }}>
      <Icon name="flash" size={12} color="#FFFFFF" />
      <Text style={{ ...schrift.textFett, fontSize: 11.5, letterSpacing: 1, color: "#FFFFFF" }}>QUIZ</Text>
    </LinearGradient>
  );
}

function RundKnopf({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
    >
      <Icon name="close" size={15} color="rgba(255,255,255,0.85)" weight="semibold" />
    </Pressable>
  );
}

function Kopf({ quiz, rechts }: { quiz: LiveQuiz; rechts?: ReactNode }) {
  const thema = THEMEN.find((t) => t.id === quiz.thema);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 42 }}>
      <QuizMarke />
      <Text style={{ ...schrift.textHalb, fontSize: 13, color: "rgba(255,255,255,0.62)", flexShrink: 1 }} numberOfLines={1}>
        Frage {quiz.nummer}
        {thema ? ` · ${thema.titel}` : ""}
      </Text>
      <View style={{ flex: 1 }} />
      {rechts}
    </View>
  );
}

/** Kleines Bild zur Frage (Zeichen, Lageplan, Leuchte) – antippen vergrößert. */
function QuizBild({ bild, klein }: { bild: string | null; klein?: boolean }) {
  const [gross, setGross] = useState(false);
  const { width } = useWindowDimensions();
  if (!bild || !BEKANNTE_BILDER.has(bild)) return null;
  const lage = bild.startsWith("lage_");
  const leuchte = bild.startsWith("leuchte_");
  const inhalt = (b: number) =>
    lage ? <Lageplan lage={bild as LageKey} breite={b} /> : leuchte ? <Kontrollleuchte leuchte={bild as LeuchteKey} groesse={b * 0.8} /> : <Verkehrszeichen zeichen={bild as ZeichenKey} groesse={b * 0.86} />;
  const breite = lage ? (klein ? 80 : 104) : klein ? 50 : 64;
  const hoehe = lage ? Math.round((breite * 220) / 300) : breite;
  return (
    <>
      <Pressable
        onPress={() => {
          tippen();
          setGross(true);
        }}
        accessibilityRole="imagebutton"
        accessibilityLabel="Bild vergrößern"
        style={{ width: breite, height: hoehe, borderRadius: 12, overflow: "hidden", backgroundColor: lage ? farben.gelaende : "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
      >
        {inhalt(breite)}
      </Pressable>
      <Modal visible={gross} transparent animationType="fade" onRequestClose={() => setGross(false)} supportedOrientations={["portrait", "landscape"]}>
        <Pressable onPress={() => setGross(false)} accessibilityLabel="Schließen" style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" }}>
          <View style={{ borderRadius: 18, overflow: "hidden", backgroundColor: lage ? farben.gelaende : "transparent" }}>{inhalt(lage ? width - 24 : Math.min(width * 0.7, 320))}</View>
        </Pressable>
      </Modal>
    </>
  );
}

function FrageText({ quiz, zeilen, ohneBild }: { quiz: LiveQuiz; zeilen?: number; ohneBild?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      {ohneBild ? null : <QuizBild bild={quiz.bild} />}
      <Text style={{ ...schrift.titelHalb, flex: 1, fontSize: 16.5, lineHeight: 22, color: "#FFFFFF" }} numberOfLines={zeilen}>
        {quiz.frage}
      </Text>
    </View>
  );
}

/** Buchstabe links an der Antwort: Haken beim Wählen, grün oder rot nach der Auflösung. */
function Marke({ zustand, buchstabe }: { zustand: Zustand; buchstabe: string }) {
  const basis = { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", overflow: "hidden" } as const;
  if (zustand === "gewaehlt") {
    return (
      <View style={basis}>
        <LinearGradient colors={verlauf.knopf} style={FUELLEN} />
        <Icon name="checkmark" size={16} color="#FFFFFF" weight="bold" />
      </View>
    );
  }
  if (zustand === "richtig" || zustand === "falsch") {
    return (
      <View style={[basis, { backgroundColor: zustand === "richtig" ? GRUEN : ROT }]}>
        <Icon name={zustand === "richtig" ? "checkmark" : "close"} size={16} color="#FFFFFF" weight="bold" />
      </View>
    );
  }
  return (
    <View style={[basis, zustand === "verpasst" ? { borderWidth: 2, borderColor: GRUEN } : { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }]}>
      <Text style={{ ...schrift.textFett, fontSize: 13, color: zustand === "verpasst" ? GRUEN : "rgba(255,255,255,0.85)" }}>{buchstabe}</Text>
    </View>
  );
}

/** Eine Antwort; dahinter auf Wunsch ein Balken (Stimmen), rechts Zahl oder Prozent. */
function AntwortZeile({
  buchstabe,
  text,
  zustand,
  anteil,
  rechts,
  balkenFarbe,
  loesung,
  onPress,
}: {
  buchstabe: string;
  text: string;
  zustand: Zustand;
  anteil?: number;
  rechts?: string;
  balkenFarbe?: string;
  /** Nur für den Gastgeber: Haken an richtigen Antworten vor der Auflösung. */
  loesung?: boolean;
  onPress?: () => void;
}) {
  const breite = useRef(new Animated.Value(0)).current;
  const skala = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(breite, { toValue: anteil ?? 0, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [anteil, breite]);
  useEffect(() => {
    if (zustand !== "gewaehlt") return;
    skala.setValue(0.97);
    Animated.spring(skala, { toValue: 1, friction: 5, tension: 220, useNativeDriver: true }).start();
  }, [zustand, skala]);

  const rand = zustand === "gewaehlt" ? farben.orange : zustand === "richtig" || zustand === "verpasst" ? GRUEN : zustand === "falsch" ? ROT : "rgba(255,255,255,0.1)";
  const grund = zustand === "gewaehlt" ? "rgba(252,91,14,0.16)" : zustand === "richtig" ? "rgba(78,208,83,0.1)" : zustand === "falsch" ? "rgba(255,90,78,0.1)" : "rgba(255,255,255,0.05)";
  const balken = balkenFarbe ?? (zustand === "richtig" || zustand === "verpasst" ? "rgba(78,208,83,0.3)" : zustand === "falsch" ? "rgba(255,90,78,0.26)" : "rgba(255,255,255,0.12)");

  return (
    <Animated.View style={{ transform: [{ scale: skala }] }}>
      <Pressable
        disabled={!onPress}
        onPress={() => {
          tippen();
          onPress?.();
        }}
        accessibilityRole={onPress ? "checkbox" : undefined}
        accessibilityState={onPress ? { checked: zustand === "gewaehlt" } : undefined}
        accessibilityLabel={`Antwort ${buchstabe}: ${text}${rechts ? `, ${rechts}` : ""}`}
        style={({ pressed }) => ({
          minHeight: 48,
          borderRadius: 16,
          borderWidth: zustand === "offen" ? 1 : 1.5,
          borderStyle: zustand === "verpasst" ? "dashed" : "solid",
          borderColor: rand,
          backgroundColor: grund,
          overflow: "hidden",
          opacity: pressed ? 0.85 : 1,
        })}
      >
        {anteil !== undefined ? (
          <Animated.View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: breite.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }), backgroundColor: balken }} />
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 9, paddingLeft: 10, paddingRight: 12, minHeight: 46 }}>
          <Marke zustand={zustand} buchstabe={buchstabe} />
          <Text style={{ ...(zustand === "offen" ? schrift.textMittel : schrift.textHalb), flex: 1, fontSize: 14.5, lineHeight: 19, color: "#FFFFFF" }}>{text}</Text>
          {loesung ? <Icon name="checkmark-circle" size={17} color={GRUEN} /> : null}
          {rechts ? <Text style={{ ...schrift.textFett, fontSize: 14, color: "#FFFFFF", fontVariant: ["tabular-nums"], minWidth: 38, textAlign: "right" }}>{rechts}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Großer Knopf in der Karte: Orange (Haupt) oder Glas (Neben). */
function KartenKnopf({ titel, icon, haupt, aus, onPress, style }: { titel: string; icon?: "flash" | "trophy" | "arrow-forward" | "log-in-outline" | "paper-plane"; haupt?: boolean; aus?: boolean; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      disabled={aus}
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={titel}
      accessibilityState={{ disabled: aus }}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }, haupt && !aus ? leuchten(farben.orange, 0.4, 12, 3) : null, style]}
    >
      <View style={{ height: 46, borderRadius: 23, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 16, backgroundColor: haupt ? undefined : "rgba(255,255,255,0.1)", borderWidth: haupt ? 0 : 1, borderColor: "rgba(255,255,255,0.12)", opacity: aus ? 0.5 : 1 }}>
        {haupt ? <LinearGradient colors={aus ? ["#3A3D44", "#2E3137"] : verlauf.knopf} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={FUELLEN} /> : null}
        {icon ? <Icon name={icon} size={16} color="#FFFFFF" /> : null}
        <Text style={{ ...schrift.textFett, fontSize: 15, color: "#FFFFFF" }} numberOfLines={1}>
          {titel}
        </Text>
      </View>
    </Pressable>
  );
}

/** Erklärung nach der Auflösung – kurz, antippen zeigt alles. */
function Erklaerung({ text }: { text: string }) {
  const [ganz, setGanz] = useState(false);
  if (!text) return null;
  return (
    <Pressable onPress={() => setGanz((g) => !g)} accessibilityRole="button" accessibilityLabel="Erklärung" style={{ flexDirection: "row", gap: 9, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 14, backgroundColor: "rgba(255,178,122,0.08)", borderWidth: 1, borderColor: "rgba(255,178,122,0.16)" }}>
      <Icon name="bulb" size={15} color="#FFB27A" style={{ marginTop: 1 }} />
      <Text style={{ ...schrift.text, flex: 1, fontSize: 13, lineHeight: 18, color: "rgba(255,255,255,0.86)" }} numberOfLines={ganz ? undefined : 2}>
        {text}
      </Text>
    </Pressable>
  );
}

/** Punkte nach einer richtigen Antwort – springen kurz auf. */
function PunkteChip({ punkte }: { punkte: number }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(w, { toValue: 1, friction: 4, tension: 120, delay: 250, useNativeDriver: true }).start();
  }, [w]);
  return (
    <Animated.View style={[{ transform: [{ scale: w.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }], opacity: w }, leuchten(GOLD, 0.5, 10, 0)]}>
      <LinearGradient colors={["#FFD66B", "#F5A524"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: "row", alignItems: "center", gap: 3, height: 30, paddingHorizontal: 11, borderRadius: 15 }}>
        <Icon name="flash" size={13} color="#2A1A05" />
        <Text style={{ ...schrift.titel, fontSize: 15, color: "#2A1A05", fontVariant: ["tabular-nums"] }}>+{zahl(punkte)}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

function Platz({ platz }: { platz: number }) {
  const medaille = MEDAILLE[platz - 1];
  if (medaille) {
    return (
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: medaille, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ ...schrift.textFett, fontSize: 12.5, color: "#1A1208" }}>{platz}</Text>
      </View>
    );
  }
  return (
    <View style={{ width: 24, alignItems: "center" }}>
      <Text style={{ ...schrift.textFett, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{platz}</Text>
    </View>
  );
}

/** Die Besten im Live mit Medaillen; die eigene Zeile ist orange umrandet. */
export function Bestenliste({ spieler, ichId, max = 5 }: { spieler: QuizSpieler[]; ichId?: string | null; max?: number }) {
  return (
    <View style={{ gap: 6 }}>
      {spieler.slice(0, max).map((s) => {
        const ich = s.id === ichId;
        const erster = s.platz === 1;
        return (
          <View
            key={s.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: 6,
              paddingLeft: 8,
              paddingRight: 12,
              borderRadius: 14,
              backgroundColor: ich ? "rgba(252,91,14,0.16)" : erster ? "rgba(245,196,81,0.1)" : "rgba(255,255,255,0.05)",
              borderWidth: 1,
              borderColor: ich ? "rgba(252,91,14,0.6)" : erster ? "rgba(245,196,81,0.32)" : "rgba(255,255,255,0.07)",
            }}
          >
            <Platz platz={s.platz} />
            <NutzerBild pfad={s.bild_pfad} name={s.name} farbe={s.avatar_farbe} groesse={30} rand={0} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: "#FFFFFF" }} numberOfLines={1}>
                {s.name}
                {ich ? " (du)" : ""}
              </Text>
              <Text style={{ ...schrift.textMittel, fontSize: 11.5, color: "rgba(255,255,255,0.55)" }}>{s.richtige} richtig</Text>
            </View>
            <Text style={{ ...schrift.titel, fontSize: 15.5, color: erster ? GOLD : "#FFFFFF", fontVariant: ["tabular-nums"] }}>{zahl(s.punkte)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function RanglisteInhalt({ quiz, ichId, stand }: { quiz: LiveQuiz; ichId?: string | null; stand?: QuizStand | null }) {
  const draussen = stand && stand.platz > 5;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon name="trophy" size={18} color={GOLD} />
        <Text style={{ ...schrift.titel, fontSize: 18, color: "#FFFFFF" }}>Rangliste</Text>
        <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>
          nach {quiz.nummer} {quiz.nummer === 1 ? "Frage" : "Fragen"}
        </Text>
      </View>
      {quiz.bestenliste.length ? (
        <Bestenliste spieler={quiz.bestenliste} ichId={ichId} />
      ) : (
        <Text style={{ ...schrift.textMittel, fontSize: 14, color: "rgba(255,255,255,0.65)" }}>Noch hat niemand Punkte – bei der nächsten Frage!</Text>
      )}
      {draussen ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: "rgba(252,91,14,0.14)", borderWidth: 1, borderColor: "rgba(252,91,14,0.5)" }}>
          <Text style={{ ...schrift.textFett, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>{stand.platz}.</Text>
          <Text style={{ ...schrift.textHalb, flex: 1, fontSize: 14, color: "#FFFFFF" }}>Du · von {stand.spieler}</Text>
          <Text style={{ ...schrift.titel, fontSize: 15, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{zahl(stand.punkte)}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Karte für Zuschauer
// ---------------------------------------------------------------------------

/** Schlüssel für „ausgeblendet“: gilt nur, bis sich bei der Frage etwas ändert. */
export const quizSchluessel = (lage: QuizLage) => (lage.quiz ? `${lage.quiz.id}:${lage.quiz.status}` : "");

export function QuizZuschauerKarte({
  lage,
  ichId,
  onAntworten,
  onAnmelden,
  onAusblenden,
  onFehler,
  onLayout,
  style,
}: {
  lage: QuizLage;
  /** Angemeldet? Gäste sehen die Frage, mitspielen geht nur mit Konto. */
  ichId: string | null;
  onAntworten: (auswahl: number[]) => Promise<string | null>;
  onAnmelden: () => void;
  /** Nach der Auflösung: Karte wegklicken (bis zur nächsten Änderung). */
  onAusblenden: () => void;
  onFehler: (text: string) => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { quiz, mein, stand } = lage;
  const zeitVorbei = useZeitUm(quiz);
  const [auswahl, setAuswahl] = useState<number[]>([]);
  const [sendet, setSendet] = useState(false);
  const auftritt = useAuftritt(quiz?.id ?? null);

  useEffect(() => {
    setAuswahl([]);
    if (quiz?.id) stoss();
  }, [quiz?.id]);

  // Nach der Auflösung kurz rütteln: gut oder schlecht.
  const aufgeloest = quiz?.status === "aufgeloest";
  const richtig = mein?.richtig;
  useEffect(() => {
    if (!aufgeloest || richtig == null) return;
    if (richtig) erfolg();
    else fehlerRuetteln();
  }, [aufgeloest, richtig]);

  if (!quiz) return null;

  const offen = quiz.status === "offen";
  const zeitUm = offen && zeitVorbei;
  const beantwortet = Boolean(mein);
  const loesung = quiz.richtig ?? [];
  const schein = quiz.status === "aufgeloest" && mein ? (mein.richtig ? GRUEN : ROT) : farben.orange;

  async function abschicken() {
    if (!auswahl.length || sendet) return;
    setSendet(true);
    const problem = await onAntworten(auswahl);
    setSendet(false);
    if (problem) onFehler(problem);
    else erfolg();
  }

  const zeilen = quiz.reihenfolge.map((i, p) => {
    const text = quiz.antworten[i] ?? "";
    if (offen) {
      const gewaehlt = (mein?.auswahl ?? auswahl).includes(i);
      const aktiv = Boolean(ichId) && !beantwortet && !zeitUm;
      return (
        <AntwortZeile
          key={i}
          buchstabe={BUCHSTABEN[p]}
          text={text}
          zustand={gewaehlt ? "gewaehlt" : "offen"}
          onPress={aktiv ? () => setAuswahl((alt) => (alt.includes(i) ? alt.filter((x) => x !== i) : [...alt, i])) : undefined}
        />
      );
    }
    const istRichtig = loesung.includes(i);
    const gewaehlt = Boolean(mein?.auswahl.includes(i));
    const zustand: Zustand = istRichtig ? (mein && !gewaehlt ? "verpasst" : "richtig") : gewaehlt ? "falsch" : "offen";
    const stimmen = quiz.verteilung?.[i] ?? 0;
    return <AntwortZeile key={i} buchstabe={BUCHSTABEN[p]} text={text} zustand={zustand} anteil={quiz.teilnehmer ? stimmen / quiz.teilnehmer : 0} rechts={`${prozent(stimmen, quiz.teilnehmer)} %`} />;
  });

  return (
    <Animated.View style={[style, auftritt]} onLayout={onLayout}>
      <Rahmen schein={schein}>
        {offen ? <ZeitBalken quiz={quiz} /> : null}
        <View style={{ padding: 14, paddingTop: offen ? 10 : 12, gap: 11 }}>
          <Kopf quiz={quiz} rechts={offen ? <Countdown quiz={quiz} /> : <RundKnopf label="Quiz ausblenden" onPress={onAusblenden} />} />

          {quiz.status === "rangliste" ? (
            <RanglisteInhalt quiz={quiz} ichId={ichId} stand={stand} />
          ) : (
            <>
              {quiz.status === "aufgeloest" ? <Ergebnis quiz={quiz} mein={mein} /> : null}
              <FrageText quiz={quiz} zeilen={offen ? undefined : 2} ohneBild={!offen} />
              {offen && !beantwortet && !zeitUm && ichId ? (
                <Text style={{ ...schrift.textMittel, fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: -4 }}>Eine oder mehrere Antworten sind richtig</Text>
              ) : null}
              <View style={{ gap: 7 }}>{zeilen}</View>

              {offen ? (
                !ichId ? (
                  <KartenKnopf titel="Zum Mitspielen anmelden" icon="log-in-outline" onPress={onAnmelden} />
                ) : beantwortet ? (
                  <Hinweiszeile icon="checkmark-circle" farbe={GRUEN} text="Antwort ist drin – gleich kommt die Auflösung" />
                ) : zeitUm ? (
                  <Hinweiszeile icon="time-outline" farbe="rgba(255,255,255,0.6)" text="Zeit ist um" />
                ) : (
                  <KartenKnopf titel={auswahl.length ? "Antwort abschicken" : "Antwort wählen"} icon={auswahl.length ? "paper-plane" : undefined} haupt aus={!auswahl.length || sendet} onPress={abschicken} />
                )
              ) : (
                <>
                  <Erklaerung text={quiz.erklaerung} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Icon name="people" size={14} color="rgba(255,255,255,0.55)" />
                    <Text style={{ ...schrift.textMittel, flex: 1, fontSize: 12.5, color: "rgba(255,255,255,0.6)" }}>
                      {quiz.richtige} von {quiz.teilnehmer} richtig
                    </Text>
                    {stand ? (
                      <Text style={{ ...schrift.textFett, fontSize: 13, color: "#FFFFFF" }}>
                        Platz {stand.platz} · {zahl(stand.punkte)} P.
                      </Text>
                    ) : null}
                  </View>
                </>
              )}
            </>
          )}
        </View>
      </Rahmen>
    </Animated.View>
  );
}

function Hinweiszeile({ icon, farbe, text }: { icon: "checkmark-circle" | "time-outline"; farbe: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.06)" }}>
      <Icon name={icon} size={17} color={farbe} />
      <Text style={{ ...schrift.textHalb, fontSize: 14, color: "#FFFFFF" }}>{text}</Text>
    </View>
  );
}

/** Ergebnis oben in der Karte: richtig mit Punkten, falsch oder nicht dabei. */
function Ergebnis({ quiz, mein }: { quiz: LiveQuiz; mein: QuizLage["mein"] }) {
  const dabei = Boolean(mein);
  const gut = Boolean(mein?.richtig);
  const c = !dabei ? "#AEB3BA" : gut ? GRUEN : ROT;
  const loesung = loesungText(quiz, quiz.richtig ?? []);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 18, backgroundColor: mitDeckkraft(dabei ? c : "#FFFFFF", dabei ? 0.13 : 0.06), borderWidth: 1, borderColor: dabei ? mitDeckkraft(c, 0.4) : "rgba(255,255,255,0.1)" }}>
      <View style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: dabei ? c : "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }, dabei ? leuchten(c, 0.55, 10, 0) : null]}>
        <Icon name={!dabei ? "time-outline" : gut ? "checkmark" : "close"} size={20} color="#FFFFFF" weight="bold" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...schrift.titel, fontSize: 17, lineHeight: 21, color: dabei ? c : "#FFFFFF" }}>{!dabei ? "Nicht mitgespielt" : gut ? "Richtig!" : "Leider falsch"}</Text>
        <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: "rgba(255,255,255,0.7)" }}>{loesung ? `Richtig ist ${loesung}` : ""}</Text>
      </View>
      {gut && mein && mein.punkte > 0 ? <PunkteChip punkte={mein.punkte} /> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Karte für den Gastgeber
// ---------------------------------------------------------------------------

export function QuizGastgeberKarte({
  quiz,
  zwischen,
  beschaeftigt,
  onAufloesen,
  onRangliste,
  onNaechste,
  onSchliessen,
  onLayout,
  style,
}: {
  quiz: LiveQuiz;
  zwischen: QuizZwischenstand | null;
  beschaeftigt: boolean;
  onAufloesen: () => void;
  onRangliste: () => void;
  onNaechste: () => void;
  onSchliessen: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const auftritt = useAuftritt(quiz.id);
  const offen = quiz.status === "offen";
  const loesung = quizLoesung(quiz);
  const verteilung = offen ? zwischen?.verteilung : quiz.verteilung;
  const teilnehmer = offen ? (zwischen?.teilnehmer ?? 0) : quiz.teilnehmer;

  return (
    <Animated.View style={[style, auftritt]} onLayout={onLayout}>
      <Rahmen>
        {offen ? <ZeitBalken quiz={quiz} /> : null}
        <View style={{ padding: 13, paddingTop: offen ? 9 : 11, gap: 10 }}>
          <Kopf
            quiz={quiz}
            rechts={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {offen ? <Countdown quiz={quiz} /> : null}
                <RundKnopf label={offen ? "Frage abbrechen" : "Quiz schließen"} onPress={onSchliessen} />
              </View>
            }
          />

          {quiz.status === "rangliste" ? (
            <RanglisteInhalt quiz={quiz} />
          ) : (
            <>
              <FrageText quiz={quiz} />
              <View style={{ gap: 6 }}>
                {quiz.reihenfolge.map((i, p) => {
                  const stimmen = verteilung?.[i] ?? 0;
                  const richtig = loesung.includes(i);
                  return (
                    <AntwortZeile
                      key={i}
                      buchstabe={BUCHSTABEN[p]}
                      text={quiz.antworten[i] ?? ""}
                      zustand={!offen && richtig ? "richtig" : "offen"}
                      loesung={offen && richtig}
                      anteil={teilnehmer ? stimmen / teilnehmer : 0}
                      balkenFarbe={offen ? "rgba(252,91,14,0.3)" : undefined}
                      rechts={offen ? String(stimmen) : `${prozent(stimmen, teilnehmer)} %`}
                    />
                  );
                })}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <Icon name="people" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={{ ...schrift.textHalb, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                  {offen ? `${teilnehmer} ${teilnehmer === 1 ? "Antwort" : "Antworten"}` : `${quiz.richtige} von ${quiz.teilnehmer} richtig (${prozent(quiz.richtige, quiz.teilnehmer)} %)`}
                </Text>
                {offen ? <Text style={{ ...schrift.textMittel, fontSize: 12, color: "rgba(255,255,255,0.45)" }}>· nur du siehst die Lösung</Text> : null}
              </View>
              {offen ? null : <Erklaerung text={quiz.erklaerung} />}
            </>
          )}

          {offen ? (
            <KartenKnopf titel="Jetzt auflösen" icon="flash" haupt aus={beschaeftigt} onPress={onAufloesen} />
          ) : quiz.status === "aufgeloest" ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                disabled={beschaeftigt}
                onPress={() => {
                  tippen();
                  onRangliste();
                }}
                accessibilityRole="button"
                accessibilityLabel="Rangliste zeigen"
                style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(245,196,81,0.14)", borderWidth: 1, borderColor: "rgba(245,196,81,0.4)", alignItems: "center", justifyContent: "center", opacity: beschaeftigt ? 0.5 : pressed ? 0.75 : 1 })}
              >
                <Icon name="trophy" size={19} color={GOLD} />
              </Pressable>
              <KartenKnopf titel="Nächste Frage" icon="arrow-forward" haupt aus={beschaeftigt} onPress={onNaechste} style={{ flex: 1 }} />
            </View>
          ) : (
            <KartenKnopf titel="Nächste Frage" icon="arrow-forward" haupt aus={beschaeftigt} onPress={onNaechste} />
          )}
        </View>
      </Rahmen>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Frage auswählen (Gastgeber)
// ---------------------------------------------------------------------------

function MiniBild({ frage }: { frage: Frage }) {
  const b = frage.bild;
  const kachel = { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" } as const;
  if (b?.startsWith("lage_")) {
    return (
      <View style={[kachel, { backgroundColor: farben.gelaende }]}>
        <Lageplan lage={b as LageKey} breite={46} />
      </View>
    );
  }
  if (b?.startsWith("leuchte_")) {
    return (
      <View style={[kachel, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
        <Kontrollleuchte leuchte={b as LeuchteKey} groesse={38} />
      </View>
    );
  }
  if (b) {
    return (
      <View style={[kachel, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
        <Verkehrszeichen zeichen={b as ZeichenKey} groesse={38} />
      </View>
    );
  }
  return (
    <View style={[kachel, { backgroundColor: "rgba(252,91,14,0.14)" }]}>
      <Icon name={themaVon(frage.thema).icon} size={20} color="#FF8A2A" />
    </View>
  );
}

function ThemenChip({ text, aktiv, onPress }: { text: string; aktiv: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: aktiv }}
      style={{ height: 34, borderRadius: 17, overflow: "hidden", justifyContent: "center", paddingHorizontal: 14, backgroundColor: aktiv ? undefined : "rgba(255,255,255,0.07)", borderWidth: aktiv ? 0 : 1, borderColor: "rgba(255,255,255,0.09)" }}
    >
      {aktiv ? <LinearGradient colors={verlauf.chip} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={FUELLEN} /> : null}
      <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: aktiv ? "#FFFFFF" : "rgba(255,255,255,0.8)" }}>{text}</Text>
    </Pressable>
  );
}

export function QuizAuswahl({
  sichtbar,
  gefragt,
  onStarten,
  onSchliessen,
}: {
  sichtbar: boolean;
  /** Schon gestellte Fragen (werden markiert, der Zufall nimmt sie nicht). */
  gefragt: string[];
  /** Frage starten – `true`, wenn es geklappt hat. */
  onStarten: (frage: Frage, dauer: number) => Promise<boolean>;
  onSchliessen: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [suche, setSuche] = useState("");
  const [thema, setThema] = useState<ThemaId | null>(null);
  const [vorschau, setVorschau] = useState<Frage | null>(null);
  const [dauer, setDauer] = useState<number>(20);
  const [startet, setStartet] = useState(false);

  useEffect(() => {
    if (sichtbar) return;
    setVorschau(null);
    setSuche("");
  }, [sichtbar]);

  const themen = useMemo(() => THEMEN.filter((t) => QUIZ_FRAGEN.some((f) => f.thema === t.id)), []);
  const liste = useMemo(() => {
    const s = suche.trim().toLowerCase();
    return QUIZ_FRAGEN.filter((f) => (!thema || f.thema === thema) && (!s || f.text.toLowerCase().includes(s) || (f.art === "auswahl" && f.antworten.some((a) => a.text.toLowerCase().includes(s)))));
  }, [suche, thema]);

  function zufall() {
    const imThema = QUIZ_FRAGEN.filter((f) => !thema || f.thema === thema);
    const neu = imThema.filter((f) => !gefragt.includes(f.id));
    const topf = neu.length ? neu : imThema;
    if (topf.length) setVorschau(topf[Math.floor(Math.random() * topf.length)]);
  }

  async function starten() {
    if (!vorschau || startet) return;
    setStartet(true);
    const ok = await onStarten(vorschau, dauer);
    setStartet(false);
    if (ok) onSchliessen();
  }

  return (
    <Modal visible={sichtbar} transparent animationType="slide" onRequestClose={onSchliessen} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onSchliessen} accessibilityLabel="Schließen" />
        <View style={{ height: Math.round(height * 0.8), backgroundColor: "#0E1014", borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, borderColor: "rgba(255,255,255,0.09)", overflow: "hidden" }}>
          <LinearGradient pointerEvents="none" colors={["rgba(252,91,14,0.16)", "rgba(252,91,14,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 140 }} />
          <View style={{ alignSelf: "center", width: 38, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.22)", marginTop: 8 }} />

          {vorschau && vorschau.art === "auswahl" ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
                <Pressable onPress={() => setVorschau(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Zurück" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="chevron-back" size={18} color="#FFFFFF" weight="semibold" />
                </Pressable>
                <Text style={{ ...schrift.titel, flex: 1, fontSize: 19, color: "#FFFFFF" }}>Vorschau</Text>
                <Pressable onPress={zufall} hitSlop={8} accessibilityRole="button" accessibilityLabel="Andere Zufallsfrage" style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <Icon name="shuffle" sf="shuffle" size={15} color="#FFB27A" />
                  <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: "#FFFFFF" }}>Andere</Text>
                </Pressable>
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
                <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>{themaVon(vorschau.thema).titel.toUpperCase()}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <QuizBild bild={vorschau.bild ?? null} />
                  <Text style={{ ...schrift.titelHalb, flex: 1, fontSize: 18, lineHeight: 24, color: "#FFFFFF" }}>{vorschau.text}</Text>
                </View>
                <View style={{ gap: 7 }}>
                  {vorschau.antworten.map((a, i) => (
                    <AntwortZeile key={i} buchstabe={BUCHSTABEN[i]} text={a.text} zustand={a.richtig ? "richtig" : "offen"} />
                  ))}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                  <Icon name="eye-off-outline" size={14} color="rgba(255,255,255,0.5)" />
                  <Text style={{ ...schrift.textMittel, flex: 1, fontSize: 12.5, lineHeight: 17, color: "rgba(255,255,255,0.55)" }}>Die Lösung siehst nur du. Im Live kann die Reihenfolge der Antworten anders sein.</Text>
                </View>
                <Text style={{ ...schrift.textFett, fontSize: 12, letterSpacing: 1.1, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>ZEIT ZUM ANTWORTEN</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {QUIZ_DAUERN.map((d) => (
                    <ThemenChip key={d} text={`${d} Sekunden`} aktiv={dauer === d} onPress={() => setDauer(d)} />
                  ))}
                </View>
              </ScrollView>
              <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 14) + 4 }}>
                <Pressable onPress={starten} disabled={startet} accessibilityRole="button" accessibilityLabel="Frage starten" style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }], opacity: startet ? 0.6 : 1 }, leuchten(LIVE_ROT, 0.5, 18, 4)]}>
                  <LinearGradient colors={LIVE_VERLAUF} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 56, borderRadius: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }}>
                    <Icon name="flash" size={19} color="#FFFFFF" />
                    <Text style={{ ...schrift.textFett, fontSize: 17, color: "#FFFFFF" }}>{startet ? "Startet …" : "Frage starten"}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...schrift.titel, fontSize: 22, color: "#FFFFFF" }}>Quizfrage</Text>
                  <Text style={{ ...schrift.textMittel, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>Alle im Live tippen mit – du siehst die Stimmen sofort.</Text>
                </View>
                <RundKnopf label="Schließen" onPress={onSchliessen} />
              </View>

              <View style={{ paddingHorizontal: 16, paddingTop: 10, gap: 10 }}>
                <Pressable
                  onPress={() => {
                    tippen();
                    zufall();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Zufallsfrage"
                  style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }, leuchten(farben.orange, 0.35, 14, 3)]}
                >
                  <LinearGradient colors={verlauf.knopf} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 58, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="shuffle" sf="shuffle" size={19} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...schrift.textFett, fontSize: 16, color: "#FFFFFF" }}>Zufallsfrage</Text>
                      <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: "rgba(255,255,255,0.85)" }}>{thema ? `aus „${themaVon(thema).titel}“` : "aus allen Themen"}, noch nicht gefragt</Text>
                    </View>
                    <Icon name="chevron-forward" size={18} color="#FFFFFF" />
                  </LinearGradient>
                </Pressable>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 44, borderRadius: 22, paddingHorizontal: 14, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)" }}>
                  <Icon name="search" size={16} color="rgba(255,255,255,0.55)" />
                  <TextInput value={suche} onChangeText={setSuche} placeholder="Frage suchen" placeholderTextColor="rgba(255,255,255,0.45)" returnKeyType="search" style={{ flex: 1, height: 44, color: "#FFFFFF", ...schrift.textMittel, fontSize: 15 }} />
                  {suche ? (
                    <Pressable onPress={() => setSuche("")} hitSlop={8} accessibilityLabel="Suche leeren">
                      <Icon name="close-circle" size={17} color="rgba(255,255,255,0.45)" />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 7, paddingHorizontal: 16, paddingVertical: 10 }}>
                <ThemenChip text="Alle" aktiv={!thema} onPress={() => setThema(null)} />
                {themen.map((t) => (
                  <ThemenChip key={t.id} text={t.titel} aktiv={thema === t.id} onPress={() => setThema(t.id)} />
                ))}
              </ScrollView>

              <FlatList
                style={{ flex: 1 }}
                data={liste}
                keyExtractor={(f) => f.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 14) + 8, gap: 8 }}
                ListEmptyComponent={<Text style={{ ...schrift.textMittel, fontSize: 14, color: "rgba(255,255,255,0.55)", textAlign: "center", marginTop: 24 }}>Keine passende Frage gefunden.</Text>}
                renderItem={({ item }) => {
                  const schon = gefragt.includes(item.id);
                  return (
                    <Pressable
                      onPress={() => {
                        tippen();
                        setVorschau(item);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={item.text}
                      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, paddingLeft: 9, paddingRight: 12, borderRadius: 18, backgroundColor: pressed ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.045)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", opacity: schon ? 0.6 : 1 })}
                    >
                      <MiniBild frage={item} />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={{ ...schrift.textHalb, fontSize: 14.5, lineHeight: 19, color: "#FFFFFF" }} numberOfLines={2}>
                          {item.text}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ ...schrift.textMittel, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{themaVon(item.thema).titel}</Text>
                          {schon ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, height: 18, borderRadius: 9, backgroundColor: "rgba(78,208,83,0.16)" }}>
                              <Icon name="checkmark" size={10} color={GRUEN} />
                              <Text style={{ ...schrift.textHalb, fontSize: 10.5, color: GRUEN }}>schon gefragt</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <Icon name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
                    </Pressable>
                  );
                }}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
