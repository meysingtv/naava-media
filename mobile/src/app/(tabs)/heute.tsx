import { useMemo } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { FahrstundeKarte } from "@/components/fahrstunde-karte";
import { HeaderPlus } from "@/components/header-plus";
import { CenterInfo, Screen, ScreenHeader } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { useRealtime } from "@/lib/use-realtime";
import { supabase } from "@/lib/supabase";
import { formatDatumLang, heuteISO, plusTageISO } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import { radius, space, type ThemeColors } from "@/lib/theme";
import { FAHRSTUNDE_SELECT, type FahrstundeMitRelationen } from "@/lib/types";

function StatKachel({ label, value, colors }: { label: string; value: number; colors: ThemeColors }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: space(3.5) }}>
      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const von = useMemo(() => heuteISO(), []);
  const bis = useMemo(() => plusTageISO(von, 7), [von]);

  const stunden = useLoader<FahrstundeMitRelationen[]>(
    () =>
      supabase
        .from("fahrstunde")
        .select(FAHRSTUNDE_SELECT)
        .gte("datum", von)
        .lte("datum", bis)
        .order("datum", { ascending: true })
        .order("uhrzeit", { ascending: true })
        .returns<FahrstundeMitRelationen[]>(),
    { cacheKey: `home-${von}` },
  );

  const stats = useLoader<{ woche: number; schueler: number; pruefungen: number }>(
    async () => {
      const d = new Date();
      const tag = (d.getDay() + 6) % 7;
      const mo = new Date(d);
      mo.setDate(d.getDate() - tag);
      const so = new Date(mo);
      so.setDate(mo.getDate() + 6);
      const iso = (x: Date) =>
        `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
      const [w, s, p] = await Promise.all([
        supabase.from("fahrstunde").select("*", { count: "exact", head: true }).gte("datum", iso(mo)).lte("datum", iso(so)),
        supabase.from("fahrschueler").select("*", { count: "exact", head: true }),
        supabase.from("fahrschueler").select("*", { count: "exact", head: true }).gte("pruefung_termin", von),
      ]);
      const error = w.error || s.error || p.error;
      if (error) return { data: null, error };
      return { data: { woche: w.count ?? 0, schueler: s.count ?? 0, pruefungen: p.count ?? 0 }, error: null };
    },
    { cacheKey: "dashboard" },
  );

  useRealtime("home-stunden", "fahrstunde", () => {
    stunden.refresh();
    stats.refresh();
  });

  const tage = useMemo(() => {
    const map = new Map<string, FahrstundeMitRelationen[]>();
    for (const s of stunden.data ?? []) {
      const liste = map.get(s.datum) ?? [];
      liste.push(s);
      map.set(s.datum, liste);
    }
    return Array.from(map, ([datum, liste]) => ({ datum, liste }));
  }, [stunden.data]);

  function label(datum: string) {
    if (datum === von) return "Heute";
    if (datum === plusTageISO(von, 1)) return "Morgen";
    return formatDatumLang(datum);
  }

  return (
    <Screen>
      <ScreenHeader title="Heute" subtitle={formatDatumLang(von)} right={<HeaderPlus href="/fahrstunde/neu" />} />
      <ScrollView
        contentContainerStyle={{ padding: space(4), paddingBottom: space(8), gap: space(5) }}
        refreshControl={
          <RefreshControl
            refreshing={stunden.refreshing}
            onRefresh={() => {
              stunden.refresh();
              stats.refresh();
            }}
            tintColor={colors.accent}
          />
        }
      >
        {stats.data ? (
          <View style={{ flexDirection: "row", gap: space(3) }}>
            <StatKachel label="Diese Woche" value={stats.data.woche} colors={colors} />
            <StatKachel label="Schüler" value={stats.data.schueler} colors={colors} />
            <StatKachel label="Prüfungen" value={stats.data.pruefungen} colors={colors} />
          </View>
        ) : null}

        {stunden.loading ? (
          <CenterInfo loading />
        ) : tage.length === 0 ? (
          <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: space(6), alignItems: "center" }}>
            <Text style={{ color: colors.textMuted, fontSize: 15 }}>Keine anstehenden Fahrstunden</Text>
          </View>
        ) : (
          tage.map((t) => (
            <View key={t.datum} style={{ gap: space(2.5) }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: colors.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                {label(t.datum)}
              </Text>
              {t.liste.map((st) => (
                <FahrstundeKarte key={st.id} stunde={st} onPress={() => router.push(`/fahrstunde/${st.id}`)} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
