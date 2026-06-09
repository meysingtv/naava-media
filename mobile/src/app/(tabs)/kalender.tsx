import { useMemo } from "react";
import { RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";

import { FahrstundeCard } from "@/components/fahrstunde-card";
import { CenterInfo } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { formatDatumLang, heuteISO, plusTageISO } from "@/lib/format";
import { colors, space } from "@/lib/theme";
import { FAHRSTUNDE_SELECT, type FahrstundeMitRelationen } from "@/lib/types";

const TAGE_VORAUS = 21;

export default function KalenderScreen() {
  const von = useMemo(() => heuteISO(), []);
  const bis = useMemo(() => plusTageISO(von, TAGE_VORAUS), [von]);

  const { data, loading, refreshing, error, refresh } = useLoader<FahrstundeMitRelationen[]>(() =>
    supabase
      .from("fahrstunde")
      .select(FAHRSTUNDE_SELECT)
      .gte("datum", von)
      .lte("datum", bis)
      .order("datum", { ascending: true })
      .order("uhrzeit", { ascending: true })
      .returns<FahrstundeMitRelationen[]>(),
  );

  const sections = useMemo(() => {
    const map = new Map<string, FahrstundeMitRelationen[]>();
    for (const s of data ?? []) {
      const liste = map.get(s.datum) ?? [];
      liste.push(s);
      map.set(s.datum, liste);
    }
    return Array.from(map, ([datum, stunden]) => ({ datum, data: stunden }));
  }, [data]);

  if (loading) return <CenterInfo loading />;
  if (error) return <CenterInfo text={error} error />;

  return (
    <SectionList
      style={styles.screen}
      sections={sections}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => <FahrstundeCard stunde={item} />}
      renderSectionHeader={({ section }) => {
        const heute = section.datum === von;
        const morgen = section.datum === plusTageISO(von, 1);
        const prefix = heute ? "Heute · " : morgen ? "Morgen · " : "";
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {prefix}
              {formatDatumLang(section.datum)}
            </Text>
          </View>
        );
      }}
      contentContainerStyle={[styles.list, sections.length === 0 && styles.empty]}
      ItemSeparatorComponent={() => <View style={{ height: space(2.5) }} />}
      SectionSeparatorComponent={() => <View style={{ height: space(2) }} />}
      ListEmptyComponent={<CenterInfo text="Keine Fahrstunden in den nächsten Wochen." />}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: space(4) },
  empty: { flexGrow: 1 },
  sectionHeader: { paddingTop: space(2), paddingBottom: space(2) },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
});
