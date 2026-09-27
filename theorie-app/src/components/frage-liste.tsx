import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { Kontrollleuchte } from "@/components/leuchten";
import { Verkehrszeichen } from "@/components/zeichen";
import { istZeichen, themaVon, type Frage, type LeuchteKey, type ZeichenKey } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { farben, schrift } from "@/lib/theme";

/** Eine Frage als Listenzeile – öffnet das Training im Thema, beginnend mit dieser Frage. */
export function FrageZeile({ frage, rechts }: { frage: Frage; rechts?: ReactNode }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        router.push({ pathname: "/training", params: { modus: "thema", thema: frage.thema, start: frage.id } });
      }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
        borderRadius: 16,
        backgroundColor: pressed ? farben.flaeche2 : farben.flaeche,
        borderWidth: 1,
        borderColor: farben.linie,
      })}
    >
      {frage.bild && istZeichen(frage.bild) ? (
        <Verkehrszeichen zeichen={frage.bild as ZeichenKey} groesse={34} />
      ) : frage.bild?.startsWith("leuchte_") ? (
        <Kontrollleuchte leuchte={frage.bild as LeuchteKey} groesse={34} />
      ) : (
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: farben.flaeche2, alignItems: "center", justifyContent: "center" }}>
          <Icon name={frage.bild ? "map-outline" : "help"} size={17} color={farben.text3} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={2} style={{ ...schrift.textHalb, fontSize: 14.5, lineHeight: 20, color: farben.text }}>
          {frage.text}
        </Text>
        <Text style={{ ...schrift.textMittel, fontSize: 12, color: farben.text3 }}>
          {themaVon(frage.thema).titel} · {frage.punkte} Punkte
        </Text>
      </View>
      {rechts ?? <Icon name="chevron-forward" size={17} color={farben.text4} />}
    </Pressable>
  );
}

/** Leerer Zustand mit Symbol, Titel und Text. */
export function LeerHinweis({ icon, titel, text }: { icon: IconName; titel: string; text: string }) {
  return (
    <View style={{ alignItems: "center", gap: 12, paddingVertical: 48, paddingHorizontal: 24 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: farben.orangeSoft, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={28} color={farben.orange} />
      </View>
      <Text style={{ ...schrift.titelFett, fontSize: 17, color: farben.text, textAlign: "center" }}>{titel}</Text>
      <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 21, color: farben.text2, textAlign: "center" }}>{text}</Text>
    </View>
  );
}
