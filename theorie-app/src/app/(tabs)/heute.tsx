import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Icon } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { Ring } from "@/components/grafik";
import { useInhaltUnten } from "@/components/tab-leiste";
import { T } from "@/components/ui";
import { FOTOS } from "@/lib/fotos";
import { tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { fortschritt, heuteBeantwortet, serieAktuell, useStand, wocheTage } from "@/lib/stand";
import { farben, handschrift, orangeVerlauf, schrift } from "@/lib/theme";

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
      <Path d="M3 18 C 28 12, 58 7, 101 3 C 70 8.5, 38 14, 5 20.5 Z" fill={farben.orange} />
    </Svg>
  );
}

function Kachel({
  titel,
  verlauf,
  rand,
  onPress,
  children,
}: {
  titel: string;
  verlauf: [string, string];
  rand: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      style={({ pressed }) => ({ flex: 1, height: 90, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: rand, transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      <LinearGradient colors={verlauf} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
        {children}
        <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#FFFFFF" }} numberOfLines={1}>
          {titel}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

function Punkt({ zustand }: { zustand: "voll" | "halb" | "leer" }) {
  if (zustand === "halb") {
    return (
      <View style={{ width: 13, height: 13, borderRadius: 6.5, overflow: "hidden", flexDirection: "row", backgroundColor: "#3F4650" }}>
        <View style={{ width: 6.5, height: 13, backgroundColor: farben.orange }} />
      </View>
    );
  }
  return <View style={{ width: 13, height: 13, borderRadius: 6.5, backgroundColor: zustand === "voll" ? farben.orange : "#3F4650" }} />;
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
            marginTop: -62,
            marginHorizontal: 24,
            height: 58,
            borderRadius: 29,
            overflow: "hidden",
            transform: [{ scale: pressed ? 0.98 : 1 }],
            shadowColor: farben.orange,
            shadowOpacity: 0.45,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 6 },
          })}
        >
          <LinearGradient colors={orangeVerlauf} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingLeft: 32, paddingRight: 5 }}>
            <Text style={{ ...schrift.textHalb, fontSize: 20, color: "#FFFFFF", flex: 1 }}>Lernen starten</Text>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
              <Icon name="arrow-forward" size={25} color="#FFFFFF" weight="semibold" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Schnellzugriff */}
        <View style={{ flexDirection: "row", gap: 9, paddingHorizontal: RAND, marginTop: 18 }}>
          <Kachel titel="Themen" verlauf={["#4E3013", "#2A1B0D"]} rand="rgba(255,160,80,0.32)" onPress={() => router.navigate("/lernen")}>
            <Icon name="book" size={34} color="#FFA83A" />
          </Kachel>
          <Kachel titel="Prüfung" verlauf={["#2F1B2C", "#1A1119"]} rand="rgba(255,90,140,0.2)" onPress={() => router.navigate("/pruefen")}>
            <MaterialCommunityIcons name="bullseye-arrow" size={34} color={farben.pink} />
          </Kachel>
          <Kachel titel="Statistiken" verlauf={["#1F212A", "#14161C"]} rand="rgba(255,255,255,0.09)" onPress={() => router.navigate("/statistik")}>
            <Icon name="stats-chart" size={32} color="#E3E6EA" />
          </Kachel>
          <Kachel titel="Favoriten" verlauf={["#181B1F", "#0F1215"]} rand="rgba(255,255,255,0.08)" onPress={() => router.push("/favoriten")}>
            <Icon name="heart" size={32} color="#FF8A1E" />
          </Kachel>
        </View>

        {/* Dein Fortschritt */}
        <View style={{ paddingHorizontal: RAND, marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <T v="titel" style={{ fontSize: 21, lineHeight: 26 }}>
            Dein Fortschritt
          </T>
          <Pressable
            onPress={() => {
              tippen();
              router.navigate("/statistik");
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
          <Ring anteil={gesamt.anteil} groesse={72} dicke={8} spur={farben.ringSpur}>
            <Text style={{ ...schrift.titel, fontSize: 19, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{Math.round(gesamt.anteil * 100)}%</Text>
          </Ring>
          <View style={{ flex: 1, gap: 12 }}>
            <Text style={{ ...schrift.text, fontSize: 16, color: "#FFFFFF" }}>
              {gesamt.richtig} von {gesamt.gesamt} Fragen
            </Text>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: farben.flaeche3, overflow: "hidden" }}>
              <LinearGradient colors={orangeVerlauf} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: `${Math.max(2, gesamt.anteil * 100)}%`, height: "100%", borderRadius: 5 }} />
            </View>
          </View>
        </View>

        {/* Serie und Woche */}
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: RAND, marginTop: 10 }}>
          <View style={{ flex: 0.86, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, height: 64, borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
            <Icon name="flame" size={34} color={farben.orange} />
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
            colors={[farben.flaeche, "rgba(13,19,23,0.85)", "rgba(13,19,23,0.2)"]}
            locations={[0.25, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
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
