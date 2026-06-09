import { useMemo } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import { Avatar, Badge, Card, CenterInfo, ProgressBar } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { formatDatumKurz } from "@/lib/format";
import { PFLICHTFAHRTEN, STATUS_FARBE, STATUS_LABEL, TYP_LABEL } from "@/lib/constants";
import { useTheme } from "@/lib/theme-context";
import { space, type ThemeColors } from "@/lib/theme";
import type { Fahrschueler, FahrstundeStatus, FahrstundeTyp } from "@/lib/types";

type MiniStunde = {
  id: string;
  datum: string;
  uhrzeit: string;
  typ: FahrstundeTyp;
  status: FahrstundeStatus;
  dauer_minuten: number;
};

export default function SchuelerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const schuelerQ = useLoader<Fahrschueler[]>(
    () => supabase.from("fahrschueler").select("*").eq("id", id).limit(1).returns<Fahrschueler[]>(),
    { cacheKey: `schueler-${id}` },
  );
  const stundenQ = useLoader<MiniStunde[]>(
    () =>
      supabase
        .from("fahrstunde")
        .select("id, datum, uhrzeit, typ, status, dauer_minuten")
        .eq("schueler_id", id)
        .order("datum", { ascending: false })
        .returns<MiniStunde[]>(),
    { cacheKey: `schueler-stunden-${id}` },
  );

  const schueler = schuelerQ.data?.[0];
  const stunden = stundenQ.data ?? [];
  const abgeschlossen = stunden.filter((x) => x.status === "abgeschlossen");
  const anzahl = (typ: FahrstundeTyp) => abgeschlossen.filter((x) => x.typ === typ).length;

  if (schuelerQ.loading) return <CenterInfo loading />;
  if (schuelerQ.error || !schueler) return <CenterInfo text={schuelerQ.error ?? "Schüler nicht gefunden."} error />;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Card>
        <View style={s.kopf}>
          <Avatar vorname={schueler.vorname} nachname={schueler.nachname} farbe={schueler.avatar_farbe} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={s.titel}>
              {schueler.vorname} {schueler.nachname}
            </Text>
            <Text style={s.meta}>
              Klasse {schueler.fuehrerscheinklassen?.length ? schueler.fuehrerscheinklassen.join(", ") : "—"}
            </Text>
          </View>
        </View>
        <View style={s.badges}>
          {schueler.theorie_bestanden ? (
            <Badge label="Theorie bestanden ✓" bg="#D1FAE5" color="#047857" />
          ) : (
            <Badge label="Theorie offen" bg="#FEF3C7" color="#B45309" />
          )}
          {schueler.pruefung_termin ? (
            <Badge label={`Prüfung ${formatDatumKurz(schueler.pruefung_termin)}`} bg={colors.brandSoft} color={colors.brand} />
          ) : null}
        </View>
      </Card>

      {schueler.telefon || schueler.email ? (
        <Card>
          {schueler.telefon ? (
            <Pressable style={s.kontakt} onPress={() => Linking.openURL(`tel:${schueler.telefon}`)}>
              <Ionicons name="call-outline" size={20} color={colors.brand} />
              <Text style={s.kontaktText}>{schueler.telefon}</Text>
            </Pressable>
          ) : null}
          {schueler.telefon && schueler.email ? <View style={s.trenner} /> : null}
          {schueler.email ? (
            <Pressable style={s.kontakt} onPress={() => Linking.openURL(`mailto:${schueler.email}`)}>
              <Ionicons name="mail-outline" size={20} color={colors.brand} />
              <Text style={s.kontaktText}>{schueler.email}</Text>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

      <Text style={s.sektion}>Ausbildungsstand</Text>
      <Card>
        <View style={s.zeile}>
          <Text style={s.gesamtZahl}>{abgeschlossen.length}</Text>
          <Text style={s.gesamtText}>absolvierte Fahrstunden</Text>
        </View>
        <View style={s.trenner} />
        <Text style={s.pflichtTitel}>Pflichtfahrten</Text>
        <View style={{ gap: space(3) }}>
          {PFLICHTFAHRTEN.map((p) => {
            const ist = anzahl(p.typ);
            const fertig = ist >= p.soll;
            return (
              <View key={p.typ} style={{ gap: space(1.5) }}>
                <View style={s.pflichtRow}>
                  <Text style={s.pflichtLabel}>{p.label}</Text>
                  <Text style={[s.pflichtZahl, fertig && { color: colors.success }]}>
                    {ist}/{p.soll}
                  </Text>
                </View>
                <ProgressBar value={ist} max={p.soll} color={fertig ? colors.success : colors.brand} />
              </View>
            );
          })}
        </View>
      </Card>

      <Text style={s.sektion}>Letzte Fahrstunden</Text>
      {stunden.length === 0 ? (
        <Card>
          <Text style={s.leer}>Noch keine Fahrstunden.</Text>
        </Card>
      ) : (
        <Card>
          {stunden.slice(0, 8).map((x, i) => (
            <View key={x.id}>
              {i > 0 ? <View style={s.trenner} /> : null}
              <View style={s.histRow}>
                <Text style={s.histDatum}>{formatDatumKurz(x.datum)}</Text>
                <Text style={s.histTyp}>{TYP_LABEL[x.typ]}</Text>
                <Badge
                  label={STATUS_LABEL[x.status]}
                  bg={STATUS_FARBE[x.status].bg}
                  color={STATUS_FARBE[x.status].text}
                />
              </View>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space(4), gap: space(2) },
    kopf: { flexDirection: "row", alignItems: "center", gap: space(3) },
    titel: { fontSize: 19, fontWeight: "800", color: c.text },
    meta: { fontSize: 14, color: c.textMuted, marginTop: 2 },
    badges: { flexDirection: "row", flexWrap: "wrap", gap: space(2), marginTop: space(3) },
    kontakt: { flexDirection: "row", alignItems: "center", gap: space(3), paddingVertical: space(1) },
    kontaktText: { fontSize: 15, color: c.text },
    sektion: {
      fontSize: 13,
      fontWeight: "800",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: space(4),
    },
    zeile: { flexDirection: "row", alignItems: "baseline", gap: space(2) },
    gesamtZahl: { fontSize: 28, fontWeight: "800", color: c.text },
    gesamtText: { fontSize: 14, color: c.textMuted },
    trenner: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: space(3) },
    pflichtTitel: { fontSize: 14, fontWeight: "700", color: c.text, marginBottom: space(3) },
    pflichtRow: { flexDirection: "row", justifyContent: "space-between" },
    pflichtLabel: { fontSize: 14, color: c.text },
    pflichtZahl: { fontSize: 14, fontWeight: "700", color: c.textMuted },
    histRow: { flexDirection: "row", alignItems: "center", gap: space(3) },
    histDatum: { fontSize: 13, color: c.textMuted, width: 64 },
    histTyp: { flex: 1, fontSize: 14, color: c.text },
    leer: { color: c.textMuted, fontSize: 15, textAlign: "center", paddingVertical: space(2) },
  });
