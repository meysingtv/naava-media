import { useEffect, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, ClipPath, Defs, G, Path, Rect, Text as SvgText } from "react-native-svg";

import { useDarstellung } from "@/lib/darstellung";
import { useKonto } from "@/lib/konto";
import { useStand } from "@/lib/stand";

// Start-Animation beim Kaltstart: Das Fahrschul-Pro-Logo baut sich auf –
// der Lenkradkranz zeichnet sich, während das Lenkrad einlenkt, die Speichen
// springen rein, eine Welle läuft raus, „FAHRSCHUL“ fährt von links ein, „PRO“
// knallt rein, der Slogan blendet auf, ein Glanz läuft drüber. Danach blendet
// alles sauber aus und gibt die App frei (frühestens, wenn sie fertig geladen
// ist). Antippen überspringt. Das native Splash davor ist schlicht weiß.
//
// Das Logo ist als Vektor nachgebaut; alle Maße sind in den Einheiten des
// Original-Logos (1024 × 1024), jedes Teil ist ein eigenes SVG mit passendem
// Ausschnitt, damit es sich einzeln bewegen lässt.

const BLAU = "#335A9B";
const NAVY = "#013183";
const ROT = "#F01C2A";

/** Ausschnitt des ganzen Logos in Original-Einheiten. */
const BOX = { x: 100, y: 250, b: 820, h: 520 };

/** Lenkrad: Mitte, Radius der Kranz-Mittellinie, Kranzstärke, untere Schnittkante. */
const RAD = { x: 518, y: 465, r: 183, dicke: 37, schnitt: 552 };
const RAD_BOX = { x: 308, y: 255, b: 420, h: 420 };

// Kranz als Bogen von links unten über oben nach rechts unten – unten gerade
// abgeschnitten (Clip), wie im Logo.
const START = 145;
const ENDE = 35;
const BOGEN = 360 - (START - ENDE);
const RING_LAENGE = (RAD.r * BOGEN * Math.PI) / 180;
const punkt = (grad: number) => `${RAD.x + RAD.r * Math.cos((grad * Math.PI) / 180)} ${RAD.y + RAD.r * Math.sin((grad * Math.PI) / 180)}`;
const RING = `M${punkt(START)} A${RAD.r} ${RAD.r} 0 1 1 ${punkt(ENDE)}`;

/** Querspeiche (oben gewölbt) mit der unteren Speiche, die schmaler nach unten läuft. */
const SPEICHEN = "M345 432 Q518 330 691 432 L693 470 Q620 474 590 490 L549 553 L488 553 L447 490 Q418 474 343 470 Z";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Lage eines Teils (Ausschnitt in Original-Einheiten) im Logo-Rahmen. */
function lage(t: { x: number; y: number; b: number; h: number }, s: number): ViewStyle {
  return { position: "absolute", left: (t.x - BOX.x) * s, top: (t.y - BOX.y) * s, width: t.b * s, height: t.h * s };
}
const viewBox = (t: { x: number; y: number; b: number; h: number }) => `${t.x} ${t.y} ${t.b} ${t.h}`;

const WORT = { x: 100, y: 570, b: 590, h: 110 };
const PRO = { x: 690, y: 570, b: 230, h: 110 };
const SLOGAN = { x: 180, y: 705, b: 680, h: 65 };

/** Ab wann (ms) die Animation fertig ist und ausblenden darf. */
const DAUER = 2350;

export function StartAnimation() {
  const { width, height } = useWindowDimensions();
  const { laedt } = useKonto();
  const { bereit: standBereit } = useStand();
  const { bereit: darstellungBereit } = useDarstellung();
  const appBereit = !laedt && standBereit && darstellungBereit;
  const ruhig = useReducedMotion();

  const [durch, setDurch] = useState(false);
  const [weg, setWeg] = useState(false);
  const [geht, setGeht] = useState(false);

  const breite = Math.min(width * 0.84, 380);
  const s = breite / BOX.b;

  const gesamt = useSharedValue(0.94);
  const ring = useSharedValue(0);
  const drehung = useSharedValue(-140);
  const speichen = useSharedValue(0);
  const welle = useSharedValue(0);
  const wort = useSharedValue(0);
  const pro = useSharedValue(0);
  const slogan = useSharedValue(0);
  const glanz = useSharedValue(0);
  const raus = useSharedValue(0);
  const grund = useSharedValue(1);

  // Natives Splash (weiß) weg, sobald die Animation steht – dann läuft sie los.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    const aus = Easing.out(Easing.cubic);
    if (ruhig) {
      gesamt.value = 1;
      ring.value = 1;
      drehung.value = 0;
      speichen.value = 1;
      wort.value = 1;
      pro.value = 1;
      slogan.value = 1;
    } else {
      gesamt.value = withTiming(1, { duration: 1500, easing: aus });
      ring.value = withTiming(1, { duration: 820, easing: aus });
      drehung.value = withSequence(withTiming(7, { duration: 860, easing: aus }), withSpring(0, { damping: 9, stiffness: 160 }));
      speichen.value = withDelay(380, withSpring(1, { damping: 12, stiffness: 170 }));
      welle.value = withDelay(820, withTiming(1, { duration: 700, easing: aus }));
      wort.value = withDelay(700, withTiming(1, { duration: 480, easing: aus }));
      pro.value = withDelay(920, withTiming(1, { duration: 420, easing: Easing.out(Easing.back(1.7)) }));
      slogan.value = withDelay(1180, withTiming(1, { duration: 450, easing: aus }));
      glanz.value = withDelay(1500, withTiming(1, { duration: 720, easing: Easing.inOut(Easing.quad) }));
    }
    const t = setTimeout(() => setDurch(true), ruhig ? 700 : DAUER);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ausblenden: Logo zieht leicht ran und verschwindet, dann der weiße Grund.
  useEffect(() => {
    if (!durch || !appBereit || geht) return;
    setGeht(true);
    raus.value = withTiming(1, { duration: 300, easing: Easing.in(Easing.quad) });
    grund.value = withDelay(140, withTiming(0, { duration: 380, easing: Easing.out(Easing.quad) }, (fertig) => {
      if (fertig) runOnJS(setWeg)(true);
    }));
  }, [durch, appBereit, geht, raus, grund]);

  const grundStil = useAnimatedStyle(() => ({ opacity: grund.value }));
  const logoStil = useAnimatedStyle(() => ({
    opacity: 1 - raus.value,
    transform: [{ scale: gesamt.value * (1 + raus.value * 0.1) }],
  }));
  const radStil = useAnimatedStyle(() => ({ transform: [{ rotate: `${drehung.value}deg` }] }));
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING_LAENGE * (1 - ring.value) }));
  const speichenStil = useAnimatedStyle(() => ({
    opacity: Math.min(1, speichen.value * 2.5),
    transform: [{ scale: 0.35 + 0.65 * speichen.value }],
  }));
  const welleStil = useAnimatedStyle(() => ({
    opacity: welle.value > 0 ? 0.4 * (1 - welle.value) : 0,
    transform: [{ scale: 1 + 0.5 * welle.value }],
  }));
  const wortStil = useAnimatedStyle(() => ({
    opacity: Math.min(1, wort.value * 1.8),
    transform: [{ translateX: -70 * s * (1 - wort.value) }],
  }));
  const linienStil = useAnimatedStyle(() => ({
    opacity: wort.value > 0 && wort.value < 1 ? 0.55 * Math.sin(wort.value * Math.PI) : 0,
    transform: [{ translateX: (-260 + 300 * wort.value) * s }],
  }));
  const proStil = useAnimatedStyle(() => ({
    opacity: Math.min(1, pro.value * 3),
    transform: [{ scale: 1.9 - 0.9 * pro.value }],
  }));
  const sloganStil = useAnimatedStyle(() => ({
    opacity: slogan.value,
    transform: [{ translateY: 12 * s * (1 - slogan.value) }],
  }));
  const glanzStil = useAnimatedStyle(() => ({
    opacity: glanz.value > 0 && glanz.value < 1 ? 1 : 0,
    transform: [{ translateX: -0.35 * breite + glanz.value * 1.6 * breite }, { rotate: "18deg" }],
  }));

  if (weg) return null;

  const radLage = lage(RAD_BOX, s);
  const kranz = (RAD.r + RAD.dicke / 2) * 2 * s;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }, grundStil]} pointerEvents={geht ? "none" : "auto"}>
      <Pressable
        style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", paddingBottom: height * 0.06 }]}
        onPress={() => setDurch(true)}
        accessibilityLabel="Fahrschul Pro"
        accessibilityHint="Antippen, um zu überspringen"
      >
        <Animated.View style={[{ width: BOX.b * s, height: BOX.h * s }, logoStil]}>
          {/* Welle hinter dem Lenkrad, wenn es einrastet */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                left: (RAD.x - BOX.x) * s - kranz / 2,
                top: (RAD.y - BOX.y) * s - kranz / 2,
                width: kranz,
                height: kranz,
                borderRadius: kranz / 2,
                borderWidth: Math.max(2, 6 * s),
                borderColor: BLAU,
              },
              welleStil,
            ]}
          />

          {/* Lenkrad: Kranz zeichnet sich beim Einlenken, Speichen springen rein */}
          <Animated.View style={[radLage, radStil]}>
            <Svg width="100%" height="100%" viewBox={viewBox(RAD_BOX)}>
              <Defs>
                <ClipPath id="schnitt">
                  <Rect x={RAD_BOX.x} y={RAD_BOX.y} width={RAD_BOX.b} height={RAD.schnitt - RAD_BOX.y} />
                </ClipPath>
              </Defs>
              <G clipPath="url(#schnitt)">
                <AnimatedPath d={RING} stroke={BLAU} strokeWidth={RAD.dicke} fill="none" strokeDasharray={`${RING_LAENGE} ${RING_LAENGE}`} animatedProps={ringProps} />
              </G>
            </Svg>
            <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: "50% 47%" }, speichenStil]}>
              <Svg width="100%" height="100%" viewBox={viewBox(RAD_BOX)}>
                <Path d={SPEICHEN} fill={BLAU} />
                <Circle cx={518} cy={454} r={41} stroke="#FFFFFF" strokeWidth={3.6} fill="none" />
                <Circle cx={445} cy={452} r={14} stroke="#FFFFFF" strokeWidth={3.4} fill="none" />
                <Circle cx={591} cy={452} r={14} stroke="#FFFFFF" strokeWidth={3.4} fill="none" />
              </Svg>
            </Animated.View>
          </Animated.View>

          {/* Fahrtwind-Striche hinter „FAHRSCHUL“ */}
          <Animated.View pointerEvents="none" style={[lage({ x: 100, y: 596, b: 560, h: 66 }, s), linienStil]}>
            {[0.12, 0.48, 0.84].map((y, i) => (
              <View key={y} style={{ position: "absolute", top: `${y * 100}%`, right: i * 40 * s, width: (260 - i * 70) * s, height: Math.max(2, 5 * s), borderRadius: 3, backgroundColor: BLAU }} />
            ))}
          </Animated.View>

          <Animated.View style={[lage(WORT, s), wortStil]}>
            <Svg width="100%" height="100%" viewBox={viewBox(WORT)}>
              <SvgText x={0} y={664} transform="translate(118 0) scale(0.82 1)" fontFamily="Archivo_800ExtraBold_Italic" fontSize={105} fill={NAVY}>
                FAHRSCHUL
              </SvgText>
            </Svg>
          </Animated.View>

          <Animated.View style={[lage(PRO, s), { transformOrigin: "40% 60%" }, proStil]}>
            <Svg width="100%" height="100%" viewBox={viewBox(PRO)}>
              <SvgText x={0} y={664} transform="translate(699 0) scale(0.86 1)" fontFamily="Archivo_800ExtraBold_Italic" fontSize={105} fill={ROT}>
                PRO
              </SvgText>
            </Svg>
          </Animated.View>

          <Animated.View style={[lage(SLOGAN, s), sloganStil]}>
            <Svg width="100%" height="100%" viewBox={viewBox(SLOGAN)}>
              <SvgText x={0} y={753} transform="translate(518 0) scale(0.7 1)" textAnchor="middle" fontFamily="Archivo_600SemiBold" fontSize={43} letterSpacing={2.8} fill={NAVY}>
                ONLINE LERNEN, SICHER BESTEHEN
              </SvgText>
            </Svg>
          </Animated.View>

          {/* Glanz: auf Weiß unsichtbar, über dem Logo ein heller Streifen */}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
            <Animated.View style={[{ position: "absolute", top: -BOX.h * s * 0.3, height: BOX.h * s * 1.6, width: breite * 0.16 }, glanzStil]}>
              <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.7)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
