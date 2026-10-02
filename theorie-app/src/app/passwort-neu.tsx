import { useState } from "react";
import { KeyboardAvoidingView, ScrollView } from "react-native";
import { router } from "expo-router";

import { Knopf, Kopf, PasswortEingabe, T } from "@/components/ui";
import { dialog } from "@/components/dialog";
import { useKonto } from "@/lib/konto";
import { abstand, farben, RAND, schrift } from "@/lib/theme";

/** Nach dem Link „Passwort zurücksetzen“: neues Passwort festlegen. */
export default function PasswortNeu() {
  const { passwortAendern, passwortNeuErledigt } = useKonto();
  const [neu, setNeu] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function speichern() {
    setFehler(null);
    setLaedt(true);
    const f = await passwortAendern(neu);
    setLaedt(false);
    if (f) {
      setFehler(f);
      return;
    }
    passwortNeuErledigt();
    dialog("Passwort geändert", "Ab jetzt meldest du dich mit dem neuen Passwort an.");
    router.replace("/heute");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: farben.grund }} behavior="padding">
      <Kopf titel="Neues Passwort" ohneZurueck />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(4), gap: abstand(4) }} keyboardShouldPersistTaps="handled">
        <T v="titel">Leg ein neues Passwort fest.</T>
        <T v="text">Du bist über den Link aus der E-Mail angemeldet. Wähle jetzt ein neues Passwort mit mindestens 8 Zeichen.</T>
        <PasswortEingabe value={neu} onChangeText={setNeu} placeholder="Neues Passwort (mind. 8 Zeichen)" autoFocus returnKeyType="done" onSubmitEditing={speichern} />
        {fehler ? (
          <T v="klein" farbe={farben.rot} style={{ ...schrift.textHalb }}>
            {fehler}
          </T>
        ) : null}
        <Knopf titel="Passwort speichern" laedt={laedt} deaktiviert={neu.length < 8} onPress={speichern} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
