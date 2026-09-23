import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Button, Screen, Section, Segmented } from "@/components/ui";
import { FieldRow } from "@/components/form-fields";
import { Wortmarke } from "@/components/wortmarke";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";

type Modus = "anmelden" | "registrieren";

/**
 * Anmeldung für Fahrschüler – wie im Web-Portal: E-Mail und Passwort, beim
 * ersten Mal dazu der Zugangscode der Fahrschule. Konten ohne Verknüpfung
 * zu einem Fahrschüler (z. B. Fahrlehrer) kommen nicht hinein.
 */
export default function LoginScreen() {
  const { colors } = useTheme();
  const { session, verknuepft, pruefen } = useAuth();
  const [modus, setModus] = useState<Modus>("anmelden");
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [code, setCode] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  useEffect(() => {
    if (session && verknuepft) router.replace("/(tabs)/start");
  }, [session, verknuepft]);

  async function verknuepfenOderAbbrechen(zugangscode: string, meldung: string): Promise<boolean> {
    if (zugangscode) await supabase.rpc("schueler_portal_verknuepfen", { p_code: zugangscode });
    if (await pruefen()) return true;
    await supabase.auth.signOut();
    setFehler(meldung);
    return false;
  }

  async function los() {
    setFehler(null);
    setHinweis(null);
    const mail = email.trim();
    const zugangscode = code.trim().toUpperCase();
    if (!mail || !passwort) {
      setFehler("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    setLaedt(true);
    try {
      if (modus === "anmelden") {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password: passwort });
        if (error) {
          setFehler("E-Mail oder Passwort ist falsch.");
          return;
        }
        await verknuepfenOderAbbrechen(
          zugangscode,
          "Dieses Konto ist mit keinem Fahrschüler verknüpft. Bitte gib den Zugangscode deiner Fahrschule ein.",
        );
        return;
      }

      if (passwort.length < 8) {
        setFehler("Das Passwort muss mindestens 8 Zeichen haben.");
        return;
      }
      if (!zugangscode) {
        setFehler("Bitte den Zugangscode aus deiner Fahrschule eingeben.");
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email: mail, password: passwort });
      if (error) {
        setFehler(error.message);
        return;
      }
      if (data.session) {
        await verknuepfenOderAbbrechen(zugangscode, "Der Zugangscode ist ungültig oder bereits vergeben.");
      } else {
        setModus("anmelden");
        setHinweis("Konto erstellt! Bestätige deine E-Mail-Adresse und melde dich danach hier mit deinem Zugangscode an.");
      }
    } catch {
      setFehler("Keine Verbindung. Bitte prüfe dein Internet.");
    } finally {
      setLaedt(false);
    }
  }

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: space(4) }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ alignItems: "center", marginBottom: space(8) }}>
              <Wortmarke groesse={40} />
              <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: space(3), textAlign: "center" }}>
                Termine, Fortschritt und Rechnungen – deine Fahrschule in der Tasche.
              </Text>
            </View>

            <View style={{ marginBottom: space(5) }}>
              <Segmented<Modus>
                options={[
                  { value: "anmelden", label: "Anmelden" },
                  { value: "registrieren", label: "Konto erstellen" },
                ]}
                value={modus}
                onChange={(m) => {
                  setModus(m);
                  setFehler(null);
                  setHinweis(null);
                }}
              />
            </View>

            {fehler ? (
              <Text style={{ color: colors.danger, textAlign: "center", marginBottom: space(3), fontSize: 14 }}>{fehler}</Text>
            ) : null}
            {hinweis ? (
              <Text style={{ color: colors.success, textAlign: "center", marginBottom: space(3), fontSize: 14 }}>{hinweis}</Text>
            ) : null}

            <Section footer="Den Zugangscode bekommst du von deiner Fahrschule. Nach dem ersten Mal brauchst du ihn nicht mehr.">
              <FieldRow
                label="E-Mail"
                value={email}
                onChangeText={setEmail}
                placeholder="name@beispiel.de"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
              />
              <FieldRow
                label="Passwort"
                value={passwort}
                onChangeText={setPasswort}
                placeholder={modus === "registrieren" ? "mindestens 8 Zeichen" : "Passwort"}
                secureTextEntry
                textContentType={modus === "registrieren" ? "newPassword" : "password"}
              />
              <FieldRow
                label="Code"
                value={code}
                onChangeText={setCode}
                placeholder={modus === "anmelden" ? "nur beim ersten Mal" : "von deiner Fahrschule"}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </Section>

            <Button title={modus === "anmelden" ? "Anmelden" : "Konto erstellen"} onPress={los} loading={laedt} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}
