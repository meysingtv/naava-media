import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";

import { Eingabe, Knopf, Kopf, T } from "@/components/ui";
import { useKonto } from "@/lib/konto";
import { abstand, farben, RAND, schrift } from "@/lib/theme";

export default function Anmelden() {
  const { anmelden, passwortVergessen } = useKonto();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  async function los() {
    setFehler(null);
    setLaedt(true);
    const f = await anmelden(email, passwort);
    setLaedt(false);
    if (f) setFehler(f);
  }

  async function vergessen() {
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setFehler("Gib oben deine E-Mail-Adresse ein – dann schicken wir dir einen Link.");
      return;
    }
    const f = await passwortVergessen(email);
    if (f) setFehler(f);
    else Alert.alert("E-Mail ist unterwegs", "Wir haben dir einen Link zum Zurücksetzen deines Passworts geschickt.");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: farben.grund }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Kopf />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(4), gap: abstand(4) }} keyboardShouldPersistTaps="handled">
        <T v="titel">Willkommen zurück.</T>
        <T v="text">Melde dich an und mach da weiter, wo du aufgehört hast.</T>
        <View style={{ gap: abstand(3), marginTop: abstand(2) }}>
          <Eingabe
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="E-Mail"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            autoFocus
          />
          <Eingabe
            icon="lock-closed-outline"
            value={passwort}
            onChangeText={setPasswort}
            placeholder="Passwort"
            secureTextEntry
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={los}
          />
        </View>
        {fehler ? (
          <T v="klein" farbe={farben.rot} style={{ fontFamily: schrift.textHalb }}>
            {fehler}
          </T>
        ) : null}
        <Knopf titel="Anmelden" laedt={laedt} deaktiviert={!email || !passwort} onPress={los} />
        <Pressable onPress={vergessen} hitSlop={8} style={{ alignSelf: "center", paddingVertical: abstand(2) }}>
          <T v="klein" farbe={farben.text2} style={{ fontFamily: schrift.textHalb }}>
            Passwort vergessen?
          </T>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
