import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";

import { AuthRahmen, Feld, PasswortFeld, Wechsel } from "@/components/auth-rahmen";
import { Icon } from "@/components/icon";
import { Oder, SozialAnmeldung } from "@/components/sozial-anmeldung";
import { Knopf, T } from "@/components/ui";
import { dialog } from "@/components/dialog";
import { useKonto } from "@/lib/konto";
import { serverVerbunden } from "@/lib/supabase";
import { abstand, farben, schrift } from "@/lib/theme";

export default function Anmelden() {
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
    else dialog("E-Mail ist unterwegs", "Wir haben dir einen Link zum Zurücksetzen deines Passworts geschickt.");
  }

  return (
    <AuthRahmen titel="Anmelden" unter="Willkommen zurück! Mach da weiter, wo du aufgehört hast.">
      {!serverVerbunden ? (
        <View style={{ flexDirection: "row", gap: abstand(2), padding: abstand(3.5), borderRadius: 14, backgroundColor: farben.gelbSoft }}>
          <Icon name="cloud-offline-outline" size={18} color={farben.gelb} />
          <T v="klein" farbe={farben.gelb} style={{ flex: 1 }}>
            Die App ist noch mit keinem Server verbunden. Anmelden klappt erst danach.
          </T>
        </View>
      ) : null}

      <View style={{ gap: abstand(5), marginTop: abstand(2) }}>
        <Feld
          label="E-Mail oder Benutzername"
          icon="person-outline"
          value={kennung}
          onChangeText={setKennung}
          placeholder="name@beispiel.de oder @name"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
          autoComplete="username"
          returnKeyType="next"
        />
        <PasswortFeld label="Passwort" value={passwort} onChangeText={setPasswort} placeholder="Dein Passwort" returnKeyType="go" onSubmitEditing={los} />
      </View>
      <Pressable onPress={vergessen} hitSlop={8} style={{ alignSelf: "flex-end", marginTop: -abstand(1) }}>
        <T v="klein" farbe={farben.orange} style={{ ...schrift.textHalb, fontSize: 14 }}>
          Passwort vergessen?
        </T>
      </Pressable>

      {fehler ? (
        <T v="klein" farbe={farben.rot} style={{ ...schrift.textHalb }}>
          {fehler}
        </T>
      ) : null}

      <Knopf titel="Anmelden" icon="arrow-forward" laedt={laedt} deaktiviert={!kennung.trim() || !passwort} onPress={los} style={{ marginTop: abstand(1) }} />
      <Wechsel frage="Kein Konto?" aktion="Registrieren" onPress={() => router.replace("/registrieren")} />

      <Oder />
      <SozialAnmeldung onAngemeldet={() => setFertig(true)} onFehler={setFehler} />
    </AuthRahmen>
  );
}
