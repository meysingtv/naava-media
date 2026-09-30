import { useEffect, useRef, useState } from "react";
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type AlertButton, type AlertOptions } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";

import { useHelleSeite } from "@/lib/darstellung";
import { farben, schrift } from "@/lib/theme";

// Rückfragen und Hinweise („Training beenden?“ …). Auf dem iPhone der echte
// iOS-Dialog. Auf Android derselbe Look wie unter iOS 26: Glaskarte mit
// linksbündigem Text und Kapsel-Knöpfen – statt des grauen Android-Dialogs.

/** Farben wie die iOS-Systemfarben – dunkel und hell. */
const IOS_BLAU = "#0A84FF";
const IOS_ROT = "#FF453A";
const IOS_BLAU_HELL = "#007AFF";
const IOS_ROT_HELL = "#FF3B30";

type Anfrage = { titel: string; text?: string; knoepfe: AlertButton[]; optionen?: AlertOptions };

let zeigen: ((a: Anfrage) => void) | null = null;
const warteschlange: Anfrage[] = [];

/** Wie Alert.alert – auf Android im iPhone-Look. */
export function dialog(titel: string, text?: string, knoepfe?: AlertButton[], optionen?: AlertOptions): void {
  if (Platform.OS === "ios" || !zeigen) {
    Alert.alert(titel, text, knoepfe, optionen);
    return;
  }
  zeigen({ titel, text, knoepfe: knoepfe?.length ? knoepfe : [{ text: "OK" }], optionen });
}

/** Reihenfolge wie iOS: bei zwei Knöpfen „Abbrechen“ links, sonst unten. */
function sortiert(knoepfe: AlertButton[]): AlertButton[] {
  const abbrechen = knoepfe.filter((k) => k.style === "cancel");
  const rest = knoepfe.filter((k) => k.style !== "cancel");
  return knoepfe.length === 2 ? [...abbrechen, ...rest] : [...rest, ...abbrechen];
}

/** Einmal in der App eingebunden; zeigt die Dialoge aus dialog(). */
export function DialogHost() {
  const [aktuell, setAktuell] = useState<Anfrage | null>(null);
  const offen = useRef<Anfrage | null>(null);
  const { width } = useWindowDimensions();
  const auftritt = useSharedValue(0);
  // Auf hellen Seiten als helles Glas, sonst dunkel
  const hell = useHelleSeite();

  useEffect(() => {
    zeigen = (a) => {
      if (offen.current) {
        warteschlange.push(a);
        return;
      }
      offen.current = a;
      setAktuell(a);
    };
    return () => {
      zeigen = null;
    };
  }, []);

  useEffect(() => {
    if (!aktuell) return;
    auftritt.value = 0;
    auftritt.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [aktuell, auftritt]);

  const kartenStil = useAnimatedStyle(() => ({
    opacity: auftritt.value,
    transform: [{ scale: 1.08 - 0.08 * auftritt.value }],
  }));

  function schliessen(knopf?: AlertButton) {
    const naechster = warteschlange.shift() ?? null;
    offen.current = naechster;
    setAktuell(naechster);
    knopf?.onPress?.();
  }

  function zurueck() {
    if (!aktuell) return;
    const abbrechen = aktuell.knoepfe.find((k) => k.style === "cancel");
    if (abbrechen) schliessen(abbrechen);
    else if (aktuell.knoepfe.length === 1) schliessen(aktuell.knoepfe[0]);
    else if (aktuell.optionen?.cancelable) {
      aktuell.optionen.onDismiss?.();
      schliessen();
    }
  }

  const knoepfe = aktuell ? sortiert(aktuell.knoepfe) : [];
  const nebeneinander = knoepfe.length <= 2;
  // Hervorgehoben (blau gefüllt) ist der Hauptknopf: der letzte normale Knopf.
  const haupt = [...knoepfe].reverse().find((k) => k.style !== "cancel" && k.style !== "destructive");

  return (
    <Modal visible={aktuell != null} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={zurueck}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.42)" }}>
        {aktuell ? (
          <Animated.View
            accessibilityRole="alert"
            style={[
              { width: Math.min(320, width - 48), borderRadius: 30, overflow: "hidden", borderWidth: 1, borderColor: hell ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.12)", boxShadow: hell ? "0px 18px 50px rgba(60,44,24,0.28)" : "0px 18px 50px rgba(0,0,0,0.5)" },
              kartenStil,
            ]}
          >
            <BlurView tint={hell ? "light" : "dark"} intensity={85} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: hell ? "rgba(255,255,255,0.86)" : "rgba(30,32,36,0.78)" }]} />
            <LinearGradient colors={[hell ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.1)", "rgba(255,255,255,0)"]} locations={[0, 0.5]} style={StyleSheet.absoluteFill} />
            <LinearGradient
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.45)", "rgba(255,255,255,0)"]}
              style={{ position: "absolute", top: 0, left: 24, right: 24, height: 1 }}
            />

            <View style={{ paddingTop: 22, paddingHorizontal: 20, paddingBottom: 18 }}>
              <Text style={{ ...schrift.titelFett, fontSize: 17, lineHeight: 22, color: hell ? "#14171B" : farben.text }}>{aktuell.titel}</Text>
              {aktuell.text ? (
                <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 20, color: hell ? "#4D535B" : farben.text2, marginTop: 6 }}>{aktuell.text}</Text>
              ) : null}

              <View style={{ marginTop: 20, gap: 10, flexDirection: nebeneinander ? "row" : "column" }}>
                {knoepfe.map((k, i) => {
                  const istHaupt = k === haupt && knoepfe.length > 1;
                  const farbe = k.style === "destructive" ? (hell ? IOS_ROT_HELL : IOS_ROT) : hell ? "#14171B" : farben.text;
                  return (
                    <Pressable
                      key={`${i}-${k.text}`}
                      accessibilityRole="button"
                      onPress={() => schliessen(k)}
                      android_ripple={{ color: hell ? "rgba(20,23,27,0.08)" : "rgba(255,255,255,0.12)", borderless: false }}
                      style={({ pressed }) => ({
                        flex: nebeneinander ? 1 : undefined,
                        height: 48,
                        borderRadius: 24,
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 12,
                        backgroundColor: istHaupt ? (hell ? IOS_BLAU_HELL : IOS_BLAU) : hell ? "rgba(20,23,27,0.07)" : "rgba(255,255,255,0.13)",
                        opacity: pressed ? 0.75 : 1,
                      })}
                    >
                      <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 16, color: istHaupt ? "#FFFFFF" : farbe }}>
                        {k.text ?? "OK"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}
