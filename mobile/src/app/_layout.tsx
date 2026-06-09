import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { planeErinnerungen } from "@/lib/notifications";

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

  // Erinnerungen neu planen, sobald jemand angemeldet ist.
  useEffect(() => {
    if (session) {
      planeErinnerungen();
    }
  }, [session]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={schema === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.brand,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="fahrstunde/neu" options={{ title: "Neue Fahrstunde" }} />
        <Stack.Screen name="fahrstunde/[id]" options={{ title: "Fahrstunde bearbeiten" }} />
        <Stack.Screen name="schueler/[id]" options={{ title: "Schüler" }} />
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
