import { useEffect, useState, useSyncExternalStore } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View, type ViewStyle } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Svg, { Circle } from "react-native-svg";

import { Icon, type IconName } from "@/components/icon";
import { Verkehrszeichen, ZEICHEN_INFO, type ZeichenInfo } from "@/components/zeichen";
import { type Zustand } from "@/components/web/bunt";
import { useTasten } from "@/components/web/frage-web";
import { karteHover, knopfHover, weich } from "@/components/web/hover";
import { FRAGEN_AKTIV } from "@/lib/funktionen";

// Verkehrszeichen am PC im lila Design (Vorlage 1:1): Kopf mit Bild, drei
// Zahlen (gesamt, gelernt, Fortschritt), Filter mit Suche, Raster und rechts
// das gewählte Zeichen. „Gelernt“ = schon einmal im Detail angesehen, „Merken“
// per Lesezeichen – beides bleibt auf diesem Gerät.

const HELD = require("../../../assets/images/web/zeichen-held.png");
const s = {
  schwarz: { fontFamily: "Nunito_900Black" },
  fett: { fontFamily: "Nunito_800ExtraBold" },
  halb: { fontFamily: "Nunito_700Bold" },
  text: { fontFamily: "Nunito_600SemiBold" },
} as const;
const T = { tinte: "#1F1530", tinte2: "#4B4362", tinte3: "#8C84A0", lila: "#7C3AED", lilaDunkel: "#6425D3", zart: "#EFE8FD", rand: "#ECE5F8" };
const schatten: ViewStyle = { shadowColor: "#5B2BB5", shadowOpacity: 0.09, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } };

type Gruppe = "alle" | ZeichenInfo["gruppe"];
const GRUPPEN: { id: Gruppe; titel: string; icon: IconName }[] = [
  { id: "alle", titel: "Alle", icon: "layers-outline" },
  { id: "gefahr", titel: "Gefahrzeichen", icon: "warning-outline" },
  { id: "vorschrift", titel: "Vorschriftzeichen", icon: "ellipse-outline" },
  { id: "richt", titel: "Richtzeichen", icon: "square-outline" },
];
const GRUPPE_FARBE: Record<ZeichenInfo["gruppe"], [string, string, string]> = {
  gefahr: ["#FDECEE", "#E5303A", "Gefahrzeichen"],
  vorschrift: ["#E8F1FF", "#1F6FE5", "Vorschriftzeichen"],
  richt: ["#E7F8EC", "#16A34A", "Richtzeichen"],
};

// ---- Gelernt / Gemerkt (lokal) -----------------------------------------
const SPEICHER = "spur-zeichen-web-v1";
type Merk = { gesehen: string[]; gemerkt: string[] };
let merk: Merk = { gesehen: [], gemerkt: [] };
let geladen = false;
const hoerer = new Set<() => void>();
function setzen(neu: Merk) {
  merk = neu;
  hoerer.forEach((h) => h());
  AsyncStorage.setItem(SPEICHER, JSON.stringify(neu)).catch(() => {});
}
function useMerk(): Merk {
  const m = useSyncExternalStore(
    (h) => {
      hoerer.add(h);
      return () => hoerer.delete(h);
    },
    () => merk,
  );
  useEffect(() => {
    if (geladen) return;
    geladen = true;
    AsyncStorage.getItem(SPEICHER)
      .then((roh) => {
        if (roh) setzen({ gesehen: [], gemerkt: [], ...(JSON.parse(roh) as Partial<Merk>) });
      })
      .catch(() => {});
  }, []);
  return m;
}

function Zahl({ icon, wert, titel, grund }: { icon: React.ReactNode; wert: string; titel: string; grund?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 22 }}>
      <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: grund ?? T.zart, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <View>
        <Text style={{ ...s.schwarz, fontSize: 23, color: T.tinte }}>{wert}</Text>
        <Text style={{ ...s.text, fontSize: 14, color: T.tinte2 }}>{titel}</Text>
      </View>
    </View>
  );
}

function Kachel({ z, aktiv, gelernt, onPress }: { z: ZeichenInfo; aktiv: boolean; gelernt: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={z.name}
      style={(st: Zustand) => ({ flex: 1, height: 122, borderRadius: 18, borderWidth: aktiv ? 2 : 1.5, borderColor: aktiv ? "#A47BF5" : T.rand, backgroundColor: aktiv ? "#F5EFFF" : "#FFFFFF", alignItems: "center", justifyContent: "center", gap: 8, ...schatten, ...karteHover(!!st.hovered, st.pressed), ...(aktiv ? { borderColor: "#A47BF5" } : null) })}
    >
      <Verkehrszeichen zeichen={z.key} groesse={62} />
      <Text style={{ ...s.fett, fontSize: 15, color: aktiv ? T.lilaDunkel : T.tinte, textAlign: "center", paddingHorizontal: 6 }} numberOfLines={1}>
        {z.kurz ?? z.name}
      </Text>
      {gelernt && !aktiv ? (
        <View style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: "#22B35A", alignItems: "center", justifyContent: "center" }}>
          <Icon name="checkmark" size={12} color="#FFFFFF" />
        </View>
      ) : null}
    </Pressable>
  );
}

export function ZeichenWebLila() {
  const m = useMerk();
  const [gruppe, setGruppe] = useState<Gruppe>("alle");
  const [suche, setSuche] = useState("");
  const [gewaehlt, setGewaehlt] = useState<string>(ZEICHEN_INFO[0].key);
  const [breite, setBreite] = useState(900);

  const q = suche.trim().toLowerCase();
  const liste = ZEICHEN_INFO.filter((z) => (gruppe === "alle" || z.gruppe === gruppe) && (!q || z.name.toLowerCase().includes(q) || (z.kurz ?? "").toLowerCase().includes(q) || z.bedeutung.toLowerCase().includes(q)));
  const offen = liste.find((z) => z.key === gewaehlt) ?? liste[0] ?? null;
  const gelernt = ZEICHEN_INFO.filter((z) => m.gesehen.includes(z.key)).length;
  const anteil = ZEICHEN_INFO.length ? gelernt / ZEICHEN_INFO.length : 0;
  const gemerkt = offen ? m.gemerkt.includes(offen.key) : false;

  // Angesehen = gelernt
  useEffect(() => {
    if (offen && !merk.gesehen.includes(offen.key)) setzen({ ...merk, gesehen: [...merk.gesehen, offen.key] });
  }, [offen]);

  useTasten((e) => {
    if (!offen || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    e.preventDefault();
    const i = liste.findIndex((z) => z.key === offen.key);
    const neu = liste[(i + (e.key === "ArrowRight" ? 1 : -1) + liste.length) % liste.length];
    if (neu) setGewaehlt(neu.key);
  });

  // Ohne Fragen (Karteikarten aus): zum nächsten noch nicht angesehenen Zeichen springen.
  const weiterLernen = () => {
    if (FRAGEN_AKTIV) return router.push({ pathname: "/karten-lernen", params: { stapel: "zeichen" } });
    const start = offen ? liste.findIndex((z) => z.key === offen.key) : -1;
    const neu = [...liste.slice(start + 1), ...liste.slice(0, start + 1)].find((z) => !m.gesehen.includes(z.key));
    if (neu) setGewaehlt(neu.key);
  };
  const spalten = breite >= 1000 ? 6 : breite >= 800 ? 5 : breite >= 600 ? 4 : 3;
  const reihen: (ZeichenInfo | null)[][] = [];
  for (let i = 0; i < liste.length; i += spalten) {
    const r: (ZeichenInfo | null)[] = liste.slice(i, i + spalten);
    while (r.length < spalten) r.push(null);
    reihen.push(r);
  }
  const r = 21;
  const u = 2 * Math.PI * r;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FAF8FE" }} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Kopf */}
      <View style={{ height: 178, overflow: "hidden" }}>
        <LinearGradient colors={["#F8F5FF", "#F1EBFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
        <Image source={HELD} style={{ position: "absolute", right: 230, top: 0, width: 550, height: 176 }} resizeMode="cover" />
        <View style={{ width: "100%", maxWidth: 1500, alignSelf: "center", paddingHorizontal: 44 }}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate("/lernen"))} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 22, alignSelf: "flex-start" }}>
            <Icon name="arrow-back" size={20} color={T.lila} />
            <Text style={{ ...s.fett, fontSize: 17, color: T.lila }}>Zurück</Text>
          </Pressable>
          <Text style={{ ...s.schwarz, fontSize: 46, lineHeight: 54, color: T.tinte, letterSpacing: -1, marginTop: 6 }}>Verkehrszeichen</Text>
          <Text style={{ ...s.text, fontSize: 19, color: T.tinte2 }}>{ZEICHEN_INFO.length} Zeichen mit Bedeutung, Erklärung und Fundort.</Text>
          <View style={{ width: 96, height: 5, borderRadius: 3, backgroundColor: T.lila, marginTop: 12, marginLeft: 14 }} />
          <Pressable onPress={() => router.push("/schilder-jagd")} style={(z: Zustand) => ({ position: "absolute", right: 44, top: 96, height: 52, paddingHorizontal: 22, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: T.rand, ...schatten, ...knopfHover(!!z.hovered, z.pressed) })}>
            <Icon name="camera" size={22} color={T.lila} />
            <Text style={{ ...s.fett, fontSize: 18, color: T.lilaDunkel }}>Schilder-Jagd</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ width: "100%", maxWidth: 1500, alignSelf: "center", paddingHorizontal: 44 }}>
        {/* Zahlen */}
        <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", height: 76, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: T.rand, marginTop: 6, ...schatten }}>
          <Zahl icon={<Icon name="layers-outline" size={24} color={T.lila} />} wert={String(ZEICHEN_INFO.length)} titel="Zeichen gesamt" />
          <View style={{ width: 1.5, height: 44, backgroundColor: "#EEE9F6" }} />
          <Zahl icon={<Icon name="checkmark" size={26} color="#16A34A" />} grund="#E2F7E8" wert={String(gelernt)} titel="Angesehen" />
          <View style={{ width: 1.5, height: 44, backgroundColor: "#EEE9F6" }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 22 }}>
            <Svg width={50} height={50}>
              <Circle cx={25} cy={25} r={r} stroke="#ECE4FB" strokeWidth={6} fill="none" />
              <Circle cx={25} cy={25} r={r} stroke={T.lila} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={`${u * Math.max(0.001, anteil)} ${u}`} transform="rotate(-90 25 25)" />
            </Svg>
            <View>
              <Text style={{ ...s.schwarz, fontSize: 23, color: T.tinte }}>{Math.round(anteil * 100)} %</Text>
              <Text style={{ ...s.text, fontSize: 14, color: T.tinte2 }}>Fortschritt</Text>
            </View>
          </View>
        </View>

        {/* Filter + Suche */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 30 }}>
          {GRUPPEN.map((g) => {
            const an = gruppe === g.id;
            const zahl = ZEICHEN_INFO.filter((z) => g.id === "alle" || z.gruppe === g.id).length;
            const farbe = g.id === "gefahr" ? "#E5303A" : g.id === "vorschrift" ? "#1F6FE5" : g.id === "richt" ? "#16A34A" : T.lila;
            return (
              <Pressable key={g.id} onPress={() => setGruppe(g.id)} style={(z: Zustand) => ({ height: 50, borderRadius: 16, overflow: "hidden", borderWidth: an ? 0 : 1.5, borderColor: T.rand, backgroundColor: "#FFFFFF", ...schatten, ...knopfHover(!!z.hovered, z.pressed), shadowOpacity: an ? 0.3 : 0.07 })}>
                {an ? <LinearGradient colors={["#8B5CF6", "#6D28D9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} /> : null}
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 22 }}>
                  <Icon name={g.icon} size={22} color={an ? "#FFFFFF" : farbe} />
                  <Text style={{ ...s.fett, fontSize: 16, color: an ? "#FFFFFF" : T.tinte }}>{g.titel}</Text>
                  <Text style={{ ...s.fett, fontSize: 15, color: an ? "rgba(255,255,255,0.85)" : T.lila }}>{zahl}</Text>
                </View>
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          <View style={{ width: 340, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: T.rand, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 18, gap: 10, ...schatten }}>
            <Icon name="search" size={21} color={T.tinte} />
            <TextInput value={suche} onChangeText={setSuche} placeholder="Zeichen suchen …" placeholderTextColor={T.tinte3} accessibilityLabel="Zeichen suchen" style={{ flex: 1, ...s.text, fontSize: 16, color: T.tinte, outlineStyle: "none" } as never} />
          </View>
        </View>

        {/* Raster + Detail */}
        <View style={{ flexDirection: "row", gap: 28, alignItems: "flex-start", marginTop: 26 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 14 }} onLayout={(e) => setBreite(e.nativeEvent.layout.width)}>
            {liste.length ? (
              reihen.map((reihe, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 14 }}>
                  {reihe.map((z, k) => (z ? <Kachel key={z.key} z={z} aktiv={offen?.key === z.key} gelernt={m.gesehen.includes(z.key)} onPress={() => setGewaehlt(z.key)} /> : <View key={`l${k}`} style={{ flex: 1 }} />))}
                </View>
              ))
            ) : (
              <View style={{ padding: 30, alignItems: "center", borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: T.rand }}>
                <Text style={{ ...s.fett, fontSize: 18, color: T.tinte }}>Kein Zeichen gefunden</Text>
                <Text style={{ ...s.text, fontSize: 15, color: T.tinte2, marginTop: 4 }}>Zu „{suche.trim()}“ gibt es hier kein Zeichen.</Text>
              </View>
            )}
          </View>

          {offen ? (
            <View style={{ width: 410, position: "sticky" as ViewStyle["position"], top: 12, borderRadius: 26, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: T.rand, padding: 26, ...schatten, shadowOpacity: 0.12 }}>
              <Pressable
                onPress={() => setzen({ ...merk, gemerkt: gemerkt ? merk.gemerkt.filter((k) => k !== offen.key) : [...merk.gemerkt, offen.key] })}
                accessibilityLabel={gemerkt ? "Nicht mehr merken" : "Merken"}
                style={(z: Zustand) => ({ position: "absolute", top: 18, right: 18, zIndex: 2, width: 46, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: gemerkt ? "#C9B2F8" : T.rand, backgroundColor: gemerkt ? T.zart : "#FFFFFF", alignItems: "center", justifyContent: "center", ...schatten, ...knopfHover(!!z.hovered, z.pressed) })}
              >
                <Icon name={gemerkt ? "bookmark" : "bookmark-outline"} size={22} color={gemerkt ? T.lila : T.tinte} />
              </Pressable>
              <View style={{ alignItems: "center", paddingVertical: 10, height: 170, justifyContent: "center" }}>
                <View style={{ position: "absolute", width: 300, height: 120, borderRadius: 60, backgroundColor: "#F4EFFD" }} />
                <View style={{ position: "relative" }}>
                  <Verkehrszeichen zeichen={offen.key} groesse={150} />
                </View>
              </View>
              <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 11, height: 30, borderRadius: 10, backgroundColor: GRUPPE_FARBE[offen.gruppe][0], marginTop: 14 }}>
                <Icon name={offen.gruppe === "gefahr" ? "warning" : offen.gruppe === "vorschrift" ? "alert-circle" : "information-circle"} size={16} color={GRUPPE_FARBE[offen.gruppe][1]} />
                <Text style={{ ...s.fett, fontSize: 14, color: GRUPPE_FARBE[offen.gruppe][1] }}>{GRUPPE_FARBE[offen.gruppe][2]}</Text>
              </View>
              <Text style={{ ...s.schwarz, fontSize: 30, lineHeight: 36, color: T.tinte, marginTop: 10 }}>{offen.name}</Text>
              <Text style={{ ...s.text, fontSize: 17, lineHeight: 25, color: T.tinte2, marginTop: 6 }}>{offen.bedeutung}</Text>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 18, padding: 16, borderRadius: 16, backgroundColor: "#F6F2FD" }}>
                <Icon name="location" size={22} color={T.lila} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...s.fett, fontSize: 16, color: T.lilaDunkel }}>Wo du es findest</Text>
                  <Text style={{ ...s.text, fontSize: 14.5, lineHeight: 20, color: T.tinte2, marginTop: 2 }}>{offen.fundort}</Text>
                </View>
              </View>
              <Pressable onPress={weiterLernen} style={(z: Zustand) => ({ marginTop: 18, borderRadius: 16, ...weich, ...knopfHover(!!z.hovered, z.pressed), shadowColor: T.lila, shadowOpacity: 0.32, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } })}>
                <LinearGradient colors={["#8B5CF6", "#6D28D9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <Icon name={FRAGEN_AKTIV ? "albums-outline" : "school-outline"} size={22} color="#FFFFFF" />
                  <Text style={{ ...s.fett, fontSize: 18, color: "#FFFFFF" }}>{FRAGEN_AKTIV ? "Als Karteikarten lernen" : "Nächstes neues Zeichen"}</Text>
                  <Icon name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}
