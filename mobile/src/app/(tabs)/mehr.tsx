import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button, Card, Segmented } from "@/components/ui";
import { useLoader } from "@/lib/use-loader";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { erinnerungenAnfordern, erinnerungenErlaubt, planeErinnerungen } from "@/lib/notifications";
import { useTheme, type ThemeMode } from "@/lib/theme-context";
import { space, type ThemeColors } from "@/lib/theme";

export default function MehrScreen() {
  const { colors, mode, setMode } = useTheme();
  const { session } = useAuth();
  const s = useMemo(() => makeStyles(colors), [colors]);

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
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.sektion}>Konto</Text>
      <Card>
        <View style={s.zeile}>
          <Text style={s.label}>Fahrschule</Text>
          <Text style={s.wert} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <View style={s.trenner} />
        <View style={s.zeile}>
          <Text style={s.label}>Angemeldet als</Text>
          <Text style={s.wert} numberOfLines={1}>
            {session?.user.email ?? "—"}
          </Text>
        </View>
      </Card>

      <Text style={s.sektion}>Darstellung</Text>
      <Card>
        <Segmented<ThemeMode>
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Hell" },
            { value: "dark", label: "Dunkel" },
          ]}
          value={mode}
          onChange={setMode}
        />
      </Card>

      <Text style={s.sektion}>Benachrichtigungen</Text>
      <Card>
        {erinnerungen ? (
          <View style={s.zeile}>
            <Text style={s.label}>Fahrstunden-Erinnerungen</Text>
            <Text style={[s.wert, { color: colors.success }]}>Aktiv ✓</Text>
          </View>
        ) : (
          <Button title="Erinnerungen aktivieren" variant="ghost" onPress={erinnerungenAktivieren} />
        )}
      </Card>

      <View style={{ marginTop: space(4) }}>
        <Button title="Abmelden" variant="danger" onPress={abmelden} />
      </View>

      <Text style={s.version}>FahrschulApp · Version 1.0.0</Text>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space(4), gap: space(2) },
    sektion: {
      fontSize: 13,
      fontWeight: "800",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: space(3),
    },
    zeile: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space(3) },
    label: { fontSize: 15, color: c.textMuted },
    wert: { fontSize: 15, fontWeight: "600", color: c.text, flexShrink: 1, textAlign: "right" },
    trenner: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: space(3) },
    version: { textAlign: "center", color: c.textMuted, fontSize: 12, marginTop: space(6) },
  });
