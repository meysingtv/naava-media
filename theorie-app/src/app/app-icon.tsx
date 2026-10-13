import { useEffect, useRef, useState } from "react";
import { Animated, Image, ImageBackground, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckIcon } from "phosphor-react-native/src/icons/Check";
import { InfoIcon } from "phosphor-react-native/src/icons/Info";

import { dialog } from "@/components/dialog";
import { GlasGrund, GlasKarte } from "@/components/glas-flaeche";
import { GrossKopf, Seite } from "@/components/seite";
import { aktivesIcon, APP_ICONS, iconSetzen, iconWechselMoeglich, type AppIcon } from "@/lib/app-icon";
import { useFarbwelt } from "@/lib/darstellung";
import { useFenster } from "@/lib/fenster";
import { erfolg, tippen } from "@/lib/haptik";
import { leuchten, RAND, schrift } from "@/lib/theme";

// App-Icon auswählen: oben eine kleine Homescreen-Vorschau mit dem gewählten
// Icon, darunter alle Designs im Raster. Antippen wechselt das echte Icon.

const WALLPAPER = require("../../assets/images/home/held-abend.jpg");
/** Ecken wie beim iPhone-Icon. */
const ecke = (g: number) => g * 0.225;

function Vorschau({ icon }: { icon: AppIcon }) {
  const puls = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    puls.setValue(0.82);
    Animated.spring(puls, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 12 }).start();
  }, [icon.id, puls]);
  const leer = (k: string) => <View key={k} style={{ width: 58, height: 58, borderRadius: ecke(58), backgroundColor: "rgba(255,255,255,0.22)" }} />;
  return (
    <GlasKarte style={{ borderRadius: 30 }}>
      <ImageBackground source={WALLPAPER} blurRadius={Platform.OS === "web" ? 0 : 14} resizeMode="cover" style={{ height: 210, alignItems: "center", justifyContent: "center" }}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,12,18,0.28)" }]} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 22 }}>
          {leer("a")}
          <View style={{ alignItems: "center", gap: 8 }}>
            <Animated.View style={[{ transform: [{ scale: puls }] }, leuchten("#000000", 0.45, 18, 8)]}>
              <Image source={icon.vorschau} style={{ width: 84, height: 84, borderRadius: ecke(84) }} />
            </Animated.View>
            <Text style={{ ...schrift.textHalb, fontSize: 13, color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 4 }}>Fahrschul Pro</Text>
          </View>
          {leer("b")}
        </View>
      </ImageBackground>
    </GlasKarte>
  );
}

function Kachel({ icon, aktiv, breite, onPress }: { icon: AppIcon; aktiv: boolean; breite: number; onPress: () => void }) {
  const f = useFarbwelt();
  const g = breite - 20;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: aktiv }}
      accessibilityLabel={`App-Icon ${icon.titel}`}
      style={({ pressed }) => ({ width: breite, alignItems: "center", gap: 9, transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <View style={{ padding: 4, borderRadius: ecke(g) + 4, borderWidth: 2.5, borderColor: aktiv ? f.orange : "transparent" }}>
        <View style={leuchten(f.hell ? "#3C2C18" : "#000000", f.hell ? 0.16 : 0.5, 10, 4)}>
          <Image source={icon.vorschau} style={{ width: g - 13, height: g - 13, borderRadius: ecke(g - 13) }} />
        </View>
        {aktiv ? (
          <View style={{ position: "absolute", right: -7, top: -7, width: 26, height: 26, borderRadius: 13, backgroundColor: f.orange, borderWidth: 2.5, borderColor: f.grund, alignItems: "center", justifyContent: "center" }}>
            <CheckIcon size={13} color="#FFFFFF" weight="bold" />
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ ...(aktiv ? schrift.textFett : schrift.textHalb), fontSize: 14, color: aktiv ? f.text : f.text2 }}>
        {icon.titel}
      </Text>
    </Pressable>
  );
}

function Inhalt() {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const { width } = useFenster();
  const [aktiv, setAktiv] = useState<string | null>(() => aktivesIcon());
  const [laeuft, setLaeuft] = useState(false);

  const inhalt = Math.min(width, 620) - 2 * RAND;
  const spalten = width >= 600 ? 4 : 3;
  const abstand = 14;
  const breite = (inhalt - abstand * (spalten - 1)) / spalten;
  const gewaehlt = APP_ICONS.find((i) => i.id === aktiv) ?? APP_ICONS[0];

  async function waehlen(icon: AppIcon) {
    if (icon.id === aktiv || laeuft) return;
    tippen();
    if (!iconWechselMoeglich) {
      // Nur Vorschau – das echte Icon kann diese App-Version noch nicht wechseln.
      setAktiv(icon.id);
      return;
    }
    setLaeuft(true);
    try {
      await iconSetzen(icon.id);
      setAktiv(icon.id);
      erfolg();
    } catch {
      dialog("Icon nicht geändert", "Das hat gerade nicht geklappt. Versuch es gleich noch einmal.");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <>
      <GlasGrund />
      <GrossKopf titel="App-Icon" unter="Such dir dein Lenkrad für den Homescreen aus." />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: 14, paddingBottom: insets.bottom + 40, width: "100%", maxWidth: 620, alignSelf: "center", gap: 22 }}
        showsVerticalScrollIndicator={false}
      >
        <Vorschau icon={gewaehlt} />

        {!iconWechselMoeglich ? (
          <GlasKarte style={{ flexDirection: "row", gap: 12, padding: 14, alignItems: "center" }}>
            <InfoIcon size={22} color={f.orange} weight="fill" />
            <Text style={{ ...schrift.text, fontSize: 14, lineHeight: 19, color: f.text2, flex: 1 }}>
              Hier siehst du erst die Vorschau. Wechseln lässt sich das Icon mit dem nächsten App-Update.
            </Text>
          </GlasKarte>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: abstand, rowGap: 20 }}>
          {APP_ICONS.map((icon) => (
            <Kachel key={icon.titel} icon={icon} aktiv={icon.id === aktiv} breite={breite} onPress={() => waehlen(icon)} />
          ))}
        </View>

        {iconWechselMoeglich ? (
          <Text style={{ ...schrift.text, fontSize: 13, lineHeight: 18, color: f.text3, textAlign: "center" }}>
            {Platform.OS === "ios" ? "Dein iPhone bestätigt den Wechsel kurz mit einer Meldung." : "Das neue Icon erscheint nach ein paar Sekunden auf dem Startbildschirm."}
          </Text>
        ) : null}
      </ScrollView>
    </>
  );
}

export default function AppIconSeite() {
  return (
    <Seite>
      <Inhalt />
    </Seite>
  );
}
