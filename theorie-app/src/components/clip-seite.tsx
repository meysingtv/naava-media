import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEvent, useEventListener } from "expo";
import { useVideoPlayer, VideoView, type VideoPlayer } from "expo-video";
import type { SFSymbol } from "expo-symbols";

import { Glas } from "@/components/glas";
import { Icon, type IconName } from "@/components/icon";
import { Avatar } from "@/components/ui";
import { dateiUrl, kurzeZahl, type ClipEintrag } from "@/lib/clips-server";
import { stoss, tippen } from "@/lib/haptik";
import { farben, schrift } from "@/lib/theme";

// Eigener Spur-Look: Video im Vollbild, darunter eine Glas-Karte mit Ersteller,
// Titel und einer Aktionsleiste – orange Akzente statt der üblichen
// Kurzvideo-Optik mit Symbolspalte am Rand.

// ---------------------------------------------------------------------------
// Bausteine
// ---------------------------------------------------------------------------

function Aktion({
  icon,
  sf,
  text,
  aktiv,
  label,
  onPress,
  skala,
}: {
  icon: IconName;
  sf: SFSymbol;
  text?: string;
  aktiv?: boolean;
  label: string;
  onPress: () => void;
  skala?: Animated.Value;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: text ? 1 : undefined,
        width: text ? undefined : 44,
        height: 40,
        borderRadius: 20,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: aktiv ? "rgba(252,91,14,0.22)" : pressed ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: aktiv ? "rgba(252,91,14,0.55)" : "rgba(255,255,255,0.08)",
      })}
    >
      <Animated.View style={skala ? { transform: [{ scale: skala }] } : null}>
        <Icon name={icon} sf={sf} size={18} color={aktiv ? farben.orange : "#FFFFFF"} weight="semibold" />
      </Animated.View>
      {text != null ? (
        <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 13.5, color: aktiv ? farben.orangeHell : "#FFFFFF", fontVariant: ["tabular-nums"] }}>
          {text}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Beim Doppeltippen: oranges Herz mit Ring, genau am Finger. */
function Funke({ x, y, onFertig }: { x: number; y: number; onFertig: () => void }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(onFertig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const G = 120;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x - G / 2, top: y - G / 2, width: G, height: G, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: G,
          height: G,
          borderRadius: G / 2,
          borderWidth: 3,
          borderColor: farben.orange,
          opacity: a.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.9, 0] }),
          transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.25] }) }],
        }}
      />
      <Animated.View
        style={{
          opacity: a.interpolate({ inputRange: [0, 0.12, 0.7, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { scale: a.interpolate({ inputRange: [0, 0.25, 0.45, 1], outputRange: [0.4, 1.15, 1, 0.9] }) },
            { translateY: a.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, -26] }) },
          ],
        }}
      >
        <Icon name="heart" size={64} color={farben.orange} />
      </Animated.View>
    </View>
  );
}

/** Fortschritt als orange Linie oben in der Karte – läuft flüssig mit. */
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
    <View pointerEvents="none" style={{ height: 3, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,0.14)", overflow: "hidden" }}>
      <Animated.View
        style={{
          width: breite,
          height: "100%",
          borderRadius: 1.5,
          backgroundColor: farben.orange,
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
  /** Platz unten für die schwebende Tab-Leiste. */
  unten: number;
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

const KARTE_RAND = 12;

function ClipSeiteInnen({ clip, hoehe, breite, unten, aktiv, spielen, stumm, eigen, onLike, onFolgen, onKommentare, onTeilen, onMehr }: Props) {
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
  const [funken, setFunken] = useState<{ id: number; x: number; y: number }[]>([]);
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
    likeSkala.setValue(0.6);
    Animated.spring(likeSkala, { toValue: 1, useNativeDriver: true, damping: 7, stiffness: 320, mass: 0.6 }).start();
  }

  function beiTipp(e: GestureResponderEvent) {
    const { locationX, locationY } = e.nativeEvent;
    const jetzt = Date.now();
    if (jetzt - letzterTipp.current < 280) {
      // Doppeltippen: Funke + Gefällt mir (nie wieder entliken)
      if (tippTimer.current) {
        clearTimeout(tippTimer.current);
        tippTimer.current = null;
      }
      letzterTipp.current = jetzt;
      stoss();
      setFunken((f) => [...f.slice(-3), { id: jetzt, x: locationX, y: locationY }]);
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
  const kartenBreite = breite - KARTE_RAND * 2;

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

      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.45)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 260 }} />

      {!bereit && aktiv && !fehler ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : null}

      {fehler ? (
        <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]} pointerEvents="box-none">
          <Glas style={{ alignItems: "center", gap: 10, paddingHorizontal: 22, paddingVertical: 18, borderRadius: 22 }}>
            <Icon name="alert-circle-outline" size={30} color="#FFFFFF" />
            <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#FFFFFF" }}>Video lädt gerade nicht</Text>
            <Pressable
              onPress={() => {
                tippen();
                player.replaceAsync(quelle).catch(() => {});
              }}
              style={{ paddingHorizontal: 16, height: 36, borderRadius: 18, backgroundColor: farben.orange, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ ...schrift.textHalb, fontSize: 14, color: "#FFFFFF" }}>Nochmal versuchen</Text>
            </Pressable>
          </Glas>
        </View>
      ) : null}

      {pausiert && aktiv ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
          <Glas pointerEvents="none" style={{ width: 78, height: 78, borderRadius: 39, alignItems: "center", justifyContent: "center" }}>
            <Icon name="play" sf="play.fill" size={34} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </Glas>
        </View>
      ) : null}

      {funken.map((f) => (
        <Funke key={f.id} x={f.x} y={f.y} onFertig={() => setFunken((alle) => alle.filter((x) => x.id !== f.id))} />
      ))}

      {/* Glas-Karte: Ersteller, Titel, Beschreibung, Aktionen */}
      <Glas klar style={{ position: "absolute", left: KARTE_RAND, right: KARTE_RAND, bottom: unten + 10, borderRadius: 26, padding: 14, gap: 10 }}>
        {aktiv ? <Fortschritt player={player} breite={kartenBreite - 28} /> : <View style={{ height: 3 }} />}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Avatar name={clip.autor_name || clip.autor_benutzername} groesse={36} farbe={clip.autor_farbe || farben.orange} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ ...schrift.textFett, fontSize: 15, color: "#FFFFFF" }}>
              {clip.autor_name || clip.autor_benutzername}
            </Text>
            <Text numberOfLines={1} style={{ ...schrift.textMittel, fontSize: 12.5, color: "rgba(255,255,255,0.7)" }}>
              @{clip.autor_benutzername}
            </Text>
          </View>
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
                height: 32,
                paddingHorizontal: 14,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: clip.folge_ich ? "rgba(255,255,255,0.12)" : farben.orange,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              {clip.folge_ich ? <Icon name="checkmark" size={13} color="#FFFFFF" weight="bold" /> : null}
              <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: "#FFFFFF" }}>{clip.folge_ich ? "Folge ich" : "Folgen"}</Text>
            </Pressable>
          )}
        </View>

        <View style={{ gap: 3 }}>
          <Text numberOfLines={2} style={{ ...schrift.textHalb, fontSize: 16, lineHeight: 21, color: "#FFFFFF" }}>
            {clip.titel}
          </Text>
          {clip.beschreibung ? (
            <Text numberOfLines={offen ? 8 : 1} onPress={() => setOffen((o) => !o)} suppressHighlighting style={{ ...schrift.text, fontSize: 14, lineHeight: 19, color: "rgba(255,255,255,0.78)" }}>
              {clip.beschreibung}
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Aktion
            icon="heart"
            sf={clip.gemocht ? "heart.fill" : "heart"}
            text={kurzeZahl(clip.likes)}
            aktiv={clip.gemocht}
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
            sf="bubble.left.and.bubble.right"
            text={kurzeZahl(clip.kommentare)}
            label="Kommentare"
            onPress={() => {
              tippen();
              onKommentare(clip);
            }}
          />
          <Aktion
            icon="share-outline"
            sf="square.and.arrow.up"
            text={clip.geteilt > 0 ? kurzeZahl(clip.geteilt) : "Teilen"}
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
      </Glas>
    </View>
  );
}

export const ClipSeite = memo(ClipSeiteInnen);
