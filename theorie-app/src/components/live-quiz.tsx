import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Circle, Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

import { useFenster } from "@/lib/fenster";
import { DekoSvg } from "@/components/grafik";
import { Icon, type IconName } from "@/components/icon";
import { Lageplan } from "@/components/lagen";
import { Kontrollleuchte } from "@/components/leuchten";
import { NutzerBild } from "@/components/profilbild";
import { Verkehrszeichen } from "@/components/zeichen";
import { FRAGEN, THEMEN, themaVon, type Frage, type LageKey, type LeuchteKey, type ThemaId, type ZeichenKey } from "@/lib/fragen";
import { erfolg, fehler as fehlerRuetteln, stoss, tippen } from "@/lib/haptik";
import { QUIZ_DAUERN, QUIZ_FRAGEN, quizLoesung, quizRestzeit, type LiveQuiz, type QuizLage, type QuizStand, type QuizZwischenstand } from "@/lib/live-quiz";
import { farben, leuchten, mitDeckkraft, schrift, verlauf } from "@/lib/theme";

// Live-Quiz: Läuft eine Frage, teilt sich der Bildschirm – oben die Kamera,
// unten über die ganze Breite der Quiz-Bereich, der weich ins Video übergeht.
// An der Naht sitzt ein rundes Abzeichen: erst der Countdown, dann Ergebnis,
// Trefferquote oder Pokal. Dazu die Auswahl der Frage aus dem Katalog.

export const BUCHSTABEN = ["A", "B", "C", "D", "E", "F"];
export const GRUEN = farben.gruen;
export const ROT = "#FF5A4E";
const LIVE_ROT = "#FF2D55";
export const GOLD = "#F5C451";
const MEDAILLE = [GOLD, "#C9D1DB", "#D99A6C"];
const LIVE_VERLAUF = ["#FF5A5F", "#FF2D55", "#E0124A"] as const;
const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;
const ABZEICHEN_GRUND = "#15161B";
const BEKANNTE_BILDER = new Set<string>(FRAGEN.flatMap((f) => (f.bild ? [f.bild] : [])));

/** Durchmesser des runden Abzeichens an der Naht zwischen Video und Quiz. */
const ABZEICHEN = 52;
/** Höhe des weichen Übergangs oben im Quiz-Bereich – so weit reicht das Video hinein. */
export const QUIZ_UEBERBLEND = 96;
const BEREICH_GRUND = "#0C0D11";
/** Abstand der ersten Zeile im Bereich; das Abzeichen sitzt auf ihrer Höhe. */
const INHALT_OBEN = 52;
/** So weit reicht das Leuchten über den Bereich nach oben (ins Video). */
const GLUT_OBEN = 60;

export type Zustand = "offen" | "gewaehlt" | "richtig" | "falsch" | "verpasst";

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

/** Bereich gleitet von unten herein, sobald eine Frage kommt, und beim Ende wieder hinaus. */
function useAuftritt(schluessel: string | null, weg: boolean) {
  const wert = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!schluessel) return;
    wert.setValue(0);
    Animated.spring(wert, { toValue: 1, friction: 9, tension: 70, useNativeDriver: true }).start();
  }, [schluessel, wert]);
  useEffect(() => {
    if (!weg) return;
    Animated.timing(wert, { toValue: 0, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start();
  }, [weg, wert]);
  return {
    opacity: wert.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] }),
    transform: [{ translateY: wert.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) }],
  };
}

// ---------------------------------------------------------------------------
// Bereich und Abzeichen
// ---------------------------------------------------------------------------

/**
 * Quiz-Bereich über die ganze Breite: oben ein weicher Übergang ins Video, an
 * der Naht das Abzeichen mit warmem Glühen (grün/rot/gold nach der Auflösung).
 */
export function Bereich({ abzeichen, glut = farben.orange, unten, children }: { abzeichen: ReactNode; glut?: string; unten: number; children: ReactNode }) {
  const { width } = useFenster();
  return (
    <View>
      <LinearGradient pointerEvents="none" colors={["rgba(12,13,17,0)", "rgba(12,13,17,0.8)", BEREICH_GRUND]} locations={[0, 0.5, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: QUIZ_UEBERBLEND }} />
      <View pointerEvents="none" style={{ position: "absolute", top: QUIZ_UEBERBLEND, left: 0, right: 0, bottom: 0, backgroundColor: BEREICH_GRUND }} />
      {/* Leuchten hinter dem Abzeichen – ragt nach oben ins Video, damit es nirgends hart abgeschnitten wird */}
      <DekoSvg width={width} height={GLUT_OBEN + INHALT_OBEN + 15 + 100} style={{ position: "absolute", top: -GLUT_OBEN, left: 0 }}>
        <Defs>
          <RadialGradient id="quiz-glut" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={glut} stopOpacity={0.42} />
            <Stop offset="0.45" stopColor={glut} stopOpacity={0.14} />
            <Stop offset="1" stopColor={glut} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width / 2} cy={GLUT_OBEN + INHALT_OBEN + 15} rx={width * 0.5} ry={88} fill="url(#quiz-glut)" />
      </DekoSvg>
      <View style={{ paddingTop: INHALT_OBEN, paddingHorizontal: 16, paddingBottom: unten, gap: 12 }}>{children}</View>
      <View pointerEvents="box-none" style={{ position: "absolute", top: INHALT_OBEN + 15 - ABZEICHEN / 2, left: 0, right: 0, alignItems: "center" }}>
        {abzeichen}
      </View>
    </View>
  );
}

/** Abzeichen springt beim Wechsel (Auflösung, Rangliste) kurz auf. */
export function Aufploppen({ schluessel, children }: { schluessel: string; children: ReactNode }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    w.setValue(0);
    Animated.spring(w, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
  }, [schluessel, w]);
  return <Animated.View style={{ transform: [{ scale: w.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }}>{children}</Animated.View>;
}

/** Ring mit Anteil (0–1) und Inhalt in der Mitte – für Countdown und Trefferquote. */
export function Ring({ anteil, farbe, children }: { anteil: number; farbe: string; children: ReactNode }) {
  const d = ABZEICHEN;
  const r = d / 2 - 5;
  const umfang = 2 * Math.PI * r;
  return (
    <View style={[{ width: d, height: d, borderRadius: d / 2 }, leuchten(farbe, 0.6, 12, 0)]}>
      <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: ABZEICHEN_GRUND, alignItems: "center", justifyContent: "center" }}>
        <DekoSvg width={d} height={d} style={{ position: "absolute", top: 0, left: 0 }}>
          <Circle cx={d / 2} cy={d / 2} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={4} fill="none" />
          {anteil > 0.005 ? (
            <Circle
              cx={d / 2}
              cy={d / 2}
              r={r}
              stroke={farbe}
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${umfang} ${umfang}`}
              strokeDashoffset={umfang * (1 - Math.min(1, anteil))}
              transform={`rotate(-90 ${d / 2} ${d / 2})`}
            />
          ) : null}
        </DekoSvg>
        {children}
      </View>
    </View>
  );
}

/** Countdown: Sekunden im Ring, die letzten fünf rot und pulsierend. */
function ZeitRing({ quiz }: { quiz: LiveQuiz }) {
  const rest = useRestzeit(quiz);
  const sek = Math.ceil(rest / 1000);
  const knapp = rest > 0 && sek <= 5;
  const puls = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!knapp) return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(puls, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(puls, { toValue: 0, duration: 580, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => {
      a.stop();
      puls.setValue(0);
    };
  }, [knapp, puls]);
  return (
    <Animated.View accessibilityLabel={rest > 0 ? `Noch ${sek} Sekunden` : "Zeit ist um"} style={{ transform: [{ scale: puls.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] }}>
      <Ring anteil={rest / Math.max(1, quiz.dauer * 1000)} farbe={knapp ? LIVE_ROT : farben.orange}>
        {rest > 0 ? (
          <Text style={{ ...schrift.titel, fontSize: 19, color: knapp ? "#FF6B85" : "#FFFFFF", fontVariant: ["tabular-nums"] }}>{sek}</Text>
        ) : (
          <Icon name="hourglass-outline" size={20} color="rgba(255,255,255,0.75)" />
        )}
      </Ring>
    </Animated.View>
  );
}

/** Rundes Abzeichen mit Symbol: leuchtender Verlauf, helle Kante, kein dunkler Ring. */
export function SymbolAbzeichen({ icon, verlaufFarben, dunkel }: { icon: IconName; verlaufFarben: readonly [string, string]; dunkel?: boolean }) {
  const d = ABZEICHEN;
  return (
    <View style={[{ width: d, height: d, borderRadius: d / 2 }, leuchten(verlaufFarben[1], 0.7, 16, 0)]}>
      <LinearGradient colors={verlaufFarben} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ width: d, height: d, borderRadius: d / 2, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.45)" }}>
        <Icon name={icon} size={25} color={dunkel ? "#3A2600" : "#FFFFFF"} weight="bold" />
      </LinearGradient>
    </View>
  );
}

export const GRUEN_VERLAUF = ["#86EA92", "#2FAE45"] as const;
export const ROT_VERLAUF = ["#FF9488", "#E2382C"] as const;
export const GRAU_VERLAUF = ["#A9AEB6", "#5D626B"] as const;
export const GOLD_VERLAUF = ["#FFE7A0", "#F2A21F"] as const;

export const Pokal = () => <SymbolAbzeichen icon="trophy" verlaufFarben={GOLD_VERLAUF} dunkel />;

/** Kopfzeile in der Karte – links und rechts vom Abzeichen. */
export function KopfZeile({ links, rechts }: { links: ReactNode; rechts?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", height: 30 }}>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 5, paddingRight: 6 }}>{links}</View>
      <View style={{ width: ABZEICHEN }} />
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", paddingLeft: 6 }}>{rechts}</View>
    </View>
  );
}

export function Etikett({ text, icon, iconFarbe, farbe = "rgba(255,255,255,0.75)" }: { text: string; icon?: IconName; iconFarbe?: string; farbe?: string }) {
  return (
    <>
      {icon ? <Icon name={icon} size={12} color={iconFarbe ?? (icon === "trophy" ? GOLD : farben.orange)} /> : null}
      <Text style={{ ...schrift.textFett, fontSize: 11.5, letterSpacing: 1.1, color: farbe, flexShrink: 1 }} numberOfLines={1}>
        {text}
      </Text>
    </>
  );
}

export function RundKnopf({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
    >
      <Icon name="close" size={14} color="rgba(255,255,255,0.85)" weight="semibold" />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Frage und Antworten
// ---------------------------------------------------------------------------

/** Kleines Bild zur Frage (Zeichen, Lageplan, Leuchte) – antippen vergrößert. */
export function QuizBild({ bild }: { bild: string | null }) {
  const [gross, setGross] = useState(false);
  const { width } = useFenster();
  if (!bild || !BEKANNTE_BILDER.has(bild)) return null;
  const lage = bild.startsWith("lage_");
  const leuchte = bild.startsWith("leuchte_");
  const inhalt = (b: number) =>
    lage ? <Lageplan lage={bild as LageKey} breite={b} /> : leuchte ? <Kontrollleuchte leuchte={bild as LeuchteKey} groesse={b * 0.8} /> : <Verkehrszeichen zeichen={bild as ZeichenKey} groesse={b * 0.86} />;
  const breite = lage ? 96 : 60;
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
        style={{ width: breite, height: hoehe, borderRadius: 14, overflow: "hidden", backgroundColor: lage ? farben.gelaende : "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
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

function FrageText({ quiz }: { quiz: LiveQuiz }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <QuizBild bild={quiz.bild} />
      <Text style={{ ...schrift.titelHalb, flex: 1, fontSize: 17, lineHeight: 23, color: "#FFFFFF" }}>{quiz.frage}</Text>
    </View>
  );
}

/** Buchstabe links an der Antwort: Haken beim Wählen, grün oder rot nach der Auflösung. */
function Marke({ zustand, buchstabe }: { zustand: Zustand; buchstabe: string }) {
  const basis = { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" } as const;
  if (zustand === "gewaehlt") {
    return (
      <View style={[basis, { backgroundColor: farben.orange }]}>
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
    <View style={[basis, zustand === "verpasst" ? { borderWidth: 2, borderColor: GRUEN } : { backgroundColor: "rgba(255,255,255,0.1)" }]}>
      <Text style={{ ...schrift.textFett, fontSize: 13.5, color: zustand === "verpasst" ? GRUEN : "#FFFFFF" }}>{buchstabe}</Text>
    </View>
  );
}

/** Eine Antwort als Pille; gewählt leuchtet sie orange. Dahinter auf Wunsch ein Balken (Stimmen). */
export function AntwortZeile({
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
  useEffect(() => {
    Animated.timing(breite, { toValue: anteil ?? 0, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [anteil, breite]);

  // Gewählt: ruhig – oranger Rand, leicht getönt, kein Leuchten und kein Hüpfen (die Zeile bleibt gleich groß).
  const gewaehlt = zustand === "gewaehlt";
  const rand = gewaehlt ? farben.orange : zustand === "richtig" || zustand === "verpasst" ? GRUEN : zustand === "falsch" ? ROT : "rgba(255,255,255,0.1)";
  const grund = gewaehlt ? "rgba(252,91,14,0.14)" : zustand === "richtig" ? "rgba(78,208,83,0.1)" : zustand === "falsch" ? "rgba(255,90,78,0.1)" : "rgba(255,255,255,0.06)";
  const balken = balkenFarbe ?? (zustand === "richtig" || zustand === "verpasst" ? "rgba(78,208,83,0.28)" : zustand === "falsch" ? "rgba(255,90,78,0.24)" : "rgba(255,255,255,0.1)");

  return (
    <View style={{ borderRadius: 18 }}>
      <Pressable
        disabled={!onPress}
        onPress={() => {
          tippen();
          onPress?.();
        }}
        accessibilityRole={onPress ? "checkbox" : undefined}
        accessibilityState={onPress ? { checked: gewaehlt } : undefined}
        accessibilityLabel={`Antwort ${buchstabe}: ${text}${rechts ? `, ${rechts}` : ""}`}
        style={({ pressed }) => ({
          minHeight: 52,
          borderRadius: 18,
          borderWidth: 1.5,
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 10, paddingRight: 14, minHeight: 50 }}>
          <Marke zustand={zustand} buchstabe={buchstabe} />
          <Text style={{ ...(zustand === "offen" ? schrift.textMittel : schrift.textHalb), flex: 1, fontSize: 15, lineHeight: 20, color: "#FFFFFF" }}>{text}</Text>
          {loesung ? <Icon name="checkmark-circle" size={18} color={GRUEN} /> : null}
          {rechts ? <Text style={{ ...schrift.textFett, fontSize: 14.5, color: "#FFFFFF", fontVariant: ["tabular-nums"], minWidth: 40, textAlign: "right" }}>{rechts}</Text> : null}
        </View>
      </Pressable>
    </View>
  );
}

/** Großer Knopf in der Karte: Orange (Haupt) oder Glas (Neben). */
export function KartenKnopf({ titel, icon, haupt, aus, onPress, style }: { titel: string; icon?: IconName; haupt?: boolean; aus?: boolean; onPress: () => void; style?: StyleProp<ViewStyle> }) {
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
      style={({ pressed }) => [{ borderRadius: 25, transform: [{ scale: pressed ? 0.98 : 1 }] }, haupt && !aus ? leuchten(farben.orange, 0.45, 14, 4) : null, style]}
    >
      <View style={{ height: 50, borderRadius: 25, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18, backgroundColor: haupt && !aus ? undefined : "rgba(255,255,255,0.08)", borderWidth: haupt && !aus ? 0 : 1, borderColor: "rgba(255,255,255,0.1)" }}>
        {haupt && !aus ? <LinearGradient colors={verlauf.knopf} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={FUELLEN} /> : null}
        {icon ? <Icon name={icon} size={17} color={aus ? "rgba(255,255,255,0.45)" : "#FFFFFF"} /> : null}
        <Text style={{ ...schrift.textFett, fontSize: 15.5, color: aus ? "rgba(255,255,255,0.45)" : "#FFFFFF" }} numberOfLines={1}>
          {titel}
        </Text>
      </View>
    </Pressable>
  );
}

/** Ruhiger Hinweis anstelle des Knopfs („Antwort ist drin“, „Zeit ist um“). */
export function Hinweispille({ icon, farbe, text, zusatz }: { icon: IconName; farbe: string; text: string; zusatz?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 25, backgroundColor: mitDeckkraft(farbe, 0.12), borderWidth: 1, borderColor: mitDeckkraft(farbe, 0.35) }}>
      <Icon name={icon} size={18} color={farbe} />
      <Text style={{ ...schrift.textFett, fontSize: 15, color: "#FFFFFF" }}>{text}</Text>
      {zusatz ? <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: "rgba(255,255,255,0.6)" }}>{zusatz}</Text> : null}
    </View>
  );
}

/** Erklärung nach der Auflösung: „Merke“ mit Akzentlinie, immer ganz zu lesen. */
export function Erklaerung({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View style={{ flexDirection: "row", gap: 12, paddingVertical: 2 }}>
      <LinearGradient colors={["#FFB25C", "#FC5B0E"]} style={{ width: 3, borderRadius: 2 }} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Icon name="bulb" size={13} color="#FFB27A" />
          <Text style={{ ...schrift.textFett, fontSize: 11.5, letterSpacing: 1.2, color: "#FFB27A" }}>MERKE</Text>
        </View>
        <Text style={{ ...schrift.textMittel, fontSize: 14.5, lineHeight: 21, color: "rgba(255,255,255,0.9)" }}>{text}</Text>
      </View>
    </View>
  );
}

/** Punkte nach einer richtigen Antwort – springen kurz auf. */
function PunkteChip({ punkte }: { punkte: number }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(w, { toValue: 1, friction: 4, tension: 120, delay: 250, useNativeDriver: true }).start();
  }, [w]);
  return (
    <Animated.View style={[{ borderRadius: 15, transform: [{ scale: w.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }], opacity: w }, leuchten(GOLD, 0.5, 10, 0)]}>
      <LinearGradient colors={["#FFD66B", "#F5A524"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: "row", alignItems: "center", gap: 3, height: 30, paddingHorizontal: 12, borderRadius: 15 }}>
        <Icon name="flash" size={13} color="#2A1A05" />
        <Text style={{ ...schrift.titel, fontSize: 15, color: "#2A1A05", fontVariant: ["tabular-nums"] }}>+{zahl(punkte)}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Rangliste mit Podest
// ---------------------------------------------------------------------------

export type PodestPerson = { id: string; name: string; bild_pfad: string | null; avatar_farbe?: string; platz: number };

/** Die drei Besten auf dem Podest: Platz 2 links, 1 in der Mitte, 3 rechts. `wert` steht unter dem Namen. */
export function Podest<P extends PodestPerson>({ spieler, ichId, wert }: { spieler: P[]; ichId?: string | null; wert: (p: P) => string }) {
  const plaetze = [2, 1, 3].map((p) => spieler.find((s) => s.platz === p));
  const sockel = [36, 52, 26];
  const bild = [44, 54, 44];
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
      {plaetze.map((s, i) => {
        if (!s) return <View key={i} style={{ flex: 1 }} />;
        const m = MEDAILLE[s.platz - 1];
        return (
          <View key={s.id} style={{ flex: 1, alignItems: "center" }}>
            {s.platz === 1 ? <Icon name="trophy" size={18} color={GOLD} style={{ marginBottom: 5 }} /> : null}
            <View style={[{ borderRadius: 40 }, leuchten(m, 0.55, 10, 0)]}>
              <View style={{ padding: 2.5, borderRadius: 40, backgroundColor: m }}>
                <NutzerBild pfad={s.bild_pfad} name={s.name} farbe={s.avatar_farbe} groesse={bild[i]} rand={0} />
              </View>
            </View>
            <Text style={{ ...schrift.textFett, fontSize: 13.5, color: "#FFFFFF", marginTop: 6, maxWidth: "100%" }} numberOfLines={1}>
              {s.id === ichId ? "Du" : s.name}
            </Text>
            <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: s.platz === 1 ? GOLD : "rgba(255,255,255,0.7)", fontVariant: ["tabular-nums"] }}>{wert(s)}</Text>
            <LinearGradient colors={[mitDeckkraft(m, 0.42), mitDeckkraft(m, 0.06)]} style={{ alignSelf: "stretch", height: sockel[i], marginTop: 6, borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ ...schrift.titel, fontSize: 17, color: m }}>{s.platz}</Text>
            </LinearGradient>
          </View>
        );
      })}
    </View>
  );
}

export function RanglistenZeile({ platz, name, bildPfad, farbe, punkte, wert, ich }: { platz: number; name: string; bildPfad?: string | null; farbe?: string; punkte: number; wert?: string; ich?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 7,
        paddingLeft: 10,
        paddingRight: 14,
        borderRadius: 14,
        backgroundColor: ich ? "rgba(252,91,14,0.15)" : "rgba(255,255,255,0.05)",
        borderWidth: 1,
        borderColor: ich ? "rgba(252,91,14,0.55)" : "rgba(255,255,255,0.07)",
      }}
    >
      <Text style={{ ...schrift.textFett, width: 24, textAlign: "center", fontSize: 13.5, color: "rgba(255,255,255,0.65)" }}>{platz}</Text>
      {bildPfad !== undefined ? <NutzerBild pfad={bildPfad} name={name} farbe={farbe} groesse={26} rand={0} /> : null}
      <Text style={{ ...schrift.textHalb, flex: 1, fontSize: 14.5, color: "#FFFFFF" }} numberOfLines={1}>
        {name}
      </Text>
      <Text style={{ ...schrift.titel, fontSize: 14.5, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{wert ?? zahl(punkte)}</Text>
    </View>
  );
}

/** Eigener Platz außerhalb der Top 5 – abgesetzt mit drei Punkten, als eigene Karte. */
function DeinPlatz({ stand }: { stand: QuizStand }) {
  return (
    <>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 5, marginVertical: -1 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.28)" }} />
        ))}
      </View>
      <View style={[{ borderRadius: 18 }, leuchten(farben.orange, 0.3, 14, 2)]}>
        <LinearGradient colors={["rgba(252,91,14,0.24)", "rgba(252,91,14,0.08)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 10, paddingRight: 16, borderRadius: 18, borderWidth: 1, borderColor: "rgba(252,91,14,0.5)" }}>
          <LinearGradient colors={verlauf.knopf} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ ...schrift.titel, fontSize: stand.platz > 99 ? 13 : 16, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{stand.platz}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={{ ...schrift.textFett, fontSize: 15.5, color: "#FFFFFF" }}>Dein Platz</Text>
            <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: "rgba(255,255,255,0.65)" }}>von {stand.spieler} Mitspielern</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ ...schrift.titel, fontSize: 17, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{zahl(stand.punkte)}</Text>
            <Text style={{ ...schrift.textMittel, fontSize: 11.5, color: "rgba(255,255,255,0.6)" }}>Punkte</Text>
          </View>
        </LinearGradient>
      </View>
    </>
  );
}

function RanglisteInhalt({ quiz, ichId, stand }: { quiz: LiveQuiz; ichId?: string | null; stand?: QuizStand | null }) {
  if (!quiz.bestenliste.length) {
    return <Text style={{ ...schrift.textMittel, fontSize: 14.5, lineHeight: 20, color: "rgba(255,255,255,0.7)", textAlign: "center", paddingVertical: 10 }}>Noch hat niemand Punkte – bei der nächsten Frage!</Text>;
  }
  const rest = quiz.bestenliste.filter((s) => s.platz > 3).slice(0, 2);
  return (
    <View style={{ gap: 8 }}>
      <Podest spieler={quiz.bestenliste} ichId={ichId} wert={(p) => zahl(p.punkte)} />
      {rest.map((s) => (
        <RanglistenZeile key={s.id} platz={s.platz} name={s.id === ichId ? `${s.name} (du)` : s.name} bildPfad={s.bild_pfad} farbe={s.avatar_farbe} punkte={s.punkte} ich={s.id === ichId} />
      ))}
      {stand && stand.platz > 5 ? <DeinPlatz stand={stand} /> : null}
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
  unten,
  weg = false,
  xp,
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
  /** Abstand unten (Tab-Leiste bzw. sicherer Bereich). */
  unten: number;
  /** Quiz ist vorbei: Bereich gleitet hinaus. */
  weg?: boolean;
  /** XP fürs Mitspielen (nur wenn Belohnungen eingeblendet sind). */
  xp?: number | null;
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
  const auftritt = useAuftritt(quiz?.id ?? null, weg);

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
  const thema = THEMEN.find((t) => t.id === quiz.thema);

  async function abschicken() {
    if (!auswahl.length || sendet) return;
    setSendet(true);
    const problem = await onAntworten(auswahl);
    setSendet(false);
    if (problem) onFehler(problem);
    else erfolg();
  }

  const glut = offen ? farben.orange : quiz.status === "rangliste" ? GOLD : mein ? (mein.richtig ? GRUEN : ROT) : "#8A8F98";
  const abzeichen = offen ? (
    <ZeitRing quiz={quiz} />
  ) : quiz.status === "rangliste" ? (
    <Aufploppen schluessel={`${quiz.id}-rangliste`}>
      <Pokal />
    </Aufploppen>
  ) : (
    <Aufploppen schluessel={`${quiz.id}-ergebnis`}>
      {mein ? <SymbolAbzeichen icon={mein.richtig ? "checkmark" : "close"} verlaufFarben={mein.richtig ? GRUEN_VERLAUF : ROT_VERLAUF} /> : <SymbolAbzeichen icon="time-outline" verlaufFarben={GRAU_VERLAUF} />}
    </Aufploppen>
  );

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
      <Bereich abzeichen={abzeichen} glut={glut} unten={unten}>
          {quiz.status === "rangliste" ? (
            <>
              <KopfZeile links={<Etikett icon="trophy" text="RANGLISTE" />} rechts={<RundKnopf label="Quiz ausblenden" onPress={onAusblenden} />} />
              <RanglisteInhalt quiz={quiz} ichId={ichId} stand={stand} />
            </>
          ) : offen ? (
            <>
              <KopfZeile links={<Etikett icon="flash" text={`FRAGE ${quiz.nummer}`} />} rechts={thema ? <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: "rgba(255,255,255,0.5)", flexShrink: 1 }} numberOfLines={1}>{thema.titel}</Text> : null} />
              <FrageText quiz={quiz} />
              {!beantwortet && !zeitUm && ichId ? <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: "rgba(255,255,255,0.5)", marginTop: -4 }}>Eine oder mehrere Antworten sind richtig</Text> : null}
              <View style={{ gap: 8 }}>{zeilen}</View>
              {!ichId ? (
                <KartenKnopf titel="Zum Mitspielen anmelden" icon="log-in-outline" onPress={onAnmelden} />
              ) : beantwortet ? (
                <Hinweispille icon="checkmark-circle" farbe={GRUEN} text="Antwort ist drin" zusatz="· gleich gibt's die Lösung" />
              ) : zeitUm ? (
                <Hinweispille icon="hourglass-outline" farbe="#AEB3BA" text="Zeit ist um" />
              ) : (
                <KartenKnopf titel={auswahl.length ? "Antwort abschicken" : "Antwort wählen"} icon={auswahl.length ? "paper-plane" : undefined} haupt aus={!auswahl.length || sendet} onPress={abschicken} />
              )}
            </>
          ) : (
            <>
              <KopfZeile links={<Etikett icon="flash" text={`FRAGE ${quiz.nummer}`} />} rechts={<RundKnopf label="Quiz ausblenden" onPress={onAusblenden} />} />
              <Ergebnis quiz={quiz} mein={mein} xp={xp} />
              <View style={{ gap: 7 }}>{zeilen}</View>
              <Erklaerung text={quiz.erklaerung} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="people" size={14} color="rgba(255,255,255,0.55)" />
                <Text style={{ ...schrift.textMittel, flex: 1, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                  {quiz.richtige} von {quiz.teilnehmer} richtig
                </Text>
                {stand ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: "rgba(245,196,81,0.12)" }}>
                    <Icon name="trophy" size={12} color={GOLD} />
                    <Text style={{ ...schrift.textFett, fontSize: 13, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>
                      Platz {stand.platz} · {zahl(stand.punkte)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          )}
      </Bereich>
    </Animated.View>
  );
}

/** Ergebnis groß in der Mitte: richtig mit Punkten, falsch oder nicht dabei. */
/** Kleine Pille „+12 XP“ fürs Mitspielen. */
export function XpPille({ xp }: { xp: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: "rgba(252,91,14,0.16)" }}>
      <Icon name="flash" size={12} color={farben.orange} />
      <Text style={{ ...schrift.textFett, fontSize: 12.5, color: farben.orange }}>+{xp} XP</Text>
    </View>
  );
}

function Ergebnis({ quiz, mein, xp }: { quiz: LiveQuiz; mein: QuizLage["mein"]; xp?: number | null }) {
  const dabei = Boolean(mein);
  const gut = Boolean(mein?.richtig);
  const c = !dabei ? "#FFFFFF" : gut ? GRUEN : ROT;
  const loesung = loesungText(quiz, quiz.richtig ?? []);
  return (
    <View style={{ alignItems: "center", gap: 8, marginTop: -2 }}>
      <Text style={{ ...schrift.titel, fontSize: 27, lineHeight: 32, color: c, textShadowColor: mitDeckkraft(c, 0.45), textShadowRadius: 18 }}>{!dabei ? "Nicht mitgespielt" : gut ? "Richtig!" : "Leider falsch"}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {gut && mein && mein.punkte > 0 ? <PunkteChip punkte={mein.punkte} /> : null}
        {dabei && xp ? <XpPille xp={xp} /> : null}
        {loesung ? <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: "rgba(255,255,255,0.7)" }}>Richtig ist {loesung}</Text> : null}
      </View>
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
  unten,
  weg = false,
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
  /** Abstand unten (sicherer Bereich). */
  unten: number;
  /** Quiz ist vorbei: Bereich gleitet hinaus. */
  weg?: boolean;
  onLayout?: (e: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const auftritt = useAuftritt(quiz.id, weg);
  const offen = quiz.status === "offen";
  const loesung = quizLoesung(quiz);
  const verteilung = offen ? zwischen?.verteilung : quiz.verteilung;
  const teilnehmer = offen ? (zwischen?.teilnehmer ?? 0) : quiz.teilnehmer;
  const quote = quiz.teilnehmer ? quiz.richtige / quiz.teilnehmer : 0;

  const abzeichen = offen ? (
    <ZeitRing quiz={quiz} />
  ) : quiz.status === "rangliste" ? (
    <Aufploppen schluessel={`${quiz.id}-rangliste`}>
      <Pokal />
    </Aufploppen>
  ) : (
    <Aufploppen schluessel={`${quiz.id}-quote`}>
      <Ring anteil={quote} farbe={GRUEN}>
        <Text style={{ ...schrift.titel, fontSize: 14, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{Math.round(quote * 100)}%</Text>
      </Ring>
    </Aufploppen>
  );

  return (
    <Animated.View style={[style, auftritt]} onLayout={onLayout}>
      <Bereich abzeichen={abzeichen} glut={offen ? farben.orange : quiz.status === "rangliste" ? GOLD : GRUEN} unten={unten}>
          <KopfZeile
            links={quiz.status === "rangliste" ? <Etikett icon="trophy" text="RANGLISTE" /> : <Etikett icon="flash" text={`FRAGE ${quiz.nummer}`} />}
            rechts={<RundKnopf label={offen ? "Frage abbrechen" : "Quiz schließen"} onPress={onSchliessen} />}
          />

          {quiz.status === "rangliste" ? (
            <RanglisteInhalt quiz={quiz} />
          ) : (
            <>
              {offen ? <FrageText quiz={quiz} /> : null}
              <View style={{ gap: 7 }}>
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
                <Text style={{ ...schrift.textHalb, fontSize: 13, color: "rgba(255,255,255,0.78)" }}>
                  {offen ? `${teilnehmer} ${teilnehmer === 1 ? "Antwort" : "Antworten"}` : `${quiz.richtige} von ${quiz.teilnehmer} richtig`}
                </Text>
                {offen ? <Text style={{ ...schrift.textMittel, flexShrink: 1, fontSize: 12, color: "rgba(255,255,255,0.45)" }} numberOfLines={1}>· nur du siehst die Lösung</Text> : null}
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
                style={({ pressed }) => ({ width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(245,196,81,0.14)", borderWidth: 1, borderColor: "rgba(245,196,81,0.4)", alignItems: "center", justifyContent: "center", opacity: beschaeftigt ? 0.5 : pressed ? 0.75 : 1 })}
              >
                <Icon name="trophy" size={20} color={GOLD} />
              </Pressable>
              <KartenKnopf titel="Nächste Frage" icon="arrow-forward" haupt aus={beschaeftigt} onPress={onNaechste} style={{ flex: 1 }} />
            </View>
          ) : (
            <KartenKnopf titel="Nächste Frage" icon="arrow-forward" haupt aus={beschaeftigt} onPress={onNaechste} />
          )}
      </Bereich>
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
  const { height } = useFenster();
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
    <Modal supportedOrientations={["portrait", "landscape"]} visible={sichtbar} transparent animationType="slide" onRequestClose={onSchliessen} statusBarTranslucent>
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
