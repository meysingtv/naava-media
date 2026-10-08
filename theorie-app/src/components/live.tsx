import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, TextInput, View, type NativeScrollEvent, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Glas } from "@/components/glas";
import { Icon } from "@/components/icon";
import { NutzerBild } from "@/components/profilbild";
import { tippen } from "@/lib/haptik";
import type { Angepinnt, ChatNachricht, LiveInfo } from "@/lib/live";
import { leuchten, schrift } from "@/lib/theme";

// Bausteine für den Live-Stream: rotes LIVE-Schild, Profilbild mit
// pulsierendem Ring, Zuschauerzahl, Chat (ohne Kästen, oben verblassend),
// Herzen und Eingabe.

export const LIVE_ROT = "#FF2D55";
const LIVE_VERLAUF = ["#FF5A5F", "#FF2D55", "#E0124A"] as const;

function usePuls(dauer = 1400) {
  const wert = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(wert, { toValue: 1, duration: dauer, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [wert, dauer]);
  return wert;
}

/** Rotes „LIVE“-Schild mit blinkendem Punkt. */
export function LiveSchild({ klein, style }: { klein?: boolean; style?: StyleProp<ViewStyle> }) {
  const puls = usePuls(1200);
  return (
    <View
      style={[
        { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: klein ? 6 : 8, height: klein ? 18 : 22, borderRadius: klein ? 5 : 6, backgroundColor: LIVE_ROT },
        style,
      ]}
    >
      <Animated.View
        style={{
          width: klein ? 5 : 6,
          height: klein ? 5 : 6,
          borderRadius: 3,
          backgroundColor: "#FFFFFF",
          opacity: puls.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.35, 1] }),
        }}
      />
      <Text style={{ ...schrift.textFett, fontSize: klein ? 10 : 11.5, letterSpacing: 0.9, color: "#FFFFFF" }}>LIVE</Text>
    </View>
  );
}

/** Profilbild des Gastgebers mit pulsierendem rotem Ring. */
export function LiveRing({ gastgeber, groesse = 40 }: { gastgeber: LiveInfo["gastgeber"]; groesse?: number }) {
  const puls = usePuls();
  const aussen = groesse + 8;
  return (
    <View style={{ width: aussen, height: aussen, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: aussen,
          height: aussen,
          borderRadius: aussen / 2,
          borderWidth: 2,
          borderColor: LIVE_ROT,
          opacity: puls.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }),
          transform: [{ scale: puls.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] }) }],
        }}
      />
      <View style={{ width: aussen, height: aussen, borderRadius: aussen / 2, borderWidth: 2, borderColor: LIVE_ROT, alignItems: "center", justifyContent: "center" }}>
        <NutzerBild pfad={gastgeber?.bild_pfad} name={gastgeber?.name ?? "Live"} farbe={gastgeber?.avatar_farbe} groesse={groesse} rand={0} />
      </View>
    </View>
  );
}

/** Zuschauerzahl mit Auge, z. B. „23“. */
export function ZuschauerZahl({ anzahl }: { anzahl: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 22, paddingHorizontal: 8, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.38)" }}>
      <Icon name="eye" sf="eye.fill" size={12} color="#FFFFFF" />
      <Text style={{ ...schrift.textFett, fontSize: 11.5, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{anzahl}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

/** Schatten statt Kasten: Text bleibt über hellem wie dunklem Video lesbar. */
const TEXT_SCHATTEN = { textShadowColor: "rgba(0,0,0,0.75)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 } as const;
/** Auf dieser Höhe am oberen Rand verblassen Nachrichten, statt hart abgeschnitten zu werden. */
const AUSBLENDEN = 64;

function ChatZeile({
  n,
  gastgeber,
  onLangDruck,
  scrollY,
  verblassen,
}: {
  n: ChatNachricht;
  gastgeber: boolean;
  onLangDruck?: (n: ChatNachricht) => void;
  scrollY: Animated.Value;
  verblassen: boolean;
}) {
  const [lage, setLage] = useState<{ y: number; h: number } | null>(null);
  // Je näher die Mitte der Nachricht am oberen Rand liegt, desto blasser – wie eine weiche Maske.
  const deckkraft = useMemo(() => {
    if (!verblassen || !lage) return 1;
    const mitte = lage.y + lage.h / 2;
    return scrollY.interpolate({ inputRange: [mitte - AUSBLENDEN, mitte], outputRange: [1, 0], extrapolate: "clamp" });
  }, [verblassen, lage, scrollY]);
  return (
    <Animated.View
      onLayout={(e) => {
        const { y, height } = e.nativeEvent.layout;
        setLage((alt) => (alt && alt.y === y && alt.h === height ? alt : { y, h: height }));
      }}
      style={{ opacity: deckkraft }}
    >
      <Pressable onLongPress={onLangDruck ? () => onLangDruck(n) : undefined} delayLongPress={350} style={{ flexDirection: "row", alignItems: "flex-start", gap: 9, alignSelf: "flex-start", maxWidth: "100%", paddingVertical: 3 }}>
        <NutzerBild pfad={n.bild_pfad} name={n.name} groesse={28} rand={gastgeber ? 1.5 : 0} />
        <View style={{ flexShrink: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={{ ...schrift.textFett, fontSize: 13, color: gastgeber ? "#FFB27A" : "rgba(255,255,255,0.8)", ...TEXT_SCHATTEN }} numberOfLines={1}>
              {n.name}
            </Text>
            {gastgeber ? (
              <View style={{ paddingHorizontal: 5, height: 15, borderRadius: 4, backgroundColor: LIVE_ROT, justifyContent: "center" }}>
                <Text style={{ ...schrift.textFett, fontSize: 9, letterSpacing: 0.5, color: "#FFFFFF" }}>GASTGEBER</Text>
              </View>
            ) : null}
          </View>
          <Text style={{ ...schrift.textHalb, fontSize: 15, lineHeight: 20, color: "#FFFFFF", ...TEXT_SCHATTEN }}>{n.text}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Vom Gastgeber angepinnte Nachricht oben über dem Chat – er kann sie lösen. */
export function AngepinntKarte({ n, onLoesen }: { n: Angepinnt; onLoesen?: () => void }) {
  return (
    <Glas klar style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 8, paddingLeft: 10, paddingRight: onLoesen ? 4 : 12, borderRadius: 16, alignSelf: "flex-start", maxWidth: "100%" }}>
      <Icon name="pin" sf="pin.fill" size={13} color="#FFB27A" />
      <NutzerBild pfad={n.bild_pfad} name={n.name} groesse={24} rand={0} />
      <View style={{ flexShrink: 1 }}>
        <Text style={{ ...schrift.textFett, fontSize: 12, color: "#FFB27A" }} numberOfLines={1}>
          {n.name} · angepinnt
        </Text>
        <Text style={{ ...schrift.textHalb, fontSize: 14, lineHeight: 19, color: "#FFFFFF" }} numberOfLines={3}>
          {n.text}
        </Text>
      </View>
      {onLoesen ? (
        <Pressable
          onPress={() => {
            tippen();
            onLoesen();
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Nicht mehr anpinnen"
          style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="close" sf="xmark" size={14} color="rgba(255,255,255,0.8)" weight="semibold" />
        </Pressable>
      ) : null}
    </Glas>
  );
}

/** Ist die Liste (fast) ganz unten? */
function ganzUnten({ contentOffset, contentSize, layoutMeasurement }: NativeScrollEvent): boolean {
  return contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
}

/** Chat über dem Video: neueste Nachricht unten, ältere verblassen oben. */
export function LiveChat({
  nachrichten,
  gastgeberId,
  onLangDruck,
  angepinnt,
  onLoesen,
  style,
}: {
  nachrichten: ChatNachricht[];
  gastgeberId: string | null | undefined;
  onLangDruck?: (n: ChatNachricht) => void;
  /** Angepinnte Nachricht oben (bleibt stehen, auch wenn der Chat weiterläuft). */
  angepinnt?: Angepinnt | null;
  /** Gastgeber: Anpinnen lösen. */
  onLoesen?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const liste = useRef<ScrollView>(null);
  // Läuft der Chat unten mit? Nur echtes Wischen ändert das – nicht, wenn der Chat kleiner wird.
  const amEnde = useRef(true);
  const wischt = useRef(false);
  const [sicht, setSicht] = useState(0);
  const [inhalt, setInhalt] = useState(0);
  // Nur wenn mehr da ist, als hineinpasst, verblasst der obere Rand.
  const verblassen = inhalt > sicht + 2;

  const beimScrollen = useMemo(
    () =>
      Animated.event<NativeScrollEvent>([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: (e) => {
          if (wischt.current) amEnde.current = ganzUnten(e.nativeEvent);
        },
      }),
    [scrollY],
  );

  return (
    <View style={style}>
      {angepinnt ? (
        <View style={{ marginBottom: 8 }}>
          <AngepinntKarte n={angepinnt} onLoesen={onLoesen} />
        </View>
      ) : null}
      <Animated.ScrollView
        ref={liste}
        style={{ flexGrow: 0 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={beimScrollen}
        onScrollBeginDrag={() => (wischt.current = true)}
        onScrollEndDrag={(e) => {
          amEnde.current = ganzUnten(e.nativeEvent);
          wischt.current = false;
        }}
        onMomentumScrollEnd={(e) => (amEnde.current = ganzUnten(e.nativeEvent))}
        onLayout={(e) => {
          setSicht(e.nativeEvent.layout.height);
          // Wird der Chat kleiner (z. B. wenn eine Quizkarte erscheint), bleibt die neueste Nachricht sichtbar.
          if (amEnde.current) requestAnimationFrame(() => liste.current?.scrollToEnd({ animated: false }));
        }}
        onContentSizeChange={(_, hoehe) => {
          setInhalt(hoehe);
          // Neue Nachricht: nach unten mitlaufen – außer man liest gerade weiter oben.
          if (amEnde.current) liste.current?.scrollToEnd({ animated: true });
        }}
        contentContainerStyle={{ gap: 5, paddingTop: 2 }}
      >
        {nachrichten.map((n) => (
          <ChatZeile key={n.id} n={n} gastgeber={n.user_id === gastgeberId} onLangDruck={onLangDruck} scrollY={scrollY} verblassen={verblassen} />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Herzen, die nach oben schweben
// ---------------------------------------------------------------------------

type Herz = { id: number; wert: Animated.Value; drift: number; farbe: string; groesse: number };
const HERZ_FARBEN = ["#FF2D55", "#FF5A5F", "#FC5B0E", "#FF8A2A", "#FF4F8B"];

/** Herzen auslösen (eigene und die von anderen) – `herzen` irgendwo über die Herz-Taste legen. */
export function useHerzen(): { ausloesen: () => void; herzen: ReactNode } {
  const [liste, setListe] = useState<Herz[]>([]);
  const naechste = useRef(1);
  const ausloesen = useCallback(() => {
    const h: Herz = {
      id: naechste.current++,
      wert: new Animated.Value(0),
      drift: (Math.random() - 0.5) * 70,
      farbe: HERZ_FARBEN[Math.floor(Math.random() * HERZ_FARBEN.length)],
      groesse: 22 + Math.round(Math.random() * 10),
    };
    setListe((alt) => [...alt.slice(-18), h]);
    Animated.timing(h.wert, { toValue: 1, duration: 1900 + Math.random() * 700, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() =>
      setListe((alt) => alt.filter((x) => x.id !== h.id)),
    );
  }, []);
  const herzen = (
    <View pointerEvents="none" style={{ position: "absolute", right: 0, bottom: 0, width: 60, height: 300 }}>
      {liste.map((h) => (
        <Animated.View
          key={h.id}
          style={{
            position: "absolute",
            bottom: 0,
            right: 30 - h.groesse / 2,
            opacity: h.wert.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 0.9, 0] }),
            transform: [
              { translateY: h.wert.interpolate({ inputRange: [0, 1], outputRange: [0, -280] }) },
              { translateX: h.wert.interpolate({ inputRange: [0, 0.35, 0.7, 1], outputRange: [0, h.drift * 0.6, -h.drift * 0.3, h.drift] }) },
              { scale: h.wert.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.4, 1.1, 0.85] }) },
            ],
          }}
        >
          <Icon name="heart" sf="heart.fill" size={h.groesse} color={h.farbe} />
        </Animated.View>
      ))}
    </View>
  );
  return { ausloesen, herzen };
}

// ---------------------------------------------------------------------------
// Eingabe unten: Text + Herz
// ---------------------------------------------------------------------------

export function LiveEingabe({
  angemeldet,
  onSenden,
  onHerz,
  onAnmelden,
  herzen,
}: {
  angemeldet: boolean;
  onSenden: (text: string) => Promise<boolean>;
  onHerz: () => void;
  onAnmelden: () => void;
  herzen?: ReactNode;
}) {
  const [text, setText] = useState("");
  const [sendet, setSendet] = useState(false);

  async function senden() {
    const t = text.trim();
    if (!t || sendet) return;
    setSendet(true);
    const ok = await onSenden(t);
    setSendet(false);
    if (ok) setText("");
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {angemeldet ? (
        <Glas style={{ flex: 1, height: 46, borderRadius: 23, flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 5 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Schreib etwas …"
            placeholderTextColor="rgba(255,255,255,0.6)"
            maxLength={200}
            returnKeyType="send"
            onSubmitEditing={senden}
            blurOnSubmit={false}
            style={{ flex: 1, height: 46, color: "#FFFFFF", ...schrift.textMittel, fontSize: 15 }}
          />
          {text.trim() ? (
            <Pressable onPress={senden} disabled={sendet} accessibilityRole="button" accessibilityLabel="Senden" hitSlop={6}>
              <LinearGradient colors={LIVE_VERLAUF} style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", opacity: sendet ? 0.5 : 1 }}>
                <Icon name="arrow-up" sf="arrow.up" size={18} color="#FFFFFF" weight="bold" />
              </LinearGradient>
            </Pressable>
          ) : null}
        </Glas>
      ) : (
        <Pressable onPress={onAnmelden} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel="Zum Mitschreiben anmelden">
          <Glas style={{ height: 46, borderRadius: 23, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 8 }}>
            <Icon name="chatbubble-ellipses-outline" sf="bubble.left" size={17} color="rgba(255,255,255,0.75)" />
            <Text style={{ ...schrift.textMittel, fontSize: 14.5, color: "rgba(255,255,255,0.75)" }}>Zum Mitschreiben anmelden</Text>
          </Glas>
        </Pressable>
      )}
      <View>
        {herzen}
        <Pressable
          onPress={() => {
            tippen();
            onHerz();
          }}
          accessibilityRole="button"
          accessibilityLabel="Herz schicken"
          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.88 : 1 }] }, leuchten(LIVE_ROT, 0.45, 12, 2)]}
        >
          <LinearGradient colors={LIVE_VERLAUF} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" }}>
            <Icon name="heart" sf="heart.fill" size={22} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}
