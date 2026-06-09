import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { supabase } from "@/lib/supabase";
import { colors, radius, space } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  async function anmelden() {
    setFehler(null);
    setLaedt(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: passwort,
    });
    setLaedt(false);
    if (error) {
      setFehler("Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.");
      return;
    }
    router.replace("/(tabs)/heute");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>FahrschulApp</Text>
          <Text style={styles.subtitle}>Melde dich an, um deine Fahrschule zu verwalten.</Text>
        </View>

        <View style={styles.form}>
          {fehler ? <Text style={styles.fehler}>{fehler}</Text> : null}

          <View style={styles.field}>
            <Text style={styles.label}>E-Mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="name@fahrschule.de"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Passwort</Text>
            <TextInput
              style={styles.input}
              value={passwort}
              onChangeText={setPasswort}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              textContentType="password"
              onSubmitEditing={anmelden}
            />
          </View>

          <Pressable
            style={[styles.button, laedt && styles.buttonDisabled]}
            onPress={anmelden}
            disabled={laedt}
          >
            {laedt ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Anmelden</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, justifyContent: "center", padding: space(6), gap: space(8) },
  header: { alignItems: "center", gap: space(2) },
  logo: { fontSize: 30, fontWeight: "800", color: colors.brand },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: "center" },
  form: { gap: space(4) },
  field: { gap: space(1.5) },
  label: { fontSize: 13, fontWeight: "600", color: colors.text },
  input: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space(3.5),
    paddingVertical: space(3.5),
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: space(4),
    alignItems: "center",
    marginTop: space(2),
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  fehler: {
    backgroundColor: "#FEE2E2",
    color: colors.danger,
    padding: space(3),
    borderRadius: radius.md,
    fontSize: 14,
  },
});
