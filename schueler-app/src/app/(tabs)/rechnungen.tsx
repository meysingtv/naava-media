import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Badge, IconKachel, Screen, Ueberschrift } from "@/components/ui";
import { GradientKopf } from "@/components/kopf";
import { ladeRechnungen } from "@/lib/daten";
import { formatDatum, formatEuro } from "@/lib/format";
import { useLoader } from "@/lib/use-loader";
import { useTheme } from "@/lib/theme-context";
import { karte, space } from "@/lib/theme";
import type { Rechnung } from "@/lib/types";

const RECHNUNG_STATUS: Record<Rechnung["status"], { label: string; tone: "warning" | "success" | "danger" }> = {
  offen: { label: "Offen", tone: "warning" },
  bezahlt: { label: "Bezahlt", tone: "success" },
  ueberfaellig: { label: "Überfällig", tone: "danger" },
};

export default function RechnungenScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const rechnungen = useLoader(ladeRechnungen, { cacheKey: "s-rechnungen" });
  const liste = rechnungen.data ?? [];
  const offen = liste.filter((r) => r.status !== "bezahlt");
  const summeOffen = offen.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const summeBezahlt = liste.filter((r) => r.status === "bezahlt").reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space(10) }}
        refreshControl={<RefreshControl refreshing={rechnungen.refreshing} onRefresh={rechnungen.refresh} tintColor={colors.accent} />}
      >
        <GradientKopf titel="Rechnungen" untertitel="Alles rund ums Bezahlen" unten={space(16)} />

        <View style={{ paddingHorizontal: space(4), marginTop: -space(11), gap: space(6) }}>
          <View style={[karte(colors), { padding: space(5), gap: space(4) }]}>
            <View>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>Noch zu bezahlen</Text>
              <Text style={{ fontSize: 34, fontWeight: "800", color: summeOffen > 0 ? colors.text : colors.success, marginTop: 2 }}>
                {formatEuro(summeOffen)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: space(3) }}>
              <View style={{ flex: 1, backgroundColor: colors.warning + "17", borderRadius: 14, padding: space(3) }}>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>Offene Rechnungen</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{offen.length}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.success + "14", borderRadius: 14, padding: space(3) }}>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>Schon bezahlt</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{formatEuro(summeBezahlt)}</Text>
              </View>
            </View>
          </View>

          <View>
            <Ueberschrift>Alle Rechnungen</Ueberschrift>
            {liste.length === 0 ? (
              <View style={[karte(colors), { padding: space(6), alignItems: "center", gap: space(3) }]}>
                <IconKachel name="receipt-outline" farbe={colors.accent} groesse={52} />
                <Text style={{ fontSize: 15, color: colors.textMuted }}>{rechnungen.loading ? "Lädt …" : "Noch keine Rechnungen."}</Text>
              </View>
            ) : (
              <View style={{ gap: space(3) }}>
                {liste.map((r) => {
                  const st = RECHNUNG_STATUS[r.status];
                  const farbe = st.tone === "success" ? colors.success : st.tone === "danger" ? colors.danger : colors.warning;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => router.push({ pathname: "/rechnung/[id]", params: { id: r.id } })}
                      style={({ pressed }) => [
                        karte(colors),
                        { flexDirection: "row", alignItems: "center", gap: space(3.5), padding: space(4), transform: [{ scale: pressed ? 0.98 : 1 }] },
                      ]}
                    >
                      <IconKachel name="receipt" farbe={farbe} groesse={44} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{r.nummer}</Text>
                        <Text style={{ fontSize: 13, color: r.status === "ueberfaellig" ? colors.danger : colors.textMuted }} numberOfLines={1}>
                          {r.status === "bezahlt"
                            ? r.bezahlt_am
                              ? `bezahlt am ${formatDatum(r.bezahlt_am)}`
                              : `vom ${formatDatum(r.rechnungsdatum)}`
                            : r.faelligkeitsdatum
                              ? `fällig am ${formatDatum(r.faelligkeitsdatum)}`
                              : `vom ${formatDatum(r.rechnungsdatum)}`}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>{formatEuro(r.betrag_brutto)}</Text>
                        <Badge label={st.label} tone={st.tone} />
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
