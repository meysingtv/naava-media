import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErklaerAnimationSpieler } from "@/components/erklaer-animation";
import { FrageKopf, GlasRund, KopfPille } from "@/components/frage-rahmen";
import { Icon } from "@/components/icon";
import { Lader } from "@/components/lader";
import { Seite } from "@/components/seite";
import { kopfOben } from "@/components/ui";
import { ANIMATION_TITEL, animationZuLage } from "@/lib/erklaer-animationen";
import { erklaervideoUrl, useErklaervideos } from "@/lib/erklaervideos";
import { useFenster } from "@/lib/fenster";
import { themaFoto } from "@/lib/fotos";
import { frageVon, themaVon, type ThemaId } from "@/lib/fragen";
import { RAND, schrift } from "@/lib/theme";
import { themavideoUrl, useThemenvideos } from "@/lib/themenvideos";

// Ein Lernvideo abspielen: Themenvideo (?id=), Erklärvideo einer Frage (?frage=)
// oder eingebaute Animation (?lage=). Die Frage selbst wird hier nie gezeigt.

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

function Spieler({ url }: { url: string }) {
  const player = useVideoPlayer({ uri: url }, (p) => {
    p.loop = false;
    p.play();
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  return (
    <View style={{ flex: 1, borderRadius: 24, overflow: "hidden", backgroundColor: "#000000" }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls allowsFullscreen allowsPictureInPicture={false} />
      {status === "loading" ? (
        <View pointerEvents="none" style={[FUELLEN, { alignItems: "center", justifyContent: "center" }]}>
          <Lader color="#FFFFFF" size="large" />
        </View>
      ) : null}
      {status === "error" ? (
        <View style={[FUELLEN, { alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32 }]}>
          <Icon name="cloud-offline-outline" size={30} color="#FFFFFF" />
          <Text style={{ ...schrift.textHalb, fontSize: 15, lineHeight: 21, color: "#FFFFFF", textAlign: "center" }}>Das Video lässt sich gerade nicht laden. Prüfe dein Internet.</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function ThemavideoSeite() {
  const params = useLocalSearchParams<{ id?: string; frage?: string; lage?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useFenster();
  const themen = useThemenvideos();
  const erklaer = useErklaervideos();

  const themavideo = params.id ? themen.videos.find((v) => v.id === params.id) : undefined;
  const frage = params.frage ? frageVon(params.frage) : undefined;
  const fragevideo = frage ? erklaer.videos[frage.id] : undefined;
  const animation = animationZuLage(params.lage);

  const themaId = (themavideo?.thema_id ?? frage?.thema) as ThemaId | undefined;
  const thema = themaId ? themaVon(themaId) : null;
  const url = themavideo ? themavideoUrl(themavideo.pfad) : fragevideo ? erklaervideoUrl(fragevideo.pfad) : null;
  const geladen = params.id ? themen.geladen : params.frage ? erklaer.geladen : true;
  const titel = themavideo?.titel ?? (animation && params.lage ? ANIMATION_TITEL[params.lage] ?? "Animation" : fragevideo ? "Erklärvideo" : "Video");
  const breite = Math.min(width - 2 * RAND, 560);

  return (
    <Seite dunkel={!animation}>
      <FrageKopf
        oben={kopfOben(insets.top)}
        links={<GlasRund icon="close" label="Schließen" onPress={() => router.back()} />}
        rechts={<View />}
        titel={titel}
        unter={thema ? <KopfPille bild={themaFoto(thema.id)} text={thema.titel} /> : undefined}
      />
      <View style={{ flex: 1, paddingHorizontal: RAND, paddingBottom: insets.bottom + 12 }}>
        {url ? (
          <Spieler url={url} />
        ) : animation ? (
          <ScrollView style={{ marginHorizontal: -RAND }} contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: 12, alignItems: "center" }} showsVerticalScrollIndicator={false}>
            <View style={{ width: breite }}>
              <ErklaerAnimationSpieler animation={animation} breite={breite} />
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
            {geladen ? <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#FFFFFF" }}>Dieses Video gibt es nicht mehr.</Text> : <Lader color="#FFFFFF" size="large" />}
          </View>
        )}
      </View>
    </Seite>
  );
}
