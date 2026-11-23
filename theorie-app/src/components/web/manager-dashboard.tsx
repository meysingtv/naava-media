import { useEffect, useState, type ReactNode } from "react";
import { Image, Pressable, Text, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";

import { Icon, type IconName } from "@/components/icon";
import { LinienIcon } from "@/components/linien-icon";
import { type Zustand } from "@/components/web/bunt";
import { L } from "@/components/web/home-web-lila";
import { useKurse } from "@/lib/kurse";
import { themaBild } from "@/lib/lernthemen";
import type { ManagerNutzer } from "@/lib/manager";
import { einladungenLaden, meldungenLaden, mitteilungenLaden, pruefungstermineLaden, type Einladung, type Meldungen, type Mitteilung, type Termin, type Zaehler } from "@/lib/verwaltung";

// Manager-Übersicht im lila Design (Vorlage 1:1): sechs Kennzahlen, Hero mit
// Auto und Schnellzugriffen, vier Listen (Einladungen, Prüfungstermine,
// Meldungen, Kurse) und die letzten Aktivitäten. Alles aus echten Daten.

export type DashBereich = "zugaenge" | "einladungen" | "termine" | "meldungen" | "freigaben" | "mitteilungen" | "videos";

const AUTO = require("../../../assets/images/web/held-auto.png");
const s = {
  schwarz: { fontFamily: "Nunito_900Black" },
  fett: { fontFamily: "Nunito_800ExtraBold" },
  halb: { fontFamily: "Nunito_700Bold" },
  text: { fontFamily: "Nunito_600SemiBold" },
} as const;
const schatten: ViewStyle = { shadowColor: "#5B2BB5", shadowOpacity: 0.11, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } };
const karte: ViewStyle = { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1.5, borderColor: "#EEE8F7", ...schatten };
const MONAT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function vorZeit(iso: string) {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 60) return `vor ${Math.max(1, min)} Min.`;
  const std = Math.round(min / 60);
  if (std < 24) return `vor ${std} Std.`;
  const tage = Math.round(std / 24);
  return tage === 1 ? "gestern" : `vor ${tage} Tagen`;
}
const uhrzeit = (iso: string) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";
const kuerzel = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((t) => t[0]?.toUpperCase())
    .join("") || "?";

function Kennzahl({ icon, farbe, grund, wert, titel, rechts, neben, onPress }: { icon: IconName; farbe: string; grund: string; wert: number; titel: string; rechts?: ReactNode; neben?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={(z: Zustand) => [karte, { flex: 1, height: 132, padding: 16, paddingTop: 14, overflow: "hidden", borderColor: z.hovered ? "#D9CBF5" : "#EEE8F7" }]}>
      <LinearGradient colors={["#FFFFFF", "#FAF7FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: grund, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={27} color={farbe} />
        </View>
        {rechts}
      </View>
      <Text style={{ ...s.schwarz, fontSize: 32, lineHeight: 36, color: L.tinte, marginTop: 6 }}>{wert.toLocaleString("de-DE")}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ ...s.text, fontSize: 16, color: L.tinte }} numberOfLines={1}>
          {titel}
        </Text>
        {neben ? (
          <View style={{ paddingHorizontal: 7, height: 22, borderRadius: 7, backgroundColor: "#F3F0F8", justifyContent: "center" }}>
            <Text style={{ ...s.halb, fontSize: 12, color: L.tinte2 }}>{neben}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function Plakette({ text, art = "grau" }: { text: string; art?: "gruen" | "grau" }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, height: 24, borderRadius: 8, backgroundColor: art === "gruen" ? "#E7F8EC" : "#F3F0F8" }}>
      {art === "gruen" ? <Icon name="arrow-up" size={13} color="#16A34A" style={{ transform: [{ rotate: "45deg" }] }} /> : null}
      <Text style={{ ...s.halb, fontSize: 12.5, color: art === "gruen" ? "#15803D" : L.tinte2 }}>{text}</Text>
    </View>
  );
}

function Tafel({ icon, titel, onAlle, children, style }: { icon: ReactNode; titel: string; onAlle: () => void; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[karte, { flex: 1, padding: 14, paddingTop: 14, minHeight: 290 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "#F1EAFE", alignItems: "center", justifyContent: "center" }}>{icon}</View>
        <Text style={{ ...s.fett, fontSize: 15.5, color: L.tinte, flex: 1 }} numberOfLines={2}>
          {titel}
        </Text>
      </View>
      <Pressable onPress={onAlle} style={{ alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 6 }}>
        <Text style={{ ...s.fett, fontSize: 14, color: L.lila }}>Alle anzeigen</Text>
        <Icon name="arrow-forward" size={16} color={L.lila} />
      </Pressable>
      {children}
    </View>
  );
}

function Leer({ text }: { text: string }) {
  return <Text style={{ ...s.text, fontSize: 14, color: L.tinte3, textAlign: "center", paddingVertical: 28 }}>{text}</Text>;
}

type Ereignis = { am: string; art: "einladung" | "zugang" | "meldung" | "mitteilung"; vorgang: string; details: string; status: string; ton: "gruen" | "lila" | "orange" | "blau" };

export function ManagerDashboard({ nutzer, zaehler, onBereich, onAnlegen }: { nutzer: ManagerNutzer[]; zaehler: Zaehler | null; onBereich: (b: DashBereich) => void; onAnlegen: () => void }) {
  const { kurse } = useKurse();
  const [einladungen, setEinladungen] = useState<Einladung[]>([]);
  const [termine, setTermine] = useState<Termin[]>([]);
  const [meldungen, setMeldungen] = useState<Meldungen | null>(null);
  const [mitteilungen, setMitteilungen] = useState<Mitteilung[]>([]);
  const [filter, setFilter] = useState<"alle" | Ereignis["art"]>("alle");

  useEffect(() => {
    einladungenLaden().then(setEinladungen, () => {});
    pruefungstermineLaden().then(setTermine, () => {});
    meldungenLaden().then(setMeldungen, () => {});
    mitteilungenLaden().then(setMitteilungen, () => {});
  }, []);

  const woche = Date.now() - 7 * 86_400_000;
  const schueler = nutzer.filter((x) => x.rolle === "schueler");
  const neuSchueler = schueler.filter((x) => Date.parse(x.erstellt_am) >= woche).length;
  const aktiveKurse = kurse.filter((k) => k.videos.length);
  const neueKurse = aktiveKurse.filter((k) => k.videos.some((v) => v.erstellt_am && Date.parse(v.erstellt_am) >= woche)).length;
  const in30 = Date.now() + 30 * 86_400_000;
  const kommend = termine.filter((t) => Date.parse(t.termin) >= Date.now() - 86_400_000).sort((a, b) => a.termin.localeCompare(b.termin));
  const maxLernende = Math.max(0, ...aktiveKurse.map((k) => k.lernende));
  const termine30 = kommend.filter((t) => Date.parse(t.termin) <= in30).length;
  const offeneMeldungen = zaehler?.meldungen ?? (meldungen ? meldungen.clips.length + meldungen.chat.length : 0);
  const freigaben = (zaehler?.fahrlehrer ?? 0) + (zaehler?.bewerbungen ?? 0);
  const aktiveEinladungen = einladungen.filter((e) => e.aktiv);
  const neueEinladungen = einladungen.filter((e) => Date.parse(e.erstellt_am) >= woche).length;

  // Prüfungstermine nach Tag und Klasse bündeln
  const gruppen: { tag: Date; klasse: string; zahl: number; zeit: string }[] = [];
  for (const t of kommend) {
    const d = new Date(t.termin);
    const g = gruppen.find((x) => x.tag.toDateString() === d.toDateString() && x.klasse === t.klasse);
    if (g) g.zahl++;
    else gruppen.push({ tag: d, klasse: t.klasse, zahl: 1, zeit: uhrzeit(t.termin) });
  }

  const offene = [
    ...(meldungen?.clips ?? []).map((m) => ({ titel: m.gruende[0]?.grund || "Clip gemeldet", unter: `Clip · ${m.autor_name}`, am: m.letzte, art: "clip" as const })),
    ...(meldungen?.chat ?? []).map((m) => ({ titel: m.gruende[0]?.grund || "Nachricht gemeldet", unter: `Chat · ${m.autor_name}`, am: m.letzte, art: "chat" as const })),
  ].sort((a, b) => b.am.localeCompare(a.am));

  const ereignisse: Ereignis[] = [
    ...nutzer.map((x) => ({ am: x.erstellt_am, art: "zugang" as const, vorgang: "Zugang angelegt", details: `${x.name || x.benutzername} · ${x.rolle === "fahrlehrer" ? "Fahrlehrer" : `Klasse ${x.klasse}`}`, status: x.status === "aktiv" ? "Aktiv" : x.status === "pausiert" ? "Pausiert" : "Gesperrt", ton: x.status === "aktiv" ? ("gruen" as const) : ("orange" as const) })),
    ...einladungen.map((e) => ({ am: e.erstellt_am, art: "einladung" as const, vorgang: "Einladung erstellt", details: `${e.notiz || e.code}${e.fahrlehrer ? ` · ${e.fahrlehrer}` : ""}`, status: !e.aktiv ? "Beendet" : e.nutzungen ? "Angemeldet" : "Ausstehend", ton: !e.aktiv ? ("orange" as const) : e.nutzungen ? ("gruen" as const) : ("lila" as const) })),
    ...offene.map((m) => ({ am: m.am, art: "meldung" as const, vorgang: "Meldung eingegangen", details: `${m.titel} · ${m.unter}`, status: "Offen", ton: "orange" as const })),
    ...mitteilungen.map((m) => ({ am: m.erstellt_am, art: "mitteilung" as const, vorgang: "Mitteilung gesendet", details: `${m.titel} · ${m.anzahl} Empfänger`, status: "Gesendet", ton: "gruen" as const })),
  ]
    .filter((e) => e.am && !Number.isNaN(Date.parse(e.am)))
    .sort((a, b) => b.am.localeCompare(a.am));
  const sichtbar = (filter === "alle" ? ereignisse : ereignisse.filter((e) => e.art === filter)).slice(0, 5);
  const ICON: Record<Ereignis["art"], IconName> = { zugang: "people-outline", einladung: "qr-code-outline", meldung: "flag-outline", mitteilung: "megaphone-outline" };
  const TON = { gruen: ["#E7F8EC", "#15803D"], lila: ["#F1EAFE", "#6D28D9"], orange: ["#FFF1DD", "#C2620A"], blau: ["#E8F1FF", "#1F6FD1"] } as const;

  const SCHNELL: { titel: string; icon: IconName; onPress: () => void; voll?: boolean }[] = [
    { titel: "Neue Einladung", icon: "add", onPress: () => onBereich("einladungen"), voll: true },
    { titel: "Prüfungstermine\nansehen", icon: "calendar-outline", onPress: () => onBereich("termine") },
    { titel: "Zugang\nerstellen", icon: "person-add-outline", onPress: onAnlegen },
    { titel: "Kurs\nhinzufügen", icon: "play-circle-outline", onPress: () => onBereich("videos") },
    { titel: "Mitteilung\nsenden", icon: "paper-plane-outline", onPress: () => onBereich("mitteilungen") },
  ];

  return (
    <View style={{ gap: 22 }}>
      {/* Kennzahlen */}
      <View style={{ flexDirection: "row", gap: 14 }}>
        <Kennzahl icon="people-outline" farbe={L.lila} grund="#F1EAFE" wert={schueler.length} titel="Fahrschüler" rechts={neuSchueler ? <Plakette text={`+${neuSchueler}`} art="gruen" /> : null} onPress={() => onBereich("zugaenge")} />
        <Kennzahl icon="school-outline" farbe={L.lila} grund="#F1EAFE" wert={aktiveKurse.length} titel="Aktive Kurse" rechts={neueKurse ? <Plakette text={`+${neueKurse}`} art="gruen" /> : null} onPress={() => onBereich("videos")} />
        <Kennzahl icon="calendar-outline" farbe={L.lila} grund="#F1EAFE" wert={termine30} titel="Prüfungstermine" rechts={<Plakette text="Diese 30 Tage" />} onPress={() => onBereich("termine")} />
        <Kennzahl icon="mail-outline" farbe="#E5303A" grund="#FDECEE" wert={offeneMeldungen} titel="Offene Meldungen" onPress={() => onBereich("meldungen")} />
        <Kennzahl icon="shield-checkmark-outline" farbe="#16A34A" grund="#E7F8EC" wert={freigaben} titel="Freigaben" neben="Offen" onPress={() => onBereich("freigaben")} />
        <Kennzahl icon="qr-code-outline" farbe={L.lila} grund="#F1EAFE" wert={aktiveEinladungen.length} titel="Einladungen" neben="Aktiv" rechts={neueEinladungen ? <Plakette text={`+${neueEinladungen}`} art="gruen" /> : null} onPress={() => onBereich("einladungen")} />
      </View>

      {/* Hero + Schnellzugriffe */}
      <View style={{ flexDirection: "row", gap: 20 }}>
        <View style={[karte, { flex: 488, height: 172, overflow: "hidden", flexDirection: "row", alignItems: "center" }]}>
          <LinearGradient colors={["#F6F0FF", "#FBF9FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <Image source={AUTO} style={{ width: 230, height: 156, marginLeft: 6 }} resizeMode="contain" />
          <View style={{ flex: 1, paddingRight: 18 }}>
            <Text style={{ ...s.schwarz, fontSize: 24, lineHeight: 27, color: L.tinte }}>Schnell, effizient,{"\n"}alles im Griff</Text>
            <Text style={{ ...s.text, fontSize: 15, lineHeight: 19, color: "#3D3350", marginTop: 8 }}>Verwalte Fahrschüler, Kurse, Prüfungen und Kommunikation an einem Ort.</Text>
            <Svg width={90} height={10} style={{ marginLeft: 90, marginTop: 4 }}>
              <Path d="M2 7 C 30 2, 60 1, 88 4" stroke={L.lila} strokeWidth={3} strokeLinecap="round" fill="none" />
            </Svg>
          </View>
        </View>
        <View style={[karte, { flex: 660, height: 172, padding: 18, paddingTop: 14 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon name="flash" size={22} color={L.lila} />
            <Text style={{ ...s.fett, fontSize: 18, color: L.tinte }}>Schnellzugriffe</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12, flex: 1 }}>
            {SCHNELL.map((x) =>
              x.voll ? (
                <Pressable key={x.titel} onPress={x.onPress} style={(z: Zustand) => ({ flex: 1, borderRadius: 14, opacity: z.pressed ? 0.85 : 1, shadowColor: "#7C3AED", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } })}>
                  <LinearGradient colors={["#8B5CF6", "#6D28D9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Icon name={x.icon} size={30} color="#FFFFFF" />
                    <Text style={{ ...s.fett, fontSize: 14, color: "#FFFFFF", textAlign: "center" }}>{x.titel}</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable key={x.titel} onPress={x.onPress} style={(z: Zustand) => ({ flex: 1, borderRadius: 14, borderWidth: 1.5, borderColor: z.hovered ? "#D9CBF5" : "#EEE8F7", backgroundColor: z.hovered ? "#FAF7FF" : "#FFFFFF", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#5B2BB5", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } })}>
                  <Icon name={x.icon} size={30} color={L.lila} />
                  <Text style={{ ...s.halb, fontSize: 13.5, lineHeight: 17, color: L.tinte, textAlign: "center" }}>{x.titel}</Text>
                </Pressable>
              ),
            )}
          </View>
        </View>
      </View>

      {/* Vier Listen */}
      <View style={{ flexDirection: "row", gap: 14 }}>
        <Tafel icon={<LinienIcon name="raster" size={22} color={L.lila} />} titel="Aktuelle Einladungen & QR-Codes" onAlle={() => onBereich("einladungen")}>
          {aktiveEinladungen.length ? (
            aktiveEinladungen.slice(0, 3).map((e) => (
              <View key={e.code} style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 54 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#EFE7FD", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ ...s.schwarz, fontSize: 13, color: L.lilaDunkel }}>{kuerzel(e.notiz || e.fahrlehrer || e.code)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...s.fett, fontSize: 14, color: L.tinte }} numberOfLines={1}>
                    {e.notiz || `Code ${e.code}`}
                  </Text>
                  <Text style={{ ...s.text, fontSize: 12.5, color: L.tinte2 }} numberOfLines={1}>
                    {e.fahrlehrer || "Ohne Fahrlehrer"}
                  </Text>
                </View>
                <View style={{ paddingHorizontal: 7, height: 24, borderRadius: 12, justifyContent: "center", backgroundColor: e.nutzungen ? "#E2F7E8" : "#EFE7FD" }}>
                  <Text style={{ ...s.halb, fontSize: 11.5, color: e.nutzungen ? "#15803D" : L.lilaDunkel }}>{e.nutzungen ? (e.nutzungen === 1 ? "Angemeldet" : `${e.nutzungen} angemeldet`) : "Ausstehend"}</Text>
                </View>
                <Pressable onPress={() => onBereich("einladungen")} hitSlop={6} accessibilityLabel="Einladung verwalten">
                  <Icon name="ellipsis-horizontal" size={20} color={L.tinte} />
                </Pressable>
              </View>
            ))
          ) : (
            <Leer text="Noch keine aktiven Einladungen" />
          )}
          <Pressable onPress={() => onBereich("einladungen")} style={(z: Zustand) => ({ marginTop: "auto", height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: "#E3D8F8", backgroundColor: z.hovered ? "#F3ECFF" : "#F8F4FF", shadowColor: "#5B2BB5", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 })}>
            <Icon name="qr-code-outline" size={19} color={L.lila} />
            <Text style={{ ...s.fett, fontSize: 14.5, color: L.lila }}>QR-Code anzeigen</Text>
          </Pressable>
        </Tafel>

        <Tafel icon={<Icon name="calendar-outline" size={22} color={L.lila} />} titel="Nächste Prüfungstermine" onAlle={() => onBereich("termine")}>
          {gruppen.length ? (
            gruppen.slice(0, 3).map((g, i) => (
              <Pressable key={i} onPress={() => onBereich("termine")} style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 64, borderTopWidth: i ? 1 : 0, borderTopColor: "#F0ECF6" }}>
                <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: "#EFE7FD", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ ...s.schwarz, fontSize: 20, lineHeight: 22, color: L.tinte }}>{g.tag.getDate()}</Text>
                  <Text style={{ ...s.fett, fontSize: 12.5, color: L.tinte }}>{MONAT[g.tag.getMonth()]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...s.fett, fontSize: 14.5, color: L.tinte }}>Klasse {g.klasse}</Text>
                  <Text style={{ ...s.text, fontSize: 13, color: L.tinte2 }}>
                    {g.zahl} {g.zahl === 1 ? "Prüfling" : "Prüflinge"} · {g.zeit}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={18} color={L.tinte} />
              </Pressable>
            ))
          ) : (
            <Leer text="Keine anstehenden Termine" />
          )}
        </Tafel>

        <Tafel icon={<Icon name="flag-outline" size={22} color={L.lila} />} titel="Offene Meldungen" onAlle={() => onBereich("meldungen")}>
          {offene.length ? (
            offene.slice(0, 3).map((m, i) => (
              <Pressable key={i} onPress={() => onBereich("meldungen")} style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 64, borderTopWidth: i ? 1 : 0, borderTopColor: "#F0ECF6" }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: m.art === "clip" ? "#FDECEE" : "#FFF3DF", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={m.art === "clip" ? "warning-outline" : "alert-circle-outline"} size={21} color={m.art === "clip" ? "#E5303A" : "#F08A1C"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...s.fett, fontSize: 14, color: L.tinte }} numberOfLines={1}>
                    {m.titel}
                  </Text>
                  <Text style={{ ...s.text, fontSize: 12.5, color: L.tinte2 }} numberOfLines={1}>
                    {m.unter}
                  </Text>
                </View>
                <Text style={{ ...s.text, fontSize: 12.5, color: L.tinte2 }}>{vorZeit(m.am)}</Text>
              </Pressable>
            ))
          ) : (
            <Leer text="Alles erledigt – keine offenen Meldungen" />
          )}
        </Tafel>

        <Tafel icon={<LinienIcon name="video" size={22} color={L.lila} />} titel="Aktive Kurse & Videos" onAlle={() => onBereich("videos")}>
          {aktiveKurse.length ? (
            aktiveKurse.slice(0, 3).map((k) => (
              <Pressable key={k.thema.id} onPress={() => onBereich("videos")} style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 72 }}>
                <View style={{ width: 86, height: 58, borderRadius: 9, overflow: "hidden" }}>
                  <Image source={themaBild(k.thema)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "#FFFFFF", backgroundColor: "rgba(20,14,30,0.4)", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="play" size={13} color="#FFFFFF" style={{ marginLeft: 2 }} />
                    </View>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...s.fett, fontSize: 14, lineHeight: 17, color: L.tinte }} numberOfLines={2}>
                    {k.thema.titel}
                  </Text>
                  <Text style={{ ...s.text, fontSize: 12, color: L.tinte, marginTop: 2 }} numberOfLines={1}>
                    {k.videos.length} {k.videos.length === 1 ? "Video" : "Videos"} · <Text style={{ ...s.fett }}>{k.lernende} Lernende</Text>
                  </Text>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: "#ECE7F5", marginTop: 5, overflow: "hidden" }}>
                    <View style={{ width: `${maxLernende ? Math.round((k.lernende / maxLernende) * 100) : 0}%`, height: 6, borderRadius: 3, backgroundColor: k.lernende === maxLernende && maxLernende ? "#22C55E" : L.lila }} />
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <Leer text="Noch keine Kurse mit Videos" />
          )}
        </Tafel>
      </View>

      {/* Aktivitäten */}
      <View style={[karte, { padding: 20 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="list" size={26} color={L.lila} />
          <Text style={{ ...s.schwarz, fontSize: 21, color: L.tinte, flex: 1 }}>Aktivitäten</Text>
          {(
            [
              ["alle", "Alle", null],
              ["einladung", "Einladungen", "qr-code-outline"],
              ["zugang", "Zugänge", "people-outline"],
              ["meldung", "Meldungen", "flag-outline"],
              ["mitteilung", "Mitteilungen", "megaphone-outline"],
            ] as const
          ).map(([id, titel, icon]) => (
            <Pressable key={id} onPress={() => setFilter(id)} style={(z: Zustand) => ({ height: 34, paddingHorizontal: 14, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: filter === id ? "#A47BF5" : z.hovered ? "#D9CBF5" : "#ECE6F6", backgroundColor: filter === id ? "#F4EEFF" : "#FFFFFF" })}>
              {icon ? <Icon name={icon} size={15} color={L.tinte} /> : null}
              <Text style={{ ...s.halb, fontSize: 13.5, color: filter === id ? L.lilaDunkel : L.tinte }}>{titel}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: "row", backgroundColor: "#F1EDF8", borderRadius: 8, paddingHorizontal: 14, height: 32, alignItems: "center", marginTop: 16 }}>
          {["Zeit", "Vorgang", "Details", "Status"].map((t, i) => (
            <Text key={t} style={{ ...s.fett, fontSize: 13, color: L.tinte, flex: [1.1, 2, 3.2, 1.6][i] }}>
              {t}
            </Text>
          ))}
        </View>
        {sichtbar.length ? (
          sichtbar.map((e, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, height: 40, borderBottomWidth: i < sichtbar.length - 1 ? 1 : 0, borderBottomColor: "#F0ECF6" }}>
              <Text style={{ ...s.text, fontSize: 13.5, color: L.tinte, flex: 1.1 }}>{Date.now() - Date.parse(e.am) < 86_400_000 ? uhrzeit(e.am) : new Date(e.am).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</Text>
              <View style={{ flex: 2, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Icon name={ICON[e.art]} size={20} color={L.lila} />
                <Text style={{ ...s.fett, fontSize: 13.5, color: L.tinte }}>{e.vorgang}</Text>
              </View>
              <Text style={{ ...s.text, fontSize: 13.5, color: L.tinte, flex: 3.2 }} numberOfLines={1}>
                {e.details}
              </Text>
              <View style={{ flex: 1.6 }}>
                <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: TON[e.ton][0] }}>
                  <Icon name={e.ton === "gruen" ? "checkmark" : e.ton === "orange" ? "alert-circle-outline" : e.ton === "lila" ? "arrow-up" : "ellipse-outline"} size={14} color={TON[e.ton][1]} style={e.ton === "lila" ? { transform: [{ rotate: "45deg" }] } : undefined} />
                  <Text style={{ ...s.halb, fontSize: 13, color: TON[e.ton][1] }}>{e.status}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Leer text="Noch keine Aktivitäten" />
        )}
      </View>
    </View>
  );
}
