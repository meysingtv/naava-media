import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFenster } from "@/lib/fenster";
import { ErklaerAnimationSpieler } from "@/components/erklaer-animation";
import { FrageKopf, GlasRund, KopfPille } from "@/components/frage-rahmen";
import { Icon } from "@/components/icon";
import { Lader } from "@/components/lader";
import { Seite } from "@/components/seite";
import { kopfOben, Segment } from "@/components/ui";
import { useFarbwelt } from "@/lib/darstellung";
import { animationFuer } from "@/lib/erklaer-animationen";
import { erklaervideoUrl, useErklaervideos } from "@/lib/erklaervideos";
import { themaFoto } from "@/lib/fotos";
import { frageVon, themaVon } from "@/lib/fragen";
import { RAND, schrift } from "@/lib/theme";

// Erklärung zu einer Frage: das Video des Inhabers und/oder die eingebaute
// Animation. Gibt es beides, schaltet oben ein Umschalter zwischen ihnen.

type Art = "video" | "animation";

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

function VideoErklaerung({ url }: { url: string }) {
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

function Inhalt() {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const { width } = useFenster();
  const params = useLocalSearchParams<{ frage?: string; art?: string }>();
  const frage = params.frage ? frageVon(params.frage) : undefined;
  const { geladen, videos } = useErklaervideos();
  const video = frage ? videos[frage.id] : undefined;
  const animation = animationFuer(frage);
  const [wahl, setWahl] = useState<Art | null>(params.art === "video" || params.art === "animation" ? params.art : null);
  const art: Art | null = wahl === "video" && video ? "video" : wahl === "animation" && animation ? "animation" : video ? "video" : animation ? "animation" : null;
  const breite = Math.min(width - 2 * RAND, 560);

  return (
    <View style={{ flex: 1 }}>
      <FrageKopf
        oben={kopfOben(insets.top)}
        links={<GlasRund icon="close" label="Schließen" onPress={() => router.back()} />}
        rechts={<View />}
        titel="Erklärung"
        unter={frage ? <KopfPille bild={themaFoto(frage.thema)} text={themaVon(frage.thema).titel} /> : undefined}
      />

      <View style={{ flex: 1, paddingHorizontal: RAND, paddingBottom: insets.bottom + 12, gap: 14 }}>
        {frage ? (
          <Text numberOfLines={3} style={{ ...schrift.textMittel, fontSize: 15, lineHeight: 21, color: f.text2 }}>
            {frage.text}
          </Text>
        ) : null}
        {video && animation && art ? (
          <Segment
            optionen={[
              { id: "video", titel: "Video" },
              { id: "animation", titel: "Animation" },
            ]}
            wert={art}
            onWechsel={setWahl}
          />
        ) : null}

        {art === "video" && video ? (
          <VideoErklaerung url={erklaervideoUrl(video.pfad)} />
        ) : art === "animation" && animation ? (
          <ScrollView style={{ marginHorizontal: -RAND }} contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: 12, alignItems: "center" }} showsVerticalScrollIndicator={false}>
            <View style={{ width: breite }}>
              <ErklaerAnimationSpieler animation={animation} breite={breite} merke={frage?.erklaerung} />
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24 }}>
            {geladen || !frage ? (
              <>
                <Icon name="film-outline" size={32} color={f.text3} />
                <Text style={{ ...schrift.textHalb, fontSize: 16, lineHeight: 22, color: f.text2, textAlign: "center" }}>Zu dieser Frage gibt es noch keine Erklärung.</Text>
              </>
            ) : (
              <Lader color={f.text3} />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export default function Erklaerung() {
  return (
    <Seite>
      <Inhalt />
    </Seite>
  );
}
