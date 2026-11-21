import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Avatar, Badge, CenterInfo, Input, Screen, ScreenHeader } from "@/components/ui";
import { HeaderPlus } from "@/components/header-plus";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";
import type { Fahrschueler } from "@/lib/types";

export default function SchuelerScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [suche, setSuche] = useState("");

  const { data, loading, refreshing, error, offline, refresh } = useLoader<Fahrschueler[]>(
    () => supabase.from("fahrschueler").select("*").order("nachname", { ascending: true }).returns<Fahrschueler[]>(),
    { cacheKey: "schueler" },
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
    <Screen>
      <ScreenHeader title="Schüler" right={<HeaderPlus href="/schueler/neu" />} />
      <View style={{ paddingHorizontal: space(4), paddingBottom: space(3) }}>
        <Input value={suche} onChangeText={setSuche} placeholder="Schüler suchen" autoCapitalize="none" autoCorrect={false} />
        {offline ? <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: space(2) }}>Offline – zuletzt geladene Daten</Text> : null}
      </View>

      <FlatList
        data={gefiltert}
        keyExtractor={(s) => s.id}
        style={{ backgroundColor: colors.card }}
        contentContainerStyle={gefiltert.length === 0 ? { flexGrow: 1 } : undefined}
        keyboardDismissMode="on-drag"
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 66 }} />}
        ListEmptyComponent={<CenterInfo text="Keine Schüler gefunden." />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/schueler/${item.id}`)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: space(3),
              paddingHorizontal: space(4),
              paddingVertical: space(2.5),
              backgroundColor: pressed ? colors.cardAlt : colors.card,
            })}
          >
            <Avatar vorname={item.vorname} nachname={item.nachname} farbe={item.avatar_farbe} />
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={{ fontSize: 16, color: colors.text }} numberOfLines={1}>
                {item.vorname} {item.nachname}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
                Klasse {item.fuehrerscheinklassen?.length ? item.fuehrerscheinklassen.join(", ") : "—"}
              </Text>
            </View>
            {item.theorie_bestanden ? <Badge label="Theorie" tone="success" /> : null}
            <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
          </Pressable>
        )}
      />
    </Screen>
  );
}
