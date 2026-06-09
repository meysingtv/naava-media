import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Row } from "@/components/ui";
import { TYP_LABEL } from "@/lib/constants";
import { formatUhrzeit } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme-context";
import type { FahrstundeMitRelationen, FahrstundeStatus } from "@/lib/types";

async function statusSetzen(id: string, status: FahrstundeStatus) {
  await supabase.from("fahrstunde").update({ status }).eq("id", id);
}

export function FahrstundeRow({
  stunde,
  onPress,
  quickAbzeichnen,
}: {
  stunde: FahrstundeMitRelationen;
  onPress?: () => void;
  /** Wenn true, zeigt rechts einen Schnell-Abzeichnen-Button (Häkchen). */
  quickAbzeichnen?: boolean;
}) {
  const { colors } = useTheme();
  const schueler = stunde.fahrschueler;
  const ausgefallen = stunde.status === "ausgefallen";
  const abgeschlossen = stunde.status === "abgeschlossen";
  const meta = [
    TYP_LABEL[stunde.typ],
    stunde.fahrlehrer ? `${stunde.fahrlehrer.vorname} ${stunde.fahrlehrer.nachname}` : null,
    stunde.fahrzeug?.kennzeichen,
  ]
    .filter(Boolean)
    .join(" · ");

  const trailing = quickAbzeichnen ? (
    <Pressable
      hitSlop={8}
      onPress={(e) => {
        e.stopPropagation?.();
        statusSetzen(stunde.id, abgeschlossen ? "geplant" : "abgeschlossen");
      }}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: abgeschlossen ? colors.success : colors.fill,
      }}
    >
      <Ionicons
        name={abgeschlossen ? "checkmark" : "checkmark-outline"}
        size={20}
        color={abgeschlossen ? colors.onAccent : colors.textMuted}
      />
    </Pressable>
  ) : abgeschlossen ? (
    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
  ) : undefined;

  return (
    <Row
      onPress={onPress}
      chevron={Boolean(onPress) && !quickAbzeichnen}
      leading={
        <View style={{ width: 60, alignItems: "center" }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 16, fontWeight: "600", color: ausgefallen ? colors.textMuted : colors.text }}
          >
            {formatUhrzeit(stunde.uhrzeit)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{stunde.dauer_minuten} Min</Text>
        </View>
      }
      trailing={trailing}
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
