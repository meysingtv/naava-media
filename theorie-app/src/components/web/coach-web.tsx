import { useRef } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { LinienIcon, themaIcon, type LinienIconName } from "@/components/linien-icon";
import Svg, { Path } from "react-native-svg";
import { type Zustand } from "@/components/web/bunt";
import { L, LKarte } from "@/components/web/home-web-lila";
import { istGesehen, restVon, stelleVon, useKurse, weiterlernen, type Kurs } from "@/lib/kurse";
import { KATEGORIEN, themaBild, type Kategorie } from "@/lib/lernthemen";
import { useStand } from "@/lib/stand";

// Videokurse (Coach) am PC im lila Design nach Vorlage: Hero mit Auto und
// Straße, „Weiterlernen“ mit dem zuletzt geschauten Video, „Beliebte
// Videokurse“ als Reihe zum Blättern und „Neue Themen“.

const HELD = require("../../../assets/images/web/coach-held.png");
const s = {
  schwarz: { fontFamily: "Nunito_900Black" },
  fett: { fontFamily: "Nunito_800ExtraBold" },
  halb: { fontFamily: "Nunito_700Bold" },
  text: { fontFamily: "Nunito_600SemiBold" },
  kopf: { fontFamily: "BarlowCondensed_800ExtraBold" },
} as const;

const KAT_ICON: Record<Kategorie, LinienIconName> = { theorie: "theorie", praxis: "praxis", kurzvideos: "kurzvideos", technik: "technik" };
const katTitel = (k: Kategorie) => KATEGORIEN.find((x) => x.id === k)?.titel ?? "Theorie";
const minSek = (sek: number) => {
  const h = Math.floor(sek / 3600), m = Math.floor((sek % 3600) / 60), r = Math.round(sek % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
};
const minuten = (sek: number) => `${Math.max(1, Math.round(sek / 60))} Min.`;

function Kopf({ titel, link, linkIcon, onLink, extra }: { titel: string; link?: string; linkIcon?: IconName; onLink?: () => void; extra?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
      <Text style={{ ...s.kopf, fontSize: 30, color: L.tinte, letterSpacing: 0.2 }}>{titel}</Text>
      {extra}
      <View style={{ flex: 1 }} />
      {link ? (
        <Pressable onPress={onLink} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {linkIcon ? <Icon name={linkIcon} size={17} color={L.lila} /> : null}
          <Text style={{ ...s.halb, fontSize: 16, color: L.lila }}>{link}</Text>
          <Icon name="chevron-forward" size={18} color={L.lila} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Plakette({ icon, text }: { icon: LinienIconName; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 42, paddingHorizontal: 14, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.75)", borderWidth: 1.5, borderColor: "#E6DCFA" }}>
      <LinienIcon name={icon} size={22} color={L.lila} />
      <Text style={{ ...s.halb, fontSize: 15, color: L.tinte }}>{text}</Text>
    </View>
  );
}

function KatChip({ k }: { k: Kategorie }) {
  return (
    <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: L.lilaZart }}>
      <LinienIcon name={KAT_ICON[k]} size={16} color={L.lila} />
      <Text style={{ ...s.halb, fontSize: 13, color: L.lilaDunkel }}>{katTitel(k)}</Text>
    </View>
  );
}

export function CoachWeb() {
  const { stand } = useStand();
  const { geladen, kurse } = useKurse();
  const reihe = useRef<ScrollView>(null);
  const pos = useRef(0);
  const mitVideos = kurse.filter((k) => k.videos.length);
  const weiter = weiterlernen(kurse);
  const beliebt = [...mitVideos].sort((a, b) => b.lernende - a.lernende);
  const neu = [...kurse].slice(-4).reverse();
  const klasse = stand.klasse || "B";

  const blaettern = (r: number) => {
    pos.current = Math.max(0, pos.current + r * 270);
    reihe.current?.scrollTo({ x: pos.current, animated: true });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#F5F1FF" }} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Hero */}
      <View style={{ height: 352, overflow: "hidden" }}>
        <LinearGradient colors={["#F2EAFF", "#F6F1FF", "#F3EEFD"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
        <Image source={HELD} style={{ position: "absolute", right: 0, top: 0, width: 665, height: 351 }} resizeMode="cover" />
        <View style={{ width: "100%", maxWidth: 1500, alignSelf: "center", paddingLeft: 46, paddingTop: 26 }}>
          <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, height: 34, paddingHorizontal: 16, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.8)", borderWidth: 1.5, borderColor: "#E6DCFA" }}>
            <Icon name="play" size={14} color={L.tinte} />
            <Text style={{ ...s.halb, fontSize: 15, color: L.tinte }}>Videokurse</Text>
          </View>
          <Text style={{ ...s.schwarz, fontSize: 44, lineHeight: 47, color: L.tinte, marginTop: 14, letterSpacing: -1.4 }}>
            Lerne mit kurzen Videos{"\n"}für Theorie & <Text style={{ color: L.lila }}>Praxis</Text>.
          </Text>
          <Svg width={112} height={14} style={{ marginLeft: 284, marginTop: -2 }}><Path d="M3 9 C 30 3, 75 2, 109 7" stroke={L.lila} strokeWidth={4} strokeLinecap="round" fill="none" /></Svg>
          <Text style={{ ...s.text, fontSize: 16.5, lineHeight: 22, color: "#3D3350", marginTop: 14, maxWidth: 400 }}>
            Verständliche Erklärungen, echte Beispiele und praxisnahe Tipps – so meisterst du Theorieprüfung und Fahrpraxis Schritt für Schritt.
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
            <Plakette icon="video" text="Kurze Videos" />
            <Plakette icon="crosshair" text="Praxisnah" />
            <Plakette icon="bolt" text="Schnell lernen" />
          </View>
        </View>
      </View>

      <View style={{ paddingLeft: 40, paddingRight: 40, width: "100%", maxWidth: 1500, alignSelf: "center" }}>
        {/* Weiterlernen */}
        <View style={{ marginTop: 18 }}>
          <Kopf titel="WEITERLERNEN" link="Lernfortschritt ansehen" linkIcon="stats-chart" onLink={() => router.navigate("/heute")} />
          {weiter ? (
            <WeiterKarte kurs={weiter.kurs} videoId={weiter.video.id} titel={weiter.kurs.thema.titel} klasse={klasse} />
          ) : (
            <LKarte style={{ padding: 24 }}>
              <Text style={{ ...s.fett, fontSize: 17, color: L.tinte }}>{geladen ? "Noch keine Videokurse" : "Kurse werden geladen …"}</Text>
            </LKarte>
          )}
        </View>

        {/* Beliebte Videokurse */}
        {beliebt.length ? (
          <View style={{ marginTop: 30 }}>
            <Kopf titel="BELIEBTE VIDEOKURSE" link="Alle Videokurse anzeigen" onLink={() => router.navigate("/lernen")} />
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ScrollView ref={reihe} horizontal showsHorizontalScrollIndicator={false} onScroll={(e) => (pos.current = e.nativeEvent.contentOffset.x)} scrollEventThrottle={32} contentContainerStyle={{ gap: 16, paddingVertical: 10, paddingHorizontal: 24 }} style={{ flex: 1 }}>
                {beliebt.map((k) => (
                  <LKarte key={k.thema.id} onPress={() => router.push({ pathname: "/thema/[id]", params: { id: k.thema.id } })} style={{ width: 256, overflow: "hidden" }}>
                    <View style={{ height: 114 }}>
                      <Image source={themaBild(k.thema)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      <View style={{ position: "absolute", left: 12, bottom: 10, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: "rgba(18,12,28,0.72)" }}>
                        <Icon name="time-outline" size={15} color="#FFFFFF" />
                        <Text style={{ ...s.fett, fontSize: 13.5, color: "#FFFFFF" }}>{minuten(k.dauer)}</Text>
                      </View>
                    </View>
                    <View style={{ padding: 14, paddingTop: 10, height: 92, justifyContent: "space-between" }}>
                      <Text style={{ ...s.fett, fontSize: 17, lineHeight: 20, color: L.tinte }} numberOfLines={2}>
                        {k.thema.titel}
                      </Text>
                      <KatChip k={k.thema.kategorie} />
                    </View>
                  </LKarte>
                ))}
              </ScrollView>
              <View style={{ position: "absolute", left: -6 }}>
                <PfeilKnopf icon="chevron-back" onPress={() => blaettern(-1)} />
              </View>
              <View style={{ position: "absolute", right: -6 }}>
                <PfeilKnopf icon="chevron-forward" onPress={() => blaettern(1)} />
              </View>
            </View>
          </View>
        ) : null}

        {/* Neue Themen */}
        {neu.length ? (
          <View style={{ marginTop: 26 }}>
            <Kopf
              titel="NEUE THEMEN"
              extra={<View style={{ marginLeft: 12, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12, backgroundColor: L.lilaZart }}><Text style={{ ...s.fett, fontSize: 14, color: L.lilaDunkel }}>Neu</Text></View>}
              link="Alle neuen Themen"
              onLink={() => router.navigate("/lernen")}
            />
            <View style={{ flexDirection: "row", gap: 14 }}>
              {neu.map((k) => (
                <LKarte key={k.thema.id} onPress={() => router.push({ pathname: "/thema/[id]", params: { id: k.thema.id } })} style={{ flex: 1, height: 94, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 12, backgroundColor: "#FCFAFF" }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: L.lilaZart, alignItems: "center", justifyContent: "center" }}>
                    <LinienIcon name={themaIcon(k.thema.titel, k.thema.kategorie)} size={32} color={L.lila} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...s.fett, fontSize: 15.5, lineHeight: 19, color: L.tinte }} numberOfLines={2}>
                      {k.thema.titel}
                    </Text>
                    {k.thema.kurz ? (
                      <Text style={{ ...s.text, fontSize: 12.5, lineHeight: 16, color: L.tinte2, marginTop: 2 }} numberOfLines={2}>
                        {k.thema.kurz}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: L.lilaZart, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="chevron-forward" size={17} color={L.lila} />
                  </View>
                </LKarte>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function PfeilKnopf({ icon, onPress }: { icon: IconName; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={(z: Zustand) => ({ width: 40, height: 40, borderRadius: 20, backgroundColor: z.hovered ? L.lilaZart : "#FFFFFF", borderWidth: 1.5, borderColor: L.rand, alignItems: "center", justifyContent: "center", shadowColor: "#5B2BB5", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } })}>
      <Icon name={icon} size={20} color={L.lila} />
    </Pressable>
  );
}

function WeiterKarte({ kurs, videoId, titel, klasse }: { kurs: Kurs; videoId: string; titel: string; klasse: string }) {
  const video = kurs.videos.find((v) => v.id === videoId) ?? kurs.videos[0];
  const dauer = video?.dauer ?? 0;
  const stelle = stelleVon(videoId);
  const rest = restVon(videoId) ?? dauer;
  const p = kurs.videos.length ? kurs.videos.filter((v) => istGesehen(v.id)).length / kurs.videos.length : 0;
  const los = () => router.push({ pathname: "/themavideo", params: { id: videoId } });
  return (
    <LKarte style={{ height: 214, flexDirection: "row", padding: 12, gap: 28, overflow: "hidden", shadowOpacity: 0.12, shadowRadius: 24 }}>
      <LinearGradient colors={["#FFFFFF", "#F8F4FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      <Pressable onPress={los} style={{ width: 436, height: 190, borderRadius: 14, overflow: "hidden" }}>
        <Image source={themaBild(kurs.thema)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.35)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 70 }} />
        {rest ? (
          <View style={{ position: "absolute", left: 12, top: 12, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: "#FFFFFF" }}>
            <Icon name="play" size={13} color={L.tinte} />
            <Text style={{ ...s.fett, fontSize: 14.5, color: L.tinte }}>Noch {minuten(rest)}</Text>
          </View>
        ) : null}
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12 }}>
            <Icon name="play" size={30} color={L.lila} style={{ marginLeft: 4 }} />
          </View>
        </View>
        {dauer ? (
          <View style={{ position: "absolute", right: 12, bottom: 22, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(20,14,30,0.8)" }}>
            <Text style={{ ...s.fett, fontSize: 14, color: "#FFFFFF" }}>{minSek(dauer)}</Text>
          </View>
        ) : null}
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 10, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.45)" }}>
          <View style={{ position: "absolute", left: 0, width: `${dauer ? Math.min(100, (stelle / dauer) * 100 + 22) : 0}%`, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.9)" }} />
          <View style={{ position: "absolute", left: 0, width: `${dauer ? Math.min(100, (stelle / dauer) * 100) : 0}%`, height: 6, borderRadius: 3, backgroundColor: L.lila }} />
        </View>
      </Pressable>
      <View style={{ flex: 1, justifyContent: "center", paddingRight: 6 }}>
        <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: L.lilaZart }}>
          <Icon name="book-outline" size={16} color={L.lila} />
          <Text style={{ ...s.halb, fontSize: 13, color: L.lilaDunkel }}>{katTitel(kurs.thema.kategorie)} · Klasse {klasse}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 20, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...s.schwarz, fontSize: 25, lineHeight: 29, color: L.tinte, letterSpacing: -0.3 }} numberOfLines={1}>
              {titel}
            </Text>
            {kurs.thema.kurz ? (
              <Text style={{ ...s.text, fontSize: 15.5, lineHeight: 22, color: L.tinte2, marginTop: 4 }} numberOfLines={2}>
                {kurs.thema.kurz}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 }}>
              <Icon name="time-outline" size={17} color={L.tinte2} />
              <Text style={{ ...s.halb, fontSize: 14, color: L.tinte2 }}>{Math.round(p * 100)}% abgeschlossen</Text>
            </View>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: L.spur, marginTop: 8, maxWidth: 370, overflow: "hidden" }}>
              <LinearGradient colors={["#7C3AED", "#9F67FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.round(p * 100)}%`, height: "100%", borderRadius: 5 }} />
            </View>
          </View>
          <View>
          <Svg width={40} height={36} style={{ position: "absolute", right: -6, top: -34 }}>
            <Path d="M10 4 L12 16" stroke={L.lila} strokeWidth={3.5} strokeLinecap="round" />
            <Path d="M26 3 L19 17" stroke={L.lila} strokeWidth={3.5} strokeLinecap="round" />
            <Path d="M36 18 L24 23" stroke={L.lila} strokeWidth={3.5} strokeLinecap="round" />
          </Svg>
          <Pressable onPress={los} accessibilityRole="button" style={(z: Zustand) => ({ borderRadius: 28, opacity: z.pressed ? 0.85 : 1, shadowColor: "#7C3AED", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } })}>
            <LinearGradient colors={["#8B5CF6", "#6D28D9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 56, borderRadius: 28, paddingHorizontal: 34, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Icon name="play" size={22} color="#FFFFFF" />
              <Text style={{ ...s.fett, fontSize: 20, color: "#FFFFFF" }}>Weiterlernen</Text>
            </LinearGradient>
          </Pressable>
          </View>
        </View>
      </View>
    </LKarte>
  );
}
