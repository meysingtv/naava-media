import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Row } from "@/components/ui";
import { TYP_LABEL } from "@/lib/constants";
import { formatUhrzeit } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import type { FahrstundeMitRelationen } from "@/lib/types";

export function FahrstundeRow({ stunde, onPress }: { stunde: FahrstundeMitRelationen; onPress?: () => void }) {
  const { colors } = useTheme();
  const schueler = stunde.fahrschueler;
  const ausgefallen = stunde.status === "ausgefallen";
  const meta = [
    TYP_LABEL[stunde.typ],
    stunde.fahrlehrer ? `${stunde.fahrlehrer.vorname} ${stunde.fahrlehrer.nachname}` : null,
    stunde.fahrzeug?.kennzeichen,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Row
      onPress={onPress}
      chevron={Boolean(onPress)}
      leading={
        <View style={{ width: 50, alignItems: "center" }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: ausgefallen ? colors.textMuted : colors.text }}>
            {formatUhrzeit(stunde.uhrzeit)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{stunde.dauer_minuten}m</Text>
        </View>
      }
      trailing={
        stunde.status === "abgeschlossen" ? <Ionicons name="checkmark-circle" size={18} color={colors.success} /> : undefined
      }
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 16,
            fontWeight: "500",
            color: colors.text,
            textDecorationLine: ausgefallen ? "line-through" : "none",
          }}
        >
          {schueler ? `${schueler.vorname} ${schueler.nachname}` : "Ohne Schüler"}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 13, color: colors.textMuted }}>
          {meta}
        </Text>
      </View>
    </Row>
  );
}
