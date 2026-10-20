import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { Button, Row, Screen, Section } from "@/components/ui";
import { DateRow, FieldRow, SwitchRow } from "@/components/form-fields";
import { KLASSEN } from "@/lib/constants";
import { heuteISO } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";

export type SchuelerWerte = {
  vorname: string;
  nachname: string;
  telefon: string;
  email: string;
  fuehrerscheinklassen: string[];
  theorie_bestanden: boolean;
  pruefung_termin: string | null;
};

export function SchuelerForm({
  initial,
  speichernText,
  onSpeichern,
  onLoeschen,
}: {
  initial: SchuelerWerte;
  speichernText: string;
  onSpeichern: (werte: SchuelerWerte) => Promise<string | null>;
  onLoeschen?: () => void;
}) {
  const { colors } = useTheme();
  const [vorname, setVorname] = useState(initial.vorname);
  const [nachname, setNachname] = useState(initial.nachname);
  const [telefon, setTelefon] = useState(initial.telefon);
  const [email, setEmail] = useState(initial.email);
  const [klassen, setKlassen] = useState<string[]>(initial.fuehrerscheinklassen);
  const [theorie, setTheorie] = useState(initial.theorie_bestanden);
  const [pruefungAn, setPruefungAn] = useState(Boolean(initial.pruefung_termin));
  const [pruefungDatum, setPruefungDatum] = useState(initial.pruefung_termin ?? heuteISO());
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
      telefon,
      email,
      fuehrerscheinklassen: klassen,
      theorie_bestanden: theorie,
      pruefung_termin: pruefungAn ? pruefungDatum : null,
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
          <FieldRow
            label="E-Mail"
            value={email}
            onChangeText={setEmail}
            placeholder="name@mail.de"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Section>

        <Section title="Führerscheinklassen">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space(2), padding: space(3) }}>
            {KLASSEN.map((k) => {
              const aktiv = klassen.includes(k);
              return (
                <Pressable
                  key={k}
                  onPress={() => toggleKlasse(k)}
                  style={{
                    paddingHorizontal: space(3.5),
                    paddingVertical: space(2),
                    borderRadius: radius.full,
                    backgroundColor: aktiv ? colors.accent : colors.fill,
                  }}
                >
                  <Text style={{ color: aktiv ? colors.onAccent : colors.text, fontWeight: "500", fontSize: 14 }}>{k}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section title="Status">
          <SwitchRow label="Theorie bestanden" value={theorie} onValueChange={setTheorie} />
          <SwitchRow label="Prüfungstermin festlegen" value={pruefungAn} onValueChange={setPruefungAn} />
          {pruefungAn ? <DateRow label="Prüfung am" value={pruefungDatum} onChange={setPruefungDatum} /> : null}
        </Section>

        <View style={{ gap: space(2), marginTop: space(2) }}>
          <Button title={speichernText} onPress={speichern} loading={speichert} />
          {onLoeschen ? <Button title="Schüler löschen" variant="plain" destructive onPress={onLoeschen} /> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
