import { useMemo } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

import { FahrstundeCard } from "@/components/fahrstunde-card";
import { CenterInfo } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { formatDatumLang, heuteISO } from "@/lib/format";
import { colors, space } from "@/lib/theme";
import { FAHRSTUNDE_SELECT, type FahrstundeMitRelationen } from "@/lib/types";

export default function HeuteScreen() {
  const heute = useMemo(() => heuteISO(), []);
  const { data, loading, refreshing, error, refresh } = useLoader<FahrstundeMitRelationen[]>(() =>
    supabase
      .from("fahrstunde")
      .select(FAHRSTUNDE_SELECT)
      .eq("datum", heute)
      .order("uhrzeit", { ascending: true })
      .returns<FahrstundeMitRelationen[]>(),
  );

  const stunden = data ?? [];

  if (loading) return <CenterInfo loading />;
  if (error) return <CenterInfo text={error} error />;

  return (
    <FlatList
      style={styles.screen}
      data={stunden}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => <FahrstundeCard stunde={item} />}
      contentContainerStyle={[styles.list, stunden.length === 0 && styles.empty]}
      ItemSeparatorComponent={() => <View style={{ height: space(2.5) }} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.datum}>{formatDatumLang(heute)}</Text>
          <Text style={styles.sub}>
            {stunden.length} {stunden.length === 1 ? "Fahrstunde" : "Fahrstunden"}
          </Text>
        </View>
      }
      ListEmptyComponent={<CenterInfo text="Heute keine Fahrstunden 🎉" />}
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
  header: { marginBottom: space(4) },
  datum: { fontSize: 20, fontWeight: "800", color: colors.text },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
});
