import { useMemo } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { Avatar, Badge, CenterInfo, ProgressBar, Row, Screen, Section } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { formatDatumKurz } from "@/lib/format";
import { PFLICHTFAHRTEN, STATUS_LABEL, TYP_LABEL } from "@/lib/constants";
import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";
import type { Fahrschueler, FahrstundeStatus, FahrstundeTyp } from "@/lib/types";

type MiniStunde = { id: string; datum: string; uhrzeit: string; typ: FahrstundeTyp; status: FahrstundeStatus };

const STATUS_TONE: Record<FahrstundeStatus, "accent" | "success" | "neutral"> = {
  geplant: "accent",
  abgeschlossen: "success",
  ausgefallen: "neutral",
};

export default function SchuelerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const schuelerQ = useLoader<Fahrschueler[]>(
    () => supabase.from("fahrschueler").select("*").eq("id", id).limit(1).returns<Fahrschueler[]>(),
    { cacheKey: `schueler-${id}` },
  );
  const stundenQ = useLoader<MiniStunde[]>(
    () =>
      supabase
        .from("fahrstunde")
        .select("id, datum, uhrzeit, typ, status")
        .eq("schueler_id", id)
        .order("datum", { ascending: false })
        .returns<MiniStunde[]>(),
    { cacheKey: `schueler-stunden-${id}` },
  );

  const schueler = schuelerQ.data?.[0];
  const stunden = stundenQ.data ?? [];
  const abgeschlossen = useMemo(() => stunden.filter((x) => x.status === "abgeschlossen"), [stunden]);
  const anzahl = (typ: FahrstundeTyp) => abgeschlossen.filter((x) => x.typ === typ).length;

  if (schuelerQ.loading) return <CenterInfo loading />;
  if (schuelerQ.error || !schueler) return <CenterInfo text={schuelerQ.error ?? "Schüler nicht gefunden."} error />;

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push(`/schueler/bearbeiten/${id}`)} hitSlop={10}>
              <Text style={{ fontSize: 17, color: colors.accent }}>Bearbeiten</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: space(8) }}>
        <View style={{ alignItems: "center", paddingVertical: space(6), gap: space(2) }}>
          <Avatar vorname={schueler.vorname} nachname={schueler.nachname} farbe={schueler.avatar_farbe} size={72} />
          <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text, marginTop: space(1) }}>
            {schueler.vorname} {schueler.nachname}
          </Text>
          <Text style={{ fontSize: 15, color: colors.textMuted }}>
            Klasse {schueler.fuehrerscheinklassen?.length ? schueler.fuehrerscheinklassen.join(", ") : "—"}
          </Text>
          <View style={{ flexDirection: "row", gap: space(2), marginTop: space(1) }}>
            <Badge label={schueler.theorie_bestanden ? "Theorie bestanden" : "Theorie offen"} tone={schueler.theorie_bestanden ? "success" : "warning"} />
            {schueler.pruefung_termin ? <Badge label={`Prüfung ${formatDatumKurz(schueler.pruefung_termin)}`} tone="accent" /> : null}
          </View>
        </View>

        <View style={{ paddingHorizontal: space(4) }}>
          {schueler.telefon || schueler.email ? (
            <Section title="Kontakt">
              {schueler.telefon ? (
                <Row
                  title={schueler.telefon}
                  leading={<Ionicons name="call-outline" size={20} color={colors.accent} />}
                  onPress={() => Linking.openURL(`tel:${schueler.telefon}`)}
                />
              ) : null}
              {schueler.email ? (
                <Row
                  title={schueler.email}
                  leading={<Ionicons name="mail-outline" size={20} color={colors.accent} />}
                  onPress={() => Linking.openURL(`mailto:${schueler.email}`)}
                />
              ) : null}
            </Section>
          ) : null}

          <Section title="Ausbildungsstand">
            <View style={{ padding: space(4), gap: space(4) }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: space(2) }}>
                <Text style={{ fontSize: 30, fontWeight: "700", color: colors.text }}>{abgeschlossen.length}</Text>
                <Text style={{ fontSize: 15, color: colors.textMuted }}>absolvierte Fahrstunden</Text>
              </View>
              {PFLICHTFAHRTEN.map((p) => {
                const ist = anzahl(p.typ);
                const fertig = ist >= p.soll;
                return (
                  <View key={p.typ} style={{ gap: space(1.5) }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 14, color: colors.text }}>{p.label}</Text>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: fertig ? colors.success : colors.textMuted }}>
                        {ist}/{p.soll}
                      </Text>
                    </View>
                    <ProgressBar value={ist} max={p.soll} color={fertig ? colors.success : colors.accent} />
                  </View>
                );
              })}
            </View>
          </Section>

          <Section title="Letzte Fahrstunden">
            {stunden.length === 0 ? (
              <Row title="Noch keine Fahrstunden" />
            ) : (
              stunden.slice(0, 8).map((x) => (
                <Row
                  key={x.id}
                  title={TYP_LABEL[x.typ]}
                  subtitle={formatDatumKurz(x.datum)}
                  trailing={<Badge label={STATUS_LABEL[x.status]} tone={STATUS_TONE[x.status]} />}
                />
              ))
            )}
          </Section>
        </View>
      </ScrollView>
    </Screen>
  );
}
