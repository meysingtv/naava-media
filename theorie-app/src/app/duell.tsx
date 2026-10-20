import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Avatar, Chip, kartenFlaeche, kopfOben, T } from "@/components/ui";
import { FrageAnsicht, useAntwortReihenfolge } from "@/components/frage-ansicht";
import { AktionsLeiste, FrageKopf, GlasRund, HauptKnopf, KopfPille, NebenKnopf } from "@/components/frage-rahmen";
import { Seite } from "@/components/seite";
import { dialog } from "@/components/dialog";
import { DUELL_RUNDEN, DUELL_SEKUNDEN, gegnerVon } from "@/lib/duell";
import { antwortRichtig, frageVon, FRAGEN } from "@/lib/fragen";
import { useDarstellung } from "@/lib/darstellung";
import { erfolg, fehler, stoss } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { gemischt, useStand } from "@/lib/stand";
import { abstand, farben, leuchten, mitDeckkraft, RAND, schrift } from "@/lib/theme";
import { useZurueckTaste } from "@/lib/zurueck-taste";

type Phase = "intro" | "runde" | "ende";
type Ende = { ergebnis: "sieg" | "remis" | "niederlage"; xp: number; rating: number };

function Spieler({ name, farbe, punkte, status, rechts }: { name: string; farbe?: string; punkte: number; status: string; rechts?: boolean }) {
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
  const { belohnungen, farbwelt: f } = useDarstellung();
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
  const reihenfolge = useAntwortReihenfolge();
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
    dialog("Duell aufgeben?", "Ein abgebrochenes Duell wird nicht gewertet.", [
      { text: "Weiterspielen", style: "cancel" },
      { text: "Aufgeben", style: "destructive", onPress: () => router.back() },
    ]);
  }

  useZurueckTaste(schliessen);

  // ------------------------------------------------------------------ Intro
  if (phase === "intro") {
    const links = intro.interpolate({ inputRange: [0, 1], outputRange: [-220, 0] });
    const rechts = intro.interpolate({ inputRange: [0, 1], outputRange: [220, 0] });
    return (
      <Seite>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: RAND, gap: abstand(10) }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Animated.View style={{ alignItems: "center", gap: abstand(3), transform: [{ translateX: links }] }}>
            <Avatar name={ichName} groesse={84} />
            <T v="h3">{ichName}</T>
          </Animated.View>
          <Animated.View style={{ opacity: intro, transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [2, 1] }) }] }}>
            <T v="display" farbe={f.orange} style={{ fontSize: 44, lineHeight: 50, textShadowColor: mitDeckkraft(f.orange, 0.55), textShadowRadius: 18 }}>
              VS
            </T>
          </Animated.View>
          <Animated.View style={{ alignItems: "center", gap: abstand(3), transform: [{ translateX: rechts }] }}>
            <Avatar name={gegner.name} groesse={84} farbe={gegner.farbe} />
            <T v="h3">{gegner.name}</T>
          </Animated.View>
        </View>
        <Animated.View style={{ opacity: intro, alignItems: "center", gap: abstand(1) }}>
          <T v="mini" farbe={f.orange}>
            Duell
          </T>
          <T v="text" zentriert>
            {fragen.length} Fragen · je {DUELL_SEKUNDEN} Sekunden
          </T>
        </Animated.View>
      </View>
      </Seite>
    );
  }

  // ------------------------------------------------------------------ Ende
  if (phase === "ende" && ende) {
    const titel = ende.ergebnis === "sieg" ? "Sieg!" : ende.ergebnis === "remis" ? "Unentschieden." : "Knapp daneben.";
    const farbe = ende.ergebnis === "sieg" ? (f.hell ? "#23A548" : "#4ED053") : ende.ergebnis === "remis" ? (f.hell ? "#4D535B" : "#D3D7DC") : f.hell ? "#E5392C" : "#FF5A4E";
    return (
      <Seite>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: RAND, gap: abstand(6) }}>
          <View style={{ alignItems: "center", gap: abstand(3) }}>
            <View style={[{ width: 92, height: 92, borderRadius: 46, backgroundColor: mitDeckkraft(farbe, 0.14), borderWidth: 1, borderColor: mitDeckkraft(farbe, 0.35), alignItems: "center", justifyContent: "center" }, leuchten(farbe, 0.3, 18, 0)]}>
              <Icon name={ende.ergebnis === "sieg" ? "trophy" : ende.ergebnis === "remis" ? "git-compare" : "flag"} size={38} color={farbe} />
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
            {belohnungen ? <Chip text={`+${ende.xp} XP`} icon="flash" farbe={f.orange} /> : null}
            <Chip text={`Rating ${ende.rating >= 0 ? "+" : ""}${ende.rating}`} icon="trending-up" farbe={ende.rating >= 0 ? farben.gruen : farben.rot} />
          </View>
        </View>
        <AktionsLeiste unten={insets.bottom}>
          <NebenKnopf titel="Zur Liga" onPress={() => router.back()} style={{ flex: 1 }} />
          <HauptKnopf titel="Revanche" icon="refresh" onPress={() => router.replace({ pathname: "/duell", params: { gegner: gegner.id } })} style={{ flex: 1.4 }} />
        </AktionsLeiste>
      </View>
      </Seite>
    );
  }

  // ------------------------------------------------------------------ Runde
  const frage = frageVon(fragen[runde]);
  if (!frage) return null;
  const gesperrt = meins !== null;

  return (
    <Seite>
      <FrageKopf
        oben={kopfOben(insets.top)}
        links={<GlasRund icon="close" label="Duell aufgeben" onPress={schliessen} />}
        rechts={null}
        titel={`Runde ${runde + 1} von ${fragen.length}`}
        unter={<KopfPille icon="flash" text={`Duell gegen ${gegner.name}`} />}
      />

      {/* Anzeigetafel */}
      <View style={[{ marginHorizontal: RAND, marginTop: abstand(1), padding: abstand(4), borderRadius: 24, gap: abstand(4) }, kartenFlaeche(f)]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Spieler name={ichName} punkte={punkte.ich} status={aufgedeckt ? (meins ? "richtig" : "falsch") : gesperrt ? "abgegeben" : "am Zug"} />
          <T v="h3" farbe={f.orange} style={{ ...schrift.titel, marginHorizontal: abstand(2) }}>
            VS
          </T>
          <Spieler
            name={gegner.name}
            farbe={gegner.farbe}
            punkte={punkte.bot}
            status={aufgedeckt ? (bot ? "richtig" : "falsch") : bot !== null ? "hat geantwortet" : "denkt nach …"}
            rechts
          />
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: f.hell ? "rgba(20,23,27,0.08)" : farben.flaeche3, overflow: "hidden" }}>
          <Animated.View
            style={{
              height: "100%",
              borderRadius: 3,
              backgroundColor: f.orange,
              width: zeit.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            }}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(4), paddingBottom: abstand(8) }} showsVerticalScrollIndicator={false}>
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
          reihenfolge={reihenfolge(frage)}
        />
      </ScrollView>

      <AktionsLeiste unten={insets.bottom}>
        <HauptKnopf
          titel={aufgedeckt ? (runde + 1 < fragen.length ? "Nächste Runde …" : "Auswertung …") : gesperrt ? `Warte auf ${gegner.name} …` : "Antwort abgeben"}
          deaktiviert={gesperrt || auswahl.length === 0}
          onPress={abgeben}
          style={{ flex: 1 }}
        />
      </AktionsLeiste>
    </Seite>
  );
}
