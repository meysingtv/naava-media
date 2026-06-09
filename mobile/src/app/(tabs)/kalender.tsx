import { useMemo } from "react";
import { RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { FahrstundeCard } from "@/components/fahrstunde-card";
import { Banner, CenterInfo } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { formatDatumLang, heuteISO, plusTageISO } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import { space, type ThemeColors } from "@/lib/theme";
import { FAHRSTUNDE_SELECT, type FahrstundeMitRelationen } from "@/lib/types";

const TAGE_VORAUS = 28;

export default function KalenderScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const von = useMemo(() => heuteISO(), []);
  const bis = useMemo(() => plusTageISO(von, TAGE_VORAUS), [von]);

  const { data, loading, refreshing, error, offline, refresh } = useLoader<FahrstundeMitRelationen[]>(
    () =>
      supabase
        .from("fahrstunde")
        .select(FAHRSTUNDE_SELECT)
        .gte("datum", von)
        .lte("datum", bis)
        .order("datum", { ascending: true })
        .order("uhrzeit", { ascending: true })
        .returns<FahrstundeMitRelationen[]>(),
    { cacheKey: `kalender-${von}` },
  );

  const sections = useMemo(() => {
    const map = new Map<string, FahrstundeMitRelationen[]>();
    for (const stunde of data ?? []) {
      const liste = map.get(stunde.datum) ?? [];
      liste.push(stunde);
      map.set(stunde.datum, liste);
    }
    return Array.from(map, ([datum, stunden]) => ({ datum, data: stunden }));
  }, [data]);

  if (loading) return <CenterInfo loading />;
  if (error) return <CenterInfo text={error} error />;

  return (
    <View style={s.screen}>
      {offline ? <Banner text="Offline – zuletzt geladene Daten" /> : null}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FahrstundeCard stunde={item} onPress={() => router.push(`/fahrstunde/${item.id}`)} />
        )}
        renderSectionHeader={({ section }) => {
          const prefix =
            section.datum === von ? "Heute · " : section.datum === plusTageISO(von, 1) ? "Morgen · " : "";
          return (
            <Text style={s.sectionTitle}>
              {prefix}
              {formatDatumLang(section.datum)}
            </Text>
          );
        }}
        contentContainerStyle={[s.list, sections.length === 0 && s.empty]}
        ItemSeparatorComponent={() => <View style={{ height: space(2.5) }} />}
        SectionSeparatorComponent={() => <View style={{ height: space(2) }} />}
        ListEmptyComponent={<CenterInfo text="Keine Fahrstunden in den nächsten Wochen." />}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    list: { padding: space(4) },
    empty: { flexGrow: 1 },
    sectionTitle: { fontSize: 15, fontWeight: "800", color: c.text },
  });
