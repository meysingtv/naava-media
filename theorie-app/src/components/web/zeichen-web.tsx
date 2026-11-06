import { useState } from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { router } from "expo-router";

import { Icon } from "@/components/icon";
import { B, Chip, Eingabe, Kachel, Knopf, Leer, n, Raster, Reiter, Spalte, TOENE, UnterKopf, type Ton, type Zustand } from "@/components/web/bunt";
import { useTasten } from "@/components/web/frage-web";
import { TastenKappe } from "@/components/web/karteikarten-web";
import { WebSeite } from "@/components/web/rahmen";
import { Verkehrszeichen, ZEICHEN_INFO, type ZeichenInfo } from "@/components/zeichen";

// Verkehrszeichen am PC: oben Gruppen und Suche, links alle Zeichen als
// Raster, rechts groß das gewählte Zeichen mit Bedeutung und Fundort.
// Pfeiltasten blättern durch die Zeichen.

type Gruppe = "alle" | ZeichenInfo["gruppe"];

const GRUPPEN: { id: Gruppe; titel: string }[] = [
  { id: "alle", titel: "Alle" },
  { id: "gefahr", titel: "Gefahrzeichen" },
  { id: "vorschrift", titel: "Vorschriftzeichen" },
  { id: "richt", titel: "Richtzeichen" },
];

const GRUPPE_TON: Record<ZeichenInfo["gruppe"], Ton> = { gefahr: TOENE.rot, vorschrift: TOENE.blau, richt: TOENE.gruen };

function ZeichenKachel({ z, aktiv, onPress }: { z: ZeichenInfo; aktiv: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={z.name}
      accessibilityState={{ selected: aktiv }}
      style={(s: Zustand) => ({
        height: 148,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingHorizontal: 10,
        borderRadius: 18,
        borderWidth: aktiv ? 2 : 1.5,
        borderColor: aktiv ? B.orange : s.hovered ? B.kante : B.linie,
        borderBottomWidth: aktiv ? 4 : 3,
        borderBottomColor: aktiv ? B.orangeKante : B.kante,
        backgroundColor: s.hovered && !aktiv ? B.hover : B.flaeche,
      })}
    >
      <Verkehrszeichen zeichen={z.key} groesse={72} />
      <Text numberOfLines={2} style={{ ...n.fett, fontSize: 13.5, lineHeight: 18, color: aktiv ? B.text : B.text2, textAlign: "center" }}>
        {z.kurz ?? z.name}
      </Text>
    </Pressable>
  );
}

export function ZeichenWeb() {
  const [gruppe, setGruppe] = useState<Gruppe>("alle");
  const [suche, setSuche] = useState("");
  const [gewaehlt, setGewaehlt] = useState<string>(ZEICHEN_INFO[0].key);

  const q = suche.trim().toLowerCase();
  const liste = ZEICHEN_INFO.filter((z) => (gruppe === "alle" || z.gruppe === gruppe) && (!q || z.name.toLowerCase().includes(q) || (z.kurz ?? "").toLowerCase().includes(q) || z.bedeutung.toLowerCase().includes(q)));
  const offen = liste.find((z) => z.key === gewaehlt) ?? liste[0] ?? null;

  useTasten((e) => {
    if (!offen || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    e.preventDefault();
    const i = liste.findIndex((z) => z.key === offen.key);
    const neu = liste[(i + (e.key === "ArrowRight" ? 1 : -1) + liste.length) % liste.length];
    if (neu) setGewaehlt(neu.key);
  });

  return (
    <WebSeite ohneRechts>
      <Spalte breite={1240}>
        <UnterKopf
          titel="Verkehrszeichen"
          unter={`${ZEICHEN_INFO.length} Zeichen mit Bedeutung`}
          rechts={
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Knopf titel="Schilder-Jagd" icon="camera" art="rand" ton="blau" onPress={() => router.push("/schilder-jagd")} />
              <Knopf titel="Zeichenfragen üben" icon="play" onPress={() => router.push({ pathname: "/training", params: { modus: "zeichen" } })} />
            </View>
          }
        />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <Reiter optionen={GRUPPEN.map((g) => ({ id: g.id, titel: g.titel, zahl: ZEICHEN_INFO.filter((z) => g.id === "alle" || z.gruppe === g.id).length }))} wert={gruppe} onWechsel={setGruppe} />
          <View style={{ width: 320 }}>
            <Eingabe icon="search" value={suche} onChangeText={setSuche} placeholder="Zeichen suchen …" accessibilityLabel="Zeichen suchen" />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 28, alignItems: "flex-start" }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {liste.length ? (
              <Raster min={150} abstand={12}>
                {liste.map((z) => (
                  <ZeichenKachel key={z.key} z={z} aktiv={offen?.key === z.key} onPress={() => setGewaehlt(z.key)} />
                ))}
              </Raster>
            ) : (
              <Kachel>
                <Leer icon="search" ton={TOENE.gelb} titel="Kein Zeichen gefunden" text={`Zu „${suche.trim()}“ gibt es hier kein Zeichen. Versuch es mit einem anderen Wort.`} />
              </Kachel>
            )}
          </View>

          {offen ? (
            <View style={{ width: 380, position: "sticky" as ViewStyle["position"], top: 0 }}>
              <Kachel style={{ padding: 28, gap: 22 }}>
                <View style={{ alignItems: "center", paddingVertical: 12 }}>
                  <Verkehrszeichen zeichen={offen.key} groesse={190} />
                </View>
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: "row" }}>
                    <Chip text={GRUPPEN.find((g) => g.id === offen.gruppe)?.titel ?? ""} ton={GRUPPE_TON[offen.gruppe]} />
                  </View>
                  <Text style={{ ...n.schwarz, fontSize: 25, lineHeight: 31, color: B.text }}>{offen.name}</Text>
                  <Text style={{ ...n.halb, fontSize: 16, lineHeight: 24, color: B.text }}>{offen.bedeutung}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 10, paddingTop: 16, borderTopWidth: 1.5, borderTopColor: B.ton }}>
                  <Icon name="location" size={18} color={B.text3} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ ...n.fett, fontSize: 13.5, color: B.text3 }}>Wo du es findest</Text>
                    <Text style={{ ...n.halb, fontSize: 14.5, lineHeight: 21, color: B.text2 }}>{offen.fundort}</Text>
                  </View>
                </View>
                <Knopf titel="Als Karteikarten lernen" icon="albums" art="rand" ton="tuerkis" onPress={() => router.push({ pathname: "/karten-lernen", params: { stapel: "zeichen" } })} />
              </Kachel>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 14 }}>
                <TastenKappe text="←" />
                <TastenKappe text="→" />
                <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>blättern</Text>
              </View>
            </View>
          ) : null}
        </View>
      </Spalte>
    </WebSeite>
  );
}
