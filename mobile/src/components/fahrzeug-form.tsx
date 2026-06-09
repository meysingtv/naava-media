import { useState } from "react";
import { Alert, ScrollView, View } from "react-native";

import { Button, Screen, Section } from "@/components/ui";
import { FieldRow, SwitchRow } from "@/components/form-fields";
import { space } from "@/lib/theme";

export type FahrzeugWerte = {
  kennzeichen: string;
  marke: string;
  modell: string;
  klasse: string;
  aktiv: boolean;
};

export function FahrzeugForm({
  initial,
  speichernText,
  onSpeichern,
  onLoeschen,
}: {
  initial: FahrzeugWerte;
  speichernText: string;
  onSpeichern: (werte: FahrzeugWerte) => Promise<string | null>;
  onLoeschen?: () => void;
}) {
  const [kennzeichen, setKennzeichen] = useState(initial.kennzeichen);
  const [marke, setMarke] = useState(initial.marke);
  const [modell, setModell] = useState(initial.modell);
  const [klasse, setKlasse] = useState(initial.klasse);
  const [aktiv, setAktiv] = useState(initial.aktiv);
  const [speichert, setSpeichert] = useState(false);

  async function speichern() {
    if (!kennzeichen.trim()) {
      Alert.alert("Fehlende Angabe", "Bitte ein Kennzeichen eingeben.");
      return;
    }
    setSpeichert(true);
    const fehler = await onSpeichern({ kennzeichen: kennzeichen.trim(), marke, modell, klasse, aktiv });
    setSpeichert(false);
    if (fehler) Alert.alert("Fehler", fehler);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }} keyboardShouldPersistTaps="handled">
        <Section>
          <FieldRow label="Kennzeichen" value={kennzeichen} onChangeText={setKennzeichen} placeholder="MG-AB-123" autoCapitalize="characters" />
          <FieldRow label="Marke" value={marke} onChangeText={setMarke} placeholder="VW" />
          <FieldRow label="Modell" value={modell} onChangeText={setModell} placeholder="Golf" />
          <FieldRow label="Klasse" value={klasse} onChangeText={setKlasse} placeholder="B" autoCapitalize="characters" />
        </Section>

        <Section>
          <SwitchRow label="Aktiv" value={aktiv} onValueChange={setAktiv} />
        </Section>

        <View style={{ gap: space(2), marginTop: space(2) }}>
          <Button title={speichernText} onPress={speichern} loading={speichert} />
          {onLoeschen ? <Button title="Fahrzeug löschen" variant="plain" destructive onPress={onLoeschen} /> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
