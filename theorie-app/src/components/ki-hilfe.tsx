import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Keyboard, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient as SvgVerlauf, Path, Stop } from "react-native-svg";

import { HauptKnopf } from "@/components/frage-rahmen";
import { Glas } from "@/components/glas";
import { Icon, type IconName } from "@/components/icon";
import { useFarbwelt } from "@/lib/darstellung";
import { erfolg, tippen } from "@/lib/haptik";
import { kiAntwort, kiBewerten, NACHFRAGEN, NICHT_VERSTANDEN, type KiKontext, type KiNachricht } from "@/lib/ki-hilfe";
import { leuchten, mitDeckkraft, RAND, schrift, verlauf } from "@/lib/theme";

// KI-Hilfe als Sprechblase aus Glas: Sie zeigt auf den KI-Knopf, hat einen
// leuchtenden Rand im Orange der App und bietet „Ich verstehe diese Frage
// nicht“ oder eine eigene Frage an. Die Antwort erscheint in derselben Blase.

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

/** Ring des KI-Knopfs: Gold → Orange → tiefes Rotorange. */
const RAND_FARBEN = ["#FFD27A", "#FF9A3C", "#FC5B0E", "#F2360C"] as const;

/** Rand der Blase – am Knopf kräftig orange, nach oben rechts immer feiner (Stelle, Farbe, Deckkraft). */
const RAND_HELL: [number, string, number][] = [
  [0, "#F2540A", 1],
  [0.3, "#FF8A2A", 0.9],
  [0.65, "#FFB56B", 0.55],
  [1, "#FFD9B0", 0.45],
];
const RAND_DUNKEL: [number, string, number][] = [
  [0, "#FF6A10", 1],
  [0.3, "#FF9A3C", 0.85],
  [0.65, "#FFB060", 0.42],
  [1, "#FFD3A0", 0.22],
];

/** Wo der Knopf liegt, auf den die Blase zeigt (Fensterkoordinaten). */
export type KiAnker = { x: number; y: number; breite: number; hoehe: number; text?: string };

const warte = (ms: number) => new Promise((fertig) => setTimeout(fertig, ms));

function RandVerlauf({ id }: { id: string }) {
  return (
    <Defs>
      <SvgVerlauf id={id} x1="0" y1="0" x2="1" y2="1">
        {RAND_FARBEN.map((c, i) => (
          <Stop key={c} offset={i / (RAND_FARBEN.length - 1)} stopColor={c} />
        ))}
      </SvgVerlauf>
    </Defs>
  );
}

/**
 * Körper der Blase: auf dem iPhone mit iOS 26 echtes Liquid Glass, sonst
 * Unschärfe mit heller bzw. dunkler Tönung (wie der Dialog) – so scheint die
 * Frage dahinter nur verschwommen durch.
 */
function BlasenGlas({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const f = useFarbwelt();
  if (Platform.OS === "ios" && isLiquidGlassAvailable()) {
    return (
      <Glas hell={f.hell} style={style}>
        {children}
      </Glas>
    );
  }
  return (
    <View style={[{ overflow: "hidden" }, style]}>
      <BlurView tint={f.hell ? "light" : "dark"} intensity={85} experimentalBlurMethod="dimezisBlurView" style={FUELLEN} />
      <View style={[FUELLEN, { backgroundColor: f.hell ? "rgba(255,255,255,0.84)" : "rgba(24,26,31,0.84)" }]} />
      {children}
    </View>
  );
}

/** Runder KI-Knopf: Glas mit Verlaufsring, aktiv ganz in Orange. */
function KiKreis({ groesse, aktiv }: { groesse: number; aktiv?: boolean }) {
  const f = useFarbwelt();
  return (
    <View style={{ width: groesse, height: groesse }}>
      {aktiv ? (
        <LinearGradient colors={verlauf.knopf} locations={[0, 0.5, 1]} style={[FUELLEN, { borderRadius: groesse / 2 }]} />
      ) : (
        <Glas hell={f.hell} style={[FUELLEN, { borderRadius: groesse / 2 }]} />
      )}
      <Svg width={groesse} height={groesse} style={FUELLEN} pointerEvents="none">
        <RandVerlauf id="ki-ring" />
        <Circle cx={groesse / 2} cy={groesse / 2} r={groesse / 2 - 1.5} fill="none" stroke="url(#ki-ring)" strokeWidth={aktiv ? 1.5 : 2.5} />
      </Svg>
      <View style={[FUELLEN, { alignItems: "center", justifyContent: "center" }]}>
        <Icon name="sparkles" size={Math.round(groesse * 0.42)} color={aktiv ? "#FFFFFF" : f.orange} />
      </View>
    </View>
  );
}

/** KI-Knopf für die untere Leiste – öffnet die Blase genau darüber. */
export function KiKnopf({ aktiv, onOeffnen }: { aktiv?: boolean; onOeffnen: (anker: KiAnker) => void }) {
  const f = useFarbwelt();
  const ref = useRef<View>(null);
  return (
    <Pressable
      ref={ref}
      onPress={() => {
        tippen();
        ref.current?.measureInWindow((x, y, breite, hoehe) => onOeffnen({ x, y, breite, hoehe }));
      }}
      accessibilityRole="button"
      accessibilityLabel="KI-Hilfe"
      style={({ pressed }) => [{ width: 56, height: 56, borderRadius: 28, transform: [{ scale: pressed ? 0.93 : 1 }] }, leuchten(f.orange, f.hell ? 0.28 : 0.42, 12, 3)]}
    >
      <KiKreis groesse={56} aktiv={aktiv} />
    </Pressable>
  );
}

/** Der Knopf, auf den die Blase zeigt – bleibt hell über dem Schleier. */
function AnkerKopie({ anker, onPress }: { anker: KiAnker; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel="KI-Hilfe schließen" style={{ position: "absolute", left: anker.x, top: anker.y, width: anker.breite, height: anker.hoehe }}>
      {anker.text ? (
        <LinearGradient
          colors={verlauf.knopf}
          locations={[0, 0.5, 1]}
          style={{ flex: 1, borderRadius: anker.hoehe / 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <Icon name="sparkles" size={17} color="#FFFFFF" />
          <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#FFFFFF" }}>{anker.text}</Text>
        </LinearGradient>
      ) : (
        <KiKreis groesse={anker.hoehe} aktiv />
      )}
    </Pressable>
  );
}

/** **fett** innerhalb einer Zeile. Beim Tippen darf ein ** noch offen sein. */
function mitFett(s: string): ReactNode[] {
  return s.split("**").map((t, i) =>
    i % 2 === 1 ? (
      <Text key={i} style={schrift.textFett}>
        {t}
      </Text>
    ) : (
      t
    ),
  );
}

/** Antworttext: Absätze, Listen mit „•“ und **fett**. */
function Formatiert({ text }: { text: string }) {
  const f = useFarbwelt();
  const stil = { ...schrift.text, fontSize: 16, lineHeight: 24, color: f.hell ? "#1D2126" : "#EEF0F2" };
  return (
    <View>
      {text.split("\n").map((zeile, i) => {
        if (!zeile.trim()) return <View key={i} style={{ height: 8 }} />;
        const liste = /^\s*(•|-|\*)\s+/.test(zeile);
        const inhalt = liste ? zeile.replace(/^\s*(•|-|\*)\s+/, "") : zeile.replace(/^#+\s*/, "");
        return (
          <View key={i} style={{ flexDirection: "row", gap: 7 }}>
            {liste ? <Text style={{ ...stil, color: f.orange }}>•</Text> : null}
            <Text style={[stil, { flex: 1 }]}>{mitFett(inhalt)}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Die Antwort erscheint Stück für Stück, wie getippt. */
function TippText({ text, aktiv, onFertig }: { text: string; aktiv: boolean; onFertig: () => void }) {
  const [n, setN] = useState(aktiv ? 0 : text.length);
  const fertig = useRef(onFertig);
  fertig.current = onFertig;

  useEffect(() => {
    if (!aktiv) {
      setN(text.length);
      return;
    }
    let i = 0;
    const schritt = Math.max(2, Math.round(text.length / 90));
    const t = setInterval(() => {
      i = Math.min(text.length, i + schritt);
      setN(i);
      if (i >= text.length) {
        clearInterval(t);
        fertig.current();
      }
    }, 16);
    return () => clearInterval(t);
  }, [text, aktiv]);

  return <Formatiert text={text.slice(0, n)} />;
}

/** „Ich denke nach …“ mit drei hüpfenden Punkten. */
function Denkt() {
  const f = useFarbwelt();
  const werte = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.stagger(
        160,
        werte.map((w) =>
          Animated.sequence([
            Animated.timing(w, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(w, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            Animated.delay(200),
          ]),
        ),
      ),
    );
    a.start();
    return () => a.stop();
  }, [werte]);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
      <View style={{ flexDirection: "row", gap: 5 }}>
        {werte.map((w, i) => (
          <Animated.View
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: f.orange,
              opacity: w.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              transform: [{ translateY: w.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
            }}
          />
        ))}
      </View>
      <Text style={{ ...schrift.textMittel, fontSize: 14.5, color: f.text3 }}>Ich denke nach …</Text>
    </View>
  );
}

function RundKnopf({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.08)",
        transform: [{ scale: pressed ? 0.92 : 1 }],
      })}
    >
      <Icon name={icon} size={17} color={f.text2} weight="semibold" />
    </Pressable>
  );
}

/** Daumen als feine Linie (außerhalb von iOS; dort gibt es SF Symbols). */
function DaumenLinie({ runter, voll, farbe, groesse }: { runter?: boolean; voll: boolean; farbe: string; groesse: number }) {
  return (
    <Svg width={groesse} height={groesse} viewBox="0 0 24 24" style={runter ? { transform: [{ scaleY: -1 }] } : undefined}>
      <Path
        d="M4.8 10.6H7.2V20.2H4.8A1.8 1.8 0 0 1 3 18.4V12.4A1.8 1.8 0 0 1 4.8 10.6ZM7.2 10.6L10.5 4A1.7 1.7 0 0 1 13.7 4.9L13.1 9.1H18.2A2 2 0 0 1 20.2 11.4L19 18.5A2 2 0 0 1 17 20.2H7.2Z"
        fill={voll ? farbe : "none"}
        stroke={farbe}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DaumenKnopf({ runter, aktiv, onPress }: { runter?: boolean; aktiv: boolean; onPress: () => void }) {
  const f = useFarbwelt();
  const farbe = aktiv ? f.orange : f.text2;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={runter ? "Nicht hilfreich" : "Hilfreich"}
      accessibilityState={{ selected: aktiv }}
      style={({ pressed }) => ({
        width: 42,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        backgroundColor: aktiv ? mitDeckkraft(f.orange, f.hell ? 0.12 : 0.18) : "transparent",
        transform: [{ scale: pressed ? 0.9 : 1 }],
      })}
    >
      <Icon
        name={runter ? "thumbs-down-outline" : "thumbs-up-outline"}
        sf={runter ? (aktiv ? "hand.thumbsdown.fill" : "hand.thumbsdown") : aktiv ? "hand.thumbsup.fill" : "hand.thumbsup"}
        fallback={<DaumenLinie runter={runter} voll={aktiv} farbe={farbe} groesse={17} />}
        size={17}
        color={farbe}
      />
    </Pressable>
  );
}

/** „Hilfreich?“ mit Daumen hoch/runter in einer schmalen Glas-Pille. */
function Bewertung({ wert, onWahl }: { wert: boolean | undefined; onWahl: (gut: boolean) => void }) {
  const f = useFarbwelt();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: wert === undefined ? f.text3 : f.orange }}>{wert === undefined ? "Hilfreich?" : "Danke!"}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 1,
          borderRadius: 17,
          borderWidth: 1,
          borderColor: f.hell ? "rgba(20,23,27,0.09)" : "rgba(255,255,255,0.12)",
          backgroundColor: f.hell ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.05)",
        }}
      >
        <DaumenKnopf aktiv={wert === true} onPress={() => onWahl(true)} />
        <View style={{ width: 1, height: 14, backgroundColor: f.hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.12)" }} />
        <DaumenKnopf runter aktiv={wert === false} onPress={() => onWahl(false)} />
      </View>
    </View>
  );
}

const RADIUS = 26;
const SPITZE = 15;

/**
 * Umriss der Blase als ein Pfad – die Spitze wächst aus der Unterkante heraus
 * und zeigt auf `zielX` (bei Knöpfen nah am Rand leicht schräg). Dazu die
 * Fläche der Spitze, damit sie aussieht wie ein Stück vom Glas.
 */
function blasenUmriss(b: number, h: number, zielX: number | null): { umriss: string; flaeche: string | null; spitze: { x: number; y: number } | null } {
  const r = RADIUS;
  const i = 0.75;
  const [L, R, T, B] = [i, b - i, i, h - i];
  const anfang = `M ${L + r} ${T} H ${R - r} A ${r} ${r} 0 0 1 ${R} ${T + r} V ${B - r} A ${r} ${r} 0 0 1 ${R - r} ${B}`;
  const ende = `H ${L + r} A ${r} ${r} 0 0 1 ${L} ${B - r} V ${T + r} A ${r} ${r} 0 0 1 ${L + r} ${T} Z`;
  if (zielX == null) return { umriss: `${anfang} ${ende}`, flaeche: null, spitze: null };
  const mitte = Math.min(R - r - 16, Math.max(L + r + 16, zielX));
  const [x1, x2] = [mitte - 16, mitte + 16];
  const tx = Math.min(R - 4, Math.max(L + 4, zielX));
  const ty = B + SPITZE;
  const kurve = `C ${x2 - 9} ${B} ${tx + 3.5} ${ty - 8} ${tx} ${ty} C ${tx - 2.5} ${ty - 7} ${x1 + 7} ${B} ${x1} ${B}`;
  return {
    umriss: `${anfang} H ${x2} ${kurve} ${ende}`,
    flaeche: `M ${x2 + 3} ${B - 2} L ${x2} ${B} ${kurve} L ${x1 - 3} ${B - 2} Z`,
    spitze: { x: tx, y: ty },
  };
}

/** Heller Pillen-Knopf mit orangem Rand (Nachfragen). */
function NachfragePille({ text, onPress }: { text: string; onPress: () => void }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text}
      style={({ pressed }) => ({
        height: 40,
        paddingHorizontal: 16,
        borderRadius: 20,
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: mitDeckkraft(f.orange, f.hell ? 0.5 : 0.65),
        backgroundColor: pressed ? mitDeckkraft(f.orange, 0.16) : f.hell ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.04)",
      })}
    >
      <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.text }}>{text}</Text>
    </Pressable>
  );
}

/**
 * Sprechblase der KI-Hilfe. `anker` ist der Knopf, auf den sie zeigt (null =
 * zu). Bleibt eingebunden, solange die Frage offen ist – so ist die letzte
 * Antwort beim erneuten Öffnen noch da.
 */
export function KiBlase({ kontext, anker, onSchliessen }: { kontext: KiKontext; anker: KiAnker | null; onSchliessen: () => void }) {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [nachrichten, setNachrichten] = useState<KiNachricht[]>([]);
  const [laedt, setLaedt] = useState(false);
  const [text, setText] = useState("");
  const [tippt, setTippt] = useState<string | null>(null);
  const [tastatur, setTastatur] = useState(0);
  const [mass, setMass] = useState({ b: 0, h: 0 });
  const [bewertet, setBewertet] = useState<Record<string, boolean>>({});
  const rein = useRef(new Animated.Value(0)).current;
  const scroll = useRef<ScrollView>(null);
  const letzterAnker = useRef<KiAnker | null>(null);
  if (anker) letzterAnker.current = anker;
  const a = anker ?? letzterAnker.current;

  useEffect(() => {
    if (!anker) return;
    rein.setValue(0);
    Animated.spring(rein, { toValue: 1, useNativeDriver: true, damping: 17, stiffness: 240, mass: 0.8 }).start();
  }, [anker, rein]);

  useEffect(() => {
    const an = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (e) => setTastatur(e.endCoordinates.height));
    const aus = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setTastatur(0));
    return () => {
      an.remove();
      aus.remove();
    };
  }, []);

  const antwort = [...nachrichten].reverse().find((m) => m.rolle === "ki");
  const frage = [...nachrichten].reverse().find((m) => m.rolle === "ich");
  const offen = nachrichten.length > 0;
  const gefragt = new Set(nachrichten.filter((m) => m.rolle === "ich").map((m) => m.text));
  const vorschlaege = NACHFRAGEN.filter((q) => !gefragt.has(q)).slice(0, 2);

  async function senden(eingabe: string, art: "erklaeren" | "frage", haptik = true) {
    const t = eingabe.trim();
    if (!t || laedt) return;
    if (haptik) tippen();
    Keyboard.dismiss();
    const neu: KiNachricht[] = [...nachrichten, { id: `${Date.now()}-ich`, rolle: "ich", text: t }];
    setNachrichten(neu);
    setText("");
    setLaedt(true);
    // Kurz „nachdenken“, auch wenn die Antwort sofort da ist – wirkt ruhiger.
    const [ergebnis] = await Promise.all([kiAntwort(kontext, neu, art), warte(750)]);
    const id = `${Date.now()}-ki`;
    setNachrichten((alt) => [...alt, { id, rolle: "ki", text: ergebnis.text, quelle: ergebnis.quelle }]);
    setTippt(id);
    setLaedt(false);
  }

  // Neue Antwort: von oben lesen.
  const antwortId = antwort?.id;
  useEffect(() => {
    if (antwortId) scroll.current?.scrollTo({ y: 0, animated: false });
  }, [antwortId]);

  function bewerten(gut: boolean) {
    if (!antwort) return;
    erfolg();
    setBewertet((b) => ({ ...b, [antwort.id]: gut }));
    kiBewerten(kontext.frage.id, gut, antwort.text);
  }

  // Lage: über dem Knopf (unten auf dem Bildschirm) oder darunter; mit Tastatur direkt darüber.
  const drueber = !a || a.y > height * 0.42;
  const breite = width - RAND * 2;
  const spitzeX = a ? Math.min(breite - 8, Math.max(8, a.x + a.breite / 2 - RAND)) : breite / 2;
  let lage: ViewStyle;
  let maxHoehe: number;
  if (tastatur > 0) {
    lage = { bottom: tastatur + 10 };
    maxHoehe = height - tastatur - insets.top - 34;
  } else if (drueber) {
    const unten = a ? height - a.y + 16 : insets.bottom + 90;
    lage = { bottom: unten };
    maxHoehe = height - unten - insets.top - 20;
  } else {
    const oben = (a?.y ?? 0) + (a?.hoehe ?? 0) + 16;
    lage = { top: oben };
    maxHoehe = height - oben - insets.bottom - 20;
  }
  maxHoehe = Math.min(maxHoehe, height * 0.74);
  const mitSpitze = tastatur === 0 && a != null;
  const umriss = mass.b > 0 ? blasenUmriss(mass.b, mass.h, mitSpitze ? spitzeX : null) : null;

  const eingabeZeile = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={offen ? "Frag weiter …" : "Oder frag etwas anderes …"}
        placeholderTextColor={f.text3}
        maxLength={300}
        returnKeyType="send"
        onSubmitEditing={() => senden(text, "frage")}
        style={{
          flex: 1,
          height: 48,
          borderRadius: 24,
          paddingHorizontal: 18,
          backgroundColor: f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.08)",
          color: f.text,
          ...schrift.text,
          fontSize: 15.5,
        }}
      />
      <Pressable
        onPress={() => senden(text, "frage")}
        disabled={!text.trim() || laedt}
        accessibilityRole="button"
        accessibilityLabel="Senden"
        style={({ pressed }) => ({ opacity: !text.trim() || laedt ? 0.35 : 1, transform: [{ scale: pressed ? 0.93 : 1 }] })}
      >
        <LinearGradient colors={verlauf.knopf} locations={[0, 0.5, 1]} style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" }}>
          <Icon name="arrow-up" size={21} color="#FFFFFF" weight="bold" />
        </LinearGradient>
      </Pressable>
    </View>
  );

  const hinweis = (
    <Text style={{ ...schrift.textMittel, fontSize: 11.5, color: f.text3, textAlign: "right" }}>KI-Antworten können fehlerhaft sein</Text>
  );

  return (
    <Modal visible={anker != null} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onSchliessen}>
      <Pressable onPress={onSchliessen} accessibilityLabel="KI-Hilfe schließen" style={[FUELLEN, { backgroundColor: f.hell ? "rgba(24,18,10,0.36)" : "rgba(0,0,0,0.58)" }]} />
      {a && tastatur === 0 ? <AnkerKopie anker={a} onPress={onSchliessen} /> : null}

      <Animated.View
        style={[
          { position: "absolute", left: RAND, right: RAND },
          lage,
          {
            opacity: rein,
            transform: [{ scale: rein.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
            transformOrigin: `${spitzeX + 0}px ${drueber ? "100%" : "0%"}`,
          },
        ]}
      >
        <View
          onLayout={(e) => setMass({ b: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
          style={[{ borderRadius: RADIUS }, f.hell ? leuchten("#7A3208", 0.2, 22, 6) : leuchten(f.orange, 0.32, 24, 2)]}
        >
          <BlasenGlas style={{ borderRadius: RADIUS, maxHeight: maxHoehe }}>
            {/* Leichter Farbhauch von oben – macht das Glas warm */}
            <LinearGradient pointerEvents="none" colors={[mitDeckkraft(f.orange, f.hell ? 0.1 : 0.16), mitDeckkraft(f.orange, 0)]} locations={[0, 0.45]} style={FUELLEN} />

            {!offen ? (
              <View style={{ padding: 18, gap: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                  <View style={[{ borderRadius: 17 }, leuchten(f.orange, 0.4, 8, 2)]}>
                    <LinearGradient colors={verlauf.knopf} locations={[0, 0.5, 1]} style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" }}>
                      <Icon name="sparkles" size={17} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                  <Text style={{ ...schrift.titelFett, fontSize: 18, lineHeight: 23, color: f.text, flex: 1 }}>Wir helfen dir bei dieser Frage!</Text>
                </View>

                {/* Wie die Hauptknöpfe der App: Verlauf, Schein und ab und zu ein Glanz */}
                <HauptKnopf titel={NICHT_VERSTANDEN} onPress={() => senden(NICHT_VERSTANDEN, "erklaeren", false)} />

                {eingabeZeile}
                {hinweis}
              </View>
            ) : (
              <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16, gap: 12, flexShrink: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <RundKnopf
                    icon="chevron-back"
                    label="Zurück"
                    onPress={() => {
                      setNachrichten([]);
                      setTippt(null);
                    }}
                  />
                  <View style={{ flex: 1 }} />
                  {antwort && !laedt ? <Bewertung wert={bewertet[antwort.id]} onWahl={bewerten} /> : null}
                </View>

                {frage ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                    <View style={{ width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: f.orange }} />
                    <Text numberOfLines={2} style={{ ...schrift.textHalb, fontSize: 14, lineHeight: 19, color: f.orange, flexShrink: 1 }}>
                      {frage.text}
                    </Text>
                  </View>
                ) : null}

                <ScrollView
                  ref={scroll}
                  style={{ flexGrow: 0, flexShrink: 1 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {laedt || !antwort ? (
                    <Denkt />
                  ) : (
                    <View style={{ gap: 8 }}>
                      <TippText text={antwort.text} aktiv={tippt === antwort.id} onFertig={() => setTippt(null)} />
                      {antwort.quelle === "lernstoff" ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                          <Icon name="book-outline" size={12} color={f.text3} />
                          <Text style={{ ...schrift.textMittel, fontSize: 12, color: f.text3 }}>Aus dem Lernstoff der App</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </ScrollView>

                {!laedt && !tippt && vorschlaege.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                    {vorschlaege.map((q) => (
                      <NachfragePille key={q} text={q} onPress={() => senden(q, "frage")} />
                    ))}
                  </View>
                ) : null}

                {eingabeZeile}
                {hinweis}
              </View>
            )}
          </BlasenGlas>

          {/* Rand und Spitze als ein Umriss: hell am Knopf, oben feiner */}
          {umriss ? (
            <Svg
              width={mass.b}
              height={mass.h + SPITZE + 2}
              pointerEvents="none"
              style={{ position: "absolute", left: 0, top: drueber ? 0 : -(SPITZE + 2), transform: drueber ? undefined : [{ scaleY: -1 }] }}
            >
              <Defs>
                <SvgVerlauf id="ki-umriss" gradientUnits="userSpaceOnUse" x1={umriss.spitze?.x ?? mass.b * 0.2} y1={umriss.spitze?.y ?? mass.h} x2={mass.b * 0.85} y2={0}>
                  {(f.hell ? RAND_HELL : RAND_DUNKEL).map(([o, c, d]) => (
                    <Stop key={o} offset={o} stopColor={c} stopOpacity={d} />
                  ))}
                </SvgVerlauf>
              </Defs>
              {umriss.flaeche ? <Path d={umriss.flaeche} fill={f.hell ? "#F8F8F8" : "#181B1F"} /> : null}
              <Path d={umriss.umriss} fill="none" stroke="url(#ki-umriss)" strokeWidth={1.5} strokeLinejoin="round" />
            </Svg>
          ) : null}
        </View>
      </Animated.View>
    </Modal>
  );
}
