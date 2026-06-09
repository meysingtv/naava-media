import { useMemo } from "react";
import { RefreshControl, ScrollView, Text } from "react-native";
import { useRouter } from "expo-router";

import { FahrstundeRow } from "@/components/fahrstunde-row";
import { HeaderPlus } from "@/components/header-plus";
import { CenterInfo, Row, Screen, ScreenHeader, Section } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { formatDatumLang, heuteISO, plusTageISO } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";
import { FAHRSTUNDE_SELECT, type FahrstundeMitRelationen } from "@/lib/types";

const TAGE_VORAUS = 28;

export default function KalenderScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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

  const tage = useMemo(() => {
    const map = new Map<string, FahrstundeMitRelationen[]>();
    for (const stunde of data ?? []) {
      const liste = map.get(stunde.datum) ?? [];
      liste.push(stunde);
      map.set(stunde.datum, liste);
    }
    return Array.from(map, ([datum, stunden]) => ({ datum, stunden }));
  }, [data]);

  if (loading) return <CenterInfo loading />;
  if (error) return <CenterInfo text={error} error />;

  function label(datum: string) {
    if (datum === von) return `Heute · ${formatDatumLang(datum)}`;
    if (datum === plusTageISO(von, 1)) return `Morgen · ${formatDatumLang(datum)}`;
    return formatDatumLang(datum);
  }

  return (
    <Screen>
      <ScreenHeader title="Terminplaner" right={<HeaderPlus href="/fahrstunde/neu" />} />
      <ScrollView
        contentContainerStyle={{ padding: space(4), paddingBottom: space(8) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
      >
        {offline ? <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: space(3) }}>Offline – zuletzt geladene Daten</Text> : null}

        {tage.length === 0 ? (
          <Section>
            <Row title="Keine Fahrstunden in den nächsten Wochen" />
          </Section>
        ) : (
          tage.map((t) => (
            <Section key={t.datum} title={label(t.datum)}>
              {t.stunden.map((st) => (
                <FahrstundeRow key={st.id} stunde={st} onPress={() => router.push(`/fahrstunde/${st.id}`)} />
              ))}
            </Section>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
