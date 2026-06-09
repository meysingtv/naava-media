import { useMemo } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { FahrstundeRow } from "@/components/fahrstunde-row";
import { LargeTitle, Row, Screen, Section } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { formatDatumLang, heuteISO } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";
import { FAHRSTUNDE_SELECT, type FahrstundeMitRelationen, type Pinnwand } from "@/lib/types";

export default function HeuteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const heute = useMemo(() => heuteISO(), []);

  const stunden = useLoader<FahrstundeMitRelationen[]>(
    () =>
      supabase
        .from("fahrstunde")
        .select(FAHRSTUNDE_SELECT)
        .eq("datum", heute)
        .order("uhrzeit", { ascending: true })
        .returns<FahrstundeMitRelationen[]>(),
    { cacheKey: `heute-${heute}` },
  );
  const pinnwand = useLoader<Pinnwand[]>(
    () =>
      supabase
        .from("pinnwand")
        .select("*")
        .order("erledigt", { ascending: true })
        .order("created_at", { ascending: false })
        .returns<Pinnwand[]>(),
    { cacheKey: "pinnwand" },
  );

  const liste = stunden.data ?? [];
  const pinnListe = pinnwand.data ?? [];

  async function toggleTodo(item: Pinnwand) {
    await supabase.from("pinnwand").update({ erledigt: !item.erledigt }).eq("id", item.id);
    pinnwand.refresh();
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space(8) }}
        refreshControl={
          <RefreshControl
            refreshing={stunden.refreshing}
            onRefresh={() => {
              stunden.refresh();
              pinnwand.refresh();
            }}
            tintColor={colors.accent}
          />
        }
      >
        <LargeTitle title="Heute" subtitle={formatDatumLang(heute)} />

        <View style={{ paddingHorizontal: space(4) }}>
          {stunden.offline ? (
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: space(3) }}>Offline – zuletzt geladene Daten</Text>
          ) : null}

          {liste.length === 0 ? (
            <Section>
              <Row title="Heute keine Fahrstunden" />
            </Section>
          ) : (
            <Section title={`${liste.length} ${liste.length === 1 ? "Fahrstunde" : "Fahrstunden"}`}>
              {liste.map((st) => (
                <FahrstundeRow key={st.id} stunde={st} onPress={() => router.push(`/fahrstunde/${st.id}`)} />
              ))}
            </Section>
          )}

          {pinnListe.length > 0 ? (
            <Section title="Pinnwand">
              {pinnListe.map((item) => (
                <Row
                  key={item.id}
                  onPress={item.typ === "todo" ? () => toggleTodo(item) : undefined}
                  title={item.titel}
                  subtitle={item.inhalt ?? undefined}
                  leading={
                    <Ionicons
                      name={item.typ === "todo" ? (item.erledigt ? "checkmark-circle" : "ellipse-outline") : "megaphone-outline"}
                      size={20}
                      color={item.erledigt ? colors.success : colors.accent}
                    />
                  }
                />
              ))}
            </Section>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
