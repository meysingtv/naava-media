import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip, Knopf, Kopf, T } from "@/components/ui";
import { Verkehrszeichen, ZEICHEN_INFO, type ZeichenInfo } from "@/components/zeichen";
import { tippen } from "@/lib/haptik";
import { abstand, farben, radius, RAND } from "@/lib/theme";

const GRUPPEN: { id: "alle" | ZeichenInfo["gruppe"]; titel: string }[] = [
  { id: "alle", titel: "Alle" },
  { id: "gefahr", titel: "Gefahrzeichen" },
  { id: "vorschrift", titel: "Vorschriftzeichen" },
  { id: "richt", titel: "Richtzeichen" },
];

export default function Zeichen() {
  const insets = useSafeAreaInsets();
  const [gruppe, setGruppe] = useState<(typeof GRUPPEN)[number]["id"]>("alle");
  const [offen, setOffen] = useState<ZeichenInfo | null>(null);
  const liste = ZEICHEN_INFO.filter((z) => gruppe === "alle" || z.gruppe === gruppe);

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <Kopf titel="Verkehrszeichen" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: RAND, gap: abstand(2), paddingBottom: abstand(4) }}>
        {GRUPPEN.map((g) => (
          <Chip key={g.id} text={g.titel} aktiv={g.id === gruppe} onPress={() => setGruppe(g.id)} />
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: abstand(6) }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: abstand(3) }}>
          {liste.map((z) => (
            <Pressable
              key={z.key}
              onPress={() => {
                tippen();
                setOffen(z);
              }}
              style={({ pressed }) => ({
                width: "31%",
                flexGrow: 1,
                maxWidth: "32%",
                alignItems: "center",
                gap: abstand(2.5),
                paddingVertical: abstand(4),
                paddingHorizontal: abstand(2),
                borderRadius: radius.l,
                backgroundColor: farben.flaeche,
                borderWidth: 1,
                borderColor: farben.linie,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Verkehrszeichen zeichen={z.key} groesse={62} />
              <T v="klein" zentriert numberOfLines={2} farbe={farben.text2} style={{ fontSize: 12, lineHeight: 16 }}>
                {z.kurz ?? z.name}
              </T>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: RAND, paddingTop: abstand(3), paddingBottom: insets.bottom + abstand(3), borderTopWidth: 1, borderColor: farben.linie }}>
        <Knopf titel="Zeichenfragen üben" icon="arrow-forward" onPress={() => router.push({ pathname: "/training", params: { modus: "zeichen" } })} />
      </View>

      <Modal visible={offen != null} transparent animationType="fade" onRequestClose={() => setOffen(null)}>
        <Pressable onPress={() => setOffen(null)} style={{ flex: 1, backgroundColor: "rgba(5,8,18,0.72)", justifyContent: "flex-end" }}>
          {offen ? (
            <Pressable
              onPress={() => {}}
              style={{
                margin: abstand(3),
                marginBottom: insets.bottom + abstand(3),
                padding: abstand(6),
                borderRadius: 28,
                backgroundColor: farben.flaeche,
                borderWidth: 1,
                borderColor: farben.linieStark,
                alignItems: "center",
                gap: abstand(4),
              }}
            >
              <Verkehrszeichen zeichen={offen.key} groesse={150} />
              <View style={{ gap: abstand(2), alignSelf: "stretch" }}>
                <T v="mini" farbe={farben.orange} zentriert>
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
    </View>
  );
}
