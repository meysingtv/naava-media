import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, AppState, FlatList, Image, Pressable, RefreshControl, Text, useWindowDimensions, View, type ImageSourcePropType, type ViewToken } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useNavigation } from "expo-router";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AufklappMenue } from "@/components/aufklapp-menue";
import { dialog } from "@/components/dialog";
import { ClipSeite } from "@/components/clip-seite";
import { Icon, type IconName } from "@/components/icon";
import { ClipsGrund, ClipsHinweis, ClipsKnopf, CLIPS_BILD } from "@/components/clips-grund";
import { clipsVideoSetzen } from "@/components/lila-leiste";
import { lilaSchrift, useLila } from "@/components/lila-teile";
import { KommentarBlatt } from "@/components/kommentar-blatt";
import { Lader } from "@/components/lader";
import { LIVE_ROT } from "@/components/live";
import { LiveAnsicht } from "@/components/live-ansicht";
import { LiveFeed } from "@/components/live-feed";
import { useLeistenHoehe } from "@/components/tab-leiste";
import { useClipAktionen } from "@/lib/clip-aktionen";
import { useBlockiert } from "@/lib/blockieren";
import { beiNeuenClips, feedLaden, useClipRechte, type ClipEintrag, type FeedArt } from "@/lib/clips-server";
import { useDarfLive } from "@/lib/creator";
import { tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { istTablet, useDesktop } from "@/lib/fenster";
import { ClipsWeb } from "@/components/web/clips-web";
import { useLive } from "@/lib/live";
import { serverVerbunden } from "@/lib/supabase";
import { farben } from "@/lib/theme";

type Feed = { eintraege: ClipEintrag[]; laedt: boolean; mehr: boolean; fehler: string | null; geladen: boolean };

const LEER: Feed = { eintraege: [], laedt: false, mehr: true, fehler: null, geladen: false };
const SEITE = 8;
const SICHTBAR = { itemVisiblePercentThreshold: 70 };
/** Höhe von Titelzeile und Umschalter oben. */
const KOPF = 128;

type Kategorie = FeedArt | "live";

/** Roter Punkt, der langsam pulsiert – „gerade live“. */
function LivePunkt() {
  const puls = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([Animated.timing(puls, { toValue: 1, duration: 700, useNativeDriver: true }), Animated.timing(puls, { toValue: 0, duration: 700, useNativeDriver: true })]));
    a.start();
    return () => a.stop();
  }, [puls]);
  return <Animated.View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: LIVE_ROT, opacity: puls.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) }} />;
}

/** Umschalter „Live / Entdecken / Folge ich“: weiße Leiste über die ganze Breite, die Wahl lila gefüllt. Läuft ein Live, pulsiert ein roter Punkt. */
function Umschalter({ wert, live, onWechsel }: { wert: Kategorie; live: boolean; onWechsel: (k: Kategorie) => void }) {
  const l = useLila();
  const optionen: { id: Kategorie; titel: string; icon: IconName }[] = [
    { id: "live", titel: "Live", icon: "radio-outline" },
    { id: "entdecken", titel: "Entdecken", icon: "compass-outline" },
    { id: "folge_ich", titel: "Folge ich", icon: "people-outline" },
  ];
  return (
    <View style={{ flexDirection: "row", padding: 5, borderRadius: 20, gap: 4, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: l.linie, shadowColor: "#6A3FE6", shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}>
      {optionen.map((o) => {
        const aktiv = o.id === wert;
        return (
          <Pressable
            key={o.id}
            onPress={() => {
              if (aktiv) return;
              tippen();
              onWechsel(o.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktiv }}
            accessibilityLabel={o.id === "live" && live ? "Live – gerade läuft ein Live" : o.titel}
            style={{ flex: 1, height: 42, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: aktiv ? "#8A5FFF" : "transparent" }}
          >
            <Icon name={o.icon} size={19} color={aktiv ? "#FFFFFF" : l.tinte} />
            <Text style={{ ...lilaSchrift.textHalb, fontSize: 15, color: aktiv ? "#FFFFFF" : l.tinte }} numberOfLines={1}>
              {o.titel}
            </Text>
            {o.id === "live" && live && !aktiv ? <LivePunkt /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Runder Knopf oben (Plus, Ton) – als Bild. */
function BildTaste({ bild, label, onPress, durchgestrichen }: { bild: ImageSourcePropType; label: string; onPress: () => void; durchgestrichen?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", shadowColor: "#6A3FE6", shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, transform: [{ scale: pressed ? 0.92 : 1 }] })}
    >
      <Image source={bild} style={{ width: 40, height: 40 }} resizeMode="contain" />
      {durchgestrichen ? <View pointerEvents="none" style={{ position: "absolute", left: 12, top: 22, width: 24, height: 3.5, borderRadius: 2, backgroundColor: "#4B2E9E", transform: [{ rotate: "-45deg" }] }} /> : null}
    </Pressable>
  );
}

export default function Clips() {
  const fensterHoehe = useWindowDimensions().height;
  const sicher = useSafeAreaInsets();
  // iPad: dort sitzt die Tab-Leiste von iOS oben – die Kopfzeile rückt darunter.
  const insets = istTablet ? { ...sicher, top: sicher.top + 62 } : sicher;
  const leiste = useLeistenHoehe();
  const fokus = useIsFocused();
  const navigation = useNavigation<BottomTabNavigationProp<Record<string, undefined>>>();
  const { session } = useKonto();
  const rechte = useClipRechte();
  const liveRechte = useDarfLive();
  const { alle } = useLive();
  const ich = session?.user.id ?? null;
  // Im Browser am PC: eigene Fassung mit Video in der Mitte (web/clips-web.tsx).
  const desktop = useDesktop();

  const [art, setArt] = useState<FeedArt>("entdecken");
  const [liveAn, setLiveAn] = useState(false);
  const [feeds, setFeeds] = useState<Record<FeedArt, Feed>>({ entdecken: LEER, folge_ich: LEER });
  const [aktivProFeed, setAktivProFeed] = useState<Record<FeedArt, string | null>>({ entdecken: null, folge_ich: null });
  const [stumm, setStumm] = useState(false);
  const [vordergrund, setVordergrund] = useState(AppState.currentState === "active");
  const [kommentarId, setKommentarId] = useState<string | null>(null);
  const [masse, setMasse] = useState<{ breite: number; hoehe: number } | null>(null);
  const [aktualisiert, setAktualisiert] = useState(false);
  const [menueOffen, setMenueOffen] = useState(false);

  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;
  const ichRef = useRef(ich);
  ichRef.current = ich;
  const artRef = useRef(art);
  artRef.current = art;
  const laeuft = useRef<Record<FeedArt, boolean>>({ entdecken: false, folge_ich: false });
  // Zählt hoch, wenn die Feeds verworfen werden – späte Antworten werden dann ignoriert.
  const generation = useRef<Record<FeedArt, number>>({ entdecken: 0, folge_ich: 0 });
  const liste = useRef<FlatList<ClipEintrag>>(null);

  // Clips von blockierten Personen nur in der Anzeige weglassen – geladen wird
  // ungefiltert, damit das Weiterblättern stimmt.
  const blockiert = useBlockiert();
  const roh = feeds[art];
  const feed = useMemo(() => (blockiert.size ? { ...roh, eintraege: roh.eintraege.filter((c) => !blockiert.has(c.autor)) } : roh), [roh, blockiert]);
  const aktivId = aktivProFeed[art] ?? feed.eintraege[0]?.id ?? null;
  const spielen = fokus && vordergrund && !liveAn;

  // Ein laufendes Live öffnet sich im Vollbild (ohne Tab-Leiste, Kopfzeile ganz
  // oben). Kommt man – z. B. wegen des roten Punkts unten – nach Clips, während
  // ein Live läuft, passiert das einmal pro Live von selbst. Laufen zwei Lives,
  // kommt stattdessen der Bereich „Live“ zum Durchscrollen.
  const alleRef = useRef(alle);
  alleRef.current = alle;
  const liveKennung = alle.map((l) => l.id).join(",");
  const warFokus = useRef(false);
  const liveGezeigt = useRef<string | null>(null);
  useEffect(() => {
    const neuImFokus = fokus && !warFokus.current;
    warFokus.current = fokus;
    if (!neuImFokus || !liveKennung || liveGezeigt.current === liveKennung) return;
    liveGezeigt.current = liveKennung;
    const lives = alleRef.current;
    if (lives.length === 1) router.push({ pathname: "/live", params: { id: lives[0].id } });
    else setLiveAn(true);
  }, [fokus, liveKennung]);

  // Startet ein Live, während man im leeren „Live“-Bereich wartet: direkt ins Vollbild.
  useEffect(() => {
    if (!liveAn || alle.length !== 1 || !fokus || liveGezeigt.current === liveKennung) return;
    liveGezeigt.current = liveKennung;
    setLiveAn(false);
    router.push({ pathname: "/live", params: { id: alle[0].id } });
  }, [liveAn, alle, liveKennung, fokus]);

  // ------------------------------------------------------------------ Laden
  const laden = useCallback(async (welche: FeedArt, neu: boolean) => {
    const f = feedsRef.current[welche];
    if (laeuft.current[welche] || (!neu && (!f.mehr || f.eintraege.length === 0))) return;
    if (welche === "folge_ich" && !ichRef.current) {
      setFeeds((alt) => ({ ...alt, folge_ich: { ...LEER, geladen: true, mehr: false } }));
      return;
    }
    const gen = generation.current[welche];
    laeuft.current[welche] = true;
    setFeeds((alt) => ({ ...alt, [welche]: { ...alt[welche], laedt: true, fehler: null } }));
    try {
      const vor = neu ? null : (f.eintraege[f.eintraege.length - 1]?.erstellt_am ?? null);
      const neue = await feedLaden(welche, vor, SEITE);
      if (gen !== generation.current[welche]) return;
      setFeeds((alt) => {
        const bisher = neu ? [] : alt[welche].eintraege;
        const da = new Set(bisher.map((c) => c.id));
        return { ...alt, [welche]: { eintraege: [...bisher, ...neue.filter((c) => !da.has(c.id))], laedt: false, mehr: neue.length === SEITE, fehler: null, geladen: true } };
      });
    } catch (e) {
      if (gen !== generation.current[welche]) return;
      setFeeds((alt) => ({ ...alt, [welche]: { ...alt[welche], laedt: false, fehler: (e as Error).message, geladen: true } }));
    } finally {
      if (gen === generation.current[welche]) laeuft.current[welche] = false;
    }
  }, []);

  const verwerfen = useCallback(() => {
    generation.current = { entdecken: generation.current.entdecken + 1, folge_ich: generation.current.folge_ich + 1 };
    laeuft.current = { entdecken: false, folge_ich: false };
    setFeeds({ entdecken: LEER, folge_ich: LEER });
    setAktivProFeed({ entdecken: null, folge_ich: null });
  }, []);

  useEffect(() => {
    if (serverVerbunden && !feed.geladen && !feed.laedt) laden(art, true);
  }, [art, feed.geladen, feed.laedt, laden]);

  // Anmelden/Abmelden ändert „gefällt mir“ und „folge ich“ → neu laden.
  const ersterNutzer = useRef(ich);
  useEffect(() => {
    if (ersterNutzer.current === ich) return;
    ersterNutzer.current = ich;
    verwerfen();
  }, [ich, verwerfen]);

  // Neuer Clip hochgeladen → frisch laden.
  useEffect(() => beiNeuenClips(verwerfen), [verwerfen]);

  useEffect(() => {
    const abo = AppState.addEventListener("change", (s) => setVordergrund(s === "active"));
    return () => abo.remove();
  }, []);

  // Nochmal auf „Clips“ tippen: nach oben und neu laden – wie bei TikTok.
  useEffect(() => {
    const aus = navigation.addListener("tabPress", () => {
      if (!fokus) return;
      liste.current?.scrollToOffset({ offset: 0, animated: true });
      laden(artRef.current, true);
    });
    return aus;
  }, [navigation, fokus, laden]);

  const neuLaden = useCallback(async () => {
    setAktualisiert(true);
    await laden(artRef.current, true);
    setAktualisiert(false);
  }, [laden]);

  // ------------------------------------------------------------ Änderungen
  const eintragAendern = useCallback((id: string, teil: (c: ClipEintrag) => Partial<ClipEintrag>) => {
    setFeeds((alt) => ({
      entdecken: { ...alt.entdecken, eintraege: alt.entdecken.eintraege.map((c) => (c.id === id ? { ...c, ...teil(c) } : c)) },
      folge_ich: { ...alt.folge_ich, eintraege: alt.folge_ich.eintraege.map((c) => (c.id === id ? { ...c, ...teil(c) } : c)) },
    }));
  }, []);

  const aktionen = useClipAktionen({
    aendern: eintragAendern,
    folgenGesetzt: (autor, wert) => {
      if (artRef.current !== "folge_ich") {
        // „Folge ich“ wird beim nächsten Öffnen frisch geladen
        generation.current = { ...generation.current, folge_ich: generation.current.folge_ich + 1 };
        laeuft.current.folge_ich = false;
      }
      setFeeds((alt) => ({
        entdecken: { ...alt.entdecken, eintraege: alt.entdecken.eintraege.map((c) => (c.autor === autor ? { ...c, folge_ich: wert } : c)) },
        folge_ich:
          artRef.current === "folge_ich" ? { ...alt.folge_ich, eintraege: alt.folge_ich.eintraege.map((c) => (c.autor === autor ? { ...c, folge_ich: wert } : c)) } : LEER,
      }));
    },
    entfernt: (id) =>
      setFeeds((alt) => ({
        entdecken: { ...alt.entdecken, eintraege: alt.entdecken.eintraege.filter((c) => c.id !== id) },
        folge_ich: { ...alt.folge_ich, eintraege: alt.folge_ich.eintraege.filter((c) => c.id !== id) },
      })),
  });

  const onKommentare = useCallback((clip: ClipEintrag) => setKommentarId(clip.id), []);

  // „+“: Clip hochladen – wer live gehen darf, wählt zwischen Live und Clip. Der
  // Inhaber darf das immer (auch neben einem Creator-Live), Creator nur, wenn
  // gerade niemand live ist.
  const darfLiveJetzt = liveRechte.inhaber || (liveRechte.creator && alle.length === 0);
  function erstellen() {
    if (!darfLiveJetzt) router.push("/clip-hochladen");
    else if (!rechte.ersteller) router.push("/live-senden");
    else setMenueOffen(true);
  }

  const wechseln = useCallback((neu: Kategorie) => {
    tippen();
    setKommentarId(null);
    if (neu === "live") {
      // Ein Live: Vollbild. Zwei: zum Durchscrollen. Keins: der Hinweis (Mitteilung an, „Live gehen“).
      const lives = alleRef.current;
      if (lives.length === 1) router.push({ pathname: "/live", params: { id: lives[0].id } });
      else setLiveAn(true);
      return;
    }
    setLiveAn(false);
    setArt(neu);
  }, []);

  // --------------------------------------------------------------- Anzeige
  const sichtbarGeaendert = useRef(({ viewableItems }: { viewableItems: ViewToken<ClipEintrag>[] }) => {
    const erstes = viewableItems.find((v) => v.isViewable);
    if (erstes?.item) setAktivProFeed((a) => (a[artRef.current] === erstes.item.id ? a : { ...a, [artRef.current]: erstes.item.id }));
  }).current;

  const renderItem = useCallback(
    ({ item }: { item: ClipEintrag }) =>
      masse ? (
        <ClipSeite
          clip={item}
          hoehe={masse.hoehe}
          breite={masse.breite}
          unten={leiste}
          aktiv={item.id === aktivId}
          spielen={spielen}
          stumm={stumm}
          eigen={item.autor === ich}
          onLike={aktionen.onLike}
          onFolgen={aktionen.onFolgen}
          onKommentare={onKommentare}
          onTeilen={aktionen.onTeilen}
          onMehr={aktionen.onMehr}
          onProfil={aktionen.onProfil}
        />
      ) : null,
    [masse, leiste, aktivId, spielen, stumm, ich, aktionen, onKommentare],
  );

  const startIndex = useMemo(() => {
    const i = feed.eintraege.findIndex((c) => c.id === aktivProFeed[art]);
    return i > 0 ? i : 0;
    // nur beim Aufbau der Liste (key={art}) relevant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art]);

  const kommentarClip = kommentarId ? (feed.eintraege.find((c) => c.id === kommentarId) ?? null) : null;

  const l = useLila();
  // Video im Vollbild (Clips oder Live) – sonst heller Grund mit Wolken und Welle.
  const video = liveAn ? alle.length > 0 : serverVerbunden && !(art === "folge_ich" && !ich) && feed.eintraege.length > 0;
  useEffect(() => {
    clipsVideoSetzen(fokus && video);
  }, [fokus, video]);

  if (desktop) {
    return (
      <View style={{ flex: 1 }}>
        <ClipsWeb
          kategorie={liveAn ? "live" : art}
          lives={alle}
          eintraege={feed.eintraege}
          laedt={feed.laedt}
          fehler={feed.fehler}
          geladen={feed.geladen}
          verbunden={serverVerbunden}
          ich={ich}
          darfErstellen={rechte.ersteller || darfLiveJetzt}
          darfHochladen={rechte.ersteller}
          stumm={stumm}
          spielen={spielen && !kommentarId}
          aktionen={aktionen}
          onStumm={() => setStumm((x) => !x)}
          onWechsel={wechseln}
          onMehrLaden={() => laden(art, false)}
          onNeuLaden={() => laden(art, true)}
          onErstellen={() =>
            darfLiveJetzt && rechte.ersteller
              ? dialog("Was möchtest du erstellen?", undefined, [
                  { text: "Live gehen", onPress: () => router.push("/live-senden") },
                  { text: "Clip hochladen", onPress: () => router.push("/clip-hochladen") },
                  { text: "Abbrechen", style: "cancel" },
                ])
              : erstellen()
          }
          onKommentare={onKommentare}
        />
        <KommentarBlatt
          clip={kommentarClip}
          angemeldet={Boolean(ich)}
          onSchliessen={() => setKommentarId(null)}
          onAnzahl={(id, n) => eintragAendern(id, (c) => ({ kommentare: Math.max(0, c.kommentare + n) }))}
          onAnmelden={() => {
            setKommentarId(null);
            router.push("/anmelden");
          }}
        />
      </View>
    );
  }

  let inhalt: ReactNode;
  if (liveAn && alle.length > 1 && masse) {
    inhalt = (
      <LiveFeed
        lives={alle}
        hoehe={masse.hoehe}
        breite={masse.breite}
        unten={leiste + 10}
        aktiv={fokus && vordergrund}
        onOeffnen={(id) => router.push({ pathname: "/live", params: { id } })}
      />
    );
  } else if (liveAn) {
    inhalt = <LiveAnsicht oben={insets.top + KOPF} unten={leiste + 10} aktiv={fokus && vordergrund} stumm={stumm} />;
  } else if (!serverVerbunden) {
    inhalt = (
      <ClipsHinweis oben={insets.top + KOPF} unten={16} bild="klappe" bildBreite={130} titel="Clips kommen bald" text="Sobald die App mit dem Server verbunden ist, findest du hier kurze Videos rund um die Theorie." />
    );
  } else if (art === "folge_ich" && !ich) {
    inhalt = (
      <ClipsHinweis oben={insets.top + KOPF} unten={16} bild="freunde" bildBreite={150} titel="Folge deinen Lieblings-Erklärern" text="Mit einem kostenlosen Konto kannst du Erstellern folgen, liken und kommentieren.">
        <ClipsKnopf titel="Konto erstellen" icon="person-add-outline" onPress={() => router.push("/start")} />
        <ClipsKnopf titel="Ich habe schon ein Konto" zart onPress={() => router.push({ pathname: "/start", params: { modus: "anmelden" } })} />
      </ClipsHinweis>
    );
  } else if (feed.eintraege.length === 0 && feed.fehler) {
    inhalt = (
      <ClipsHinweis oben={insets.top + KOPF} unten={16} bild="wolke" bildBreite={170} titel="Clips laden gerade nicht" text={feed.fehler}>
        <ClipsKnopf titel="Nochmal versuchen" icon="refresh" onPress={() => laden(art, true)} />
      </ClipsHinweis>
    );
  } else if (!feed.geladen || (feed.laedt && feed.eintraege.length === 0)) {
    inhalt = (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Lader color="#8A5FFF" />
      </View>
    );
  } else if (feed.eintraege.length === 0) {
    inhalt =
      art === "folge_ich" ? (
        <ClipsHinweis oben={insets.top + KOPF} unten={16} bild="figur" bildBreite={200} deko="klappe" titel="Du folgst noch niemandem" text="Tippe bei einem Clip auf „Folgen“ – dann landen neue Videos dieser Person hier.">
          <ClipsKnopf titel="Clips entdecken" icon="compass-outline" onPress={() => wechseln("entdecken")} />
        </ClipsHinweis>
      ) : (
        <ClipsHinweis
          oben={insets.top + KOPF}
          unten={16}
          bild="figur"
          bildBreite={200}
          titel="Noch keine Clips"
          text={rechte.ersteller ? "Lade den ersten Clip hoch – kurze Hochkant-Videos wirken am besten." : "Hier erscheinen bald kurze Videos rund um die Theorie."}
        >
          {rechte.ersteller ? <ClipsKnopf titel="Clip hochladen" icon="add" onPress={() => router.push("/clip-hochladen")} /> : null}
        </ClipsHinweis>
      );
  } else if (masse) {
    inhalt = (
      <FlatList
        ref={liste}
        key={art}
        data={feed.eintraege}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        pagingEnabled
        decelerationRate="fast"
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: masse.hoehe, offset: masse.hoehe * i, index: i })}
        initialScrollIndex={startIndex < feed.eintraege.length ? startIndex : 0}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        removeClippedSubviews={false}
        onViewableItemsChanged={sichtbarGeaendert}
        viewabilityConfig={SICHTBAR}
        onEndReached={() => laden(art, false)}
        onEndReachedThreshold={2}
        refreshControl={<RefreshControl refreshing={aktualisiert} onRefresh={neuLaden} tintColor="#FFFFFF" colors={[farben.orange]} progressBackgroundColor={farben.flaeche2} progressViewOffset={insets.top + 44} />}
      />
    );
  } else {
    inhalt = null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: video ? "#000000" : l.grund }}>
      {video ? null : <ClipsGrund />}
      {/* Am PC läuft der Feed in einer Hochkant-Spalte in der Mitte – wie Clips am Handy */}
      <View
        style={desktop ? { flex: 1, width: Math.min(Math.round((fensterHoehe * 9) / 16), 620), alignSelf: "center" } : { flex: 1 }}
        onLayout={(e) => setMasse({ breite: e.nativeEvent.layout.width, hoehe: e.nativeEvent.layout.height })}
      >
        {inhalt}
      </View>

      {/* Kopf: Plus, Titel, Ton – darunter der Umschalter. Über dem Video ein leichter Schatten. */}
      {video ? <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + KOPF + 40 }} /> : null}
      <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 4, left: 0, right: 0, paddingHorizontal: 16, gap: 12 }}>
        <View pointerEvents="box-none" style={{ height: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          {/* Plus immer sichtbar: wer darf, lädt hoch bzw. geht live – alle anderen landen bei der Creator-Bewerbung (ohne Konto bei der Anmeldung) */}
          <BildTaste
            bild={CLIPS_BILD.plus}
            label={rechte.ersteller || darfLiveJetzt ? (darfLiveJetzt ? "Erstellen" : "Clip hochladen") : "Creator werden"}
            onPress={() => {
              if (rechte.ersteller || darfLiveJetzt) erstellen();
              else if (ich) router.push("/creator-bewerbung");
              else router.push({ pathname: "/start", params: { modus: "anmelden" } });
            }}
          />
          <Text style={{ ...lilaSchrift.titel, fontSize: 38, color: video ? "#FFFFFF" : l.tinte, textShadowColor: video ? "rgba(0,0,0,0.4)" : "transparent", textShadowRadius: 8 }}>Clips</Text>
          <BildTaste bild={CLIPS_BILD.ton} durchgestrichen={stumm} label={stumm ? "Ton an" : "Ton aus"} onPress={() => setStumm((s) => !s)} />
        </View>
        <Umschalter wert={liveAn ? "live" : art} live={alle.length > 0} onWechsel={wechseln} />
      </View>

      <AufklappMenue
        offen={menueOffen}
        oben={insets.top + 58}
        links={12}
        onSchliessen={() => setMenueOffen(false)}
        punkte={[
          { text: "Live gehen", icon: "radio-outline", sf: "dot.radiowaves.left.and.right", onPress: () => router.push("/live-senden") },
          { text: "Clip hochladen", icon: "film-outline", sf: "film", onPress: () => router.push("/clip-hochladen") },
        ]}
      />

      <KommentarBlatt
        clip={kommentarClip}
        angemeldet={Boolean(ich)}
        onSchliessen={() => setKommentarId(null)}
        onAnzahl={(id, n) => eintragAendern(id, (c) => ({ kommentare: Math.max(0, c.kommentare + n) }))}
        onAnmelden={() => {
          setKommentarId(null);
          router.push("/anmelden");
        }}
      />
    </View>
  );
}
