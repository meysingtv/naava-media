import { useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { Icon, type IconName } from "@/components/icon";
import { LinienIcon } from "@/components/linien-icon";
import { type Zustand } from "@/components/web/bunt";
import { L, LKarte } from "@/components/web/home-web-lila";
import { istGesehen, useKurse, type Kurs } from "@/lib/kurse";
import { themaBild } from "@/lib/lernthemen";
import { karteHover, knopfHover, weich } from "@/components/web/hover";

// Lernen am PC im lila Design (Vorlage 1:1): Kopf mit Auto und Kennzahlen,
// vier Lernhilfen als Kacheln, darunter alle Themen (Videokurse) mit Suche,
// Filter und Fortschritt. Alle Zahlen aus dem echten Kurs-Fortschritt.

const AUTO = require("../../../assets/images/web/held-auto.png");
const s = {
  schwarz: { fontFamily: "Nunito_900Black" },
  fett: { fontFamily: "Nunito_800ExtraBold" },
  halb: { fontFamily: "Nunito_700Bold" },
  text: { fontFamily: "Nunito_600SemiBold" },
} as const;

type Filter = "alle" | "arbeit" | "fertig";
const statusVon = (k: Kurs): "offen" | "arbeit" | "fertig" => (k.videos.length && k.gesehen === k.videos.length ? "fertig" : k.gesehen > 0 ? "arbeit" : "offen");
const minSek = (sek: number) => `${Math.floor(sek / 60)}:${String(Math.round(sek % 60)).padStart(2, "0")}`;

const HILFEN: { titel: string; unter: string; icon: IconName; farbe: [string, string]; grund: [string, string]; rand: string; pfad: string }[] = [
  { titel: "Kurz erklärt", unter: "Regeln in\n30 Sekunden", icon: "bulb-outline", farbe: ["#A06BFF", "#7C3AED"], grund: ["#FBF8FF", "#EFE5FF"], rand: "#E6DAFB", pfad: "/kurz-erklaert" },
  { titel: "Verkehrszeichen", unter: "Alle Zeichen\neinfach erklärt", icon: "warning", farbe: ["#FFC23A", "#F59E0B"], grund: ["#FFFDF7", "#FFF1D9"], rand: "#F8E6BE", pfad: "/zeichen" },
  { titel: "Formeln", unter: "Anhalteweg, Bremsweg\n& Co.", icon: "calculator-outline", farbe: ["#7ED957", "#4CB944"], grund: ["#FBFEF9", "#EAF8E4"], rand: "#D9F0CF", pfad: "/formeln" },
  { titel: "Schilder-Jagd", unter: "Schilder in deiner\nUmgebung sammeln", icon: "camera-outline", farbe: ["#4FB3FF", "#1E8EF0"], grund: ["#F9FCFF", "#E4F2FF"], rand: "#D3E8FB", pfad: "/schilder-jagd" },
];

function Knopf({ titel, icon, art, onPress }: { titel: string; icon: IconName; art: "voll" | "zart" | "rand"; onPress: () => void }) {
  if (art === "voll")
    return (
      <Pressable onPress={onPress} style={(z: Zustand) => ({ ...weich, flex: 1, borderRadius: 12, ...knopfHover(!!z.hovered, z.pressed), shadowColor: "#7C3AED", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } })}>
        <LinearGradient colors={["#8B5CF6", "#6D28D9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 44, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <Icon name={icon} size={18} color="#FFFFFF" />
          <Text style={{ ...s.fett, fontSize: 15.5, color: "#FFFFFF" }}>{titel}</Text>
        </LinearGradient>
      </Pressable>
    );
  return (
    <Pressable onPress={onPress} style={(z: Zustand) => ({ ...weich, flex: art === "zart" ? 1 : 0.78, height: 44, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: art === "zart" ? (z.hovered ? "#E6DAFD" : "#EFE6FD") : z.hovered ? "#FAF8FF" : "#FFFFFF", borderWidth: art === "rand" ? 1.5 : 0, borderColor: "#E6E0F0" , ...knopfHover(!!z.hovered, z.pressed) })}>
      <Icon name={icon} size={19} color={art === "zart" ? L.lila : L.tinte} />
      <Text style={{ ...s.fett, fontSize: 15.5, color: art === "zart" ? L.lila : L.tinte }}>{titel}</Text>
    </Pressable>
  );
}

function KursKarte({ k }: { k: Kurs }) {
  const st = statusVon(k);
  const p = k.videos.length ? k.gesehen / k.videos.length : 0;
  const naechstes = k.videos.find((v) => !istGesehen(v.id)) ?? k.videos[0];
  const details = () => router.push({ pathname: "/thema/[id]", params: { id: k.thema.id } });
  const los = () => (naechstes ? router.push({ pathname: "/themavideo", params: { id: naechstes.id } }) : details());
  const minuten = Math.max(1, Math.round(k.dauer / 60));
  return (
    <LKarte style={{ flex: 1, height: 222, flexDirection: "row", padding: 14, gap: 16 }}>
      <Pressable onPress={los} style={{ width: 164, height: 190, borderRadius: 14, overflow: "hidden" }}>
        <Image source={themaBild(k.thema)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2.5, borderColor: "#FFFFFF", backgroundColor: "rgba(20,14,30,0.4)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
          </View>
        </View>
        {naechstes?.dauer ? (
          <Text style={{ position: "absolute", left: 12, bottom: 10, ...s.fett, fontSize: 16, color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }}>{minSek(naechstes.dauer)}</Text>
        ) : null}
      </Pressable>
      <View style={{ flex: 1, paddingTop: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
          <Text style={{ ...s.schwarz, fontSize: 21, lineHeight: 25, color: L.tinte, flex: 1 }} numberOfLines={2}>
            {k.thema.titel}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: st === "fertig" ? "#E7F7EC" : st === "arbeit" ? "#E8F2FF" : "#F2F0F6" }}>
            {st === "fertig" ? <Icon name="checkmark-circle" size={16} color="#22A447" /> : st === "arbeit" ? <Icon name="sync" size={15} color="#2F80ED" /> : <Icon name="lock-closed-outline" size={14} color="#6F6783" />}
            <Text style={{ ...s.halb, fontSize: 13, color: st === "fertig" ? "#15803D" : st === "arbeit" ? "#1F6FD1" : "#5E5670" }}>{st === "fertig" ? "Abgeschlossen" : st === "arbeit" ? "In Arbeit" : "Noch offen"}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
          <Icon name="videocam-outline" size={17} color={L.tinte2} />
          <Text style={{ ...s.text, fontSize: 14.5, color: L.tinte2 }}>{k.videos.length ? (k.videos.length === 1 ? "1 Video" : `${k.videos.length} Videos`) : "Videos folgen"}</Text>
          {k.videos.length ? (
            <>
              <Text style={{ color: L.tinte3 }}>·</Text>
              <Icon name="time-outline" size={17} color={L.tinte2} />
              <Text style={{ ...s.text, fontSize: 14.5, color: L.tinte2 }}>ca. {minuten} Min.</Text>
            </>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 22 }}>
          <View style={{ flex: 1, height: 9, borderRadius: 5, backgroundColor: "#ECE7F5", overflow: "hidden" }}>
            <LinearGradient colors={st === "fertig" ? ["#22C55E", "#16A34A"] : ["#7C3AED", "#C084FC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.round(p * 100)}%`, height: "100%", borderRadius: 5 }} />
          </View>
          <Text style={{ ...s.fett, fontSize: 15.5, color: L.tinte, width: 46, textAlign: "right" }}>{Math.round(p * 100)} %</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginTop: "auto", paddingBottom: 6 }}>
          {st === "fertig" ? <Knopf titel="Wiederholen" icon="refresh" art="zart" onPress={los} /> : <Knopf titel={st === "arbeit" ? "Weiterlernen" : "Starten"} icon="play" art="voll" onPress={los} />}
          <Knopf titel="Details" icon="information-circle-outline" art="rand" onPress={details} />
        </View>
      </View>
    </LKarte>
  );
}

export function LernenWebLila() {
  const { kurse } = useKurse();
  const [filter, setFilter] = useState<Filter>("alle");
  const [suche, setSuche] = useState("");
  const fertig = kurse.filter((k) => statusVon(k) === "fertig");
  const arbeit = kurse.filter((k) => statusVon(k) === "arbeit");
  const videos = kurse.reduce((sum, k) => sum + k.videos.length, 0);
  const q = suche.trim().toLowerCase();
  const liste = (filter === "alle" ? kurse : filter === "arbeit" ? arbeit : fertig).filter((k) => !q || `${k.thema.titel} ${k.thema.kurz}`.toLowerCase().includes(q));
  const paare: Kurs[][] = [];
  for (let i = 0; i < liste.length; i += 2) paare.push(liste.slice(i, i + 2));

  const FILTER: { id: Filter; titel: string; zahl: number; icon: React.ReactNode }[] = [
    { id: "alle", titel: "Alle Themen", zahl: kurse.length, icon: <LinienIcon name="raster" size={19} color={L.lila} /> },
    { id: "arbeit", titel: "In Arbeit", zahl: arbeit.length, icon: <Icon name="sync" size={18} color="#7C3AED" /> },
    { id: "fertig", titel: "Abgeschlossen", zahl: fertig.length, icon: <Icon name="checkmark-circle" size={20} color="#22A447" /> },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FBF9FF" }} contentContainerStyle={{ paddingLeft: 20, paddingRight: 22, paddingBottom: 48 }}>
      <View style={{ width: "100%", maxWidth: 1500, alignSelf: "center" }}>
        {/* Kopf */}
        <View style={{ height: 222, flexDirection: "row" }}>
          <View style={{ paddingLeft: 20, paddingTop: 50, width: 330 }}>
            <Text style={{ ...s.schwarz, fontSize: 54, lineHeight: 60, color: L.tinte, letterSpacing: -1 }}>Lernen</Text>
            <Text style={{ ...s.text, fontSize: 18, lineHeight: 25, color: "#3D3350", marginTop: 6 }}>Strukturiert lernen, gezielt üben und sicher zur Prüfung.</Text>
            <Svg width={124} height={14} style={{ marginLeft: 70, marginTop: 4 }}>
              <Path d="M3 10 C 40 3, 85 2, 121 5" stroke={L.lila} strokeWidth={3.5} strokeLinecap="round" fill="none" />
            </Svg>
          </View>
          <View style={{ flex: 1, alignItems: "center" }}>
            <View style={{ position: "absolute", top: 40, width: 360, height: 170, borderRadius: 90, backgroundColor: "#EFE6FD", transform: [{ rotate: "-6deg" }] }} />
            <Image source={AUTO} style={{ width: 300, height: 203, marginTop: 10 }} resizeMode="contain" />
          </View>
          <LKarte style={{ width: 420, height: 142, marginTop: 36, flexDirection: "row", alignItems: "center", paddingHorizontal: 22, overflow: "hidden" }}>
            <LinearGradient colors={["#FFFFFF", "#F6F0FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
              <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "#F0E8FD", alignItems: "center", justifyContent: "center" }}>
                <Icon name="ribbon-outline" size={30} color={L.lila} />
              </View>
              <View>
                <Text style={{ ...s.schwarz, fontSize: 28, color: L.tinte }}>
                  {fertig.length} / {kurse.length}
                </Text>
                <Text style={{ ...s.text, fontSize: 15.5, lineHeight: 19, color: L.tinte2 }}>Themen{"\n"}abgeschlossen</Text>
              </View>
            </View>
            <View style={{ width: 1.5, height: 92, backgroundColor: "#ECE6F6", marginHorizontal: 18 }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
              <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "#F0E8FD", alignItems: "center", justifyContent: "center" }}>
                <Icon name="play-outline" size={32} color={L.lila} style={{ marginLeft: 4 }} />
              </View>
              <View>
                <Text style={{ ...s.schwarz, fontSize: 28, color: L.tinte }}>{videos}</Text>
                <Text style={{ ...s.text, fontSize: 15.5, lineHeight: 19, color: L.tinte2 }}>Videos{"\n"}gesamt</Text>
              </View>
            </View>
          </LKarte>
        </View>

        {/* Lernhilfen */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
          {HILFEN.map((h) => (
            <Pressable key={h.titel} onPress={() => router.push(h.pfad as never)} style={(z: Zustand) => ({ ...weich, flex: 1, minHeight: 150, borderRadius: 20, borderWidth: 1.5, borderColor: z.hovered ? "#CDB8F5" : h.rand, overflow: "hidden", shadowColor: "#5B2BB5", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } , ...karteHover(!!z.hovered, z.pressed) })}>
              <LinearGradient colors={h.grund} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
              <View style={{ flexDirection: "row", gap: 16, padding: 18, paddingBottom: 6 }}>
                <LinearGradient colors={h.farbe} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 62, height: 62, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={h.icon} size={34} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1, paddingTop: 4 }}>
                  <Text style={{ ...s.schwarz, fontSize: 20, color: L.tinte }} numberOfLines={1}>{h.titel}</Text>
                  <Text style={{ ...s.text, fontSize: 15, lineHeight: 19, color: "#3D3350", marginTop: 2 }}>{h.unter}</Text>
                </View>
              </View>
              <View style={{ alignSelf: "flex-end", marginRight: 16, marginBottom: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#5B2BB5", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
                <Icon name="chevron-forward" size={22} color={L.lila} />
              </View>
            </Pressable>
          ))}
        </View>

        {/* Alle Themen */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 40, marginBottom: 22 }}>
          <Text style={{ ...s.schwarz, fontSize: 32, color: L.tinte, flex: 1 }}>Alle Themen</Text>
          <View style={{ width: 250, height: 46, borderRadius: 14, borderWidth: 1.5, borderColor: "#E6DFF1", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10 }}>
            <LinienIcon name="suche" size={20} color={L.tinte2} />
            <TextInput value={suche} onChangeText={setSuche} placeholder="Thema suchen …" placeholderTextColor="#8C84A0" style={{ flex: 1, ...s.text, fontSize: 15.5, color: L.tinte, outlineStyle: "none" } as never} />
          </View>
          {FILTER.map((f) => {
            const an = filter === f.id;
            return (
              <Pressable key={f.id} onPress={() => setFilter(f.id)} style={(z: Zustand) => ({ ...weich, height: 46, paddingHorizontal: 16, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 9, borderWidth: an ? 2 : 1.5, borderColor: an ? "#A47BF5" : z.hovered ? "#D9CBF5" : "#E6E0F0", backgroundColor: an ? "#F4EEFF" : "#FFFFFF" , ...knopfHover(!!z.hovered, z.pressed) })}>
                {f.icon}
                <Text style={{ ...s.halb, fontSize: 15, color: an ? L.lilaDunkel : L.tinte }}>
                  {f.titel} ({f.zahl})
                </Text>
              </Pressable>
            );
          })}
        </View>
        {liste.length ? (
          <View style={{ gap: 22 }}>
            {paare.map((p, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 22 }}>
                {p.map((k) => (
                  <KursKarte key={k.thema.id} k={k} />
                ))}
                {p.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))}
          </View>
        ) : (
          <LKarte style={{ padding: 26, alignItems: "center" }}>
            <Text style={{ ...s.fett, fontSize: 17, color: L.tinte }}>Keine Themen gefunden</Text>
            <Text style={{ ...s.text, fontSize: 14.5, color: L.tinte2, marginTop: 4 }}>Probier eine andere Suche oder einen anderen Filter.</Text>
          </LKarte>
        )}
      </View>
    </ScrollView>
  );
}
