import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import { TYP_LABEL } from "@/lib/constants";
import { endUhrzeit, formatUhrzeit } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";
import type { FahrstundeMitRelationen, FahrstundeTyp } from "@/lib/types";

// Farbe = Art der Fahrt.
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
  const typFarbe = ausgefallen ? colors.textMuted : TYP_FARBE[stunde.typ];
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
      {/* Farbiger Zeit-Block links */}
      <View
        style={{
          width: 86,
          paddingVertical: space(4),
          paddingHorizontal: space(2),
          backgroundColor: typFarbe,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "800" }}>{formatUhrzeit(stunde.uhrzeit)}</Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 }}>
          bis {endUhrzeit(stunde.uhrzeit, stunde.dauer_minuten)}
        </Text>
      </View>

      {/* Inhalt rechts */}
      <View style={{ flex: 1, padding: space(4), gap: space(1.5), justifyContent: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: typFarbe, letterSpacing: 0.4 }}>
            {TYP_LABEL[stunde.typ].toUpperCase()}
          </Text>
          {abgeschlossen ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.success }}>Gefahren</Text>
            </View>
          ) : ausgefallen ? (
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted }}>Ausgefallen</Text>
          ) : null}
        </View>

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

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space(2) }}>
          <Text numberOfLines={1} style={{ fontSize: 13, color: colors.textMuted, flex: 1 }}>
            {meta || `${stunde.dauer_minuten} Min`}
          </Text>

          {/* Schnell-Abzeichnen */}
          {!ausgefallen ? (
            <Pressable
              onPress={toggle}
              hitSlop={8}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: abgeschlossen ? colors.success : "transparent",
                borderWidth: abgeschlossen ? 0 : 1.5,
                borderColor: colors.separator,
              }}
            >
              <Ionicons name="checkmark" size={18} color={abgeschlossen ? "#FFFFFF" : colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
