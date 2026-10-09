import { useEffect, useRef, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircleIcon } from "phosphor-react-native/src/icons/CheckCircle";
import { CloudArrowUpIcon } from "phosphor-react-native/src/icons/CloudArrowUp";
import { FilmStripIcon } from "phosphor-react-native/src/icons/FilmStrip";
import { LockIcon } from "phosphor-react-native/src/icons/Lock";
import { VideoCameraIcon } from "phosphor-react-native/src/icons/VideoCamera";

import { useFenster } from "@/lib/fenster";
import { GlasGrund, GlasKarte } from "@/components/glas-flaeche";
import { GrossKopf, Seite } from "@/components/seite";
import { Knopf } from "@/components/ui";
import { dialog } from "@/components/dialog";
import { clipHochladen, MAX_VIDEO_BYTES, useClipRechte } from "@/lib/clips-server";
import { useFarbwelt } from "@/lib/darstellung";
import { erfolg, tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { farben, RAND, schrift, verlauf } from "@/lib/theme";
import { verkleinernNoetig, videoVerkleinern } from "@/lib/video-verkleinern";

type Video = { uri: string; breite: number | null; hoehe: number | null; dauer: number | null; groesse: number | null };

/** Auf dem iPad eine ruhige Spalte statt über die ganze Breite. */
const SPALTE = 640;

/** Grund, Kopf und scrollbarer Inhalt – auf dem iPad mittig und nicht gestreckt. */
function Rahmen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <GlasGrund />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ width: "100%", maxWidth: SPALTE + 2 * RAND, alignSelf: "center" }}>
          <GrossKopf titel="Clip hochladen" unter="Kurzes Video für alle im Clips-Tab" schliessen />
        </View>
        <ScrollView
          contentContainerStyle={{ width: "100%", maxWidth: SPALTE + 2 * RAND, alignSelf: "center", paddingHorizontal: RAND, paddingTop: 14, paddingBottom: insets.bottom + 32, gap: 18 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

/** Fortschritt als Balken mit Prozent rechts. */
function Fortschritt({ anteil }: { anteil: number }) {
  const f = useFarbwelt();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: f.hell ? "rgba(20,23,27,0.08)" : "rgba(255,255,255,0.1)", overflow: "hidden" }}>
        <LinearGradient colors={verlauf.knopf} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: `${Math.max(3, Math.min(1, anteil) * 100)}%`, height: "100%", borderRadius: 4 }} />
      </View>
      <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text, fontVariant: ["tabular-nums"], minWidth: 46, textAlign: "right" }}>{Math.round(anteil * 100)} %</Text>
    </View>
  );
}

/** Kleine Angabe zum Video: Bezeichnung klein, Wert groß. */
function Angabe({ titel, wert }: { titel: string; wert: string }) {
  const f = useFarbwelt();
  return (
    <View>
      <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }}>{titel}</Text>
      <Text style={{ ...schrift.titel, fontSize: 19, lineHeight: 24, color: f.text, fontVariant: ["tabular-nums"] }}>{wert}</Text>
    </View>
  );
}

function Vorschau({ uri, breite }: { uri: string; breite: number }) {
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <View style={{ width: breite, height: (breite * 16) / 9, borderRadius: 16, overflow: "hidden", backgroundColor: "#000000" }}>
      <VideoView
        player={player}
        style={{ width: breite, height: (breite * 16) / 9 }}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
}

function Inhalt() {
  const f = useFarbwelt();
  const { width } = useFenster();
  const { session } = useKonto();
  const rechte = useClipRechte();
  const [video, setVideo] = useState<Video | null>(null);
  const [beschreibung, setBeschreibung] = useState("");
  const [fortschritt, setFortschritt] = useState<number | null>(null);
  /** Android: Video wird gerade auf 720p verkleinert (0–1). */
  const [vorbereitung, setVorbereitung] = useState<number | null>(null);
  const abbruch = useRef<{ aktuell: (() => void) | null }>({ aktuell: null });
  const verkleinernAbbruch = useRef<{ aktuell: (() => void) | null }>({ aktuell: null });

  // Beim Verlassen einen laufenden Upload bzw. das Verkleinern abbrechen.
  useEffect(
    () => () => {
      abbruch.current.aktuell?.();
      verkleinernAbbruch.current.aktuell?.();
    },
    [],
  );

  async function auswaehlen() {
    tippen();
    try {
      // Moderner iOS-Picker: braucht keine Fotofreigabe und rechnet das Video
      // gleich auf 720p (H.264, .mp4) herunter – kleine Datei, ruckelfreier Feed.
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: false,
        videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      if (a.duration && a.duration > 180_000) {
        dialog("Video zu lang", "Höchstens 3 Minuten. Kürze das Video in der Fotos-App und wähle es dann erneut.");
        return;
      }
      let uri = a.uri;
      let groesse = a.fileSize ?? null;
      let breite = a.width || null;
      let hoehe = a.height || null;
      // Android: wie das iPhone auf 720p verkleinern (kleine Datei, ruckelfreier Feed).
      if (verkleinernNoetig) {
        setVideo(null);
        setVorbereitung(0);
        const klein = await videoVerkleinern(a.uri, setVorbereitung, verkleinernAbbruch.current);
        setVorbereitung(null);
        if (klein) {
          uri = klein.uri;
          groesse = klein.groesse ?? groesse;
          const faktor = breite && hoehe ? Math.min(1, 1280 / Math.max(breite, hoehe)) : 1;
          breite = breite ? Math.round(breite * faktor) : null;
          hoehe = hoehe ? Math.round(hoehe * faktor) : null;
        }
      }
      if (groesse && groesse > MAX_VIDEO_BYTES) {
        dialog("Video zu groß", "Höchstens 50 MB. Kürze das Video etwas oder wähle ein kürzeres.");
        return;
      }
      setVideo({ uri, breite, hoehe, dauer: a.duration ? a.duration / 1000 : null, groesse });
    } catch (e) {
      setVorbereitung(null);
      dialog("Video konnte nicht geladen werden", (e as Error).message);
    }
  }

  async function veroeffentlichen() {
    if (!video || fortschritt != null) return;
    setFortschritt(0);
    try {
      await clipHochladen({
        videoUri: video.uri,
        breite: video.breite,
        hoehe: video.hoehe,
        dauer: video.dauer,
        // Kein Titel im Video – intern (Teilen, Menü) die erste Zeile der Beschreibung.
        titel: beschreibung.trim().split("\n")[0].slice(0, 60) || "Clip",
        beschreibung,
        onFortschritt: (a) => setFortschritt(a),
        abbruch: abbruch.current,
      });
      erfolg();
      dialog("Clip ist online", "Dein Clip erscheint jetzt unter „Entdecken“.", [{ text: "Super", onPress: () => router.back() }]);
    } catch (e) {
      setFortschritt(null);
      const text = (e as Error).message;
      if (/abgebrochen|cancel/i.test(text)) return;
      dialog("Hochladen hat nicht geklappt", text);
    }
  }

  if (!session || !rechte.ersteller) {
    return (
      <Rahmen>
        <GlasKarte style={{ borderRadius: 26, paddingHorizontal: 22, paddingTop: 28, paddingBottom: 22, alignItems: "center", gap: 10 }}>
          <LockIcon size={44} color={f.text3} weight="fill" />
          <Text style={{ ...schrift.titel, fontSize: 22, lineHeight: 28, color: f.text, textAlign: "center", marginTop: 4 }}>Nur für Ersteller</Text>
          <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 21, color: f.text2, textAlign: "center" }}>
            {session ? "Clips hochladen können der Inhaber der App und angenommene Creator." : "Melde dich an – Hochladen geht nur mit einem freigeschalteten Konto."}
          </Text>
          {session ? (
            <View style={{ alignSelf: "stretch", marginTop: 10 }}>
              <Knopf titel="Als Creator bewerben" art="sekundaer" onPress={() => router.replace("/creator-bewerbung")} />
            </View>
          ) : null}
        </GlasKarte>
      </Rahmen>
    );
  }

  const laedtHoch = fortschritt != null;
  const vorschauBreite = Math.min((Math.min(width, SPALTE) - 2 * RAND) * 0.42, 200);
  const linie = f.hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.12)";

  return (
    <Rahmen>
      {vorbereitung != null ? (
        <GlasKarte style={{ borderRadius: 26, padding: 22, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <FilmStripIcon size={28} color={f.orange} weight="fill" />
            <Text style={{ ...schrift.textHalb, fontSize: 16, lineHeight: 21, color: f.text, flex: 1 }}>Video wird für den Upload verkleinert …</Text>
          </View>
          <Fortschritt anteil={vorbereitung} />
        </GlasKarte>
      ) : video ? (
        <GlasKarte style={{ borderRadius: 26, padding: 14, flexDirection: "row", gap: 16 }}>
          <Vorschau uri={video.uri} breite={vorschauBreite} />
          <View style={{ flex: 1, justifyContent: "space-between", paddingVertical: 6, paddingRight: 4 }}>
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <CheckCircleIcon size={18} color={f.hell ? "#23A548" : "#4ED053"} weight="fill" />
                <Text style={{ ...schrift.textHalb, fontSize: 15.5, color: f.text }}>Video gewählt</Text>
              </View>
              {video.dauer ? <Angabe titel="Länge" wert={`${Math.floor(video.dauer / 60)}:${String(Math.round(video.dauer % 60)).padStart(2, "0")} Min.`} /> : null}
              {video.groesse ? <Angabe titel="Größe" wert={`${(video.groesse / 1024 / 1024).toFixed(1).replace(".", ",")} MB`} /> : null}
            </View>
            {!laedtHoch ? <Knopf titel="Anderes Video" klein art="sekundaer" onPress={auswaehlen} /> : null}
          </View>
        </GlasKarte>
      ) : (
        <Pressable onPress={auswaehlen} accessibilityRole="button" accessibilityLabel="Video auswählen" style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <GlasKarte style={{ borderRadius: 26, padding: 10 }}>
            {/* Gestrichelte Ablagefläche im Glas */}
            <View style={{ height: 230, borderRadius: 18, borderWidth: 1.5, borderStyle: "dashed", borderColor: f.hell ? "rgba(20,23,27,0.16)" : "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 24 }}>
              <VideoCameraIcon size={44} color={f.orange} weight="fill" />
              <Text style={{ ...schrift.titel, fontSize: 21, lineHeight: 26, color: f.text, marginTop: 6 }}>Video auswählen</Text>
              <Text style={{ ...schrift.text, fontSize: 13.5, lineHeight: 19, color: f.text3, textAlign: "center" }}>Hochkant (9:16) wirkt am besten · bis 3 Minuten · max. 50 MB</Text>
            </View>
          </GlasKarte>
        </Pressable>
      )}

      {/* Beschreibung als Glasfeld mit Zähler */}
      <GlasKarte style={{ borderRadius: 22, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <Text style={{ ...schrift.textHalb, fontSize: 15.5, color: f.text }}>
            Beschreibung<Text style={{ ...schrift.text, color: f.text3 }}> · optional</Text>
          </Text>
          <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3, fontVariant: ["tabular-nums"] }}>{beschreibung.length}/1000</Text>
        </View>
        <TextInput
          value={beschreibung}
          onChangeText={setBeschreibung}
          placeholder="Worum geht es im Clip? z. B. „Rechts vor links in 30 Sekunden“"
          placeholderTextColor={f.hell ? "#A3A8AF" : farben.text4}
          selectionColor={f.orange}
          cursorColor={f.orange}
          selectionHandleColor={f.orange}
          keyboardAppearance={f.hell ? "light" : "dark"}
          multiline
          maxLength={1000}
          editable={!laedtHoch}
          style={{ ...schrift.text, fontSize: 16, lineHeight: 22, color: f.text, minHeight: 96, paddingTop: 8, paddingBottom: 8, textAlignVertical: "top", opacity: laedtHoch ? 0.6 : 1 }}
        />
      </GlasKarte>

      {laedtHoch ? (
        <GlasKarte style={{ borderRadius: 22, padding: 18, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <CloudArrowUpIcon size={24} color={f.orange} weight="fill" />
            <Text style={{ ...schrift.textHalb, fontSize: 16, color: f.text, flex: 1 }}>{fortschritt >= 0.999 ? "Wird veröffentlicht …" : "Wird hochgeladen …"}</Text>
          </View>
          <Fortschritt anteil={fortschritt} />
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: linie }} />
          <Knopf
            titel="Abbrechen"
            klein
            art="sekundaer"
            onPress={() => {
              abbruch.current.aktuell?.();
              setFortschritt(null);
            }}
          />
        </GlasKarte>
      ) : (
        <Knopf titel="Veröffentlichen" icon="arrow-up" deaktiviert={!video || vorbereitung != null} onPress={veroeffentlichen} />
      )}
    </Rahmen>
  );
}

export default function ClipHochladen() {
  return (
    <Seite>
      <Inhalt />
    </Seite>
  );
}
