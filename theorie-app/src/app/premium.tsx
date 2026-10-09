import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { AktionsLeiste, HauptKnopf, KopfPille } from "@/components/frage-rahmen";
import { FotoKopf, Seite } from "@/components/seite";
import { Chip, kartenFlaeche, T } from "@/components/ui";
import { useDarstellung } from "@/lib/darstellung";
import { FOTOS } from "@/lib/fotos";
import { dialog } from "@/components/dialog";
import { tippen } from "@/lib/haptik";
import { abstand, leuchten, RAND, schrift } from "@/lib/theme";

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
  const { farbwelt: f } = useDarstellung();
  const [plan, setPlan] = useState("sechs");

  return (
    <Seite>
      <ScrollView contentContainerStyle={{ paddingBottom: abstand(8) }} showsVerticalScrollIndicator={false}>
        <FotoKopf
          bild={FOTOS.grundstoff}
          hoehe={270}
          schliessen
          ueber={
            <View style={{ flexDirection: "row" }}>
              <KopfPille icon="diamond-outline" text="Premium" />
            </View>
          }
          titel="Mehr Tempo bis zur Prüfung."
          unter="Alles aus der kostenlosen Version – plus alles, was dich sicher durch die Prüfung bringt."
        />
        <View style={{ paddingHorizontal: RAND, marginTop: 10, gap: abstand(7) }}>
        <View style={[{ gap: abstand(3.5), padding: 16, borderRadius: 24 }, kartenFlaeche(f)]}>
          {VORTEILE.map((v) => (
            <View key={v.text} style={{ flexDirection: "row", alignItems: "center", gap: abstand(3.5) }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: f.orangeSoft, alignItems: "center", justifyContent: "center" }}>
                <Icon name={v.icon} size={18} color={f.orange} />
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
                style={[
                  { flexDirection: "row", alignItems: "center", gap: abstand(3.5), padding: abstand(4), borderRadius: 22 },
                  kartenFlaeche(f),
                  aktiv ? [{ borderWidth: 2, borderColor: f.orange, backgroundColor: f.hell ? "#FFF6F0" : "#1D140F" }, leuchten(f.orange, f.hell ? 0.2 : 0.3, 12, 0)] : null,
                ]}
              >
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: aktiv ? f.orange : f.text3, alignItems: "center", justifyContent: "center" }}>
                  {aktiv ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: f.orange }} /> : null}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(2) }}>
                    <T v="h3">{p.titel}</T>
                  </View>
                  <T v="klein">{p.unter}</T>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  {"beliebt" in p && p.beliebt ? <Chip text="Beliebt" farbe={f.orange} /> : null}
                  <T v="h3">{p.preis}</T>
                </View>
              </Pressable>
            );
          })}
        </View>

        <T v="klein" zentriert>
          Premium startet bald. Der Kauf läuft dann über deinen App-Store-Account und ist jederzeit kündbar.
        </T>
        </View>
      </ScrollView>
      <AktionsLeiste unten={insets.bottom}>
        <HauptKnopf
          titel="Beim Start Bescheid geben"
          icon="notifications-outline"
          onPress={() => dialog("Vorgemerkt", "Sobald Premium startet, siehst du es hier in der App.")}
          style={{ flex: 1 }}
        />
      </AktionsLeiste>
    </Seite>
  );
}
