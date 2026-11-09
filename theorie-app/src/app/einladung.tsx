import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { AuthRahmen, Feld, FeldHinweis, Wechsel } from "@/components/auth-rahmen";
import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { Knopf, T } from "@/components/ui";
import { useKonto } from "@/lib/konto";
import { abstand, farben, radius } from "@/lib/theme";
import { einladungEinloesen, einladungInfo, einladungMerken } from "@/lib/verwaltung";

/**
 * Einladung der Fahrschule (QR-Code oder Link spur://einladung?code=…).
 * Angemeldet: gleich annehmen. Sonst merkt sich die App den Code, und er wird
 * nach dem Registrieren bzw. Anmelden automatisch eingelöst (HinweisBruecke).
 */
export default function EinladungSeite() {
  const params = useLocalSearchParams<{ code?: string }>();
  const { drin, gast } = useKonto();
  const angemeldet = drin && !gast;
  const [code, setCode] = useState((params.code ?? "").toUpperCase());
  const [info, setInfo] = useState<{ fahrlehrer: string } | null | undefined>(undefined);
  const [laedt, setLaedt] = useState(false);

  const gueltigeForm = /^[A-Z2-9]{8}$/.test(code.trim());

  useEffect(() => {
    setInfo(undefined);
    if (!gueltigeForm) return;
    let aus = false;
    einladungInfo(code.trim())
      .then((i) => !aus && setInfo(i))
      .catch(() => !aus && setInfo(null));
    return () => {
      aus = true;
    };
  }, [code, gueltigeForm]);

  async function annehmen() {
    setLaedt(true);
    try {
      const lehrer = await einladungEinloesen(code.trim());
      dialog("Einladung angenommen", lehrer ? `Du bist jetzt bei ${lehrer} angemeldet.` : "Du bist jetzt bei deiner Fahrschule angemeldet.", [{ text: "Los geht's", onPress: () => router.replace("/heute") }]);
    } catch (e) {
      dialog("Einladung", e instanceof Error ? e.message : String(e));
    } finally {
      setLaedt(false);
    }
  }

  async function weiter(ziel: "/registrieren" | "/anmelden") {
    await einladungMerken(code.trim());
    router.replace(ziel);
  }

  return (
    <AuthRahmen titel="Einladung" unter="Deine Fahrschule hat dich eingeladen." onZurueck={() => (router.canGoBack() ? router.back() : router.replace("/"))}>
      <View style={{ gap: abstand(5), marginTop: abstand(2) }}>
        <View>
          <Feld
            label="Einladungscode"
            icon="ticket-outline"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
            placeholder="z. B. K7MP3QXA"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {code.length > 0 && !gueltigeForm ? <FeldHinweis text="Der Code hat 8 Zeichen." /> : null}
        </View>

        {gueltigeForm && info === undefined ? (
          <View style={{ paddingVertical: abstand(3) }}>
            <ActivityIndicator color={farben.orange} />
          </View>
        ) : null}

        {gueltigeForm && info === null ? (
          <View style={{ flexDirection: "row", gap: abstand(2), padding: abstand(3.5), borderRadius: radius.m, backgroundColor: farben.rotSoft }}>
            <Icon name="alert-circle" size={18} color={farben.rot} />
            <T v="klein" farbe={farben.rot} style={{ flex: 1 }}>
              Diese Einladung gilt nicht mehr. Frag deine Fahrschule nach einem neuen Code.
            </T>
          </View>
        ) : null}

        {info ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(3), padding: abstand(4), borderRadius: radius.l, backgroundColor: farben.gruenSoft }}>
            <Icon name="checkmark-circle" size={26} color={farben.gruen} />
            <View style={{ flex: 1 }}>
              <T v="textStark">{info.fahrlehrer ? `Fahrlehrer: ${info.fahrlehrer}` : "Einladung deiner Fahrschule"}</T>
              <T v="klein" farbe={farben.text2}>
                {angemeldet ? "Nimm sie an, dann bist du direkt zugeordnet." : "Erstell ein Konto oder melde dich an – die Einladung wird danach automatisch angenommen."}
              </T>
            </View>
          </View>
        ) : null}

        {info ? (
          angemeldet ? (
            <Knopf titel="Einladung annehmen" icon="checkmark" onPress={annehmen} laedt={laedt} />
          ) : (
            <View style={{ gap: abstand(2) }}>
              <Knopf titel="Konto erstellen" onPress={() => weiter("/registrieren")} />
              <Wechsel frage="Schon ein Konto?" aktion="Anmelden" onPress={() => weiter("/anmelden")} />
            </View>
          )
        ) : null}
      </View>
    </AuthRahmen>
  );
}
