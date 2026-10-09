import { useEffect, useState } from "react";
import { Alert, Platform, RefreshControl, ScrollView, Text, View, type AlertButton } from "react-native";

import { Avatar, Badge, Button, CenterInfo, Screen } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { useRealtime } from "@/lib/use-realtime";
import { supabase } from "@/lib/supabase";
import { anfrageAblehnen, anfrageAnnehmen, meineFahrlehrerId } from "@/lib/anfragen";
import { endUhrzeit, formatDatumLang, formatUhrzeit } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";
import { ANFRAGE_SELECT, type AnfrageMitNamen, type Fahrlehrer } from "@/lib/types";

type Lehrer = Pick<Fahrlehrer, "id" | "vorname" | "nachname">;

/**
 * Offene Fahrstunden-Anfragen aus dem Schüler-Portal: annehmen (legt die
 * Fahrstunde an – der Schüler sieht sie sofort) oder mit Grund ablehnen.
 * Aktualisiert sich live, sobald irgendwo eine Anfrage dazukommt.
 */
export default function AnfragenScreen() {
  const { colors } = useTheme();
  const [ich, setIch] = useState<string | null>(null);
  const [arbeitet, setArbeitet] = useState<string | null>(null);

  const anfragen = useLoader<AnfrageMitNamen[]>(
    () =>
      supabase
        .from("fahrstunde_anfrage")
        .select(ANFRAGE_SELECT)
        .eq("status", "offen")
        .order("datum", { ascending: true })
        .order("uhrzeit", { ascending: true })
        .returns<AnfrageMitNamen[]>(),
    { cacheKey: "anfragen-offen" },
  );
  const lehrer = useLoader<Lehrer[]>(
    () => supabase.from("fahrlehrer").select("id, vorname, nachname").eq("aktiv", true).order("nachname").returns<Lehrer[]>(),
    { cacheKey: "fahrlehrer-aktiv" },
  );

  useEffect(() => {
    meineFahrlehrerId().then(setIch);
  }, []);
  useRealtime("anfragen-liste", "fahrstunde_anfrage", () => anfragen.refresh());

  const name = (id: string | null) => {
    const l = (lehrer.data ?? []).find((x) => x.id === id);
    return l ? `${l.vorname} ${l.nachname}` : "Fahrlehrer";
  };

  async function annehmen(a: AnfrageMitNamen, fahrlehrerId: string) {
    setArbeitet(a.id);
    const fehler = await anfrageAnnehmen({ id: a.id, fahrlehrerId });
    setArbeitet(null);
    if (fehler) Alert.alert("Nicht möglich", fehler);
    else anfragen.refresh();
  }

  function annehmenFragen(a: AnfrageMitNamen) {
    const standard = a.wunsch_fahrlehrer_id ?? ich;
    const knoepfe: AlertButton[] = [];
    if (standard) knoepfe.push({ text: `Für ${name(standard)}`, onPress: () => annehmen(a, standard) });
    for (const l of lehrer.data ?? []) {
      if (l.id !== standard) knoepfe.push({ text: `${l.vorname} ${l.nachname}`, onPress: () => annehmen(a, l.id) });
    }
    knoepfe.push({ text: "Abbrechen", style: "cancel" });
    Alert.alert("Anfrage annehmen", "Wer fährt die Stunde?", knoepfe);
  }

  async function ablehnen(a: AnfrageMitNamen, grund: string) {
    setArbeitet(a.id);
    const fehler = await anfrageAblehnen(a.id, grund);
    setArbeitet(null);
    if (fehler) Alert.alert("Nicht möglich", fehler);
    else anfragen.refresh();
  }

  function ablehnenFragen(a: AnfrageMitNamen) {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Anfrage ablehnen",
        "Grund für den Schüler (optional)",
        [
          { text: "Abbrechen", style: "cancel" },
          { text: "Ablehnen", style: "destructive", onPress: (grund?: string) => ablehnen(a, grund ?? "") },
        ],
        "plain-text",
      );
    } else {
      Alert.alert("Anfrage ablehnen?", undefined, [
        { text: "Abbrechen", style: "cancel" },
        { text: "Ablehnen", style: "destructive", onPress: () => ablehnen(a, "") },
      ]);
    }
  }

  const liste = anfragen.data ?? [];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: space(4), gap: space(3), paddingBottom: space(10) }}
        refreshControl={<RefreshControl refreshing={anfragen.refreshing} onRefresh={anfragen.refresh} tintColor={colors.accent} />}
      >
        {anfragen.loading ? (
          <CenterInfo loading />
        ) : anfragen.error && liste.length === 0 ? (
          <CenterInfo error text="Anfragen konnten nicht geladen werden. Ist das Datenbank-Update 0020 eingespielt?" />
        ) : liste.length === 0 ? (
          <CenterInfo text="Keine offenen Anfragen" />
        ) : (
          liste.map((a) => {
            const schueler = a.fahrschueler ? `${a.fahrschueler.vorname} ${a.fahrschueler.nachname}` : "Schüler";
            return (
              <View key={a.id} style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: space(4), gap: space(3) }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space(3) }}>
                  <Avatar
                    vorname={a.fahrschueler?.vorname}
                    nachname={a.fahrschueler?.nachname}
                    farbe={a.fahrschueler?.avatar_farbe ?? undefined}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text }} numberOfLines={1}>
                      {schueler}
                    </Text>
                    <Text style={{ fontSize: 14, color: colors.textMuted }}>
                      {formatDatumLang(a.datum)} · {formatUhrzeit(a.uhrzeit)}–{endUhrzeit(a.uhrzeit, a.dauer_minuten)}
                    </Text>
                    {a.wunsch ? (
                      <Text style={{ fontSize: 13, color: colors.textMuted }}>
                        Wunsch: {a.wunsch.vorname} {a.wunsch.nachname}
                      </Text>
                    ) : null}
                  </View>
                  <Badge label={`${a.dauer_minuten} Min.`} tone="accent" />
                </View>

                {a.notiz ? (
                  <Text
                    style={{
                      fontSize: 15,
                      color: colors.text,
                      backgroundColor: colors.cardAlt,
                      borderRadius: radius.md,
                      paddingHorizontal: space(3),
                      paddingVertical: space(2.5),
                    }}
                  >
                    „{a.notiz}“
                  </Text>
                ) : null}

                <View style={{ flexDirection: "row", gap: space(2) }}>
                  <View style={{ flex: 1 }}>
                    <Button title="Annehmen" loading={arbeitet === a.id} onPress={() => annehmenFragen(a)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Ablehnen" variant="tinted" destructive disabled={arbeitet === a.id} onPress={() => ablehnenFragen(a)} />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
