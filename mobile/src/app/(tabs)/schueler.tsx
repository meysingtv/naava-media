import { useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar, Badge, Card, CenterInfo } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { colors, radius, space } from "@/lib/theme";
import type { Fahrschueler } from "@/lib/types";

export default function SchuelerScreen() {
  const [suche, setSuche] = useState("");
  const { data, loading, refreshing, error, refresh } = useLoader<Fahrschueler[]>(() =>
    supabase.from("fahrschueler").select("*").order("nachname", { ascending: true }).returns<Fahrschueler[]>(),
  );

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    const alle = data ?? [];
    if (!q) return alle;
    return alle.filter((s) => `${s.vorname} ${s.nachname}`.toLowerCase().includes(q));
  }, [data, suche]);

  if (loading) return <CenterInfo loading />;
  if (error) return <CenterInfo text={error} error />;

  return (
    <FlatList
      style={styles.screen}
      data={gefiltert}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => <SchuelerZeile schueler={item} />}
      contentContainerStyle={[styles.list, gefiltert.length === 0 && styles.empty]}
      ItemSeparatorComponent={() => <View style={{ height: space(2) }} />}
      keyboardDismissMode="on-drag"
      ListHeaderComponent={
        <TextInput
          style={styles.suche}
          value={suche}
          onChangeText={setSuche}
          placeholder="Schüler suchen…"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
      }
      ListEmptyComponent={<CenterInfo text="Keine Schüler gefunden." />}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />
      }
    />
  );
}

function SchuelerZeile({ schueler }: { schueler: Fahrschueler }) {
  const klassen = schueler.fuehrerscheinklassen?.length
    ? schueler.fuehrerscheinklassen.join(", ")
    : "—";
  return (
    <Card style={styles.row}>
      <Avatar vorname={schueler.vorname} nachname={schueler.nachname} farbe={schueler.avatar_farbe} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {schueler.vorname} {schueler.nachname}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          Klasse {klassen}
        </Text>
      </View>
      {schueler.theorie_bestanden ? (
        <Badge label="Theorie ✓" bg="#D1FAE5" color="#047857" />
      ) : (
        <Badge label="Theorie offen" bg="#F1F5F9" color="#475569" />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: space(4) },
  empty: { flexGrow: 1 },
  suche: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space(3.5),
    paddingVertical: space(3),
    fontSize: 16,
    color: colors.text,
    marginBottom: space(4),
  },
  row: { flexDirection: "row", alignItems: "center", gap: space(3) },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
});
