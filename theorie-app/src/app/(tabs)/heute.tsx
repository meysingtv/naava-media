import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Icon } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { Ring } from "@/components/grafik";
import { Schnellzugriff } from "@/components/schnellzugriff";
import { useInhaltUnten } from "@/components/tab-leiste";
import { Balken, getoent, T } from "@/components/ui";
import { FOTOS } from "@/lib/fotos";
import { tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { fortschritt, heuteBeantwortet, serieAktuell, useStand, wocheTage } from "@/lib/stand";
import { farben, handschrift, schrift } from "@/lib/theme";

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

function Punkt({ zustand }: { zustand: "voll" | "halb" | "leer" }) {
  if (zustand === "halb") {
    return (
      <View style={{ width: 12, height: 12, borderRadius: 6, overflow: "hidden", flexDirection: "row", backgroundColor: farben.flaeche3 }}>
        <View style={{ width: 6, height: 12, backgroundColor: farben.orange }} />
      </View>
    );
  }
  return <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: zustand === "voll" ? farben.orange : farben.flaeche3 }} />;
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
  const grund = farben.grund;
  const karte = farben.flaeche;

  return (
    <View style={{ flex: 1, backgroundColor: grund }}>
      <ScrollView contentContainerStyle={{ paddingBottom: inhaltUnten }} showsVerticalScrollIndicator={false}>
        {/* Titelbild, unten weich in den Grund verblendet */}
        <View style={{ height: heroHoehe, overflow: "hidden" }}>
          <Image source={FOTOS.held} style={{ position: "absolute", top: 0, left: 0, right: 0, height: heroHoehe, width: "100%" }} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.16)", "rgba(0,0,0,0)"]}
            locations={[0, 0.22, 0.42]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.42)", "rgba(0,0,0,0)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 0.7, y: 0.5 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <LinearGradient
            colors={[getoent(grund, 0), getoent(grund, 0.3), getoent(grund, 0.74), getoent(grund, 0.95), grund]}
            locations={[0.52, 0.66, 0.8, 0.92, 1]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: -1 }}
          />

          {/* Begrüßung */}
          <View style={{ paddingTop: insets.top + 2, paddingLeft: 28, paddingRight: RAND, flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...schrift.textMittel, fontSize: 16, color: "rgba(255,255,255,0.86)" }}>Hallo</Text>
              <Text style={{ ...schrift.titel, fontSize: 34, lineHeight: 40, color: farben.fotoText, letterSpacing: -0.5 }} numberOfLines={1}>
                {vorname}
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
              <Icon name="notifications" size={24} color={farben.fotoText} />
              {glockePunkt ? (
                <View style={{ position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: 4.5, backgroundColor: farben.orange, borderWidth: 1.5, borderColor: "rgba(0,0,0,0.35)" }} />
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
              <ProfilBild name={anzeigeName} groesse={50} />
            </Pressable>
          </View>

          {/* Slogan in Handschrift */}
          <View pointerEvents="none" style={{ position: "absolute", left: 28, top: insets.top + 104, transform: [{ rotate: "-8deg" }] }}>
            {[
              { text: "Mach", einzug: 0 },
              { text: "deinen Führerschein", einzug: 12 },
              { text: "möglich.", einzug: 26 },
            ].map((z) => (
              <Text
                key={z.text}
                style={{ fontFamily: handschrift, fontSize: 28, lineHeight: 33, marginLeft: z.einzug, color: farben.fotoText, textShadowColor: "rgba(0,0,0,0.45)", textShadowRadius: 6 }}
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
          accessibilityRole="button"
          style={({ pressed }) => ({
            marginTop: -62,
            marginHorizontal: 24,
            height: 58,
            borderRadius: 18,
            backgroundColor: farben.orange,
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: 24,
            paddingRight: 8,
            opacity: pressed ? 0.88 : 1,
          })}
        >
          <Text style={{ ...schrift.textHalb, fontSize: 19, color: farben.aufOrange, flex: 1 }}>Lernen starten</Text>
          <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="arrow-forward" size={21} color={farben.aufOrange} weight="semibold" />
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
        <View style={{ paddingHorizontal: RAND, marginTop: 26, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <T v="h2">Dein Fortschritt</T>
          <Pressable
            onPress={() => {
              tippen();
              router.push("/statistik");
            }}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
          >
            <Text style={{ ...schrift.textMittel, fontSize: 14.5, color: farben.orangeText }}>Alle ansehen</Text>
            <Icon name="chevron-forward" size={14} color={farben.orangeText} />
          </Pressable>
        </View>

        <View
          style={{
            marginHorizontal: RAND,
            marginTop: 12,
            padding: 14,
            paddingRight: 18,
            borderRadius: 16,
            backgroundColor: karte,
            borderWidth: 1,
            borderColor: farben.linie,
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Ring anteil={gesamt.anteil} groesse={68} dicke={7} spur={farben.flaeche3}>
            <Text style={{ ...schrift.titel, fontSize: 18, color: farben.text, fontVariant: ["tabular-nums"] }}>{Math.round(gesamt.anteil * 100)}%</Text>
          </Ring>
          <View style={{ flex: 1, gap: 10 }}>
            <View>
              <Text style={{ ...schrift.textHalb, fontSize: 16, color: farben.text }}>
                {gesamt.richtig} von {gesamt.gesamt} Fragen
              </Text>
              <Text style={{ ...schrift.text, fontSize: 13.5, color: farben.text3, marginTop: 1 }}>zuletzt richtig beantwortet</Text>
            </View>
            <Balken wert={Math.max(0.02, gesamt.anteil)} hoehe={8} />
          </View>
        </View>

        {/* Serie und Woche */}
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: RAND, marginTop: 10 }}>
          <View style={{ flex: 0.86, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, height: 66, borderRadius: 16, backgroundColor: karte, borderWidth: 1, borderColor: farben.linie }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: farben.orangeSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="flame" size={22} color={farben.flamme} />
            </View>
            <View>
              <Text style={{ ...schrift.titel, fontSize: 21, lineHeight: 25, color: farben.text, fontVariant: ["tabular-nums"] }}>{serie}</Text>
              <Text style={{ ...schrift.text, fontSize: 13, color: farben.text3 }}>{serie === 1 ? "Tag in Folge" : "Tage in Folge"}</Text>
            </View>
          </View>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, height: 66, borderRadius: 16, backgroundColor: karte, borderWidth: 1, borderColor: farben.linie }}>
            {woche.map((tag) => {
              const zustand = tag.heute ? (heute >= stand.tagesziel ? "voll" : heute > 0 ? "halb" : "leer") : tag.gelernt ? "voll" : "leer";
              return (
                <View key={tag.kurz} style={{ alignItems: "center", gap: 7 }}>
                  <Punkt zustand={zustand} />
                  <Text style={{ ...(tag.heute ? schrift.textHalb : schrift.text), fontSize: 11, color: tag.heute ? farben.text : farben.text3 }}>{tag.kurz}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Zitat */}
        <View style={{ marginHorizontal: RAND, marginTop: 10, height: 76, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: farben.linie, backgroundColor: karte }}>
          <Image source={FOTOS.zitat} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "64%", height: "100%" }} resizeMode="cover" />
          <LinearGradient
            colors={[karte, getoent(karte, 0.92), getoent(karte, 0.7), getoent(karte, 0.4), getoent(karte, 0.12), getoent(karte, 0)]}
            locations={[0, 0.14, 0.32, 0.52, 0.78, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "64%" }}
          />
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18 }}>
            <Text style={{ ...schrift.titel, fontSize: 38, lineHeight: 42, color: farben.orange, marginTop: 14 }}>“</Text>
            <View>
              <Text style={{ ...schrift.textHalb, fontSize: 15.5, lineHeight: 21, color: farben.text }}>{zitat[0]}</Text>
              <Text style={{ ...schrift.text, fontSize: 15.5, lineHeight: 21, color: farben.text2 }}>{zitat[1]}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
