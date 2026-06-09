import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Avatar, Badge, Banner, CenterInfo, Input } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme-context";
import { radius, space, type ThemeColors } from "@/lib/theme";
import type { Fahrschueler } from "@/lib/types";

export default function SchuelerScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [suche, setSuche] = useState("");

  const { data, loading, refreshing, error, offline, refresh } = useLoader<Fahrschueler[]>(
    () => supabase.from("fahrschueler").select("*").order("nachname", { ascending: true }).returns<Fahrschueler[]>(),
    { cacheKey: "schueler" },
  );

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    const alle = data ?? [];
    if (!q) return alle;
    return alle.filter((schueler) => `${schueler.vorname} ${schueler.nachname}`.toLowerCase().includes(q));
  }, [data, suche]);

  if (loading) return <CenterInfo loading />;
  if (error) return <CenterInfo text={error} error />;

  return (
    <View style={s.screen}>
      {offline ? <Banner text="Offline – zuletzt geladene Daten" /> : null}
      <FlatList
        data={gefiltert}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/schueler/${item.id}`)}
            style={({ pressed }) => [s.row, pressed && s.pressed]}
          >
            <Avatar vorname={item.vorname} nachname={item.nachname} farbe={item.avatar_farbe} />
            <View style={s.info}>
              <Text style={s.name} numberOfLines={1}>
                {item.vorname} {item.nachname}
              </Text>
              <Text style={s.meta} numberOfLines={1}>
                Klasse {item.fuehrerscheinklassen?.length ? item.fuehrerscheinklassen.join(", ") : "—"}
              </Text>
            </View>
            {item.theorie_bestanden ? (
              <Badge label="Theorie ✓" bg="#D1FAE5" color="#047857" />
            ) : (
              <Badge label="Theorie offen" bg="#F1F5F9" color="#475569" />
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        )}
        contentContainerStyle={[s.list, gefiltert.length === 0 && s.empty]}
        ItemSeparatorComponent={() => <View style={{ height: space(2) }} />}
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View style={{ marginBottom: space(4) }}>
            <Input value={suche} onChangeText={setSuche} placeholder="Schüler suchen…" autoCapitalize="none" autoCorrect={false} />
          </View>
        }
        ListEmptyComponent={<CenterInfo text="Keine Schüler gefunden." />}
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
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: space(3),
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: space(3.5),
    },
    pressed: { opacity: 0.6 },
    info: { flex: 1, gap: 2 },
    name: { fontSize: 16, fontWeight: "600", color: c.text },
    meta: { fontSize: 13, color: c.textMuted },
  });
