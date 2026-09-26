import { useState } from "react";
import { View } from "react-native";

import type { BildKey, LageKey, LeuchteKey, ZeichenKey } from "@/lib/fragen";
import { farben, radius } from "@/lib/theme";
import { Lageplan } from "./lagen";
import { Kontrollleuchte } from "./leuchten";
import { Verkehrszeichen } from "./zeichen";

/** Bild zu einer Frage: Verkehrszeichen auf ruhiger Fläche oder Lageplan in voller Breite. */
export function FrageBild({ bild, kompakt }: { bild: BildKey; kompakt?: boolean }) {
  const [breite, setBreite] = useState(0);
  const istLage = bild.startsWith("lage_");
  const istLeuchte = bild.startsWith("leuchte_");

  return (
    <View
      onLayout={(e) => setBreite(e.nativeEvent.layout.width)}
      style={{
        borderRadius: radius.l,
        overflow: "hidden",
        backgroundColor: istLage ? farben.gelaende : istLeuchte ? "#05080F" : farben.flaeche,
        borderWidth: 1,
        borderColor: farben.linie,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: istLage ? 0 : kompakt ? 14 : 22,
      }}
    >
      {istLage ? (
        breite > 0 ? <Lageplan lage={bild as LageKey} breite={breite} /> : <View style={{ height: 200 }} />
      ) : istLeuchte ? (
        <Kontrollleuchte leuchte={bild as LeuchteKey} groesse={kompakt ? 90 : 124} />
      ) : (
        <Verkehrszeichen zeichen={bild as ZeichenKey} groesse={kompakt ? 96 : 132} />
      )}
    </View>
  );
}
