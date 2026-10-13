import { View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { Verkehrszeichen } from "@/components/zeichen";
import { useFarbwelt } from "@/lib/darstellung";
import { themaVon, type ThemaId } from "@/lib/fragen";
import type { StapelId } from "@/lib/karteikarten";
import { farben, mitDeckkraft } from "@/lib/theme";

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
  const f = useFarbwelt();
  const rund = groesse * 0.3;
  if (id === "zeichen") {
    return (
      <View style={{ width: groesse, height: groesse, borderRadius: rund, backgroundColor: f.hell ? "#F1EDE6" : farben.iconKreis, alignItems: "center", justifyContent: "center" }}>
        <Verkehrszeichen zeichen="z205" groesse={groesse * 0.66} />
      </View>
    );
  }
  const icon: IconName = id === "eigen" ? "create-outline" : (themaVon(id.slice(2) as ThemaId).icon as IconName);
  const farbe = id === "eigen" ? f.orange : farben.blau;
  return (
    <View style={{ width: groesse, height: groesse, borderRadius: rund, backgroundColor: mitDeckkraft(farbe, f.hell ? 0.12 : 0.15), alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={groesse * 0.46} color={farbe} />
    </View>
  );
}
