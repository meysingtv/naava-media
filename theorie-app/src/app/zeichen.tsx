import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LilaLeisteSeite } from "@/components/lila-leiste";
import { LilaFigurBlase, LilaKarte, LilaKnopf, LILA_RAND, LilaTitel, LilaZurueck, lilaSchrift, useLila } from "@/components/lila-teile";
import { ZeichenWeb } from "@/components/web/zeichen-web";
import { Verkehrszeichen, ZEICHEN_INFO, type ZeichenInfo } from "@/components/zeichen";
import { useDesktop, useFenster } from "@/lib/fenster";
import { tippen } from "@/lib/haptik";

const GRUPPEN: { id: "alle" | ZeichenInfo["gruppe"]; titel: string }[] = [
  { id: "alle", titel: "Alle" },
  { id: "gefahr", titel: "Gefahrzeichen" },
  { id: "vorschrift", titel: "Vorschriftzeichen" },
  { id: "richt", titel: "Richtzeichen" },
];

/** Alle Verkehrszeichen als Raster – ein Tipp zeigt die Bedeutung. Am PC eine eigene Fassung. */
export default function Zeichen() {
  return useDesktop() ? <ZeichenWeb /> : <ZeichenHandy />;
}

/** Verkehrszeichen im lila Design: Figur mit Sprechblase, Filter, Raster. Ein Tipp zeigt die Bedeutung. */
function ZeichenHandy() {
  const insets = useSafeAreaInsets();
  const l = useLila();
  const { width } = useFenster();
  const [gruppe, setGruppe] = useState<(typeof GRUPPEN)[number]["id"]>("alle");
  const [offen, setOffen] = useState<ZeichenInfo | null>(null);
  const liste = ZEICHEN_INFO.filter((z) => gruppe === "alle" || z.gruppe === gruppe);
  const innen = Math.min(width, 560) - 2 * LILA_RAND;
  const kachel = Math.floor((innen - 2 * 10) / 3);

  return (
    <View style={{ flex: 1, backgroundColor: l.grund }}>
      <StatusBar style={l.hell ? "dark" : "light"} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 20, width: "100%", maxWidth: 560, alignSelf: "center" }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: LILA_RAND }}>
          <LilaZurueck />
          <LilaTitel style={{ marginTop: 14 }}>Verkehrszeichen</LilaTitel>
          <LilaFigurBlase text="Lerne alle wichtigen Verkehrszeichen!" style={{ marginTop: 6 }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: LILA_RAND, gap: 8, paddingTop: 14, paddingBottom: 16 }}>
          {GRUPPEN.map((g) => {
            const an = g.id === gruppe;
            return (
              <Pressable
                key={g.id}
                onPress={() => {
                  tippen();
                  setGruppe(g.id);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: an }}
                style={{ height: 40, paddingHorizontal: 16, borderRadius: 13, justifyContent: "center", backgroundColor: an ? "#7C4DFF" : l.karte, borderWidth: 1.5, borderColor: an ? "#7C4DFF" : l.linie }}
              >
                <Text style={{ ...lilaSchrift.textHalb, fontSize: 14, color: an ? "#FFFFFF" : l.tinte }}>{g.titel}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ paddingHorizontal: LILA_RAND, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {liste.map((z) => (
            <LilaKarte key={z.key} onPress={() => setOffen(z)} label={z.name} style={{ width: kachel }}>
              <View style={{ alignItems: "center", gap: 8, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 6, minHeight: kachel + 18 }}>
                <Verkehrszeichen zeichen={z.key} groesse={Math.min(62, kachel * 0.56)} />
                <Text numberOfLines={2} style={{ ...lilaSchrift.textHalb, fontSize: 12, lineHeight: 15, color: l.tinte, textAlign: "center" }}>
                  {z.kurz ?? z.name}
                </Text>
              </View>
            </LilaKarte>
          ))}
        </View>
      </ScrollView>
      <LilaLeisteSeite aktiv="lernen" />

      <Modal supportedOrientations={["portrait", "landscape"]} visible={offen != null} transparent animationType="fade" onRequestClose={() => setOffen(null)}>
        <Pressable onPress={() => setOffen(null)} style={{ flex: 1, backgroundColor: "rgba(20,16,40,0.45)", justifyContent: "flex-end" }}>
          {offen ? (
            <Pressable onPress={() => {}} style={{ margin: 12, marginBottom: insets.bottom + 12, padding: 22, borderRadius: 28, alignItems: "center", gap: 16, backgroundColor: l.karte, borderWidth: 1.5, borderBottomWidth: 5, borderColor: l.linie, borderBottomColor: l.kante }}>
              <Verkehrszeichen zeichen={offen.key} groesse={140} />
              <View style={{ gap: 6, alignSelf: "stretch" }}>
                <Text style={{ ...lilaSchrift.textHalb, fontSize: 13.5, color: l.lila, textAlign: "center" }}>{GRUPPEN.find((g) => g.id === offen.gruppe)?.titel}</Text>
                <Text style={{ ...lilaSchrift.titel, fontSize: 30, lineHeight: 33, color: l.tinte, textAlign: "center" }}>{offen.name}</Text>
                <Text style={{ ...lilaSchrift.text, fontSize: 15.5, lineHeight: 22, color: l.tinte2, textAlign: "center" }}>{offen.bedeutung}</Text>
              </View>
              <LilaKnopf titel="Schließen" onPress={() => setOffen(null)} style={{ alignSelf: "stretch" }} />
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
