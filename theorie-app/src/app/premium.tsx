import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip, Knopf, Kopf, T } from "@/components/ui";
import { tippen } from "@/lib/haptik";
import { abstand, farben, radius, RAND, schrift } from "@/lib/theme";

const VORTEILE = [
  { icon: "library-outline", text: "Der komplette amtliche Fragenkatalog" },
  { icon: "videocam-outline", text: "Alle Bild- und Videofragen" },
  { icon: "school-outline", text: "Prüfungssimulationen ohne Grenzen, mit Auswertung je Thema" },
  { icon: "stats-chart-outline", text: "Deine Lernkurve und Prognose bis zur Prüfung" },
  { icon: "people-outline", text: "Duelle gegen Freunde" },
] as const;

const PLAENE = [
  { id: "monat", titel: "1 Monat", preis: "5,99 €", unter: "monatlich kündbar" },
  { id: "drei", titel: "3 Monate", preis: "12,99 €", unter: "4,33 € pro Monat" },
  { id: "sechs", titel: "Bis zur Prüfung · 6 Monate", preis: "19,99 €", unter: "3,33 € pro Monat", beliebt: true },
];

export default function Premium() {
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState("sechs");

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <Kopf schliessen />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: abstand(8), gap: abstand(7) }}>
        <View style={{ gap: abstand(2) }}>
          <T v="mini" farbe={farben.orange}>
            Spur Plus
          </T>
          <T v="display">Mehr Tempo bis zur Prüfung.</T>
          <T v="text">Alles aus der kostenlosen Version – plus alles, was dich sicher durch die Prüfung bringt.</T>
        </View>

        <View style={{ gap: abstand(3.5) }}>
          {VORTEILE.map((v) => (
            <View key={v.text} style={{ flexDirection: "row", alignItems: "center", gap: abstand(3.5) }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: farben.orangeSoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={v.icon} size={18} color={farben.orange} />
              </View>
              <T v="textStark" style={{ flex: 1, ...schrift.textMittel }}>
                {v.text}
              </T>
            </View>
          ))}
        </View>

        <View style={{ gap: abstand(3) }}>
          {PLAENE.map((p) => {
            const aktiv = p.id === plan;
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  tippen();
                  setPlan(p.id);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: abstand(3.5),
                  padding: abstand(4),
                  borderRadius: radius.l,
                  borderWidth: 1.5,
                  borderColor: aktiv ? farben.orange : farben.linie,
                  backgroundColor: aktiv ? farben.orangeSoft : farben.flaeche,
                }}
              >
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: aktiv ? farben.orange : farben.text4, alignItems: "center", justifyContent: "center" }}>
                  {aktiv ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: farben.orange }} /> : null}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(2) }}>
                    <T v="h3">{p.titel}</T>
                  </View>
                  <T v="klein">{p.unter}</T>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  {"beliebt" in p && p.beliebt ? <Chip text="Beliebt" farbe={farben.orange} /> : null}
                  <T v="h3">{p.preis}</T>
                </View>
              </Pressable>
            );
          })}
        </View>

        <T v="klein" zentriert>
          Spur Plus startet bald. Der Kauf läuft dann über deinen App-Store-Account und ist jederzeit kündbar.
        </T>
      </ScrollView>
      <View style={{ paddingHorizontal: RAND, paddingTop: abstand(3), paddingBottom: insets.bottom + abstand(3), borderTopWidth: 1, borderColor: farben.linie }}>
        <Knopf
          titel="Beim Start Bescheid geben"
          icon="notifications-outline"
          onPress={() => Alert.alert("Vorgemerkt", "Sobald Spur Plus startet, siehst du es hier in der App.")}
        />
      </View>
    </View>
  );
}
