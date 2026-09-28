import { Pressable, Text, View, useWindowDimensions } from "react-native";
import type { SFSymbol } from "expo-symbols";

import { Icon, type IconName } from "@/components/icon";
import { getoent } from "@/components/ui";
import { tippen } from "@/lib/haptik";
import { farben, schrift } from "@/lib/theme";

// Die vier Kacheln unter „Lernen starten“: ruhige Karten mit einem Symbol
// in getöntem Quadrat – ohne Glas und Verläufe.

const HOEHE = 94;
const ABSTAND = 10;
const RAND = 16;

type KachelId = "themen" | "pruefung" | "statistik" | "favoriten";

const SYMBOLE: Record<KachelId, { icon: IconName; sf: SFSymbol; farbe: () => string }> = {
  themen: { icon: "book", sf: "book.fill", farbe: () => farben.orange },
  pruefung: { icon: "checkmark-circle", sf: "checkmark.seal.fill", farbe: () => farben.rot },
  statistik: { icon: "stats-chart", sf: "chart.bar.fill", farbe: () => farben.blau },
  favoriten: { icon: "heart", sf: "heart.fill", farbe: () => farben.pink },
};

function Kachel({ id, titel, breite, onPress }: { id: KachelId; titel: string; breite: number; onPress: () => void }) {
  const s = SYMBOLE[id];
  const farbe = s.farbe();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={titel}
      style={({ pressed }) => ({
        width: breite,
        height: HOEHE,
        borderRadius: 16,
        backgroundColor: pressed ? farben.flaeche2 : farben.flaeche,
        borderWidth: 1,
        borderColor: farben.linie,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: getoent(farbe, 0.14), alignItems: "center", justifyContent: "center" }}>
        <Icon name={s.icon} sf={s.sf} size={21} color={farbe} />
      </View>
      <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: farben.text }} numberOfLines={1}>
        {titel}
      </Text>
    </Pressable>
  );
}

export type Schnellziel = { id: KachelId; titel: string; onPress: () => void };

/** Reihe mit den vier Kacheln Themen, Prüfung, Statistiken, Favoriten. */
export function Schnellzugriff({ ziele, style }: { ziele: Schnellziel[]; style?: object }) {
  const { width } = useWindowDimensions();
  const breite = Math.floor(((width - 2 * RAND - (ziele.length - 1) * ABSTAND) / ziele.length) * 2) / 2;
  return (
    <View style={[{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: RAND }, style]}>
      {ziele.map((z) => (
        <Kachel key={z.id} id={z.id} titel={z.titel} breite={breite} onPress={z.onPress} />
      ))}
    </View>
  );
}
