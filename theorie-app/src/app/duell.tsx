import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, Chip, Knopf, T } from "@/components/ui";
import { FrageAnsicht } from "@/components/frage-ansicht";
import { DUELL_RUNDEN, DUELL_SEKUNDEN, gegnerVon } from "@/lib/duell";
import { antwortRichtig, frageVon, FRAGEN } from "@/lib/fragen";
import { erfolg, fehler, stoss } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { gemischt, useStand } from "@/lib/stand";
import { abstand, farben, radius, RAND, schrift } from "@/lib/theme";

type Phase = "intro" | "runde" | "ende";
type Ende = { ergebnis: "sieg" | "remis" | "niederlage"; xp: number; rating: number };

function Seite({ name, farbe, punkte, status, rechts }: { name: string; farbe?: string; punkte: number; status: string; rechts?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: rechts ? "flex-end" : "flex-start", gap: abstand(2) }}>
      <View style={{ flexDirection: rechts ? "row-reverse" : "row", alignItems: "center", gap: abstand(2.5) }}>
        <Avatar name={name} groesse={40} farbe={farbe} />
        <T v="zahl">{punkte}</T>
      </View>
      <View style={{ alignItems: rechts ? "flex-end" : "flex-start" }}>
        <T v="textStark" numberOfLines={1}>
          {name}
        </T>
        <T v="klein" style={{ fontSize: 12 }}>
          {status}
        </T>
      </View>
    </View>
  );
}

export default function Duell() {
  const { gegner: gegnerId } = useLocalSearchParams<{ gegner?: string }>();
  const gegner = gegnerVon(gegnerId);
  const insets = useSafeAreaInsets();
  const { antwort, duellFertig } = useStand();
  const { anzeigeName } = useKonto();
  const ichName = anzeigeName.split(" ")[0];

  const [fragen] = useState(() =>
    gemischt(FRAGEN.filter((f) => f.art === "auswahl"))
      .slice(0, DUELL_RUNDEN)
      .map((f) => f.id),
  );
  const [phase, setPhase] = useState<Phase>("intro");
  const [runde, setRunde] = useState(0);
  const [auswahl, setAuswahl] = useState<number[]>([]);
  const [meins, setMeins] = useState<boolean | null>(null);
  const [bot, setBot] = useState<boolean | null>(null);
  const [aufgedeckt, setAufgedeckt] = useState(false);
  const [punkte, setPunkte] = useState({ ich: 0, bot: 0 });
  const [ende, setEnde] = useState<Ende | null>(null);

  const zeit = useRef(new Animated.Value(1)).current;
  const intro = useRef(new Animated.Value(0)).current;
  const auswahlRef = useRef(auswahl);
  auswahlRef.current = auswahl;
  const meinsRef = useRef(meins);
  meinsRef.current = meins;

  // Intro: Gegner fahren von links und rechts ein.
  useEffect(() => {
    stoss();
    const a = Animated.sequence([
      Animated.timing(intro, { toValue: 1, duration: 650, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.delay(1100),
    ]);
    a.start(() => setPhase("runde"));
    return () => a.stop();
  }, [intro]);

  const abgeben = useCallback(() => {
    if (meinsRef.current !== null) return;
    const f = frageVon(fragen[runde]);
    if (!f) return;
    const ok = antwortRichtig(f, auswahlRef.current, "");
    meinsRef.current = ok;
    setMeins(ok);
    antwort(f.id, ok);
  }, [fragen, runde, antwort]);

  // Runde: Zeit läuft, Gegner antwortet nach einer zufälligen Bedenkzeit.
  useEffect(() => {
    if (phase !== "runde") return;
    setAuswahl([]);
    setMeins(null);
    meinsRef.current = null;
    setBot(null);
    setAufgedeckt(false);
    zeit.setValue(1);
    const lauf = Animated.timing(zeit, { toValue: 0, duration: DUELL_SEKUNDEN * 1000, easing: Easing.linear, useNativeDriver: false });
    lauf.start();
    const [von, bis] = gegner.tempo;
    const botZeit = setTimeout(() => setBot(Math.random() < gegner.quote), (von + Math.random() * (bis - von)) * 1000);
    const ablauf = setTimeout(abgeben, DUELL_SEKUNDEN * 1000);
    return () => {
      lauf.stop();
      clearTimeout(botZeit);
      clearTimeout(ablauf);
    };
  }, [phase, runde, gegner, zeit, abgeben]);

  // Beide haben geantwortet: auflösen, Punkte zählen, weiter.
  useEffect(() => {
    if (phase !== "runde" || meins === null || bot === null || aufgedeckt) return;
    zeit.stopAnimation();
    setAufgedeckt(true);
    if (meins) erfolg();
    else fehler();
    const neu = { ich: punkte.ich + (meins ? 1 : 0), bot: punkte.bot + (bot ? 1 : 0) };
    setPunkte(neu);
    const t = setTimeout(() => {
      if (runde + 1 < fragen.length) {
        setRunde(runde + 1);
        return;
      }
      const ergebnis = neu.ich > neu.bot ? "sieg" : neu.ich === neu.bot ? "remis" : "niederlage";
      const r = duellFertig(ergebnis, gegner.rating);
      setEnde({ ergebnis, xp: r.xp, rating: r.rating });
      setPhase("ende");
    }, 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meins, bot, phase]);

  function schliessen() {
    if (phase === "ende") {
      router.back();
      return;
    }
    Alert.alert("Duell aufgeben?", "Ein abgebrochenes Duell wird nicht gewertet.", [
      { text: "Weiterspielen", style: "cancel" },
      { text: "Aufgeben", style: "destructive", onPress: () => router.back() },
    ]);
  }

  // ------------------------------------------------------------------ Intro
  if (phase === "intro") {
    const links = intro.interpolate({ inputRange: [0, 1], outputRange: [-220, 0] });
    const rechts = intro.interpolate({ inputRange: [0, 1], outputRange: [220, 0] });
    return (
      <View style={{ flex: 1, backgroundColor: farben.grund, justifyContent: "center", paddingHorizontal: RAND, gap: abstand(10) }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Animated.View style={{ alignItems: "center", gap: abstand(3), transform: [{ translateX: links }] }}>
            <Avatar name={ichName} groesse={84} />
            <T v="h3">{ichName}</T>
          </Animated.View>
          <Animated.View style={{ opacity: intro, transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [2, 1] }) }] }}>
            <T v="display" farbe={farben.orange} style={{ fontSize: 40 }}>
              VS
            </T>
          </Animated.View>
          <Animated.View style={{ alignItems: "center", gap: abstand(3), transform: [{ translateX: rechts }] }}>
            <Avatar name={gegner.name} groesse={84} farbe={gegner.farbe} />
            <T v="h3">{gegner.name}</T>
          </Animated.View>
        </View>
        <Animated.View style={{ opacity: intro, alignItems: "center", gap: abstand(1) }}>
          <T v="mini" farbe={farben.orange}>
            Duell
          </T>
          <T v="text" zentriert>
            {fragen.length} Fragen · je {DUELL_SEKUNDEN} Sekunden
          </T>
        </Animated.View>
      </View>
    );
  }

  // ------------------------------------------------------------------ Ende
  if (phase === "ende" && ende) {
    const titel = ende.ergebnis === "sieg" ? "Sieg!" : ende.ergebnis === "remis" ? "Unentschieden." : "Knapp daneben.";
    const farbe = ende.ergebnis === "sieg" ? farben.gruen : ende.ergebnis === "remis" ? farben.text2 : farben.rot;
    return (
      <View style={{ flex: 1, backgroundColor: farben.grund, paddingTop: insets.top }}>
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: RAND, gap: abstand(6) }}>
          <View style={{ alignItems: "center", gap: abstand(3) }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: farbe + "22", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={ende.ergebnis === "sieg" ? "trophy" : ende.ergebnis === "remis" ? "git-compare" : "flag"} size={38} color={farbe} />
            </View>
            <T v="display" farbe={farbe}>
              {titel}
            </T>
            <T v="zahl" style={{ fontSize: 44, lineHeight: 50 }}>
              {punkte.ich} : {punkte.bot}
            </T>
            <T v="klein">
              {ichName} gegen {gegner.name}
            </T>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: abstand(2) }}>
            <Chip text={`+${ende.xp} XP`} icon="flash" farbe={farben.orange} />
            <Chip text={`Rating ${ende.rating >= 0 ? "+" : ""}${ende.rating}`} icon="trending-up" farbe={ende.rating >= 0 ? farben.gruen : farben.rot} />
          </View>
        </View>
        <View style={{ paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(3), gap: abstand(3) }}>
          <Knopf titel="Revanche" icon="refresh" onPress={() => router.replace({ pathname: "/duell", params: { gegner: gegner.id } })} />
          <Knopf titel="Zurück zur Liga" art="sekundaer" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  // ------------------------------------------------------------------ Runde
  const frage = frageVon(fragen[runde]);
  if (!frage) return null;
  const gesperrt = meins !== null;

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <View style={{ paddingTop: insets.top + abstand(2), paddingHorizontal: RAND - 6, flexDirection: "row", alignItems: "center" }}>
        <Pressable onPress={schliessen} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="close" size={26} color={farben.text} />
        </Pressable>
        <T v="klein" style={{ flex: 1, textAlign: "center", marginRight: 40 }}>
          Runde {runde + 1} von {fragen.length}
        </T>
      </View>

      {/* Anzeigetafel */}
      <View style={{ marginHorizontal: RAND, marginTop: abstand(2), padding: abstand(4), borderRadius: radius.l, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie, gap: abstand(4) }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Seite name={ichName} punkte={punkte.ich} status={aufgedeckt ? (meins ? "richtig" : "falsch") : gesperrt ? "abgegeben" : "am Zug"} />
          <T v="h3" farbe={farben.orange} style={{ fontFamily: schrift.titel, marginHorizontal: abstand(2) }}>
            VS
          </T>
          <Seite
            name={gegner.name}
            farbe={gegner.farbe}
            punkte={punkte.bot}
            status={aufgedeckt ? (bot ? "richtig" : "falsch") : bot !== null ? "hat geantwortet" : "denkt nach …"}
            rechts
          />
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: farben.flaeche3, overflow: "hidden" }}>
          <Animated.View
            style={{
              height: "100%",
              borderRadius: 3,
              backgroundColor: farben.orange,
              width: zeit.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            }}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(5), paddingBottom: abstand(8) }}>
        <FrageAnsicht
          frage={frage}
          auswahl={auswahl}
          onAuswahl={(a) => {
            if (!gesperrt) setAuswahl(a);
          }}
          eingabe=""
          onEingabe={() => {}}
          aufgedeckt={aufgedeckt}
          ohneErklaerung
          kompakt
        />
      </ScrollView>

      <View style={{ paddingHorizontal: RAND, paddingTop: abstand(3), paddingBottom: insets.bottom + abstand(3), borderTopWidth: 1, borderColor: farben.linie }}>
        <Knopf
          titel={aufgedeckt ? (runde + 1 < fragen.length ? "Nächste Runde …" : "Auswertung …") : gesperrt ? `Warte auf ${gegner.name} …` : "Antwort abgeben"}
          deaktiviert={gesperrt || auswahl.length === 0}
          onPress={abgeben}
        />
      </View>
    </View>
  );
}
