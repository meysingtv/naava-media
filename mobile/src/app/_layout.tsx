import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { planeErinnerungen } from "@/lib/notifications";
import { HeaderCancel } from "@/components/header-cancel";

function RootNavigator() {
  const { session, loading } = useAuth();
  const { colors, schema } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const aufLogin = segments[0] === "login";
    if (!session && !aufLogin) {
      router.replace("/login");
    } else if (session && aufLogin) {
      router.replace("/(tabs)/heute");
    }
  }, [session, loading, segments, router]);

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
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="fahrstunde/neu"
          options={{ title: "Neue Fahrstunde", presentation: "modal", headerLeft: () => <HeaderCancel /> }}
        />
        <Stack.Screen
          name="fahrstunde/[id]"
          options={{ title: "Fahrstunde", presentation: "modal", headerLeft: () => <HeaderCancel /> }}
        />
        <Stack.Screen name="schueler/[id]" options={{ title: "Schüler" }} />
        <Stack.Screen
          name="schueler/neu"
          options={{ title: "Neuer Schüler", presentation: "modal", headerLeft: () => <HeaderCancel /> }}
        />
        <Stack.Screen
          name="schueler/bearbeiten/[id]"
          options={{ title: "Schüler bearbeiten", presentation: "modal", headerLeft: () => <HeaderCancel /> }}
        />
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
