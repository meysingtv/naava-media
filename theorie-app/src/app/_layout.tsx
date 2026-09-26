import { useEffect, useRef, useState } from "react";
import { Animated, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold, useFonts } from "@expo-google-fonts/archivo";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";

import { T } from "@/components/ui";
import { erfolgVon } from "@/lib/erfolge";
import { erfolg } from "@/lib/haptik";
import { KontoProvider, useKonto } from "@/lib/konto";
import { StandProvider, useStand } from "@/lib/stand";
import { SyncBruecke } from "@/lib/sync";
import { abstand, farben, RAND } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** Kurzer Hinweis oben, wenn ein Abzeichen freigeschaltet wurde. */
function ErfolgHinweis() {
  const { neueErfolge, erfolgeGesehen } = useStand();
  const insets = useSafeAreaInsets();
  const [aktuell, setAktuell] = useState<string | null>(null);
  const y = useRef(new Animated.Value(-140)).current;

  useEffect(() => {
    if (aktuell || neueErfolge.length === 0) return;
    const id = neueErfolge[neueErfolge.length - 1];
    setAktuell(id);
    erfolgeGesehen();
    erfolg();
    Animated.sequence([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 160 }),
      Animated.delay(2600),
      Animated.timing(y, { toValue: -140, duration: 260, useNativeDriver: true }),
    ]).start(() => setAktuell(null));
  }, [neueErfolge, aktuell, erfolgeGesehen, y]);

  const e = aktuell ? erfolgVon(aktuell) : null;
  if (!e) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: insets.top + abstand(2),
        left: RAND,
        right: RAND,
        transform: [{ translateY: y }],
        flexDirection: "row",
        alignItems: "center",
        gap: abstand(3),
        padding: abstand(3.5),
        borderRadius: 18,
        backgroundColor: farben.flaeche2,
        borderWidth: 1,
        borderColor: farben.orangeLinie,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: farben.orange, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={e.icon} size={20} color={farben.aufOrange} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="mini" farbe={farben.orange}>
          Abzeichen freigeschaltet
        </T>
        <T v="textStark">{e.titel}</T>
      </View>
    </Animated.View>
  );
}

function Navigation() {
  const { drin, laedt } = useKonto();
  const { bereit } = useStand();
  const fertig = !laedt && bereit;

  useEffect(() => {
    if (fertig) SplashScreen.hideAsync().catch(() => {});
  }, [fertig]);

  if (!fertig) return <View style={{ flex: 1, backgroundColor: farben.grund }} />;

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: farben.grund }, animation: "slide_from_right" }}>
        <Stack.Screen name="index" options={{ animation: "none" }} />
        <Stack.Protected guard={!drin}>
          <Stack.Screen name="willkommen" options={{ animation: "fade" }} />
          <Stack.Screen name="registrieren" />
          <Stack.Screen name="anmelden" />
        </Stack.Protected>
        <Stack.Protected guard={drin}>
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          <Stack.Screen name="training" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
          <Stack.Screen name="pruefung" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
          <Stack.Screen name="duell" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
          <Stack.Screen name="online-duell" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
          <Stack.Screen name="profil" />
          <Stack.Screen name="elo" />
          <Stack.Screen name="thema/[id]" />
          <Stack.Screen name="formeln" />
          <Stack.Screen name="zeichen" />
          <Stack.Screen name="premium" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="einstellungen" />
        </Stack.Protected>
      </Stack>
      <ErfolgHinweis />
    </View>
  );
}

export default function RootLayout() {
  const [schriftenGeladen] = useFonts({
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!schriftenGeladen) return null;

  return (
    <StandProvider>
      <KontoProvider>
        <StatusBar style="light" />
        <SyncBruecke />
        <Navigation />
      </KontoProvider>
    </StandProvider>
  );
}
