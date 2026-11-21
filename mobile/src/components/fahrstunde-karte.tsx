import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import { TYP_LABEL } from "@/lib/constants";
import { endUhrzeit, formatUhrzeit } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";
import type { FahrstundeMitRelationen, FahrstundeTyp } from "@/lib/types";

// Farbpalette bewusst anders als typische Fahrschul-Apps (kein Blau/Orange-
// Schema). Tiefere, harmonische Töne.
const TYP_FARBE: Record<FahrstundeTyp, string> = {
  normal: "#0F766E", // Teal
  ueberland: "#15803D", // Tannengrün
  autobahn: "#B45309", // Amber
  nacht: "#1E1B4B", // Mitternachts-Indigo
  pruefung: "#9333EA", // Violett
};

const AUSGEFALLEN = "#475569";

export function FahrstundeKarte({ stunde, onPress }: { stunde: FahrstundeMitRelationen; onPress?: () => void }) {
  const { colors } = useTheme();
  const abgeschlossen = stunde.status === "abgeschlossen";
  const ausgefallen = stunde.status === "ausgefallen";
  const farbe = ausgefallen ? AUSGEFALLEN : TYP_FARBE[stunde.typ];
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
        backgroundColor: farbe,
        borderRadius: radius.md,
        padding: space(4),
        gap: space(2),
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
          {formatUhrzeit(stunde.uhrzeit)} – {endUhrzeit(stunde.uhrzeit, stunde.dauer_minuten)}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: space(2) }}>
          {abgeschlossen ? (
            <View style={{ backgroundColor: "#FFFFFF", paddingHorizontal: space(2), paddingVertical: 3, borderRadius: radius.sm }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: farbe }}>Gefahren</Text>
            </View>
          ) : ausgefallen ? (
            <View style={{ backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: space(2), paddingVertical: 3, borderRadius: radius.sm }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#FFFFFF" }}>Ausgefallen</Text>
            </View>
          ) : null}

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
                backgroundColor: abgeschlossen ? "#FFFFFF" : "rgba(255,255,255,0.22)",
              }}
            >
              <Ionicons name="checkmark" size={19} color={abgeschlossen ? farbe : "#FFFFFF"} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text
        numberOfLines={1}
        style={{ color: "#FFFFFF", fontSize: 19, fontWeight: "800", textDecorationLine: ausgefallen ? "line-through" : "none" }}
      >
        {name}
      </Text>

      <Text numberOfLines={1} style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "500" }}>
        {TYP_LABEL[stunde.typ]}
        {meta ? ` · ${meta}` : ""}
      </Text>
    </Pressable>
  );
}
