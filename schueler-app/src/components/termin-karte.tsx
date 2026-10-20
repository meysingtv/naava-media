import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { terminAbsagen, terminZusagen } from "@/lib/daten";
import { typFarbe, typLabel } from "@/lib/constants";
import { datumTeile, endUhrzeit, formatDatumLang, formatUhrzeit } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import { karte, radius, space } from "@/lib/theme";
import type { Fahrstunde } from "@/lib/types";

/** Farbiger Datums-Block: Wochentag, Tag, Monat. */
export function DatumBlock({ iso, farbe, blass }: { iso: string; farbe: string; blass?: boolean }) {
  const t = datumTeile(iso);
  return (
    <View
      style={{
        width: 58,
        paddingVertical: space(2),
        borderRadius: radius.lg,
        alignItems: "center",
        backgroundColor: blass ? "rgba(100,116,139,0.12)" : farbe + "1A",
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "700", color: blass ? "#64748B" : farbe, textTransform: "uppercase" }}>{t.wochentag}</Text>
      <Text style={{ fontSize: 24, fontWeight: "800", color: blass ? "#64748B" : farbe, lineHeight: 28 }}>{t.tag}</Text>
      <Text style={{ fontSize: 11, fontWeight: "600", color: blass ? "#64748B" : farbe }}>{t.monat}</Text>
    </View>
  );
}

/**
 * Eine Fahrstunde des Schülers: Datums-Block in der Farbe der Art, Uhrzeit,
 * Fahrlehrer und Stand. Anstehende Stunden lassen sich zusagen oder absagen.
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
  const ausgefallen = stunde.status === "ausgefallen";
  const gefahren = stunde.status === "abgeschlossen";
  const farbe = typFarbe(stunde.typ);
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

  const stand = ausgefallen
    ? { text: "Abgesagt", farbe: colors.textMuted, icon: "close-circle" as const }
    : gefahren
      ? { text: "Gefahren", farbe: colors.success, icon: "checkmark-done-circle" as const }
      : zugesagt
        ? { text: "Zugesagt", farbe: colors.success, icon: "checkmark-circle" as const }
        : null;

  return (
    <View style={[karte(colors), { padding: space(3.5), gap: space(3) }]}>
      <View style={{ flexDirection: "row", gap: space(3.5), alignItems: "center" }}>
        <DatumBlock iso={stunde.datum} farbe={farbe} blass={ausgefallen} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space(2) }}>
            <View style={{ backgroundColor: (ausgefallen ? colors.textMuted : farbe) + "1A", paddingHorizontal: space(2), paddingVertical: 3, borderRadius: radius.full }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: ausgefallen ? colors.textMuted : farbe }}>{typLabel(stunde.typ)}</Text>
            </View>
            {stand ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Ionicons name={stand.icon} size={14} color={stand.farbe} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: stand.farbe }}>{stand.text}</Text>
              </View>
            ) : null}
          </View>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: ausgefallen ? colors.textMuted : colors.text,
              textDecorationLine: ausgefallen ? "line-through" : "none",
            }}
          >
            {formatUhrzeit(stunde.uhrzeit)} – {endUhrzeit(stunde.uhrzeit, stunde.dauer_minuten)} Uhr
          </Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }} numberOfLines={1}>
            {stunde.dauer_minuten} Min.{lehrer ? ` · mit ${lehrer}` : ""}
          </Text>
        </View>
      </View>

      {aktionen && stunde.status === "geplant" && stunde.bestaetigung_token ? (
        <View style={{ flexDirection: "row", gap: space(2) }}>
          {!zugesagt ? (
            <Pressable
              onPress={zusagen}
              disabled={arbeitet != null}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: "row",
                gap: space(1.5),
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: space(3),
                borderRadius: radius.md,
                backgroundColor: colors.accent,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              {arbeitet === "zu" ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={colors.onAccent} />
                  <Text style={{ color: colors.onAccent, fontSize: 15, fontWeight: "700" }}>Zusagen</Text>
                </>
              )}
            </Pressable>
          ) : null}
          <Pressable
            onPress={absagen}
            disabled={arbeitet != null}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: space(3),
              borderRadius: radius.md,
              backgroundColor: colors.danger + (pressed ? "2E" : "17"),
            })}
          >
            {arbeitet === "ab" ? (
              <ActivityIndicator color={colors.danger} />
            ) : (
              <Text style={{ color: colors.danger, fontSize: 15, fontWeight: "700" }}>Absagen</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
