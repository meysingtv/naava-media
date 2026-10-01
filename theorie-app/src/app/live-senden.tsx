import { useEffect, useRef, useState } from "react";
import { Animated, Easing, KeyboardAvoidingView, Linking, Platform, Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useKeepAwake } from "expo-keep-awake";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Reanimated, { Easing as REasing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { auswahlBlatt } from "@/components/auswahl-blatt";
import { dialog } from "@/components/dialog";
import { Glas } from "@/components/glas";
import { HinweisAnzeige, useHinweis } from "@/components/hinweis";
import { Icon, type IconName } from "@/components/icon";
import { Lader } from "@/components/lader";
import { bildBasis, LiveBildEbene } from "@/components/live-bild";
import { LiveBuehne } from "@/components/live-buehne";
import { LiveEnde, type TopChatter } from "@/components/live-ende";
import { PruefungGastgeberBereich } from "@/components/live-pruefung";
import { QUIZ_UEBERBLEND, QuizAuswahl, QuizGastgeberKarte } from "@/components/live-quiz";
import { ThemenRad } from "@/components/live-rad";
import { TafelBuehne } from "@/components/live-tafel";
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
import { BILD_START, bildNachricht, liveBildDateiLoeschen, liveBildHochladen, liveBildSichern, type BildLage, type LiveBild } from "@/lib/live-bild";
import { PRUEFUNG_FRAGEN, PRUEFUNG_SEKUNDEN, useLivePruefungGastgeber, type LivePruefung } from "@/lib/live-pruefung";
import { useQuizGastgeber, type LiveQuiz } from "@/lib/live-quiz";
import { frageAusThema, radDrehen, radSchliessen, type LiveRad } from "@/lib/live-rad";
import { tafelAnwenden, tafelNachricht, tafelSichern, vereinfachen, type LiveTafel, type Strich, type TafelGrund, type TafelNachricht } from "@/lib/live-tafel";
import { leuchten, schrift } from "@/lib/theme";

// Live gehen (nur der Inhaber der App): Kamera-Vorschau, Thema, Countdown,
// dann live mit Chat, Zuschauern, Herzen, Quiz, Prüfung, Themenrad, Tafel, Bild
// aus der Galerie und Moderation. Während Quiz oder Prüfung teilt sich der
// Bildschirm (Kamera oben, Bereich unten, ohne Chat). Beim Verlassen endet das
// Live automatisch.

type Phase = "start" | "bereit" | "countdown" | "live" | "ende" | "fehler";

const LIVE_VERLAUF = ["#FF5A5F", "#FF2D55", "#E0124A"] as const;

function dauerText(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sek = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sek}` : `${m}:${sek}`;
}

function Werkzeug({ icon, sf, label, aus, laedt, kompakt, onPress }: { icon: IconName; sf: string; label: string; aus?: boolean; laedt?: boolean; kompakt?: boolean; onPress: () => void }) {
  const groesse = kompakt ? 40 : 46;
  return (
    <Pressable
      disabled={laedt}
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
          <Glas interaktiv style={{ width: groesse, height: groesse, borderRadius: groesse / 2, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 }}>
            {laedt ? <Lader color="#FFFFFF" /> : <Icon name={icon} sf={sf as never} size={kompakt ? 18 : 20} color={aus ? LIVE_ROT : "#FFFFFF"} weight="semibold" />}
          </Glas>
          {kompakt ? null : <Text style={{ ...schrift.textHalb, fontSize: 11, color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4 }}>{label}</Text>}
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
  const [panelHoehe, setPanelHoehe] = useState(0);
  const { height: fensterHoehe, width: fensterBreite } = useWindowDimensions();

  const steuerung = useRef<LiveSteuerung | null>(null);
  const meldeFehler = (text: string) => hinweis.zeigen({ icon: "alert-circle", text, farbe: LIVE_ROT });
  const quiz = useQuizGastgeber(phase === "live" ? liveId : null, () => steuerung.current?.quiz(), meldeFehler);
  const pruefung = useLivePruefungGastgeber(phase === "live" ? liveId : null, () => steuerung.current?.quiz(), meldeFehler);

  // Quiz oder Prüfung: Kamera oben, Bereich unten. Der Bereich bleibt beim Ende kurz
  // stehen, bis er hinausgeglitten ist.
  const quizAn = phase === "live" && Boolean(quiz.quiz);
  const [panelQuiz, setPanelQuiz] = useState<LiveQuiz | null>(null);
  useEffect(() => {
    if (quizAn) {
      setPanelQuiz(quiz.quiz);
      return;
    }
    const t = setTimeout(() => setPanelQuiz(null), 420);
    return () => clearTimeout(t);
  }, [quizAn, quiz.quiz]);
  const pruefungAn = phase === "live" && Boolean(pruefung.pruefung);
  const [panelPruefung, setPanelPruefung] = useState<LivePruefung | null>(null);
  useEffect(() => {
    if (pruefungAn) {
      setPanelPruefung(pruefung.pruefung);
      return;
    }
    const t = setTimeout(() => setPanelPruefung(null), 420);
    return () => clearTimeout(t);
  }, [pruefungAn, pruefung.pruefung]);
  const geteilt = Boolean(panelQuiz || panelPruefung);
  // Das Video reicht bis in den weichen Übergang hinein; bei der Prüfung bleibt mindestens ein Viertel.
  const videoZiel = (quizAn || pruefungAn) && panelHoehe > 0 ? Math.max(fensterHoehe * (pruefungAn ? 0.24 : 0.3), fensterHoehe - panelHoehe + QUIZ_UEBERBLEND) : fensterHoehe;
  const videoHoehe = useSharedValue(fensterHoehe);
  useEffect(() => {
    videoHoehe.value = withTiming(videoZiel, { duration: 450, easing: REasing.out(REasing.cubic) });
  }, [videoZiel, videoHoehe]);
  const videoStil = useAnimatedStyle(() => ({ height: videoHoehe.value }));

  // Bild aus der Galerie: Lage geht live an alle, gesichert wird sie kurz nach dem Loslassen.
  const [bild, setBild] = useState<LiveBild | null>(null);
  const [bildLaedt, setBildLaedt] = useState(false);
  const bildRef = useRef(bild);
  bildRef.current = bild;
  const bildPlan = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Das Bild liegt im Kamerabereich unter der Kopfzeile (bei Zuschauern genauso).
  const bildOben = insets.top + 56;
  const idRef = useRef<string | null>(null);
  const zuschauerRef = useRef(0);
  zuschauerRef.current = zuschauer;
  const countdownWert = useRef(new Animated.Value(0)).current;

  // Themenrad und Tafel (beide über der Kamera, solange offen ohne Chat)
  const [rad, setRad] = useState<LiveRad | null>(null);
  const [radLaedt, setRadLaedt] = useState(false);
  const [tafel, setTafel] = useState<LiveTafel | null>(null);
  const tafelRef = useRef(tafel);
  tafelRef.current = tafel;
  const tafelPlan = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tafelOffen = phase === "live" && Boolean(tafel?.an);
  const radOffen = phase === "live" && Boolean(rad);
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

  // Beim Verlassen der Seite endet das Live (und das Bild aus der Galerie verschwindet).
  useEffect(
    () => () => {
      if (idRef.current) liveBeenden(idRef.current);
      if (bildRef.current) liveBildDateiLoeschen(bildRef.current.pfad);
      if (tafelPlan.current) clearTimeout(tafelPlan.current);
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
    bildAufraeumen();
    radUndTafelWeg();
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
    pruefung.zuruecksetzen();
    radUndTafelWeg();
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

  // ------------------------------------------------------------------ Prüfung
  function pruefungOeffnen() {
    dialog("Live-Prüfung starten?", `${PRUEFUNG_FRAGEN} Fragen, ${PRUEFUNG_SEKUNDEN / 60} Minuten – alle schreiben gleichzeitig, wie in der echten Prüfung. Bestanden bis 10 Fehlerpunkte.`, [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Starten",
        onPress: async () => {
          const problem = await pruefung.starten();
          zeigeProblem(problem);
          if (!problem) erfolg();
        },
      },
    ]);
  }

  function pruefungBeenden() {
    const schreiben = pruefung.stand?.schreiben ?? 0;
    dialog("Prüfung jetzt beenden?", schreiben > 0 ? `${schreiben} ${schreiben === 1 ? "schreibt" : "schreiben"} noch – offene Fragen zählen dann als falsch.` : "Alle Abgaben werden jetzt gewertet.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Beenden", style: "destructive", onPress: () => pruefung.beenden().then(zeigeProblem) },
    ]);
  }

  async function zeitGeben(sekunden: number) {
    const problem = await pruefung.verlaengern(sekunden);
    if (problem) zeigeProblem(problem);
    else hinweis.zeigen({ icon: "time", text: `+${sekunden / 60} ${sekunden === 60 ? "Minute" : "Minuten"} für alle` });
  }

  // ------------------------------------------------------------------ Themenrad
  async function radStarten() {
    const id = idRef.current;
    if (!id || radLaedt) return;
    if (quiz.quiz?.status === "offen") {
      hinweis.zeigen({ icon: "flash", text: "Erst die laufende Frage auflösen" });
      return;
    }
    setRadLaedt(true);
    const r = await radDrehen(id);
    setRadLaedt(false);
    if ("fehler" in r) {
      zeigeProblem(r.fehler);
      return;
    }
    stoss();
    setRad(r.rad);
  }

  /** Frage aus dem Thema starten – das Rad geht zu, das Quiz kommt unten rein. */
  async function radFrage(thema: string) {
    const id = idRef.current;
    const frage = frageAusThema(thema, quiz.gefragt);
    if (!id || !frage) return;
    setRadLaedt(true);
    const problem = await quiz.starten(frage, 20);
    setRadLaedt(false);
    zeigeProblem(problem);
    if (problem) return;
    erfolg();
    setRad(null);
    radSchliessen(id);
  }

  function radZu() {
    const id = idRef.current;
    setRad(null);
    if (id) radSchliessen(id).then(zeigeProblem);
  }

  // ------------------------------------------------------------------ Tafel
  /** Änderung anwenden, sofort an alle schicken, kurz danach für Spätkommer sichern. */
  function tafelAendern(n: TafelNachricht) {
    const neu = tafelAnwenden(tafelRef.current, n);
    tafelRef.current = neu;
    setTafel(neu);
    steuerung.current?.tafel(tafelNachricht(n));
    const id = idRef.current;
    if (tafelPlan.current) clearTimeout(tafelPlan.current);
    if (!id) return;
    tafelPlan.current = setTimeout(() => {
      tafelPlan.current = null;
      tafelSichern(id, tafelRef.current).then(zeigeProblem);
    }, 400);
  }

  function tafelOeffnen() {
    const t = tafelRef.current;
    // Striche auf dem Bild bleiben beim erneuten Öffnen erhalten.
    if (t?.grund === "bild" && bildRef.current) {
      tafelAendern({ k: "t", an: true, g: "bild", s: t.striche });
      return;
    }
    tafelAendern({ k: "t", an: true, g: bildRef.current ? "bild" : "kreuzung", s: [] });
  }

  function tafelGrund(g: TafelGrund) {
    const t = tafelRef.current;
    if (!t?.striche.length) {
      tafelAendern({ k: "t", an: true, g, s: [] });
      return;
    }
    dialog("Zeichnung verwerfen?", "Beim Wechsel des Hintergrunds fängst du neu an.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Wechseln", style: "destructive", onPress: () => tafelAendern({ k: "t", an: true, g, s: [] }) },
    ]);
  }

  /** Fertig: Auf dem Bild bleiben die Striche liegen, Vorlagen verschwinden. */
  function tafelFertig() {
    const t = tafelRef.current;
    if (!t) return;
    tafelAendern({ k: "t", an: false, g: t.grund, s: t.grund === "bild" ? t.striche : [] });
  }

  /** Neues oder kein Bild: Striche auf dem alten Bild verschwinden (der Server macht es genauso). */
  function tafelBildWeg() {
    if (tafelRef.current?.grund !== "bild") return;
    tafelRef.current = null;
    setTafel(null);
    steuerung.current?.tafel(tafelNachricht({ k: "t", an: false, g: "leer" }));
  }

  function radUndTafelWeg() {
    if (tafelPlan.current) clearTimeout(tafelPlan.current);
    tafelPlan.current = null;
    tafelRef.current = null;
    setTafel(null);
    setRad(null);
  }

  // ------------------------------------------------------------------ Bild
  function bildSenden(b: LiveBild | null, zuverlaessig: boolean) {
    steuerung.current?.bild(bildNachricht(b), zuverlaessig);
  }

  function bildSichernSpaeter(b: LiveBild | null) {
    const id = idRef.current;
    if (bildPlan.current) clearTimeout(bildPlan.current);
    if (!id) return;
    bildPlan.current = setTimeout(() => {
      bildPlan.current = null;
      liveBildSichern(id, b);
    }, 500);
  }

  /** Live vorbei: Datei löschen (auf dem Server zählt nur ein laufendes Live). */
  function bildAufraeumen() {
    if (bildPlan.current) clearTimeout(bildPlan.current);
    const b = bildRef.current;
    if (b) liveBildDateiLoeschen(b.pfad);
    setBild(null);
  }

  async function bildHolen() {
    const id = idRef.current;
    if (!id || bildLaedt) return;
    setBildLaedt(true);
    try {
      const neu = await liveBildHochladen();
      if (!neu) return;
      // Gut ein Drittel so hoch wie der Kamerabereich, aber höchstens 80 % des Bildschirms breit.
      const g = Math.min(BILD_START.g, (0.8 * fensterBreite) / (bildBasis(videoZiel, fensterHoehe, bildOben) * neu.seite));
      const b: LiveBild = { ...BILD_START, g, ...neu };
      const alt = bildRef.current;
      if (bildPlan.current) clearTimeout(bildPlan.current);
      setBild(b);
      bildSenden(b, true);
      tafelBildWeg();
      erfolg();
      const problem = await liveBildSichern(id, b);
      if (problem) zeigeProblem(problem);
      if (alt) liveBildDateiLoeschen(alt.pfad);
    } catch (e) {
      zeigeProblem((e as Error).message || "Das Bild ließ sich nicht hochladen.");
    } finally {
      setBildLaedt(false);
    }
  }

  function bildEntfernen() {
    const alt = bildRef.current;
    if (!alt) return;
    stoss();
    setBild(null);
    bildSenden(null, true);
    tafelBildWeg();
    bildSichernSpaeter(null);
    liveBildDateiLoeschen(alt.pfad);
  }

  async function bildMenue() {
    if (!bildRef.current) {
      bildHolen();
      return;
    }
    const wahl = await auswahlBlatt("Bild im Live", [{ text: "Anderes Bild wählen" }, { text: "Bild entfernen", gefahr: true }]);
    if (wahl === 0) bildHolen();
    if (wahl === 1) bildEntfernen();
  }

  function bildBewegt(lage: BildLage) {
    const b = bildRef.current;
    if (b) bildSenden({ ...b, ...lage }, false);
  }

  function bildFertig(lage: BildLage) {
    const b = bildRef.current;
    if (!b) return;
    const neu = { ...b, ...lage };
    setBild(neu);
    bildSenden(neu, true);
    bildSichernSpaeter(neu);
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
    bildAufraeumen();
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
  // Sieben Werkzeuge passen auf kleinen Handys nur ohne Beschriftung.
  const eng = geteilt || fensterHoehe < 740;

  return (
    // Eigene Wurzel für Gesten: Die Seite ist ein Vollbild-Modal.
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000000" }}>
      <StatusBar style="light" />

      {/* Kamera – während Quiz oder Prüfung nur oben (bleibt dabei verbunden) */}
      <Reanimated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden" }, videoStil]}>
        {zeigtBuehne ? (
          <LiveBuehne
            key={zugang.token}
            url={zugang.url}
            token={zugang.token}
            senden
            style={{ flex: 1 }}
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
      </Reanimated.View>

      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 110 }} />
      {geteilt ? null : <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.62)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 380 }} />}

      {/* Bild aus der Galerie – klebt auf dem Video und wandert beim Teilen mit nach oben */}
      {zeigtBuehne ? (
        <LiveBildEbene
          bild={tafelOffen ? null : bild}
          striche={tafel?.grund === "bild" ? tafel.striche : null}
          flaeche={videoHoehe}
          oben={bildOben}
          bearbeitbar
          unten={Math.max(insets.bottom, 12)}
          onBewegt={bildBewegt}
          onFertig={bildFertig}
          onLoeschen={bildEntfernen}
        />
      ) : null}

      {/* Themenrad – alle sehen es gleichzeitig drehen */}
      {radOffen && rad ? (
        <ThemenRad
          rad={rad}
          gastgeber
          oben={insets.top + 56}
          unten={Math.max(insets.bottom, 12) + 8}
          beschaeftigt={radLaedt || quiz.beschaeftigt}
          onFrage={radFrage}
          onNochmal={radStarten}
          onSchliessen={radZu}
        />
      ) : null}

      {/* Tafel – malen auf das Bild oder eine Vorlage */}
      {tafelOffen && tafel ? (
        <TafelBuehne
          tafel={tafel}
          bild={bild}
          bearbeitbar
          oben={insets.top + 56}
          unten={Math.max(insets.bottom, 12) + 8}
          onZug={(z: Strich | null) => steuerung.current?.tafel(tafelNachricht({ k: "z", s: z ? { ...z, p: vereinfachen(z.p) } : { f: "#FFFFFF", p: [] } }))}
          onStrich={(z) => tafelAendern({ k: "f", s: z })}
          onRueckgaengig={() => tafelAendern({ k: "u" })}
          onLeeren={() =>
            dialog("Alles löschen?", "Alle Striche verschwinden – auch bei den Zuschauern.", [
              { text: "Abbrechen", style: "cancel" },
              { text: "Löschen", style: "destructive", onPress: () => tafelAendern({ k: "c" }) },
            ])
          }
          onGrund={tafelGrund}
          onFertig={tafelFertig}
        />
      ) : null}

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

      {/* Werkzeuge rechts: Kamera drehen, Mikrofon, Bild, Quiz, Prüfung, Rad, Tafel (geteilt nur als Symbole) */}
      {zeigtBuehne && !radOffen && !tafelOffen ? (
        <View style={{ position: "absolute", right: 12, top: insets.top + 70, gap: eng ? 10 : 14 }}>
          <Werkzeug kompakt={eng} icon="camera-reverse-outline" sf="arrow.triangle.2.circlepath.camera" label="Drehen" onPress={() => steuerung.current?.kameraWechseln().catch(() => {})} />
          <Werkzeug
            kompakt={eng}
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
          <Werkzeug kompakt={eng} icon="image-outline" sf="photo" label="Bild" laedt={bildLaedt} onPress={bildMenue} />
          {phase === "live" && !geteilt ? <Werkzeug kompakt={eng} icon="flash-outline" sf="bolt" label="Quiz" onPress={quizOeffnen} /> : null}
          {phase === "live" && !geteilt ? <Werkzeug kompakt={eng} icon="document-text-outline" sf="doc.text" label="Prüfung" onPress={pruefungOeffnen} /> : null}
          {phase === "live" && !geteilt ? <Werkzeug kompakt={eng} icon="aperture-outline" sf="chart.pie" label="Rad" laedt={radLaedt} onPress={radStarten} /> : null}
          {phase === "live" && !geteilt ? <Werkzeug kompakt={eng} icon="brush-outline" sf="pencil.tip.crop.circle" label="Tafel" onPress={tafelOeffnen} /> : null}
        </View>
      ) : null}

      {/* Quiz unten über die ganze Breite: Stimmen live, Auflösung, Rangliste */}
      {panelQuiz ? (
        <QuizGastgeberKarte
          quiz={panelQuiz}
          weg={!quizAn}
          unten={Math.max(insets.bottom, 12) + 8}
          zwischen={quiz.zwischen}
          beschaeftigt={quiz.beschaeftigt}
          onAufloesen={() => quiz.aufloesen().then(zeigeProblem)}
          onRangliste={() => quiz.rangliste().then(zeigeProblem)}
          onNaechste={() => setQuizWahl(true)}
          onSchliessen={quizSchliessen}
          onLayout={(e) => setPanelHoehe(e.nativeEvent.layout.height)}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
        />
      ) : null}

      {/* Prüfung unten: Live-Zähler, Zeit geben, vorzeitig beenden, danach Ergebnis */}
      {panelPruefung ? (
        <PruefungGastgeberBereich
          pruefung={pruefungAn && pruefung.pruefung ? pruefung.pruefung : panelPruefung}
          stand={pruefung.stand}
          beschaeftigt={pruefung.beschaeftigt}
          weg={!pruefungAn}
          unten={Math.max(insets.bottom, 12) + 8}
          onVerlaengern={zeitGeben}
          onBeenden={pruefungBeenden}
          onSchliessen={() => pruefung.schliessen().then(zeigeProblem)}
          onLayout={(e) => setPanelHoehe(e.nativeEvent.layout.height)}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
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

      {/* Live: Chat und eigene Nachrichten (während Quiz und Prüfung ausgeblendet) */}
      {phase === "live" && !geteilt && !radOffen && !tafelOffen ? (
        // box-none: Der leere Rand rechts gehört den Werkzeugen, nicht dem Chat.
        <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          <View pointerEvents="box-none" style={{ paddingHorizontal: 12, paddingBottom: Math.max(insets.bottom, 12) + 4, gap: 10 }}>
            <LiveChat nachrichten={nachrichten} gastgeberId={ich} onLangDruck={moderieren} style={{ maxHeight: 300, marginRight: 64 }} />
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
    </GestureHandlerRootView>
  );
}
