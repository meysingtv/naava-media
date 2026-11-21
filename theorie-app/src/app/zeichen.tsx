import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { BlurView } from "expo-blur";
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

function ZeichenInhalt({ z, farbe }: { z: ZeichenInfo; farbe: string }) {
  return (
    <View style={{ alignItems: "center", gap: 12, paddingTop: 20, paddingBottom: 16, paddingHorizontal: 8 }}>
      <Verkehrszeichen zeichen={z.key} groesse={62} />
      <Text numberOfLines={2} style={{ ...schrift.textMittel, fontSize: 12, lineHeight: 16, color: farbe, textAlign: "center" }}>
        {z.kurz ?? z.name}
      </Text>
    </View>
  );
}

function ZeichenHandy() {
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
  const [gruppe, setGruppe] = useState<(typeof GRUPPEN)[number]["id"]>("alle");
  const [offen, setOffen] = useState<ZeichenInfo | null>(null);
  const liste = ZEICHEN_INFO.filter((z) => gruppe === "alle" || z.gruppe === gruppe);

  return (
    <Seite>
      {/* Dunkel: das Kopfbild stark verschwommen als Grund der ganzen Seite –
          die Kacheln aus Mattglas nehmen so seine warmen Farben auf. */}
      {f.hell ? null : (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          <Image source={FOTOS.schilder} blurRadius={40} resizeMode="cover" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} />
          <LinearGradient colors={[mitDeckkraft(f.grund, 0.72), mitDeckkraft(f.grund, 0.58), mitDeckkraft(f.grund, 0.78)]} locations={[0, 0.55, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        </View>
      )}
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Unter dem Foto weich in den verschwommenen Grund – keine Kante */}
        {f.hell ? null : (
          <LinearGradient pointerEvents="none" colors={[f.grund, mitDeckkraft(f.grund, 0)]} style={{ position: "absolute", top: insets.top + 300, left: 0, right: 0, height: 280 }} />
        )}
        <FotoKopf bild={FOTOS.schilder} hoehe={300} titel="Verkehrszeichen" unter={`${ZEICHEN_INFO.length} Zeichen mit Bedeutung`} />
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
                { width: "31%", flexGrow: 1, maxWidth: "32%", borderRadius: 24, transform: [{ scale: pressed ? 0.96 : 1 }] },
                f.hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.06, 16, 6) } : null,
              ]}
            >
              {f.hell ? (
                <View style={{ borderRadius: 24, overflow: "hidden" }}>
                  <LinearGradient colors={["#FFFFFF", "#F8F6F2"]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                  <ZeichenInhalt z={z} farbe={f.text2} />
                </View>
              ) : (
                <View style={{ borderRadius: 24, overflow: "hidden", backgroundColor: "rgba(30,28,28,0.32)" }}>
                  {/* Mattglas: der Lichtgrund dahinter schimmert weich durch */}
                  <BlurView intensity={45} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                  <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.07)" }} />
                  {/* Orange Akzent: dezent aus der Ecke oben rechts */}
                  <LinearGradient colors={[mitDeckkraft(f.orange, 0.12), mitDeckkraft(f.orange, 0)]} locations={[0, 0.55]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
                  <ZeichenInhalt z={z} farbe={f.text} />
                </View>
              )}
            </Pressable>
          ))}
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
