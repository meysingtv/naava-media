import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Modal, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useHelleSeite } from "@/lib/darstellung";
import { schrift } from "@/lib/theme";

type Option = { text: string; gefahr?: boolean };
type Anfrage = { titel: string; optionen: Option[]; fertig: (i: number | null) => void };

let zeigen: ((a: Anfrage) => void) | null = null;

/**
 * Auswahlmenü als Blatt von unten (auch für Android, wo ein Dialog höchstens
 * drei Knöpfe zeigt). Liefert den gewählten Eintrag oder null, wenn man
 * daneben tippt oder das Blatt nach unten wischt.
 */
export function auswahlBlatt(titel: string, optionen: Option[]): Promise<number | null> {
  return new Promise((fertig) => {
    if (zeigen) {
      zeigen({ titel, optionen, fertig });
      return;
    }
    // Ohne Blatt (sollte nicht vorkommen): einfacher Dialog.
    Alert.alert(titel, undefined, [
      ...optionen.map((o, i) => ({ text: o.text, style: o.gefahr ? ("destructive" as const) : ("default" as const), onPress: () => fertig(i) })),
      { text: "Abbrechen", style: "cancel" as const, onPress: () => fertig(null) },
    ]);
  });
}

/** Einmal in der App eingebunden; zeigt die Menüs aus auswahlBlatt(). */
export function AuswahlBlattHost() {
  const insets = useSafeAreaInsets();
  const [anfrage, setAnfrage] = useState<Anfrage | null>(null);
  const anfrageRef = useRef<Anfrage | null>(null);
  const zu = useRef(false);
  // 0 = offen, 1 = unten raus
  const lage = useRef(new Animated.Value(1)).current;
  const zug = useRef(new Animated.Value(0)).current;
  // Auf hellen Seiten weiß, sonst dunkel (neutral, ohne Blaustich)
  const hell = useHelleSeite();
  const flaeche = hell ? "#FFFFFF" : "#1C1D21";
  const gedrueckt = hell ? "rgba(20,23,27,0.05)" : "rgba(255,255,255,0.06)";
  const text = hell ? "#14171B" : "#F2F3F5";
  const rot = hell ? "#E5392C" : "#FF5A4F";

  useEffect(() => {
    zeigen = (a) => {
      anfrageRef.current = a;
      zu.current = false;
      zug.setValue(0);
      setAnfrage(a);
      Animated.timing(lage, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    };
    return () => {
      zeigen = null;
    };
  }, [lage, zug]);

  function fertig(i: number | null) {
    if (zu.current) return;
    zu.current = true;
    Animated.timing(lage, { toValue: 1, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      const a = anfrageRef.current;
      anfrageRef.current = null;
      setAnfrage(null);
      a?.fertig(i);
    });
  }

  const fertigRef = useRef(fertig);
  fertigRef.current = fertig;
  // Nach unten wischen schließt das Blatt.
  const wischen = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => zug.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 90 || g.vy > 0.9) fertigRef.current(null);
        else Animated.spring(zug, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
    }),
  ).current;

  return (
    <Modal visible={anfrage != null} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => fertig(null)}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => fertig(null)} accessibilityLabel="Schließen">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: hell ? "rgba(20,16,10,0.32)" : "rgba(0,0,0,0.5)", opacity: lage.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} />
      </Pressable>
      {anfrage ? (
        <Animated.View
          {...wischen.panHandlers}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ translateY: Animated.add(lage.interpolate({ inputRange: [0, 1], outputRange: [0, 520] }), zug) }],
          }}
        >
          <View style={{ backgroundColor: flaeche, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingBottom: insets.bottom + 10 }}>
            <View style={{ alignSelf: "center", width: 36, height: 5, borderRadius: 3, backgroundColor: hell ? "rgba(20,23,27,0.16)" : "rgba(255,255,255,0.2)" }} />
            {anfrage.titel ? (
              <Text numberOfLines={2} style={{ ...schrift.textHalb, fontSize: 13.5, lineHeight: 18, color: hell ? "#878C94" : "#8E939B", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
                {anfrage.titel}
              </Text>
            ) : (
              <View style={{ height: 10 }} />
            )}
            {anfrage.optionen.map((o, i) => (
              <Pressable
                key={`${i}-${o.text}`}
                onPress={() => fertig(i)}
                accessibilityRole="button"
                style={({ pressed }) => ({ minHeight: 52, justifyContent: "center", paddingHorizontal: 20, backgroundColor: pressed ? gedrueckt : "transparent" })}
              >
                <Text style={{ ...schrift.textMittel, fontSize: 17, color: o.gefahr ? rot : text }}>{o.text}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      ) : null}
    </Modal>
  );
}
