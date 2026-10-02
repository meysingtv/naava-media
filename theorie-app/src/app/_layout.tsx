import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { router, Stack, usePathname } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Archivo_800ExtraBold, useFonts } from "@expo-google-fonts/archivo";
import { MarckScript_400Regular } from "@expo-google-fonts/marck-script";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from "@expo-google-fonts/inter";

import { AuswahlBlattHost } from "@/components/auswahl-blatt";
import { BossTrefferAnzeige } from "@/components/crew";
import { DialogHost } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { erfolgVon } from "@/lib/erfolge";
import { erfolg } from "@/lib/haptik";
import { CrewProvider } from "@/lib/crew";
import { DarstellungBruecke, DarstellungProvider, istHelleSeite, useDarstellung } from "@/lib/darstellung";
import { KontoProvider, useKonto } from "@/lib/konto";
import { LiveBruecke } from "@/lib/live-bruecke";
import { StandProvider, useStand } from "@/lib/stand";
import { ProfilbildAbgleich } from "@/lib/profilbild";
import { PruefungstagBruecke } from "@/lib/pruefungstag";
import { SyncBruecke } from "@/lib/sync";
import { farben, leuchten, schrift, verlauf } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** Kurzer Hinweis oben als kleine Kapsel, wenn ein Abzeichen freigeschaltet wurde. */
function ErfolgHinweis() {
  const { neueErfolge, erfolgeGesehen } = useStand();
  const { darstellung, belohnungen } = useDarstellung();
  const hell = istHelleSeite(darstellung, usePathname());
  const insets = useSafeAreaInsets();
  const [aktuell, setAktuell] = useState<string | null>(null);
  const y = useRef(new Animated.Value(-140)).current;

  useEffect(() => {
    if (aktuell || neueErfolge.length === 0) return;
    // Einblendungen aus (Einstellungen): neue Abzeichen still als gesehen merken – sie stehen im Profil.
    if (!belohnungen) {
      erfolgeGesehen();
      return;
    }
    const id = neueErfolge[neueErfolge.length - 1];
    setAktuell(id);
    erfolgeGesehen();
    erfolg();
    Animated.sequence([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 160 }),
      Animated.delay(2600),
      Animated.timing(y, { toValue: -140, duration: 260, useNativeDriver: true }),
    ]).start(() => setAktuell(null));
  }, [neueErfolge, aktuell, erfolgeGesehen, y, belohnungen]);

  const e = aktuell ? erfolgVon(aktuell) : null;
  if (!e) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: insets.top + 4,
          alignSelf: "center",
          maxWidth: "90%",
          transform: [{ translateY: y }],
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          height: 54,
          paddingLeft: 7,
          paddingRight: 18,
          borderRadius: 27,
          backgroundColor: hell ? "#FFFFFF" : "#1A2128",
          borderWidth: 1,
          borderColor: hell ? "rgba(242,84,10,0.22)" : "rgba(252,91,14,0.42)",
        },
        hell ? leuchten("#3C2C18", 0.16, 18, 6) : leuchten("#000000", 0.55, 18, 6),
      ]}
    >
      <LinearGradient colors={verlauf.knopf} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
        <Icon name={e.icon} size={19} color="#FFFFFF" />
      </LinearGradient>
      <View style={{ flexShrink: 1 }}>
        <Text style={{ ...schrift.textFett, fontSize: 10.5, letterSpacing: 1, color: hell ? "#F2540A" : farben.orange }}>ABZEICHEN FREIGESCHALTET</Text>
        <Text style={{ ...schrift.textHalb, fontSize: 15, color: hell ? "#14171B" : "#FFFFFF" }} numberOfLines={1}>
          {e.titel}
        </Text>
      </View>
    </Animated.View>
  );
}

function Navigation() {
  const { drin, laedt, session, passwortNeuFaellig } = useKonto();
  const { bereit } = useStand();
  const { belohnungen } = useDarstellung();
  const fertig = !laedt && bereit;

  useEffect(() => {
    if (fertig) SplashScreen.hideAsync().catch(() => {});
  }, [fertig]);

  // Über den Link „Passwort zurücksetzen“ gekommen → neues Passwort festlegen.
  useEffect(() => {
    if (fertig && session && passwortNeuFaellig) router.push("/passwort-neu");
  }, [fertig, session, passwortNeuFaellig]);

  if (!fertig) return <View style={{ flex: 1, backgroundColor: farben.grund }} />;

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: farben.grund }, animation: "slide_from_right" }}>
        <Stack.Screen name="index" options={{ animation: "none" }} />
        {/* Registrieren und Anmelden gehen auch aus dem Gastmodus heraus */}
        <Stack.Screen name="registrieren" />
        <Stack.Screen name="anmelden" />
        <Stack.Screen name="auth-callback" options={{ animation: "none" }} />
        <Stack.Screen name="passwort-neu" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
        <Stack.Protected guard={!drin}>
          <Stack.Screen name="willkommen" options={{ animation: "fade" }} />
        </Stack.Protected>
        <Stack.Protected guard={drin}>
          <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
          <Stack.Screen name="training" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
          <Stack.Screen name="pruefung" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
          <Stack.Screen name="duell" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
          <Stack.Screen name="online-duell" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
          <Stack.Screen name="kurz-erklaert" />
          <Stack.Screen name="statistik" />
          <Stack.Screen name="clip-hochladen" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="clip-ersteller" />
          <Stack.Screen name="nutzer/[id]" />
          <Stack.Screen name="clip-ansicht" options={{ animation: "fade" }} />
          <Stack.Screen name="live" options={{ animation: "slide_from_bottom", presentation: "fullScreenModal", gestureEnabled: false }} />
          <Stack.Screen name="live-senden" options={{ animation: "slide_from_bottom", presentation: "fullScreenModal", gestureEnabled: false }} />
          <Stack.Screen name="liga" />
          <Stack.Screen name="favoriten" />
          <Stack.Screen name="kalender" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="pruefungstermin" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="crew" />
          <Stack.Screen name="crew-beitreten" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="crew-boss" />
          <Stack.Screen name="elo" />
          <Stack.Screen name="thema/[id]" />
          <Stack.Screen name="formeln" />
          <Stack.Screen name="zeichen" />
          <Stack.Screen name="schilder-jagd" />
          <Stack.Screen name="schild-scanner" options={{ animation: "slide_from_bottom", presentation: "fullScreenModal" }} />
          <Stack.Screen name="karteikarten" />
          <Stack.Screen name="stapel/[id]" />
          <Stack.Screen name="karten-lernen" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
          <Stack.Screen name="karte-bearbeiten" options={{ animation: "slide_from_bottom", gestureEnabled: false }} />
          <Stack.Screen name="premium" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="einstellungen" />
          <Stack.Screen name="erklaerung" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="erklaervideos" />
          <Stack.Screen name="bildnachweise" />
        </Stack.Protected>
      </Stack>
      <ErfolgHinweis />
      {/* „−5 HP“ beim Crew-Boss nur, wenn XP, HP & Abzeichen in den Einstellungen an sind */}
      {belohnungen ? <BossTrefferAnzeige /> : null}
      <LiveBruecke />
      <AuswahlBlattHost />
    </View>
  );
}

export default function RootLayout() {
  const [schriftenGeladen] = useFonts({
    Archivo_800ExtraBold,
    MarckScript_400Regular,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!schriftenGeladen) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: farben.grund }}>
      <StandProvider>
        <DarstellungProvider>
          <KontoProvider>
            <StatusBar style="light" />
            <DarstellungBruecke />
            <SyncBruecke />
            <PruefungstagBruecke />
            <ProfilbildAbgleich />
            <CrewProvider>
              <Navigation />
            </CrewProvider>
            <DialogHost />
          </KontoProvider>
        </DarstellungProvider>
      </StandProvider>
    </GestureHandlerRootView>
  );
}
