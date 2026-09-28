import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { Balken, getoent } from "@/components/ui";
import { Verkehrszeichen } from "@/components/zeichen";
import { themaVon, type ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { heuteDran, kartenZahlen, type StapelId } from "@/lib/karteikarten";
import { useStand } from "@/lib/stand";
import { farben, schrift } from "@/lib/theme";

/** Kleiner Kartenstapel als Bild: zwei Karten hinten, vorn eine helle mit Textzeilen. */
export function KartenStapelBild({ groesse = 34 }: { groesse?: number }) {
  const b = groesse * 0.72;
  const h = groesse * 0.92;
  const karte = { position: "absolute" as const, width: b, height: h, borderRadius: groesse * 0.14 };
  return (
    <View style={{ width: groesse, height: groesse, alignItems: "center", justifyContent: "center" }}>
      <View style={{ ...karte, backgroundColor: farben.hell ? "#C9CAD2" : "#3A3A42", transform: [{ rotate: "-14deg" }, { translateX: -groesse * 0.1 }] }} />
      <View style={{ ...karte, backgroundColor: farben.hell ? "#DEDFE5" : "#55555E", transform: [{ rotate: "9deg" }, { translateX: groesse * 0.08 }] }} />
      <View
        style={{
          ...karte,
          backgroundColor: "#FFFFFF",
          borderWidth: farben.hell ? 1 : 0,
          borderColor: "rgba(0,0,0,0.1)",
          padding: groesse * 0.1,
          gap: groesse * 0.07,
          justifyContent: "center",
        }}
      >
        <View style={{ height: Math.max(2, groesse * 0.07), borderRadius: 2, backgroundColor: farben.orange, width: "80%" }} />
        <View style={{ height: Math.max(2, groesse * 0.05), borderRadius: 2, backgroundColor: "#CFCFD6", width: "100%" }} />
        <View style={{ height: Math.max(2, groesse * 0.05), borderRadius: 2, backgroundColor: "#CFCFD6", width: "62%" }} />
      </View>
    </View>
  );
}

/** Symbol eines Stapels: Stift für eigene Karten, Themen-Symbol, Zeichen. */
export function StapelSymbol({ id, groesse = 44 }: { id: StapelId; groesse?: number }) {
  const rund = groesse * 0.28;
  if (id === "zeichen") {
    return (
      <View style={{ width: groesse, height: groesse, borderRadius: rund, backgroundColor: farben.flaeche2, alignItems: "center", justifyContent: "center" }}>
        <Verkehrszeichen zeichen="z205" groesse={groesse * 0.62} />
      </View>
    );
  }
  const icon: IconName = id === "eigen" ? "create-outline" : (themaVon(id.slice(2) as ThemaId).icon as IconName);
  const farbe = id === "eigen" ? farben.orange : farben.blau;
  return (
    <View style={{ width: groesse, height: groesse, borderRadius: rund, backgroundColor: getoent(farbe, 0.14), alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={groesse * 0.46} color={farbe} />
    </View>
  );
}

/** Einstieg in die Karteikarten auf „Lernen“ – gleiche Form wie die Kategorie-Zeilen. */
export function KarteikartenKarte() {
  const { stand } = useStand();
  const dran = heuteDran(stand);
  const zahlen = kartenZahlen(stand);
  const begonnen = zahlen.gelernt > 0 || zahlen.eigene > 0;
  const unter =
    dran.gesamt > 0
      ? `${dran.gesamt} ${dran.gesamt === 1 ? "Karte" : "Karten"} heute dran`
      : begonnen
        ? "Alles wiederholt – stark!"
        : "Fragen als Karten lernen";
  const anteil = zahlen.gelernt > 0 ? zahlen.sicher / zahlen.gelernt : 0;

  return (
    <Pressable
      onPress={() => {
        tippen();
        router.push("/karteikarten");
      }}
      accessibilityRole="button"
      accessibilityLabel={`Karteikarten, ${unter}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 12,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 16,
        backgroundColor: pressed ? farben.flaeche2 : farben.flaeche,
        borderWidth: 1,
        borderColor: farben.linie,
      })}
    >
      <View style={{ width: 50, height: 50, borderRadius: 14, backgroundColor: farben.flaeche2, alignItems: "center", justifyContent: "center" }}>
        <KartenStapelBild groesse={30} />
      </View>
      <View style={{ flex: 1, gap: 7 }}>
        <View>
          <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 16.5, lineHeight: 21, color: farben.text }}>
            Karteikarten
          </Text>
          <Text numberOfLines={1} style={{ ...schrift.text, fontSize: 13.5, lineHeight: 18, color: farben.text3 }}>
            {unter}
          </Text>
        </View>
        {zahlen.gelernt > 0 ? (
          <View style={{ maxWidth: 150 }}>
            <Balken wert={anteil} hoehe={5} farbe={farben.gruen} />
          </View>
        ) : null}
      </View>
      <View
        style={{
          minWidth: 38,
          height: 38,
          paddingHorizontal: dran.gesamt > 0 ? 9 : 0,
          borderRadius: 19,
          backgroundColor: farben.orange,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {dran.gesamt > 0 ? (
          <Text style={{ ...schrift.textFett, fontSize: 15, color: farben.aufOrange, fontVariant: ["tabular-nums"] }}>{dran.gesamt > 99 ? "99+" : dran.gesamt}</Text>
        ) : (
          <Icon name="albums" size={17} color={farben.aufOrange} weight="semibold" />
        )}
      </View>
    </Pressable>
  );
}
