import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDesktop, useFenster } from "@/lib/fenster";
import { WillkommenWeb } from "@/components/web/auth-web";
import { LorbeerWert, SeitenPunkte, START, StartBild, StartKnopf, StartRechtsHinweis, StartTitel } from "@/components/start-teile";

/** Im Browser am PC: zweigeteilte Fassung (web/auth-web.tsx). */
export default function Willkommen() {
  return useDesktop() ? <WillkommenWeb /> : <WillkommenHandy />;
}

/**
 * Erste Seite des Starts: Bild, kurzer Satz, zwei Werte und die Knöpfe.
 * Die weiteren Seiten (Vorstellung, Fragen mit der Figur, am Ende E-Mail)
 * folgen.
 */
function WillkommenHandy() {
  const insets = useSafeAreaInsets();
  const { width, height } = useFenster();
  // Bild so hoch, dass Titel, Werte und Knöpfe ohne Scrollen passen
  const bildHoehe = Math.max(230, Math.min(width * 1.05, height - insets.bottom - 560));

  return (
    <View style={{ flex: 1, backgroundColor: START.grund }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} showsVerticalScrollIndicator={false}>
        <StartBild breite={width} hoehe={bildHoehe} oben={insets.top} />
        <View style={{ flex: 1, paddingHorizontal: 20, gap: 22, marginTop: 4, paddingBottom: 8 }}>
          <StartTitel groesse={width < 420 ? 35 : 40} teile={["Mach deinen ", ["Führerschein."], "\nBestehe die Theorie."]} />
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 22 }}>
            <LorbeerWert wert="100" label="VERKEHRSZEICHEN" />
            <LorbeerWert wert="Videos" label="ZU JEDEM THEMA" />
          </View>
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 8, gap: 14 }}>
        <SeitenPunkte anzahl={4} aktiv={0} />
        <View style={{ gap: 10, marginTop: 6 }}>
          <StartKnopf titel="Weiter" onPress={() => router.push("/registrieren")} />
          <StartKnopf titel="Ich habe schon ein Konto" art="dunkel" onPress={() => router.push("/anmelden")} />
        </View>
        <StartRechtsHinweis onNutzung={() => router.push("/nutzungsbedingungen")} onDatenschutz={() => router.push("/datenschutz")} />
      </View>
    </View>
  );
}
