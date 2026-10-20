import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, FlatList, Pressable, Text, View, type ViewToken } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ClipSeite } from "@/components/clip-seite";
import { Glas } from "@/components/glas";
import { Icon } from "@/components/icon";
import { KommentarBlatt } from "@/components/kommentar-blatt";
import { Lader } from "@/components/lader";
import { zurueck } from "@/components/ui";
import { useClipAktionen } from "@/lib/clip-aktionen";
import { clipsVonLaden, type ClipEintrag } from "@/lib/clips-server";
import { tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { schrift } from "@/lib/theme";

const SICHTBAR = { itemVisiblePercentThreshold: 70 };

/** Clips einer Person im Vollbild – geöffnet aus ihrem Profil, startet beim angetippten Clip. */
export default function ClipAnsicht() {
  const { nutzer, start } = useLocalSearchParams<{ nutzer: string; start?: string }>();
  const insets = useSafeAreaInsets();
  const fokus = useIsFocused();
  const { session } = useKonto();
  const ich = session?.user.id ?? null;
  const [eintraege, setEintraege] = useState<ClipEintrag[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [aktivId, setAktivId] = useState<string | null>(start ?? null);
  const [stumm, setStumm] = useState(false);
  const [vordergrund, setVordergrund] = useState(AppState.currentState === "active");
  const [kommentarId, setKommentarId] = useState<string | null>(null);
  const [masse, setMasse] = useState<{ breite: number; hoehe: number } | null>(null);

  useEffect(() => {
    if (!nutzer) return;
    clipsVonLaden(nutzer)
      .then(setEintraege)
      .catch((e: Error) => setFehler(e.message));
  }, [nutzer]);

  useEffect(() => {
    const abo = AppState.addEventListener("change", (s) => setVordergrund(s === "active"));
    return () => abo.remove();
  }, []);

  const aktionen = useClipAktionen({
    aendern: (id, teil) => setEintraege((l) => (l ? l.map((c) => (c.id === id ? { ...c, ...teil(c) } : c)) : l)),
    folgenGesetzt: (autor, wert) => setEintraege((l) => (l ? l.map((c) => (c.autor === autor ? { ...c, folge_ich: wert } : c)) : l)),
    entfernt: (id) => setEintraege((l) => (l ? l.filter((c) => c.id !== id) : l)),
  });
  // Tippen auf den Namen führt zurück ins Profil, aus dem man kommt.
  const zumProfil = useCallback(() => zurueck(), []);
  const onKommentare = useCallback((clip: ClipEintrag) => setKommentarId(clip.id), []);

  const sichtbarGeaendert = useRef(({ viewableItems }: { viewableItems: ViewToken<ClipEintrag>[] }) => {
    const erstes = viewableItems.find((v) => v.isViewable);
    if (erstes?.item) setAktivId(erstes.item.id);
  }).current;

  const liste = eintraege ?? [];
  const aktiv = aktivId ?? liste[0]?.id ?? null;
  const spielen = fokus && vordergrund;
  const unten = insets.bottom + 6;

  // Startposition nur einmal bestimmen, sobald die Clips da sind.
  const startIndex = useMemo(() => {
    const i = liste.findIndex((c) => c.id === start);
    return i > 0 ? i : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eintraege == null]);

  const renderItem = useCallback(
    ({ item }: { item: ClipEintrag }) =>
      masse ? (
        <ClipSeite
          clip={item}
          hoehe={masse.hoehe}
          breite={masse.breite}
          unten={unten}
          aktiv={item.id === aktiv}
          spielen={spielen}
          stumm={stumm}
          eigen={item.autor === ich}
          onLike={aktionen.onLike}
          onFolgen={aktionen.onFolgen}
          onKommentare={onKommentare}
          onTeilen={aktionen.onTeilen}
          onMehr={aktionen.onMehr}
          onProfil={zumProfil}
        />
      ) : null,
    [masse, unten, aktiv, spielen, stumm, ich, aktionen, onKommentare, zumProfil],
  );

  const kommentarClip = kommentarId ? (liste.find((c) => c.id === kommentarId) ?? null) : null;

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <View style={{ flex: 1 }} onLayout={(e) => setMasse({ breite: e.nativeEvent.layout.width, hoehe: e.nativeEvent.layout.height })}>
        {eintraege == null ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
            {fehler ? <Text style={{ ...schrift.text, fontSize: 15, color: "#AEB3BA", textAlign: "center" }}>{fehler}</Text> : <Lader color="#FFFFFF" />}
          </View>
        ) : liste.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ ...schrift.textHalb, fontSize: 16, color: "#FFFFFF" }}>Keine Clips mehr da</Text>
          </View>
        ) : masse ? (
          <FlatList
            data={liste}
            keyExtractor={(c) => c.id}
            renderItem={renderItem}
            pagingEnabled
            decelerationRate="fast"
            disableIntervalMomentum
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, i) => ({ length: masse.hoehe, offset: masse.hoehe * i, index: i })}
            initialScrollIndex={startIndex < liste.length ? startIndex : 0}
            windowSize={3}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            removeClippedSubviews={false}
            onViewableItemsChanged={sichtbarGeaendert}
            viewabilityConfig={SICHTBAR}
          />
        ) : null}
      </View>

      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.42)", "rgba(0,0,0,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 90 }} />
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", top: insets.top + 4, left: 0, right: 0, height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 }}
      >
        {[
          { icon: "chevron-back" as const, sf: "chevron.backward" as const, label: "Zurück", onPress: () => router.back() },
          {
            icon: stumm ? ("volume-mute" as const) : ("volume-high" as const),
            sf: stumm ? ("speaker.slash.fill" as const) : ("speaker.wave.2.fill" as const),
            label: stumm ? "Ton an" : "Ton aus",
            onPress: () => setStumm((s) => !s),
          },
        ].map((t) => (
          <Pressable
            key={t.label}
            onPress={() => {
              tippen();
              t.onPress();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t.label}
          >
            <Glas interaktiv style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
              <Icon name={t.icon} sf={t.sf} size={18} color="#FFFFFF" weight="semibold" />
            </Glas>
          </Pressable>
        ))}
      </View>

      <KommentarBlatt
        clip={kommentarClip}
        angemeldet={Boolean(ich)}
        onSchliessen={() => setKommentarId(null)}
        onAnzahl={(id, n) => setEintraege((l) => (l ? l.map((c) => (c.id === id ? { ...c, kommentare: Math.max(0, c.kommentare + n) } : c)) : l))}
        onAnmelden={() => {
          setKommentarId(null);
          router.push("/anmelden");
        }}
      />
    </View>
  );
}
