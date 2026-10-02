import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AktionsLeiste, HauptKnopf, NebenKnopf } from "@/components/frage-rahmen";
import { FotoKopf, Seite } from "@/components/seite";
import { Chip, kartenFlaeche, Knopf, T } from "@/components/ui";
import { Verkehrszeichen, ZEICHEN_INFO, type ZeichenInfo } from "@/components/zeichen";
import { useDarstellung } from "@/lib/darstellung";
import { FOTOS } from "@/lib/fotos";
import { tippen } from "@/lib/haptik";
import { RAND, schrift } from "@/lib/theme";

const GRUPPEN: { id: "alle" | ZeichenInfo["gruppe"]; titel: string }[] = [
  { id: "alle", titel: "Alle" },
  { id: "gefahr", titel: "Gefahrzeichen" },
  { id: "vorschrift", titel: "Vorschriftzeichen" },
  { id: "richt", titel: "Richtzeichen" },
];

/** Alle Verkehrszeichen als Raster – ein Tipp zeigt die Bedeutung. */
export default function Zeichen() {
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
  const [gruppe, setGruppe] = useState<(typeof GRUPPEN)[number]["id"]>("alle");
  const [offen, setOffen] = useState<ZeichenInfo | null>(null);
  const liste = ZEICHEN_INFO.filter((z) => gruppe === "alle" || z.gruppe === gruppe);

  return (
    <Seite>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <FotoKopf bild={FOTOS.zeichen} hoehe={230} titel="Verkehrszeichen" unter={`${ZEICHEN_INFO.length} Zeichen mit Bedeutung`} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: RAND, gap: 8, paddingTop: 8, paddingBottom: 16 }}>
          {GRUPPEN.map((g) => (
            <Chip key={g.id} text={g.titel} aktiv={g.id === gruppe} onPress={() => setGruppe(g.id)} />
          ))}
        </ScrollView>
        <View style={{ paddingHorizontal: RAND, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {liste.map((z) => (
            <Pressable
              key={z.key}
              onPress={() => {
                tippen();
                setOffen(z);
              }}
              accessibilityRole="button"
              accessibilityLabel={z.name}
              style={({ pressed }) => [
                { width: "31%", flexGrow: 1, maxWidth: "32%", alignItems: "center", gap: 10, paddingVertical: 16, paddingHorizontal: 8, borderRadius: 22, transform: [{ scale: pressed ? 0.96 : 1 }] },
                kartenFlaeche(f),
              ]}
            >
              <Verkehrszeichen zeichen={z.key} groesse={60} />
              <Text numberOfLines={2} style={{ ...schrift.textMittel, fontSize: 12, lineHeight: 16, color: f.text2, textAlign: "center" }}>
                {z.kurz ?? z.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <AktionsLeiste unten={insets.bottom}>
        <NebenKnopf icon="camera" onPress={() => router.push("/schilder-jagd")} style={{ width: 56 }} />
        <HauptKnopf titel="Zeichenfragen üben" icon="arrow-forward" onPress={() => router.push({ pathname: "/training", params: { modus: "zeichen" } })} style={{ flex: 1 }} />
      </AktionsLeiste>

      <Modal visible={offen != null} transparent animationType="fade" onRequestClose={() => setOffen(null)}>
        <Pressable onPress={() => setOffen(null)} style={{ flex: 1, backgroundColor: f.hell ? "rgba(20,16,10,0.35)" : "rgba(5,8,18,0.72)", justifyContent: "flex-end" }}>
          {offen ? (
            <Pressable
              onPress={() => {}}
              style={[
                { margin: 12, marginBottom: insets.bottom + 12, padding: 24, borderRadius: 30, alignItems: "center", gap: 18 },
                f.hell ? { backgroundColor: "#FFFFFF" } : { backgroundColor: f.flaeche, borderWidth: 1, borderColor: f.linieStark },
              ]}
            >
              <Verkehrszeichen zeichen={offen.key} groesse={150} />
              <View style={{ gap: 8, alignSelf: "stretch" }}>
                <T v="mini" farbe={f.orange} zentriert>
                  {GRUPPEN.find((g) => g.id === offen.gruppe)?.titel}
                </T>
                <T v="titel" zentriert>
                  {offen.name}
                </T>
                <T v="text" zentriert>
                  {offen.bedeutung}
                </T>
              </View>
              <Knopf titel="Schließen" art="sekundaer" onPress={() => setOffen(null)} style={{ alignSelf: "stretch" }} />
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </Seite>
  );
}
