import { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { FahrstundeCard } from "@/components/fahrstunde-card";
import { Banner, Card } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { formatDatumLang, heuteISO } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import { radius, space, type ThemeColors } from "@/lib/theme";
import { FAHRSTUNDE_SELECT, type FahrstundeMitRelationen, type Pinnwand } from "@/lib/types";

export default function HeuteScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
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

  function refreshAll() {
    stunden.refresh();
    pinnwand.refresh();
  }

  return (
    <View style={s.screen}>
      {stunden.offline ? <Banner text="Offline – zuletzt geladene Daten" /> : null}
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={stunden.refreshing} onRefresh={refreshAll} tintColor={colors.brand} />
        }
      >
        <Text style={s.datum}>{formatDatumLang(heute)}</Text>
        <Text style={s.sub}>
          {liste.length} {liste.length === 1 ? "Fahrstunde" : "Fahrstunden"} heute
        </Text>

        <View style={s.gruppe}>
          {liste.length === 0 ? (
            <Card>
              <Text style={s.leer}>Heute keine Fahrstunden 🎉</Text>
            </Card>
          ) : (
            liste.map((stunde) => (
              <FahrstundeCard
                key={stunde.id}
                stunde={stunde}
                onPress={() => router.push(`/fahrstunde/${stunde.id}`)}
              />
            ))
          )}
        </View>

        {pinnListe.length > 0 ? (
          <View style={s.gruppe}>
            <Text style={s.sektion}>Pinnwand</Text>
            {pinnListe.map((item) => {
              const istTodo = item.typ === "todo";
              return (
                <Pressable
                  key={item.id}
                  onPress={istTodo ? () => toggleTodo(item) : undefined}
                  style={s.pinn}
                >
                  <Ionicons
                    name={istTodo ? (item.erledigt ? "checkbox" : "square-outline") : "megaphone-outline"}
                    size={20}
                    color={item.erledigt ? colors.success : colors.brand}
                    style={{ marginTop: 1 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.pinnTitel, item.erledigt && s.durch]}>{item.titel}</Text>
                    {item.inhalt ? <Text style={s.pinnText}>{item.inhalt}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space(4), gap: space(2) },
    datum: { fontSize: 22, fontWeight: "800", color: c.text },
    sub: { fontSize: 14, color: c.textMuted },
    gruppe: { gap: space(2.5), marginTop: space(4) },
    sektion: { fontSize: 13, fontWeight: "800", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
    leer: { color: c.textMuted, fontSize: 15, textAlign: "center", paddingVertical: space(2) },
    pinn: {
      flexDirection: "row",
      gap: space(3),
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: space(3.5),
    },
    pinnTitel: { fontSize: 15, fontWeight: "600", color: c.text },
    pinnText: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    durch: { textDecorationLine: "line-through", color: c.textMuted },
  });
