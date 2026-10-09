import { useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button, Row, Screen, Section, Segmented } from "@/components/ui";
import { DateRow, PickerRow, TimeRow, type Option } from "@/components/form-fields";
import { TYP_LABEL } from "@/lib/constants";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";
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
  footer,
}: {
  optionen: { schueler: Option[]; fahrlehrer: Option[]; fahrzeuge: Option[] };
  initial: FahrstundeWerte;
  speichernText: string;
  onSpeichern: (werte: FahrstundeWerte) => Promise<string | null>;
  onLoeschen?: () => void;
  footer?: ReactNode;
}) {
  const { colors } = useTheme();
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
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }} keyboardShouldPersistTaps="handled">
        <Section>
          <PickerRow label="Schüler" value={schuelerId} options={optionen.schueler} onChange={setSchuelerId} placeholder="Wählen" erlaubeLeer />
          <PickerRow label="Fahrlehrer" value={lehrerId} options={optionen.fahrlehrer} onChange={setLehrerId} placeholder="Wählen" erlaubeLeer />
          <PickerRow label="Fahrzeug" value={fahrzeugId} options={optionen.fahrzeuge} onChange={setFahrzeugId} placeholder="Wählen" erlaubeLeer />
        </Section>

        <Section>
          <DateRow label="Datum" value={datum} onChange={setDatum} />
          <TimeRow label="Uhrzeit" value={uhrzeit} onChange={setUhrzeit} />
          <Row
            title="Dauer"
            trailing={
              <View style={{ flexDirection: "row", alignItems: "center", gap: space(3) }}>
                <Pressable onPress={() => setDauer((d) => Math.max(15, d - 5))} hitSlop={6}>
                  <Ionicons name="remove-circle" size={26} color={colors.accent} />
                </Pressable>
                <Text style={{ fontSize: 16, color: colors.text, minWidth: 56, textAlign: "center" }}>{dauer} Min</Text>
                <Pressable onPress={() => setDauer((d) => d + 5)} hitSlop={6}>
                  <Ionicons name="add-circle" size={26} color={colors.accent} />
                </Pressable>
              </View>
            }
          />
        </Section>

        <Section title="Status">
          <View style={{ padding: space(3) }}>
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
        </Section>

        <Section title="Art der Fahrt">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space(2), padding: space(3) }}>
            {TYP_REIHENFOLGE.map((t) => {
              const aktiv = t === typ;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTyp(t)}
                  style={{
                    paddingHorizontal: space(3.5),
                    paddingVertical: space(2),
                    borderRadius: radius.full,
                    backgroundColor: aktiv ? colors.accent : colors.fill,
                  }}
                >
                  <Text style={{ color: aktiv ? colors.onAccent : colors.text, fontWeight: "500", fontSize: 14 }}>
                    {TYP_LABEL[t]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Notiz">
          <View style={{ padding: space(3) }}>
            <TextInput
              value={notiz}
              onChangeText={setNotiz}
              placeholder="Was wurde geübt? (z. B. Einparken, Vorfahrt)"
              placeholderTextColor={colors.textMuted}
              multiline
              style={{ fontSize: 16, color: colors.text, minHeight: 72, textAlignVertical: "top" }}
            />
          </View>
        </Section>

        {footer}

        <View style={{ gap: space(2), marginTop: space(2) }}>
          <Button title={speichernText} onPress={speichern} loading={speichert} />
          {onLoeschen ? <Button title="Fahrstunde löschen" variant="plain" destructive onPress={onLoeschen} /> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
