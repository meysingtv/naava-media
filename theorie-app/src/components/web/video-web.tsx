import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";

import { ErklaerAnimationSpieler } from "@/components/erklaer-animation";
import { Icon, type IconName } from "@/components/icon";
import { Lader } from "@/components/lader";
import { Abschnitt, B, Kachel, Knopf, Leer, n, Reiter, Spalte, Symbol, THEMA_TON, UnterKopf, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { FrageBild } from "@/components/web/thema-web";
import { animationFuer, ANIMATION_TITEL, animationZuLage } from "@/lib/erklaer-animationen";
import { erklaervideoUrl, useErklaervideos } from "@/lib/erklaervideos";
import { FRAGEN, frageVon, themaVon, type ThemaId } from "@/lib/fragen";
import { FRAGEN_AKTIV } from "@/lib/funktionen";
import { useLernvideos, type Lernvideo } from "@/lib/lernvideos";
import { themavideoUrl, useThemenvideos } from "@/lib/themenvideos";

// Videos am PC: Themenvideo und Erklärung zu einer Frage. Links groß der
// Spieler (16:9), rechts, worum es geht, und wie es weitergeht.

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

function dauerText(s: number | null): string | null {
  if (!s) return null;
  const g = Math.round(s);
  return `${Math.floor(g / 60)}:${String(g % 60).padStart(2, "0")}`;
}

/** Spieler im Seitenverhältnis 16:9 mit Laden und Fehler. */
function Spieler({ url }: { url: string }) {
  const player = useVideoPlayer({ uri: url }, (p) => {
    p.loop = false;
    p.play();
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  return (
    <View style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 18, overflow: "hidden", backgroundColor: "#000000" }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls allowsFullscreen allowsPictureInPicture={false} />
      {status === "loading" ? (
        <View pointerEvents="none" style={[FUELLEN, { alignItems: "center", justifyContent: "center" }]}>
          <Lader color="#FFFFFF" size="large" />
        </View>
      ) : null}
      {status === "error" ? (
        <View style={[FUELLEN, { alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 32 }]}>
          <Icon name="cloud-offline-outline" size={30} color="#FFFFFF" />
          <Text style={{ ...n.fett, fontSize: 15, lineHeight: 21, color: "#FFFFFF", textAlign: "center" }}>Das Video lässt sich gerade nicht laden. Prüfe dein Internet.</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Platzhalter in Spielergröße (Laden oder „gibt es nicht“). */
function Platzhalter({ laedt, icon, titel, text }: { laedt: boolean; icon: IconName; titel: string; text?: string }) {
  return <Kachel style={{ width: "100%", aspectRatio: 16 / 9, alignItems: "center", justifyContent: "center" }}>{laedt ? <Lader color={B.text3} /> : <Leer icon={icon} ton={{ farbe: B.text3, kante: B.text3, hell: B.ton }} titel={titel} text={text} />}</Kachel>;
}

// ---------------------------------------------------------------------------
// Themenvideo
// ---------------------------------------------------------------------------

function VideoZeile({ video, themaId, aktiv, oben }: { video: Lernvideo; themaId: ThemaId; aktiv: boolean; oben: boolean }) {
  const ton = THEMA_TON[themaId];
  const dauer = dauerText(video.dauer);
  return (
    <Pressable
      disabled={aktiv}
      onPress={() => router.replace({ pathname: "/themavideo", params: video.params })}
      accessibilityRole="button"
      accessibilityLabel={`Video: ${video.titel}`}
      style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: oben ? 1.5 : 0, borderTopColor: B.ton, backgroundColor: aktiv ? B.ton : z.hovered ? B.hover : "transparent" })}
    >
      <Symbol icon={aktiv ? "volume-high" : video.art === "animation" ? "git-branch" : "play"} ton={ton ?? THEMA_TON.vorfahrt} groesse={36} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...n.fett, fontSize: 14.5, color: B.text }} numberOfLines={2}>
          {video.titel}
        </Text>
        <Text style={{ ...n.halb, fontSize: 12.5, color: B.text3 }}>{aktiv ? "läuft gerade" : video.art === "animation" ? "Animation" : dauer ? `${dauer} Min.` : "Video"}</Text>
      </View>
    </Pressable>
  );
}

/**
 * Ein Lernvideo am PC: Themenvideo (?id=), Erklärvideo zu einer Frage
 * (?frage=, ohne Fragetext) oder eingebaute Animation (?lage=).
 */
export function ThemavideoWeb() {
  const params = useLocalSearchParams<{ id?: string; frage?: string; lage?: string }>();
  const themen = useThemenvideos();
  const erklaer = useErklaervideos();
  const { zuThema } = useLernvideos();
  const [breite, setBreite] = useState(0);

  const themavideo = params.id ? themen.videos.find((v) => v.id === params.id) : undefined;
  const frage = params.frage ? frageVon(params.frage) : undefined;
  const fragevideo = frage ? erklaer.videos[frage.id] : undefined;
  const animation = animationZuLage(params.lage);
  const themaId = (themavideo?.thema_id ?? frage?.thema ?? (params.lage ? FRAGEN.find((q) => q.bild === params.lage)?.thema : undefined)) as ThemaId | undefined;
  const thema = themaId ? themaVon(themaId) : null;
  const ton = thema ? THEMA_TON[thema.id] : null;
  const url = themavideo ? themavideoUrl(themavideo.pfad) : fragevideo ? erklaervideoUrl(fragevideo.pfad) : null;
  const geladen = params.id ? themen.geladen : params.frage ? erklaer.geladen : true;
  const titel = themavideo?.titel ?? (animation && params.lage ? (ANIMATION_TITEL[params.lage] ?? "Animation") : fragevideo ? "Erklärvideo" : "Video");
  const andere = thema ? zuThema(thema.id) : [];
  const aktiv = params.id ? `t-${params.id}` : params.frage ? `f-${params.frage}` : params.lage ? `a-${params.lage}` : "";

  return (
    <WebSeite ohneRechts>
      <Spalte breite={1180}>
        <UnterKopf titel={titel} unter={thema ? `Video zum Thema ${thema.titel}` : undefined} />
        <View style={{ flexDirection: "row", gap: 24, alignItems: "flex-start" }}>
          <View style={{ flex: 1, minWidth: 0 }} onLayout={(e) => setBreite(e.nativeEvent.layout.width)}>
            {url ? (
              <Spieler key={url} url={url} />
            ) : animation ? (
              breite ? (
                <View style={{ width: Math.min(breite, 640), alignSelf: "center" }}>
                  <ErklaerAnimationSpieler animation={animation} breite={Math.min(breite, 640)} />
                </View>
              ) : null
            ) : (
              <Platzhalter laedt={!geladen} icon="film-outline" titel="Dieses Video gibt es nicht mehr" text="Vielleicht hat es der Inhaber gerade ersetzt." />
            )}
          </View>

          {thema && ton ? (
            <View style={{ width: 340, gap: 20 }}>
              <Kachel style={{ padding: 22, gap: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <Symbol icon={thema.icon as IconName} ton={ton} groesse={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }} numberOfLines={1}>
                      {thema.titel}
                    </Text>
                    <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }} numberOfLines={2}>
                      {thema.kurz}
                    </Text>
                  </View>
                </View>
                {FRAGEN_AKTIV ? <Knopf titel="Thema lernen" icon="play" onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: thema.id } })} /> : null}
                <Knopf titel="Zur Themenseite" art="rand" ton="blau" onPress={() => router.push({ pathname: "/thema/[id]", params: { id: thema.id } })} />
              </Kachel>

              {andere.length > 1 ? (
                <View>
                  <Abschnitt titel="Weitere Videos" link={`${andere.length} Videos`} />
                  <Kachel>
                    {andere.map((v, i) => (
                      <VideoZeile key={v.schluessel} video={v} themaId={thema.id} aktiv={v.schluessel === aktiv} oben={i > 0} />
                    ))}
                  </Kachel>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Spalte>
    </WebSeite>
  );
}

// ---------------------------------------------------------------------------
// Erklärung zu einer Frage
// ---------------------------------------------------------------------------

type Art = "video" | "animation";

export function ErklaerungWeb() {
  const params = useLocalSearchParams<{ frage?: string; art?: string }>();
  const frage = params.frage ? frageVon(params.frage) : undefined;
  const { geladen, videos } = useErklaervideos();
  const video = frage ? videos[frage.id] : undefined;
  const animation = animationFuer(frage);
  const [wahl, setWahl] = useState<Art | null>(params.art === "video" || params.art === "animation" ? params.art : null);
  const art: Art | null = wahl === "video" && video ? "video" : wahl === "animation" && animation ? "animation" : video ? "video" : animation ? "animation" : null;
  const [breite, setBreite] = useState(0);
  const thema = frage ? themaVon(frage.thema) : null;

  return (
    <WebSeite ohneRechts>
      <Spalte breite={1180}>
        <UnterKopf
          titel="Erklärung"
          unter={thema ? `${thema.titel} · Frage ${frage!.id.toUpperCase()}` : undefined}
          rechts={
            video && animation && art ? (
              <Reiter<Art>
                optionen={[
                  { id: "video", titel: "Video" },
                  { id: "animation", titel: "Animation" },
                ]}
                wert={art}
                onWechsel={setWahl}
              />
            ) : undefined
          }
        />

        <View style={{ flexDirection: "row", gap: 24, alignItems: "flex-start" }}>
          <View style={{ flex: 1, minWidth: 0 }} onLayout={(e) => setBreite(e.nativeEvent.layout.width)}>
            {art === "video" && video ? (
              <Spieler key={video.pfad} url={erklaervideoUrl(video.pfad)} />
            ) : art === "animation" && animation ? (
              breite ? (
                <View style={{ width: Math.min(breite, 640), alignSelf: "center" }}>
                  <ErklaerAnimationSpieler animation={animation} breite={Math.min(breite, 640)} merke={frage?.erklaerung} />
                </View>
              ) : null
            ) : (
              <Platzhalter laedt={Boolean(frage) && !geladen} icon="film-outline" titel="Noch keine Erklärung" text="Zu dieser Frage gibt es noch kein Video und keine Animation." />
            )}
          </View>

          {frage ? (
            <View style={{ width: 340, gap: 20 }}>
              <Kachel style={{ padding: 22, gap: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <FrageBild frage={frage} groesse={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...n.fett, fontSize: 13, color: B.text3 }}>Frage {frage.id.toUpperCase()}</Text>
                    <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>{frage.punkte} Punkte</Text>
                  </View>
                </View>
                <Text style={{ ...n.fett, fontSize: 15.5, lineHeight: 22, color: B.text }}>{frage.text}</Text>
                {art !== "animation" && frage.erklaerung ? (
                  <View style={{ gap: 4, paddingTop: 14, borderTopWidth: 1.5, borderTopColor: B.ton }}>
                    <Text style={{ ...n.fett, fontSize: 13, color: B.orangeKante }}>Merke</Text>
                    <Text style={{ ...n.halb, fontSize: 14, lineHeight: 20, color: B.text2 }}>{frage.erklaerung}</Text>
                  </View>
                ) : null}
              </Kachel>
              <Knopf titel="Frage üben" icon="play" onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: frage.thema, start: frage.id } })} />
            </View>
          ) : null}
        </View>
      </Spalte>
    </WebSeite>
  );
}
