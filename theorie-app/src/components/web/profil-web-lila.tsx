import { Image, Pressable, ScrollView, Text, View, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { Icon, type IconName } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { type Zustand } from "@/components/web/bunt";
import { CLIPS } from "@/lib/clips";
import { useKonto } from "@/lib/konto";
import { useProfilAktionen } from "@/lib/profil-aktionen";
import { tageBis, terminDatum } from "@/lib/pruefungstag";
import { ALBUM } from "@/lib/schilder-jagd";
import { useStand } from "@/lib/stand";

// Profil am PC im lila Design (Vorlage 1:1): großer Kopf mit Profilbild, Name,
// Auto und Einstellungen, drei Zahlen, vier Lernhilfen mit Bild und unten die
// rechtlichen Seiten als Pillen. Füllt die volle Fensterbreite.

const s = {
  schwarz: { fontFamily: "Nunito_900Black" },
  fett: { fontFamily: "Nunito_800ExtraBold" },
  halb: { fontFamily: "Nunito_700Bold" },
  text: { fontFamily: "Nunito_600SemiBold" },
} as const;
const T = { tinte: "#1F1530", tinte2: "#4B4362", lila: "#7C3AED", rand: "#ECE5F8" };
const schatten = { shadowColor: "#5B2BB5", shadowOpacity: 0.1, shadowRadius: 22, shadowOffset: { width: 0, height: 8 } } as const;

const BILD = {
  held: require("../../../assets/images/web/profil-held.png"),
  weg: require("../../../assets/images/web/profil-weg.png"),
  schilder: require("../../../assets/images/web/profil-schilder.png"),
  kurz: require("../../../assets/images/web/profil-kurz.png"),
  zeichen: require("../../../assets/images/web/profil-zeichen.png"),
  formeln: require("../../../assets/images/web/profil-formeln.png"),
};

function Zahl({ icon, farbe, kachel, grund, welle, wert, titel, onPress }: { icon: IconName; farbe: string; kachel: [string, string]; grund: [string, string]; welle: string; wert: string; titel: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={(z: Zustand) => ({ flex: 1, height: 122, borderRadius: 22, overflow: "hidden", borderWidth: 1.5, borderColor: z.hovered ? "#D9CBF5" : T.rand, ...schatten })}>
      <LinearGradient colors={grund} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      <Svg width={220} height={90} viewBox="0 0 220 90" style={{ position: "absolute", right: 0, bottom: 0 }}>
        <Path d="M40 90 C 90 70, 120 30, 220 20 L 220 90 Z" fill={welle} opacity={0.35} />
        <Path d="M110 90 C 150 75, 180 55, 220 50 L 220 90 Z" fill={welle} opacity={0.45} />
      </Svg>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 24, gap: 20 }}>
        <LinearGradient colors={kachel} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 70, height: 70, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={36} color={farbe} />
        </LinearGradient>
        <View>
          <Text style={{ ...s.schwarz, fontSize: 36, lineHeight: 42, color: T.tinte }}>{wert}</Text>
          <Text style={{ ...s.text, fontSize: 19, color: T.tinte2 }}>{titel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function Hilfe({ titel, unter, icon, kachel, grund, bild, pfad }: { titel: string; unter: string; icon: IconName; kachel: [string, string]; grund: [string, string]; bild: ImageSourcePropType; pfad: string }) {
  return (
    <Pressable onPress={() => router.push(pfad as never)} style={(z: Zustand) => ({ flex: 1, height: 212, borderRadius: 24, overflow: "hidden", borderWidth: 1.5, borderColor: z.hovered ? "#D9CBF5" : T.rand, transform: [{ translateY: z.hovered ? -2 : 0 }], ...schatten })}>
      <LinearGradient colors={grund} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      <Image source={bild} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 122 }} resizeMode="contain" />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16, padding: 22, paddingBottom: 0 }}>
        <LinearGradient colors={kachel} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={32} color="#FFFFFF" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={{ ...s.schwarz, fontSize: 23, color: T.tinte }} numberOfLines={1}>
            {titel}
          </Text>
          <Text style={{ ...s.text, fontSize: 17, color: T.tinte2 }} numberOfLines={1}>
            {unter}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function Pille({ titel, icon, farbe, onPress, art }: { titel: string; icon: IconName; farbe: string; onPress: () => void; art?: "lila" | "rot" }) {
  return (
    <Pressable onPress={onPress} style={(z: Zustand) => ({ flexGrow: 1, height: 52, paddingHorizontal: 22, borderRadius: 26, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderWidth: 1.5, borderColor: art === "lila" ? "#D9C6FA" : art === "rot" ? "#F6D5DA" : z.hovered ? "#D9CBF5" : T.rand, backgroundColor: art === "lila" ? (z.hovered ? "#EADFFE" : "#F2EBFF") : z.hovered ? "#FBF9FF" : "#FFFFFF", ...schatten, shadowOpacity: 0.07 })}>
      <Icon name={icon} size={24} color={farbe} />
      <Text style={{ ...s.fett, fontSize: 18, color: art === "lila" ? "#6425D3" : art === "rot" ? "#E11D48" : T.tinte }}>{titel}</Text>
    </Pressable>
  );
}

export function ProfilWebLila() {
  const { stand } = useStand();
  const { profil, gast, anzeigeName, session } = useKonto();
  const { bildAendern, abmeldenFragen } = useProfilAktionen();
  const schilder = ALBUM.filter((k) => stand.schilder[k]).length;
  const termin = terminDatum(stand.pruefungstermin);
  const tage = termin ? tageBis(termin) : null;
  const gemerkt = CLIPS.filter((c) => stand.clips.gemerkt.includes(c.id)).length;
  const unterzeile = [profil ? `@${profil.benutzername}` : gast ? "Gastmodus" : (session?.user.email ?? null), profil?.rolle === "fahrlehrer" ? "Fahrlehrer" : `Klasse ${stand.klasse}`, profil?.bundesland ?? null].filter(Boolean).join(" · ");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F8F5FE" }} contentContainerStyle={{ flexGrow: 1 }}>
      <LinearGradient colors={["#F7F3FF", "#F3EEFD", "#F7F4FE"]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      <View style={{ width: "100%", maxWidth: 1500, alignSelf: "center", paddingHorizontal: 44, paddingTop: 50, paddingBottom: 120, gap: 32 }}>
        {/* Kopf */}
        <View style={{ height: 238, borderRadius: 32, overflow: "hidden", borderWidth: 2, borderColor: "#FFFFFF", ...schatten }}>
          <LinearGradient colors={["#FBF8FF", "#F1E9FF", "#ECE2FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <Svg width="100%" height={90} viewBox="0 0 1200 90" preserveAspectRatio="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
            <Path d="M0 60 C 200 20, 420 80, 640 50 C 860 20, 1000 70, 1200 40 L 1200 90 L 0 90 Z" fill="#E6DBFB" opacity={0.7} />
            <Path d="M0 80 C 260 50, 520 95, 800 70 C 980 55, 1100 80, 1200 70 L 1200 90 L 0 90 Z" fill="#DCCDFA" opacity={0.6} />
          </Svg>
          <View style={{ position: "absolute", right: "22%", top: 6, bottom: 6, width: 290 }}>
            <Image source={BILD.held} style={{ width: 290, height: 226 }} resizeMode="contain" />
          </View>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingLeft: 40, paddingRight: 30, gap: 34 }}>
            <Pressable onPress={bildAendern} accessibilityLabel="Profilbild ändern" style={(z: Zustand) => ({ opacity: z.hovered ? 0.9 : 1 })}>
              <View style={{ width: 176, height: 176, borderRadius: 88, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 6, borderColor: "#EDE4FD", ...schatten, shadowOpacity: 0.16 }}>
                <ProfilBild name={anzeigeName} groesse={150} rand={0} />
              </View>
              <LinearGradient colors={["#9B6BFF", "#6D28D9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", right: 2, bottom: 8, width: 52, height: 52, borderRadius: 26, borderWidth: 4, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
                <Icon name="camera" size={22} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ ...s.schwarz, fontSize: 52, lineHeight: 60, color: T.tinte, letterSpacing: -1 }} numberOfLines={1}>
                {anzeigeName}
              </Text>
              <Text style={{ ...s.text, fontSize: 21, color: T.tinte2, marginTop: 4 }} numberOfLines={1}>
                {unterzeile}
              </Text>
            </View>
            <Pressable onPress={() => router.push("/einstellungen")} style={(z: Zustand) => ({ height: 62, paddingHorizontal: 28, borderRadius: 31, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: z.hovered ? "#FFFFFF" : "rgba(255,255,255,0.85)", borderWidth: 2, borderColor: "#D8C6FB", ...schatten })}>
              <Icon name="settings" size={26} color={T.lila} />
              <Text style={{ ...s.fett, fontSize: 21, color: "#6425D3" }}>Einstellungen</Text>
            </Pressable>
          </View>
        </View>

        {!session ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 18, paddingLeft: 24, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: T.rand }}>
            <Icon name="cloud-upload-outline" size={24} color={T.lila} />
            <Text style={{ flex: 1, ...s.text, fontSize: 16, color: T.tinte2 }}>Du schaust als Gast. Mit einem kostenlosen Konto kannst du liken, kommentieren und ein Profilbild zeigen.</Text>
            <Pille titel="Anmelden" icon="log-in-outline" farbe={T.lila} onPress={() => router.push("/anmelden")} />
            <Pille titel="Konto erstellen" icon="person-add-outline" farbe={T.lila} art="lila" onPress={() => router.push("/registrieren")} />
          </View>
        ) : null}

        {/* Zahlen */}
        <View style={{ flexDirection: "row", gap: 26 }}>
          <Zahl icon="camera" farbe="#1E8EF0" kachel={["#E2F1FF", "#CDE6FE"]} grund={["#FFFFFF", "#F4F9FF"]} welle="#8EC5F5" wert={`${schilder}/${ALBUM.length}`} titel="Schilder gefunden" onPress={() => router.push("/schilder-jagd")} />
          <Zahl icon="calendar" farbe="#7C3AED" kachel={["#EFE6FF", "#E1D2FD"]} grund={["#FFFFFF", "#F8F4FF"]} welle="#C3A6F7" wert={tage !== null && tage >= 0 ? String(tage) : "–"} titel={tage === 1 ? "Tag bis zur Prüfung" : "Tage bis zur Prüfung"} onPress={() => router.push("/pruefungstermin")} />
          <Zahl icon="bookmark" farbe="#F5A300" kachel={["#FFF3D6", "#FFE6AD"]} grund={["#FFFFFF", "#FFFBF0"]} welle="#F7D37A" wert={String(gemerkt)} titel="Gemerkt" onPress={() => router.push("/kurz-erklaert")} />
        </View>

        {/* Lernhilfen */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18, marginTop: 4 }}>
          <LinearGradient colors={["#9B6BFF", "#6D28D9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" }}>
            <Icon name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
          </LinearGradient>
          <Text style={{ ...s.schwarz, fontSize: 40, color: T.tinte, letterSpacing: -0.6 }}>Lernhilfen</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 24 }}>
          <Hilfe titel="Schilder-Jagd" unter={schilder ? `${schilder} von ${ALBUM.length} gefunden` : "Schilder sammeln"} icon="camera" kachel={["#4FB3FF", "#1E8EF0"]} grund={["#FFFFFF", "#EEF6FF"]} bild={BILD.schilder} pfad="/schilder-jagd" />
          <Hilfe titel="Kurz erklärt" unter={gemerkt ? `${gemerkt} gemerkt` : "Regeln in 30 Sekunden"} icon="bulb" kachel={["#FFAA5C", "#F2711C"]} grund={["#FFFFFF", "#FFF2EA"]} bild={BILD.kurz} pfad="/kurz-erklaert" />
          <Hilfe titel="Verkehrszeichen" unter="Alle Zeichen erklärt" icon="warning" kachel={["#FF6B6B", "#E5303A"]} grund={["#FFFFFF", "#FFF1F1"]} bild={BILD.zeichen} pfad="/zeichen" />
          <Hilfe titel="Formeln" unter="Anhalteweg & Co." icon="calculator" kachel={["#FFC94D", "#F59E0B"]} grund={["#FFFFFF", "#FFF8E6"]} bild={BILD.formeln} pfad="/formeln" />
        </View>

        {/* Pillen */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 4 }}>
          <Pille titel="Premium" icon="diamond" farbe="#7C3AED" art="lila" onPress={() => router.push("/premium")} />
          <Pille titel="Bildnachweise" icon="image-outline" farbe="#2F80ED" onPress={() => router.push("/bildnachweise")} />
          <Pille titel="Impressum" icon="document-text" farbe="#2F80ED" onPress={() => router.push("/impressum")} />
          <Pille titel="Datenschutz" icon="shield-checkmark" farbe="#2F80ED" onPress={() => router.push("/datenschutz")} />
          <Pille titel="Nutzungsbedingungen" icon="reader" farbe="#2F80ED" onPress={() => router.push("/nutzungsbedingungen")} />
          <Pille titel={gast ? "Gastmodus beenden" : "Abmelden"} icon="log-out-outline" farbe="#E11D48" art="rot" onPress={abmeldenFragen} />
        </View>
      </View>
      {/* Straße unten */}
      <Image source={BILD.weg} style={{ position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: 110 }} resizeMode="cover" />
    </ScrollView>
  );
}
