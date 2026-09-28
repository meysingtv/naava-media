import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { KartenStapelBild, StapelSymbol } from "@/components/karteikarten-karte";
import { Knopf, Kopf, KopfTaste, T } from "@/components/ui";
import { tippen } from "@/lib/haptik";
import { heuteDran, kartenZahlen, naechsteRunde, stapelListe, type Stapel } from "@/lib/karteikarten";
import { useStand } from "@/lib/stand";
import { farben, schrift } from "@/lib/theme";

function Wert({ wert, label }: { wert: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 12 }}>
      <Text style={{ ...schrift.titelFett, fontSize: 20, color: farben.text, fontVariant: ["tabular-nums"] }}>{wert}</Text>
      <Text style={{ ...schrift.text, fontSize: 13, color: farben.text3, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function StapelZeile({ stapel }: { stapel: Stapel }) {
  const dran = stapel.faellig + (stapel.id === "zeichen" ? 0 : stapel.neu);
  const leer = stapel.ids.length === 0;
  return (
    <Pressable
      onPress={() => {
        tippen();
        router.push({ pathname: "/stapel/[id]", params: { id: stapel.id } });
      }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 14, backgroundColor: pressed ? farben.flaeche2 : "transparent" })}
    >
      <StapelSymbol id={stapel.id} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 16, color: farben.text }}>
          {stapel.titel}
        </Text>
        <Text numberOfLines={1} style={{ ...schrift.text, fontSize: 13, color: farben.text3 }}>
          {leer ? "Noch leer – schreib deine erste Karte" : stapel.unter}
        </Text>
        {!leer ? (
          <View style={{ height: 4, borderRadius: 2, backgroundColor: farben.flaeche3, overflow: "hidden", marginTop: 4, marginRight: 8 }}>
            <View style={{ width: `${(stapel.sicher / stapel.ids.length) * 100}%`, height: "100%", borderRadius: 2, backgroundColor: farben.gruen }} />
          </View>
        ) : null}
      </View>
      {dran > 0 ? (
        <View style={{ minWidth: 26, height: 26, paddingHorizontal: 7, borderRadius: 13, backgroundColor: farben.orange, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ ...schrift.textFett, fontSize: 13, color: farben.aufOrange, fontVariant: ["tabular-nums"] }}>{dran}</Text>
        </View>
      ) : null}
      <Icon name="chevron-forward" size={16} color={farben.text4} />
    </Pressable>
  );
}

/** Übersicht: heute fällige Karten, alle Stapel, eigene Karten schreiben. */
export default function Karteikarten() {
  const insets = useSafeAreaInsets();
  const { stand } = useStand();
  const dran = heuteDran(stand);
  const zahlen = kartenZahlen(stand);
  const stapel = stapelListe(stand);
  const zeichenBegonnen = Object.keys(stand.karteikarten.faecher).filter((id) => id.startsWith("z:")).length;
  const weiter = naechsteRunde(stand);

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <Kopf titel="Karteikarten" rechts={<KopfTaste icon="add" label="Neue Karte schreiben" onPress={() => router.push("/karte-bearbeiten")} />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: insets.bottom + 28, gap: 16 }} showsVerticalScrollIndicator={false}>
        {/* Heute dran */}
        <View style={{ borderRadius: 18, overflow: "hidden", backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie, padding: 16, gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: farben.flaeche2, alignItems: "center", justifyContent: "center" }}>
              <KartenStapelBild groesse={44} />
            </View>
            <View style={{ flex: 1 }}>
              <T v="mini" farbe={farben.orangeText}>
                Heute dran
              </T>
              <Text style={{ ...schrift.titel, fontSize: 30, lineHeight: 36, color: farben.text, fontVariant: ["tabular-nums"] }}>
                {dran.gesamt} {dran.gesamt === 1 ? "Karte" : "Karten"}
              </Text>
              <Text style={{ ...schrift.text, fontSize: 14, color: farben.text2 }}>
                {dran.gesamt > 0
                  ? [dran.wiederholen > 0 ? `${dran.wiederholen} wiederholen` : null, dran.neu > 0 ? `${dran.neu} neu` : null].filter(Boolean).join(" · ")
                  : zahlen.gelernt > 0 || zahlen.eigene > 0
                    ? weiter
                      ? `Alles wiederholt – weiter geht's ${weiter}.`
                      : "Alles wiederholt."
                    : "Noch keine Karten – leg gleich los."}
              </Text>
            </View>
          </View>
          {dran.gesamt > 0 ? (
            <Knopf titel="Jetzt lernen" icon="arrow-forward" onPress={() => router.push({ pathname: "/karten-lernen", params: { stapel: "heute" } })} />
          ) : zahlen.gelernt === 0 && zahlen.eigene === 0 ? (
            <Knopf titel="Mit Verkehrszeichen starten" icon="arrow-forward" onPress={() => router.push({ pathname: "/karten-lernen", params: { stapel: "zeichen" } })} />
          ) : null}
        </View>

        <View style={{ flexDirection: "row", borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
          <Wert wert={String(zahlen.eigene)} label="Deine Karten" />
          <View style={{ width: 1, marginVertical: 12, backgroundColor: farben.linie }} />
          <Wert wert={String(zahlen.sicher)} label="Sitzen" />
          <View style={{ width: 1, marginVertical: 12, backgroundColor: farben.linie }} />
          <Wert wert={`${zeichenBegonnen}/100`} label="Zeichen" />
        </View>

        <View>
          <Text style={{ ...schrift.titelFett, fontSize: 20, color: farben.text, marginBottom: 10 }}>Stapel</Text>
          <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
            {stapel.map((s, i) => (
              <View key={s.id}>
                {i > 0 ? <View style={{ height: 1, backgroundColor: farben.linie, marginLeft: 72 }} /> : null}
                <StapelZeile stapel={s} />
              </View>
            ))}
          </View>
        </View>

        {zahlen.eigene === 0 ? (
          <View style={{ flexDirection: "row", gap: 14, padding: 16, borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: farben.orangeSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="albums-outline" size={20} color={farben.orange} />
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
      </ScrollView>
    </View>
  );
}
