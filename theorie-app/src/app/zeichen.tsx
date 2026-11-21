import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AktionsLeiste, HauptKnopf, NebenKnopf } from "@/components/frage-rahmen";
import { FotoKopf, Seite } from "@/components/seite";
import { Chip, Knopf, T } from "@/components/ui";
import { ZeichenWeb } from "@/components/web/zeichen-web";
import { Verkehrszeichen, ZEICHEN_INFO, type ZeichenInfo } from "@/components/zeichen";
import { useDarstellung } from "@/lib/darstellung";
import { useDesktop } from "@/lib/fenster";
import { FOTOS } from "@/lib/fotos";
import { tippen } from "@/lib/haptik";
import { leuchten, mitDeckkraft, RAND, schrift } from "@/lib/theme";
import { FRAGEN_AKTIV } from "@/lib/funktionen";

/** Farbton je Gruppe für die Kacheln. */
const GRUPPEN_TON: Record<ZeichenInfo["gruppe"], string> = {
  gefahr: "#F59E0B",
  vorschrift: "#EF4444",
  richt: "#3B82F6",
};

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

function ZeichenHandy() {
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
  const [gruppe, setGruppe] = useState<(typeof GRUPPEN)[number]["id"]>("alle");
  const [offen, setOffen] = useState<ZeichenInfo | null>(null);
  const liste = ZEICHEN_INFO.filter((z) => gruppe === "alle" || z.gruppe === gruppe);

  return (
    <Seite>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <FotoKopf bild={FOTOS.schilder} hoehe={300} titel="Verkehrszeichen" unter={`${ZEICHEN_INFO.length} Zeichen mit Bedeutung`} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: RAND, gap: 8, paddingTop: 8, paddingBottom: 16 }}>
          {GRUPPEN.map((g) => (
            <Chip key={g.id} text={g.titel} aktiv={g.id === gruppe} onPress={() => setGruppe(g.id)} />
          ))}
        </ScrollView>
        <View style={{ paddingHorizontal: RAND, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {liste.map((z) => {
            const ton = GRUPPEN_TON[z.gruppe];
            return (
              <Pressable
                key={z.key}
                onPress={() => {
                  tippen();
                  setOffen(z);
                }}
                accessibilityRole="button"
                accessibilityLabel={z.name}
                style={({ pressed }) => [
                  { width: "31%", flexGrow: 1, maxWidth: "32%", borderRadius: 22, transform: [{ scale: pressed ? 0.96 : 1 }] },
                  f.hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.07, 12, 4) } : { backgroundColor: f.flaeche },
                ]}
              >
                <View style={{ borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: mitDeckkraft(ton, f.hell ? 0.16 : 0.26) }}>
                  <LinearGradient
                    colors={[mitDeckkraft(ton, f.hell ? 0.16 : 0.24), mitDeckkraft(ton, f.hell ? 0.03 : 0.04)]}
                    locations={[0, 0.75]}
                    style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
                  />
                  <View style={{ alignItems: "center", gap: 10, paddingTop: 18, paddingBottom: 14, paddingHorizontal: 8 }}>
                    <Verkehrszeichen zeichen={z.key} groesse={62} />
                    <Text numberOfLines={2} style={{ ...schrift.textMittel, fontSize: 12, lineHeight: 16, color: f.text, textAlign: "center" }}>
                      {z.kurz ?? z.name}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <AktionsLeiste unten={insets.bottom}>
        {FRAGEN_AKTIV ? (
          <>
            <NebenKnopf icon="camera" onPress={() => router.push("/schilder-jagd")} style={{ width: 56 }} />
            <HauptKnopf titel="Zeichenfragen üben" icon="arrow-forward" onPress={() => router.push({ pathname: "/training", params: { modus: "zeichen" } })} style={{ flex: 1 }} />
          </>
        ) : (
          <HauptKnopf titel="Schilder-Jagd starten" icon="camera" onPress={() => router.push("/schilder-jagd")} style={{ flex: 1 }} />
        )}
      </AktionsLeiste>

      <Modal supportedOrientations={["portrait", "landscape"]} visible={offen != null} transparent animationType="fade" onRequestClose={() => setOffen(null)}>
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
