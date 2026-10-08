import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type MenueEintrag } from "@/components/aufklapp-menue";
import { auswahlBlatt } from "@/components/auswahl-blatt";
import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { Lader } from "@/components/lader";
import { GrossKopf, Seite } from "@/components/seite";
import { Chip, Eingabe, Gruppe, kartenFlaeche, Knopf, T, Zeile } from "@/components/ui";
import { useClipRechte } from "@/lib/clips-server";
import { useFarbwelt } from "@/lib/darstellung";
import { animationFuer } from "@/lib/erklaer-animationen";
import { erklaervideoHochladen, erklaervideoLoeschen, erklaervideosLaden, useErklaervideos } from "@/lib/erklaervideos";
import { FRAGEN, themaVon, type Frage } from "@/lib/fragen";
import { erfolg } from "@/lib/haptik";
import { abstand, leuchten, RAND, schrift } from "@/lib/theme";

// Nur für den Inhaber: zu jeder Frage ein eigenes Erklärvideo hochladen. Beim
// Lernen erscheint dann neben der KI-Hilfe ein Play-Knopf. Fragen mit Lageplan
// haben zusätzlich eine eingebaute Animation.

type Filter = "alle" | "video" | "ohne" | "animation";

/** Längstes Erklärvideo (Millisekunden). */
const MAX_DAUER = 5 * 60_000;

type Hochladen = { frageId: string; anteil: number | null; vorbereitung: number | null };

function dauerText(sek: number | null): string | null {
  if (!sek) return null;
  const s = Math.round(sek);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Inhalt() {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const rechte = useClipRechte();
  const { geladen, videos } = useErklaervideos();
  const [suche, setSuche] = useState("");
  const [filter, setFilter] = useState<Filter>("alle");
  const [laeuft, setLaeuft] = useState<Hochladen | null>(null);
  const abbruch = useRef<{ aktuell: (() => void) | null }>({ aktuell: null });
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const blau = f.hell ? "#2F7BE0" : "#4DA3FF";

  // Liste frisch holen; beim Verlassen ein laufendes Hochladen abbrechen.
  useEffect(() => {
    erklaervideosLaden();
    const a = abbruch.current;
    return () => a.aktuell?.();
  }, []);

  const zahlen = useMemo(
    () => ({
      video: FRAGEN.filter((fr) => videos[fr.id]).length,
      animation: FRAGEN.filter((fr) => animationFuer(fr)).length,
    }),
    [videos],
  );

  const liste = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return FRAGEN.filter((fr) => {
      const v = Boolean(videos[fr.id]);
      if (filter === "video" && !v) return false;
      if (filter === "ohne" && v) return false;
      if (filter === "animation" && !animationFuer(fr)) return false;
      if (!q) return true;
      return fr.id.toLowerCase() === q || fr.text.toLowerCase().includes(q) || themaVon(fr.thema).titel.toLowerCase().includes(q);
    });
  }, [suche, filter, videos]);

  async function hochladen(fr: Frage) {
    if (laeuft) {
      dialog("Einen Moment", "Es wird gerade schon ein Video hochgeladen.");
      return;
    }
    try {
      // Wie bei den Clips: das iPhone rechnet gleich auf 720p (H.264) herunter.
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: false,
        videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      const a = r.canceled ? null : r.assets?.[0];
      if (!a) return;
      if (a.duration && a.duration > MAX_DAUER) {
        dialog("Video zu lang", "Höchstens 5 Minuten. Kürze das Video in der Fotos-App und wähle es dann erneut.");
        return;
      }
      setLaeuft({ frageId: fr.id, anteil: null, vorbereitung: null });
      await erklaervideoHochladen({
        frageId: fr.id,
        uri: a.uri,
        dauer: a.duration ? a.duration / 1000 : null,
        groesse: a.fileSize ?? null,
        onVorbereitung: (v) => setLaeuft((l) => (l ? { ...l, vorbereitung: v } : l)),
        onFortschritt: (x) => setLaeuft((l) => (l ? { ...l, anteil: x, vorbereitung: null } : l)),
        abbruch: abbruch.current,
      });
      setLaeuft(null);
      erfolg();
      dialog("Video ist online", `Beim Lernen zeigt Frage ${fr.id.toUpperCase()} jetzt neben der KI-Hilfe den Play-Knopf.`);
    } catch (e) {
      setLaeuft(null);
      const text = (e as Error).message;
      if (/abgebrochen|cancel/i.test(text)) return;
      dialog("Hochladen hat nicht geklappt", text);
    }
  }

  function loeschen(fr: Frage) {
    dialog(`Video zu ${fr.id.toUpperCase()} löschen?`, animationFuer(fr) ? "Beim Lernen bleibt dann nur die eingebaute Animation." : "Beim Lernen verschwindet dann der Play-Knopf bei dieser Frage.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: async () => {
          try {
            await erklaervideoLoeschen(fr.id);
          } catch (e) {
            dialog("Nicht gelöscht", (e as Error).message);
          }
        },
      },
    ]);
  }

  async function menue(fr: Frage) {
    const v = videos[fr.id];
    const anim = animationFuer(fr);
    const ansehen = (art: "video" | "animation") => router.push({ pathname: "/erklaerung", params: { frage: fr.id, art } });
    const optionen: (MenueEintrag & { tun: () => void })[] = [];
    if (v) optionen.push({ text: "Video ansehen", icon: "play-circle-outline", sf: "play.circle", tun: () => ansehen("video") });
    optionen.push({ text: v ? "Anderes Video hochladen" : "Video hochladen", icon: "cloud-upload-outline", sf: "square.and.arrow.up", tun: () => hochladen(fr) });
    if (anim) optionen.push({ text: "Animation ansehen", icon: "sparkles-outline", sf: "sparkles", tun: () => ansehen("animation") });
    if (v) optionen.push({ text: "Video löschen", icon: "trash-outline", sf: "trash", gefahr: true, tun: () => loeschen(fr) });
    const i = await auswahlBlatt(`Frage ${fr.id.toUpperCase()}`, optionen.map(({ text, icon, sf, gefahr }) => ({ text, icon, sf, gefahr })));
    if (i != null) optionen[i].tun();
  }

  if (!rechte.inhaber) {
    return (
      <View style={{ flex: 1 }}>
        <GrossKopf titel="Erklärvideos" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: RAND * 2, gap: abstand(3) }}>
          <Icon name="lock-closed" size={34} color={f.text3} />
          <T v="h2" zentriert>
            Nur für den Inhaber
          </T>
          <T v="text" zentriert>
            Hier lädt der Inhaber der App Erklärvideos zu einzelnen Fragen hoch.
          </T>
        </View>
      </View>
    );
  }

  const fortschritt = laeuft?.vorbereitung ?? laeuft?.anteil ?? null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + (laeuft ? 150 : 40) }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        <GrossKopf titel="Erklärvideos" unter="Video zu einer Frage hochladen – beim Lernen erscheint dann neben der KI-Hilfe ein Play-Knopf." />

        <View style={{ paddingHorizontal: RAND, gap: abstand(4), marginTop: abstand(3) }}>
          <Eingabe icon="search" value={suche} onChangeText={setSuche} placeholder="Frage suchen, z. B. v1" autoCapitalize="none" autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -RAND }} contentContainerStyle={{ paddingHorizontal: RAND, gap: 8 }}>
            <Chip text="Alle" aktiv={filter === "alle"} onPress={() => setFilter("alle")} />
            <Chip text={`Mit Video · ${zahlen.video}`} aktiv={filter === "video"} onPress={() => setFilter("video")} />
            <Chip text="Ohne Video" aktiv={filter === "ohne"} onPress={() => setFilter("ohne")} />
            <Chip text={`Mit Animation · ${zahlen.animation}`} aktiv={filter === "animation"} onPress={() => setFilter("animation")} />
          </ScrollView>

          <T v="klein">Fragen mit Lageplan haben schon eine eingebaute Animation. Lädst du dort ein Video hoch, gibt es beim Lernen beides. Videos bis 5 Minuten, am besten hochkant.</T>

          {!geladen ? (
            <View style={{ paddingVertical: 30, alignItems: "center" }}>
              <Lader color={f.text3} />
            </View>
          ) : liste.length === 0 ? (
            <T v="text" zentriert style={{ paddingVertical: 30 }}>
              Keine passende Frage.
            </T>
          ) : (
            <Gruppe>
              {liste.map((fr) => {
                const v = videos[fr.id];
                const anim = Boolean(animationFuer(fr));
                const status = [v ? `Video ${dauerText(v.dauer) ?? ""}`.trim() : null, anim ? "Animation" : null].filter(Boolean).join(" · ");
                const hier = laeuft?.frageId === fr.id;
                return (
                  <Zeile
                    key={fr.id}
                    icon={v ? "play-circle" : anim ? "film-outline" : "add"}
                    iconFarbe={v ? gruen : anim ? blau : undefined}
                    titel={fr.text}
                    titelZeilen={2}
                    unter={`${fr.id.toUpperCase()} · ${themaVon(fr.thema).titel}${status ? ` · ${status}` : ""}`}
                    rechts={hier ? <Lader color={f.orange} /> : undefined}
                    onPress={() => menue(fr)}
                  />
                );
              })}
            </Gruppe>
          )}
        </View>
      </ScrollView>

      {laeuft ? (
        <View style={{ position: "absolute", left: RAND, right: RAND, bottom: insets.bottom + 12 }}>
          <View style={[{ borderRadius: 22, padding: 16, gap: 10 }, kartenFlaeche(f), leuchten("#000000", f.hell ? 0.12 : 0.35, 16, 6)]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text, flex: 1 }} numberOfLines={1}>
                {laeuft.vorbereitung != null
                  ? `Frage ${laeuft.frageId.toUpperCase()}: Video wird verkleinert …`
                  : (laeuft.anteil ?? 0) >= 0.999
                    ? `Frage ${laeuft.frageId.toUpperCase()}: wird gespeichert …`
                    : `Frage ${laeuft.frageId.toUpperCase()}: wird hochgeladen …`}
              </Text>
              <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text, fontVariant: ["tabular-nums"] }}>{fortschritt != null ? `${Math.round(fortschritt * 100)} %` : ""}</Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: f.hell ? "rgba(20,23,27,0.08)" : "rgba(255,255,255,0.1)", overflow: "hidden" }}>
              <View style={{ width: `${Math.max(3, (fortschritt ?? 0) * 100)}%`, height: "100%", borderRadius: 4, backgroundColor: f.orange }} />
            </View>
            <Knopf
              titel="Abbrechen"
              klein
              art="sekundaer"
              onPress={() => {
                abbruch.current.aktuell?.();
                setLaeuft(null);
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function Erklaervideos() {
  return (
    <Seite>
      <Inhalt />
    </Seite>
  );
}
