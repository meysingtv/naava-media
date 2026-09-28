import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "@/components/grafik";
import { Icon } from "@/components/icon";
import { Oder, SozialAnmeldung } from "@/components/sozial-anmeldung";
import { Eingabe, Knopf, Kopf, PasswortEingabe, T } from "@/components/ui";
import { tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { serverVerbunden } from "@/lib/supabase";
import { abstand, farben, RAND, schrift } from "@/lib/theme";

export default function Anmelden() {
  const insets = useSafeAreaInsets();
  const { anmelden, passwortVergessen, gast, session } = useKonto();
  // Kam man aus dem Gastmodus (z. B. von den Clips), geht es danach dorthin zurück.
  const [ausGastmodus] = useState(gast);
  const [fertig, setFertig] = useState(false);

  // Erst weiter, wenn die Anmeldung wirklich da ist (sonst blockiert die Navigation).
  useEffect(() => {
    if (!fertig || !session) return;
    if (ausGastmodus && router.canGoBack()) router.back();
    else router.replace("/heute");
  }, [fertig, session, ausGastmodus]);
  const [kennung, setKennung] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  async function los() {
    setFehler(null);
    setLaedt(true);
    const f = await anmelden(kennung, passwort);
    setLaedt(false);
    if (f) {
      setFehler(f);
      return;
    }
    setFertig(true);
  }

  async function vergessen() {
    if (!/\S+@\S+\.\S+/.test(kennung.trim())) {
      setFehler("Gib oben deine E-Mail-Adresse ein – dann schicken wir dir einen Link zum Zurücksetzen.");
      return;
    }
    const f = await passwortVergessen(kennung);
    if (f) setFehler(f);
    else Alert.alert("E-Mail ist unterwegs", "Wir haben dir einen Link zum Zurücksetzen deines Passworts geschickt.");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: farben.grund }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Kopf />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(2), paddingBottom: insets.bottom + abstand(8), gap: abstand(4) }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginBottom: abstand(2) }}>
          <Logo groesse={34} />
        </View>

        {!serverVerbunden ? (
          <View style={{ flexDirection: "row", gap: abstand(2), padding: abstand(3.5), borderRadius: 14, backgroundColor: farben.gelbSoft }}>
            <Icon name="cloud-offline-outline" size={18} color={farben.gelb} />
            <T v="klein" farbe={farben.gelb} style={{ flex: 1 }}>
              Die App ist noch mit keinem Server verbunden. Anmelden klappt erst danach.
            </T>
          </View>
        ) : null}

        <View style={{ gap: abstand(1) }}>
          <T v="display">Anmelden</T>
          <T v="text">Willkommen zurück! Mach da weiter, wo du aufgehört hast.</T>
        </View>

        <View style={{ gap: abstand(3), marginTop: abstand(2) }}>
          <Eingabe
            icon="person-outline"
            value={kennung}
            onChangeText={setKennung}
            placeholder="E-Mail oder Benutzername"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            autoComplete="username"
            returnKeyType="next"
          />
          <PasswortEingabe value={passwort} onChangeText={setPasswort} placeholder="Passwort" returnKeyType="go" onSubmitEditing={los} />
          <Pressable onPress={vergessen} hitSlop={8} style={{ alignSelf: "flex-end", paddingVertical: abstand(1) }}>
            <T v="klein" farbe={farben.orange} style={{ ...schrift.textHalb, fontSize: 14 }}>
              Passwort vergessen?
            </T>
          </Pressable>
        </View>

        {fehler ? (
          <T v="klein" farbe={farben.rot} style={{ ...schrift.textHalb }}>
            {fehler}
          </T>
        ) : null}

        <Knopf titel="Anmelden" laedt={laedt} deaktiviert={!kennung.trim() || !passwort} onPress={los} />

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, paddingVertical: abstand(1) }}>
          <T v="text" farbe={farben.text3}>
            Kein Konto?
          </T>
          <Pressable
            onPress={() => {
              tippen();
              router.replace("/registrieren");
            }}
            hitSlop={8}
          >
            <T v="textStark" farbe={farben.orange}>
              Registrieren
            </T>
          </Pressable>
        </View>

        <Oder />
        <SozialAnmeldung onAngemeldet={() => setFertig(true)} onFehler={setFehler} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
