import { Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Icon } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { Ring } from "@/components/grafik";
import { Schnellzugriff } from "@/components/schnellzugriff";
import { useInhaltUnten } from "@/components/tab-leiste";
import { T } from "@/components/ui";
import { FOTOS } from "@/lib/fotos";
import { tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { fortschritt, heuteBeantwortet, serieAktuell, useStand, wocheTage } from "@/lib/stand";
import { farben, handschrift, schrift, verlauf } from "@/lib/theme";

const RAND = 16;

const ZITATE: [string, string][] = [
  ["Kleine Schritte.", "Große Freiheit."],
  ["Jede Frage zählt.", "Jeder Tag bringt dich weiter."],
  ["Heute üben.", "Morgen bestehen."],
  ["Dranbleiben lohnt sich.", "Die Straße wartet."],
];

/** Oranger Pinselstrich unter dem Slogan. */
function Pinselstrich() {
  return (
    <Svg width={104} height={22} viewBox="0 0 104 22">
      <Path d="M3 18 C 28 12, 58 7, 101 3 C 70 8.5, 38 14, 5 20.5 Z" fill="#F66A16" />
    </Svg>
  );
}

function Punkt({ zustand }: { zustand: "voll" | "halb" | "leer" }) {
  if (zustand === "halb") {
    return (
      <View style={{ width: 13, height: 13, borderRadius: 6.5, overflow: "hidden", flexDirection: "row", backgroundColor: "#3F4650" }}>
        <View style={{ width: 6.5, height: 13, backgroundColor: farben.orangeHell }} />
      </View>
    );
  }
  return <View style={{ width: 13, height: 13, borderRadius: 6.5, backgroundColor: zustand === "voll" ? farben.orangeHell : "#3F4650" }} />;
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const inhaltUnten = useInhaltUnten();
  const { stand } = useStand();
  const { anzeigeName } = useKonto();

  const vorname = anzeigeName.split(" ")[0];
  const gesamt = fortschritt(stand);
  const serie = serieAktuell(stand);
  const heute = heuteBeantwortet(stand);
  const woche = wocheTage(stand);
  const zitat = ZITATE[new Date().getDate() % ZITATE.length];
  const heroHoehe = insets.top + 356;
  const glockePunkt = !stand.erinnerung.an;

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <ScrollView contentContainerStyle={{ paddingBottom: inhaltUnten }} showsVerticalScrollIndicator={false}>
        {/* Titelbild, weich ins Schwarz verblendet */}
        <View style={{ height: heroHoehe, overflow: "hidden" }}>
          <Image source={FOTOS.held} style={{ position: "absolute", top: 0, left: 0, right: 0, height: heroHoehe, width: "100%" }} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(3,5,7,0.62)", "rgba(3,5,7,0.18)", "rgba(3,5,7,0)"]}
            locations={[0, 0.22, 0.4]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <LinearGradient
            colors={["rgba(3,5,7,0.5)", "rgba(3,5,7,0)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.7, y: 0.5 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <LinearGradient
            colors={["rgba(3,5,7,0)", "rgba(3,5,7,0.28)", "rgba(3,5,7,0.72)", "rgba(3,5,7,0.94)", farben.grund]}
            locations={[0.52, 0.66, 0.8, 0.92, 1]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: -1 }}
          />

          {/* Begrüßung */}
          <View style={{ paddingTop: insets.top + 2, paddingLeft: 30, paddingRight: RAND, flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...schrift.text, fontSize: 17, color: "#F2F3F5" }}>Hallo</Text>
              <Text style={{ ...schrift.titel, fontSize: 35, lineHeight: 41, color: "#FFFFFF", letterSpacing: -0.4 }} numberOfLines={1}>
                {vorname} 👋
              </Text>
            </View>
            <Pressable
              onPress={() => {
                tippen();
                router.push("/einstellungen");
              }}
              accessibilityLabel="Erinnerungen"
              hitSlop={8}
              style={{ marginTop: 22, marginRight: 18 }}
            >
              <Icon name="notifications" size={25} color="#D8DBDF" />
              {glockePunkt ? (
                <View style={{ position: "absolute", top: -3, right: -3, width: 9, height: 9, borderRadius: 4.5, backgroundColor: farben.orange, borderWidth: 1.5, borderColor: "rgba(3,5,7,0.6)" }} />
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => {
                tippen();
                router.navigate("/profil");
              }}
              accessibilityLabel="Profil"
              style={{ marginTop: 8 }}
            >
              <ProfilBild name={anzeigeName} groesse={52} />
            </Pressable>
          </View>

          {/* Slogan in Handschrift */}
          <View pointerEvents="none" style={{ position: "absolute", left: 30, top: insets.top + 104, transform: [{ rotate: "-8deg" }] }}>
            {[
              { text: "Mach", einzug: 0 },
              { text: "deinen Führerschein", einzug: 12 },
              { text: "möglich.", einzug: 26 },
            ].map((z) => (
              <Text
                key={z.text}
                style={{ fontFamily: handschrift, fontSize: 28, lineHeight: 33, marginLeft: z.einzug, color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.45)", textShadowRadius: 6 }}
              >
                {z.text}
              </Text>
            ))}
            <View style={{ marginLeft: 30, marginTop: 2 }}>
              <Pinselstrich />
            </View>
          </View>
        </View>

        {/* Lernen starten */}
        <Pressable
          onPress={() => {
            tippen();
            router.push({ pathname: "/training", params: { modus: "smart" } });
          }}
          style={({ pressed }) => ({
            marginTop: -64,
            marginHorizontal: 29,
            height: 60,
            borderRadius: 30,
            overflow: "hidden",
            transform: [{ scale: pressed ? 0.98 : 1 }],
            shadowColor: farben.orange,
            shadowOpacity: 0.45,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 6 },
          })}
        >
          <LinearGradient colors={verlauf.knopf} locations={[0, 0.5, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <LinearGradient
            colors={verlauf.knopfSchein}
            locations={[0, 0.1, 0.25, 0.36]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingLeft: 32 }}>
            <Text style={{ ...schrift.textHalb, fontSize: 20, color: "#FFFFFF", flex: 1 }}>Lernen starten</Text>
            {/* Heller Kreis bildet das rechte Ende des Knopfs */}
            <LinearGradient colors={["#FE9145", "#FD8538"]} style={{ width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" }}>
              <Icon name="arrow-forward" size={25} color="#FFFFFF" weight="semibold" />
            </LinearGradient>
          </View>
        </Pressable>

        {/* Schnellzugriff */}
        <Schnellzugriff
          style={{ marginTop: 20 }}
          ziele={[
            { id: "themen", titel: "Themen", onPress: () => router.navigate("/lernen") },
            { id: "pruefung", titel: "Prüfung", onPress: () => router.navigate("/pruefen") },
            { id: "statistik", titel: "Statistiken", onPress: () => router.push("/statistik") },
            { id: "favoriten", titel: "Favoriten", onPress: () => router.push("/favoriten") },
          ]}
        />

        {/* Dein Fortschritt */}
        <View style={{ paddingHorizontal: RAND, marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <T v="titel" style={{ fontSize: 21, lineHeight: 26 }}>
            Dein Fortschritt
          </T>
          <Pressable
            onPress={() => {
              tippen();
              router.push("/statistik");
            }}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Text style={{ ...schrift.text, fontSize: 15, color: "#C9CDD2" }}>Alle ansehen</Text>
            <Icon name="chevron-forward" size={15} color="#C9CDD2" />
          </Pressable>
        </View>

        <View
          style={{
            marginHorizontal: RAND,
            marginTop: 10,
            padding: 9,
            paddingLeft: 12,
            paddingRight: 18,
            borderRadius: 16,
            backgroundColor: farben.flaeche,
            borderWidth: 1,
            borderColor: farben.linie,
            flexDirection: "row",
            alignItems: "center",
            gap: 18,
          }}
        >
          <View style={Platform.OS === "ios" ? { shadowColor: farben.orange, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } } : undefined}>
            <Ring anteil={gesamt.anteil} groesse={72} dicke={8} spur={farben.ringSpur}>
              <Text style={{ ...schrift.titel, fontSize: 19, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{Math.round(gesamt.anteil * 100)}%</Text>
            </Ring>
          </View>
          <View style={{ flex: 1, gap: 12 }}>
            <Text style={{ ...schrift.text, fontSize: 16, color: "#FFFFFF" }}>
              {gesamt.richtig} von {gesamt.gesamt} Fragen
            </Text>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: farben.flaeche3, overflow: "hidden" }}>
              <LinearGradient colors={verlauf.balken} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: `${Math.max(2, gesamt.anteil * 100)}%`, height: "100%", borderRadius: 5 }} />
            </View>
          </View>
        </View>

        {/* Serie und Woche */}
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: RAND, marginTop: 10 }}>
          <View style={{ flex: 0.86, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, height: 64, borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
            <Icon name="flame" size={34} color={farben.flamme} />
            <View>
              <Text style={{ ...schrift.titel, fontSize: 23, lineHeight: 27, color: "#FFFFFF" }}>{serie}</Text>
              <Text style={{ ...schrift.text, fontSize: 14, color: "#D3D7DC" }}>{serie === 1 ? "Tag in Folge" : "Tage in Folge"}</Text>
            </View>
          </View>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, height: 64, borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
            {woche.map((tag) => {
              const zustand = tag.heute ? (heute >= stand.tagesziel ? "voll" : heute > 0 ? "halb" : "leer") : tag.gelernt ? "voll" : "leer";
              return (
                <View key={tag.kurz} style={{ alignItems: "center", gap: 7 }}>
                  <Punkt zustand={zustand} />
                  <Text style={{ ...schrift.text, fontSize: 11, color: "#AEB3BA" }}>{tag.kurz}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Zitat */}
        <View style={{ marginHorizontal: RAND, marginTop: 10, height: 74, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: farben.linie, backgroundColor: farben.flaeche }}>
          <Image source={FOTOS.zitat} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "72%", height: "100%" }} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(13,19,23,1)", "rgba(13,19,23,0.95)", "rgba(13,19,23,0.8)", "rgba(13,19,23,0.55)", "rgba(13,19,23,0.3)", "rgba(13,19,23,0.12)", "rgba(13,19,23,0)"]}
            locations={[0, 0.12, 0.26, 0.42, 0.6, 0.8, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "72%" }}
          />
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18 }}>
            <Text style={{ ...schrift.titel, fontSize: 40, lineHeight: 44, color: "#FFFFFF", marginTop: 14 }}>“</Text>
            <View>
              <Text style={{ ...schrift.textMittel, fontSize: 16, lineHeight: 21, color: "#FFFFFF" }}>{zitat[0]}</Text>
              <Text style={{ ...schrift.textMittel, fontSize: 16, lineHeight: 21, color: "#FFFFFF" }}>{zitat[1]}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
