import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ring } from "@/components/grafik";
import { Icon } from "@/components/icon";
import { AktionsLeiste, HauptKnopf } from "@/components/frage-rahmen";
import { FotoKopf, Seite } from "@/components/seite";
import { Chip, kartenFlaeche, Knopf, T } from "@/components/ui";
import { Verkehrszeichen, ZEICHEN_INFO, type ZeichenInfo } from "@/components/zeichen";
import { useDarstellung } from "@/lib/darstellung";
import { datumKurz, datumLang } from "@/lib/format";
import { FOTOS } from "@/lib/fotos";
import type { ZeichenKey } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { ALBUM, XP_JE_SCHILD, XP_QUIZ } from "@/lib/schilder-jagd";
import { useStand } from "@/lib/stand";
import { abstand, leuchten, mitDeckkraft, RAND, schrift, verlauf } from "@/lib/theme";

type Filter = "alle" | "gefunden" | "offen";
const FILTER: { id: Filter; titel: string }[] = [
  { id: "alle", titel: "Alle" },
  { id: "gefunden", titel: "Gefunden" },
  { id: "offen", titel: "Noch offen" },
];

const GRUPPEN: { id: ZeichenInfo["gruppe"]; titel: string }[] = [
  { id: "gefahr", titel: "Gefahrzeichen" },
  { id: "vorschrift", titel: "Vorschriftzeichen" },
  { id: "richt", titel: "Richtzeichen" },
];

function infoVon(key: ZeichenKey): ZeichenInfo | undefined {
  return ZEICHEN_INFO.find((z) => z.key === key);
}

export default function SchilderJagd() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { stand } = useStand();
  const { belohnungen, farbwelt: f } = useDarstellung();
  const [offen, setOffen] = useState<ZeichenInfo | null>(null);
  const [filter, setFilter] = useState<Filter>("alle");
  const kachel = Math.floor((width - RAND * 2 - 20) / 3);

  const gefunden = ALBUM.filter((k) => stand.schilder[k]);
  const anteil = gefunden.length / ALBUM.length;
  const zuletzt = [...gefunden].sort((a, b) => (stand.schilder[b] ?? "").localeCompare(stand.schilder[a] ?? ""))[0];
  // Heutiges Ziel: jeden Tag ein anderes Schild, das noch fehlt
  const offene = ALBUM.map(infoVon).filter((z): z is ZeichenInfo => Boolean(z) && !stand.schilder[z!.key]);
  const tag = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  const ziel = offene.length > 0 ? offene[(tag * 7) % offene.length] : null;

  return (
    <Seite>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <FotoKopf bild={FOTOS.verhalten} hoehe={230} titel="Schilder-Jagd" unter="Echte Schilder finden und sammeln" />
        <View style={{ paddingHorizontal: RAND, marginTop: 8, gap: abstand(5) }}>
        {/* Fortschritt */}
        <View style={[{ flexDirection: "row", alignItems: "center", gap: 18, padding: 16, borderRadius: 24 }, kartenFlaeche(f)]}>
          <Ring anteil={anteil} groesse={86} dicke={8} verlauf={verlauf.ring} spur={f.hell ? "rgba(20,23,27,0.08)" : "rgba(255,255,255,0.12)"} leuchten>
            <Text style={{ ...schrift.titel, fontSize: 22, color: f.text, fontVariant: ["tabular-nums"] }}>{gefunden.length}</Text>
            <Text style={{ ...schrift.textMittel, fontSize: 11.5, color: f.text3, marginTop: -2 }}>von {ALBUM.length}</Text>
          </Ring>
          <View style={{ flex: 1, gap: 4 }}>
            <T v="h2">{gefunden.length === 0 ? "Dein Album ist noch leer" : gefunden.length === ALBUM.length ? "Album komplett!" : "Schilder gefunden"}</T>
            <T v="text" style={{ fontSize: 14, lineHeight: 19 }}>
              {zuletzt
                ? `Zuletzt: ${infoVon(zuletzt)?.kurz ?? infoVon(zuletzt)?.name ?? ""}`
                : belohnungen
                  ? `Finde echte Schilder in deiner Umgebung und scanne sie – jedes neue bringt ${XP_JE_SCHILD} XP, das Quiz danach ${XP_QUIZ} mehr.`
                  : "Finde echte Schilder in deiner Umgebung und scanne sie – jedes neue kommt in dein Album."}
            </T>
          </View>
        </View>

        {ziel ? (
          <Pressable
            onPress={() => {
              tippen();
              setOffen(ziel);
            }}
            accessibilityLabel={`Heutiges Ziel: ${ziel.name}`}
            style={({ pressed }) => [
              { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 22, transform: [{ scale: pressed ? 0.985 : 1 }] },
              kartenFlaeche(f),
              { borderWidth: 1.5, borderColor: mitDeckkraft(f.orange, 0.4) },
            ]}
          >
            <Verkehrszeichen zeichen={ziel.key} groesse={54} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="mini" farbe={f.orange}>
                Heutiges Ziel
              </T>
              <T v="h3">{ziel.kurz ?? ziel.name}</T>
              <T v="klein" style={{ fontSize: 13, lineHeight: 17 }} numberOfLines={2}>
                {ziel.fundort}
              </T>
            </View>
            <Icon name="chevron-forward" size={18} color={f.text3} />
          </Pressable>
        ) : null}

        <View style={{ flexDirection: "row", gap: abstand(2) }}>
          {FILTER.map((x) => (
            <Chip key={x.id} text={x.titel} aktiv={x.id === filter} onPress={() => setFilter(x.id)} />
          ))}
        </View>

        {GRUPPEN.map((g) => {
          const gruppe = ALBUM.map(infoVon).filter((z): z is ZeichenInfo => z?.gruppe === g.id);
          const hier = gruppe.filter((z) => stand.schilder[z.key]).length;
          const liste = gruppe.filter((z) => filter === "alle" || (filter === "gefunden") === Boolean(stand.schilder[z.key]));
          if (liste.length === 0) return null;
          return (
            <View key={g.id} style={{ gap: abstand(3) }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
                <Text style={{ ...schrift.titel, fontSize: 19, color: f.text }}>{g.titel}</Text>
                <Text style={{ ...schrift.textHalb, fontSize: 14, color: hier === gruppe.length ? f.orange : f.text3, fontVariant: ["tabular-nums"] }}>
                  {hier}/{gruppe.length}
                </Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {liste.map((z) => {
                  const fund = stand.schilder[z.key];
                  return (
                    <Pressable
                      key={z.key}
                      accessibilityLabel={`${z.name}${fund ? ", gefunden" : ", noch nicht gefunden"}`}
                      onPress={() => {
                        tippen();
                        setOffen(z);
                      }}
                      style={({ pressed }) => [
                        { width: kachel, alignItems: "center", gap: 8, paddingTop: 14, paddingBottom: 10, paddingHorizontal: 6, borderRadius: 20, transform: [{ scale: pressed ? 0.97 : 1 }] },
                        fund
                          ? [kartenFlaeche(f), { borderWidth: 1.5, borderColor: mitDeckkraft(f.orange, 0.4) }]
                          : { backgroundColor: f.hell ? "rgba(20,23,27,0.035)" : "rgba(255,255,255,0.03)", borderWidth: 1, borderStyle: "dashed", borderColor: f.hell ? "rgba(20,23,27,0.12)" : "rgba(255,255,255,0.1)" },
                      ]}
                    >
                      <View style={{ opacity: fund ? 1 : 0.16 }}>
                        <Verkehrszeichen zeichen={z.key} groesse={58} />
                      </View>
                      {!fund ? (
                        <View style={[{ position: "absolute", top: 30, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" }, f.hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.1, 6, 2) } : { backgroundColor: "rgba(19,26,33,0.92)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }]}>
                          <Text style={{ ...schrift.titelFett, fontSize: 16, color: f.text3 }}>?</Text>
                        </View>
                      ) : null}
                      <Text numberOfLines={2} style={{ ...schrift.textMittel, fontSize: 12, lineHeight: 15, color: fund ? f.text : f.text3, textAlign: "center", minHeight: 30 }}>
                        {z.kurz ?? z.name}
                      </Text>
                      <Text style={{ ...schrift.textHalb, fontSize: 11, color: fund ? f.orange : "transparent" }}>{fund ? datumKurz(fund) : "–"}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={[{ flexDirection: "row", gap: 12, padding: 14, borderRadius: 20 }, kartenFlaeche(f)]}>
          <Icon name="warning-outline" size={20} color="#F2A100" />
          <T v="klein" style={{ flex: 1, fontSize: 13, lineHeight: 18, color: f.text2 }}>
            Scanne nur zu Fuß oder als Beifahrer – nie selbst am Steuer. Die Fotos werden nur auf deinem Handy ausgewertet und nicht gespeichert.
          </T>
        </View>
        </View>
      </ScrollView>

      {/* Scannen */}
      <AktionsLeiste unten={insets.bottom}>
        <HauptKnopf titel="Schild scannen" icon="camera" onPress={() => router.push("/schild-scanner")} style={{ flex: 1 }} />
      </AktionsLeiste>

      <Modal visible={offen != null} transparent animationType="fade" onRequestClose={() => setOffen(null)}>
        <Pressable onPress={() => setOffen(null)} style={{ flex: 1, backgroundColor: f.hell ? "rgba(20,16,10,0.35)" : "rgba(3,5,7,0.74)", justifyContent: "flex-end" }}>
          {offen ? (
            <Pressable
              onPress={() => {}}
              style={[
                { margin: abstand(3), marginBottom: insets.bottom + abstand(3), padding: abstand(6), borderRadius: 30, alignItems: "center", gap: abstand(4) },
                f.hell ? { backgroundColor: "#FFFFFF" } : { backgroundColor: f.flaeche, borderWidth: 1, borderColor: f.linieStark },
              ]}
            >
              <View style={{ opacity: stand.schilder[offen.key] ? 1 : 0.35 }}>
                <Verkehrszeichen zeichen={offen.key} groesse={140} />
              </View>
              <View style={{ gap: abstand(2), alignSelf: "stretch" }}>
                <T v="mini" farbe={stand.schilder[offen.key] ? f.orange : f.text3} zentriert>
                  {stand.schilder[offen.key] ? `Gefunden am ${datumLang(new Date(stand.schilder[offen.key]))}` : "Noch nicht gefunden"}
                </T>
                <T v="titel" zentriert>
                  {offen.name}
                </T>
                <T v="text" zentriert>
                  {offen.bedeutung}
                </T>
              </View>
              <View style={{ alignSelf: "stretch", flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 18, backgroundColor: f.hell ? "#F6F2EC" : f.flaeche2 }}>
                <Icon name="location-outline" size={18} color={f.orange} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.orange }}>Wo findest du es?</Text>
                  <Text style={{ ...schrift.text, fontSize: 13.5, lineHeight: 18, color: f.text2 }}>{offen.fundort}</Text>
                </View>
              </View>
              {stand.schilder[offen.key] ? (
                <Knopf titel="Schließen" art="sekundaer" onPress={() => setOffen(null)} style={{ alignSelf: "stretch" }} />
              ) : (
                <View style={{ alignSelf: "stretch", gap: abstand(2) }}>
                  <Knopf
                    titel="Jetzt suchen"
                    icon="camera"
                    onPress={() => {
                      setOffen(null);
                      router.push("/schild-scanner");
                    }}
                  />
                  <Knopf titel="Schließen" art="geist" onPress={() => setOffen(null)} />
                </View>
              )}
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </Seite>
  );
}
