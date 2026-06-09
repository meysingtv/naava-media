import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { planeErinnerungen } from "@/lib/notifications";
import { HeaderCancel } from "@/components/header-cancel";
import { HeaderPlus } from "@/components/header-plus";

function RootNavigator() {
  const { session, loading } = useAuth();
  const { colors, schema } = useTheme();

  useEffect(() => {
    if (session) planeErinnerungen();
  }, [session]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const modal = { presentation: "modal" as const, headerLeft: () => <HeaderCancel /> };

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

        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="fahrstunde/neu" options={{ title: "Neue Fahrstunde", ...modal }} />
          <Stack.Screen name="fahrstunde/[id]" options={{ title: "Fahrstunde", ...modal }} />
          <Stack.Screen name="schueler/[id]" options={{ title: "Schüler" }} />
          <Stack.Screen name="schueler/neu" options={{ title: "Neuer Schüler", ...modal }} />
          <Stack.Screen name="schueler/bearbeiten/[id]" options={{ title: "Schüler bearbeiten", ...modal }} />
          <Stack.Screen name="fahrzeuge/index" options={{ title: "Fahrzeuge", headerRight: () => <HeaderPlus href="/fahrzeuge/neu" /> }} />
          <Stack.Screen name="fahrzeuge/neu" options={{ title: "Neues Fahrzeug", ...modal }} />
          <Stack.Screen name="fahrzeuge/[id]" options={{ title: "Fahrzeug bearbeiten", ...modal }} />
          <Stack.Screen name="team/index" options={{ title: "Team", headerRight: () => <HeaderPlus href="/team/neu" /> }} />
          <Stack.Screen name="team/neu" options={{ title: "Neuer Mitarbeiter", ...modal }} />
          <Stack.Screen name="team/[id]" options={{ title: "Mitarbeiter bearbeiten", ...modal }} />
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
