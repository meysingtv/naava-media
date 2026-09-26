import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Eingabe, Knopf, T } from "@/components/ui";
import { Logo, StreckenBild } from "@/components/grafik";
import { useKonto } from "@/lib/konto";
import { tippen } from "@/lib/haptik";
import { abstand, farben, RAND, schrift } from "@/lib/theme";

export default function Willkommen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { alsGast } = useKonto();
  const [gastForm, setGastForm] = useState(false);
  const [name, setName] = useState("");
  const bildHoehe = Math.min(width * 0.92, 420);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: farben.grund }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + abstand(6) }} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={{ height: bildHoehe + insets.top, overflow: "hidden" }}>
          <View style={{ position: "absolute", top: insets.top, left: 0, right: 0 }}>
            <StreckenBild breite={width} />
          </View>
          <LinearGradient
            colors={["rgba(10,15,30,0)", farben.grund]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: bildHoehe * 0.45 }}
            pointerEvents="none"
          />
          <View style={{ position: "absolute", top: insets.top + abstand(4), left: RAND }}>
            <Logo groesse={30} />
          </View>
        </View>

        <View style={{ flex: 1, paddingHorizontal: RAND, gap: abstand(3), marginTop: -abstand(6) }}>
          <T v="mini" farbe={farben.orange}>
            Führerschein-Theorie
          </T>
          <T v="display">Deine Theorie.{"\n"}Klar geplant.</T>
          <T v="text" style={{ fontSize: 16, lineHeight: 24 }}>
            Kurze Lerneinheiten, echte Prüfungslogik und ein Streckenplan, der dir zeigt, wie weit du bist.
          </T>

          <View style={{ flex: 1, minHeight: abstand(6) }} />

          {gastForm ? (
            <View style={{ gap: abstand(3) }}>
              <Eingabe
                icon="person-outline"
                value={name}
                onChangeText={setName}
                placeholder="Wie heißt du?"
                autoFocus
                autoCapitalize="words"
                returnKeyType="go"
                onSubmitEditing={() => alsGast(name)}
              />
              <Knopf titel="Los geht's" icon="arrow-forward" onPress={() => alsGast(name)} />
              <T v="klein" zentriert>
                Dein Fortschritt bleibt auf diesem Gerät. Ein Konto kannst du jederzeit anlegen.
              </T>
            </View>
          ) : (
            <View style={{ gap: abstand(3) }}>
              <Knopf titel="Konto erstellen" icon="arrow-forward" onPress={() => router.push("/registrieren")} />
              <Knopf titel="Ich habe schon ein Konto" art="sekundaer" onPress={() => router.push("/anmelden")} />
              <Pressable
                onPress={() => {
                  tippen();
                  setGastForm(true);
                }}
                hitSlop={8}
                style={{ alignSelf: "center", paddingVertical: abstand(2) }}
              >
                <T v="klein" farbe={farben.text2} style={{ fontFamily: schrift.textHalb }}>
                  Erst mal ohne Konto umschauen
                </T>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
