import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { Button, CenterInfo, Screen, Section, Segmented } from "@/components/ui";
import { DateRow, PickerRow, TimeRow } from "@/components/form-fields";
import { fahrstundeAnfragen, ladeLehrer, ladeRegeln } from "@/lib/daten";
import { heuteISO, plusTageISO } from "@/lib/format";
import { useLoader } from "@/lib/use-loader";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";

function datumIn(stunden: number): string {
  const d = new Date(Date.now() + stunden * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Wunschtermin anfragen: Datum, Uhrzeit, Dauer, optional Wunsch-Fahrlehrer
 * und eine Nachricht. Die Regeln (Freischaltung, Vorlauf, offene Anfragen)
 * prüft die Datenbank – hier werden sie nur vorab angezeigt.
 */
export default function AnfrageScreen() {
  const { colors } = useTheme();
  const regeln = useLoader(ladeRegeln, { cacheKey: "s-regeln" });
  const lehrer = useLoader(ladeLehrer, { cacheKey: "s-lehrer" });

  const vorlauf = regeln.data?.vorlaufStunden ?? 24;
  const minDatum = useMemo(() => datumIn(vorlauf), [vorlauf]);
  const maxDatum = useMemo(() => plusTageISO(heuteISO(), 90), []);

  const [datum, setDatum] = useState(minDatum);
  const [uhrzeit, setUhrzeit] = useState("16:00");
  const [dauer, setDauer] = useState<"45" | "90">("45");
  const [lehrerId, setLehrerId] = useState<string | null>(null);
  const [notiz, setNotiz] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [sendet, setSendet] = useState(false);

  useEffect(() => {
    if (datum < minDatum) setDatum(minDatum);
  }, [minDatum, datum]);

  async function senden() {
    setFehler(null);
    if (uhrzeit < "06:00" || uhrzeit > "21:00") {
      setFehler("Bitte eine Uhrzeit zwischen 6:00 und 21:00 Uhr wählen.");
      return;
    }
    setSendet(true);
    const meldung = await fahrstundeAnfragen({
      datum,
      uhrzeit,
      dauer: dauer === "90" ? 90 : 45,
      fahrlehrerId: lehrerId,
      notiz,
    });
    setSendet(false);
    if (meldung) {
      setFehler(meldung);
      return;
    }
    Alert.alert("Anfrage gesendet", "Sobald dein Fahrlehrer zusagt, steht die Stunde in deinen Terminen.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  }

  if (regeln.loading) return <CenterInfo loading />;
  if (!regeln.data?.erlaubt) {
    return <CenterInfo text="Online-Anfragen sind bei deiner Fahrschule gerade nicht freigeschaltet. Sprich deinen Fahrlehrer an." />;
  }
  const limit = regeln.data.offen >= regeln.data.maxOffen;

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }} keyboardShouldPersistTaps="handled">
          <Section
            title="Wunschtermin"
            footer={`Mindestens ${vorlauf} Std. im Voraus. Dein Fahrlehrer bestätigt den Termin – erst dann steht er fest.`}
          >
            <DateRow label="Datum" value={datum} onChange={setDatum} min={minDatum} max={maxDatum} />
            <TimeRow label="Uhrzeit" value={uhrzeit} onChange={setUhrzeit} />
          </Section>

          <Section title="Dauer">
            <View style={{ padding: space(3) }}>
              <Segmented<"45" | "90">
                options={[
                  { value: "45", label: "45 Min." },
                  { value: "90", label: "90 Min. (Doppelstunde)" },
                ]}
                value={dauer}
                onChange={setDauer}
              />
            </View>
          </Section>

          {(lehrer.data ?? []).length > 0 ? (
            <Section title="Fahrlehrer">
              <PickerRow
                label="Fahrlehrer"
                value={lehrerId}
                options={(lehrer.data ?? []).map((l) => ({ id: l.id, label: l.name }))}
                onChange={setLehrerId}
                placeholder="Egal"
                erlaubeLeer
                leerLabel="Egal – wer Zeit hat"
              />
            </Section>
          ) : null}

          <Section title="Nachricht (optional)">
            <TextInput
              value={notiz}
              onChangeText={setNotiz}
              placeholder="z. B. Abholung zu Hause, Autobahn üben"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              style={{ minHeight: 88, padding: space(4), fontSize: 16, color: colors.text, textAlignVertical: "top" }}
            />
          </Section>

          {fehler ? (
            <Text
              style={{
                color: colors.danger,
                fontSize: 14,
                marginBottom: space(3),
                backgroundColor: colors.danger + "14",
                padding: space(3),
                borderRadius: radius.md,
              }}
            >
              {fehler}
            </Text>
          ) : null}
          {limit ? (
            <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: space(3), textAlign: "center" }}>
              Du hast {regeln.data.offen} offene Anfragen – warte bitte auf eine Antwort.
            </Text>
          ) : null}

          <Button title="Anfrage senden" onPress={senden} loading={sendet} disabled={limit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
