import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Button, Screen, Section } from "@/components/ui";
import { FieldRow } from "@/components/form-fields";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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
      setFehler(`Verbindungsfehler: ${msg}`);
    } finally {
      setLaedt(false);
    }
  }

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "center", padding: space(4) }}
        >
          <View style={{ alignItems: "center", marginBottom: space(8) }}>
            <Text style={{ fontSize: 30, fontWeight: "700", color: colors.text }}>FahrschulApp</Text>
            <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: space(2), textAlign: "center" }}>
              Melde dich an, um deine Fahrschule zu verwalten.
            </Text>
          </View>

          {fehler ? (
            <Text style={{ color: colors.danger, textAlign: "center", marginBottom: space(3), fontSize: 14 }}>{fehler}</Text>
          ) : null}

          <Section>
            <FieldRow
              label="E-Mail"
              value={email}
              onChangeText={setEmail}
              placeholder="name@fahrschule.de"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <FieldRow
              label="Passwort"
              value={passwort}
              onChangeText={setPasswort}
              placeholder="••••••••"
              secureTextEntry
              textContentType="password"
              onSubmitEditing={anmelden}
            />
          </Section>

          <Button title="Anmelden" onPress={anmelden} loading={laedt} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}
