import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Row, Screen, ScreenHeader, Section, Segmented } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { erinnerungenAnfordern, erinnerungenErlaubt, planeErinnerungen } from "@/lib/notifications";
import { useTheme, type ThemeMode } from "@/lib/theme-context";
import { space } from "@/lib/theme";

export default function MehrScreen() {
  const { colors, mode, setMode } = useTheme();
  const { session } = useAuth();
  const router = useRouter();

  const fahrschule = useLoader<{ name: string }[]>(
    () => supabase.from("fahrschule").select("name").limit(1).returns<{ name: string }[]>(),
    { cacheKey: "fahrschule-name" },
  );
  const name = fahrschule.data?.[0]?.name ?? "—";

  const [erinnerungen, setErinnerungen] = useState(false);
  useEffect(() => {
    erinnerungenErlaubt().then(setErinnerungen);
  }, []);

  async function erinnerungenAktivieren() {
    const ok = await erinnerungenAnfordern();
    setErinnerungen(ok);
    if (ok) {
      await planeErinnerungen();
      Alert.alert("Erinnerungen aktiv", "Du wirst 30 Minuten vor jeder geplanten Fahrstunde erinnert.");
    } else {
      Alert.alert("Nicht erlaubt", "Bitte Benachrichtigungen in den iOS-Einstellungen für FahrschulApp erlauben.");
    }
  }

  function abmelden() {
    Alert.alert("Abmelden", "Möchtest du dich wirklich abmelden?", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Abmelden", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  }

  return (
    <Screen>
      <ScreenHeader title="Mehr" />
      <ScrollView contentContainerStyle={{ paddingBottom: space(8) }}>
        <View style={{ paddingHorizontal: space(4) }}>
          <Section title="Konto">
            <Row title="Fahrschule" value={name} />
            <Row title="Angemeldet als" value={session?.user.email ?? "—"} />
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

          <Section title="Benachrichtigungen">
            {erinnerungen ? (
              <Row title="Fahrstunden-Erinnerungen" value="Aktiv" />
            ) : (
              <Row title="Erinnerungen aktivieren" chevron onPress={erinnerungenAktivieren} />
            )}
          </Section>

          <Section title="Verwaltung">
            <Row title="Fahrzeuge" chevron onPress={() => router.push("/fahrzeuge")} />
            <Row title="Team" chevron onPress={() => router.push("/team")} />
          </Section>

          <Section>
            <Row title="Abmelden" destructive onPress={abmelden} />
          </Section>

          <Text style={{ textAlign: "center", color: colors.textMuted, fontSize: 12 }}>FahrschulApp · Version 1.0.0</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
