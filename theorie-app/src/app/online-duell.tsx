import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Easing, Pressable, ScrollView, Share, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar, Chip, Knopf, Kopf, T } from "@/components/ui";
import { FrageAnsicht } from "@/components/frage-ansicht";
import { antwortRichtig, frageVon } from "@/lib/fragen";
import { erfolg, fehler, stoss } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { duellLaden, ergebnisMelden, ONLINE_SEKUNDEN, sicht, type DuellMitNamen, type OnlineDuell } from "@/lib/online-duell";
import { useStand } from "@/lib/stand";
import { abstand, farben, radius, RAND, schrift } from "@/lib/theme";

type Phase = "laden" | "start" | "runde" | "senden" | "ende";

export default function OnlineDuellSeite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { session, anzeigeName } = useKonto();
  const { antwort } = useStand();
  const ich = session?.user.id ?? "";

  const [duell, setDuell] = useState<DuellMitNamen | null>(null);
  const [ergebnis, setErgebnis] = useState<OnlineDuell | null>(null);
  const [phase, setPhase] = useState<Phase>("laden");
  const [runde, setRunde] = useState(0);
  const [auswahl, setAuswahl] = useState<number[]>([]);
  const [gesperrt, setGesperrt] = useState(false);
  const [richtig, setRichtig] = useState<boolean[]>([]);
  const [meldung, setMeldung] = useState<string | null>(null);
  const zeit = useRef(new Animated.Value(1)).current;
  const start = useRef(0);
  const auswahlRef = useRef(auswahl);
  auswahlRef.current = auswahl;
  const gesperrtRef = useRef(gesperrt);
  gesperrtRef.current = gesperrt;

  useEffect(() => {
    if (!id) return;
    duellLaden(id).then((d) => {
      if (!d) {
        setMeldung("Dieses Duell gibt es nicht mehr.");
        setPhase("ende");
        return;
      }
      setDuell(d);
      if (sicht(d, ich).ichDran) setPhase("start");
      else {
        setErgebnis(d);
        setPhase("ende");
      }
    });
  }, [id, ich]);

  const fragen = duell?.fragen ?? [];

  const einloggen = useCallback(() => {
    if (gesperrtRef.current) return;
    const f = frageVon(fragen[runde]);
    if (!f) return;
    gesperrtRef.current = true;
    setGesperrt(true);
    zeit.stopAnimation();
    const ok = antwortRichtig(f, auswahlRef.current, "");
    antwort(f.id, ok);
    if (ok) erfolg();
    else fehler();
    setRichtig((r) => [...r, ok]);
  }, [fragen, runde, zeit, antwort]);

  // Jede Runde: Zeit läuft ab, danach wird automatisch eingeloggt.
  useEffect(() => {
    if (phase !== "runde") return;
    setAuswahl([]);
    setGesperrt(false);
    gesperrtRef.current = false;
    zeit.setValue(1);
    const lauf = Animated.timing(zeit, { toValue: 0, duration: ONLINE_SEKUNDEN * 1000, easing: Easing.linear, useNativeDriver: false });
    lauf.start();
    const ablauf = setTimeout(einloggen, ONLINE_SEKUNDEN * 1000);
    return () => {
      lauf.stop();
      clearTimeout(ablauf);
    };
  }, [phase, runde, zeit, einloggen]);

  // Nach dem Einloggen kurz auflösen, dann weiter.
  useEffect(() => {
    if (phase !== "runde" || !gesperrt) return;
    const t = setTimeout(async () => {
      if (runde + 1 < fragen.length) {
        setRunde(runde + 1);
        return;
      }
      setPhase("senden");
      const punkte = [...richtig].filter(Boolean).length;
      const sekunden = Math.round((Date.now() - start.current) / 1000);
      const r = await ergebnisMelden(String(id), punkte, sekunden);
      if (r.fehler || !r.daten) {
        setMeldung(r.fehler ?? "Dein Ergebnis konnte nicht gespeichert werden.");
      } else {
        setErgebnis(r.daten);
      }
      setPhase("ende");
    }, 1400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gesperrt, phase]);

  function schliessen() {
    if (phase !== "runde") {
      router.back();
      return;
    }
    Alert.alert("Duell verlassen?", "Dein Ergebnis wird nicht gewertet und das Duell bleibt offen.", [
      { text: "Weiterspielen", style: "cancel" },
      { text: "Verlassen", style: "destructive", onPress: () => router.back() },
    ]);
  }

  // ------------------------------------------------------------------ Laden / Senden
  if (phase === "laden" || phase === "senden") {
    return (
      <View style={{ flex: 1, backgroundColor: farben.grund, alignItems: "center", justifyContent: "center", gap: abstand(4) }}>
        <ActivityIndicator color={farben.orange} />
        <T v="klein">{phase === "senden" ? "Ergebnis wird gespeichert …" : "Duell wird geladen …"}</T>
      </View>
    );
  }

  const gegnerName = duell ? sicht(duell, ich).gegnerName : null;

  // ------------------------------------------------------------------ Start
  if (phase === "start" && duell) {
    return (
      <View style={{ flex: 1, backgroundColor: farben.grund }}>
        <Kopf schliessen />
        <View style={{ flex: 1, paddingHorizontal: RAND, justifyContent: "center", gap: abstand(8) }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around" }}>
            <View style={{ alignItems: "center", gap: abstand(2) }}>
              <Avatar name={anzeigeName} groesse={76} />
              <T v="h3">Du</T>
            </View>
            <T v="display" farbe={farben.orange}>
              VS
            </T>
            <View style={{ alignItems: "center", gap: abstand(2) }}>
              {gegnerName ? (
                <Avatar name={gegnerName} groesse={76} farbe={farben.blau} />
              ) : (
                <View style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, borderStyle: "dashed", borderColor: farben.linieStark, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="help" size={30} color={farben.text4} />
                </View>
              )}
              <T v="h3">{gegnerName ?? "Offen"}</T>
            </View>
          </View>
          <View style={{ alignItems: "center", gap: abstand(2) }}>
            <Chip text={duell.art === "rangliste" ? "Rangliste-Duell" : `Freundes-Duell · ${duell.code}`} farbe={farben.orange} />
            <T v="text" zentriert>
              {fragen.length} Fragen, je {ONLINE_SEKUNDEN} Sekunden. Bei Gleichstand gewinnt, wer schneller war.
              {gegnerName ? "" : " Du spielst zuerst – dein Gegner spielt dieselben Fragen später."}
            </T>
          </View>
        </View>
        <View style={{ paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(3) }}>
          <Knopf
            titel="Los geht's"
            icon="play"
            onPress={() => {
              stoss();
              start.current = Date.now();
              setRunde(0);
              setRichtig([]);
              setPhase("runde");
            }}
          />
        </View>
      </View>
    );
  }

  // ------------------------------------------------------------------ Ende
  if (phase === "ende") {
    const d = ergebnis;
    const s = d ? sicht(duell ? { ...d, p1: duell.p1, p2: duell.p2 } : d, ich) : null;
    const fertig = d?.status === "fertig";
    const titel = !d ? "Hoppla." : fertig ? (s?.gewonnen ? "Sieg!" : s?.verloren ? "Knapp daneben." : "Unentschieden.") : "Vorgelegt!";
    const farbe = !d ? farben.rot : fertig ? (s?.gewonnen ? farben.gruen : s?.verloren ? farben.rot : farben.text2) : farben.orange;
    const offenerCode = d && d.art === "freund" && !d.spieler2 ? d.code : null;
    return (
      <View style={{ flex: 1, backgroundColor: farben.grund }}>
        <Kopf schliessen />
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: RAND, gap: abstand(6) }}>
          <View style={{ alignItems: "center", gap: abstand(3) }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: farbe + "22", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={!d ? "alert" : fertig ? (s?.gewonnen ? "trophy" : s?.verloren ? "flag" : "git-compare") : "hourglass"} size={38} color={farbe} />
            </View>
            <T v="display" farbe={farbe}>
              {titel}
            </T>
            {d && s ? (
              <T v="zahl" style={{ fontSize: 44, lineHeight: 50 }}>
                {s.meine ?? 0} : {fertig ? s.seine ?? 0 : "?"}
              </T>
            ) : null}
            <T v="text" zentriert>
              {!d
                ? meldung ?? "Das hat nicht geklappt."
                : fertig
                  ? `Du gegen ${s?.gegnerName ?? "deinen Gegner"}`
                  : offenerCode
                    ? "Teile den Code mit deinem Freund. Sobald er gespielt hat, siehst du das Ergebnis unter „Deine Duelle“."
                    : "Wir suchen dir einen Gegner. Das Ergebnis siehst du unter „Deine Duelle“."}
            </T>
          </View>

          {fertig && s?.elo != null ? (
            <View style={{ alignItems: "center" }}>
              <Chip text={`Elo ${s.elo >= 0 ? "+" : ""}${s.elo}`} icon="trending-up" farbe={s.elo >= 0 ? farben.gruen : farben.rot} />
            </View>
          ) : null}

          {offenerCode ? (
            <View style={{ alignItems: "center", gap: abstand(3), padding: abstand(5), borderRadius: radius.l, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.orangeLinie }}>
              <T v="mini">Dein Duell-Code</T>
              <T v="display" style={{ letterSpacing: 6, fontFamily: schrift.titel }}>
                {offenerCode}
              </T>
              <Pressable
                onPress={() => Share.share({ message: `Duell in der Spur-App: Gib den Code ${offenerCode} unter Liga → Duell ein.` }).catch(() => {})}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                hitSlop={8}
              >
                <Ionicons name="share-outline" size={18} color={farben.orange} />
                <T v="textStark" farbe={farben.orange}>
                  Code teilen
                </T>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(3) }}>
          <Knopf titel="Zurück zur Liga" art="sekundaer" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  // ------------------------------------------------------------------ Runde
  const frage = frageVon(fragen[runde]);
  if (!frage) return null;
  const punkte = richtig.filter(Boolean).length;

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <View style={{ paddingTop: insets.top + abstand(2), paddingHorizontal: RAND - 6, flexDirection: "row", alignItems: "center" }}>
        <Pressable onPress={schliessen} hitSlop={10} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="close" size={26} color={farben.text} />
        </Pressable>
        <T v="klein" style={{ flex: 1, textAlign: "center" }}>
          Frage {runde + 1} von {fragen.length}
        </T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, width: 70, justifyContent: "flex-end", paddingRight: 6 }}>
          <Ionicons name="checkmark-circle" size={16} color={farben.gruen} />
          <T v="textStark">{punkte}</T>
        </View>
      </View>
      <View style={{ marginHorizontal: RAND, marginTop: abstand(2), height: 6, borderRadius: 3, backgroundColor: farben.flaeche3, overflow: "hidden" }}>
        <Animated.View style={{ height: "100%", backgroundColor: farben.orange, width: zeit.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
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
          aufgedeckt={gesperrt}
          ohneErklaerung
        />
      </ScrollView>

      <View style={{ paddingHorizontal: RAND, paddingTop: abstand(3), paddingBottom: insets.bottom + abstand(3), borderTopWidth: 1, borderColor: farben.linie }}>
        <Knopf titel={gesperrt ? "Weiter …" : "Antwort abgeben"} deaktiviert={gesperrt || auswahl.length === 0} onPress={einloggen} />
      </View>
    </View>
  );
}
