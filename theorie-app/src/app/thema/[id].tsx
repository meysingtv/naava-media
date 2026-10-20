import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KopfPille } from "@/components/frage-rahmen";
import { FrageZeile, type FrageStatus } from "@/components/frage-liste";
import { Kopfzeile, StartKnopf } from "@/components/home";
import { Icon } from "@/components/icon";
import { FotoKopf, Seite, StandKarte } from "@/components/seite";
import { Knopf } from "@/components/ui";
import { useDarstellung } from "@/lib/darstellung";
import { fragenZuThema, themaVon, type ThemaId } from "@/lib/fragen";
import { themaFoto } from "@/lib/fotos";
import { fortschritt, themaStatistik, useStand } from "@/lib/stand";
import { leuchten, RAND, schrift } from "@/lib/theme";
import { useThemenvideos, type Themavideo } from "@/lib/themenvideos";

// Ein Thema im Kino-Look: Titelfoto, Stand als Ring mit Werten, Startknopf,
// Videos zum Thema (falls der Inhaber welche hochgeladen hat) und alle Fragen
// als Karten mit ihrem Stand.

function dauerText(s: number | null): string | null {
  if (!s) return null;
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

/** Karte eines Themenvideos: Themenfoto mit Abspielknopf, darunter der Titel. */
function VideoKarte({ video, themaId }: { video: Themavideo; themaId: ThemaId }) {
  const { farbwelt: f } = useDarstellung();
  const dauer = dauerText(video.dauer);
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/themavideo", params: { id: video.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Video: ${video.titel}`}
      style={({ pressed }) => ({ width: 220, gap: 8, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <View style={[{ height: 124, borderRadius: 18, overflow: "hidden", backgroundColor: "#0B0E12" }, f.hell ? leuchten("#3C2C18", 0.12, 10, 4) : null]}>
        <Image source={themaFoto(themaId)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
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
  const { id } = useLocalSearchParams<{ id: string }>();
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
                <VideoKarte key={v.id} video={v} themaId={thema.id} />
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
