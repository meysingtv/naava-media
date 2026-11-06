import { useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { AuthRahmen, CodeSchritt, Feld, Wechsel } from "@/components/auth-rahmen";
import { Icon } from "@/components/icon";
import { Knopf, T } from "@/components/ui";
import { AnmeldenWeb } from "@/components/web/auth-web";
import { useDesktop } from "@/lib/fenster";
import { useCodeAblauf, useKonto } from "@/lib/konto";
import { serverVerbunden } from "@/lib/supabase";
import { abstand, farben, schrift } from "@/lib/theme";

/** Anmelden ohne Passwort: E-Mail eingeben, Code aus der Mail eintippen. */
export default function Anmelden() {
  const { gast, session } = useKonto();
  // Kam man aus dem Gastmodus (z. B. von den Clips), geht es danach dorthin zurück.
  const [ausGastmodus] = useState(gast);
  const [fertig, setFertig] = useState(false);

  // Erst weiter, wenn die Anmeldung wirklich da ist (sonst blockiert die Navigation).
  useEffect(() => {
    if (!fertig || !session) return;
    if (ausGastmodus && router.canGoBack()) router.back();
    else router.replace("/heute");
  }, [fertig, session, ausGastmodus]);
  const [adresse, setAdresse] = useState("");
  const ablauf = useCodeAblauf();
  // Im Browser am PC: zweigeteilte Fassung (web/auth-web.tsx).
  const desktop = useDesktop();
  const adresseOk = /\S+@\S+\.\S+/.test(adresse.trim());

  function senden() {
    if (adresseOk && !ablauf.laedt) ablauf.senden(adresse);
  }

  if (desktop) return <AnmeldenWeb email={adresse} onEmail={setAdresse} ablauf={ablauf} onSenden={senden} onAngemeldet={() => setFertig(true)} />;

  if (ablauf.gesendetAn) return <CodeSchritt ablauf={ablauf} onAngemeldet={() => setFertig(true)} />;

  return (
    <AuthRahmen titel="Anmelden" unter="Willkommen zurück! Gib deine E-Mail ein – wir schicken dir einen Code, ganz ohne Passwort.">
      {!serverVerbunden ? (
        <View style={{ flexDirection: "row", gap: abstand(2), padding: abstand(3.5), borderRadius: 14, backgroundColor: farben.gelbSoft }}>
          <Icon name="cloud-offline-outline" size={18} color={farben.gelb} />
          <T v="klein" farbe={farben.gelb} style={{ flex: 1 }}>
            Die App ist noch mit keinem Server verbunden. Anmelden klappt erst danach.
          </T>
        </View>
      ) : null}

      <View style={{ marginTop: abstand(2) }}>
        <Feld
          label="E-Mail"
          icon="mail-outline"
          value={adresse}
          onChangeText={setAdresse}
          placeholder="name@beispiel.de"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="go"
          onSubmitEditing={senden}
        />
      </View>

      {ablauf.fehler ? (
        <T v="klein" farbe={farben.rot} style={{ ...schrift.textHalb }}>
          {ablauf.fehler}
        </T>
      ) : null}

      <Knopf titel="Code senden" icon="arrow-forward" laedt={ablauf.laedt} deaktiviert={!adresseOk} onPress={senden} style={{ marginTop: abstand(1) }} />
      <Wechsel frage="Kein Konto?" aktion="Registrieren" onPress={() => router.replace("/registrieren")} />
    </AuthRahmen>
  );
}
