import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { Verkehrszeichen } from "@/components/zeichen";
import { themaVon, type ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { heuteDran, kartenZahlen, type StapelId } from "@/lib/karteikarten";
import { useStand } from "@/lib/stand";
import { farben, schrift, verlauf } from "@/lib/theme";

/** Kleiner Kartenstapel als Bild: zwei Karten hinten, vorn eine helle mit Textzeilen. */
export function KartenStapelBild({ groesse = 34 }: { groesse?: number }) {
  const b = groesse * 0.72;
  const h = groesse * 0.92;
  const karte = { position: "absolute" as const, width: b, height: h, borderRadius: groesse * 0.14 };
  return (
    <View style={{ width: groesse, height: groesse, alignItems: "center", justifyContent: "center" }}>
      <View style={{ ...karte, backgroundColor: "#3A424B", transform: [{ rotate: "-14deg" }, { translateX: -groesse * 0.1 }] }} />
      <View style={{ ...karte, backgroundColor: "#56606B", transform: [{ rotate: "9deg" }, { translateX: groesse * 0.08 }] }} />
      <View style={{ ...karte, backgroundColor: farben.kachelWeiss, padding: groesse * 0.1, gap: groesse * 0.07, justifyContent: "center" }}>
        <View style={{ height: Math.max(2, groesse * 0.07), borderRadius: 2, backgroundColor: farben.orange, width: "80%" }} />
        <View style={{ height: Math.max(2, groesse * 0.05), borderRadius: 2, backgroundColor: "#C9C3BA", width: "100%" }} />
        <View style={{ height: Math.max(2, groesse * 0.05), borderRadius: 2, backgroundColor: "#C9C3BA", width: "62%" }} />
      </View>
    </View>
  );
}

/** Symbol eines Stapels: Stift für eigene Karten, Themen-Symbol, Zeichen. */
export function StapelSymbol({ id, groesse = 44 }: { id: StapelId; groesse?: number }) {
  const rund = groesse * 0.28;
  if (id === "zeichen") {
    return (
      <View style={{ width: groesse, height: groesse, borderRadius: rund, backgroundColor: farben.iconKreis, alignItems: "center", justifyContent: "center" }}>
        <Verkehrszeichen zeichen="z205" groesse={groesse * 0.66} />
      </View>
    );
  }
  const icon: IconName = id === "eigen" ? "create-outline" : (themaVon(id.slice(2) as ThemaId).icon as IconName);
  const farbe = id === "eigen" ? farben.orange : farben.blau;
  return (
    <View style={{ width: groesse, height: groesse, borderRadius: rund, backgroundColor: farbe + "22", alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={groesse * 0.46} color={farbe} />
    </View>
  );
}

/** Einstieg in die Karteikarten auf „Lernen“ – gleiche Form wie die Schilder-Jagd. */
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
        height: 84,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: farben.flaeche,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        flexDirection: "row",
        alignItems: "center",
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <LinearGradient
        colors={["rgba(77,163,255,0.14)", "rgba(77,163,255,0.04)", "rgba(77,163,255,0)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View style={{ width: 86, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: farben.iconKreis, alignItems: "center", justifyContent: "center" }}>
          <KartenStapelBild groesse={32} />
        </View>
      </View>
      <View style={{ flex: 1, paddingRight: 56 }}>
        <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 17.5, lineHeight: 22, color: "#FFFFFF" }}>
          Karteikarten
        </Text>
        <Text numberOfLines={1} style={{ ...schrift.text, fontSize: 15, lineHeight: 19, color: "#D3D7DC", marginTop: 2 }}>
          {unter}
        </Text>
        {zahlen.gelernt > 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
            <View style={{ width: 112, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.16)", overflow: "hidden" }}>
              <LinearGradient colors={verlauf.kategorie} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: `${anteil * 100}%`, height: "100%", borderRadius: 4 }} />
            </View>
            <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{zahlen.sicher} sitzen</Text>
          </View>
        ) : null}
      </View>
      <View
        style={{
          position: "absolute",
          right: 12,
          minWidth: 38,
          height: 38,
          paddingHorizontal: dran.gesamt > 0 ? 8 : 0,
          borderRadius: 19,
          backgroundColor: farben.orange,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {dran.gesamt > 0 ? (
          <Text style={{ ...schrift.textFett, fontSize: 15, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{dran.gesamt > 99 ? "99+" : dran.gesamt}</Text>
        ) : (
          <Icon name="albums" size={18} color="#FFFFFF" weight="semibold" />
        )}
      </View>
    </Pressable>
  );
}
