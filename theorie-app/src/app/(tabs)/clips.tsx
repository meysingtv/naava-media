import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, FlatList, Pressable, Share, useWindowDimensions, View, type ViewToken } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip, Knopf, Plakette, T } from "@/components/ui";
import { ClipBild } from "@/components/clip-bild";
import { CLIPS, type Clip } from "@/lib/clips";
import { stoss, tippen } from "@/lib/haptik";
import { useStand } from "@/lib/stand";
import { abstand, farben, RAND, schrift } from "@/lib/theme";

const SICHTBAR_AB = { itemVisiblePercentThreshold: 60 };

function Punkt({ text, index, aktiv }: { text: string; index: number; aktiv: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    a.setValue(0);
    if (!aktiv) return;
    const anim = Animated.timing(a, { toValue: 1, duration: 380, delay: 250 + index * 220, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [aktiv, index, a]);
  return (
    <Animated.View
      style={{
        flexDirection: "row",
        gap: abstand(3),
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: farben.orangeSoft, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
        <T v="klein" farbe={farben.orange} style={{ fontFamily: schrift.textFett, fontSize: 12 }}>
          {index + 1}
        </T>
      </View>
      <T v="text" style={{ flex: 1, color: farben.text }}>
        {text}
      </T>
    </Animated.View>
  );
}

function Aktion({ icon, aktiv, farbe, text, onPress, label }: { icon: keyof typeof Ionicons.glyphMap; aktiv?: boolean; farbe?: string; text?: string; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        minWidth: 46,
        height: 46,
        paddingHorizontal: text ? abstand(3) : 0,
        borderRadius: 23,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        backgroundColor: aktiv ? (farbe ?? farben.orange) + "22" : farben.flaeche2,
        borderWidth: 1,
        borderColor: aktiv ? (farbe ?? farben.orange) + "66" : farben.linie,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={aktiv ? farbe ?? farben.orange : farben.text2} />
      {text ? (
        <T v="klein" farbe={aktiv ? farbe ?? farben.orange : farben.text2} style={{ fontFamily: schrift.textHalb, fontVariant: ["tabular-nums"] }}>
          {text}
        </T>
      ) : null}
    </Pressable>
  );
}

function ClipKarte({ clip, index, anzahl, hoehe, aktiv }: { clip: Clip; index: number; anzahl: number; hoehe: number; aktiv: boolean }) {
  const { width } = useWindowDimensions();
  const { stand, clipUmschalten } = useStand();
  const breite = width - RAND * 2;
  const gemocht = stand.clips.gemocht.includes(clip.id);
  const gemerkt = stand.clips.gemerkt.includes(clip.id);
  const letzterTipp = useRef(0);
  const herz = useRef(new Animated.Value(0)).current;

  function doppeltippen() {
    const jetzt = Date.now();
    if (jetzt - letzterTipp.current < 300) {
      if (!gemocht) clipUmschalten(clip.id, "gemocht");
      stoss();
      herz.setValue(0);
      Animated.sequence([
        Animated.spring(herz, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 200 }),
        Animated.timing(herz, { toValue: 2, duration: 350, delay: 250, useNativeDriver: true }),
      ]).start();
    }
    letzterTipp.current = jetzt;
  }

  return (
    <View style={{ height: hoehe, paddingHorizontal: RAND, paddingBottom: abstand(4) }}>
      <View style={{ flex: 1, borderRadius: 26, overflow: "hidden", backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
        <Pressable onPress={doppeltippen}>
          <ClipBild bild={clip.bild} breite={breite} aktiv={aktiv} />
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              alignSelf: "center",
              top: "35%",
              opacity: herz.interpolate({ inputRange: [0, 0.3, 1, 2], outputRange: [0, 1, 1, 0] }),
              transform: [{ scale: herz.interpolate({ inputRange: [0, 1, 2], outputRange: [0.4, 1, 1.25] }) }],
            }}
          >
            <Ionicons name="heart" size={84} color={farben.orange} />
          </Animated.View>
        </Pressable>

        <View style={{ flex: 1, padding: abstand(5), paddingTop: abstand(4), gap: abstand(3) }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Chip text={clip.kategorie} farbe={farben.orange} />
            <T v="klein" style={{ fontVariant: ["tabular-nums"] }}>
              {index + 1} / {anzahl}
            </T>
          </View>
          <T v="titel" style={{ fontSize: 23, lineHeight: 28 }}>
            {clip.titel}
          </T>
          <View style={{ gap: abstand(2.5) }}>
            {clip.punkte.map((p, j) => (
              <Punkt key={j} text={p} index={j} aktiv={aktiv} />
            ))}
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(2) }}>
            <Knopf titel="Üben" klein icon="arrow-forward" onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: clip.thema } })} style={{ flex: 1 }} />
            <Aktion icon={gemocht ? "heart" : "heart-outline"} aktiv={gemocht} text={String(clip.basis + (gemocht ? 1 : 0))} onPress={() => clipUmschalten(clip.id, "gemocht")} label="Gefällt mir" />
            <Aktion icon={gemerkt ? "bookmark" : "bookmark-outline"} aktiv={gemerkt} farbe={farben.blau} onPress={() => clipUmschalten(clip.id, "gemerkt")} label="Merken" />
            <Aktion
              icon="share-outline"
              onPress={() => Share.share({ message: `${clip.titel}\n\n• ${clip.punkte.join("\n• ")}\n\nAus der Theorie-App Spur` }).catch(() => {})}
              label="Teilen"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

export default function Clips() {
  const insets = useSafeAreaInsets();
  const { stand } = useStand();
  const [ansicht, setAnsicht] = useState<"alle" | "gemerkt">("alle");
  const [hoehe, setHoehe] = useState(0);
  const [aktiv, setAktiv] = useState(0);
  const { start } = useLocalSearchParams<{ start?: string }>();
  const listeRef = useRef<FlatList<Clip>>(null);
  const liste = ansicht === "alle" ? CLIPS : CLIPS.filter((c) => stand.clips.gemerkt.includes(c.id));

  // Aus dem Profil: direkt zu einem gemerkten Clip springen.
  useEffect(() => {
    if (!start || hoehe === 0) return;
    const index = CLIPS.findIndex((c) => c.id === start);
    if (index < 0) return;
    setAnsicht("alle");
    setAktiv(index);
    requestAnimationFrame(() => listeRef.current?.scrollToIndex({ index, animated: false }));
  }, [start, hoehe]);

  const sichtbar = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const erstes = viewableItems.find((v) => v.isViewable);
    if (erstes?.index != null) setAktiv(erstes.index);
  }).current;

  const wechsel = useCallback((a: "alle" | "gemerkt") => {
    setAnsicht(a);
    setAktiv(0);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund, paddingTop: insets.top + abstand(2) }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: RAND, paddingBottom: abstand(3) }}>
        <View>
          <T v="titel">Clips</T>
          <T v="klein">Kurz erklärt – wisch nach oben</T>
        </View>
        <View style={{ flexDirection: "row", gap: abstand(2) }}>
          <Chip text="Für dich" aktiv={ansicht === "alle"} onPress={() => wechsel("alle")} />
          <Chip text={String(stand.clips.gemerkt.length)} icon="bookmark" aktiv={ansicht === "gemerkt"} onPress={() => wechsel("gemerkt")} />
        </View>
      </View>

      <View style={{ flex: 1 }} onLayout={(e) => setHoehe(e.nativeEvent.layout.height)}>
        {liste.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: RAND * 2, gap: abstand(4) }}>
            <Plakette icon="bookmark-outline" farbe={farben.blau} groesse={60} />
            <T v="h2" zentriert>
              Noch nichts gemerkt
            </T>
            <T v="text" zentriert>
              Tippe bei einem Clip auf das Lesezeichen – dann findest du ihn hier wieder.
            </T>
          </View>
        ) : hoehe > 0 ? (
          <FlatList
            ref={listeRef}
            key={ansicht}
            data={liste}
            keyExtractor={(c) => c.id}
            renderItem={({ item, index }) => <ClipKarte clip={item} index={index} anzahl={liste.length} hoehe={hoehe} aktiv={index === aktiv} />}
            pagingEnabled
            snapToInterval={hoehe}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={sichtbar}
            viewabilityConfig={SICHTBAR_AB}
            getItemLayout={(_, index) => ({ length: hoehe, offset: hoehe * index, index })}
            windowSize={3}
          />
        ) : null}
      </View>
    </View>
  );
}
