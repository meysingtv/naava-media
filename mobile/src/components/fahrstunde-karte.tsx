import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import { TYP_LABEL } from "@/lib/constants";
import { endUhrzeit, formatUhrzeit } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";
import type { FahrstundeMitRelationen, FahrstundeTyp } from "@/lib/types";

// Farbe markiert die ART der Fahrt (als schmaler Balken links + Punkt).
const TYP_FARBE: Record<FahrstundeTyp, string> = {
  normal: "#2563EB",
  ueberland: "#16A34A",
  autobahn: "#EA580C",
  nacht: "#4F46E5",
  pruefung: "#DC2626",
};

export function FahrstundeKarte({ stunde, onPress }: { stunde: FahrstundeMitRelationen; onPress?: () => void }) {
  const { colors } = useTheme();
  const abgeschlossen = stunde.status === "abgeschlossen";
  const ausgefallen = stunde.status === "ausgefallen";
  const typFarbe = TYP_FARBE[stunde.typ];
  const schueler = stunde.fahrschueler;
  const name = schueler ? `${schueler.vorname} ${schueler.nachname}` : "Ohne Schüler";
  const meta = [
    stunde.fahrlehrer ? `${stunde.fahrlehrer.vorname} ${stunde.fahrlehrer.nachname}` : null,
    stunde.fahrzeug?.kennzeichen,
  ]
    .filter(Boolean)
    .join(" · ");

  async function toggle() {
    await supabase
      .from("fahrstunde")
      .update({ status: abgeschlossen ? "geplant" : "abgeschlossen" })
      .eq("id", stunde.id);
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        overflow: "hidden",
        opacity: pressed ? 0.92 : 1,
      })}
    >
      {/* Farbiger Balken links = Art */}
      <View style={{ width: 6, backgroundColor: ausgefallen ? colors.textMuted : typFarbe }} />

      <View style={{ flex: 1, padding: space(4), gap: space(2) }}>
        {/* Kopfzeile: Uhrzeit + Status */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
            {formatUhrzeit(stunde.uhrzeit)} – {endUhrzeit(stunde.uhrzeit, stunde.dauer_minuten)}
          </Text>
          {abgeschlossen ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: colors.success + "22",
                paddingHorizontal: space(2),
                paddingVertical: 3,
                borderRadius: radius.sm,
              }}
            >
              <Ionicons name="checkmark" size={12} color={colors.success} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.success }}>Gefahren</Text>
            </View>
          ) : ausgefallen ? (
            <View
              style={{
                backgroundColor: colors.textMuted + "22",
                paddingHorizontal: space(2),
                paddingVertical: 3,
                borderRadius: radius.sm,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted }}>Ausgefallen</Text>
            </View>
          ) : null}
        </View>

        {/* Name */}
        <Text
          numberOfLines={1}
          style={{
            color: ausgefallen ? colors.textMuted : colors.text,
            fontSize: 17,
            fontWeight: "700",
            textDecorationLine: ausgefallen ? "line-through" : "none",
          }}
        >
          {name}
        </Text>

        {/* Art + Lehrer/Fahrzeug */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space(2) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: typFarbe }} />
            <Text numberOfLines={1} style={{ fontSize: 13, color: colors.textMuted, flex: 1 }}>
              {TYP_LABEL[stunde.typ]}
              {meta ? ` · ${meta}` : ""}
            </Text>
          </View>

          {/* Schnell-Abzeichnen-Button */}
          <Pressable
            onPress={toggle}
            hitSlop={8}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: abgeschlossen ? colors.success : "transparent",
              borderWidth: abgeschlossen ? 0 : 1.5,
              borderColor: colors.separator,
            }}
          >
            <Ionicons name="checkmark" size={20} color={abgeschlossen ? "#FFFFFF" : colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
