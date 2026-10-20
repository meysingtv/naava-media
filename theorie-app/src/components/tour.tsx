import { createRef, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import type { Icon as PhosphorIcon } from "phosphor-react-native";
import { ChartLineUpIcon } from "phosphor-react-native/src/icons/ChartLineUp";
import { ConfettiIcon } from "phosphor-react-native/src/icons/Confetti";
import { HandTapIcon } from "phosphor-react-native/src/icons/HandTap";
import { LightningIcon } from "phosphor-react-native/src/icons/Lightning";
import { RocketIcon } from "phosphor-react-native/src/icons/Rocket";
import { SparkleIcon } from "phosphor-react-native/src/icons/Sparkle";
import { TargetIcon } from "phosphor-react-native/src/icons/Target";
import { TrophyIcon } from "phosphor-react-native/src/icons/Trophy";

import { useLeistenHoehe } from "@/components/tab-leiste";
import { useDarstellung } from "@/lib/darstellung";
import { tippen } from "@/lib/haptik";
import { leisteAufklappen } from "@/lib/leisten-scroll";
import { leuchten, schrift, verlauf } from "@/lib/theme";

// App-Tour nach der Einrichtung: Die Seite wird abgedunkelt, nur die erklärte
// Stelle bleibt hell (mit leuchtendem Rahmen), daneben eine Karte mit Titel und
// Text. Antippen irgendwo führt weiter, „Überspringen“ beendet die Tour. Die
// Tour wechselt dabei selbst zwischen Home, Lernen und Prüfung.

type Ziel = "home-werte" | "home-start" | "home-schnell" | "home-fokus" | "tabs" | "lernen-modi" | "pruefen-start";
type Tab = "/heute" | "/lernen" | "/pruefen";
type Schritt = { ziel: Ziel | null; tab: Tab; titel: string; text: string; symbol: PhosphorIcon };

const SCHRITTE: Schritt[] = [
  { ziel: "home-werte", tab: "/heute", titel: "Dein Stand auf einen Blick", text: "Prüfungsreife, Serie und Tagesziel. Tippe auf einen Wert, um mehr zu sehen.", symbol: ChartLineUpIcon },
  { ziel: "home-start", tab: "/heute", titel: "Ein Tipp – los geht's", text: "Die App sucht dir die Fragen aus, die dich gerade am meisten weiterbringen.", symbol: LightningIcon },
  { ziel: "home-schnell", tab: "/heute", titel: "Schnellzugriff", text: "Favoriten, Fehler üben, Karteikarten, Schilder-Jagd, Duell und Statistik – alles mit einem Tipp.", symbol: RocketIcon },
  { ziel: "home-fokus", tab: "/heute", titel: "Dein Fokus heute", text: "Hier holst du am meisten raus: das Thema, bei dem dir gerade am meisten fehlt.", symbol: TargetIcon },
  { ziel: "tabs", tab: "/heute", titel: "Alles in fünf Tabs", text: "Home, Lernen, Clips mit Lives, Prüfung und Profil – hier unten wechselst du jederzeit.", symbol: HandTapIcon },
  { ziel: "lernen-modi", tab: "/lernen", titel: "Lern so, wie du willst", text: "Karteikarten zum Wiederholen, Schilder-Jagd mit der Kamera – darunter Fehler üben, Formeln und mehr.", symbol: SparkleIcon },
  { ziel: "pruefen-start", tab: "/pruefen", titel: "Echte Prüfung üben", text: "30 Fragen, 45 Minuten, Fehlerpunkte wie beim TÜV. Der Tacho zeigt dir, wie bereit du bist.", symbol: TrophyIcon },
  { ziel: null, tab: "/heute", titel: "Du bist startklar!", text: "Viel Erfolg beim Lernen. Die Tour findest du jederzeit wieder in den Einstellungen.", symbol: ConfettiIcon },
];

const GESEHEN = "spur-tour-v1";

// ---------------------------------------------------------------------------
// Zustand (eine Tour für die ganze App)
// ---------------------------------------------------------------------------

let zustand: { aktiv: boolean; index: number } = { aktiv: false, index: 0 };
const hoerer = new Set<() => void>();
const ziele = new Map<Ziel, View>();
/** ScrollView je Tab samt letzter Position – damit die Tour eine Stelle ins Bild holen kann. */
const blaetter = new Map<Tab, { ref: { current: ScrollView | null }; y: number }>();

function setzen(neu: typeof zustand) {
  zustand = neu;
  hoerer.forEach((h) => h());
}

/** Tour von vorn starten (z. B. nach der Einrichtung oder aus den Einstellungen). */
export function tourStarten() {
  setzen({ aktiv: true, index: 0 });
}

function tourBeenden() {
  setzen({ aktiv: false, index: 0 });
  AsyncStorage.setItem(GESEHEN, "ja").catch(() => {});
  router.navigate("/heute");
  const b = blaetter.get("/heute");
  b?.ref.current?.scrollTo({ y: 0, animated: true });
  if (b) b.y = 0;
}

/**
 * Für die ScrollView einer Tab-Seite: `ref` und die beiden End-Ereignisse
 * anhängen. Gemerkt wird nur, wo das Scrollen aufhört (kein Dauer-onScroll).
 */
export function useTourBlatt(tab: Tab) {
  return useMemo(() => {
    const b = { ref: createRef<ScrollView>(), y: 0 };
    blaetter.set(tab, b);
    const merken = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      b.y = e.nativeEvent.contentOffset.y;
    };
    return { ref: b.ref, onScrollEndDrag: merken, onMomentumScrollEnd: merken };
  }, [tab]);
}

/** Stelle, die die Tour erklären kann. Der Rahmen bleibt unsichtbar. */
export function TourZiel({ id, children, style }: { id: Ziel; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<View>(null);
  useEffect(() => {
    const v = ref.current;
    if (v) ziele.set(id, v);
    return () => {
      if (ziele.get(id) === v) ziele.delete(id);
    };
  }, [id]);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}

type Rechteck = { x: number; y: number; w: number; h: number; r: number };

function messen(id: Ziel): Promise<Rechteck | null> {
  const v = ziele.get(id);
  if (!v) return Promise.resolve(null);
  return new Promise((ok) => {
    v.measureInWindow((x, y, w, h) => ok(w > 0 && h > 0 ? { x, y, w, h, r: 22 } : null));
  });
}

/** Ausschnitt: ganze Fläche minus abgerundetes Rechteck (gerade/ungerade Füllung). */
function lochPfad(b: number, hh: number, r: Rechteck): string {
  const { x, y, w, h } = r;
  const k = Math.min(r.r, w / 2, h / 2);
  return `M0 0H${b}V${hh}H0Z M${x + k} ${y}H${x + w - k}A${k} ${k} 0 0 1 ${x + w} ${y + k}V${y + h - k}A${k} ${k} 0 0 1 ${x + w - k} ${y + h}H${x + k}A${k} ${k} 0 0 1 ${x} ${y + h - k}V${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}Z`;
}

// ---------------------------------------------------------------------------
// Overlay (einmal im Layout eingebunden)
// ---------------------------------------------------------------------------

export function TourOverlay() {
  const z = useSyncExternalStore(
    (h) => {
      hoerer.add(h);
      return () => hoerer.delete(h);
    },
    () => zustand,
  );
  const { width: B, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const leiste = useLeistenHoehe();
  const { farbwelt: f } = useDarstellung();
  const [loch, setLoch] = useState<Rechteck | null>(null);
  const [bereit, setBereit] = useState(false);
  const sicht = useRef(new Animated.Value(0)).current;
  const puls = useRef(new Animated.Value(0)).current;
  const schritt = SCHRITTE[z.index];

  // Je Schritt: passenden Tab öffnen, Stelle suchen (ggf. mehrmals), dann einblenden.
  useEffect(() => {
    if (!z.aktiv) {
      setBereit(false);
      return;
    }
    let ab = false;
    setBereit(false);
    sicht.setValue(0);
    router.navigate(schritt.tab);
    const pad = 8;
    const warten = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
    (async () => {
      await warten(380);
      let r: Rechteck | null = null;
      if (schritt.ziel === "tabs") {
        leisteAufklappen();
        const unten = Platform.OS === "ios" ? insets.bottom + 2 : insets.bottom + 10;
        r = { x: 10, y: H - leiste + 2, w: B - 20, h: leiste - unten, r: 32 };
      } else if (schritt.ziel) {
        const ziel = schritt.ziel;
        const suchen = async () => {
          let m: Rechteck | null = null;
          for (let i = 0; i < 15 && !m && !ab; i++) {
            m = await messen(ziel);
            if (!m) await warten(120);
          }
          return m;
        };
        r = await suchen();
        // Liegt die Stelle (teilweise) außerhalb des Bildes, erst hinscrollen.
        const b = blaetter.get(schritt.tab);
        if (r && b?.ref.current && (r.y < insets.top + 12 || r.y + r.h > H - leiste - 12)) {
          const y = Math.max(0, b.y + r.y - Math.max(insets.top + 24, H * 0.42));
          b.ref.current.scrollTo({ y, animated: true });
          b.y = y;
          await warten(450);
          r = (await suchen()) ?? r;
        }
        if (r) {
          // Mit etwas Luft, aber nie über den Bildschirmrand hinaus (z. B. Schnellzugriff).
          // Oben nicht unter die Statusleiste, unten nicht unter die Tab-Leiste.
          const x = Math.max(6, r.x - pad);
          const rechts = Math.min(B - 6, r.x + r.w + pad);
          const y = Math.max(insets.top + 4, r.y - pad);
          const unten = Math.min(H - leiste - 6, r.y + r.h + pad);
          r = { x, y, w: rechts - x, h: unten - y, r: r.r + 4 };
        }
      }
      if (ab) return;
      setLoch(r);
      setBereit(true);
      Animated.timing(sicht, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    })();
    return () => {
      ab = true;
    };
  }, [z.aktiv, z.index]); // eslint-disable-line react-hooks/exhaustive-deps

  // Android-Zurück beendet die Tour, statt die Seite zu wechseln.
  useEffect(() => {
    if (!z.aktiv) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      tourBeenden();
      return true;
    });
    return () => sub.remove();
  }, [z.aktiv]);

  useEffect(() => {
    if (!z.aktiv) return;
    const a = Animated.loop(Animated.sequence([Animated.timing(puls, { toValue: 1, duration: 900, useNativeDriver: true }), Animated.timing(puls, { toValue: 0, duration: 900, useNativeDriver: true })]));
    a.start();
    return () => a.stop();
  }, [z.aktiv, puls]);

  if (!z.aktiv) return null;

  const letzter = z.index === SCHRITTE.length - 1;
  function weiter() {
    tippen();
    if (letzter) tourBeenden();
    else setzen({ aktiv: true, index: z.index + 1 });
  }

  // Karte unter oder über der Stelle – ohne Stelle in der Mitte
  const kartenBreite = Math.min(B - 32, 420);
  const links = (B - kartenBreite) / 2;
  const unterLoch = loch ? loch.y + loch.h / 2 < H * 0.52 : false;
  const kartenLage: ViewStyle = !loch
    ? { top: H * 0.34 }
    : unterLoch
      ? { top: loch.y + loch.h + 14 }
      : { bottom: H - loch.y + 14 };
  const S = schritt.symbol;
  const karte = f.hell ? "#FFFFFF" : "#1B1D22";
  const text = f.hell ? "#14171B" : "#FFFFFF";
  const text2 = f.hell ? "#4D535B" : "rgba(255,255,255,0.72)";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={weiter} accessibilityLabel="Weiter">
        <Svg width={B} height={H} style={StyleSheet.absoluteFill}>
          <Path d={loch && bereit ? lochPfad(B, H, loch) : `M0 0H${B}V${H}H0Z`} fill="rgba(4,6,10,0.74)" fillRule="evenodd" />
        </Svg>
      </Pressable>

      {loch && bereit ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", left: loch.x, top: loch.y, width: loch.w, height: loch.h, borderRadius: loch.r, borderWidth: 2, borderColor: f.orange },
            leuchten(f.orange, 0.7, 16, 0),
            { opacity: Animated.multiply(sicht, puls.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] })), transform: [{ scale: puls.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] }) }] },
          ]}
        />
      ) : null}

      {bereit ? (
        <Animated.View
          style={[
            { position: "absolute", left: links, width: kartenBreite, ...kartenLage },
            { opacity: sicht, transform: [{ translateY: sicht.interpolate({ inputRange: [0, 1], outputRange: [unterLoch ? -10 : 10, 0] }) }] },
          ]}
        >
          <Pressable
            onPress={weiter}
            style={[
              { borderRadius: 24, padding: 18, gap: 10, backgroundColor: karte, borderWidth: StyleSheet.hairlineWidth, borderColor: f.hell ? "rgba(20,23,27,0.08)" : "rgba(255,255,255,0.12)" },
              leuchten("#000000", 0.4, 30, 12),
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <LinearGradient colors={verlauf.knopf as unknown as [string, string, string]} style={[{ width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" }, leuchten(f.orange, 0.45, 10, 2)]}>
                <S size={22} color="#FFFFFF" weight="fill" />
              </LinearGradient>
              <Text style={{ ...schrift.titelFett, fontSize: 18, lineHeight: 23, color: text, flex: 1 }}>{schritt.titel}</Text>
              <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.hell ? "#878C94" : "rgba(255,255,255,0.5)" }}>
                {z.index + 1}/{SCHRITTE.length}
              </Text>
            </View>
            <Text style={{ ...schrift.text, fontSize: 15.5, lineHeight: 22, color: text2 }}>{schritt.text}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
              <View style={{ flexDirection: "row", gap: 5, flex: 1 }}>
                {SCHRITTE.map((_, i) => (
                  <View key={i} style={{ height: 6, width: i === z.index ? 18 : 6, borderRadius: 3, backgroundColor: i === z.index ? f.orange : f.hell ? "rgba(20,23,27,0.14)" : "rgba(255,255,255,0.2)" }} />
                ))}
              </View>
              {!letzter ? (
                <Pressable
                  onPress={() => {
                    tippen();
                    tourBeenden();
                  }}
                  hitSlop={10}
                  style={{ paddingHorizontal: 10, paddingVertical: 8, marginRight: 4 }}
                  accessibilityRole="button"
                >
                  <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.hell ? "#878C94" : "rgba(255,255,255,0.6)" }}>Überspringen</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={weiter} accessibilityRole="button" style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.96 : 1 }] }, leuchten(f.orange, 0.45, 12, 3)]}>
                <LinearGradient colors={verlauf.segment as unknown as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 40, borderRadius: 20, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ ...schrift.textFett, fontSize: 15, color: "#FFFFFF" }}>{letzter ? "Los geht's" : "Weiter"}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
          {!loch || !unterLoch ? null : (
            <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: "rgba(255,255,255,0.6)", textAlign: "center", marginTop: 10 }}>Tippe irgendwo, um weiterzumachen</Text>
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}
