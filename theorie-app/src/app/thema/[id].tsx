import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { KopfPille } from "@/components/frage-rahmen";
import { FrageZeile, type FrageStatus } from "@/components/frage-liste";
import { Kopfzeile, StartKnopf } from "@/components/home";
import { Icon } from "@/components/icon";
import { LilaLeisteSeite } from "@/components/lila-leiste";
import { LilaKarte, LilaKnopf, LilaKopf, LILA_RAND, LilaTitel, LilaZurueck, lilaSchrift, useLila } from "@/components/lila-teile";
import { FIGUR } from "@/components/start-teile";
import { useVideoVorschau } from "@/lib/video-vorschau";
import { FotoKopf, Seite, StandKarte } from "@/components/seite";
import { Knopf } from "@/components/ui";
import { useDarstellung } from "@/lib/darstellung";
import { useDesktop } from "@/lib/fenster";
import { ThemaVideosWeb, ThemaWeb } from "@/components/web/thema-web";
import { fragenZuThema, themaVon, type ThemaId } from "@/lib/fragen";
import { themaFoto } from "@/lib/fotos";
import { FRAGEN_AKTIV } from "@/lib/funktionen";
import { useLernvideos, type Lernvideo } from "@/lib/lernvideos";
import { themaBild, useLernthema, useLernthemen } from "@/lib/lernthemen";
import { fortschritt, themaStatistik, useStand } from "@/lib/stand";
import { leuchten, RAND, schrift } from "@/lib/theme";
import { themavideoUrl, useThemenvideos, type Themavideo } from "@/lib/themenvideos";
import { useFenster } from "@/lib/fenster";

// Ein Thema im Kino-Look: Titelfoto, Stand als Ring mit Werten, Startknopf,
// Videos zum Thema (falls der Inhaber welche hochgeladen hat) und alle Fragen
// als Karten mit ihrem Stand.

function dauerText(s: number | null): string | null {
  if (!s) return null;
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

/** Karte eines Videos: Themenfoto mit Abspielknopf, darunter der Titel. */
function VideoKarte({ video, bild, breite = 220, params }: { video: Pick<Themavideo, "titel" | "dauer">; bild: ImageSourcePropType; breite?: number; params: Lernvideo["params"] }) {
  const { farbwelt: f } = useDarstellung();
  const dauer = dauerText(video.dauer);
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/themavideo", params })}
      accessibilityRole="button"
      accessibilityLabel={`Video: ${video.titel}`}
      style={({ pressed }) => ({ width: breite, gap: 8, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <View style={[{ height: Math.round(breite * 0.56), borderRadius: 18, overflow: "hidden", backgroundColor: "#0B0E12" }, f.hell ? leuchten("#3C2C18", 0.12, 10, 4) : null]}>
        <Image source={bild} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        <LinearGradient colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.55)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.22)", borderWidth: 1, borderColor: "rgba(255,255,255,0.5)" }}>
            <Icon name="play" size={20} color="#FFFFFF" />
          </View>
        </View>
        {dauer ? (
          <View style={{ position: "absolute", right: 8, bottom: 8, paddingHorizontal: 7, height: 22, borderRadius: 11, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)" }}>
            <Text style={{ ...schrift.textHalb, fontSize: 11.5, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{dauer}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} style={{ ...schrift.textHalb, fontSize: 14.5, lineHeight: 19, color: f.text }}>
        {video.titel}
      </Text>
    </Pressable>
  );
}

export default function ThemaSeite() {
  return FRAGEN_AKTIV ? <ThemaMitFragen /> : <ThemaNurVideos />;
}

/** Ohne Fragen: Titelfoto und alle Videos des Themas – am PC als eigene Fassung. */
function ThemaNurVideos() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const desktop = useDesktop();
  if (desktop) return <ThemaVideosWeb id={id} />;
  return <ThemaNurVideosHandy id={id} />;
}

/** Ein Bild zum Video: aus dem Video selbst (Handy), sonst das Themenbild. */
function VideoBild({ pfad, ersatz, style }: { pfad: string | null; ersatz: ImageSourcePropType; style: object }) {
  const vorschau = useVideoVorschau(pfad ? themavideoUrl(pfad) : null);
  return <Image source={vorschau ? { uri: vorschau } : ersatz} style={style} resizeMode="cover" />;
}

/** Ohne Fragen, im lila Design: Bild mit Abspielknopf, Titel, Werte, Videos, nächstes Thema. */
function ThemaNurVideosHandy({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const l = useLila();
  const { width } = useFenster();
  // Themen kommen aus dem Manager (eigener Titel, eigenes Bild).
  const { geladen: themaGeladen, thema } = useLernthema(id);
  const { themen } = useLernthemen();
  const { geladen, zuThema } = useLernvideos();
  const { videos: alle } = useThemenvideos();
  const videos = zuThema(id);
  const pfadVon = (v: Lernvideo) => alle.find((x) => x.id === v.params.id)?.pfad ?? null;
  const bild = themaBild(thema ?? { id, bild_pfad: null });
  const sekunden = videos.reduce((s, v) => s + (v.dauer ?? 0), 0);
  const minuten = sekunden ? Math.max(1, Math.round(sekunden / 60)) : null;
  const platz = themen.findIndex((t) => t.id === id);
  const naechstes = platz >= 0 ? themen[platz + 1] ?? null : null;
  const breite = Math.min(width, 560) - 2 * LILA_RAND;
  const erstes = videos[0];
  const abspielen = (v: Lernvideo) => router.push({ pathname: "/themavideo", params: v.params });

  return (
    <View style={{ flex: 1, backgroundColor: l.grund }}>
      <StatusBar style={l.hell ? "dark" : "light"} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: LILA_RAND, width: "100%", maxWidth: 560, alignSelf: "center" }} showsVerticalScrollIndicator={false}>
        {/* Bild mit Abspielknopf, oben links zurück */}
        <Pressable
          onPress={() => erstes && abspielen(erstes)}
          disabled={!erstes}
          accessibilityRole="button"
          accessibilityLabel={erstes ? `Erstes Video abspielen: ${erstes.titel}` : undefined}
          style={{ height: Math.round(breite * 0.62), borderRadius: 22, overflow: "hidden", backgroundColor: l.lilaZart, borderWidth: 1.5, borderColor: l.linie }}
        >
          <VideoBild pfad={erstes ? pfadVon(erstes) : null} ersatz={bild} style={{ width: "100%", height: "100%" }} />
          {erstes ? (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center" }}>
                <Icon name="play" size={30} color="#2E2650" style={{ marginLeft: 4 }} />
              </View>
            </View>
          ) : null}
          {erstes && dauerText(erstes.dauer) ? (
            <View style={{ position: "absolute", right: 10, bottom: 10, paddingHorizontal: 10, height: 30, borderRadius: 10, justifyContent: "center", backgroundColor: "rgba(20,16,40,0.72)" }}>
              <Text style={{ ...lilaSchrift.textFett, fontSize: 14, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{dauerText(erstes.dauer)}</Text>
            </View>
          ) : null}
          <LilaZurueck style={{ position: "absolute", top: 10, left: 10 }} />
        </Pressable>

        <LilaTitel style={{ marginTop: 16 }}>{thema?.titel ?? (themaGeladen ? "Thema nicht gefunden" : "")}</LilaTitel>
        {thema?.kurz || themaGeladen ? (
          <Text style={{ ...lilaSchrift.text, fontSize: 16, lineHeight: 22, color: l.tinte2, marginTop: 2 }}>{thema ? thema.kurz : "Dieses Thema gibt es nicht mehr."}</Text>
        ) : null}

        {videos.length ? (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <LilaKarte style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46 }}>
                <Icon name="play-outline" size={19} color={l.lila} />
                <Text style={{ ...lilaSchrift.fett, fontSize: 19, color: l.tinte }}>{videos.length === 1 ? "1 Video" : `${videos.length} Videos`}</Text>
              </View>
            </LilaKarte>
            {minuten ? (
              <LilaKarte style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46 }}>
                  <Icon name="time-outline" size={19} color={l.lila} />
                  <Text style={{ ...lilaSchrift.fett, fontSize: 19, color: l.tinte }}>{minuten} Min</Text>
                </View>
              </LilaKarte>
            ) : null}
          </View>
        ) : null}

        <LilaKopf titel="Videos in diesem Thema" style={{ marginTop: 22 }} />
        {videos.length ? (
          <View style={{ gap: 10 }}>
            {videos.map((v) => (
              <LilaKarte key={v.schluessel} onPress={() => abspielen(v)} label={`Video: ${v.titel}`}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 9, paddingRight: 14 }}>
                  <View style={{ width: 118, height: 70, borderRadius: 12, overflow: "hidden", backgroundColor: l.lilaZart }}>
                    <VideoBild pfad={pfadVon(v)} ersatz={bild} style={{ width: "100%", height: "100%" }} />
                    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="play" size={15} color="#2E2650" style={{ marginLeft: 2 }} />
                      </View>
                    </View>
                    {dauerText(v.dauer) ? (
                      <View style={{ position: "absolute", left: 6, bottom: 5, paddingHorizontal: 6, height: 20, borderRadius: 6, justifyContent: "center", backgroundColor: "rgba(20,16,40,0.72)" }}>
                        <Text style={{ ...lilaSchrift.textFett, fontSize: 11.5, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{dauerText(v.dauer)}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ flex: 1, ...lilaSchrift.titel, fontSize: 20, lineHeight: 23, color: l.tinte }} numberOfLines={3}>
                    {v.titel}
                  </Text>
                  <Icon name="chevron-forward" size={21} color={l.tinte} />
                </View>
              </LilaKarte>
            ))}
          </View>
        ) : (
          <LilaKarte>
            <View style={{ alignItems: "center", paddingVertical: 22, paddingHorizontal: 20, gap: 8 }}>
              <Image source={FIGUR.denken} style={{ width: 88, height: 88 }} resizeMode="contain" />
              <Text style={{ ...lilaSchrift.titel, fontSize: 20, color: l.tinte, textAlign: "center" }}>{geladen ? "Videos zu diesem Thema folgen bald." : "Videos werden geladen …"}</Text>
            </View>
          </LilaKarte>
        )}

        {naechstes ? (
          <LilaKnopf titel="Nächstes Thema" icon="arrow-forward" onPress={() => router.replace({ pathname: "/thema/[id]", params: { id: naechstes.id } })} style={{ marginTop: 20 }} />
        ) : themen.length > 1 ? (
          <LilaKnopf titel="Alle Themen" icon="arrow-forward" onPress={() => router.navigate("/lernen")} style={{ marginTop: 20 }} />
        ) : null}
      </ScrollView>
      <LilaLeisteSeite aktiv="lernen" />
    </View>
  );
}

function ThemaMitFragen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Im Browser am PC eine eigene Fassung (web/thema-web.tsx).
  return useDesktop() ? <ThemaWeb id={themaVon(id as ThemaId).id} /> : <ThemaHandy id={id} />;
}

function ThemaHandy({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
  const { stand } = useStand();
  const thema = themaVon(id as ThemaId);
  const fragen = fragenZuThema(thema.id);
  const stat = themaStatistik(stand, thema.id);
  const fort = fortschritt(stand, fragen);
  const videos = useThemenvideos().videos.filter((v) => v.thema_id === thema.id);

  const status = (frageId: string): FrageStatus => {
    const fs = stand.fragen[frageId];
    if (!fs || fs.r + fs.f === 0) return "neu";
    if (fs.l === 0) return "falsch";
    if (fs.box >= 3) return "sicher";
    return "geuebt";
  };

  return (
    <Seite>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <FotoKopf bild={themaFoto(thema.id)} hoehe={280} titel={thema.titel} unter={thema.kurz} ueber={<View style={{ flexDirection: "row" }}><KopfPille icon="book-outline" text={`${stat.gesamt} Fragen`} /></View>} />

        <View style={{ paddingHorizontal: RAND, marginTop: 10, gap: 14 }}>
          <StandKarte
            anteil={fort.anteil}
            werte={[
              { wert: stat.gesehen, label: "gesehen" },
              { wert: stat.sicher, label: "sicher", farbe: f.hell ? "#23A548" : "#4ED053" },
              { wert: stat.fehler, label: "Fehler offen", farbe: stat.fehler > 0 ? (f.hell ? "#E5392C" : "#FF5A4E") : undefined },
            ]}
          />
          <StartKnopf titel="Thema lernen" unter={`${stat.gesamt} Fragen · offene zuerst`} onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: thema.id } })} />
          {stat.fehler > 0 ? (
            <Knopf titel={`Nur Fehler üben (${stat.fehler})`} icon="refresh" art="sekundaer" onPress={() => router.push({ pathname: "/training", params: { modus: "fehler", thema: thema.id } })} />
          ) : null}
        </View>

        {videos.length ? (
          <>
            <Kopfzeile titel="Videos" link={videos.length === 1 ? "1 Video" : `${videos.length} Videos`} style={{ marginTop: 30 }} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: RAND, gap: 12 }}>
              {videos.map((v) => (
                <VideoKarte key={v.id} video={v} bild={themaFoto(thema.id)} params={{ id: v.id }} />
              ))}
            </ScrollView>
          </>
        ) : null}

        <Kopfzeile titel="Alle Fragen" link={`${stat.sicher} von ${stat.gesamt} sicher`} style={{ marginTop: 30 }} />
        <View style={{ paddingHorizontal: RAND, gap: 10 }}>
          {fragen.map((q) => (
            <FrageZeile key={q.id} frage={q} status={status(q.id)} mitThema={false} />
          ))}
        </View>
      </ScrollView>
    </Seite>
  );
}
