import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View, type ImageSourcePropType } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { lilaSchrift, LILA_RAND, useLila } from "@/components/lila-teile";
import { useInhaltUnten } from "@/components/tab-leiste";
import { FIGUR } from "@/components/start-teile";
import { useFenster } from "@/lib/fenster";
import { tippen } from "@/lib/haptik";
import { dauerLang, restVon, useKurse, weiterlernen, type Kurs, type KursVideo } from "@/lib/kurse";
import { KATEGORIEN, themaBild, type Kategorie } from "@/lib/lernthemen";
import { themavideoUrl } from "@/lib/themenvideos";
import { useVideoVorschau } from "@/lib/video-vorschau";

// Coach: Videokurse. Oben die Figur, dann „Weiterlernen“ (zuletzt geschautes
// Video), beliebte Kurse (nach Lernenden) und Kurse nach Kategorie. Die Kurse
// legt der Inhaber im Manager an (Kurse & Videos).

const BLASE: ImageSourcePropType = require("../../../assets/images/figur/coach-blase.png");

/** Bild zu einem Video: aus dem Video selbst (Handy), sonst das Kursbild. */
function VideoBild({ video, ersatz, style }: { video: KursVideo | null; ersatz: ImageSourcePropType; style: object }) {
  const vorschau = useVideoVorschau(video ? themavideoUrl(video.pfad) : null);
  return <Image source={vorschau ? { uri: vorschau } : ersatz} style={style} resizeMode="cover" />;
}

function Ueberschrift({ titel, rechts, onRechts }: { titel: string; rechts?: string; onRechts?: () => void }) {
  const l = useLila();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <Text style={{ ...lilaSchrift.titel, fontSize: rechts ? 27 : 32, lineHeight: 36, color: l.tinte, flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {titel.toUpperCase()}
      </Text>
      {rechts ? (
        <Pressable onPress={onRechts} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 3, marginLeft: 10 }} accessibilityRole="link">
          <Text style={{ ...lilaSchrift.textHalb, fontSize: 15, color: "#6A3FE6" }} numberOfLines={1}>
            {rechts}
          </Text>
          <Icon name="chevron-forward" size={16} color="#6A3FE6" />
        </Pressable>
      ) : null}
    </View>
  );
}

function zumKurs(id: string) {
  tippen();
  router.push({ pathname: "/thema/[id]", params: { id } });
}

function abspielen(video: KursVideo) {
  tippen();
  router.push({ pathname: "/themavideo", params: { id: video.id } });
}

/** Große Karte „Weiterlernen“: lila getöntes Bild mit Abspielknopf und Fortschritt. */
function WeiterKarte({ kurs, video, rest, breite }: { kurs: Kurs; video: KursVideo; rest: number | null; breite: number }) {
  const l = useLila();
  const dauer = video.dauer ?? 0;
  const anteil = rest !== null && dauer > 0 ? Math.min(1, Math.max(0, 1 - rest / dauer)) : 0;
  const kapitel = video.kapitel.trim();
  return (
    <Pressable onPress={() => abspielen(video)} accessibilityRole="button" accessibilityLabel={`Weiterlernen: ${video.titel}`} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
      <View style={{ borderRadius: 22, overflow: "hidden", backgroundColor: l.karte, borderWidth: 1.5, borderColor: l.linie, shadowColor: "#6A3FE6", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
        <View style={{ height: Math.round(breite * 0.36), backgroundColor: "#6A3FE6" }}>
          <VideoBild video={video} ersatz={themaBild(kurs.thema)} style={{ width: "100%", height: "100%" }} />
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(106,63,230,0.55)" }} />
          <View style={{ position: "absolute", top: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 11, borderRadius: 10, backgroundColor: "#FFFFFF" }}>
            <Icon name="play" size={13} color="#6A3FE6" />
            <Text style={{ ...lilaSchrift.textFett, fontSize: 14, color: l.tinte }}>{rest !== null ? `Noch ${dauerLang(rest)}` : dauer ? dauerLang(dauer) : "Jetzt starten"}</Text>
          </View>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
              <Icon name="play" size={30} color="#6A3FE6" style={{ marginLeft: 4 }} />
            </View>
          </View>
          <View style={{ position: "absolute", left: 16, right: 16, bottom: 12, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)", overflow: "hidden" }}>
            <View style={{ width: `${anteil * 100}%`, height: "100%", backgroundColor: "#FFFFFF" }} />
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ ...lilaSchrift.textFett, fontSize: 19, color: l.tinte }} numberOfLines={1}>
              {video.titel}
            </Text>
            <Text style={{ ...lilaSchrift.textMittel, fontSize: 14.5, color: l.tinte2 }} numberOfLines={1}>
              {kapitel ? `${kurs.thema.titel} · ${kapitel}` : kurs.thema.titel}
            </Text>
          </View>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: l.lilaZart, alignItems: "center", justifyContent: "center" }}>
            <Icon name="chevron-forward" size={19} color="#6A3FE6" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Kurs-Kachel in der Reihe „Beliebte Videokurse“. */
function KursKachel({ kurs, breite }: { kurs: Kurs; breite: number }) {
  const l = useLila();
  return (
    <Pressable onPress={() => zumKurs(kurs.thema.id)} accessibilityRole="button" accessibilityLabel={kurs.thema.titel} style={({ pressed }) => ({ width: breite, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <View style={{ borderRadius: 18, overflow: "hidden", backgroundColor: l.karte, borderWidth: 1.5, borderColor: l.linie }}>
        <View style={{ height: Math.round(breite * 0.66) }}>
          <VideoBild video={null} ersatz={themaBild(kurs.thema)} style={{ width: "100%", height: "100%" }} />
          <View style={{ position: "absolute", left: 8, bottom: 8, flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 9, borderRadius: 14, backgroundColor: "rgba(30,20,60,0.72)" }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
              <Icon name="play" size={10} color="#1E143C" style={{ marginLeft: 1 }} />
            </View>
            <Text style={{ ...lilaSchrift.textHalb, fontSize: 13, color: "#FFFFFF" }}>{kurs.videos.length === 1 ? "1 Video" : `${kurs.videos.length} Videos`}</Text>
          </View>
        </View>
        <View style={{ padding: 12, gap: 5 }}>
          <Text style={{ ...lilaSchrift.textFett, fontSize: 16, lineHeight: 20, color: l.tinte, minHeight: 40 }} numberOfLines={2}>
            {kurs.thema.titel}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name="time-outline" size={15} color={l.tinte2} />
            <Text style={{ ...lilaSchrift.textMittel, fontSize: 13.5, color: l.tinte2 }}>{kurs.dauer ? dauerLang(kurs.dauer) : "–"}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name="people-outline" size={15} color={l.tinte2} />
            <Text style={{ ...lilaSchrift.textMittel, fontSize: 13.5, color: l.tinte2 }}>{kurs.lernende === 1 ? "1 Lernender" : `${kurs.lernende} Lernende`}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Kurs als Zeile (unter den Kategorien). */
function KursZeile({ kurs }: { kurs: Kurs }) {
  const l = useLila();
  const anteil = kurs.videos.length ? kurs.gesehen / kurs.videos.length : 0;
  return (
    <Pressable onPress={() => zumKurs(kurs.thema.id)} accessibilityRole="button" accessibilityLabel={kurs.thema.titel} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 10, paddingRight: 14, borderRadius: 18, backgroundColor: l.karte, borderWidth: 1.5, borderColor: l.linie }}>
        <Image source={themaBild(kurs.thema)} style={{ width: 92, height: 64, borderRadius: 12 }} resizeMode="cover" />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ ...lilaSchrift.textFett, fontSize: 16, color: l.tinte }} numberOfLines={2}>
            {kurs.thema.titel}
          </Text>
          <Text style={{ ...lilaSchrift.textMittel, fontSize: 13, color: l.tinte2 }}>
            {kurs.videos.length === 1 ? "1 Video" : `${kurs.videos.length} Videos`}
            {kurs.dauer ? ` · ${dauerLang(kurs.dauer)}` : ""}
          </Text>
          {kurs.gesehen > 0 ? (
            <View style={{ height: 5, borderRadius: 3, backgroundColor: l.spur, overflow: "hidden" }}>
              <View style={{ width: `${anteil * 100}%`, height: "100%", backgroundColor: "#8A5FFF" }} />
            </View>
          ) : null}
        </View>
        <Icon name="chevron-forward" size={20} color={l.tinte} />
      </View>
    </Pressable>
  );
}

export default function Coach() {
  const insets = useSafeAreaInsets();
  const inhaltUnten = useInhaltUnten();
  const fokus = useIsFocused();
  const l = useLila();
  const { width } = useFenster();
  const { geladen, kurse } = useKurse();
  const [kategorie, setKategorie] = useState<Kategorie>("theorie");
  const breite = Math.min(width, 560) - 2 * LILA_RAND;
  const mitVideos = kurse.filter((k) => k.videos.length > 0);
  const weiter = weiterlernen(mitVideos);
  const beliebt = [...mitVideos].sort((a, b) => b.lernende - a.lernende || a.thema.position - b.thema.position).slice(0, 8);
  const inKategorie = kurse.filter((k) => k.thema.kategorie === kategorie);
  // Das gerade weitergeschaute Video ist unten nicht mehr angefangen? Dann rechnet „Noch x Min.“ neu.
  const rest = weiter ? restVon(weiter.video.id) : null;

  return (
    <View style={{ flex: 1, backgroundColor: l.grund }}>
      {fokus ? <StatusBar style="dark" /> : null}
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: inhaltUnten + 8, width: "100%", maxWidth: 560, alignSelf: "center" }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: LILA_RAND }}>
          {/* Kopf */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Pressable
              onPress={() => {
                tippen();
                router.navigate("/heute");
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Zur Startseite"
              style={({ pressed }) => ({ width: 54, height: 48, borderRadius: 15, backgroundColor: pressed ? "#E2D6FF" : l.lilaZart, alignItems: "center", justifyContent: "center" })}
            >
              <Icon name="chevron-back" size={24} color={l.tinte} />
            </Pressable>
            <Text style={{ ...lilaSchrift.titel, fontSize: 44, lineHeight: 48, letterSpacing: -0.3, color: l.tinte }}>VIDEOKURSE</Text>
          </View>

          {/* Figur mit Sprechblase */}
          <Image source={BLASE} style={{ width: breite, height: Math.round(breite * 0.336), marginTop: 14 }} resizeMode="contain" accessibilityLabel="Lerne mit kurzen Videos für Theorie und Praxis." />

          {weiter ? (
            <View style={{ marginTop: 22 }}>
              <Ueberschrift titel="Weiterlernen" />
              <WeiterKarte kurs={weiter.kurs} video={weiter.video} rest={rest} breite={breite} />
            </View>
          ) : null}
        </View>

        {beliebt.length ? (
          <View style={{ marginTop: 26 }}>
            <View style={{ paddingHorizontal: LILA_RAND }}>
              <Ueberschrift titel="Beliebte Videokurse" rechts="Alle anzeigen" onRechts={() => router.navigate("/lernen")} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: LILA_RAND, gap: 12 }}>
              {beliebt.map((k) => (
                <KursKachel key={k.thema.id} kurs={k} breite={Math.min(220, Math.round(breite * 0.47))} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: LILA_RAND, marginTop: 26 }}>
          <Ueberschrift titel="Für deine Prüfung" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: LILA_RAND, gap: 8 }}>
          {KATEGORIEN.map((k) => {
            const an = k.id === kategorie;
            return (
              <Pressable
                key={k.id}
                onPress={() => {
                  tippen();
                  setKategorie(k.id);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: an }}
                style={{ height: 44, paddingHorizontal: 20, borderRadius: 22, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: an ? "#8A5FFF" : l.lilaZart }}
              >
                {an ? <Icon name="checkmark" size={17} color="#FFFFFF" /> : null}
                <Text style={{ ...lilaSchrift.textHalb, fontSize: 16, color: an ? "#FFFFFF" : l.tinte }}>{k.titel}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ paddingHorizontal: LILA_RAND, marginTop: 14, gap: 10 }}>
          {inKategorie.length ? (
            inKategorie.map((k) => <KursZeile key={k.thema.id} kurs={k} />)
          ) : geladen ? (
            <View style={{ alignItems: "center", paddingVertical: 22, gap: 6, borderRadius: 18, backgroundColor: l.karte, borderWidth: 1.5, borderColor: l.linie }}>
              <Image source={FIGUR.denken} style={{ width: 80, height: 80 }} resizeMode="contain" />
              <Text style={{ ...lilaSchrift.titel, fontSize: 20, color: l.tinte }}>Hier kommen bald Kurse</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
