import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";

import { Icon, type IconName } from "@/components/icon";
import { LinienIcon } from "@/components/linien-icon";
import { Verkehrszeichen, ZEICHEN_INFO, type ZeichenInfo } from "@/components/zeichen";
import { B, Chip, Knopf, n, TOENE, type Zustand } from "@/components/web/bunt";
import { L, LKarte } from "@/components/web/home-web-lila";
import { datumLang } from "@/lib/format";
import type { ZeichenKey } from "@/lib/fragen";
import { ALBUM, XP_JE_SCHILD } from "@/lib/schilder-jagd";
import { useStand } from "@/lib/stand";

// Schilder-Jagd am PC im lila Design (Vorlage 1:1): Kopf mit Auto und Straße,
// drei Karten (Album mit Level, Fortschritt je Kategorie, Tages-Challenge),
// großer Scan-Knopf, Filter mit Suche und die Sammlung als Raster oder Liste.
// Alle Zahlen kommen aus dem echten Album (stand.schilder).

const BILD = {
  held: require("../../../assets/images/web/jagd-held.png"),
  dekoLinks: require("../../../assets/images/web/jagd-deko-links.png"),
  dekoRechts: require("../../../assets/images/web/jagd-deko-rechts.png"),
  pokal: require("../../../assets/images/web/jagd-pokal.png"),
};
const s = {
  schwarz: { fontFamily: "Nunito_900Black" },
  fett: { fontFamily: "Nunito_800ExtraBold" },
  halb: { fontFamily: "Nunito_700Bold" },
  text: { fontFamily: "Nunito_600SemiBold" },
} as const;

type Gruppe = ZeichenInfo["gruppe"];
const GRUPPEN: { id: Gruppe; titel: string; kurz: string; icon: IconName; farbe: string; balken: string }[] = [
  { id: "gefahr", titel: "Gefahrenzeichen", kurz: "Gefahrenzeichen", icon: "warning", farbe: "#E5303A", balken: "#22C55E" },
  { id: "vorschrift", titel: "Vorschriftzeichen", kurz: "Vorschriftzeichen", icon: "alert-circle", farbe: "#1F6FE5", balken: "#1F8BEA" },
  { id: "richt", titel: "Richtzeichen", kurz: "Richtzeichen", icon: "arrow-forward-circle", farbe: "#1F6FE5", balken: "#F59E0B" },
];
const CHALLENGE = 3;
const STUFE = 300;

function infoVon(key: ZeichenKey): ZeichenInfo | undefined {
  return ZEICHEN_INFO.find((z) => z.key === key);
}
const scannen = () => router.push("/schild-scanner");
const heuteKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
function levelTitel(level: number) {
  return level >= 7 ? "Schilder-Meister" : level >= 4 ? "Schilder-Profi" : level >= 2 ? "Schilder-Sucher" : "Schilder-Neuling";
}

function Ring({ anteil, groesse, dicke, farbe, spur, children }: { anteil: number; groesse: number; dicke: number; farbe: string; spur: string; children?: React.ReactNode }) {
  const r = (groesse - dicke) / 2;
  const u = 2 * Math.PI * r;
  return (
    <View style={{ width: groesse, height: groesse, alignItems: "center", justifyContent: "center" }}>
      <Svg width={groesse} height={groesse} style={{ position: "absolute" }}>
        <Circle cx={groesse / 2} cy={groesse / 2} r={r} stroke={spur} strokeWidth={dicke} fill="none" />
        <Circle cx={groesse / 2} cy={groesse / 2} r={r} stroke={farbe} strokeWidth={dicke} fill="none" strokeLinecap="round" strokeDasharray={`${u * Math.max(0.001, Math.min(1, anteil))} ${u}`} transform={`rotate(-90 ${groesse / 2} ${groesse / 2})`} />
      </Svg>
      {children}
    </View>
  );
}

function Striche({ style, farbe = L.lila }: { style: ViewStyle; farbe?: string }) {
  return (
    <Svg width={40} height={34} style={style}>
      <Path d="M8 4 L10 15" stroke={farbe} strokeWidth={3.2} strokeLinecap="round" />
      <Path d="M24 3 L18 16" stroke={farbe} strokeWidth={3.2} strokeLinecap="round" />
      <Path d="M35 17 L24 22" stroke={farbe} strokeWidth={3.2} strokeLinecap="round" />
    </Svg>
  );
}

function Balken({ anteil, farbe, hoehe = 9 }: { anteil: number; farbe: string; hoehe?: number }) {
  return (
    <View style={{ height: hoehe, borderRadius: hoehe / 2, backgroundColor: "#ECE7F6", overflow: "hidden", flex: 1 }}>
      <View style={{ width: `${Math.round(Math.max(0, Math.min(1, anteil)) * 100)}%`, height: "100%", borderRadius: hoehe / 2, backgroundColor: farbe }} />
    </View>
  );
}

type Zustandsart = "gefunden" | "ziel" | "offen";

function SchildKarte({ z, art, onPress }: { z: ZeichenInfo; art: Zustandsart; onPress: () => void }) {
  const farben =
    art === "gefunden"
      ? { grund: ["#F6FCF7", "#EEF9F1"] as const, rand: "#D5EFDC" }
      : art === "ziel"
        ? { grund: ["#FFFBEF", "#FFF4DA"] as const, rand: "#F2C94C" }
        : { grund: ["#FFFFFF", "#F8F6FB"] as const, rand: "#E7E2EF" };
  return (
    <Pressable onPress={onPress} style={(st: Zustand) => ({ flex: 1, height: 184, borderRadius: 18, borderWidth: art === "ziel" ? 2 : 1.5, borderColor: st.hovered ? L.lila : farben.rand, overflow: "visible", shadowColor: "#5B2BB5", shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } })}>
      <LinearGradient colors={farben.grund} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 17 }} />
      {art === "ziel" ? (
        <View style={{ position: "absolute", top: -12, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, backgroundColor: "#FBD35A", zIndex: 2 }}>
          <LinienIcon name="zielsymbol" size={14} color="#3A2A00" />
          <Text style={{ ...s.fett, fontSize: 12.5, color: "#3A2A00" }}>Tagesziel</Text>
        </View>
      ) : null}
      {art === "gefunden" ? (
        <View style={{ position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: "#22B35A", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
          <Icon name="checkmark" size={17} color="#FFFFFF" />
        </View>
      ) : null}
      {art === "offen" ? (
        <View style={{ position: "absolute", top: 10, right: 12, zIndex: 2 }}>
          <LinienIcon name="schloss" size={20} color="#6F6783" />
        </View>
      ) : null}
      <View style={{ flex: 1, alignItems: "center", paddingTop: 20, paddingHorizontal: 10 }}>
        <View style={{ height: 74, justifyContent: "center", opacity: art === "offen" ? 0.35 : 1 }}>
          <Verkehrszeichen zeichen={z.key} groesse={70} />
        </View>
        <Text numberOfLines={1} style={{ ...s.fett, fontSize: 15, color: art === "offen" ? "#7A7290" : L.tinte, marginTop: 10, textAlign: "center" }}>
          {z.kurz ?? z.name}
        </Text>
        <View style={{ marginTop: "auto", marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 28, borderRadius: 14, backgroundColor: art === "gefunden" ? "#DDF4E3" : art === "ziel" ? "#FFE9C2" : "#EFECF4" }}>
          {art === "gefunden" ? <Icon name="checkmark" size={15} color="#15803D" /> : art === "ziel" ? <Icon name="camera" size={14} color="#D9480F" /> : <Icon name="lock-closed" size={13} color="#4B4560" />}
          <Text style={{ ...s.fett, fontSize: 13, color: art === "gefunden" ? "#15803D" : art === "ziel" ? "#9A3412" : "#4B4560" }} numberOfLines={1}>
            {art === "gefunden" ? "Gefunden" : art === "ziel" ? "Scannen & sammeln" : "Noch nicht gefunden"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function SchilderJagdWeb() {
  const { stand } = useStand();
  const { width } = useWindowDimensions();
  const [offen, setOffen] = useState<ZeichenInfo | null>(null);
  const [gruppe, setGruppe] = useState<Gruppe | "alle">("alle");
  const [suche, setSuche] = useState("");
  const [nur, setNur] = useState<"alle" | "gefunden" | "offen">("alle");
  const [liste, setListe] = useState(false);

  const album = ALBUM.map(infoVon).filter((z): z is ZeichenInfo => Boolean(z));
  const gefunden = album.filter((z) => stand.schilder[z.key]);
  const anteil = album.length ? gefunden.length / album.length : 0;
  // Level aus den XP (15 je Schild, Bonus fürs Quiz)
  const xp = stand.xp;
  const level = Math.floor(xp / STUFE) + 1;
  const imLevel = xp % STUFE;
  // Tages-Challenge: heute neu gefundene Schilder
  const heute = heuteKey(new Date());
  const heuteGefunden = Object.values(stand.schilder).filter((d) => heuteKey(new Date(d)) === heute).length;
  // Tagesziel: jeden Tag ein anderes Schild, das noch fehlt (wie am Handy)
  const offene = album.filter((z) => !stand.schilder[z.key]);
  const tag = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  const ziel = offene.length > 0 ? offene[(tag * 7) % offene.length] : null;

  const q = suche.trim().toLowerCase();
  // Das Tagesziel steht vorne, damit man es sofort sieht
  const sortiert = ziel ? [ziel, ...album.filter((z) => z.key !== ziel.key)] : album;
  const sichtbar = sortiert.filter((z) => {
    if (gruppe !== "alle" && z.gruppe !== gruppe) return false;
    if (q && !`${z.name} ${z.kurz ?? ""}`.toLowerCase().includes(q)) return false;
    if (nur === "gefunden" && !stand.schilder[z.key]) return false;
    if (nur === "offen" && stand.schilder[z.key]) return false;
    return true;
  });
  const spalten = width >= 1350 ? 6 : width >= 1100 ? 5 : 4;
  const reihen: (ZeichenInfo | null)[][] = [];
  for (let i = 0; i < sichtbar.length; i += spalten) {
    const r: (ZeichenInfo | null)[] = sichtbar.slice(i, i + spalten);
    while (r.length < spalten) r.push(null);
    reihen.push(r);
  }
  const artVon = (z: ZeichenInfo): Zustandsart => (stand.schilder[z.key] ? "gefunden" : ziel?.key === z.key ? "ziel" : "offen");
  const offenFund = offen ? stand.schilder[offen.key] : undefined;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#FBF9FF" }} contentContainerStyle={{ paddingLeft: 28, paddingRight: 24, paddingBottom: 48 }}>
      <View style={{ width: "100%", maxWidth: 1180 }}>
        {/* Kopf */}
        <View style={{ height: 190 }}>
          <Image source={BILD.held} style={{ position: "absolute", right: -24, top: 0, width: 680, height: 185 }} resizeMode="cover" />
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.navigate("/heute"))} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 24, marginLeft: 14, alignSelf: "flex-start" }}>
            <Icon name="arrow-back" size={18} color={L.tinte2} />
            <Text style={{ ...s.halb, fontSize: 16, color: L.tinte2 }}>Zurück</Text>
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 14, marginLeft: 12 }}>
            <LinienIcon name="zielsymbol" size={56} color={L.lila} />
            <Text style={{ ...s.schwarz, fontSize: 50, lineHeight: 56, color: L.tinte, letterSpacing: -1 }}>Schilder-Jagd</Text>
          </View>
          <View style={{ marginLeft: 14 }}>
            <Text style={{ ...s.text, fontSize: 19, color: "#3D3350" }}>
              Echte Verkehrsschilder finden, scannen <Text style={{ ...s.fett, color: L.tinte }}>und sammeln!</Text>
            </Text>
            <Svg width={160} height={12} style={{ marginLeft: 290, marginTop: -2 }}>
              <Path d="M3 8 C 50 2, 110 1, 157 5" stroke={L.lila} strokeWidth={3.5} strokeLinecap="round" fill="none" />
            </Svg>
          </View>
        </View>

        {/* Drei Karten */}
        <View style={{ flexDirection: "row", gap: 14, marginTop: 4 }}>
          {/* Album */}
          <View style={{ flex: 470 }}>
            <View style={{ position: "absolute", left: 6, right: -2, top: 8, bottom: -6, borderRadius: 22, borderWidth: 1.5, borderColor: "#DCCBF6", backgroundColor: "#F1E9FD" }} />
            <LKarte style={{ height: 222, borderColor: "#D9C8F7", overflow: "hidden" }}>
              <LinearGradient colors={["#FFFFFF", "#F4EDFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
              <View style={{ position: "absolute", left: 18, top: -2, width: 40, height: 52, backgroundColor: "#8B5CF6", borderBottomLeftRadius: 4, borderBottomRightRadius: 4, alignItems: "center", paddingTop: 12 }}>
                <Icon name="star" size={22} color="#FFC83D" />
              </View>
              <Striche style={{ position: "absolute", right: 30, top: 18 }} />
              <Text style={{ ...s.fett, fontSize: 21, color: L.tinte, marginLeft: 82, marginTop: 16 }}>Dein Schilder-Album</Text>
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 52, marginTop: 10, gap: 30 }}>
                <Ring anteil={anteil} groesse={150} dicke={13} farbe={L.lila} spur="#E7DDFB">
                  <Text style={{ ...s.schwarz, fontSize: 36, color: L.tinte }}>{Math.round(anteil * 100)} %</Text>
                  <Text style={{ ...s.text, fontSize: 14, lineHeight: 18, color: L.tinte2, textAlign: "center" }}>
                    {gefunden.length} von {album.length}{"\n"}Schildern
                  </Text>
                </Ring>
                <View style={{ flex: 1, gap: 22 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Image source={BILD.pokal} style={{ width: 54, height: 54 }} />
                    <View>
                      <Text style={{ ...s.fett, fontSize: 17, color: L.tinte }}>Level {level}</Text>
                      <Text style={{ ...s.text, fontSize: 14.5, color: L.tinte2 }}>{levelTitel(level)}</Text>
                    </View>
                  </View>
                  <View style={{ gap: 8 }}>
                    <Text style={{ ...s.halb, fontSize: 14, color: L.tinte }}>
                      {imLevel.toLocaleString("de-DE")} / {STUFE.toLocaleString("de-DE")} XP
                    </Text>
                    <View style={{ height: 14, borderRadius: 7, backgroundColor: "#E7DDFB", overflow: "hidden" }}>
                      <LinearGradient colors={["#7C3AED", "#9F67FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.round((imLevel / STUFE) * 100)}%`, height: "100%", borderRadius: 7 }} />
                    </View>
                  </View>
                </View>
              </View>
            </LKarte>
          </View>

          {/* Kategorien */}
          <LKarte style={{ flex: 350, height: 222, paddingHorizontal: 20, paddingTop: 16, gap: 14 }}>
            <Text style={{ ...s.fett, fontSize: 18.5, color: L.tinte }}>Kategorien – Dein Fortschritt</Text>
            {GRUPPEN.map((gr) => {
              const alle = album.filter((z) => z.gruppe === gr.id);
              const ok = alle.filter((z) => stand.schilder[z.key]).length;
              return (
                <View key={gr.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 38, borderBottomWidth: gr.id === "richt" ? 0 : 1, borderBottomColor: "#F0ECF6" }}>
                  <Icon name={gr.icon} size={28} color={gr.farbe} />
                  <Text style={{ ...s.halb, fontSize: 14, color: L.tinte, width: 112 }} numberOfLines={1}>
                    {gr.titel}
                  </Text>
                  <Balken anteil={alle.length ? ok / alle.length : 0} farbe={gr.balken} />
                  <Text style={{ ...s.halb, fontSize: 13.5, color: L.tinte, width: 48, textAlign: "right" }}>
                    {ok} / {alle.length}
                  </Text>
                </View>
              );
            })}
          </LKarte>

          {/* Tages-Challenge */}
          <View style={{ flex: 330, height: 222, borderRadius: 18, borderWidth: 1.5, borderColor: "#F3DFA8", overflow: "hidden", shadowColor: "#B7791F", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}>
            <LinearGradient colors={["#FFF9E8", "#FFF3D2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
            <View style={{ position: "absolute", right: 16, top: 26 }}>
              <LinienIcon name="funken" size={18} color="#F2C14E" />
            </View>
            <View style={{ position: "absolute", right: 18, bottom: 24 }}>
              <LinienIcon name="funken" size={14} color="#F2C14E" />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 16 }}>
              <LinearGradient colors={["#FFC94D", "#F59E0B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" }}>
                <Icon name="calendar-outline" size={20} color="#FFFFFF" />
              </LinearGradient>
              <Text style={{ ...s.fett, fontSize: 21, color: L.tinte }}>Tages-Challenge</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 32, paddingRight: 18, marginTop: 12 }}>
              <Text style={{ ...s.fett, fontSize: 17, lineHeight: 24, color: L.tinte, flex: 1 }}>Scanne heute {CHALLENGE} neue Verkehrsschilder!</Text>
              <Ring anteil={Math.min(1, heuteGefunden / CHALLENGE)} groesse={86} dicke={9} farbe={L.lila} spur="#F3E7C9">
                <Text style={{ ...s.schwarz, fontSize: 19, color: L.tinte }}>
                  {Math.min(heuteGefunden, CHALLENGE)} / {CHALLENGE}
                </Text>
              </Ring>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 30, marginTop: 4, alignSelf: "flex-start", paddingRight: 18, borderRadius: 26, backgroundColor: "#FFEBB8" }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFD98A", alignItems: "center", justifyContent: "center" }}>
                <Icon name="gift" size={28} color="#E0572D" />
              </View>
              <Text style={{ ...s.schwarz, fontSize: 19, color: "#B4451A" }}>+{CHALLENGE * XP_JE_SCHILD} XP</Text>
            </View>
          </View>
        </View>

        {/* Scannen */}
        <View style={{ height: 112, marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
          <LinearGradient colors={["rgba(240,232,255,0)", "#F1E9FF", "rgba(240,232,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: "absolute", left: 0, right: 0, top: 10, bottom: 6, borderRadius: 50 }} />
          <Image source={BILD.dekoLinks} style={{ position: "absolute", left: 30, width: 300, height: 90 }} resizeMode="contain" />
          <Image source={BILD.dekoRechts} style={{ position: "absolute", right: 30, width: 333, height: 90 }} resizeMode="contain" />
          <Pressable onPress={scannen} accessibilityRole="button" style={(st: Zustand) => ({ borderRadius: 36, opacity: st.pressed ? 0.88 : 1, shadowColor: "#7C3AED", shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } })}>
            <LinearGradient colors={["#9D6BFF", "#6D28D9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 390, height: 70, borderRadius: 35, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, borderWidth: 2, borderColor: "rgba(255,255,255,0.35)" }}>
              <Icon name="camera" size={32} color="#FFFFFF" />
              <Text style={{ ...s.fett, fontSize: 28, color: "#FFFFFF" }}>Schild scannen</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Filter */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 }}>
          {[{ id: "alle" as const, titel: "Alle", zahl: album.length }, ...GRUPPEN.map((gr) => ({ id: gr.id, titel: gr.titel, zahl: album.filter((z) => z.gruppe === gr.id).length }))].map((f) => {
            const an = gruppe === f.id;
            const gr = GRUPPEN.find((x) => x.id === f.id);
            const inhalt = (
              <>
                {gr ? <Icon name={gr.icon} size={26} color={gr.farbe} /> : <LinienIcon name="raster" size={20} color="#FFFFFF" />}
                <Text style={{ ...s.fett, fontSize: 15, color: an ? "#FFFFFF" : L.tinte }}>
                  {f.titel} <Text style={{ ...s.halb, color: an ? "rgba(255,255,255,0.85)" : L.tinte2 }}>({f.zahl})</Text>
                </Text>
              </>
            );
            return (
              <Pressable key={f.id} onPress={() => setGruppe(f.id)} style={(st: Zustand) => ({ height: 44, borderRadius: 12, overflow: "hidden", borderWidth: an ? 0 : 1.5, borderColor: st.hovered ? "#CDB8F5" : "#ECE6F6", backgroundColor: "#FFFFFF", shadowColor: "#5B2BB5", shadowOpacity: an ? 0.3 : 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } })}>
                {an ? (
                  <LinearGradient colors={["#8B5CF6", "#6D28D9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 44, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", gap: 10 }}>
                    {inhalt}
                  </LinearGradient>
                ) : (
                  <View style={{ height: 41, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 10 }}>{inhalt}</View>
                )}
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          <View style={{ width: 204, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: "#E6DFF1", backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}>
            <LinienIcon name="suche" size={18} color={L.tinte2} />
            <TextInput value={suche} onChangeText={setSuche} placeholder="Schild suchen …" placeholderTextColor="#8C84A0" style={{ flex: 1, ...s.text, fontSize: 14.5, color: L.tinte, outlineStyle: "none" } as never} />
          </View>
          <Pressable
            onPress={() => setNur(nur === "alle" ? "gefunden" : nur === "gefunden" ? "offen" : "alle")}
            accessibilityLabel={nur === "alle" ? "Nur gefundene zeigen" : nur === "gefunden" ? "Nur offene zeigen" : "Alle zeigen"}
            style={(st: Zustand) => ({ width: 44, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: nur !== "alle" ? L.lila : "#E6DFF1", backgroundColor: st.hovered || nur !== "alle" ? L.lilaZart : "#FFFFFF", alignItems: "center", justifyContent: "center" })}
          >
            <LinienIcon name="filter" size={20} color={nur !== "alle" ? L.lila : L.tinte2} />
          </Pressable>
        </View>

        {/* Sammlung */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 22, marginBottom: 16 }}>
          <Text style={{ ...s.schwarz, fontSize: 27, color: L.tinte, flex: 1 }}>
            Deine Sammlung{nur !== "alle" ? <Text style={{ ...s.halb, fontSize: 16, color: L.lila }}>{nur === "gefunden" ? "  · nur gefundene" : "  · nur offene"}</Text> : null}
          </Text>
          <Text style={{ ...s.halb, fontSize: 15, color: L.tinte2, marginRight: 18 }}>
            {gefunden.length} von {album.length} Schildern gesammelt
          </Text>
          <View style={{ flexDirection: "row", borderRadius: 12, borderWidth: 1.5, borderColor: "#ECE6F6", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
            {[false, true].map((l) => (
              <Pressable key={String(l)} onPress={() => setListe(l)} style={{ width: 44, height: 38, alignItems: "center", justifyContent: "center", backgroundColor: liste === l ? L.lilaZart : "#FFFFFF" }}>
                <LinienIcon name={l ? "liste" : "raster"} size={20} color={liste === l ? L.lila : L.tinte2} />
              </Pressable>
            ))}
          </View>
        </View>

        {sichtbar.length === 0 ? (
          <LKarte style={{ padding: 28, alignItems: "center" }}>
            <Text style={{ ...s.fett, fontSize: 17, color: L.tinte }}>Kein Schild gefunden</Text>
            <Text style={{ ...s.text, fontSize: 14.5, color: L.tinte2, marginTop: 4 }}>Probier eine andere Suche oder einen anderen Filter.</Text>
          </LKarte>
        ) : liste ? (
          <LKarte style={{ paddingVertical: 6 }}>
            {sichtbar.map((z, i) => {
              const art = artVon(z);
              const fund = stand.schilder[z.key];
              return (
                <Pressable key={z.key} onPress={() => setOffen(z)} style={(st: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 18, height: 64, borderTopWidth: i ? 1 : 0, borderTopColor: "#F0ECF6", backgroundColor: st.hovered ? "#FBF9FF" : "transparent" })}>
                  <View style={{ opacity: art === "offen" ? 0.35 : 1 }}>
                    <Verkehrszeichen zeichen={z.key} groesse={40} />
                  </View>
                  <Text style={{ ...s.fett, fontSize: 15.5, color: L.tinte, flex: 1 }}>{z.name}</Text>
                  <Text style={{ ...s.halb, fontSize: 13.5, color: art === "gefunden" ? "#15803D" : art === "ziel" ? "#9A3412" : L.tinte3 }}>
                    {fund ? `Gefunden am ${datumLang(new Date(fund))}` : art === "ziel" ? "Tagesziel" : "Noch nicht gefunden"}
                  </Text>
                  <Icon name="chevron-forward" size={18} color={L.tinte3} />
                </Pressable>
              );
            })}
          </LKarte>
        ) : (
          <View style={{ gap: 18 }}>
            {reihen.map((r, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 14, paddingTop: 10 }}>
                {r.map((z, k) => (z ? <SchildKarte key={z.key} z={z} art={artVon(z)} onPress={() => setOffen(z)} /> : <View key={`leer${k}`} style={{ flex: 1 }} />))}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Ein Schild im Detail */}
      <Modal visible={offen != null} transparent animationType="fade" onRequestClose={() => setOffen(null)}>
        <Pressable onPress={() => setOffen(null)} style={{ flex: 1, backgroundColor: "rgba(31,21,48,0.35)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          {offen ? (
            <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 480, borderRadius: 22, backgroundColor: "#FFFFFF", padding: 28, gap: 18, alignItems: "center" }}>
              <Pressable onPress={() => setOffen(null)} accessibilityLabel="Schließen" style={(st: Zustand) => ({ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: st.hovered ? L.lilaZart : "transparent" })}>
                <Icon name="close" size={20} color={L.tinte2} />
              </Pressable>
              <View style={{ width: 168, height: 168, borderRadius: 84, alignItems: "center", justifyContent: "center", backgroundColor: L.lilaZart }}>
                <View style={{ opacity: offenFund ? 1 : 0.3 }}>
                  <Verkehrszeichen zeichen={offen.key} groesse={124} />
                </View>
              </View>
              {offenFund ? <Chip icon="checkmark-circle" text={`Gefunden am ${datumLang(new Date(offenFund))}`} ton={TOENE.gruen} /> : <Chip icon="lock-closed" text="Noch nicht gefunden" ton={{ farbe: B.text3, kante: B.text2, hell: B.ton }} />}
              <View style={{ gap: 6, alignSelf: "stretch" }}>
                <Text style={{ ...n.schwarz, fontSize: 22, color: L.tinte, textAlign: "center" }}>{offen.name}</Text>
                <Text style={{ ...n.halb, fontSize: 15, lineHeight: 22, color: L.tinte2, textAlign: "center" }}>{offen.bedeutung}</Text>
              </View>
              <View style={{ alignSelf: "stretch", flexDirection: "row", alignItems: "flex-start", gap: 12, paddingTop: 16, borderTopWidth: 1.5, borderTopColor: "#F0ECF6" }}>
                <Icon name="location" size={20} color={L.lila} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ ...n.fett, fontSize: 13.5, color: L.tinte }}>Wo findest du es?</Text>
                  <Text style={{ ...n.halb, fontSize: 14, lineHeight: 20, color: L.tinte2 }}>{offen.fundort}</Text>
                </View>
              </View>
              <View style={{ alignSelf: "stretch", flexDirection: "row", gap: 10 }}>
                <Knopf titel="Schließen" art="rand" ton="blau" onPress={() => setOffen(null)} style={{ flex: 1 }} />
                {offenFund ? null : (
                  <Knopf
                    titel="Jetzt suchen"
                    icon="camera"
                    onPress={() => {
                      setOffen(null);
                      scannen();
                    }}
                    style={{ flex: 1 }}
                  />
                )}
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
