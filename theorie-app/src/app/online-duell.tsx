import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Share, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Avatar, Chip, kartenFlaeche, Kopf, kopfOben, T } from "@/components/ui";
import { FrageAnsicht, useAntwortReihenfolge } from "@/components/frage-ansicht";
import { AktionsLeiste, FrageKopf, GlasRund, HauptKnopf, KopfPille, NebenKnopf } from "@/components/frage-rahmen";
import { Seite } from "@/components/seite";
import { dialog } from "@/components/dialog";
import { Lader } from "@/components/lader";
import { useDarstellung } from "@/lib/darstellung";
import { antwortRichtig, frageVon } from "@/lib/fragen";
import { erfolg, fehler, stoss } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { duellLaden, ergebnisMelden, ONLINE_SEKUNDEN, sicht, type DuellMitNamen, type OnlineDuell } from "@/lib/online-duell";
import { useStand } from "@/lib/stand";
import { abstand, farben, leuchten, mitDeckkraft, RAND, schrift } from "@/lib/theme";
import { useZurueckTaste } from "@/lib/zurueck-taste";

type Phase = "laden" | "start" | "runde" | "senden" | "ende";

export default function OnlineDuellSeite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
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
  const reihenfolge = useAntwortReihenfolge();
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
    dialog("Duell verlassen?", "Dein Ergebnis wird nicht gewertet und das Duell bleibt offen.", [
      { text: "Weiterspielen", style: "cancel" },
      { text: "Verlassen", style: "destructive", onPress: () => router.back() },
    ]);
  }

  useZurueckTaste(schliessen);

  // ------------------------------------------------------------------ Laden / Senden
  if (phase === "laden" || phase === "senden") {
    return (
      <Seite>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: abstand(4) }}>
          <Lader color={f.orange} />
          <T v="klein">{phase === "senden" ? "Ergebnis wird gespeichert …" : "Duell wird geladen …"}</T>
        </View>
      </Seite>
    );
  }

  const gegnerName = duell ? sicht(duell, ich).gegnerName : null;

  // ------------------------------------------------------------------ Start
  if (phase === "start" && duell) {
    return (
      <Seite>
        <Kopf schliessen />
        <View style={{ flex: 1, paddingHorizontal: RAND, justifyContent: "center", gap: abstand(8) }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around" }}>
            <View style={{ alignItems: "center", gap: abstand(2) }}>
              <Avatar name={anzeigeName} groesse={76} />
              <T v="h3">Du</T>
            </View>
            <T v="display" farbe={f.orange} style={{ textShadowColor: mitDeckkraft(f.orange, 0.55), textShadowRadius: 18 }}>
              VS
            </T>
            <View style={{ alignItems: "center", gap: abstand(2) }}>
              {gegnerName ? (
                <Avatar name={gegnerName} groesse={76} farbe={farben.blau} />
              ) : (
                <View style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, borderStyle: "dashed", borderColor: f.linieStark, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="help" size={30} color={f.text3} />
                </View>
              )}
              <T v="h3">{gegnerName ?? "Offen"}</T>
            </View>
          </View>
          <View style={{ alignItems: "center", gap: abstand(2) }}>
            <Chip text={duell.art === "rangliste" ? "Rangliste-Duell" : `Freundes-Duell · ${duell.code}`} farbe={f.orange} />
            <T v="text" zentriert>
              {fragen.length} Fragen, je {ONLINE_SEKUNDEN} Sekunden. Bei Gleichstand gewinnt, wer schneller war.
              {gegnerName ? "" : " Du spielst zuerst – dein Gegner spielt dieselben Fragen später."}
            </T>
          </View>
        </View>
        <AktionsLeiste unten={insets.bottom}>
          <HauptKnopf
            titel="Los geht's"
            icon="play"
            onPress={() => {
              stoss();
              start.current = Date.now();
              setRunde(0);
              setRichtig([]);
              setPhase("runde");
            }}
            style={{ flex: 1 }}
          />
        </AktionsLeiste>
      </Seite>
    );
  }

  // ------------------------------------------------------------------ Ende
  if (phase === "ende") {
    const d = ergebnis;
    const s = d ? sicht(duell ? { ...d, p1: duell.p1, p2: duell.p2 } : d, ich) : null;
    const fertig = d?.status === "fertig";
    const titel = !d ? "Hoppla." : fertig ? (s?.gewonnen ? "Sieg!" : s?.verloren ? "Knapp daneben." : "Unentschieden.") : "Vorgelegt!";
    const gruen = f.hell ? "#23A548" : "#4ED053";
    const rot = f.hell ? "#E5392C" : "#FF5A4E";
    const farbe = !d ? rot : fertig ? (s?.gewonnen ? gruen : s?.verloren ? rot : f.text2) : f.orange;
    const offenerCode = d && d.art === "freund" && !d.spieler2 ? d.code : null;
    return (
      <Seite>
        <Kopf schliessen />
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: RAND, gap: abstand(6) }}>
          <View style={{ alignItems: "center", gap: abstand(3) }}>
            <View style={[{ width: 92, height: 92, borderRadius: 46, backgroundColor: mitDeckkraft(farbe, 0.14), borderWidth: 1, borderColor: mitDeckkraft(farbe, 0.35), alignItems: "center", justifyContent: "center" }, leuchten(farbe, 0.3, 18, 0)]}>
              <Icon name={!d ? "alert" : fertig ? (s?.gewonnen ? "trophy" : s?.verloren ? "flag" : "git-compare") : "hourglass"} size={38} color={farbe} />
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
            <View style={[{ alignItems: "center", gap: abstand(3), padding: abstand(5), borderRadius: 24 }, kartenFlaeche(f), { borderWidth: 1.5, borderColor: mitDeckkraft(f.orange, 0.45) }]}>
              <T v="mini">Dein Duell-Code</T>
              <T v="display" style={{ letterSpacing: 6, ...schrift.titel }}>
                {offenerCode}
              </T>
              <Pressable
                onPress={() => Share.share({ message: `Duell in Fahrschule Pro: Gib den Code ${offenerCode} unter Liga → Duell ein.` }).catch(() => {})}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                hitSlop={8}
              >
                <Icon name="share-outline" size={18} color={f.orange} />
                <T v="textStark" farbe={f.orange}>
                  Code teilen
                </T>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
        <AktionsLeiste unten={insets.bottom}>
          <NebenKnopf titel="Zurück zur Liga" onPress={() => router.back()} style={{ flex: 1 }} />
        </AktionsLeiste>
      </Seite>
    );
  }

  // ------------------------------------------------------------------ Runde
  const frage = frageVon(fragen[runde]);
  if (!frage) return null;
  const punkte = richtig.filter(Boolean).length;

  return (
    <Seite>
      <FrageKopf
        oben={kopfOben(insets.top)}
        links={<GlasRund icon="close" label="Duell verlassen" onPress={schliessen} />}
        rechts={<KopfPille icon="checkmark-circle" text={`${punkte} richtig`} />}
        titel={`Frage ${runde + 1} von ${fragen.length}`}
        unter={<KopfPille icon="flash" text={gegnerName ? `gegen ${gegnerName}` : "Online-Duell"} />}
      >
        <View style={{ marginHorizontal: RAND, height: 6, borderRadius: 3, backgroundColor: f.hell ? "rgba(20,23,27,0.08)" : farben.flaeche3, overflow: "hidden" }}>
          <Animated.View style={{ height: "100%", borderRadius: 3, backgroundColor: f.orange, width: zeit.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
        </View>
      </FrageKopf>

      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(3), paddingBottom: abstand(8) }} showsVerticalScrollIndicator={false}>
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
          kompakt
          reihenfolge={reihenfolge(frage)}
        />
      </ScrollView>

      <AktionsLeiste unten={insets.bottom}>
        <HauptKnopf titel={gesperrt ? "Weiter …" : "Antwort abgeben"} deaktiviert={gesperrt || auswahl.length === 0} onPress={einloggen} style={{ flex: 1 }} />
      </AktionsLeiste>
    </Seite>
  );
}
