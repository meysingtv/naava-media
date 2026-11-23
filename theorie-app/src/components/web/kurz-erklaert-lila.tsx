import { useState } from "react";
import { Image, Pressable, ScrollView, Share, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";

import { ClipBild } from "@/components/clip-bild";
import { Icon, type IconName } from "@/components/icon";
import { type Zustand } from "@/components/web/bunt";
import { useTasten } from "@/components/web/frage-web";
import { L, LKarte } from "@/components/web/home-web-lila";
import { CLIPS, type Clip } from "@/lib/clips";
import { useStand } from "@/lib/stand";
import { karteHover, knopfHover, weich } from "@/components/web/hover";

// Kurz erklärt am PC im lila Design (Vorlage 1:1): oben die bewegte Grafik
// als „Player“ und rechts die drei Sätze, darunter alle Kurz-Clips mit
// Filter nach Kategorie. Pfeiltasten blättern.

const AUTO = require("../../../assets/images/web/held-auto.png");
const s = {
  schwarz: { fontFamily: "Nunito_900Black" },
  fett: { fontFamily: "Nunito_800ExtraBold" },
  halb: { fontFamily: "Nunito_700Bold" },
  text: { fontFamily: "Nunito_600SemiBold" },
} as const;

const KAT: Record<string, { icon: IconName; farbe: string }> = {
  Technik: { icon: "settings-outline", farbe: "#7C3AED" },
  Vorfahrt: { icon: "git-branch-outline", farbe: "#1F9BE8" },
  Autobahn: { icon: "trail-sign-outline", farbe: "#6D28D9" },
  "Besondere Lagen": { icon: "walk-outline", farbe: "#2F80ED" },
  Formeln: { icon: "calculator-outline", farbe: "#22B573" },
  Tempo: { icon: "speedometer-outline", farbe: "#EC4899" },
  Überholen: { icon: "bicycle-outline", farbe: "#F59E0B" },
  Abbiegen: { icon: "return-up-forward-outline", farbe: "#0EA5A4" },
};
const katVon = (k: string) => KAT[k] ?? { icon: "play-circle-outline" as IconName, farbe: L.lila };

function Aktion({ icon, text, aktiv, onPress, label }: { icon: IconName; text?: string; aktiv?: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={(z: Zustand) => ({ ...weich, height: 52, minWidth: 52, paddingHorizontal: text ? 16 : 0, borderRadius: 14, borderWidth: 1.5, borderColor: aktiv ? "#C9B0F7" : z.hovered ? "#D9CBF5" : "#ECE6F6", backgroundColor: aktiv ? L.lilaZart : "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, shadowColor: "#5B2BB5", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } , ...knopfHover(!!z.hovered, z.pressed) })}>
      <Icon name={icon} size={22} color={aktiv ? L.lila : L.tinte} />
      {text ? <Text style={{ ...s.fett, fontSize: 16, color: L.tinte }}>{text}</Text> : null}
    </Pressable>
  );
}

function ClipKarte({ clip, aktiv, gemerkt, onPress, onMerken }: { clip: Clip; aktiv: boolean; gemerkt: boolean; onPress: () => void; onMerken: () => void }) {
  const k = katVon(clip.kategorie);
  const [drueber, setDrueber] = useState(false);
  return (
    <Pressable onPress={onPress} onHoverIn={() => setDrueber(true)} onHoverOut={() => setDrueber(false)} style={(z: Zustand) => ({ ...weich, flex: 1, height: 122, borderRadius: 16, borderWidth: aktiv ? 2 : 1.5, borderColor: aktiv ? "#B78BFA" : z.hovered ? "#D9CBF5" : "#EEE8F7", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", padding: 6, gap: 14, shadowColor: "#5B2BB5", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } , ...karteHover(!!z.hovered, z.pressed) })}>
      <View style={{ width: 172, height: 108, borderRadius: 12, overflow: "hidden", justifyContent: "center", alignItems: "center", backgroundColor: "#EFE8FF" }}>
        <ClipBild bild={clip.bild} breite={172} aktiv={drueber} />
        <View style={{ position: "absolute", left: 8, bottom: 8, width: 30, height: 26, borderRadius: 8, backgroundColor: "rgba(15,10,25,0.7)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="play" size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
        </View>
      </View>
      <View style={{ flex: 1, alignSelf: "stretch", paddingVertical: 10, paddingRight: 10 }}>
        <Text style={{ ...s.fett, fontSize: 16, lineHeight: 20, color: L.tinte }} numberOfLines={3}>
          {clip.titel}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: "auto" }}>
          <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: k.farbe, alignItems: "center", justifyContent: "center" }}>
            <Icon name={k.icon} size={15} color="#FFFFFF" />
          </View>
          <Text style={{ ...s.halb, fontSize: 13.5, color: L.tinte, flex: 1 }} numberOfLines={1}>
            {clip.kategorie}
          </Text>
          <Pressable onPress={onMerken} hitSlop={8} accessibilityLabel="Merken">
            <Icon name={gemerkt ? "bookmark" : "bookmark-outline"} size={20} color={gemerkt ? L.lila : L.tinte} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export function KurzErklaertLila() {
  const { stand, clipUmschalten } = useStand();
  const { start } = useLocalSearchParams<{ start?: string }>();
  const [gewaehlt, setGewaehlt] = useState<string>(() => (start && CLIPS.some((c) => c.id === start) ? start : CLIPS[0].id));
  const [kat, setKat] = useState<string | "alle" | "gemerkt">("alle");
  const [laeuft, setLaeuft] = useState(true);
  const [kopiert, setKopiert] = useState(false);
  const [breite, setBreite] = useState(0);

  const clip = CLIPS.find((c) => c.id === gewaehlt) ?? CLIPS[0];
  const index = CLIPS.indexOf(clip);
  const kategorien = [...new Set(CLIPS.map((c) => c.kategorie))].sort((a, b) => CLIPS.filter((c) => c.kategorie === b).length - CLIPS.filter((c) => c.kategorie === a).length);
  const liste = kat === "alle" ? CLIPS : kat === "gemerkt" ? CLIPS.filter((c) => stand.clips.gemerkt.includes(c.id)) : CLIPS.filter((c) => c.kategorie === kat);
  const reihen: Clip[][] = [];
  for (let i = 0; i < liste.length; i += 3) reihen.push(liste.slice(i, i + 3));
  const gemocht = stand.clips.gemocht.includes(clip.id);
  const gemerkt = stand.clips.gemerkt.includes(clip.id);
  const k = katVon(clip.kategorie);

  function waehlen(id: string) {
    setGewaehlt(id);
    setKopiert(false);
    setLaeuft(true);
  }
  const blaettern = (d: number) => waehlen(CLIPS[(index + d + CLIPS.length) % CLIPS.length].id);
  useTasten((e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      blaettern(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      blaettern(-1);
    }
  });
  function teilen(c: Clip) {
    const text = `${c.titel}\n\n• ${c.punkte.join("\n• ")}\n\nAus der App Fahrschul Pro`;
    Share.share({ message: text }).catch(() => {
      if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(text).then(() => setKopiert(true), () => {});
    });
  }

  const bildB = breite || 630;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FBF9FF" }} contentContainerStyle={{ paddingLeft: 36, paddingRight: 36, paddingBottom: 48 }}>
      <View style={{ width: "100%", maxWidth: 1500, alignSelf: "center" }}>
        {/* Kopf */}
        <View style={{ height: 176 }}>
          <View style={{ position: "absolute", right: -40, top: 60, width: 620, height: 130, borderTopLeftRadius: 400, backgroundColor: "#F1EAFE", transform: [{ rotate: "-4deg" }] }} />
          <Image source={AUTO} style={{ position: "absolute", right: 30, top: 0, width: 240, height: 162 }} resizeMode="contain" />
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate("/lernen"))} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 24, alignSelf: "flex-start" }}>
            <Icon name="arrow-back" size={19} color={L.lila} />
            <Text style={{ ...s.fett, fontSize: 16.5, color: L.lila }}>Zurück</Text>
          </Pressable>
          <Text style={{ ...s.schwarz, fontSize: 50, lineHeight: 58, color: L.tinte, marginTop: 6, letterSpacing: -1 }}>Kurz erklärt</Text>
          <Text style={{ ...s.text, fontSize: 19, color: L.tinte2 }}>Wichtige Regeln einfach und verständlich erklärt.</Text>
        </View>

        {/* Player + Text */}
        <View style={{ flexDirection: "row", gap: 20, marginTop: 8 }}>
          <View onLayout={(e) => setBreite(Math.round(e.nativeEvent.layout.width))} style={{ flex: 632, height: breite ? Math.round((breite * 220) / 300) : 408, borderRadius: 22, overflow: "hidden", backgroundColor: "#1A1230", shadowColor: "#2A1260", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }}>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ClipBild key={clip.id} bild={clip.bild} breite={bildB} aktiv={laeuft} />
            </View>
            <LinearGradient colors={["rgba(15,10,30,0)", "rgba(15,10,30,0.75)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90 }} />
            <View style={{ position: "absolute", left: 22, right: 22, bottom: 18, flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Pressable onPress={() => setLaeuft((x) => !x)} accessibilityLabel={laeuft ? "Anhalten" : "Abspielen"} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" }}>
                <Icon name={laeuft ? "pause" : "play"} size={22} color={L.tinte} style={laeuft ? undefined : { marginLeft: 3 }} />
              </Pressable>
              <Text style={{ ...s.halb, fontSize: 14.5, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>
                {index + 1} / {CLIPS.length}
              </Text>
              <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.3)" }}>
                <View style={{ width: `${((index + 1) / CLIPS.length) * 100}%`, height: 5, borderRadius: 3, backgroundColor: "#FFFFFF" }} />
              </View>
              <Pressable onPress={() => blaettern(-1)} accessibilityLabel="Vorheriger Clip" hitSlop={6}>
                <Icon name="play-skip-back" size={22} color="#FFFFFF" />
              </Pressable>
              <Pressable onPress={() => blaettern(1)} accessibilityLabel="Nächster Clip" hitSlop={6}>
                <Icon name="play-skip-forward" size={22} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <LKarte style={{ flex: 496, padding: 24, paddingTop: 22 }}>
            <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, height: 38, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "#EFE7FD" }}>
              <Icon name={k.icon} size={20} color={L.lila} />
              <Text style={{ ...s.fett, fontSize: 16, color: L.lilaDunkel }}>{clip.kategorie}</Text>
            </View>
            <Text style={{ ...s.schwarz, fontSize: 34, lineHeight: 40, color: L.tinte, marginTop: 16, letterSpacing: -0.5 }}>{clip.titel}</Text>
            <View style={{ gap: 16, marginTop: 20 }}>
              {clip.punkte.map((p, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#EEE6FD", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ ...s.schwarz, fontSize: 16, color: L.lila }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, ...s.text, fontSize: 16, lineHeight: 23, color: L.tinte, marginTop: 5 }}>{p}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: "auto", paddingTop: 18 }}>
              <Pressable onPress={() => router.push({ pathname: "/thema/[id]", params: { id: clip.thema } })} style={(z: Zustand) => ({ ...weich, borderRadius: 14, ...knopfHover(!!z.hovered, z.pressed), shadowColor: "#7C3AED", shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } })}>
                <LinearGradient colors={["#8B5CF6", "#6D28D9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 52, paddingHorizontal: 22, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Icon name="play" size={19} color="#FFFFFF" />
                  <Text style={{ ...s.fett, fontSize: 17, color: "#FFFFFF" }}>Videos zum Thema</Text>
                </LinearGradient>
              </Pressable>
              <Aktion icon={gemocht ? "heart" : "heart-outline"} aktiv={gemocht} text={String(clip.basis + (gemocht ? 1 : 0))} label="Gefällt mir" onPress={() => clipUmschalten(clip.id, "gemocht")} />
              <Aktion icon={gemerkt ? "bookmark" : "bookmark-outline"} aktiv={gemerkt} label="Merken" onPress={() => clipUmschalten(clip.id, "gemerkt")} />
              <Aktion icon={kopiert ? "checkmark" : "share-outline"} aktiv={kopiert} label="Teilen" onPress={() => teilen(clip)} />
            </View>
          </LKarte>
        </View>

        {/* Passende Kurz-Clips */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", marginTop: 40 }}>
          <Icon name="calendar-outline" size={40} color={L.lila} />
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text style={{ ...s.schwarz, fontSize: 30, color: L.tinte }}>Passende Kurz-Clips</Text>
            <Text style={{ ...s.text, fontSize: 16, color: L.tinte2 }}>Kurze, verständliche Erklärungen zu allen Themen.</Text>
          </View>
          <Pressable onPress={() => setKat(kat === "gemerkt" ? "alle" : "gemerkt")} style={(z: Zustand) => ({ ...weich, flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, marginTop: 2, marginRight: 14, backgroundColor: kat === "gemerkt" ? "#F4EEFF" : z.hovered ? "#FAF7FF" : "transparent", borderWidth: 1.5, borderColor: kat === "gemerkt" ? "#A47BF5" : "#ECE6F6" , ...knopfHover(!!z.hovered, z.pressed) })}>
            <Icon name={kat === "gemerkt" ? "bookmark" : "bookmark-outline"} size={17} color={L.lila} />
            <Text style={{ ...s.fett, fontSize: 14, color: L.lilaDunkel }}>Gemerkt{stand.clips.gemerkt.length ? ` (${stand.clips.gemerkt.length})` : ""}</Text>
          </Pressable>
          <Text style={{ ...s.halb, fontSize: 16, color: L.tinte2, marginTop: 8 }}>{liste.length} Clips</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 20, marginBottom: 22 }}>
          {[{ id: "alle", titel: "Alle" }, ...kategorien.map((x) => ({ id: x, titel: x === "Besondere Lagen" ? "Verhalten" : x })).map((x) => x)].map((f) => {
            const an = kat === f.id;
            const icon = f.id === "alle" ? ("grid-outline" as IconName) : f.id === "gemerkt" ? ("bookmark-outline" as IconName) : katVon(f.id).icon;
            const farbe = f.id === "alle" || f.id === "gemerkt" ? L.lila : katVon(f.id).farbe;
            return (
              <Pressable key={f.id} onPress={() => setKat(f.id)} style={(z: Zustand) => ({ ...weich, height: 40, paddingHorizontal: 12, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 7, borderWidth: an ? 2 : 1.5, borderColor: an ? "#A47BF5" : z.hovered ? "#D9CBF5" : "#ECE6F6", backgroundColor: an ? "#F4EEFF" : "#FFFFFF", shadowColor: "#5B2BB5", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } , ...knopfHover(!!z.hovered, z.pressed) })}>
                <Icon name={icon} size={18} color={farbe} />
                <Text style={{ ...s.fett, fontSize: 14, color: an ? L.lilaDunkel : L.tinte }}>{f.titel}</Text>
              </Pressable>
            );
          })}
        </View>
        {liste.length ? (
          <View style={{ gap: 16 }}>
            {reihen.map((r, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 16 }}>
                {r.map((c) => (
                  <ClipKarte key={c.id} clip={c} aktiv={c.id === clip.id} gemerkt={stand.clips.gemerkt.includes(c.id)} onPress={() => waehlen(c.id)} onMerken={() => clipUmschalten(c.id, "gemerkt")} />
                ))}
                {r.length < 3 ? Array.from({ length: 3 - r.length }, (_, j) => <View key={j} style={{ flex: 1 }} />) : null}
              </View>
            ))}
          </View>
        ) : (
          <LKarte style={{ padding: 26, alignItems: "center" }}>
            <Text style={{ ...s.fett, fontSize: 17, color: L.tinte }}>Noch nichts gemerkt</Text>
            <Text style={{ ...s.text, fontSize: 14.5, color: L.tinte2, marginTop: 4 }}>Tipp bei einem Clip auf das Lesezeichen – dann findest du ihn hier wieder.</Text>
          </LKarte>
        )}
      </View>
    </ScrollView>
  );
}
