import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button, Input, Segmented } from "@/components/ui";
import { DateField, PickerField, TimeField, type Option } from "@/components/form-fields";
import { TYP_LABEL } from "@/lib/constants";
import { useTheme } from "@/lib/theme-context";
import { radius, space, type ThemeColors } from "@/lib/theme";
import type { FahrstundeStatus, FahrstundeTyp } from "@/lib/types";

export type FahrstundeWerte = {
  schueler_id: string | null;
  fahrlehrer_id: string | null;
  fahrzeug_id: string | null;
  datum: string;
  uhrzeit: string;
  dauer_minuten: number;
  typ: FahrstundeTyp;
  status: FahrstundeStatus;
  notiz: string;
};

const TYP_REIHENFOLGE: FahrstundeTyp[] = ["normal", "ueberland", "autobahn", "nacht", "pruefung"];

export function FahrstundeForm({
  optionen,
  initial,
  speichernText,
  onSpeichern,
  onLoeschen,
}: {
  optionen: { schueler: Option[]; fahrlehrer: Option[]; fahrzeuge: Option[] };
  initial: FahrstundeWerte;
  speichernText: string;
  onSpeichern: (werte: FahrstundeWerte) => Promise<string | null>;
  onLoeschen?: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [schuelerId, setSchuelerId] = useState(initial.schueler_id);
  const [lehrerId, setLehrerId] = useState(initial.fahrlehrer_id);
  const [fahrzeugId, setFahrzeugId] = useState(initial.fahrzeug_id);
  const [datum, setDatum] = useState(initial.datum);
  const [uhrzeit, setUhrzeit] = useState(initial.uhrzeit);
  const [dauer, setDauer] = useState(initial.dauer_minuten);
  const [typ, setTyp] = useState(initial.typ);
  const [status, setStatus] = useState(initial.status);
  const [notiz, setNotiz] = useState(initial.notiz);
  const [speichert, setSpeichert] = useState(false);

  async function speichern() {
    setSpeichert(true);
    const fehler = await onSpeichern({
      schueler_id: schuelerId,
      fahrlehrer_id: lehrerId,
      fahrzeug_id: fahrzeugId,
      datum,
      uhrzeit,
      dauer_minuten: dauer,
      typ,
      status,
      notiz,
    });
    setSpeichert(false);
    if (fehler) Alert.alert("Fehler", fehler);
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <PickerField
        label="Schüler"
        value={schuelerId}
        options={optionen.schueler}
        onChange={setSchuelerId}
        placeholder="Schüler wählen"
        erlaubeLeer
      />
      <PickerField
        label="Fahrlehrer"
        value={lehrerId}
        options={optionen.fahrlehrer}
        onChange={setLehrerId}
        placeholder="Fahrlehrer wählen"
        erlaubeLeer
      />
      <PickerField
        label="Fahrzeug"
        value={fahrzeugId}
        options={optionen.fahrzeuge}
        onChange={setFahrzeugId}
        placeholder="Fahrzeug wählen"
        erlaubeLeer
      />

      <DateField label="Datum" value={datum} onChange={setDatum} />
      <TimeField label="Uhrzeit" value={uhrzeit} onChange={setUhrzeit} />

      <View style={{ gap: space(1.5) }}>
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
      </View>

      <View style={{ gap: space(1.5) }}>
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
      </View>

      <View style={{ gap: space(1.5) }}>
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
      </View>

      <View style={{ gap: space(1.5) }}>
        <Text style={s.label}>Notiz</Text>
        <Input
          value={notiz}
          onChangeText={setNotiz}
          placeholder="Was wurde geübt? (z. B. Einparken, Vorfahrt)"
          multiline
          style={{ minHeight: 90, textAlignVertical: "top" }}
        />
      </View>

      <View style={{ marginTop: space(4), gap: space(3) }}>
        <Button title={speichernText} onPress={speichern} loading={speichert} />
        {onLoeschen ? <Button title="Fahrstunde löschen" variant="danger" onPress={onLoeschen} /> : null}
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space(4), gap: space(4) },
    label: { fontSize: 13, fontWeight: "800", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: space(2) },
    chip: { paddingHorizontal: space(3.5), paddingVertical: space(2.5), borderRadius: radius.full },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.card,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: space(2),
    },
    stepBtn: { padding: space(3) },
    stepWert: { fontSize: 16, fontWeight: "700", color: c.text },
  });
