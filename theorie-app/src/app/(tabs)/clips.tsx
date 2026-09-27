import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, FlatList, Pressable, RefreshControl, Text, View, type ViewToken } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useNavigation } from "expo-router";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { SFSymbol } from "expo-symbols";

import { ClipSeite } from "@/components/clip-seite";
import { Glas } from "@/components/glas";
import { Icon, type IconName } from "@/components/icon";
import { KommentarBlatt } from "@/components/kommentar-blatt";
import { useLeistenHoehe } from "@/components/tab-leiste";
import { Knopf } from "@/components/ui";
import { useClipAktionen } from "@/lib/clip-aktionen";
import { beiNeuenClips, feedLaden, useClipRechte, type ClipEintrag, type FeedArt } from "@/lib/clips-server";
import { tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { serverVerbunden } from "@/lib/supabase";
import { farben, schrift } from "@/lib/theme";

type Feed = { eintraege: ClipEintrag[]; laedt: boolean; mehr: boolean; fehler: string | null; geladen: boolean };

const LEER: Feed = { eintraege: [], laedt: false, mehr: true, fehler: null, geladen: false };
const SEITE = 8;
const SICHTBAR = { itemVisiblePercentThreshold: 70 };

/** Umschalter „Entdecken / Folge ich“ als Glas-Kapsel mit orangem Schieber. */
function Umschalter({ wert, onWechsel }: { wert: FeedArt; onWechsel: (a: FeedArt) => void }) {
  const optionen: { id: FeedArt; titel: string }[] = [
    { id: "entdecken", titel: "Entdecken" },
    { id: "folge_ich", titel: "Folge ich" },
  ];
  return (
    <Glas style={{ flexDirection: "row", padding: 3, borderRadius: 21, gap: 2 }}>
      {optionen.map((o) => {
        const aktiv = o.id === wert;
        return (
          <Pressable
            key={o.id}
            onPress={() => !aktiv && onWechsel(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktiv }}
            style={{ height: 34, paddingHorizontal: 16, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: aktiv ? farben.orange : "transparent" }}
          >
            <Text style={{ ...(aktiv ? schrift.textFett : schrift.textHalb), fontSize: 14.5, color: aktiv ? "#FFFFFF" : "rgba(255,255,255,0.78)" }}>{o.titel}</Text>
          </Pressable>
        );
      })}
    </Glas>
  );
}

function RundTaste({ icon, sf, label, onPress }: { icon: IconName; sf: SFSymbol; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {({ pressed }) => (
        <Glas interaktiv style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 }}>
          <Icon name={icon} sf={sf} size={18} color="#FFFFFF" weight="semibold" />
        </Glas>
      )}
    </Pressable>
  );
}

function Hinweis({ icon, sf, titel, text, children }: { icon: IconName; sf: SFSymbol; titel: string; text: string; children?: ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36, gap: 10 }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
        <Icon name={icon} sf={sf} size={32} color={farben.orange} />
      </View>
      <Text style={{ ...schrift.titelFett, fontSize: 21, color: "#FFFFFF", textAlign: "center" }}>{titel}</Text>
      <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 21, color: "#AEB3BA", textAlign: "center" }}>{text}</Text>
      {children ? <View style={{ alignSelf: "stretch", gap: 10, marginTop: 14 }}>{children}</View> : null}
    </View>
  );
}

export default function Clips() {
  const insets = useSafeAreaInsets();
  const leiste = useLeistenHoehe();
  const fokus = useIsFocused();
  const navigation = useNavigation<BottomTabNavigationProp<Record<string, undefined>>>();
  const { session } = useKonto();
  const rechte = useClipRechte();
  const ich = session?.user.id ?? null;

  const [art, setArt] = useState<FeedArt>("entdecken");
  const [feeds, setFeeds] = useState<Record<FeedArt, Feed>>({ entdecken: LEER, folge_ich: LEER });
  const [aktivProFeed, setAktivProFeed] = useState<Record<FeedArt, string | null>>({ entdecken: null, folge_ich: null });
  const [stumm, setStumm] = useState(false);
  const [vordergrund, setVordergrund] = useState(AppState.currentState === "active");
  const [kommentarId, setKommentarId] = useState<string | null>(null);
  const [masse, setMasse] = useState<{ breite: number; hoehe: number } | null>(null);
  const [aktualisiert, setAktualisiert] = useState(false);

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

  const feed = feeds[art];
  const aktivId = aktivProFeed[art] ?? feed.eintraege[0]?.id ?? null;
  const spielen = fokus && vordergrund;

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

  const wechseln = useCallback((neu: FeedArt) => {
    tippen();
    setKommentarId(null);
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

  let inhalt: ReactNode;
  if (!serverVerbunden) {
    inhalt = (
      <Hinweis icon="film-outline" sf="play.rectangle.on.rectangle" titel="Clips kommen bald" text="Sobald die App mit dem Server verbunden ist, findest du hier kurze Videos rund um die Theorie." />
    );
  } else if (art === "folge_ich" && !ich) {
    inhalt = (
      <Hinweis icon="people-outline" sf="person.2.fill" titel="Folge deinen Lieblings-Erklärern" text="Mit einem kostenlosen Konto kannst du Erstellern folgen, liken und kommentieren.">
        <Knopf titel="Konto erstellen" onPress={() => router.push("/registrieren")} />
        <Knopf titel="Ich habe schon ein Konto" art="sekundaer" onPress={() => router.push("/anmelden")} />
      </Hinweis>
    );
  } else if (feed.eintraege.length === 0 && feed.fehler) {
    inhalt = (
      <Hinweis icon="cloud-offline-outline" sf="wifi.exclamationmark" titel="Clips laden gerade nicht" text={feed.fehler}>
        <Knopf titel="Nochmal versuchen" onPress={() => laden(art, true)} />
      </Hinweis>
    );
  } else if (!feed.geladen || (feed.laedt && feed.eintraege.length === 0)) {
    inhalt = (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  } else if (feed.eintraege.length === 0) {
    inhalt =
      art === "folge_ich" ? (
        <Hinweis icon="people-outline" sf="person.2" titel="Du folgst noch niemandem" text="Tippe bei einem Clip auf „Folgen“ – dann landen neue Videos dieser Person hier.">
          <Knopf titel="Clips entdecken" onPress={() => wechseln("entdecken")} />
        </Hinweis>
      ) : (
        <Hinweis
          icon="film-outline"
          sf="play.rectangle.on.rectangle"
          titel="Noch keine Clips"
          text={rechte.ersteller ? "Lade den ersten Clip hoch – kurze Hochkant-Videos wirken am besten." : "Hier erscheinen bald kurze Videos rund um die Theorie."}
        >
          {rechte.ersteller ? <Knopf titel="Clip hochladen" icon="add" onPress={() => router.push("/clip-hochladen")} /> : null}
        </Hinweis>
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
        refreshControl={<RefreshControl refreshing={aktualisiert} onRefresh={neuLaden} tintColor="#FFFFFF" progressViewOffset={insets.top + 44} />}
      />
    );
  } else {
    inhalt = null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <View style={{ flex: 1 }} onLayout={(e) => setMasse({ breite: e.nativeEvent.layout.width, hoehe: e.nativeEvent.layout.height })}>
        {inhalt}
      </View>

      {/* Kopf über dem Video */}
      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.42)", "rgba(0,0,0,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 90 }} />
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", top: insets.top + 4, left: 0, right: 0, height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 }}
      >
        <View style={{ width: 40 }}>{rechte.ersteller ? <RundTaste icon="add" sf="plus" label="Clip hochladen" onPress={() => router.push("/clip-hochladen")} /> : null}</View>
        <Umschalter wert={art} onWechsel={wechseln} />
        <RundTaste
          icon={stumm ? "volume-mute" : "volume-high"}
          sf={stumm ? "speaker.slash.fill" : "speaker.wave.2.fill"}
          label={stumm ? "Ton an" : "Ton aus"}
          onPress={() => setStumm((s) => !s)}
        />
      </View>

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
