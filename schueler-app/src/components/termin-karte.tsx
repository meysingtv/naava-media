import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { terminAbsagen, terminZusagen } from "@/lib/daten";
import { typFarbe, typLabel } from "@/lib/constants";
import { endUhrzeit, formatDatumLang, formatUhrzeit } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";
import type { Fahrstunde } from "@/lib/types";

/**
 * Eine Fahrstunde des Schülers: Farbe nach Art, Datum, Uhrzeit, Fahrlehrer.
 * Anstehende Stunden lassen sich zusagen oder absagen.
 */
export function TerminKarte({
  stunde,
  lehrer,
  aktionen,
  beiAenderung,
}: {
  stunde: Fahrstunde;
  lehrer?: string;
  aktionen?: boolean;
  beiAenderung?: () => void;
}) {
  const { colors } = useTheme();
  const [arbeitet, setArbeitet] = useState<"zu" | "ab" | null>(null);
  const farbe = stunde.status === "ausgefallen" ? colors.textMuted : typFarbe(stunde.typ);
  const zugesagt = Boolean(stunde.bestaetigt_am);

  async function zusagen() {
    if (!stunde.bestaetigung_token) return;
    setArbeitet("zu");
    const fehler = await terminZusagen(stunde.bestaetigung_token);
    setArbeitet(null);
    if (fehler) Alert.alert("Nicht möglich", fehler);
    else beiAenderung?.();
  }

  function absagen() {
    if (!stunde.bestaetigung_token) return;
    Alert.alert(
      "Termin absagen?",
      `${formatDatumLang(stunde.datum)}, ${formatUhrzeit(stunde.uhrzeit)} Uhr. Deine Fahrschule sieht die Absage sofort.`,
      [
        { text: "Behalten", style: "cancel" },
        {
          text: "Absagen",
          style: "destructive",
          onPress: async () => {
            setArbeitet("ab");
            const fehler = await terminAbsagen(stunde.bestaetigung_token!);
            setArbeitet(null);
            if (fehler) Alert.alert("Nicht möglich", fehler);
            else beiAenderung?.();
          },
        },
      ],
    );
  }

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, overflow: "hidden", flexDirection: "row" }}>
      <View style={{ width: 5, backgroundColor: farbe }} />
      <View style={{ flex: 1, padding: space(4), gap: space(1) }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space(2) }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: farbe, textTransform: "uppercase", letterSpacing: 0.4 }}>
            {typLabel(stunde.typ)}
          </Text>
          {stunde.status === "abgeschlossen" ? (
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.success }}>Gefahren</Text>
          ) : stunde.status === "ausgefallen" ? (
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted }}>Ausgefallen</Text>
          ) : zugesagt ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="checkmark-circle" size={15} color={colors.success} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.success }}>Zugesagt</Text>
            </View>
          ) : null}
        </View>
        <Text
          style={{
            fontSize: 17,
            fontWeight: "600",
            color: colors.text,
            textDecorationLine: stunde.status === "ausgefallen" ? "line-through" : "none",
          }}
        >
          {formatDatumLang(stunde.datum)}
        </Text>
        <Text style={{ fontSize: 15, color: colors.textMuted }}>
          {formatUhrzeit(stunde.uhrzeit)} – {endUhrzeit(stunde.uhrzeit, stunde.dauer_minuten)} Uhr · {stunde.dauer_minuten} Min.
          {lehrer ? ` · ${lehrer}` : ""}
        </Text>

        {aktionen && stunde.status === "geplant" && stunde.bestaetigung_token ? (
          <View style={{ flexDirection: "row", gap: space(2), marginTop: space(2) }}>
            {!zugesagt ? (
              <Pressable
                onPress={zusagen}
                disabled={arbeitet != null}
                style={({ pressed }) => ({
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: space(2.5),
                  borderRadius: radius.md,
                  backgroundColor: pressed ? colors.accent + "CC" : colors.accent,
                })}
              >
                {arbeitet === "zu" ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text style={{ color: colors.onAccent, fontSize: 15, fontWeight: "600" }}>Zusagen</Text>
                )}
              </Pressable>
            ) : null}
            <Pressable
              onPress={absagen}
              disabled={arbeitet != null}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: "center",
                paddingVertical: space(2.5),
                borderRadius: radius.md,
                backgroundColor: pressed ? colors.danger + "30" : colors.danger + "1A",
              })}
            >
              {arbeitet === "ab" ? (
                <ActivityIndicator color={colors.danger} />
              ) : (
                <Text style={{ color: colors.danger, fontSize: 15, fontWeight: "600" }}>Absagen</Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
