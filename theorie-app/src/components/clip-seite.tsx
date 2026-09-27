import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEvent, useEventListener } from "expo";
import { useVideoPlayer, VideoView, type VideoPlayer } from "expo-video";
import type { SFSymbol } from "expo-symbols";

import { Icon, type IconName } from "@/components/icon";
import { Avatar } from "@/components/ui";
import { dateiUrl, kurzeZahl, type ClipEintrag } from "@/lib/clips-server";
import { stoss, tippen } from "@/lib/haptik";
import { farben, schrift } from "@/lib/theme";

/** Rot für „Gefällt mir“ wie bei TikTok. */
export const LIKE_ROT = "#FF3B5C";

const TEXT_SCHATTEN = { textShadowColor: "rgba(0,0,0,0.55)", textShadowRadius: 5, textShadowOffset: { width: 0, height: 1 } } as const;
const ICON_SCHATTEN =
  Platform.OS === "ios" ? ({ shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } } as const) : null;

// ---------------------------------------------------------------------------
// Kleine Bausteine
// ---------------------------------------------------------------------------

function Aktion({
  icon,
  sf,
  farbe = "#FFFFFF",
  zahl,
  label,
  onPress,
  skala,
}: {
  icon: IconName;
  sf: SFSymbol;
  farbe?: string;
  zahl?: string;
  label: string;
  onPress: () => void;
  skala?: Animated.Value;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ alignItems: "center", gap: 3, opacity: pressed ? 0.7 : 1 })}>
      <Animated.View style={[ICON_SCHATTEN, skala ? { transform: [{ scale: skala }] } : null]}>
        <Icon name={icon} sf={sf} size={33} color={farbe} weight="semibold" />
      </Animated.View>
      {zahl != null ? <Text style={{ ...schrift.textHalb, fontSize: 13, color: "#FFFFFF", ...TEXT_SCHATTEN }}>{zahl}</Text> : null}
    </Pressable>
  );
}

/** Herz, das beim Doppeltippen an der Stelle des Fingers aufploppt. */
function FliegendesHerz({ x, y, dreh, onFertig }: { x: number; y: number; dreh: number; onFertig: () => void }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(a, { toValue: 1, useNativeDriver: true, damping: 9, stiffness: 280, mass: 0.6 }),
      Animated.timing(a, { toValue: 2, duration: 420, delay: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(onFertig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const G = 104;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x - G / 2,
        top: y - G / 2,
        width: G,
        height: G,
        alignItems: "center",
        justifyContent: "center",
        opacity: a.interpolate({ inputRange: [0, 0.15, 1, 2], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: a.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 0, -70] }) },
          { rotate: `${dreh}deg` },
          { scale: a.interpolate({ inputRange: [0, 1, 2], outputRange: [0.25, 1, 1.35] }) },
        ],
      }}
    >
      <Icon name="heart" size={G} color={LIKE_ROT} />
    </Animated.View>
  );
}

/** Dünne Fortschrittslinie unten – läuft flüssig zwischen den Zeitmeldungen. */
function Fortschritt({ player, breite }: { player: VideoPlayer; breite: number }) {
  const anteil = useRef(new Animated.Value(0)).current;
  const letzter = useRef(0);
  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    const dauer = player.duration;
    if (!dauer || dauer <= 0) return;
    const neu = Math.min(1, currentTime / dauer);
    if (neu < letzter.current) anteil.setValue(neu);
    else Animated.timing(anteil, { toValue: neu, duration: 260, easing: Easing.linear, useNativeDriver: true }).start();
    letzter.current = neu;
  });
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2.5, backgroundColor: "rgba(255,255,255,0.16)", overflow: "hidden" }}>
      <Animated.View
        style={{
          width: breite,
          height: "100%",
          backgroundColor: "rgba(255,255,255,0.9)",
          transform: [{ translateX: anteil.interpolate({ inputRange: [0, 1], outputRange: [-breite / 2, 0] }) }, { scaleX: anteil }],
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Eine Seite im Feed
// ---------------------------------------------------------------------------

type Props = {
  clip: ClipEintrag;
  hoehe: number;
  breite: number;
  /** Diese Seite ist gerade zu sehen. */
  aktiv: boolean;
  /** Tab sichtbar und App im Vordergrund. */
  spielen: boolean;
  stumm: boolean;
  eigen: boolean;
  onLike: (clip: ClipEintrag, an: boolean) => void;
  onFolgen: (clip: ClipEintrag, an: boolean) => void;
  onKommentare: (clip: ClipEintrag) => void;
  onTeilen: (clip: ClipEintrag) => void;
  onMehr: (clip: ClipEintrag) => void;
};

function ClipSeiteInnen({ clip, hoehe, breite, aktiv, spielen, stumm, eigen, onLike, onFolgen, onKommentare, onTeilen, onMehr }: Props) {
  const quelle = useMemo(() => ({ uri: dateiUrl(clip.video_pfad), useCaching: true }), [clip.video_pfad]);
  const player = useVideoPlayer(quelle, (p) => {
    p.loop = true;
    p.muted = stumm;
    p.keepScreenOnWhilePlaying = true;
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  const [bereit, setBereit] = useState(false);
  const [pausiert, setPausiert] = useState(false);
  const [offen, setOffen] = useState(false);
  const [herzen, setHerzen] = useState<{ id: number; x: number; y: number; dreh: number }[]>([]);
  const bildDeckkraft = useRef(new Animated.Value(1)).current;
  const likeSkala = useRef(new Animated.Value(1)).current;
  const letzterTipp = useRef(0);
  const tippTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const laeuft = aktiv && spielen && !pausiert;

  useEffect(() => {
    if (laeuft) player.play();
    else player.pause();
  }, [laeuft, player]);

  // Beim Wegwischen zurück auf Anfang – beim Zurückkommen startet der Clip neu.
  useEffect(() => {
    if (aktiv) return;
    setPausiert(false);
    setOffen(false);
    try {
      player.currentTime = 0;
    } catch {
      // Player noch nicht bereit
    }
  }, [aktiv, player]);

  useEffect(() => {
    player.muted = stumm;
  }, [stumm, player]);

  // Zeitmeldungen nur für den sichtbaren Clip (spart Arbeit bei den vorgeladenen).
  useEffect(() => {
    player.timeUpdateEventInterval = aktiv ? 0.25 : 0;
  }, [aktiv, player]);

  useEffect(
    () => () => {
      if (tippTimer.current) clearTimeout(tippTimer.current);
    },
    [],
  );

  const erstesBild = useCallback(() => {
    setBereit(true);
    Animated.timing(bildDeckkraft, { toValue: 0, duration: 180, useNativeDriver: true }).start();
  }, [bildDeckkraft]);

  function likeAnimation() {
    likeSkala.setValue(0.7);
    Animated.spring(likeSkala, { toValue: 1, useNativeDriver: true, damping: 7, stiffness: 320, mass: 0.6 }).start();
  }

  function beiTipp(e: GestureResponderEvent) {
    const { locationX, locationY } = e.nativeEvent;
    const jetzt = Date.now();
    if (jetzt - letzterTipp.current < 280) {
      // Doppeltippen: Herz + Gefällt mir (nie wieder entliken)
      if (tippTimer.current) {
        clearTimeout(tippTimer.current);
        tippTimer.current = null;
      }
      letzterTipp.current = jetzt;
      stoss();
      setHerzen((h) => [...h.slice(-4), { id: jetzt, x: locationX, y: locationY, dreh: Math.round(Math.random() * 36 - 18) }]);
      if (!clip.gemocht) {
        likeAnimation();
        onLike(clip, true);
      }
      return;
    }
    letzterTipp.current = jetzt;
    tippTimer.current = setTimeout(() => {
      tippTimer.current = null;
      setPausiert((p) => !p);
    }, 280);
  }

  const quer = (clip.breite ?? 0) > (clip.hoehe ?? 0);
  const fehler = status === "error";

  return (
    <View style={{ width: breite, height: hoehe, backgroundColor: "#000000", overflow: "hidden" }}>
      <VideoView
        player={player}
        style={{ position: "absolute", top: 0, left: 0, width: breite, height: hoehe }}
        contentFit={quer ? "contain" : "cover"}
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
        allowsVideoFrameAnalysis={false}
        onFirstFrameRender={erstesBild}
      />

      {/* Vorschaubild, bis das erste Videobild da ist */}
      {clip.bild_pfad ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: bildDeckkraft }]}>
          <Image source={{ uri: dateiUrl(clip.bild_pfad) }} style={StyleSheet.absoluteFill} resizeMode={quer ? "contain" : "cover"} />
        </Animated.View>
      ) : null}

      {/* Tippen: Pause, Doppeltippen: Gefällt mir */}
      <Pressable style={StyleSheet.absoluteFill} onPress={beiTipp} accessibilityLabel={pausiert ? "Abspielen" : "Anhalten"} />

      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.28)", "rgba(0,0,0,0.62)"]} locations={[0, 0.45, 1]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 300 }} />

      {!bereit && aktiv && !fehler ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : null}

      {fehler ? (
        <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", gap: 12 }]}>
          <Icon name="alert-circle-outline" size={34} color="#FFFFFF" />
          <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#FFFFFF" }}>Video lädt gerade nicht</Text>
          <Pressable
            onPress={() => {
              tippen();
              player.replaceAsync(quelle).catch(() => {});
            }}
            style={{ paddingHorizontal: 16, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ ...schrift.textHalb, fontSize: 14, color: "#FFFFFF" }}>Nochmal versuchen</Text>
          </Pressable>
        </View>
      ) : null}

      {pausiert && aktiv ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
          <View style={ICON_SCHATTEN}>
            <Icon name="play" sf="play.fill" size={64} color="rgba(255,255,255,0.88)" />
          </View>
        </View>
      ) : null}

      {herzen.map((h) => (
        <FliegendesHerz key={h.id} x={h.x} y={h.y} dreh={h.dreh} onFertig={() => setHerzen((alle) => alle.filter((x) => x.id !== h.id))} />
      ))}

      {/* Rechte Leiste: Gefällt mir, Kommentare, Teilen, Mehr */}
      <View style={{ position: "absolute", right: 8, bottom: 22, width: 64, alignItems: "center", gap: 20 }}>
        <Aktion
          icon="heart"
          sf="heart.fill"
          farbe={clip.gemocht ? LIKE_ROT : "#FFFFFF"}
          zahl={kurzeZahl(clip.likes)}
          label={clip.gemocht ? "Gefällt mir nicht mehr" : "Gefällt mir"}
          skala={likeSkala}
          onPress={() => {
            tippen();
            if (!clip.gemocht) likeAnimation();
            onLike(clip, !clip.gemocht);
          }}
        />
        <Aktion
          icon="chatbubble-ellipses"
          sf="ellipsis.bubble.fill"
          zahl={kurzeZahl(clip.kommentare)}
          label="Kommentare"
          onPress={() => {
            tippen();
            onKommentare(clip);
          }}
        />
        <Aktion
          icon="arrow-redo"
          sf="arrowshape.turn.up.right.fill"
          zahl={clip.geteilt > 0 ? kurzeZahl(clip.geteilt) : "Teilen"}
          label="Teilen"
          onPress={() => {
            tippen();
            onTeilen(clip);
          }}
        />
        <Aktion
          icon="ellipsis-horizontal"
          sf="ellipsis"
          label="Mehr"
          onPress={() => {
            tippen();
            onMehr(clip);
          }}
        />
      </View>

      {/* Unten links: Nutzer, Folgen, Titel, Beschreibung */}
      <View style={{ position: "absolute", left: 14, right: 84, bottom: 20, gap: 7 }} pointerEvents="box-none">
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }} pointerEvents="box-none">
          <Avatar name={clip.autor_name || clip.autor_benutzername} groesse={36} farbe={clip.autor_farbe || farben.orange} />
          <Text numberOfLines={1} style={{ ...schrift.textFett, fontSize: 16, color: "#FFFFFF", flexShrink: 1, ...TEXT_SCHATTEN }}>
            @{clip.autor_benutzername}
          </Text>
          {eigen ? null : (
            <Pressable
              onPress={() => {
                tippen();
                onFolgen(clip, !clip.folge_ich);
              }}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={clip.folge_ich ? "Nicht mehr folgen" : "Folgen"}
              style={({ pressed }) => ({
                height: 28,
                paddingHorizontal: 13,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: clip.folge_ich ? "rgba(255,255,255,0.14)" : farben.orange,
                borderWidth: clip.folge_ich ? 1 : 0,
                borderColor: "rgba(255,255,255,0.38)",
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: "#FFFFFF" }}>{clip.folge_ich ? "Gefolgt" : "Folgen"}</Text>
            </Pressable>
          )}
        </View>
        <Text numberOfLines={2} style={{ ...schrift.textHalb, fontSize: 15.5, lineHeight: 20, color: "#FFFFFF", ...TEXT_SCHATTEN }}>
          {clip.titel}
        </Text>
        {clip.beschreibung ? (
          <Text
            numberOfLines={offen ? 10 : 2}
            onPress={() => setOffen((o) => !o)}
            suppressHighlighting
            style={{ ...schrift.text, fontSize: 14, lineHeight: 19, color: "#ECEEF0", ...TEXT_SCHATTEN }}
          >
            {clip.beschreibung}
          </Text>
        ) : null}
      </View>

      {aktiv ? <Fortschritt player={player} breite={breite} /> : null}
    </View>
  );
}

export const ClipSeite = memo(ClipSeiteInnen);
