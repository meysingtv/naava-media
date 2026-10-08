import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { type MenueEintrag } from "@/components/aufklapp-menue";
import { auswahlBlatt } from "@/components/auswahl-blatt";
import { dialog } from "@/components/dialog";
import { Glas } from "@/components/glas";
import { HinweisAnzeige, useHinweis } from "@/components/hinweis";
import { Icon } from "@/components/icon";
import { Lader } from "@/components/lader";
import { LiveBildEbene } from "@/components/live-bild";
import { LiveBuehne } from "@/components/live-buehne";
import { PruefungZuschauerBereich } from "@/components/live-pruefung";
import { QUIZ_UEBERBLEND, QuizZuschauerKarte, quizSchluessel } from "@/components/live-quiz";
import { ThemenRad } from "@/components/live-rad";
import { TafelBuehne } from "@/components/live-tafel";
import { LiveChat, LiveEingabe, LiveRing, LiveSchild, LIVE_ROT, useHerzen, ZuschauerZahl } from "@/components/live";
import { Knopf } from "@/components/ui";
import { useDarfLive } from "@/lib/creator";
import { useDarstellung } from "@/lib/darstellung";
import { erfolg, tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import {
  liveAboSetzen,
  liveAboStatus,
  liveAnpinnen,
  liveMelden,
  liveNachrichtLoeschen,
  liveSchreiben,
  liveSofortBeenden,
  liveStummschalten,
  liveZugang,
  useLive,
  useLiveChat,
  type ChatNachricht,
  type LiveSteuerung,
  type LiveZugang,
  type ZugangFehler,
} from "@/lib/live";
import { bildAusNachricht, type LiveBild } from "@/lib/live-bild";
import { useLivePruefungZuschauer, type PruefungLage } from "@/lib/live-pruefung";
import { useQuizZuschauer, type QuizLage } from "@/lib/live-quiz";
import { radAktuell } from "@/lib/live-rad";
import { serverJetzt } from "@/lib/server-uhr";
import { tafelAnwenden, tafelAusNachricht, type LiveTafel, type Strich } from "@/lib/live-tafel";
import { useLiveXp } from "@/lib/live-xp";
import { leuchten, schrift } from "@/lib/theme";

// Das Live zum Zuschauen – als eigene Seite (Mitteilung „… ist jetzt live“)
// und eingebettet in Clips (Kategorie „Live“). Ohne laufendes Live: Hinweis,
// Mitteilung an/aus und für den Inhaber „Live gehen“. Stellt der Gastgeber eine
// Quizfrage oder startet eine Prüfung, teilt sich der Bildschirm: oben die
// Kamera (mit seinem Bild aus der Galerie), unten Quiz oder Prüfung – Chat und
// Herzen sind so lange weg. Mitspielen bringt XP. Dreht er das Themenrad, dreht
// es bei allen gleichzeitig; malt er an der Tafel, sieht man jeden Strich live.

const LIVE_VERLAUF = ["#FF5A5F", "#FF2D55", "#E0124A"] as const;

function RundTaste({ icon, sf, label, onPress, aktiv }: { icon: "close" | "notifications" | "notifications-outline"; sf: "xmark" | "bell.fill" | "bell"; label: string; onPress: () => void; aktiv?: boolean }) {
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
          <Icon name={icon} sf={sf} size={18} color={aktiv ? "#FFB27A" : "#FFFFFF"} weight="semibold" />
        </Glas>
      )}
    </Pressable>
  );
}

export function LiveAnsicht({
  oben,
  unten,
  aktiv,
  stumm,
  onSchliessen,
  liveId,
}: {
  /** Abstand oben für die Kopfzeile (Gastgeber, LIVE, Zuschauer). */
  oben: number;
  /** Abstand unten für Chat und Eingabe, z. B. über der Tab-Leiste. */
  unten: number;
  /** Verbunden nur, solange die Ansicht wirklich zu sehen ist. */
  aktiv: boolean;
  stumm?: boolean;
  /** Als eigene Seite: Schließen-Knopf oben rechts. */
  onSchliessen?: () => void;
  /** Genau dieses Live zeigen (bei zwei Lives); sonst das erste. */
  liveId?: string;
}) {
  const { live: erstes, alle, geladen } = useLive();
  const live = liveId ? (alle.find((l) => l.id === liveId) ?? null) : erstes;
  const { session } = useKonto();
  const rechte = useDarfLive();
  const ich = session?.user.id ?? null;
  const hinweis = useHinweis();
  const { ausloesen, herzen } = useHerzen();

  const [zugang, setZugang] = useState<LiveZugang | null>(null);
  const [fehler, setFehler] = useState<ZugangFehler | null>(null);
  const [versuch, setVersuch] = useState(0);
  const [warDabei, setWarDabei] = useState(false);
  const [zuschauer, setZuschauer] = useState(0);
  const [bildWeg, setBildWeg] = useState(true);
  const [langeWeg, setLangeWeg] = useState(false);
  const [abo, setAbo] = useState<boolean | null>(null);
  const steuerung = useRef<LiveSteuerung | null>(null);
  // Chat und Quiz nur, solange die Ansicht zu sehen ist (z. B. nicht unter der Sende-Seite).
  const nachrichten = useLiveChat(aktiv ? (live?.id ?? null) : null);
  const quiz = useQuizZuschauer(aktiv ? (live?.id ?? null) : null);
  const pruefung = useLivePruefungZuschauer(aktiv ? (live?.id ?? null) : null);
  const [quizWeg, setQuizWeg] = useState("");
  const [pruefungWeg, setPruefungWeg] = useState("");
  const { belohnungen } = useDarstellung();
  const { xpVon, quizBuchen, pruefungBuchen } = useLiveXp();
  // Die Ansicht füllt immer den ganzen Bildschirm (Clips und eigene Seite).
  const { height: hoehe } = useWindowDimensions();
  const verbunden = Boolean(live && aktiv && zugang);

  // Prüfung geht vor Quiz. Unten der Bereich, oben die Kamera; der Bereich bleibt
  // beim Ende kurz stehen, bis er hinausgeglitten ist.
  const pruefungSchluessel = pruefung.lage.pruefung ? `${pruefung.lage.pruefung.id}-${pruefung.lage.pruefung.status}` : "";
  const pruefungAn = Boolean(pruefung.lage.pruefung) && pruefungSchluessel !== pruefungWeg;
  const quizAn = !pruefungAn && Boolean(quiz.lage.quiz) && quizSchluessel(quiz.lage) !== quizWeg;
  const [panel, setPanel] = useState<QuizLage | null>(null);
  const [panelPruefung, setPanelPruefung] = useState<PruefungLage | null>(null);
  const [panelHoehe, setPanelHoehe] = useState(0);
  useEffect(() => {
    if (quizAn) {
      setPanel(quiz.lage);
      return;
    }
    const t = setTimeout(() => setPanel(null), 420);
    return () => clearTimeout(t);
  }, [quizAn, quiz.lage]);
  useEffect(() => {
    if (pruefungAn) {
      setPanelPruefung(pruefung.lage);
      return;
    }
    const t = setTimeout(() => setPanelPruefung(null), 420);
    return () => clearTimeout(t);
  }, [pruefungAn, pruefung.lage]);
  const geteilt = Boolean(panel || panelPruefung);
  // Das Video reicht bis in den weichen Übergang hinein; mindestens ein knappes Drittel
  // (bei der Prüfung ein Viertel) bleibt.
  const videoZiel = (quizAn || pruefungAn) && panelHoehe > 0 ? Math.max(hoehe * (pruefungAn ? 0.24 : 0.3), hoehe - panelHoehe + QUIZ_UEBERBLEND) : hoehe;
  const videoHoehe = useSharedValue(hoehe);
  useEffect(() => {
    videoHoehe.value = withTiming(videoZiel, { duration: 450, easing: Easing.out(Easing.cubic) });
  }, [videoZiel, videoHoehe]);
  const videoStil = useAnimatedStyle(() => ({ height: videoHoehe.value }));

  // XP fürs Mitspielen: Quizfrage nach der Auflösung, Prüfung nach der Abgabe.
  const qQuiz = quiz.lage.quiz;
  const qMein = quiz.lage.mein;
  useEffect(() => {
    if (qQuiz && qMein && qQuiz.status !== "offen") quizBuchen(qQuiz, qMein);
  }, [qQuiz, qMein, quizBuchen]);
  const pPruefung = pruefung.lage.pruefung;
  const pMein = pruefung.lage.mein;
  useEffect(() => {
    if (pPruefung && pMein?.abgegeben) pruefungBuchen(pPruefung, pMein);
  }, [pPruefung, pMein, pruefungBuchen]);

  // Bild des Gastgebers: Bewegungen kommen live über LiveKit, die letzte Lage
  // liegt auf dem Server (für alle, die später dazukommen). Kurz nach einer
  // Live-Bewegung zählt die – der Server-Stand kann noch der alte sein.
  const sb = live?.bild ?? null;
  const serverBild = useMemo<LiveBild | null>(() => (sb ? { pfad: sb.pfad, seite: sb.seite, x: sb.x, y: sb.y, g: sb.groesse } : null), [sb?.pfad, sb?.seite, sb?.x, sb?.y, sb?.groesse]); // eslint-disable-line react-hooks/exhaustive-deps
  const serverRef = useRef(serverBild);
  serverRef.current = serverBild;
  const funkZeit = useRef(0);
  const [bild, setBild] = useState<LiveBild | null>(serverBild);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const pruefen = () => {
      const warten = 2500 - (Date.now() - funkZeit.current);
      if (warten <= 0) setBild(serverRef.current);
      else t = setTimeout(pruefen, warten + 50);
    };
    pruefen();
    return () => clearTimeout(t);
  }, [serverBild]);
  const bildEmpfangen = useCallback((text: string) => {
    const b = bildAusNachricht(text);
    if (b === undefined) return;
    funkZeit.current = Date.now();
    setBild(b);
  }, []);
  // Themenrad: Stand vom Server (die Drehung selbst hängt nur an der Serverzeit).
  // Nach dem Stehen bleibt es höchstens 90 s – dafür einmal neu rechnen.
  const serverRad = live?.rad ?? null;
  const [radWeg, setRadWeg] = useState("");
  const [, setRadTakt] = useState(0);
  useEffect(() => {
    if (!radAktuell(serverRad)) return;
    const rest = Date.parse(serverRad.start) + serverRad.dauer * 1000 + 90_000 - serverJetzt();
    const t = setTimeout(() => setRadTakt((x) => x + 1), Math.max(1000, rest + 500));
    return () => clearTimeout(t);
  }, [serverRad?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const radZeigen = radAktuell(serverRad) && serverRad.id !== radWeg && !geteilt ? serverRad : null;

  // Tafel: Striche kommen live über LiveKit, der Stand liegt auf dem Server (für
  // alle, die später kommen). Wie beim Bild zählt kurz nach Funk der Funk.
  const tafelText = live?.tafel ? JSON.stringify(live.tafel) : "";
  const serverTafel = useMemo<LiveTafel | null>(() => (tafelText ? (JSON.parse(tafelText) as LiveTafel) : null), [tafelText]);
  const serverTafelRef = useRef(serverTafel);
  serverTafelRef.current = serverTafel;
  const tafelFunk = useRef(0);
  const [tafel, setTafel] = useState<LiveTafel | null>(serverTafel);
  const [tafelZug, setTafelZug] = useState<Strich | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const pruefen = () => {
      const warten = 3500 - (Date.now() - tafelFunk.current);
      if (warten <= 0) {
        setTafel(serverTafelRef.current);
        setTafelZug(null);
      } else t = setTimeout(pruefen, warten + 50);
    };
    pruefen();
    return () => clearTimeout(t);
  }, [serverTafel]);
  const tafelEmpfangen = useCallback((text: string) => {
    const n = tafelAusNachricht(text);
    if (!n) return;
    tafelFunk.current = Date.now();
    if (n.k === "z") {
      setTafelZug(n.s.p.length >= 2 ? n.s : null);
      return;
    }
    setTafelZug(null);
    setTafel((t) => tafelAnwenden(t, n));
  }, []);
  const tafelOffen = Boolean(tafel?.an) && !geteilt;

  const neuLaden = useCallback(() => {
    quiz.neuLaden();
    pruefung.neuLaden();
  }, [quiz.neuLaden, pruefung.neuLaden]); // eslint-disable-line react-hooks/exhaustive-deps

  // Zugang zu LiveKit holen, sobald ein Live läuft und die Ansicht zu sehen ist.
  useEffect(() => {
    if (!live?.id || !aktiv) {
      setZugang(null);
      return;
    }
    let laeuft = true;
    setFehler(null);
    liveZugang("zuschauen", live.id).then((z) => {
      if (!laeuft) return;
      if ("fehler" in z) setFehler(z.fehler);
      else {
        setZugang(z);
        setWarDabei(true);
      }
    });
    return () => {
      laeuft = false;
    };
  }, [live?.id, aktiv, versuch]);

  useEffect(() => {
    if (ich) liveAboStatus().then(setAbo);
    else setAbo(null);
  }, [ich]);

  // Bildschirm bleibt an, solange man zuschaut.
  useEffect(() => {
    if (!verbunden) return;
    activateKeepAwakeAsync("live").catch(() => {});
    return () => {
      deactivateKeepAwake("live").catch(() => {});
    };
  }, [verbunden]);

  // „Gleich zurück“ erst nach kurzer Pause zeigen – nicht bei jedem Ruckler.
  useEffect(() => {
    if (!bildWeg) {
      setLangeWeg(false);
      return;
    }
    const t = setTimeout(() => setLangeWeg(true), 2500);
    return () => clearTimeout(t);
  }, [bildWeg]);

  const name = live?.gastgeber?.name ?? "Fahrschul Pro";

  async function aboUmschalten() {
    if (!ich) {
      router.push("/anmelden");
      return;
    }
    const neu = !abo;
    try {
      const ergebnis = await liveAboSetzen(neu);
      if (ergebnis === "keine_erlaubnis") {
        dialog("Mitteilungen sind aus", "Erlaube Mitteilungen für Fahrschul Pro in den iPhone-Einstellungen, dann sagen wir dir Bescheid, wenn ein Live startet.");
        return;
      }
      setAbo(ergebnis);
      erfolg();
      hinweis.zeigen(ergebnis ? { icon: "notifications", text: "Wir sagen dir Bescheid, wenn ein Live startet" } : { icon: "notifications-off", text: "Keine Live-Mitteilungen mehr" });
    } catch (e) {
      hinweis.zeigen({ icon: "alert-circle", text: (e as Error).message, farbe: LIVE_ROT });
    }
  }

  async function schreiben(text: string): Promise<boolean> {
    if (!live) return false;
    const problem = await liveSchreiben(live.id, text);
    if (problem) {
      hinweis.zeigen({ icon: "alert-circle", text: problem, farbe: LIVE_ROT });
      return false;
    }
    return true;
  }

  async function langDruck(n: ChatNachricht) {
    if (!ich) return;
    // Inhaber in einem fremden Live (z. B. eines Creators): anpinnen, löschen, stummschalten
    if (rechte.inhaber && live) {
      const istAngepinnt = live.angepinnt?.id === n.id;
      const optionen: MenueEintrag[] = [
        istAngepinnt ? { text: "Nicht mehr anpinnen", icon: "pin-outline", sf: "pin.slash" } : { text: "Oben anpinnen", icon: "pin-outline", sf: "pin" },
        { text: "Nachricht löschen", icon: "trash-outline", sf: "trash", gefahr: true },
      ];
      if (n.user_id !== ich) optionen.push({ text: `${n.name} stummschalten`, icon: "volume-mute", sf: "speaker.slash", gefahr: true });
      const wahl = await auswahlBlatt(n.user_id === ich ? "Deine Nachricht" : `Nachricht von ${n.name}`, optionen);
      let problem: string | null = null;
      if (wahl === 0) problem = await liveAnpinnen(live.id, istAngepinnt ? null : n.id);
      if (wahl === 1) problem = await liveNachrichtLoeschen(n.id);
      if (wahl === 2) problem = await liveStummschalten(n.user_id, true);
      if (problem) hinweis.zeigen({ icon: "alert-circle", text: problem, farbe: LIVE_ROT });
      return;
    }
    if (n.user_id === ich) {
      const wahl = await auswahlBlatt("Deine Nachricht", [{ text: "Löschen", icon: "trash-outline", sf: "trash", gefahr: true }]);
      if (wahl === 0) {
        const problem = await liveNachrichtLoeschen(n.id);
        if (problem) hinweis.zeigen({ icon: "alert-circle", text: problem, farbe: LIVE_ROT });
      }
      return;
    }
    const wahl = await auswahlBlatt(`Nachricht von ${n.name}`, [{ text: "Melden", icon: "flag-outline", sf: "flag", gefahr: true }]);
    if (wahl === 0) {
      const problem = await liveMelden(n.id, "Live-Chat");
      hinweis.zeigen(problem ? { icon: "alert-circle", text: problem, farbe: LIVE_ROT } : { icon: "flag", text: "Danke, wir schauen uns das an" });
    }
  }

  /** Inhaber: Live eines Creators sofort beenden (Status und LiveKit-Raum). */
  function fremdesLiveBeenden() {
    if (!live) return;
    const id = live.id;
    dialog(`Live von ${name} beenden?`, "Das Live endet sofort – für den Creator und alle Zuschauer.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Live beenden",
        style: "destructive",
        onPress: async () => {
          const problem = await liveSofortBeenden({ live: id });
          hinweis.zeigen(problem ? { icon: "alert-circle", text: problem, farbe: LIVE_ROT } : { icon: "checkmark-circle", text: "Live beendet" });
        },
      },
    ]);
  }

  const schliessen = onSchliessen ? (
    <View style={{ position: "absolute", top: oben, right: 14, zIndex: 2 }}>
      <RundTaste icon="close" sf="xmark" label="Schließen" onPress={onSchliessen} />
    </View>
  ) : null;

  // ------------------------------------------------------------- lädt
  if (!geladen || (live && aktiv && !zugang && !fehler)) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" }}>
        <Lader color="#FFFFFF" />
        {schliessen}
      </View>
    );
  }

  // --------------------------------------------------------- ohne Live
  if (!live || fehler) {
    let titel = warDabei ? "Das Live ist vorbei" : "Gerade ist niemand live";
    let text = warDabei
      ? `Danke fürs Zuschauen! ${name} ist bald wieder da.`
      : rechte.darf
        ? "Starte ein Live – alle mit eingeschalteter Mitteilung bekommen Bescheid."
        : "Schalte die Mitteilung ein – dann bekommst du Bescheid, sobald es losgeht.";
    if (fehler === "nicht_eingerichtet") {
      titel = "Live ist noch nicht eingerichtet";
      text = "Sobald der Live-Stream auf dem Server eingerichtet ist, kannst du hier zuschauen.";
    } else if (fehler === "verbindung") {
      titel = "Das Live lädt gerade nicht";
      text = "Prüfe deine Internetverbindung und versuche es nochmal.";
    }
    return (
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        <LinearGradient colors={["#2A0A12", "#000000"]} locations={[0, 0.7]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        {schliessen}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 34, paddingTop: oben, paddingBottom: unten, gap: 10 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(255,45,85,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
            <Icon name="radio-outline" sf="dot.radiowaves.left.and.right" size={36} color={LIVE_ROT} />
          </View>
          <Text style={{ ...schrift.titelFett, fontSize: 22, color: "#FFFFFF", textAlign: "center" }}>{titel}</Text>
          <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 21, color: "#AEB3BA", textAlign: "center" }}>{text}</Text>
          <View style={{ alignSelf: "stretch", gap: 10, marginTop: 18 }}>
            {fehler === "verbindung" ? <Knopf titel="Nochmal versuchen" onPress={() => setVersuch((v) => v + 1)} /> : null}
            {rechte.darf && fehler !== "nicht_eingerichtet" ? (
              <Pressable
                onPress={() => {
                  tippen();
                  router.push("/live-senden");
                }}
                accessibilityRole="button"
                accessibilityLabel="Live gehen"
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }, leuchten(LIVE_ROT, 0.5, 18, 4)]}
              >
                <LinearGradient colors={LIVE_VERLAUF} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 56, borderRadius: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <Icon name="radio" sf="dot.radiowaves.left.and.right" size={21} color="#FFFFFF" />
                  <Text style={{ ...schrift.textFett, fontSize: 17, color: "#FFFFFF" }}>Live gehen</Text>
                </LinearGradient>
              </Pressable>
            ) : null}
            {!rechte.inhaber && fehler !== "nicht_eingerichtet" ? (
              ich ? (
                <Knopf
                  titel={abo ? "Live-Mitteilung ist an" : "Bei Lives Bescheid geben"}
                  icon={abo ? "notifications" : "notifications-outline"}
                  art={abo ? "sekundaer" : undefined}
                  onPress={aboUmschalten}
                />
              ) : (
                <Knopf titel="Anmelden für Live-Mitteilungen" art="sekundaer" onPress={() => router.push("/anmelden")} />
              )
            ) : null}
            {/* Selbst live gehen: als Creator bewerben (Inhaber und Creator brauchen das nicht) */}
            {!rechte.darf && fehler !== "nicht_eingerichtet" ? (
              <Pressable
                onPress={() => {
                  tippen();
                  router.push(ich ? "/creator-bewerbung" : "/anmelden");
                }}
                accessibilityRole="button"
                hitSlop={8}
                style={{ alignSelf: "center", paddingVertical: 8 }}
              >
                <Text style={{ ...schrift.textHalb, fontSize: 14, color: "#FFB27A" }}>Selbst live gehen? Als Creator bewerben</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <HinweisAnzeige wert={hinweis.wert} inhalt={hinweis.inhalt} oben={oben + 52} />
      </View>
    );
  }

  // --------------------------------------------------------------- im Live
  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      {/* Video – während Quiz oder Prüfung nur oben (bleibt dabei verbunden) */}
      <Reanimated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden" }, videoStil]}>
        {verbunden && zugang ? (
          <LiveBuehne
            url={zugang.url}
            token={zugang.token}
            senden={false}
            stumm={stumm}
            style={{ flex: 1 }}
            onZuschauer={setZuschauer}
            onHerz={ausloesen}
            onBildWeg={setBildWeg}
            onQuiz={neuLaden}
            onBild={bildEmpfangen}
            onTafel={tafelEmpfangen}
            onSteuerung={(s) => (steuerung.current = s)}
            onVerbindung={(s) => {
              if (s === "fehler") setFehler("verbindung");
            }}
          />
        ) : null}

        {/* Pause des Gastgebers */}
        {langeWeg ? (
          <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: "rgba(0,0,0,0.55)" }}>
            <LiveRing gastgeber={live.gastgeber} groesse={78} />
            <Text style={{ ...schrift.titelFett, fontSize: 18, color: "#FFFFFF" }}>{name} ist gleich zurück</Text>
          </View>
        ) : null}
      </Reanimated.View>

      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: oben + 100 }} />
      {geteilt ? null : <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: unten + 340 }} />}

      {/* Bild aus der Galerie des Gastgebers – wandert beim Teilen mit der Kamera nach oben */}
      {verbunden && !langeWeg ? (
        <LiveBildEbene bild={tafelOffen ? null : bild} striche={tafel?.grund === "bild" ? tafel.striche : null} flaeche={videoHoehe} oben={oben + 48} />
      ) : null}

      {/* Tafel des Gastgebers – darunter bleibt der Chat */}
      {verbunden && tafelOffen && tafel && !radZeigen ? <TafelBuehne tafel={tafel} bild={bild} zug={tafelZug} bearbeitbar={false} oben={oben + 48} unten={unten + 196} name={name} /> : null}

      {/* Themenrad – dreht bei allen gleichzeitig */}
      {verbunden && radZeigen ? <ThemenRad rad={radZeigen} gastgeber={false} oben={oben + 48} unten={unten + 8} onSchliessen={() => setRadWeg(radZeigen.id)} /> : null}

      {/* Kopf: Gastgeber, LIVE, Zuschauer, Mitteilung, Schließen */}
      <View style={{ position: "absolute", top: oben, left: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Glas style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 3, paddingRight: 12, height: 44, borderRadius: 22, flexShrink: 1 }}>
          <LiveRing gastgeber={live.gastgeber} groesse={30} />
          <View style={{ flexShrink: 1 }}>
            <Text style={{ ...schrift.textFett, fontSize: 14, color: "#FFFFFF" }} numberOfLines={1}>
              {name}
            </Text>
            {live.titel ? (
              <Text style={{ ...schrift.textMittel, fontSize: 11.5, color: "rgba(255,255,255,0.75)" }} numberOfLines={1}>
                {live.titel}
              </Text>
            ) : null}
          </View>
        </Glas>
        <LiveSchild />
        <ZuschauerZahl anzahl={zuschauer} />
        <View style={{ flex: 1 }} />
        {rechte.inhaber && live.gastgeber?.id && live.gastgeber.id !== ich ? (
          <Pressable
            onPress={() => {
              tippen();
              fremdesLiveBeenden();
            }}
            accessibilityRole="button"
            accessibilityLabel="Live beenden"
            hitSlop={6}
          >
            {({ pressed }) => (
              <Glas interaktiv style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: "center", opacity: pressed ? 0.8 : 1 }}>
                <Text style={{ ...schrift.textFett, fontSize: 13.5, color: "#FF6B85" }}>Beenden</Text>
              </Glas>
            )}
          </Pressable>
        ) : null}
        {ich ? <RundTaste icon={abo ? "notifications" : "notifications-outline"} sf={abo ? "bell.fill" : "bell"} label={abo ? "Live-Mitteilungen aus" : "Bei Lives Bescheid geben"} aktiv={Boolean(abo)} onPress={aboUmschalten} /> : null}
        {onSchliessen ? <RundTaste icon="close" sf="xmark" label="Schließen" onPress={onSchliessen} /> : null}
      </View>

      {panelPruefung ? (
        // Prüfung unten über die ganze Breite – Chat und Herzen sind so lange weg.
        <PruefungZuschauerBereich
          lage={pruefungAn ? pruefung.lage : panelPruefung}
          weg={!pruefungAn}
          unten={unten}
          ichId={ich}
          xp={belohnungen ? xpVon("pruefung", panelPruefung.pruefung?.id) : null}
          onSpeichern={pruefung.speichern}
          onAbgeben={pruefung.abgeben}
          onAnmelden={() => router.push("/anmelden")}
          onAusblenden={() => setPruefungWeg(pruefungSchluessel)}
          onFehler={(text) => hinweis.zeigen({ icon: "alert-circle", text, farbe: LIVE_ROT })}
          onLayout={(e) => setPanelHoehe(e.nativeEvent.layout.height)}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
        />
      ) : panel ? (
        // Quiz unten über die ganze Breite – Chat und Herzen sind so lange weg.
        <QuizZuschauerKarte
          lage={panel}
          weg={!quizAn}
          unten={unten}
          ichId={ich}
          xp={belohnungen ? xpVon("quiz", panel.quiz?.id) : null}
          onAntworten={quiz.antworten}
          onAnmelden={() => router.push("/anmelden")}
          onAusblenden={() => setQuizWeg(quizSchluessel(quiz.lage))}
          onFehler={(text) => hinweis.zeigen({ icon: "alert-circle", text, farbe: LIVE_ROT })}
          onLayout={(e) => setPanelHoehe(e.nativeEvent.layout.height)}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
        />
      ) : radZeigen ? null : (
        // Chat und Eingabe (unter der Tafel niedriger)
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
          <View style={{ paddingHorizontal: 12, paddingBottom: unten, gap: 10 }}>
            <LiveChat
              nachrichten={nachrichten}
              gastgeberId={live.gastgeber?.id}
              onLangDruck={ich ? langDruck : undefined}
              angepinnt={live.angepinnt ?? null}
              onLoesen={
                rechte.inhaber
                  ? () =>
                      liveAnpinnen(live.id, null).then((problem) => {
                        if (problem) hinweis.zeigen({ icon: "alert-circle", text: problem, farbe: LIVE_ROT });
                      })
                  : undefined
              }
              style={{ maxHeight: tafelOffen ? 130 : 260, marginRight: 64 }}
            />
            <LiveEingabe
              angemeldet={Boolean(ich)}
              onSenden={schreiben}
              onHerz={() => {
                ausloesen();
                steuerung.current?.herz();
              }}
              onAnmelden={() => router.push("/anmelden")}
              herzen={herzen}
            />
          </View>
        </KeyboardAvoidingView>
      )}

      <HinweisAnzeige wert={hinweis.wert} inhalt={hinweis.inhalt} oben={oben + 52} />
    </View>
  );
}
