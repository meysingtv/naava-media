import { Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Kopfzeile, StartKnopf } from "@/components/home";
import { KartenStapelBild, StapelSymbol } from "@/components/karteikarten-karte";
import { FotoKopf, Seite, WerteReihe } from "@/components/seite";
import { Gruppe, kartenFlaeche, Knopf, KopfTaste, T } from "@/components/ui";
import { useDarstellung } from "@/lib/darstellung";
import { FOTOS } from "@/lib/fotos";
import { tippen } from "@/lib/haptik";
import { heuteDran, kartenZahlen, naechsteRunde, stapelListe, type Stapel } from "@/lib/karteikarten";
import { useStand } from "@/lib/stand";
import { mitDeckkraft, RAND, schrift } from "@/lib/theme";

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

function StapelZeile({ stapel }: { stapel: Stapel }) {
  const { farbwelt: f } = useDarstellung();
  const dran = stapel.faellig + (stapel.id === "zeichen" ? 0 : stapel.neu);
  const leer = stapel.ids.length === 0;
  return (
    <Pressable
      onPress={() => {
        tippen();
        router.push({ pathname: "/stapel/[id]", params: { id: stapel.id } });
      }}
      accessibilityRole="button"
      accessibilityLabel={stapel.titel}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 14, backgroundColor: pressed ? (f.hell ? "rgba(20,23,27,0.04)" : "rgba(255,255,255,0.04)") : "transparent" })}
    >
      <StapelSymbol id={stapel.id} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 16, color: f.text }}>
          {stapel.titel}
        </Text>
        <Text numberOfLines={1} style={{ ...schrift.text, fontSize: 13, color: f.text3 }}>
          {leer ? "Noch leer – schreib deine erste Karte" : stapel.unter}
        </Text>
        {!leer ? (
          <View style={{ height: 5, borderRadius: 3, backgroundColor: f.hell ? "rgba(20,23,27,0.08)" : "rgba(255,255,255,0.1)", overflow: "hidden", marginTop: 5, marginRight: 8 }}>
            <View style={{ width: `${(stapel.sicher / stapel.ids.length) * 100}%`, height: "100%", borderRadius: 3, backgroundColor: f.hell ? "#23A548" : "#4ED053" }} />
          </View>
        ) : null}
      </View>
      {dran > 0 ? (
        <View style={{ minWidth: 26, height: 26, paddingHorizontal: 7, borderRadius: 13, backgroundColor: f.orange, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ ...schrift.textFett, fontSize: 13, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{dran}</Text>
        </View>
      ) : null}
      <Icon name="chevron-forward" size={16} color={f.text3} />
    </Pressable>
  );
}

/** Übersicht: heute fällige Karten, alle Stapel, eigene Karten schreiben. */
export default function Karteikarten() {
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
  const { stand } = useStand();
  const dran = heuteDran(stand);
  const zahlen = kartenZahlen(stand);
  const stapel = stapelListe(stand);
  const zeichenBegonnen = Object.keys(stand.karteikarten.faecher).filter((id) => id.startsWith("z:")).length;
  const weiter = naechsteRunde(stand);
  const unterzeile =
    dran.gesamt > 0
      ? [dran.wiederholen > 0 ? `${dran.wiederholen} wiederholen` : null, dran.neu > 0 ? `${dran.neu} neu` : null].filter(Boolean).join(" · ")
      : zahlen.gelernt > 0 || zahlen.eigene > 0
        ? weiter
          ? `Alles wiederholt – weiter geht's ${weiter}.`
          : "Alles wiederholt."
        : "Noch keine Karten – leg gleich los.";

  return (
    <Seite>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
        <FotoKopf
          bild={FOTOS.lernen}
          hoehe={220}
          titel="Karteikarten"
          unter="Vorn die Frage, hinten die Antwort"
          rechts={<KopfTaste icon="add" label="Neue Karte schreiben" onPress={() => router.push("/karte-bearbeiten")} />}
        />

        <View style={{ paddingHorizontal: RAND, marginTop: 8, gap: 12 }}>
          {/* Heute dran */}
          <View style={[{ borderRadius: 26, padding: 18, gap: 16 }, kartenFlaeche(f)]}>
            <LinearGradient colors={[mitDeckkraft(f.orange, f.hell ? 0.12 : 0.2), mitDeckkraft(f.orange, 0)]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 0.9 }} style={[FUELLEN, { borderRadius: 26 }]} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: f.hell ? mitDeckkraft(f.orange, 0.1) : "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" }}>
                <KartenStapelBild groesse={44} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="mini" farbe={f.orange}>
                  Heute dran
                </T>
                <Text style={{ ...schrift.titel, fontSize: 30, lineHeight: 36, color: f.text, fontVariant: ["tabular-nums"] }}>
                  {dran.gesamt} {dran.gesamt === 1 ? "Karte" : "Karten"}
                </Text>
                <Text style={{ ...schrift.text, fontSize: 14, color: f.text2 }}>{unterzeile}</Text>
              </View>
            </View>
            {dran.gesamt > 0 ? (
              <StartKnopf titel="Jetzt lernen" onPress={() => router.push({ pathname: "/karten-lernen", params: { stapel: "heute" } })} />
            ) : zahlen.gelernt === 0 && zahlen.eigene === 0 ? (
              <StartKnopf titel="Loslegen" unter="Mit den 100 Verkehrszeichen" onPress={() => router.push({ pathname: "/karten-lernen", params: { stapel: "zeichen" } })} />
            ) : null}
          </View>

          <WerteReihe
            werte={[
              { wert: zahlen.eigene, label: "Deine Karten" },
              { wert: zahlen.sicher, label: "Sitzen", farbe: zahlen.sicher > 0 ? (f.hell ? "#23A548" : "#4ED053") : undefined },
              { wert: `${zeichenBegonnen}/100`, label: "Zeichen" },
            ]}
          />
        </View>

        <Kopfzeile titel="Stapel" style={{ marginTop: 30 }} />
        <View style={{ paddingHorizontal: RAND, gap: 12 }}>
          <Gruppe>
            {stapel.map((s) => (
              <StapelZeile key={s.id} stapel={s} />
            ))}
          </Gruppe>

          {zahlen.eigene === 0 ? (
            <View style={[{ flexDirection: "row", gap: 14, padding: 16, borderRadius: 22 }, kartenFlaeche(f)]}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: f.orangeSoft, alignItems: "center", justifyContent: "center" }}>
                <Icon name="albums-outline" size={20} color={f.orange} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <T v="textStark">So entstehen deine Karten</T>
                <T v="text" style={{ fontSize: 14, lineHeight: 20 }}>
                  Unter jeder Frage gibt es den Knopf „Karteikarte“. Ein Tipp – und die Frage liegt hier: vorn die Frage, hinten die richtige Antwort mit Merksatz. Oder schreib mit + deine eigenen Karten.
                </T>
              </View>
            </View>
          ) : null}

          <Knopf titel="Eigene Karte schreiben" icon="add" art="sekundaer" onPress={() => router.push("/karte-bearbeiten")} />
        </View>
      </ScrollView>
    </Seite>
  );
}
