import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { FahrstundeKarte } from "@/components/fahrstunde-karte";
import { HeaderPlus } from "@/components/header-plus";
import { HomeHeader } from "@/components/home-header";
import { CenterInfo, Screen, Segmented } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { useRealtime } from "@/lib/use-realtime";
import { supabase } from "@/lib/supabase";
import { formatDatumLang, heuteISO, plusTageISO } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";
import { FAHRSTUNDE_SELECT, type FahrstundeMitRelationen, type Pinnwand } from "@/lib/types";

type Tab = "termine" | "aufgaben";

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>("termine");
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

  const aufgaben = useLoader<Pinnwand[]>(
    () =>
      supabase
        .from("pinnwand")
        .select("*")
        .eq("typ", "todo")
        .order("erledigt", { ascending: true })
        .order("created_at", { ascending: false })
        .returns<Pinnwand[]>(),
    { cacheKey: "aufgaben" },
  );

  useRealtime("home-stunden", "fahrstunde", () => stunden.refresh());
  useRealtime("home-aufgaben", "pinnwand", () => aufgaben.refresh());

  const tage = useMemo(() => {
    const map = new Map<string, FahrstundeMitRelationen[]>();
    for (const s of stunden.data ?? []) {
      const liste = map.get(s.datum) ?? [];
      liste.push(s);
      map.set(s.datum, liste);
    }
    return Array.from(map, ([datum, liste]) => ({ datum, liste }));
  }, [stunden.data]);

  const aufgabenListe = aufgaben.data ?? [];
  const offen = aufgabenListe.filter((a) => !a.erledigt).length;

  function label(datum: string) {
    if (datum === von) return "Heute";
    if (datum === plusTageISO(von, 1)) return "Morgen";
    return formatDatumLang(datum);
  }

  async function toggleTodo(item: Pinnwand) {
    await supabase.from("pinnwand").update({ erledigt: !item.erledigt }).eq("id", item.id);
    aufgaben.refresh();
  }

  return (
    <Screen>
      <HomeHeader right={<HeaderPlus href="/fahrstunde/neu" />} />

      <View style={{ paddingHorizontal: space(4), paddingBottom: space(3) }}>
        <Segmented<Tab>
          options={[
            { value: "termine", label: `Termine (${stunden.data?.length ?? 0})` },
            { value: "aufgaben", label: `Aufgaben (${offen})` },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: space(8), paddingHorizontal: space(4) }}
        refreshControl={
          <RefreshControl
            refreshing={stunden.refreshing}
            onRefresh={() => {
              stunden.refresh();
              aufgaben.refresh();
            }}
            tintColor={colors.accent}
          />
        }
      >
        {tab === "termine" ? (
          stunden.loading ? (
            <CenterInfo loading />
          ) : tage.length === 0 ? (
            <Leer text="Keine anstehenden Fahrstunden" colors={colors} />
          ) : (
            <View style={{ gap: space(4) }}>
              {tage.map((t) => (
                <View key={t.datum} style={{ gap: space(2) }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: colors.text,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {label(t.datum)}
                  </Text>
                  <View style={{ gap: space(2) }}>
                    {t.liste.map((st) => (
                      <FahrstundeKarte key={st.id} stunde={st} onPress={() => router.push(`/fahrstunde/${st.id}`)} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )
        ) : aufgabenListe.length === 0 ? (
          <Leer text="Keine Aufgaben" colors={colors} />
        ) : (
          <View style={{ gap: space(2) }}>
            {aufgabenListe.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => toggleTodo(item)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space(3),
                  backgroundColor: pressed ? colors.cardAlt : colors.card,
                  borderRadius: radius.md,
                  paddingHorizontal: space(4),
                  paddingVertical: space(3.5),
                })}
              >
                <Ionicons
                  name={item.erledigt ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={item.erledigt ? colors.success : colors.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: colors.text,
                      textDecorationLine: item.erledigt ? "line-through" : "none",
                    }}
                  >
                    {item.titel}
                  </Text>
                  {item.inhalt ? (
                    <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{item.inhalt}</Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Leer({ text, colors }: { text: string; colors: { card: string; textMuted: string } }) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.md,
        padding: space(8),
        alignItems: "center",
      }}
    >
      <Text style={{ color: colors.textMuted, fontSize: 15 }}>{text}</Text>
    </View>
  );
}
