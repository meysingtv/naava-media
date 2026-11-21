import { useRef, useState } from "react";
import { Image, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDesktop, useFenster } from "@/lib/fenster";
import { FOTOS } from "@/lib/fotos";
import { Icon } from "@/components/icon";
import { WillkommenWeb } from "@/components/web/auth-web";
import { Verkehrszeichen } from "@/components/zeichen";
import { LorbeerWert, SeitenPunkte, START, StartBild, StartKnopf, startSchrift, StartRechtsHinweis, StartTitel, VorschauRahmen } from "@/components/start-teile";
import type { ZeichenKey } from "@/lib/fragen";

/** Im Browser am PC: zweigeteilte Fassung (web/auth-web.tsx). */
export default function Willkommen() {
  return useDesktop() ? <WillkommenWeb /> : <WillkommenHandy />;
}

const SEITEN = 4;

/**
 * Willkommen: vier Seiten zum Wischen (Straßenbild, Videos, Verkehrszeichen,
 * Schilder-Jagd). „Weiter“ blättert, auf der letzten Seite beginnen die
 * Fragen mit der Figur (start.tsx) – am Ende kommt die E-Mail.
 */
function WillkommenHandy() {
  const insets = useSafeAreaInsets();
  const { width, height } = useFenster();
  const [seite, setSeite] = useState(0);
  const leiste = useRef<ScrollView>(null);
  // Bild so hoch, dass Titel, Werte und Knöpfe ohne Scrollen passen
  const bildHoehe = Math.max(230, Math.min(width * 0.78 + insets.top, height - insets.bottom - 560));
  const titelGroesse = width < 420 ? 35 : 40;

  const weiter = () => {
    if (seite < SEITEN - 1) leiste.current?.scrollTo({ x: (seite + 1) * width, animated: true });
    else router.push("/start");
  };
  const gewischt = (e: NativeSyntheticEvent<NativeScrollEvent>) => setSeite(Math.round(e.nativeEvent.contentOffset.x / width));

  // Seiten 2–4 haben keine Werte unter dem Titel – dort darf das Bild höher sein.
  const bildHoehe2 = bildHoehe + 86;
  const vorschauB = Math.min(width * 0.74, 330);
  const vorschauH = bildHoehe2 - insets.top - 18;

  return (
    <View style={{ flex: 1, backgroundColor: START.grund }}>
      <StatusBar style="light" />
      <ScrollView ref={leiste} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={gewischt} onScroll={gewischt} scrollEventThrottle={64} bounces={false} style={{ flex: 1 }}>
        {/* 1: Straße */}
        <Seite breite={width}>
          <StartBild breite={width} hoehe={bildHoehe} oben={insets.top} />
          <Text0>
            <StartTitel groesse={titelGroesse} teile={["Mach deinen ", ["Führerschein."], "\nBestehe die Theorie."]} />
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 22 }}>
              <LorbeerWert wert="100" label="VERKEHRSZEICHEN" />
              <LorbeerWert wert="Videos" label="ZU JEDEM THEMA" />
            </View>
          </Text0>
        </Seite>

        {/* 2: Videos */}
        <Seite breite={width}>
          <View style={{ height: bildHoehe2, paddingTop: insets.top + 18 }}>
            <VorschauRahmen breite={vorschauB} hoehe={vorschauH}>
              <View style={{ borderRadius: 20, overflow: "hidden", height: vorschauB * 0.62 }}>
                <Image source={FOTOS.strasse2} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                  <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="play" size={24} color={START.lila} />
                  </View>
                </View>
                <View style={{ position: "absolute", right: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.6)" }}>
                  <Text style={{ ...startSchrift.textHalb, fontSize: 12, color: "#FFFFFF" }}>2:04</Text>
                </View>
              </View>
              <Text style={{ ...startSchrift.titel, fontSize: 22, color: "#FFFFFF", marginTop: 14 }}>Kreisverkehr in 2 Minuten</Text>
              <Text style={{ ...startSchrift.text, fontSize: 14, color: START.text3, marginTop: 2 }}>Einfahren, blinken, ausfahren</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                {[FOTOS.strasse1, FOTOS.strasse3].map((b, i) => (
                  <View key={i} style={{ flex: 1, height: vorschauB * 0.3, borderRadius: 14, overflow: "hidden" }}>
                    <Image source={b} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  </View>
                ))}
              </View>
            </VorschauRahmen>
          </View>
          <Text0>
            <StartTitel groesse={titelGroesse} teile={["Jedes Thema als\n", ["kurzes Video."]]} />
          </Text0>
        </Seite>

        {/* 3: Verkehrszeichen */}
        <Seite breite={width}>
          <View style={{ height: bildHoehe2, paddingTop: insets.top + 18 }}>
            <VorschauRahmen breite={vorschauB} hoehe={vorschauH}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {(["z205", "z206", "z274_50", "z306", "z101", "z215"] as ZeichenKey[]).map((z, i) => (
                  <View key={z} style={{ width: (vorschauB - 36 - 14 - 20) / 3, aspectRatio: 1, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: i === 0 ? "#2B2650" : "#24243A", borderWidth: 2, borderColor: i === 0 ? START.lila : "transparent" }}>
                    <Verkehrszeichen zeichen={z} groesse={(vorschauB - 70) / 3 - 26} />
                  </View>
                ))}
              </View>
              <View style={{ marginTop: 14, borderRadius: 18, backgroundColor: "#2B2650", padding: 14, gap: 4 }}>
                <Text style={{ ...startSchrift.titel, fontSize: 20, color: "#FFFFFF" }}>Vorfahrt gewähren</Text>
                <Text style={{ ...startSchrift.text, fontSize: 13.5, lineHeight: 19, color: START.text2 }}>Langsam heranfahren und warten, wenn Verkehr auf der Vorfahrtstraße kommt.</Text>
              </View>
            </VorschauRahmen>
          </View>
          <Text0>
            <StartTitel groesse={titelGroesse} teile={["Alle Verkehrszeichen\n", ["einfach erklärt."]]} />
          </Text0>
        </Seite>

        {/* 4: Schilder-Jagd */}
        <Seite breite={width}>
          <View style={{ height: bildHoehe2, paddingTop: insets.top + 18 }}>
            <VorschauRahmen breite={vorschauB} hoehe={vorschauH}>
              <View style={{ height: vorschauH, marginHorizontal: -18, marginTop: -18 }}>
                <Image source={FOTOS.strasse1} style={{ width: "100%", height: "100%", opacity: 0.55 }} resizeMode="cover" />
                <View style={{ position: "absolute", left: 0, right: 0, top: vorschauH * 0.12, alignItems: "center" }}>
                  <View style={{ width: vorschauB * 0.56, height: vorschauB * 0.56, alignItems: "center", justifyContent: "center" }}>
                    {[
                      { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
                      { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
                      { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
                      { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
                    ].map((e, i) => (
                      <View key={i} style={{ position: "absolute", width: 34, height: 34, borderColor: "#FFFFFF", ...e }} />
                    ))}
                    <Verkehrszeichen zeichen="z274_50" groesse={vorschauB * 0.34} />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: START.lila }}>
                    <Icon name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={{ ...startSchrift.titel, fontSize: 18, color: "#FFFFFF" }}>Gefunden!</Text>
                  </View>
                </View>
              </View>
            </VorschauRahmen>
          </View>
          <Text0>
            <StartTitel groesse={titelGroesse} teile={["Sammle echte Schilder\n", ["mit der Kamera."]]} />
          </Text0>
        </Seite>
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: insets.bottom + 8, gap: 14 }}>
        <SeitenPunkte anzahl={SEITEN} aktiv={seite} />
        <View style={{ gap: 10, marginTop: 6 }}>
          <StartKnopf titel="Weiter" onPress={weiter} />
          <StartKnopf titel="Ich habe schon ein Konto" art="dunkel" onPress={() => router.push({ pathname: "/start", params: { modus: "anmelden" } })} />
        </View>
        <StartRechtsHinweis onNutzung={() => router.push("/nutzungsbedingungen")} onDatenschutz={() => router.push("/datenschutz")} />
      </View>
    </View>
  );
}

function Seite({ breite, children }: { breite: number; children: React.ReactNode }) {
  return <View style={{ width: breite }}>{children}</View>;
}

/** Text unter dem Bild, mittig im freien Platz. */
function Text0({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20, gap: 22, paddingTop: 4, paddingBottom: 8 }}>{children}</View>;
}
