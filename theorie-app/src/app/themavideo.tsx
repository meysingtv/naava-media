import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FrageKopf, GlasRund, KopfPille } from "@/components/frage-rahmen";
import { Icon } from "@/components/icon";
import { Lader } from "@/components/lader";
import { Seite } from "@/components/seite";
import { kopfOben } from "@/components/ui";
import { themaFoto } from "@/lib/fotos";
import { themaVon, type ThemaId } from "@/lib/fragen";
import { RAND, schrift } from "@/lib/theme";
import { themavideoUrl, useThemenvideos } from "@/lib/themenvideos";

// Ein Video zu einem Thema (vom Inhaber im Manager hochgeladen) abspielen.

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { geladen, videos } = useThemenvideos();
  const video = videos.find((v) => v.id === id);
  const thema = video ? themaVon(video.thema_id as ThemaId) : null;

  return (
    <Seite dunkel>
      <FrageKopf
        oben={kopfOben(insets.top)}
        links={<GlasRund icon="close" label="Schließen" onPress={() => router.back()} />}
        rechts={<View />}
        titel={video?.titel ?? "Video"}
        unter={thema ? <KopfPille bild={themaFoto(thema.id)} text={thema.titel} /> : undefined}
      />
      <View style={{ flex: 1, paddingHorizontal: RAND, paddingBottom: insets.bottom + 12 }}>
        {video ? (
          <Spieler url={themavideoUrl(video.pfad)} />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
            {geladen ? <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#FFFFFF" }}>Dieses Video gibt es nicht mehr.</Text> : <Lader color="#FFFFFF" size="large" />}
          </View>
        )}
      </View>
    </Seite>
  );
}
