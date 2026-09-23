import { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { planeErinnerungen, useAnfrageAntwortenMelden } from "@/lib/mitteilungen";

function Abbrechen() {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={10}>
      <Text style={{ color: colors.accent, fontSize: 17 }}>Abbrechen</Text>
    </Pressable>
  );
}

function RootNavigator() {
  const { session, verknuepft, laedt } = useAuth();
  const { colors, schema } = useTheme();
  const drin = Boolean(session) && verknuepft;

  useEffect(() => {
    if (drin) planeErinnerungen();
  }, [drin]);
  // Antwort der Fahrschule auf eine Anfrage als Mitteilung melden.
  useAnfrageAntwortenMelden(drin);

  if (laedt) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={schema === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.accent,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />

        <Stack.Protected guard={!drin}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={drin}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="anfrage"
            options={{ title: "Fahrstunde anfragen", presentation: "modal", headerLeft: () => <Abbrechen /> }}
          />
          <Stack.Screen name="rechnung/[id]" options={{ title: "Rechnung" }} />
          <Stack.Screen name="profil" options={{ title: "Profil" }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
