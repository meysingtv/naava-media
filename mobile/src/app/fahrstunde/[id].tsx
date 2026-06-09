import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Avatar, Button, Card, CenterInfo, Input, Segmented } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { formatDatumLang, formatUhrzeit } from "@/lib/format";
import { TYP_LABEL } from "@/lib/constants";
import { useTheme } from "@/lib/theme-context";
import { radius, space, type ThemeColors } from "@/lib/theme";
import {
  FAHRSTUNDE_SELECT,
  type FahrstundeMitRelationen,
  type FahrstundeStatus,
  type FahrstundeTyp,
} from "@/lib/types";

const TYP_REIHENFOLGE: FahrstundeTyp[] = ["normal", "ueberland", "autobahn", "nacht", "pruefung"];

export default function FahrstundeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const { data, loading, error } = useLoader<FahrstundeMitRelationen[]>(
    () => supabase.from("fahrstunde").select(FAHRSTUNDE_SELECT).eq("id", id).limit(1).returns<FahrstundeMitRelationen[]>(),
    { cacheKey: `fahrstunde-${id}` },
  );
  const stunde = data?.[0];

  const [status, setStatus] = useState<FahrstundeStatus>("geplant");
  const [typ, setTyp] = useState<FahrstundeTyp>("normal");
  const [dauer, setDauer] = useState(45);
  const [notiz, setNotiz] = useState("");
  const [bereit, setBereit] = useState(false);
  const [speichert, setSpeichert] = useState(false);

  useEffect(() => {
    if (stunde && !bereit) {
      setStatus(stunde.status);
      setTyp(stunde.typ);
      setDauer(stunde.dauer_minuten);
      setNotiz(stunde.notiz ?? "");
      setBereit(true);
    }
  }, [stunde, bereit]);

  async function speichern() {
    setSpeichert(true);
    const { error: updateError } = await supabase
      .from("fahrstunde")
      .update({ status, typ, dauer_minuten: dauer, notiz: notiz.trim() || null })
      .eq("id", id);
    setSpeichert(false);
    if (updateError) {
      Alert.alert("Fehler", updateError.message);
      return;
    }
    router.back();
  }

  if (loading) return <CenterInfo loading />;
  if (error || !stunde) return <CenterInfo text={error ?? "Fahrstunde nicht gefunden."} error />;

  const schueler = stunde.fahrschueler;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Card>
        <View style={s.kopf}>
          {schueler ? (
            <Avatar vorname={schueler.vorname} nachname={schueler.nachname} farbe={schueler.avatar_farbe} size={44} />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={s.titel}>{schueler ? `${schueler.vorname} ${schueler.nachname}` : "Ohne Schüler"}</Text>
            <Text style={s.meta}>
              {formatDatumLang(stunde.datum)} · {formatUhrzeit(stunde.uhrzeit)} Uhr
            </Text>
            {stunde.fahrzeug || stunde.fahrlehrer ? (
              <Text style={s.meta}>
                {[
                  stunde.fahrlehrer ? `${stunde.fahrlehrer.vorname} ${stunde.fahrlehrer.nachname}` : null,
                  stunde.fahrzeug?.kennzeichen,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            ) : null}
          </View>
        </View>
      </Card>

      <Text style={s.label}>Status</Text>
      <Segmented<FahrstundeStatus>
        options={[
          { value: "geplant", label: "Geplant" },
          { value: "abgeschlossen", label: "Gefahren" },
          { value: "ausgefallen", label: "Ausgefallen" },
        ]}
        value={status}
        onChange={setStatus}
      />

      <Text style={s.label}>Art der Fahrt</Text>
      <View style={s.chips}>
        {TYP_REIHENFOLGE.map((t) => {
          const aktiv = t === typ;
          return (
            <Pressable
              key={t}
              onPress={() => setTyp(t)}
              style={[s.chip, { backgroundColor: aktiv ? colors.brand : colors.cardAlt }]}
            >
              <Text style={{ color: aktiv ? colors.onBrand : colors.text, fontWeight: "600", fontSize: 13 }}>
                {TYP_LABEL[t]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={s.label}>Dauer</Text>
      <View style={s.stepper}>
        <Pressable onPress={() => setDauer((d) => Math.max(15, d - 5))} style={s.stepBtn}>
          <Ionicons name="remove" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.stepWert}>{dauer} Min</Text>
        <Pressable onPress={() => setDauer((d) => d + 5)} style={s.stepBtn}>
          <Ionicons name="add" size={22} color={colors.text} />
        </Pressable>
      </View>

      <Text style={s.label}>Notiz</Text>
      <Input
        value={notiz}
        onChangeText={setNotiz}
        placeholder="Was wurde geübt? (z. B. Einparken, Vorfahrt)"
        multiline
        style={{ minHeight: 90, textAlignVertical: "top" }}
      />

      <View style={{ marginTop: space(5) }}>
        <Button title="Speichern" onPress={speichern} loading={speichert} />
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space(4), gap: space(2) },
    kopf: { flexDirection: "row", alignItems: "center", gap: space(3) },
    titel: { fontSize: 18, fontWeight: "800", color: c.text },
    meta: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    label: { fontSize: 13, fontWeight: "800", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: space(4) },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
    chip: { paddingHorizontal: space(3.5), paddingVertical: space(2.5), borderRadius: radius.full },
    stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.card, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, paddingHorizontal: space(2) },
    stepBtn: { padding: space(3) },
    stepWert: { fontSize: 16, fontWeight: "700", color: c.text },
  });
