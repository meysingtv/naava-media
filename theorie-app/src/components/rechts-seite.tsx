import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { GrossKopf, Seite } from "@/components/seite";
import { useDarstellung } from "@/lib/darstellung";
import { platzhalterOffen, type Abschnitt } from "@/lib/rechtliches";
import { abstand, RAND, schrift } from "@/lib/theme";

/** Eine Rechtsseite (Impressum, Datenschutz, Nutzungsbedingungen) – gut lesbar, mit Abschnitten. */
export function RechtsSeite({ titel, unter, abschnitte }: { titel: string; unter?: string; abschnitte: Abschnitt[] }) {
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
  const offen = platzhalterOffen(abschnitte);
  return (
    <Seite>
      <GrossKopf titel={titel} unter={unter} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(3), paddingBottom: insets.bottom + abstand(10) }} showsVerticalScrollIndicator={false}>
        <View style={{ width: "100%", maxWidth: 760, alignSelf: "center", gap: abstand(6) }}>
          {offen ? (
            <View style={{ flexDirection: "row", gap: 10, padding: 14, borderRadius: 16, backgroundColor: f.hell ? "#FFF4D6" : "rgba(255,196,0,0.12)", borderWidth: 1, borderColor: f.hell ? "#F2D58A" : "rgba(255,196,0,0.35)" }}>
              <Icon name="alert-circle" size={18} color={f.hell ? "#9A6B00" : "#FFC83D"} />
              <Text style={{ ...schrift.textHalb, flex: 1, fontSize: 13.5, lineHeight: 19, color: f.hell ? "#6B4A00" : "#FFDD80" }}>
                Noch nicht vollständig: Die Angaben in [eckigen Klammern] müssen vor der Veröffentlichung in src/lib/rechtliches.ts eingetragen werden.
              </Text>
            </View>
          ) : null}
          {abschnitte.map((a) => (
            <View key={a.titel} style={{ gap: abstand(2) }}>
              <Text accessibilityRole="header" style={{ ...schrift.titelFett, fontSize: 17.5, lineHeight: 23, color: f.text }}>
                {a.titel}
              </Text>
              {a.inhalt.map((b, i) =>
                typeof b === "string" ? (
                  <Text key={i} selectable style={{ ...schrift.text, fontSize: 15, lineHeight: 23, color: f.text2 }}>
                    {b}
                  </Text>
                ) : "liste" in b ? (
                  <View key={i} style={{ gap: 6 }}>
                    {b.liste.map((punkt) => (
                      <View key={punkt} style={{ flexDirection: "row", gap: 10 }}>
                        <Text style={{ ...schrift.textHalb, fontSize: 15, lineHeight: 23, color: f.orange }}>•</Text>
                        <Text selectable style={{ ...schrift.text, flex: 1, fontSize: 15, lineHeight: 23, color: f.text2 }}>
                          {punkt}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Pressable key={i} onPress={() => router.push(b.link)} accessibilityRole="link" hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" }}>
                    <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.orange }}>{b.text}</Text>
                    <Icon name="chevron-forward" size={14} color={f.orange} />
                  </Pressable>
                ),
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </Seite>
  );
}

/** Kleine Zeile mit den drei Rechtsseiten – für Willkommen, Anmelden und Registrieren. */
export function RechtsLinks({ einwilligung }: { einwilligung?: boolean }) {
  const { farbwelt: f } = useDarstellung();
  const link = (text: string, ziel: "/impressum" | "/datenschutz" | "/nutzungsbedingungen") => (
    <Text onPress={() => router.push(ziel)} accessibilityRole="link" style={{ ...schrift.textHalb, color: f.text2, textDecorationLine: "underline" }}>
      {text}
    </Text>
  );
  if (einwilligung) {
    return (
      <Text style={{ ...schrift.text, fontSize: 12.5, lineHeight: 18, color: f.text3, textAlign: "center" }}>
        Mit der Registrierung akzeptierst du die {link("Nutzungsbedingungen", "/nutzungsbedingungen")}. Wie wir deine Daten verarbeiten, steht in der{" "}
        {link("Datenschutzerklärung", "/datenschutz")}.
      </Text>
    );
  }
  return (
    <Text style={{ ...schrift.text, fontSize: 12.5, lineHeight: 18, color: f.text3, textAlign: "center" }}>
      {link("Impressum", "/impressum")} · {link("Datenschutz", "/datenschutz")} · {link("Nutzungsbedingungen", "/nutzungsbedingungen")}
    </Text>
  );
}
