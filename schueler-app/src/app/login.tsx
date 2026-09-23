import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Button, Input, Screen, Segmented } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme-context";
import { karte, space } from "@/lib/theme";

type Modus = "anmelden" | "registrieren";

/**
 * Anmeldung für Fahrschüler – wie im Web-Portal: E-Mail und Passwort, beim
 * ersten Mal dazu der Zugangscode der Fahrschule. Konten ohne Verknüpfung
 * zu einem Fahrschüler (z. B. Fahrlehrer) kommen nicht hinein.
 */
export default function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" bounces={false}>
          <LinearGradient
            colors={[colors.heroVon, colors.heroBis]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingTop: insets.top + space(12),
              paddingBottom: space(20),
              paddingHorizontal: space(6),
              borderBottomLeftRadius: 32,
              borderBottomRightRadius: 32,
              overflow: "hidden",
            }}
          >
            <View
              pointerEvents="none"
              style={{ position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(255,255,255,0.08)", top: -90, right: -90 }}
            />
            <View
              pointerEvents="none"
              style={{ position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.06)", bottom: -70, left: -50 }}
            />
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: space(5),
              }}
            >
              <Ionicons name="car-sport" size={34} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 34, fontWeight: "800", color: "#FFFFFF" }}>Willkommen!</Text>
            <Text style={{ fontSize: 16, color: "rgba(255,255,255,0.88)", marginTop: space(2), lineHeight: 22 }}>
              Deine Fahrstunden, dein Fortschritt und deine Rechnungen – alles an einem Ort.
            </Text>
          </LinearGradient>

          <View style={[karte(colors), { marginHorizontal: space(4), marginTop: -space(14), padding: space(5), gap: space(3.5) }]}>
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

            <Input
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="E-Mail"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
            />
            <Input
              icon="lock-closed-outline"
              value={passwort}
              onChangeText={setPasswort}
              placeholder={modus === "registrieren" ? "Passwort (mind. 8 Zeichen)" : "Passwort"}
              secureTextEntry
              textContentType={modus === "registrieren" ? "newPassword" : "password"}
            />
            <Input
              icon="key-outline"
              value={code}
              onChangeText={setCode}
              placeholder={modus === "anmelden" ? "Zugangscode (optional)" : "Zugangscode deiner Fahrschule"}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {fehler ? <Text style={{ color: colors.danger, fontSize: 14, lineHeight: 19 }}>{fehler}</Text> : null}
            {hinweis ? <Text style={{ color: colors.success, fontSize: 14, lineHeight: 19 }}>{hinweis}</Text> : null}

            <Button title={modus === "anmelden" ? "Anmelden" : "Konto erstellen"} onPress={los} loading={laedt} />
          </View>

          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: "center", marginHorizontal: space(8), marginTop: space(5), marginBottom: space(8), lineHeight: 18 }}>
            Den Zugangscode bekommst du von deiner Fahrschule. Nach dem ersten Mal brauchst du ihn nicht mehr.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
