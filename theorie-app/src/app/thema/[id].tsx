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
import { dauerLang, istGesehen, restVon, useKurse, type KursVideo } from "@/lib/kurse";
import { tippen } from "@/lib/haptik";
import { FotoKopf, Seite, StandKarte } from "@/components/seite";
import { Knopf } from "@/components/ui";
import { useDarstellung } from "@/lib/darstellung";
import { useDesktop } from "@/lib/fenster";
import { ThemaWeb } from "@/components/web/thema-web";
import { KursWebLila } from "@/components/web/kurs-web-lila";
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
  if (desktop) return <KursWebLila id={id} />;
  return <ThemaNurVideosHandy id={id} />;
}

/** Ein Bild zum Video: aus dem Video selbst (Handy), sonst das Themenbild. */
function VideoBild({ pfad, ersatz, style }: { pfad: string | null; ersatz: ImageSourcePropType; style: object }) {
  const vorschau = useVideoVorschau(pfad ? themavideoUrl(pfad) : null);
  return <Image source={vorschau ? { uri: vorschau } : ersatz} style={style} resizeMode="cover" />;
}

/** Prüf-Zeile mit gestricheltem Haken (erledigt = lila gefüllt). */
function Pruefpunkt({ fertig, text }: { fertig: boolean; text: string }) {
  const l = useLila();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: fertig ? 0 : 1.6, borderStyle: "dashed", borderColor: l.tinte3, backgroundColor: fertig ? "#8A5FFF" : "transparent" }}>
        <Icon name="checkmark" size={13} color={fertig ? "#FFFFFF" : l.tinte3} />
      </View>
      <Text style={{ ...lilaSchrift.textMittel, fontSize: 15.5, color: l.tinte2 }}>{text}</Text>
    </View>
  );
}

/** Videokurs: Titelbild, Angaben, Fortschritt, Start-Knopf und Kapitel mit ihren Videos. */
function ThemaNurVideosHandy({ id }: { id: string }) {
  const insets = useSafeAreaInsets();
  const l = useLila();
  const { width } = useFenster();
  const { geladen, kurse } = useKurse();
  const { geladen: themaGeladen } = useLernthema(id);
  const kurs = kurse.find((k) => k.thema.id === id);
  const breite = Math.min(width, 560);

  if (!kurs) {
    return (
      <View style={{ flex: 1, backgroundColor: l.grund, alignItems: "center", justifyContent: "center", gap: 10, padding: 30 }}>
        <StatusBar style="dark" />
        {themaGeladen && geladen ? (
          <>
            <Image source={FIGUR.traurig} style={{ width: 110, height: 110 }} resizeMode="contain" />
            <Text style={{ ...lilaSchrift.titel, fontSize: 28, color: l.tinte }}>Kurs nicht gefunden</Text>
            <LilaKnopf titel="Zurück" onPress={() => (router.canGoBack() ? router.back() : router.navigate("/coach"))} style={{ alignSelf: "stretch", marginTop: 10 }} />
          </>
        ) : (
          <Text style={{ ...lilaSchrift.textHalb, fontSize: 15, color: l.tinte2 }}>Wird geladen …</Text>
        )}
      </View>
    );
  }

  const naechstes = kurs.videos.find((v) => !istGesehen(v.id)) ?? kurs.videos[0];
  const angefangen = kurs.videos.some((v) => istGesehen(v.id) || restVon(v.id) !== null);
  const kapitelFertig = kurs.kapitel.filter((k) => k.videos.every((v) => istGesehen(v.id))).length;
  const platz = kurse.findIndex((k) => k.thema.id === id);
  const folgender = kurse.slice(platz + 1).find((k) => k.videos.length);
  const abspielen = (v: KursVideo) => router.push({ pathname: "/themavideo", params: { id: v.id } });
  const bild = themaBild(kurs.thema);

  return (
    <View style={{ flex: 1, backgroundColor: l.grund }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24, width: "100%", maxWidth: 560, alignSelf: "center" }} showsVerticalScrollIndicator={false}>
        {/* Titelbild mit Schließen */}
        <View style={{ height: Math.round(breite * 0.62) + insets.top * 0.4, backgroundColor: "#1E143C" }}>
          <Image source={bild} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          <Pressable
            onPress={() => {
              tippen();
              if (router.canGoBack()) router.back();
              else router.navigate("/coach");
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Schließen"
            style={({ pressed }) => ({ position: "absolute", top: insets.top + 8, right: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } })}
          >
            <Icon name="close" size={24} color={l.tinte} />
          </Pressable>
        </View>

        {/* Angaben */}
        <View style={{ marginTop: -22, backgroundColor: l.karte, borderRadius: 26, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: LILA_RAND, paddingTop: 22, paddingBottom: 22, gap: 14, borderWidth: 1.5, borderColor: l.linie, borderTopWidth: 0 }}>
          <Text style={{ ...lilaSchrift.titel, fontSize: 36, lineHeight: 39, color: l.tinte }}>{kurs.thema.titel}</Text>
          {kurs.thema.kurz ? <Text style={{ ...lilaSchrift.text, fontSize: 15.5, lineHeight: 22, color: l.tinte2, marginTop: -6 }}>{kurs.thema.kurz}</Text> : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: l.lilaZart, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <Image source={FIGUR.kopf} style={{ width: 36, height: 36 }} resizeMode="contain" />
            </View>
            <Text style={{ ...lilaSchrift.textHalb, fontSize: 16, color: l.tinte }}>Fahrschul Pro</Text>
            <Icon name="checkmark-circle" size={18} color="#8A5FFF" />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 18, rowGap: 6 }}>
            {[
              { icon: "tv-outline" as const, text: kurs.videos.length === 1 ? "1 Video" : `${kurs.videos.length} Videos` },
              ...(kurs.dauer ? [{ icon: "time-outline" as const, text: dauerLang(kurs.dauer) }] : []),
              { icon: "people-outline" as const, text: kurs.lernende === 1 ? "1 Lernender" : `${kurs.lernende} Lernende` },
            ].map((w) => (
              <View key={w.text} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icon name={w.icon} size={18} color={l.tinte2} />
                <Text style={{ ...lilaSchrift.textMittel, fontSize: 15, color: l.tinte }}>{w.text}</Text>
              </View>
            ))}
          </View>
          <View style={{ gap: 8 }}>
            <Pruefpunkt fertig={kurs.videos.length > 0 && kurs.gesehen === kurs.videos.length} text={`${kurs.gesehen} von ${kurs.videos.length} Videos angesehen`} />
            {kurs.kapitel.length > 1 ? <Pruefpunkt fertig={kapitelFertig === kurs.kapitel.length} text={`${kapitelFertig} von ${kurs.kapitel.length} Kapiteln abgeschlossen`} /> : null}
          </View>
          {naechstes ? (
            <Pressable
              onPress={() => {
                tippen();
                abspielen(naechstes);
              }}
              accessibilityRole="button"
              style={({ pressed }) => ({ height: 58, borderRadius: 29, overflow: "hidden", marginTop: 4, transform: [{ scale: pressed ? 0.98 : 1 }], shadowColor: "#6A3FE6", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } })}
            >
              <LinearGradient colors={["#9B74FF", "#7A4BF2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <Icon name="play" size={20} color="#FFFFFF" />
                <Text style={{ ...lilaSchrift.titel, fontSize: 23, letterSpacing: 0.4, color: "#FFFFFF" }}>{angefangen ? "WEITERSCHAUEN" : "VIDEOKURS STARTEN"}</Text>
              </LinearGradient>
            </Pressable>
          ) : null}
        </View>

        {/* Kapitel */}
        <View style={{ paddingHorizontal: LILA_RAND, marginTop: 18, gap: 14 }}>
          {kurs.kapitel.length === 0 ? (
            <LilaKarte>
              <View style={{ alignItems: "center", paddingVertical: 22, paddingHorizontal: 20, gap: 8 }}>
                <Image source={FIGUR.denken} style={{ width: 88, height: 88 }} resizeMode="contain" />
                <Text style={{ ...lilaSchrift.titel, fontSize: 20, color: l.tinte, textAlign: "center" }}>{geladen ? "Videos zu diesem Kurs folgen bald." : "Videos werden geladen …"}</Text>
              </View>
            </LilaKarte>
          ) : (
            kurs.kapitel.map((k, i) => (
              <LilaKarte key={`${i}-${k.titel}`}>
                <View style={{ padding: 14, gap: 6 }}>
                  <Text style={{ ...lilaSchrift.textFett, fontSize: 13, letterSpacing: 0.8, color: "#6A3FE6" }}>KAPITEL {i + 1}</Text>
                  {k.titel ? <Text style={{ ...lilaSchrift.titel, fontSize: 23, lineHeight: 26, color: l.tinte, marginBottom: 4 }}>{k.titel}</Text> : null}
                  {k.videos.map((v) => {
                    const ist = v.id === naechstes?.id;
                    const fertig = istGesehen(v.id);
                    return (
                      <Pressable
                        key={v.id}
                        onPress={() => {
                          tippen();
                          abspielen(v);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Video: ${v.titel}`}
                        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, padding: 8, marginHorizontal: -6, borderRadius: 16, backgroundColor: ist ? l.lilaFlaeche : pressed ? l.lilaFlaeche : "transparent" })}
                      >
                        <View style={{ width: 112, height: 66, borderRadius: 12, overflow: "hidden", backgroundColor: l.lilaZart }}>
                          <VideoBild pfad={v.pfad} ersatz={bild} style={{ width: "100%", height: "100%" }} />
                          {fertig ? (
                            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(106,63,230,0.45)", alignItems: "center", justifyContent: "center" }}>
                              <Icon name="checkmark-circle" size={26} color="#FFFFFF" />
                            </View>
                          ) : null}
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          {ist ? <Text style={{ ...lilaSchrift.textFett, fontSize: 12.5, letterSpacing: 0.6, color: "#6A3FE6" }}>ALS NÄCHSTES</Text> : null}
                          <Text style={{ ...lilaSchrift.textHalb, fontSize: 16, lineHeight: 21, color: l.tinte }} numberOfLines={2}>
                            {v.titel}
                          </Text>
                          <Text style={{ ...lilaSchrift.textMittel, fontSize: 13.5, color: l.tinte2 }}>{v.dauer ? dauerLang(v.dauer) : "Video"}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </LilaKarte>
            ))
          )}
          {folgender ? <LilaKnopf titel="Nächster Kurs" icon="arrow-forward" onPress={() => router.replace({ pathname: "/thema/[id]", params: { id: folgender.thema.id } })} style={{ marginTop: 6 }} /> : null}
        </View>
      </ScrollView>
      <LilaLeisteSeite aktiv="coach" />
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
