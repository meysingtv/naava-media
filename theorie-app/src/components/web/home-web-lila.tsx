import { type ReactNode } from "react";
import { Image, Pressable, ScrollView, Text, useWindowDimensions, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Svg, { Circle } from "react-native-svg";

import { Icon, type IconName } from "@/components/icon";
import { type Zustand } from "@/components/web/bunt";
import { useKonto } from "@/lib/konto";
import { dauerLang, istGesehen, lernAktivitaet, useKurse, weiterlernen, type Kurs } from "@/lib/kurse";
import { KATEGORIEN, themaBild } from "@/lib/lernthemen";
import { tageBis, terminDatum } from "@/lib/pruefungstag";
import { useStand } from "@/lib/stand";
import { karteHover, knopfHover, weich } from "@/components/web/hover";

// Home am PC im lila Design (Vorlage 1:1): Begrüßung mit Suche, Glocke und
// Hilfe, zwei Hero-Karten (Lernvideos mit Auto, Prüfungstermin mit Kalender),
// sieben Schnellzugriffe, „Weiterlernen“ mit drei Kursen, „Dein Fortschritt“
// und „Empfohlene nächste Schritte“. Alle Zahlen kommen aus echten Daten.

export const L = {
  grund: "#FAF8FE",
  karte: "#FFFFFF",
  rand: "#EEE8F7",
  tinte: "#1F1530",
  tinte2: "#5E5670",
  tinte3: "#8C84A0",
  lila: "#7C3AED",
  lilaDunkel: "#6425D3",
  lilaZart: "#EFE8FD",
  spur: "#ECE6F6",
};
const schrift = {
  schwarz: { fontFamily: "Nunito_900Black" },
  fett: { fontFamily: "Nunito_800ExtraBold" },
  halb: { fontFamily: "Nunito_700Bold" },
  text: { fontFamily: "Nunito_600SemiBold" },
} as const;

const BILD = {
  auto: require("../../../assets/images/web/held-auto.png"),
  kalender: require("../../../assets/images/web/held-kalender.png"),
};

const schatten: ViewStyle = { shadowColor: "#5B2BB5", shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } };

export function LKarte({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const basis: ViewStyle = { backgroundColor: L.karte, borderRadius: 18, borderWidth: 1.5, borderColor: L.rand, ...schatten };
  if (!onPress) return <View style={[basis, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={(z: Zustand) => [weich, basis, style, z.hovered ? { borderColor: "#DCCFF4" } : null, karteHover(!!z.hovered, z.pressed)]}>
      {children}
    </Pressable>
  );
}

function IconKachel({ icon, farbe, grund, groesse = 40, iconGroesse = 22 }: { icon: IconName; farbe: string; grund: string; groesse?: number; iconGroesse?: number }) {
  return (
    <View style={{ width: groesse, height: groesse, borderRadius: groesse * 0.28, backgroundColor: grund, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={iconGroesse} color={farbe} />
    </View>
  );
}

function KnopfVoll({ titel, icon, onPress, style }: { titel: string; icon: IconName; onPress: () => void; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={(z: Zustand) => [weich, { borderRadius: 12, ...knopfHover(!!z.hovered, z.pressed) }, style]}>
      <LinearGradient colors={["#8B5CF6", "#6D28D9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 46, borderRadius: 12, paddingHorizontal: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <Icon name={icon} size={18} color="#FFFFFF" />
        <Text style={{ ...schrift.halb, fontSize: 16.5, color: "#FFFFFF" }}>{titel}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function KnopfRand({ titel, icon, onPress, style, stark }: { titel: string; icon: IconName; onPress: () => void; style?: ViewStyle; stark?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={(z: Zustand) => [weich, { height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: z.hovered || stark ? L.lila : "#D9CBF5", backgroundColor: z.hovered ? L.lilaZart : "#FFFFFF", paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }, style, knopfHover(!!z.hovered, z.pressed)]}
    >
      <Icon name={icon} size={20} color={L.lila} />
      <Text style={{ ...schrift.halb, fontSize: 16.5, color: L.lila }}>{titel}</Text>
    </Pressable>
  );
}

function RundKnopf({ icon, punkt, onPress, label }: { icon: IconName; punkt?: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={(z: Zustand) => ({ ...weich, width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: L.rand, backgroundColor: z.hovered ? L.lilaZart : "#FFFFFF", alignItems: "center", justifyContent: "center", ...schatten , ...knopfHover(!!z.hovered, z.pressed) })}>
      <Icon name={icon} size={21} color={L.tinte} />
      {punkt ? <View style={{ position: "absolute", top: 8, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: L.lila, borderWidth: 1.5, borderColor: "#FFFFFF" }} /> : null}
    </Pressable>
  );
}

function Abschnitt({ icon, titel, unter, link, onLink }: { icon: ReactNode; titel: string; unter: string; link?: string; onLink?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 18, flex: 1 }}>
        {icon}
        <View>
          <Text style={{ ...schrift.schwarz, fontSize: 28, color: L.tinte, lineHeight: 32 }}>{titel}</Text>
          <Text style={{ ...schrift.text, fontSize: 15, color: L.tinte2 }}>{unter}</Text>
        </View>
      </View>
      {link ? (
        <Pressable onPress={onLink} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 18 }}>
          <Text style={{ ...schrift.halb, fontSize: 16, color: L.lila }}>{link}</Text>
          <Icon name="arrow-forward" size={18} color={L.lila} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Balken({ anteil, hoehe = 8 }: { anteil: number; hoehe?: number }) {
  return (
    <View style={{ height: hoehe, borderRadius: hoehe / 2, backgroundColor: L.spur, overflow: "hidden" }}>
      <LinearGradient colors={["#7C3AED", "#9F67FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.round(Math.max(0, Math.min(1, anteil)) * 100)}%`, height: "100%", borderRadius: hoehe / 2 }} />
    </View>
  );
}

const SCHNELL: { titel: string; icon: IconName; farbe: string; grund: string; rand: string; pfad: string }[] = [
  { titel: "Coach", icon: "school-outline", farbe: "#6D28D9", grund: "#F2ECFD", rand: "#E2D6FA", pfad: "/coach" },
  { titel: "Lernen", icon: "book-outline", farbe: "#22A447", grund: "#F0FAF2", rand: "#D7F0DD", pfad: "/lernen" },
  { titel: "Kurz erklärt", icon: "bulb-outline", farbe: "#F2A100", grund: "#FFF9EB", rand: "#FBEBC4", pfad: "/kurz-erklaert" },
  { titel: "Verkehrszeichen", icon: "warning", farbe: "#E5303A", grund: "#FDF0F0", rand: "#F8D9DB", pfad: "/zeichen" },
  { titel: "Formeln", icon: "calculator-outline", farbe: "#F08A1C", grund: "#FFF5EA", rand: "#FBE2C6", pfad: "/formeln" },
  { titel: "Schilder-Jagd", icon: "camera-outline", farbe: "#2F8FE6", grund: "#EEF6FE", rand: "#D3E7FB", pfad: "/schilder-jagd" },
  { titel: "Clips", icon: "film-outline", farbe: "#E5397E", grund: "#FDF0F6", rand: "#F8D6E5", pfad: "/clips" },
];

const WOCHENTAG = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const tagSchluessel = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const minSek = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export function HomeWebLila() {
  const { stand } = useStand();
  const { anzeigeName } = useKonto();
  const { kurse } = useKurse();
  const akt = lernAktivitaet();
  const vorname = anzeigeName.split(" ")[0] || "Gast";
  const { width } = useWindowDimensions();
  const eng = width < 1400;

  // Prüfungstermin
  const termin = terminDatum(stand.pruefungstermin);
  const kommend = termin && tageBis(termin) >= 0 ? termin : null;
  const datum = kommend ? `${WOCHENTAG[kommend.getDay()]}, ${String(kommend.getDate()).padStart(2, "0")}.${String(kommend.getMonth() + 1).padStart(2, "0")}.${kommend.getFullYear()}` : null;
  const uhr = kommend ? `${String(kommend.getHours()).padStart(2, "0")}:${String(kommend.getMinutes()).padStart(2, "0")} Uhr` : null;

  // Weiterlernen: zuletzt genutzte Kurse zuerst, dann die übrigen
  const mitVideos = kurse.filter((k) => k.videos.length);
  const zuletzt = (k: Kurs) => k.videos.reduce<string>((m, v) => { const a = akt.zuletzt(v.id); return a && a > m ? a : m; }, "");
  const liste = [...mitVideos].sort((a, b) => zuletzt(b).localeCompare(zuletzt(a))).slice(0, 3);

  // Fortschritt
  const alleVideos = mitVideos.reduce((s, k) => s + k.videos.length, 0);
  const gesehen = mitVideos.reduce((s, k) => s + k.gesehen, 0);
  const fertig = mitVideos.filter((k) => k.gesehen === k.videos.length).length;
  const anteil = alleVideos ? gesehen / alleVideos : 0;
  const minuten = Math.round(akt.sekunden / 60);

  // Serie: Tage mit Videos in Folge (bis heute oder gestern)
  const heute = new Date();
  let serie = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() - i);
    if (akt.tage.has(tagSchluessel(d))) serie++;
    else if (i > 0 || serie > 0) break;
  }
  const letzteTage = Array.from({ length: 9 }, (_, i) => akt.tage.has(tagSchluessel(new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() - 8 + i))));

  // Empfehlungen
  const weiter = weiterlernen(kurse);
  const offen = [...mitVideos].filter((k) => k.gesehen > 0 && k.gesehen < k.videos.length).sort((a, b) => b.gesehen / b.videos.length - a.gesehen / a.videos.length)[0];
  const restKurs = offen ? offen.videos.filter((v) => !istGesehen(v.id)).reduce((s, v) => s + (v.dauer ?? 0), 0) : 0;
  const empfehlungen: { icon: IconName; titel: string; unter: string; onPress: () => void }[] = [];
  if (offen) empfehlungen.push({ icon: "play", titel: `Kurs „${offen.thema.titel}“ abschließen`, unter: `Noch ca. ${dauerLang(restKurs)}`, onPress: () => router.push({ pathname: "/thema/[id]", params: { id: offen.thema.id } }) });
  empfehlungen.push({ icon: "list", titel: "Verkehrszeichen lernen", unter: "Alle Zeichen mit Bedeutung", onPress: () => router.push("/zeichen") });
  if (weiter) empfehlungen.push({ icon: "locate-outline", titel: `Weiterlernen: ${weiter.video.titel}`, unter: `Nächstes Video${weiter.video.dauer ? ` (${dauerLang(weiter.video.dauer)})` : ""}`, onPress: () => router.push({ pathname: "/themavideo", params: { id: weiter.video.id } }) });
  if (empfehlungen.length < 3) empfehlungen.push({ icon: "bulb-outline", titel: "Kurz erklärt ansehen", unter: "Regeln in 30 Sekunden", onPress: () => router.push("/kurz-erklaert") });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: L.grund }} contentContainerStyle={{ paddingLeft: 46, paddingRight: 22, paddingTop: 24, paddingBottom: 48 }}>
      <View style={{ width: "100%", maxWidth: 1500, alignSelf: "center" }}>
        {/* Kopf */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 26 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...schrift.schwarz, fontSize: 38, lineHeight: 44, color: L.tinte }}>Hallo, {vorname}</Text>
            <Text style={{ ...schrift.text, fontSize: 15.5, color: L.tinte2, marginTop: 2 }}>Schön, dass du weiter an deinem Führerschein arbeitest. Hier findest du alles, was du für den nächsten Schritt brauchst.</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 14 }}>
            <RundKnopf icon="search-outline" label="Suchen" onPress={() => router.navigate("/lernen")} />
            <RundKnopf icon="notifications-outline" label="Mitteilungen" punkt onPress={() => router.push("/einstellungen")} />
            <RundKnopf icon="help-circle-outline" label="Hilfe" onPress={() => router.push("/kurz-erklaert")} />
          </View>
        </View>

        {/* Hero-Karten */}
        <View style={{ flexDirection: "row", gap: 20, marginBottom: 24 }}>
          <LKarte style={{ flex: 634, height: 300, padding: 26, paddingRight: 0, overflow: "hidden" }}>
            <Image source={BILD.auto} style={{ position: "absolute", right: eng ? 0 : 8, top: eng ? 44 : 28, width: eng ? 230 : 300, height: eng ? 156 : 203 }} resizeMode="contain" />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <IconKachel icon="play" farbe="#FFFFFF" grund="#3FC15E" groesse={38} iconGroesse={20} />
              <Text style={{ ...schrift.fett, fontSize: 20, color: L.tinte }}>Lernvideos</Text>
            </View>
            <Text style={{ ...schrift.schwarz, fontSize: 30, lineHeight: 32, color: L.tinte, marginTop: 14, width: 300 }}>Die Theorie einfach erklärt – mit deinen Lernvideos</Text>
            <Text style={{ ...schrift.text, fontSize: 16, lineHeight: 22, color: L.tinte2, marginTop: 10, width: 300 }}>Verständliche Videos, klare Beispiele und alles für deine Prüfung.</Text>
            <View style={{ flexDirection: "row", gap: 16, marginTop: "auto" }}>
              <KnopfVoll titel="Lernvideos ansehen" icon="play" onPress={() => router.navigate("/lernen")} />
              <KnopfRand titel="Themen entdecken" icon="book-outline" onPress={() => router.navigate("/coach")} />
            </View>
          </LKarte>

          <LKarte style={{ flex: 512, height: 300, padding: 22, overflow: "hidden" }}>
            <Image source={BILD.kalender} style={{ position: "absolute", right: eng ? 4 : 14, top: 18, width: eng ? 150 : 198, height: eng ? 146 : 193 }} resizeMode="contain" />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <IconKachel icon="calendar-outline" farbe="#FFFFFF" grund={L.lila} groesse={46} iconGroesse={24} />
              <Text style={{ ...schrift.schwarz, fontSize: 23, color: L.tinte }}>Prüfungstermin</Text>
            </View>
            <Text style={{ ...schrift.text, fontSize: 17, lineHeight: 23, color: L.tinte2, marginTop: 10, width: 250 }}>{kommend ? "Dein nächster großer Schritt steht an." : "Trag deinen Termin ein – dann zählen wir mit."}</Text>
            <View style={{ marginTop: 14, width: 278, borderRadius: 12, borderWidth: 1.5, borderColor: L.rand, backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
              {kommend ? (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Icon name="calendar-outline" size={18} color={L.tinte} />
                      <Text style={{ ...schrift.fett, fontSize: 14.5, color: L.tinte }}>{datum}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Icon name="time-outline" size={18} color={L.tinte} />
                      <Text style={{ ...schrift.fett, fontSize: 14.5, color: L.tinte }}>{uhr}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Icon name="location-outline" size={18} color={L.lila} />
                    <Text style={{ ...schrift.fett, fontSize: 14.5, color: L.tinte }}>Theorieprüfung – Klasse {stand.klasse || "B"}</Text>
                  </View>
                </>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 46 }}>
                  <Icon name="calendar-outline" size={18} color={L.tinte3} />
                  <Text style={{ ...schrift.fett, fontSize: 14.5, color: L.tinte2 }}>Noch kein Termin eingetragen</Text>
                </View>
              )}
            </View>
            <KnopfRand titel={kommend ? "Termin verwalten" : "Termin eintragen"} icon="calendar-outline" onPress={() => router.push("/pruefungstermin")} style={{ marginTop: "auto" }} stark />
          </LKarte>
        </View>

        {/* Schnellzugriffe */}
        <View style={{ flexDirection: "row", gap: 13, marginBottom: 40 }}>
          {SCHNELL.map((s) => (
            <Pressable
              key={s.titel}
              onPress={() => router.navigate(s.pfad as never)}
              style={(z: Zustand) => ({ ...weich, flexGrow: s.titel === "Verkehrszeichen" || s.titel === "Schilder-Jagd" ? 1.35 : 1, flexBasis: 0, height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: z.hovered ? s.farbe : s.rand, backgroundColor: s.grund, flexDirection: eng ? "column" : "row", alignItems: "center", justifyContent: "center", gap: eng ? 1 : 12, ...schatten , ...karteHover(!!z.hovered, z.pressed) })}
            >
              <Icon name={s.icon} size={eng ? 20 : 26} color={s.farbe} />
              <Text style={{ ...schrift.fett, fontSize: eng ? 13 : 16, color: L.tinte }} numberOfLines={1}>
                {s.titel}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Weiterlernen */}
        <Abschnitt
          icon={<View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: L.lila, alignItems: "center", justifyContent: "center" }}><Icon name="play" size={19} color="#FFFFFF" style={{ marginLeft: 3 }} /></View>}
          titel="Weiterlernen"
          unter="Mach genau da weiter, wo du aufgehört hast."
          link="Alle Lerninhalte ansehen"
          onLink={() => router.navigate("/coach")}
        />
        <View style={{ flexDirection: "row", gap: 13, marginBottom: 40 }}>
          {liste.length ? (
            liste.map((k) => {
              const naechstes = k.videos.find((v) => !istGesehen(v.id)) ?? k.videos[0];
              const kat = KATEGORIEN.find((x) => x.id === k.thema.kategorie)?.titel ?? "Theorie";
              const p = k.videos.length ? k.gesehen / k.videos.length : 0;
              return (
                <LKarte key={k.thema.id} onPress={() => router.push({ pathname: "/thema/[id]", params: { id: k.thema.id } })} style={{ flex: 1, height: 150, padding: 12, flexDirection: "row", gap: 14 }}>
                  <View style={{ width: eng ? 120 : 182, height: 124, borderRadius: 10, overflow: "hidden" }}>
                    <Image source={themaBild(k.thema)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                      <View style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: "#FFFFFF", backgroundColor: "rgba(20,14,30,0.45)", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="play" size={22} color="#FFFFFF" style={{ marginLeft: 3 }} />
                      </View>
                    </View>
                    {naechstes?.dauer ? (
                      <View style={{ position: "absolute", right: 7, bottom: 7, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: "rgba(20,14,30,0.75)" }}>
                        <Text style={{ ...schrift.fett, fontSize: 12.5, color: "#FFFFFF" }}>{minSek(naechstes.dauer)}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flex: 1, paddingTop: 4, paddingRight: 6 }}>
                    <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, backgroundColor: L.lilaZart }}>
                      <Icon name="calendar-outline" size={13} color={L.lila} />
                      <Text style={{ ...schrift.halb, fontSize: 12.5, color: L.lilaDunkel }}>{kat} · Klasse {stand.klasse || "B"}</Text>
                    </View>
                    <Text style={{ ...schrift.fett, fontSize: 18, lineHeight: 21, color: L.tinte, marginTop: 10 }} numberOfLines={2}>
                      {k.thema.titel}
                    </Text>
                    <View style={{ marginTop: "auto", gap: 8, paddingBottom: 6 }}>
                      <Text style={{ ...schrift.text, fontSize: 14, color: L.tinte2 }}>{Math.round(p * 100)} % abgeschlossen</Text>
                      <Balken anteil={p} />
                    </View>
                  </View>
                </LKarte>
              );
            })
          ) : (
            <LKarte style={{ flex: 1, padding: 24 }}>
              <Text style={{ ...schrift.fett, fontSize: 17, color: L.tinte }}>Noch keine Videokurse</Text>
              <Text style={{ ...schrift.text, fontSize: 14.5, color: L.tinte2, marginTop: 4 }}>Sobald Kurse da sind, kannst du hier direkt weitermachen.</Text>
            </LKarte>
          )}
        </View>

        {/* Fortschritt + Empfehlungen */}
        <View style={{ flexDirection: "row", gap: 22, alignItems: "flex-end" }}>
          <View style={{ flex: 703 }}>
            <Abschnitt
              icon={<View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 30, width: 36, justifyContent: "center" }}>{[16, 24, 30].map((h) => <View key={h} style={{ width: 7, height: h, borderRadius: 3.5, backgroundColor: L.lila }} />)}</View>}
              titel="Dein Fortschritt"
              unter="Deine Lernentwicklung auf einen Blick."
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <LKarte style={{ flex: 282, height: 130, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, gap: 18 }}>
                <View style={{ width: 106, height: 106, alignItems: "center", justifyContent: "center" }}>
                  <Svg width={106} height={106} style={{ position: "absolute" }}>
                    <Circle cx={53} cy={53} r={46} stroke={L.spur} strokeWidth={9} fill="none" />
                    <Circle cx={53} cy={53} r={46} stroke={L.lila} strokeWidth={9} fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 46 * anteil} ${2 * Math.PI * 46}`} transform="rotate(-90 53 53)" />
                  </Svg>
                  <Text style={{ ...schrift.schwarz, fontSize: 24, color: L.tinte }}>{Math.round(anteil * 100)} %</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...schrift.fett, fontSize: 17, color: L.tinte }}>Lernfortschritt</Text>
                  <Text style={{ ...schrift.text, fontSize: 14, lineHeight: 19, color: L.tinte2, marginTop: 4 }}>
                    {gesehen} von {alleVideos} Videos angesehen
                  </Text>
                </View>
              </LKarte>
              {[
                { icon: "videocam-outline" as IconName, farbe: L.lila, grund: "#FBF8FF", rand: "#EEE6FB", wert: String(gesehen), text: "Videos\ngesehen" },
                { icon: "book-outline" as IconName, farbe: "#22A447", grund: "#F7FCF8", rand: "#DDF1E2", wert: String(fertig), text: "Kurse\nfertig" },
                { icon: "star-outline" as IconName, farbe: "#F2A100", grund: "#FFFCF2", rand: "#F8EBC8", wert: String(minuten), text: "Minuten\ngelernt" },
              ].map((x) => (
                <View key={x.text} style={{ flex: x.icon === "star-outline" ? 135 : 128, height: 130, borderRadius: 16, borderWidth: 1.5, borderColor: x.rand, backgroundColor: x.grund, alignItems: "center", justifyContent: "center", gap: 2, ...schatten }}>
                  <Icon name={x.icon} size={26} color={x.farbe} />
                  <Text style={{ ...schrift.schwarz, fontSize: 24, color: L.tinte, marginTop: 2 }}>{x.wert}</Text>
                  <Text style={{ ...schrift.text, fontSize: 14, lineHeight: 18, color: L.tinte2, textAlign: "center" }}>{x.text}</Text>
                </View>
              ))}
            </View>
            <LKarte style={{ marginTop: 18, height: 62, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, gap: 16 }}>
              <Icon name="flame" size={30} color="#F2652D" />
              <View style={{ width: 230 }}>
                <Text style={{ ...schrift.schwarz, fontSize: 19, color: L.tinte }}>{serie === 1 ? "1 Tag in Folge" : `${serie} Tage in Folge`}</Text>
                <Text style={{ ...schrift.text, fontSize: 13.5, color: L.tinte2 }}>{serie >= 3 ? "Starke Lernroutine – weiter so!" : serie > 0 ? "Guter Anfang – bleib dran!" : "Schau heute ein Video und starte deine Serie."}</Text>
              </View>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                {letzteTage.map((an, i) => (
                  <View key={i} style={{ flex: i ? 1 : 0, flexDirection: "row", alignItems: "center" }}>
                    {i ? <View style={{ flex: 1, height: 3, backgroundColor: an && letzteTage[i - 1] ? L.lila : L.spur }} /> : null}
                    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: an ? L.lila : "#FFFFFF", borderWidth: an ? 0 : 2, borderColor: "#DCD3EC", alignItems: "center", justifyContent: "center" }}>
                      {an ? <Icon name="checkmark" size={16} color="#FFFFFF" /> : null}
                    </View>
                  </View>
                ))}
              </View>
            </LKarte>
          </View>

          <LKarte style={{ flex: 440, padding: 18, paddingBottom: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 6 }}>
              <Icon name="locate-outline" size={34} color={L.lila} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...schrift.schwarz, fontSize: 19, color: L.tinte }}>Empfohlene nächste Schritte</Text>
                <Text style={{ ...schrift.text, fontSize: 13.5, color: L.tinte2 }}>So kommst du deinem Führerschein noch schneller näher.</Text>
              </View>
            </View>
            {empfehlungen.slice(0, 3).map((e, i) => (
              <Pressable key={e.titel} onPress={e.onPress} style={(z: Zustand) => ({ ...weich, flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: L.rand, backgroundColor: z.hovered ? "#FBF9FF" : "transparent" })}>
                <IconKachel icon={e.icon} farbe={L.lila} grund={L.lilaZart} groesse={40} iconGroesse={20} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...schrift.fett, fontSize: 15, color: L.tinte }} numberOfLines={1}>
                    {e.titel}
                  </Text>
                  <Text style={{ ...schrift.text, fontSize: 13, color: L.tinte2 }}>{e.unter}</Text>
                </View>
                <Icon name="chevron-forward" size={20} color={L.tinte} />
              </Pressable>
            ))}
          </LKarte>
        </View>
      </View>
    </ScrollView>
  );
}
