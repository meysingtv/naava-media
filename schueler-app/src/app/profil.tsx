import { useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";

import { Button, Row, Screen, Section, Segmented } from "@/components/ui";
import { ladeSchueler, ladeSchule } from "@/lib/daten";
import { mitteilungenAnfordern, mitteilungenErlaubt, planeErinnerungen } from "@/lib/mitteilungen";
import { supabase } from "@/lib/supabase";
import { useLoader } from "@/lib/use-loader";
import { useTheme, type ThemeMode } from "@/lib/theme-context";
import { space } from "@/lib/theme";

export default function ProfilScreen() {
  const { mode, setMode } = useTheme();
  const schueler = useLoader(ladeSchueler, { cacheKey: "s-schueler" });
  const schule = useLoader(ladeSchule, { cacheKey: "s-schule" });
  const [erlaubt, setErlaubt] = useState(false);

  useEffect(() => {
    mitteilungenErlaubt().then(setErlaubt);
  }, []);

  async function aktivieren() {
    const ok = await mitteilungenAnfordern();
    setErlaubt(ok);
    if (ok) {
      await planeErinnerungen();
      Alert.alert("Mitteilungen aktiv", "Du wirst eine Stunde vor jeder Fahrstunde erinnert und erfährst sofort, wenn deine Anfrage beantwortet ist.");
    } else {
      Alert.alert("Nicht erlaubt", "Bitte Mitteilungen in den iOS-Einstellungen für Fahrbar erlauben.");
    }
  }

  function abmelden() {
    Alert.alert("Abmelden", "Möchtest du dich wirklich abmelden?", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Abmelden", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  }

  const s = schueler.data;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }}>
        <Section title="Ich">
          <Row title="Name" value={s ? `${s.vorname} ${s.nachname}` : "—"} />
          <Row title="E-Mail" value={s?.email ?? "—"} />
          <Row title="Klasse" value={s?.fuehrerscheinklassen?.join(", ") || "—"} />
        </Section>

        <Section title="Fahrschule">
          <Row title="Name" value={schule.data?.name ?? "—"} />
          <Row title="Ort" value={schule.data?.ort ?? "—"} />
        </Section>

        <Section title="Mitteilungen">
          {erlaubt ? (
            <Row title="Erinnerungen und Antworten" value="Aktiv" />
          ) : (
            <Row title="Mitteilungen erlauben" chevron onPress={aktivieren} />
          )}
        </Section>

        <Section title="Darstellung">
          <View style={{ padding: space(3) }}>
            <Segmented<ThemeMode>
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Hell" },
                { value: "dark", label: "Dunkel" },
              ]}
              value={mode}
              onChange={setMode}
            />
          </View>
        </Section>

        <Button title="Abmelden" variant="plain" destructive onPress={abmelden} />
      </ScrollView>
    </Screen>
  );
}
