import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Badge, Row, Screen, ScreenHeader, Section } from "@/components/ui";
import { ladeRechnungen } from "@/lib/daten";
import { formatDatum, formatEuro } from "@/lib/format";
import { useLoader } from "@/lib/use-loader";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";
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

  return (
    <Screen>
      <ScreenHeader title="Rechnungen" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(10) }}
        refreshControl={<RefreshControl refreshing={rechnungen.refreshing} onRefresh={rechnungen.refresh} tintColor={colors.accent} />}
      >
        <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: space(5), marginBottom: space(6), gap: 2 }}>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>Noch zu bezahlen</Text>
          <Text style={{ fontSize: 32, fontWeight: "700", color: summeOffen > 0 ? colors.text : colors.success }}>{formatEuro(summeOffen)}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            {offen.length === 0 ? "Alles bezahlt – danke!" : `${offen.length} ${offen.length === 1 ? "offene Rechnung" : "offene Rechnungen"}`}
          </Text>
        </View>

        <Section title="Alle Rechnungen">
          {liste.length === 0 ? (
            <Row title={rechnungen.loading ? "Lädt …" : "Noch keine Rechnungen"} />
          ) : (
            liste.map((r) => (
              <Row
                key={r.id}
                title={`${r.nummer} · ${formatEuro(r.betrag_brutto)}`}
                subtitle={`vom ${formatDatum(r.rechnungsdatum)}${r.status !== "bezahlt" && r.faelligkeitsdatum ? ` · fällig ${formatDatum(r.faelligkeitsdatum)}` : ""}`}
                trailing={<Badge label={RECHNUNG_STATUS[r.status].label} tone={RECHNUNG_STATUS[r.status].tone} />}
                chevron
                onPress={() => router.push({ pathname: "/rechnung/[id]", params: { id: r.id } })}
              />
            ))
          )}
        </Section>
      </ScrollView>
    </Screen>
  );
}
