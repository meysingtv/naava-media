import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { Button, Screen, Section } from "@/components/ui";
import { FieldRow, PickerRow, SwitchRow } from "@/components/form-fields";
import { KLASSEN, ROLLEN } from "@/lib/constants";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";
import type { FahrlehrerRolle } from "@/lib/types";

export type TeamWerte = {
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  rolle: FahrlehrerRolle;
  fuehrerscheinklassen: string[];
  aktiv: boolean;
};

const ROLLEN_OPTIONEN = (Object.keys(ROLLEN) as FahrlehrerRolle[]).map((r) => ({ id: r, label: ROLLEN[r] }));

export function TeamForm({
  initial,
  speichernText,
  onSpeichern,
  onLoeschen,
}: {
  initial: TeamWerte;
  speichernText: string;
  onSpeichern: (werte: TeamWerte) => Promise<string | null>;
  onLoeschen?: () => void;
}) {
  const { colors } = useTheme();
  const [vorname, setVorname] = useState(initial.vorname);
  const [nachname, setNachname] = useState(initial.nachname);
  const [email, setEmail] = useState(initial.email);
  const [telefon, setTelefon] = useState(initial.telefon);
  const [rolle, setRolle] = useState<FahrlehrerRolle>(initial.rolle);
  const [klassen, setKlassen] = useState<string[]>(initial.fuehrerscheinklassen);
  const [aktiv, setAktiv] = useState(initial.aktiv);
  const [speichert, setSpeichert] = useState(false);

  function toggleKlasse(k: string) {
    setKlassen((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  async function speichern() {
    if (!vorname.trim() || !nachname.trim()) {
      Alert.alert("Fehlende Angabe", "Bitte Vor- und Nachnamen eingeben.");
      return;
    }
    setSpeichert(true);
    const fehler = await onSpeichern({
      vorname: vorname.trim(),
      nachname: nachname.trim(),
      email,
      telefon,
      rolle,
      fuehrerscheinklassen: klassen,
      aktiv,
    });
    setSpeichert(false);
    if (fehler) Alert.alert("Fehler", fehler);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }} keyboardShouldPersistTaps="handled">
        <Section>
          <FieldRow label="Vorname" value={vorname} onChangeText={setVorname} placeholder="Max" autoCapitalize="words" />
          <FieldRow label="Nachname" value={nachname} onChangeText={setNachname} placeholder="Mustermann" autoCapitalize="words" />
        </Section>

        <Section>
          <FieldRow label="Telefon" value={telefon} onChangeText={setTelefon} placeholder="0151 …" keyboardType="phone-pad" />
          <FieldRow label="E-Mail" value={email} onChangeText={setEmail} placeholder="name@mail.de" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <PickerRow label="Rolle" value={rolle} options={ROLLEN_OPTIONEN} onChange={(v) => v && setRolle(v as FahrlehrerRolle)} placeholder="Rolle" />
        </Section>

        <Section title="Führerscheinklassen">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space(2), padding: space(3) }}>
            {KLASSEN.map((k) => {
              const an = klassen.includes(k);
              return (
                <Pressable
                  key={k}
                  onPress={() => toggleKlasse(k)}
                  style={{ paddingHorizontal: space(3.5), paddingVertical: space(2), borderRadius: radius.full, backgroundColor: an ? colors.accent : colors.fill }}
                >
                  <Text style={{ color: an ? colors.onAccent : colors.text, fontWeight: "500", fontSize: 14 }}>{k}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section>
          <SwitchRow label="Aktiv" value={aktiv} onValueChange={setAktiv} />
        </Section>

        <View style={{ gap: space(2), marginTop: space(2) }}>
          <Button title={speichernText} onPress={speichern} loading={speichert} />
          {onLoeschen ? <Button title="Mitarbeiter löschen" variant="plain" destructive onPress={onLoeschen} /> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
