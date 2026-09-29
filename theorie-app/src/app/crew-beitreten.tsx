import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { Eingabe, Knopf, Kopf, T } from "@/components/ui";
import { codeFormatieren, useCrew } from "@/lib/crew";
import { erfolg } from "@/lib/haptik";
import { abstand, farben, leuchten, RAND, schrift } from "@/lib/theme";

/** Crew per Code beitreten – auch direkt über den Einladungslink oder QR-Code. */
export default function CrewBeitreten() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ crew?: string }>();
  const { moeglich, daten, beitreten } = useCrew();
  const [code, setCode] = useState(codeFormatieren(params.crew ?? ""));
  const [laeuft, setLaeuft] = useState(false);
  const vollstaendig = code.replace("-", "").length === 8;
  const schonDrin = Boolean(daten?.crew);

  useEffect(() => {
    if (params.crew) setCode(codeFormatieren(params.crew));
  }, [params.crew]);

  async function los() {
    setLaeuft(true);
    const f = await beitreten(code);
    setLaeuft(false);
    if (f) {
      dialog("Beitreten", f);
      return;
    }
    erfolg();
    router.replace("/crew");
  }

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <Kopf titel="Crew beitreten" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(8), gap: abstand(6) }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", gap: 12, paddingTop: abstand(6) }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: farben.orangeSoft, alignItems: "center", justifyContent: "center", ...leuchten(farben.orange, 0.35, 18) }}>
            <Icon name="people" size={48} color={farben.orange} />
          </View>
          <T v="titel" zentriert style={{ fontSize: 24, lineHeight: 29 }}>
            Werde Teil einer Crew
          </T>
          <T v="text" zentriert farbe={farben.text2}>
            und lernt zusammen – mit gemeinsamer Flamme und Wochen-Boss.
          </T>
        </View>

        {!moeglich ? (
          <View style={{ gap: abstand(3) }}>
            <T v="klein" zentriert>
              Für eine Crew brauchst du ein Konto.
            </T>
            <Knopf titel="Konto erstellen" icon="person-add-outline" onPress={() => router.push("/registrieren")} />
            <Knopf titel="Ich habe schon ein Konto" art="sekundaer" onPress={() => router.push("/anmelden")} />
          </View>
        ) : schonDrin ? (
          <View style={{ gap: abstand(3) }}>
            <T v="klein" zentriert>
              Du bist schon in der Crew „{daten?.crew?.name}“. Um zu wechseln, verlasse sie zuerst (Meine Crew → •••).
            </T>
            <Knopf titel="Zu meiner Crew" onPress={() => router.replace("/crew")} />
          </View>
        ) : (
          <View style={{ gap: abstand(4) }}>
            <Eingabe
              value={code}
              onChangeText={(t) => setCode(codeFormatieren(t))}
              placeholder="Code eingeben"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={9}
              icon="qr-code-outline"
              returnKeyType="go"
              onSubmitEditing={() => vollstaendig && los()}
              style={{ ...schrift.titelFett, fontSize: 20, letterSpacing: 2 }}
            />
            <Knopf titel="Beitreten" icon="arrow-forward" onPress={los} laedt={laeuft} deaktiviert={!vollstaendig} />
            <Text style={{ ...schrift.text, fontSize: 13, color: farben.text3, textAlign: "center" }}>
              Den Code findest du bei deinen Freunden unter Profil → Meine Crew.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
