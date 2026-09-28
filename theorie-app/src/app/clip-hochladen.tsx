import { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Knopf, Kopf, T } from "@/components/ui";
import { clipHochladen, MAX_VIDEO_BYTES, useClipRechte } from "@/lib/clips-server";
import { erfolg, tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { abstand, farben, RAND, schrift } from "@/lib/theme";

type Video = { uri: string; breite: number | null; hoehe: number | null; dauer: number | null; groesse: number | null };

function Vorschau({ uri, breite }: { uri: string; breite: number }) {
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <View style={{ width: breite, height: (breite * 16) / 9, borderRadius: 18, overflow: "hidden", backgroundColor: "#000000" }}>
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

export default function ClipHochladen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { session } = useKonto();
  const rechte = useClipRechte();
  const [video, setVideo] = useState<Video | null>(null);
  const [beschreibung, setBeschreibung] = useState("");
  const [fortschritt, setFortschritt] = useState<number | null>(null);
  const abbruch = useRef<{ aktuell: (() => void) | null }>({ aktuell: null });

  // Beim Verlassen einen laufenden Upload abbrechen.
  useEffect(() => () => abbruch.current.aktuell?.(), []);

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
        Alert.alert("Video zu lang", "Höchstens 3 Minuten. Kürze das Video in der Fotos-App und wähle es dann erneut.");
        return;
      }
      if (a.fileSize && a.fileSize > MAX_VIDEO_BYTES) {
        Alert.alert("Video zu groß", "Höchstens 50 MB. Kürze das Video etwas oder wähle ein kürzeres.");
        return;
      }
      setVideo({ uri: a.uri, breite: a.width || null, hoehe: a.height || null, dauer: a.duration ? a.duration / 1000 : null, groesse: a.fileSize ?? null });
    } catch (e) {
      Alert.alert("Video konnte nicht geladen werden", (e as Error).message);
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
      Alert.alert("Clip ist online", "Dein Clip erscheint jetzt unter „Entdecken“.", [{ text: "Super", onPress: () => router.back() }]);
    } catch (e) {
      setFortschritt(null);
      const text = (e as Error).message;
      if (/abgebrochen|cancel/i.test(text)) return;
      Alert.alert("Hochladen hat nicht geklappt", text);
    }
  }

  if (!session || !rechte.ersteller) {
    return (
      <View style={{ flex: 1, backgroundColor: farben.grund }}>
        <Kopf titel="Clip hochladen" schliessen />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: RAND * 2, gap: abstand(3) }}>
          <Icon name="lock-closed" size={34} color={farben.text3} />
          <T v="h2" zentriert>
            Nur für Ersteller
          </T>
          <T v="text" zentriert>
            {session
              ? "Clips hochladen können der Inhaber der App und alle, die er in seinen Einstellungen freischaltet."
              : "Melde dich an – Hochladen geht nur mit einem freigeschalteten Konto."}
          </T>
        </View>
      </View>
    );
  }

  const laedtHoch = fortschritt != null;
  const vorschauBreite = Math.min(width * 0.46, 190);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: farben.grund }} behavior="padding">
      <Kopf titel="Clip hochladen" schliessen />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(8), gap: abstand(5) }} keyboardShouldPersistTaps="handled">
        {video ? (
          <View style={{ flexDirection: "row", gap: abstand(4), alignItems: "flex-end" }}>
            <Vorschau uri={video.uri} breite={vorschauBreite} />
            <View style={{ flex: 1, gap: abstand(2) }}>
              {video.dauer ? <T v="klein">{`${Math.floor(video.dauer / 60)}:${String(Math.round(video.dauer % 60)).padStart(2, "0")} Min.`}</T> : null}
              {video.groesse ? <T v="klein">{`${(video.groesse / 1024 / 1024).toFixed(1).replace(".", ",")} MB`}</T> : null}
              {!laedtHoch ? <Knopf titel="Anderes Video" klein art="sekundaer" onPress={auswaehlen} /> : null}
            </View>
          </View>
        ) : (
          <Pressable
            onPress={auswaehlen}
            style={({ pressed }) => ({
              height: 220,
              borderRadius: 20,
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: "rgba(255,255,255,0.22)",
              backgroundColor: pressed ? farben.flaeche2 : farben.flaeche,
              alignItems: "center",
              justifyContent: "center",
              gap: abstand(3),
            })}
          >
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: farben.orangeSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="film-outline" sf="video.badge.plus" size={30} color={farben.orange} />
            </View>
            <Text style={{ ...schrift.textHalb, fontSize: 17, color: "#FFFFFF" }}>Video auswählen</Text>
            <T v="klein" zentriert>
              Hochkant (9:16) wirkt am besten · bis 3 Minuten · max. 50 MB
            </T>
          </Pressable>
        )}

        <View style={{ gap: abstand(2) }}>
          <T v="h3">Beschreibung (optional)</T>
          <View style={{ minHeight: 110, borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linieStark, paddingHorizontal: abstand(4), paddingVertical: abstand(3) }}>
            <TextInput
              value={beschreibung}
              onChangeText={setBeschreibung}
              placeholder="Worum geht es im Clip? z. B. „Rechts vor links in 30 Sekunden“"
              placeholderTextColor={farben.text4}
              selectionColor={farben.orange}
              keyboardAppearance="dark"
              multiline
              maxLength={1000}
              editable={!laedtHoch}
              style={{ ...schrift.textMittel, fontSize: 16, color: farben.text, minHeight: 84, textAlignVertical: "top" }}
            />
          </View>
        </View>

        {laedtHoch ? (
          <View style={{ gap: abstand(2) }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <T v="textStark">{fortschritt >= 0.999 ? "Wird veröffentlicht …" : "Wird hochgeladen …"}</T>
              <T v="textStark" style={{ fontVariant: ["tabular-nums"] }}>
                {Math.round(fortschritt * 100)} %
              </T>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: farben.flaeche3, overflow: "hidden" }}>
              <View style={{ width: `${Math.max(3, fortschritt * 100)}%`, height: "100%", borderRadius: 4, backgroundColor: farben.orange }} />
            </View>
            <Knopf
              titel="Abbrechen"
              klein
              art="sekundaer"
              onPress={() => {
                abbruch.current.aktuell?.();
                setFortschritt(null);
              }}
            />
          </View>
        ) : (
          <Knopf titel="Veröffentlichen" icon="arrow-up" deaktiviert={!video} onPress={veroeffentlichen} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
