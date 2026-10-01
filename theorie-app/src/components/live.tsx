import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, FlatList, Pressable, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Glas } from "@/components/glas";
import { Icon } from "@/components/icon";
import { NutzerBild } from "@/components/profilbild";
import { useFarbwelt } from "@/lib/darstellung";
import { tippen } from "@/lib/haptik";
import type { ChatNachricht, LiveInfo } from "@/lib/live";
import { leuchten, mitDeckkraft, schrift } from "@/lib/theme";

// Bausteine für den Live-Stream: rotes LIVE-Schild, Profilbild mit
// pulsierendem Ring, Kapsel in Clips, Karte auf Home, Chat, Herzen, Eingabe.

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

/** Kapsel oben in Clips: „Leon ist live“ – antippen öffnet das Live. */
export function LivePille({ live, onPress, style }: { live: LiveInfo; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const name = live.gastgeber?.name ?? "Fahrschul Pro";
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${name} ist live – zuschauen`}
      style={style}
    >
      {({ pressed }) => (
        <Glas interaktiv style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingLeft: 4, paddingRight: 12, height: 50, borderRadius: 25, opacity: pressed ? 0.85 : 1 }}>
          <LiveRing gastgeber={live.gastgeber} groesse={34} />
          <View style={{ maxWidth: 210 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <LiveSchild klein />
              <Text style={{ ...schrift.textFett, fontSize: 14, color: "#FFFFFF" }} numberOfLines={1}>
                {name} ist live
              </Text>
            </View>
            {live.titel ? (
              <Text style={{ ...schrift.textMittel, fontSize: 12, color: "rgba(255,255,255,0.72)", marginTop: 1 }} numberOfLines={1}>
                {live.titel}
              </Text>
            ) : null}
          </View>
          <Icon name="chevron-forward" sf="chevron.right" size={15} color="rgba(255,255,255,0.75)" weight="semibold" />
        </Glas>
      )}
    </Pressable>
  );
}

/** Karte auf Home, solange ein Live läuft. */
export function LiveBanner({ live, onPress, style }: { live: LiveInfo; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  const name = live.gastgeber?.name ?? "Fahrschul Pro";
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${name} ist live – zuschauen`}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}
    >
      <View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 12,
            paddingRight: 14,
            borderRadius: 22,
            overflow: "hidden",
            backgroundColor: f.hell ? "#FFFFFF" : "#170A0E",
            borderWidth: 1,
            borderColor: mitDeckkraft(LIVE_ROT, f.hell ? 0.28 : 0.45),
          },
          f.hell ? leuchten(LIVE_ROT, 0.16, 16, 4) : leuchten(LIVE_ROT, 0.3, 18, 2),
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[mitDeckkraft(LIVE_ROT, f.hell ? 0.08 : 0.22), mitDeckkraft(LIVE_ROT, 0)]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <LiveRing gastgeber={live.gastgeber} groesse={44} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <LiveSchild klein />
            <Text style={{ ...schrift.textFett, fontSize: 15.5, color: f.text, flexShrink: 1 }} numberOfLines={1}>
              {name} ist live
            </Text>
          </View>
          <Text style={{ ...schrift.text, fontSize: 13.5, color: f.text2 }} numberOfLines={1}>
            {live.titel || "Komm rein und stell deine Fragen!"}
          </Text>
        </View>
        <LinearGradient colors={LIVE_VERLAUF} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: "center" }}>
          <Text style={{ ...schrift.textFett, fontSize: 13.5, color: "#FFFFFF" }}>Zuschauen</Text>
        </LinearGradient>
      </View>
    </Pressable>
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

function ChatZeile({ n, gastgeber, onLangDruck }: { n: ChatNachricht; gastgeber: boolean; onLangDruck?: (n: ChatNachricht) => void }) {
  return (
    <Pressable onLongPress={onLangDruck ? () => onLangDruck(n) : undefined} delayLongPress={350} style={{ alignSelf: "flex-start", maxWidth: "100%" }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 6, paddingLeft: 6, paddingRight: 12, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.32)" }}>
        <NutzerBild pfad={n.bild_pfad} name={n.name} groesse={26} rand={gastgeber ? 1.5 : 0} />
        <View style={{ flexShrink: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={{ ...schrift.textFett, fontSize: 12.5, color: gastgeber ? "#FFB27A" : "rgba(255,255,255,0.72)" }} numberOfLines={1}>
              {n.name}
            </Text>
            {gastgeber ? (
              <View style={{ paddingHorizontal: 5, height: 15, borderRadius: 4, backgroundColor: LIVE_ROT, justifyContent: "center" }}>
                <Text style={{ ...schrift.textFett, fontSize: 9, letterSpacing: 0.5, color: "#FFFFFF" }}>GASTGEBER</Text>
              </View>
            ) : null}
          </View>
          <Text style={{ ...schrift.textMittel, fontSize: 14.5, lineHeight: 19, color: "#FFFFFF" }}>{n.text}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Chat über dem Video: neueste Nachricht unten, oben weich ausgeblendet. */
export function LiveChat({
  nachrichten,
  gastgeberId,
  onLangDruck,
  style,
}: {
  nachrichten: ChatNachricht[];
  gastgeberId: string | null | undefined;
  onLangDruck?: (n: ChatNachricht) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const daten = [...nachrichten].reverse();
  return (
    <View style={style}>
      <FlatList
        data={daten}
        inverted
        keyExtractor={(n) => String(n.id)}
        renderItem={({ item }) => <ChatZeile n={item} gastgeber={item.user_id === gastgeberId} onLangDruck={onLangDruck} />}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 4 }}
      />
      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 36 }} />
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
