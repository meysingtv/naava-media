import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Button, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme-context";
import { radius, space, type ThemeColors } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  async function anmelden() {
    setFehler(null);
    setLaedt(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: passwort });
      if (error) {
        setFehler(error.message);
        return;
      }
      router.replace("/(tabs)/heute");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFehler(`Verbindungsfehler: ${msg}\nPrüfe die Supabase-Werte in mobile/.env.`);
    } finally {
      setLaedt(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.container}>
        <View style={s.header}>
          <Text style={s.logo}>FahrschulApp</Text>
          <Text style={s.subtitle}>Melde dich an, um deine Fahrschule zu verwalten.</Text>
        </View>

        <View style={s.form}>
          {fehler ? <Text style={s.fehler}>{fehler}</Text> : null}

          <View style={s.field}>
            <Text style={s.label}>E-Mail</Text>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="name@fahrschule.de"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Passwort</Text>
            <Input
              value={passwort}
              onChangeText={setPasswort}
              placeholder="••••••••"
              secureTextEntry
              textContentType="password"
              onSubmitEditing={anmelden}
            />
          </View>

          <Button title="Anmelden" onPress={anmelden} loading={laedt} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    container: { flex: 1, justifyContent: "center", padding: space(6), gap: space(8) },
    header: { alignItems: "center", gap: space(2) },
    logo: { fontSize: 32, fontWeight: "800", color: c.brand },
    subtitle: { fontSize: 15, color: c.textMuted, textAlign: "center" },
    form: { gap: space(4) },
    field: { gap: space(1.5) },
    label: { fontSize: 13, fontWeight: "600", color: c.text },
    fehler: {
      backgroundColor: c.danger,
      color: "#FFFFFF",
      padding: space(3),
      borderRadius: radius.md,
      fontSize: 14,
      overflow: "hidden",
    },
  });
