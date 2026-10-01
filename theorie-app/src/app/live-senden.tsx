import { useEffect, useRef, useState } from "react";
import { Animated, Easing, KeyboardAvoidingView, Linking, Platform, Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useKeepAwake } from "expo-keep-awake";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { auswahlBlatt } from "@/components/auswahl-blatt";
import { dialog } from "@/components/dialog";
import { Glas } from "@/components/glas";
import { HinweisAnzeige, useHinweis } from "@/components/hinweis";
import { Icon, type IconName } from "@/components/icon";
import { Lader } from "@/components/lader";
import { LiveBuehne } from "@/components/live-buehne";
import { LiveEnde, type TopChatter } from "@/components/live-ende";
import { QuizAuswahl, QuizGastgeberKarte } from "@/components/live-quiz";
import { LiveChat, LiveEingabe, LiveSchild, LIVE_ROT, useHerzen, ZuschauerZahl } from "@/components/live";
import { Knopf } from "@/components/ui";
import { erfolg, stoss, tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import {
  liveBeenden,
  liveFreigeben,
  liveNachrichtLoeschen,
  livePuls,
  liveSchreiben,
  liveStummschalten,
  liveVorbereiten,
  liveZugang,
  useLiveChat,
  type ChatNachricht,
  type LiveSteuerung,
  type LiveZugang,
} from "@/lib/live";
import { useQuizGastgeber } from "@/lib/live-quiz";
import { leuchten, schrift } from "@/lib/theme";

// Live gehen (nur der Inhaber der App): Kamera-Vorschau, Thema, Countdown,
// dann live mit Chat, Zuschauern, Herzen, Quiz und Moderation. Beim Verlassen
// endet das Live automatisch.

type Phase = "start" | "bereit" | "countdown" | "live" | "ende" | "fehler";

const LIVE_VERLAUF = ["#FF5A5F", "#FF2D55", "#E0124A"] as const;

function dauerText(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sek = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sek}` : `${m}:${sek}`;
}

function Werkzeug({ icon, sf, label, aus, onPress }: { icon: IconName; sf: string; label: string; aus?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ alignItems: "center", gap: 4 }}
    >
      {({ pressed }) => (
        <>
          <Glas interaktiv style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 }}>
            <Icon name={icon} sf={sf as never} size={20} color={aus ? LIVE_ROT : "#FFFFFF"} weight="semibold" />
          </Glas>
          <Text style={{ ...schrift.textHalb, fontSize: 11, color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4 }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export default function LiveSenden() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { session, profil, anzeigeName } = useKonto();
  const ich = session?.user.id ?? null;
  const hinweis = useHinweis();
  const { ausloesen, herzen } = useHerzen();

  const [phase, setPhase] = useState<Phase>("start");
  const [liveId, setLiveId] = useState<string | null>(null);
  const [zugang, setZugang] = useState<LiveZugang | null>(null);
  const [fehlerText, setFehlerText] = useState("");
  const [titel, setTitel] = useState("");
  const [zahl, setZahl] = useState(3);
  const [zuschauer, setZuschauer] = useState(0);
  const [maxZuschauer, setMaxZuschauer] = useState(0);
  const [herzZahl, setHerzZahl] = useState(0);
  const [mikroAn, setMikroAn] = useState(true);
  const [start, setStart] = useState<number | null>(null);
  const [jetzt, setJetzt] = useState(Date.now());
  const [ende, setEnde] = useState<number | null>(null);
  const [runde, setRunde] = useState(0);
  const [quizWahl, setQuizWahl] = useState(false);
  const [quizHoehe, setQuizHoehe] = useState(0);
  const { height: fensterHoehe } = useWindowDimensions();

  const steuerung = useRef<LiveSteuerung | null>(null);
  const quiz = useQuizGastgeber(
    phase === "live" ? liveId : null,
    () => steuerung.current?.quiz(),
    (text) => hinweis.zeigen({ icon: "alert-circle", text, farbe: LIVE_ROT }),
  );
  const idRef = useRef<string | null>(null);
  const zuschauerRef = useRef(0);
  zuschauerRef.current = zuschauer;
  const countdownWert = useRef(new Animated.Value(0)).current;
  const nachrichten = useLiveChat(phase === "live" || phase === "ende" ? liveId : null);

  // Für den Abschluss: alle Nachrichten des Lives zählen, je Person (ohne den Gastgeber).
  const gezaehlt = useRef(new Set<number>());
  const [chatZahl, setChatZahl] = useState(0);
  const [proPerson, setProPerson] = useState<Record<string, TopChatter>>({});
  useEffect(() => {
    const neu = nachrichten.filter((n) => !gezaehlt.current.has(n.id));
    if (!neu.length) return;
    neu.forEach((n) => gezaehlt.current.add(n.id));
    setChatZahl((z) => z + neu.length);
    setProPerson((alt) => {
      const naechst = { ...alt };
      for (const n of neu) {
        if (n.user_id === ich) continue;
        const bisher = naechst[n.user_id];
        naechst[n.user_id] = { id: n.user_id, name: n.name, bild_pfad: n.bild_pfad, anzahl: (bisher?.anzahl ?? 0) + 1 };
      }
      return naechst;
    });
  }, [nachrichten, ich]);

  // 1) Live vorbereiten (noch unsichtbar) und Zugang zum Senden holen.
  useEffect(() => {
    let aktiv = true;
    (async () => {
      try {
        const { id } = await liveVorbereiten("");
        if (!aktiv) {
          liveBeenden(id);
          return;
        }
        idRef.current = id;
        setLiveId(id);
        const z = await liveZugang("senden");
        if (!aktiv) return;
        if ("fehler" in z) {
          setFehlerText(
            z.fehler === "nicht_eingerichtet"
              ? "Der Live-Stream ist auf dem Server noch nicht eingerichtet: Es fehlen die LiveKit-Schlüssel oder die Funktion live-token. Die Schritte stehen im README unter „Live-Stream“."
              : z.fehler === "kein_inhaber"
                ? "Live gehen kann nur der Inhaber der App."
                : "Die Verbindung zum Live-Server klappt gerade nicht. Prüfe dein Internet.",
          );
          setPhase("fehler");
          return;
        }
        setZugang(z);
        setPhase("bereit");
      } catch (e) {
        if (!aktiv) return;
        setFehlerText((e as Error).message.includes("Inhaber") ? "Live gehen kann nur der Inhaber der App." : (e as Error).message);
        setPhase("fehler");
      }
    })();
    return () => {
      aktiv = false;
    };
  }, [runde]);

  // Beim Verlassen der Seite endet das Live.
  useEffect(
    () => () => {
      if (idRef.current) liveBeenden(idRef.current);
    },
    [],
  );

  // Lebenszeichen alle 30 Sekunden (sonst gilt das Live nach 2 Minuten als beendet).
  useEffect(() => {
    if (!liveId || phase === "ende" || phase === "fehler" || phase === "start") return;
    const t = setInterval(() => livePuls(liveId, zuschauerRef.current), 30_000);
    return () => clearInterval(t);
  }, [liveId, phase]);

  // Uhr während des Lives
  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    setMaxZuschauer((m) => Math.max(m, zuschauer));
  }, [zuschauer]);

  async function losGehen() {
    if (!liveId) return;
    setPhase("countdown");
    for (const n of [3, 2, 1]) {
      setZahl(n);
      stoss();
      countdownWert.setValue(0);
      await new Promise<void>((fertig) =>
        Animated.timing(countdownWert, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => fertig()),
      );
    }
    try {
      await liveFreigeben(liveId, titel.trim());
      erfolg();
      setStart(Date.now());
      setJetzt(Date.now());
      setPhase("live");
    } catch (e) {
      hinweis.zeigen({ icon: "alert-circle", text: (e as Error).message, farbe: LIVE_ROT });
      setPhase("bereit");
    }
  }

  async function wirklichBeenden() {
    const id = idRef.current;
    idRef.current = null;
    setEnde(Date.now());
    setPhase("ende");
    if (id) await liveBeenden(id);
  }

  /** Nach dem Abschluss direkt ein neues Live vorbereiten. */
  function nochmal() {
    gezaehlt.current = new Set();
    setChatZahl(0);
    setProPerson({});
    setZugang(null);
    setLiveId(null);
    setZuschauer(0);
    setMaxZuschauer(0);
    setHerzZahl(0);
    setMikroAn(true);
    setStart(null);
    setEnde(null);
    setTitel("");
    quiz.zuruecksetzen();
    setPhase("start");
    setRunde((r) => r + 1);
  }

  // ------------------------------------------------------------------ Quiz
  function zeigeProblem(problem: string | null) {
    if (problem) hinweis.zeigen({ icon: "alert-circle", text: problem, farbe: LIVE_ROT });
  }

  function quizOeffnen() {
    if (quiz.quiz?.status === "offen") {
      hinweis.zeigen({ icon: "flash", text: "Erst die laufende Frage auflösen" });
      return;
    }
    setQuizWahl(true);
  }

  function quizSchliessen() {
    if (quiz.quiz?.status !== "offen") {
      quiz.schliessen().then(zeigeProblem);
      return;
    }
    dialog("Frage abbrechen?", "Die Antworten zählen dann nicht.", [
      { text: "Weiter", style: "cancel" },
      { text: "Abbrechen", style: "destructive", onPress: () => quiz.schliessen().then(zeigeProblem) },
    ]);
  }

  function beenden() {
    dialog("Live beenden?", "Alle Zuschauer sehen dann „Das Live ist vorbei“.", [
      { text: "Weiter live", style: "cancel" },
      { text: "Beenden", style: "destructive", onPress: wirklichBeenden },
    ]);
  }

  function schliessen() {
    if (phase === "live") {
      beenden();
      return;
    }
    const id = idRef.current;
    idRef.current = null;
    if (id) liveBeenden(id);
    router.back();
  }

  async function schreiben(text: string): Promise<boolean> {
    if (!liveId) return false;
    const problem = await liveSchreiben(liveId, text);
    if (problem) {
      hinweis.zeigen({ icon: "alert-circle", text: problem, farbe: LIVE_ROT });
      return false;
    }
    return true;
  }

  async function moderieren(n: ChatNachricht) {
    const eigen = n.user_id === ich;
    const optionen = eigen ? [{ text: "Nachricht löschen", gefahr: true }] : [{ text: "Nachricht löschen", gefahr: true }, { text: `${n.name} stummschalten`, gefahr: true }];
    const wahl = await auswahlBlatt(eigen ? "Deine Nachricht" : `Nachricht von ${n.name}`, optionen);
    let problem: string | null = null;
    if (wahl === 0) problem = await liveNachrichtLoeschen(n.id);
    if (wahl === 1) {
      problem = await liveStummschalten(n.user_id, true);
      if (!problem) hinweis.zeigen({ icon: "volume-mute", text: `${n.name} kann nicht mehr schreiben` });
    }
    if (problem) hinweis.zeigen({ icon: "alert-circle", text: problem, farbe: LIVE_ROT });
  }

  // ------------------------------------------------------------------ Anzeige
  const zeigtBuehne = zugang && (phase === "bereit" || phase === "countdown" || phase === "live");
  // Mit Quizkarte bekommt der Chat nur den Platz zwischen Karte und Eingabe.
  const chatPlatz = quiz.quiz && quizHoehe > 0 ? fensterHoehe - (insets.top + 52 + quizHoehe) - (Math.max(insets.bottom, 12) + 4) - 46 - 10 - 14 : 300;
  const chatHoehe = Math.max(0, Math.min(300, chatPlatz));

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar style="light" />

      {zeigtBuehne ? (
        <LiveBuehne
          key={zugang.token}
          url={zugang.url}
          token={zugang.token}
          senden
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          onZuschauer={setZuschauer}
          onHerz={() => {
            ausloesen();
            setHerzZahl((h) => h + 1);
          }}
          onSteuerung={(s) => (steuerung.current = s)}
          onVerbindung={(s, meldung) => {
            if (s === "fehler") {
              setFehlerText(meldung ?? "Die Verbindung ist abgebrochen.");
              setPhase("fehler");
            }
          }}
        />
      ) : null}

      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 110 }} />
      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.62)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 380 }} />

      {/* Kopf */}
      <View style={{ position: "absolute", top: insets.top + 8, left: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
        {phase === "live" && start ? (
          <>
            <LiveSchild />
            <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.38)", justifyContent: "center" }}>
              <Text style={{ ...schrift.textFett, fontSize: 11.5, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{dauerText(jetzt - start)}</Text>
            </View>
            <ZuschauerZahl anzahl={zuschauer} />
          </>
        ) : phase === "bereit" || phase === "countdown" ? (
          <Glas style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: "center" }}>
            <Text style={{ ...schrift.textHalb, fontSize: 13, color: "#FFFFFF" }}>Vorschau – noch nicht live</Text>
          </Glas>
        ) : null}
        <View style={{ flex: 1 }} />
        {phase === "live" ? (
          <Pressable onPress={beenden} accessibilityRole="button" accessibilityLabel="Live beenden" hitSlop={6}>
            {({ pressed }) => (
              <Glas interaktiv style={{ height: 40, paddingHorizontal: 16, borderRadius: 20, justifyContent: "center", opacity: pressed ? 0.8 : 1 }}>
                <Text style={{ ...schrift.textFett, fontSize: 14, color: "#FF6B85" }}>Beenden</Text>
              </Glas>
            )}
          </Pressable>
        ) : phase !== "ende" ? (
          <Pressable onPress={schliessen} accessibilityRole="button" accessibilityLabel="Schließen" hitSlop={8}>
            {({ pressed }) => (
              <Glas interaktiv style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 }}>
                <Icon name="close" sf="xmark" size={18} color="#FFFFFF" weight="semibold" />
              </Glas>
            )}
          </Pressable>
        ) : null}
      </View>

      {/* Werkzeuge rechts: Kamera drehen, Mikrofon, Quiz */}
      {zeigtBuehne ? (
        <View style={{ position: "absolute", right: 12, top: insets.top + 70, gap: 16 }}>
          <Werkzeug icon="camera-reverse-outline" sf="arrow.triangle.2.circlepath.camera" label="Drehen" onPress={() => steuerung.current?.kameraWechseln().catch(() => {})} />
          <Werkzeug
            icon={mikroAn ? "mic-outline" : "mic-off-outline"}
            sf={mikroAn ? "mic" : "mic.slash"}
            label={mikroAn ? "Mikro" : "Stumm"}
            aus={!mikroAn}
            onPress={() => {
              const neu = !mikroAn;
              setMikroAn(neu);
              steuerung.current?.mikrofon(neu).catch(() => setMikroAn(!neu));
            }}
          />
          {phase === "live" ? <Werkzeug icon="flash-outline" sf="bolt" label="Quiz" onPress={quizOeffnen} /> : null}
        </View>
      ) : null}

      {/* Quiz: Frage mit Stimmen live, Auflösung, Rangliste */}
      {phase === "live" && quiz.quiz ? (
        <QuizGastgeberKarte
          quiz={quiz.quiz}
          zwischen={quiz.zwischen}
          beschaeftigt={quiz.beschaeftigt}
          onAufloesen={() => quiz.aufloesen().then(zeigeProblem)}
          onRangliste={() => quiz.rangliste().then(zeigeProblem)}
          onNaechste={() => setQuizWahl(true)}
          onSchliessen={quizSchliessen}
          onLayout={(e) => setQuizHoehe(e.nativeEvent.layout.height)}
          style={{ position: "absolute", top: insets.top + 52, left: 12, right: 70 }}
        />
      ) : null}

      {/* Start: Kamera startet */}
      {phase === "start" ? (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Lader color="#FFFFFF" />
          <Text style={{ ...schrift.textHalb, fontSize: 15, color: "rgba(255,255,255,0.8)" }}>Kamera startet …</Text>
        </View>
      ) : null}

      {/* Vorschau: Thema und „Live gehen“ */}
      {phase === "bereit" ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          <View style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 14) + 6, gap: 12 }}>
            <Glas style={{ height: 50, borderRadius: 25, paddingHorizontal: 18, justifyContent: "center" }}>
              <TextInput
                value={titel}
                onChangeText={setTitel}
                placeholder="Worum geht's? (z. B. Vorfahrt-Fragen)"
                placeholderTextColor="rgba(255,255,255,0.6)"
                maxLength={80}
                returnKeyType="done"
                style={{ color: "#FFFFFF", ...schrift.textHalb, fontSize: 15.5, height: 50 }}
              />
            </Glas>
            <Pressable onPress={losGehen} accessibilityRole="button" accessibilityLabel="Live gehen" style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }, leuchten(LIVE_ROT, 0.5, 18, 4)]}>
              <LinearGradient colors={LIVE_VERLAUF} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 58, borderRadius: 29, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <Icon name="radio" sf="dot.radiowaves.left.and.right" size={22} color="#FFFFFF" />
                <Text style={{ ...schrift.textFett, fontSize: 17.5, color: "#FFFFFF" }}>Live gehen</Text>
              </LinearGradient>
            </Pressable>
            <Text style={{ ...schrift.textMittel, fontSize: 12, color: "rgba(255,255,255,0.7)", textAlign: "center" }}>Alle mit eingeschalteter Live-Mitteilung bekommen Bescheid.</Text>
          </View>
        </KeyboardAvoidingView>
      ) : null}

      {/* Countdown 3 – 2 – 1 */}
      {phase === "countdown" ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)" }}>
          <Animated.Text
            style={{
              ...schrift.titel,
              fontSize: 150,
              color: "#FFFFFF",
              textShadowColor: "rgba(255,45,85,0.8)",
              textShadowRadius: 30,
              opacity: countdownWert.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }),
              transform: [{ scale: countdownWert.interpolate({ inputRange: [0, 1], outputRange: [1.4, 0.8] }) }],
            }}
          >
            {zahl}
          </Animated.Text>
        </View>
      ) : null}

      {/* Live: Chat und eigene Nachrichten */}
      {phase === "live" ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          <View style={{ paddingHorizontal: 12, paddingBottom: Math.max(insets.bottom, 12) + 4, gap: 10 }}>
            {chatHoehe >= 64 ? <LiveChat nachrichten={nachrichten} gastgeberId={ich} onLangDruck={moderieren} style={{ maxHeight: chatHoehe, marginRight: 64 }} /> : null}
            <LiveEingabe
              angemeldet
              onSenden={schreiben}
              onHerz={() => {
                ausloesen();
                steuerung.current?.herz();
              }}
              onAnmelden={() => {}}
              herzen={herzen}
            />
          </View>
        </KeyboardAvoidingView>
      ) : null}

      {/* Ende: Abschluss mit Zahlen */}
      {phase === "ende" ? (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
          <LiveEnde
            name={profil?.name || anzeigeName}
            bildPfad={profil?.bild_pfad}
            farbe={profil?.avatar_farbe}
            titel={titel.trim()}
            dauerMs={start && ende ? ende - start : 0}
            zuschauer={maxZuschauer}
            herzen={herzZahl}
            nachrichten={chatZahl}
            topChatter={Object.values(proPerson).sort((a, b) => b.anzahl - a.anzahl)}
            quizSieger={quiz.bestenliste}
            quizFragen={quiz.gefragt.length}
            oben={insets.top + 14}
            unten={Math.max(insets.bottom, 16) + 8}
            onFertig={() => router.back()}
            onNochmal={nochmal}
          />
        </View>
      ) : null}

      {/* Fehler */}
      {phase === "fehler" ? (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 10, backgroundColor: "#000000" }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,45,85,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
            <Icon name="videocam-off-outline" sf="video.slash" size={34} color={LIVE_ROT} />
          </View>
          <Text style={{ ...schrift.titelFett, fontSize: 21, color: "#FFFFFF", textAlign: "center" }}>Live geht gerade nicht</Text>
          <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 21, color: "#AEB3BA", textAlign: "center" }}>{fehlerText}</Text>
          <View style={{ alignSelf: "stretch", gap: 10, marginTop: 18 }}>
            {/Kamera|Mikrofon/.test(fehlerText) ? <Knopf titel="Einstellungen öffnen" onPress={() => Linking.openSettings()} /> : null}
            <Knopf titel="Schließen" art="sekundaer" onPress={schliessen} />
          </View>
        </View>
      ) : null}

      <QuizAuswahl
        sichtbar={quizWahl && phase === "live"}
        gefragt={quiz.gefragt}
        onStarten={async (frage, dauer) => {
          const problem = await quiz.starten(frage, dauer);
          zeigeProblem(problem);
          if (!problem) erfolg();
          return !problem;
        }}
        onSchliessen={() => setQuizWahl(false)}
      />

      <HinweisAnzeige wert={hinweis.wert} inhalt={hinweis.inhalt} oben={insets.top + 60} />
    </View>
  );
}
