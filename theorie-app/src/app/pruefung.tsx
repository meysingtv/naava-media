import { useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { kopfOben } from "@/components/ui";
import { AllesRichtig, ErgebnisHeld, ErgebnisRing, ErgebnisWerte, FehlerKarte, Stempel } from "@/components/auswertung";
import { FrageAktionen } from "@/components/frage-aktionen";
import { FrageAnsicht, useAntwortReihenfolge } from "@/components/frage-ansicht";
import { AktionsLeiste, FrageKopf, FragenNavigator, GlasPille, GlasRund, HauptKnopf, Kapsel, NebenKnopf } from "@/components/frage-rahmen";
import { HinweisAnzeige, useHinweis } from "@/components/hinweis";
import { Kopfzeile } from "@/components/home";
import { Eckdaten, ErgebnisListe, RegelListe, type Regel } from "@/components/pruefen";
import { dialog } from "@/components/dialog";
import { FarbweltBereich, useDarstellung } from "@/lib/darstellung";
import { FOTOS } from "@/lib/fotos";
import { antwortRichtig, frageVon, FRAGEN, THEMEN, type Frage } from "@/lib/fragen";
import { dauer } from "@/lib/format";
import { erfolg, fehler, tippen } from "@/lib/haptik";
import { liveSimulation } from "@/lib/live-aktivitaet";
import { gemischt, useStand } from "@/lib/stand";
import { mitDeckkraft, RAND, schrift } from "@/lib/theme";
import { useZurueckTaste } from "@/lib/zurueck-taste";

const FRAGEN_ANZAHL = 30;
const MAX_FEHLERPUNKTE = 10;
/** Bearbeitungszeit: 45 Minuten, danach wird automatisch abgegeben. */
const ZEIT_LIMIT = 45 * 60;
/** Ab hier wird die Restzeit rot. */
const ZEIT_KNAPP = 5 * 60;

type Antworten = Record<string, { auswahl: number[]; eingabe: string }>;

/** 30 Fragen, möglichst gleichmäßig über alle Themen verteilt. */
function pruefungsbogen(): string[] {
  const jeThema = Math.ceil(FRAGEN_ANZAHL / THEMEN.length);
  const ids = THEMEN.flatMap((t) =>
    gemischt(FRAGEN.filter((f) => f.thema === t.id))
      .slice(0, jeThema)
      .map((f) => f.id),
  );
  return gemischt(ids).slice(0, Math.min(FRAGEN_ANZAHL, FRAGEN.length));
}

function beantwortet(f: Frage, a?: { auswahl: number[]; eingabe: string }) {
  if (!a) return false;
  return f.art === "auswahl" ? a.auswahl.length > 0 : a.eingabe.trim().length > 0;
}

export default function Pruefung() {
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
  const { direkt } = useLocalSearchParams<{ direkt?: string }>();
  const { stand, antwort, pruefungFertig, zeitBuchen } = useStand();
  const [phase, setPhase] = useState<"start" | "laeuft" | "ergebnis" | "aufloesung">(direkt ? "laeuft" : "start");
  const [ids, setIds] = useState<string[]>(() => (direkt ? pruefungsbogen() : []));
  const [index, setIndex] = useState(0);
  const [antworten, setAntworten] = useState<Antworten>({});
  const [sekunden, setSekunden] = useState(0);
  const [ergebnis, setErgebnis] = useState<{
    fehlerpunkte: number;
    bestanden: boolean;
    richtig: number;
    falsche: string[];
    xp: number;
    fuenfer: number;
    zeitAbgelaufen: boolean;
  } | null>(null);
  const scroll = useRef<ScrollView>(null);
  const hinweis = useHinweis();
  const reihenfolge = useAntwortReihenfolge();
  // Jeder Start zählt hoch; die Zeit läuft nach der Uhr, damit App und Sperrbildschirm gleich zählen.
  const [lauf, setLauf] = useState(direkt ? 1 : 0);
  const startMs = useRef(Date.now());
  const abgegeben = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const erledigt = ids.filter((id) => {
    const q = frageVon(id);
    return q && beantwortet(q, antworten[id]);
  }).length;
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const rot = f.hell ? "#E5392C" : "#FF5A4E";

  useEffect(() => {
    if (phase !== "laeuft") return;
    const t = setInterval(() => setSekunden(Math.min(ZEIT_LIMIT, Math.floor((Date.now() - startMs.current) / 1000))), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Zeit um: automatisch abgeben (auch wenn die App zwischendurch im Hintergrund war).
  useEffect(() => {
    if (phase === "laeuft" && sekunden >= ZEIT_LIMIT) abgeben(true);
  }, [phase, sekunden]);

  // Live-Aktivität (iPhone): beim Start anlegen, bei jeder Frage auffrischen, beim Verlassen entfernen.
  useEffect(() => {
    if (lauf > 0) liveSimulation.starten(ids.length, startMs.current, startMs.current + ZEIT_LIMIT * 1000);
  }, [lauf, ids.length]);
  useEffect(() => {
    if (phase === "laeuft" && lauf > 0) liveSimulation.aktualisieren(index + 1, erledigt);
  }, [phase, lauf, index, erledigt]);
  useEffect(
    () => () => {
      if (phaseRef.current === "laeuft") liveSimulation.beenden();
    },
    [],
  );

  function starten() {
    setIds(pruefungsbogen());
    setIndex(0);
    setAntworten({});
    setSekunden(0);
    startMs.current = Date.now();
    abgegeben.current = false;
    setLauf((l) => l + 1);
    setPhase("laeuft");
  }

  function gehe(i: number) {
    Keyboard.dismiss();
    setIndex(i);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  function abgeben(zeitAbgelaufen = false) {
    // Nur einmal werten – z. B. wenn die Zeit abläuft, während „Abgeben?“ noch offen ist.
    if (abgegeben.current) return;
    abgegeben.current = true;
    let fehlerpunkte = 0;
    let fuenfer = 0;
    let richtig = 0;
    const falsche: string[] = [];
    for (const id of ids) {
      const q = frageVon(id);
      if (!q) continue;
      const a = antworten[id] ?? { auswahl: [], eingabe: "" };
      const ok = antwortRichtig(q, a.auswahl, a.eingabe);
      antwort(id, ok);
      if (ok) richtig++;
      else {
        fehlerpunkte += q.punkte;
        if (q.punkte === 5) fuenfer++;
        falsche.push(id);
      }
    }
    // Durchgefallen bei mehr als 10 Fehlerpunkten – oder bei zwei falschen 5-Punkte-Fragen.
    const bestanden = fehlerpunkte <= MAX_FEHLERPUNKTE && fuenfer < 2;
    const xp = pruefungFertig({ fehlerpunkte, bestanden, richtig, gesamt: ids.length });
    const endeMs = Date.now();
    const dauerSek = Math.min(ZEIT_LIMIT, Math.floor((endeMs - startMs.current) / 1000));
    setSekunden(dauerSek);
    zeitBuchen(Math.min(dauerSek, 60 * 60));
    liveSimulation.abgeben({ fehlerpunkte, bestanden, richtig, beantwortet: erledigt, endeMs });
    if (bestanden) erfolg();
    else fehler();
    setErgebnis({ fehlerpunkte, bestanden, richtig, falsche, xp, fuenfer, zeitAbgelaufen });
    setPhase("ergebnis");
  }

  function abgebenFragen() {
    const offen = ids.filter((id) => {
      const q = frageVon(id);
      return q && !beantwortet(q, antworten[id]);
    }).length;
    dialog(
      "Prüfung abgeben?",
      offen > 0 ? `${offen} ${offen === 1 ? "Frage ist" : "Fragen sind"} noch unbeantwortet und zählen als falsch.` : "Alle Fragen sind beantwortet.",
      [
        { text: "Weiter prüfen", style: "cancel" },
        { text: "Abgeben", style: offen > 0 ? "destructive" : "default", onPress: () => abgeben() },
      ],
    );
  }

  function abbrechenFragen() {
    if (phase === "aufloesung") {
      setPhase("ergebnis");
      return;
    }
    if (phase !== "laeuft") {
      router.back();
      return;
    }
    dialog("Simulation abbrechen?", "Diese Simulation wird nicht gewertet.", [
      { text: "Weiter prüfen", style: "cancel" },
      { text: "Abbrechen", style: "destructive", onPress: () => router.back() },
    ]);
  }
  useZurueckTaste(abbrechenFragen);

  // ------------------------------------------------------------------ Start
  if (phase === "start") {
    const regeln: Regel[] = [
      { icon: "layers-outline", text: `${Math.min(FRAGEN_ANZAHL, FRAGEN.length)} Fragen aus allen Themen, gemischt` },
      { icon: "time-outline", text: "45 Minuten Zeit – danach wird automatisch abgegeben" },
      { icon: "alert-circle-outline", text: "Jede Frage zählt 2 bis 5 Fehlerpunkte" },
      { icon: "shield-checkmark-outline", text: "Bestanden mit höchstens 10 Fehlerpunkten – außer bei zwei falschen 5-Punkte-Fragen" },
      { icon: "eye-off-outline", text: "Die Auflösung siehst du erst nach dem Abgeben" },
    ];
    return (
      <FarbweltBereich farbwelt={f}>
        <StatusBar style={f.hell ? "dark" : "light"} />
        <View style={{ flex: 1, backgroundColor: f.grund }}>
          <FrageKopf oben={kopfOben(insets.top)} links={<GlasRund icon="close" label="Schließen" onPress={() => router.back()} />} rechts={null} titel="Prüfungssimulation" />
          <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <View style={{ paddingHorizontal: RAND, gap: 4, marginBottom: 22 }}>
              <Text style={{ ...schrift.titel, fontSize: 32, lineHeight: 38, color: f.text }}>Wie in der echten Prüfung.</Text>
              <Text style={{ ...schrift.text, fontSize: 15.5, lineHeight: 22, color: f.text2 }}>Ohne Hilfe, mit Uhr – die Auflösung gibt es erst am Ende.</Text>
            </View>
            <Eckdaten style={{ marginHorizontal: RAND }} />
            <RegelListe regeln={regeln} style={{ marginHorizontal: RAND, marginTop: 10 }} />
            {stand.pruefungen.length > 0 ? (
              <>
                <Kopfzeile titel="Letzte Simulationen" style={{ marginTop: 30 }} />
                <ErgebnisListe pruefungen={stand.pruefungen.slice(0, 5)} style={{ marginHorizontal: RAND }} />
              </>
            ) : null}
          </ScrollView>
          <AktionsLeiste unten={insets.bottom}>
            <HauptKnopf titel="Simulation starten" icon="arrow-forward" onPress={starten} style={{ flex: 1 }} />
          </AktionsLeiste>
        </View>
      </FarbweltBereich>
    );
  }

  // ------------------------------------------------------------------ Auflösung
  if (phase === "aufloesung" && ergebnis) {
    return (
      <FarbweltBereich farbwelt={f}>
        <StatusBar style={f.hell ? "dark" : "light"} />
        <View style={{ flex: 1, backgroundColor: f.grund }}>
          <FrageKopf
            oben={kopfOben(insets.top)}
            links={<GlasRund icon="chevron-back" label="Zurück zum Ergebnis" onPress={() => setPhase("ergebnis")} />}
            rechts={null}
            titel="Auflösung"
            unter={<Kapsel icon="close" text={`${ergebnis.falsche.length} falsch`} farbe={rot} />}
          />
          <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: 8, paddingBottom: insets.bottom + 32, gap: 40 }} showsVerticalScrollIndicator={false}>
            {ergebnis.falsche.map((id) => {
              const q = frageVon(id);
              const a = antworten[id] ?? { auswahl: [], eingabe: "" };
              return q ? (
                <View key={id} style={{ gap: 12 }}>
                  <Text style={{ ...schrift.textFett, fontSize: 12, letterSpacing: 1.2, color: f.text3 }}>
                    FRAGE {ids.indexOf(id) + 1} · {q.punkte} FEHLERPUNKTE
                  </Text>
                  <FrageAnsicht frage={q} auswahl={a.auswahl} onAuswahl={() => {}} eingabe={a.eingabe} onEingabe={() => {}} aufgedeckt etikett="Prüfung" reihenfolge={reihenfolge(q)} />
                  <FrageAktionen frageId={id} onHinweis={hinweis.zeigen} />
                </View>
              ) : null;
            })}
          </ScrollView>
          <HinweisAnzeige wert={hinweis.wert} inhalt={hinweis.inhalt} oben={insets.top + 70} />
        </View>
      </FarbweltBereich>
    );
  }

  // ------------------------------------------------------------------ Ergebnis
  if (phase === "ergebnis" && ergebnis) {
    const ok = ergebnis.bestanden;
    const text = ok
      ? "Sauber. So darf es in der echten Prüfung laufen."
      : ergebnis.fuenfer >= 2 && ergebnis.fehlerpunkte <= MAX_FEHLERPUNKTE
        ? "Zwei falsche 5-Punkte-Fragen – das reicht in der echten Prüfung zum Durchfallen."
        : "Schau dir die Fehler an und übe die Themen gezielt.";
    const hatFehler = ergebnis.falsche.length > 0;
    return (
      <FarbweltBereich farbwelt={f}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: f.grund }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <ErgebnisHeld bild={FOTOS.pruefung} oben={insets.top + 16} hoehe={insets.top + 420} label={`Simulation · ${ids.length} Fragen`} titel={ok ? "Geschafft!" : "Noch nicht ganz."}>
              <View style={{ alignItems: "center" }}>
                <ErgebnisRing
                  anteil={Math.min(1, ergebnis.fehlerpunkte / MAX_FEHLERPUNKTE)}
                  wert={`${ergebnis.fehlerpunkte}`}
                  unter="Fehlerpunkte"
                  ton={ok ? "gruen" : "rot"}
                  spur={ok ? mitDeckkraft("#4ED053", 0.28) : undefined}
                />
                <Stempel bestanden={ok} style={{ marginTop: -22 }} />
              </View>
            </ErgebnisHeld>

            <ErgebnisWerte
              werte={[
                { icon: "checkmark-circle", farbe: gruen, wert: `${ergebnis.richtig}/${ids.length}`, label: "richtig" },
                { icon: "time-outline", farbe: f.orange, wert: dauer(sekunden), label: "Zeit" },
                { icon: "flash", farbe: f.orange, wert: `+${ergebnis.xp}`, label: "XP" },
              ]}
              style={{ marginHorizontal: RAND, marginTop: -40 }}
            />

            <View style={{ paddingHorizontal: RAND + 8, marginTop: 18, gap: 6 }}>
              {ergebnis.zeitAbgelaufen ? (
                <Text style={{ ...schrift.textHalb, fontSize: 14, lineHeight: 20, color: rot, textAlign: "center" }}>Die 45 Minuten sind abgelaufen – offene Fragen zählen als falsch.</Text>
              ) : null}
              <Text style={{ ...schrift.text, fontSize: 15.5, lineHeight: 22, color: f.text2, textAlign: "center" }}>{text}</Text>
            </View>

            <Kopfzeile
              titel={hatFehler ? "Falsch beantwortet" : "Fehlerfrei"}
              link={hatFehler ? "Auflösung" : undefined}
              onLink={hatFehler ? () => setPhase("aufloesung") : undefined}
              style={{ marginTop: 30 }}
            />
            <View style={{ paddingHorizontal: RAND, gap: 10 }}>
              {hatFehler ? (
                ergebnis.falsche.map((id) => {
                  const q = frageVon(id);
                  return q ? <FehlerKarte key={id} frage={q} onPress={() => setPhase("aufloesung")} /> : null;
                })
              ) : (
                <AllesRichtig text="Alle Fragen richtig – besser geht es nicht." />
              )}
            </View>

            {hatFehler ? (
              <Pressable
                onPress={() => {
                  tippen();
                  starten();
                }}
                hitSlop={8}
                style={({ pressed }) => ({ alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, marginTop: 22, opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.orange }}>Neue Simulation starten</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          <AktionsLeiste unten={insets.bottom}>
            {hatFehler ? (
              <>
                <NebenKnopf titel="Fertig" onPress={() => router.back()} style={{ flex: 1 }} />
                <HauptKnopf titel="Auflösung" icon="eye-outline" onPress={() => setPhase("aufloesung")} style={{ flex: 1.5 }} />
              </>
            ) : (
              <>
                <NebenKnopf titel="Nochmal" icon="refresh" onPress={starten} style={{ flex: 1 }} />
                <HauptKnopf titel="Fertig" icon="checkmark" onPress={() => router.back()} style={{ flex: 1.5 }} />
              </>
            )}
          </AktionsLeiste>
        </View>
      </FarbweltBereich>
    );
  }

  // ------------------------------------------------------------------ Läuft
  const frage = frageVon(ids[index]);
  if (!frage) return null;
  const a = antworten[frage.id] ?? { auswahl: [], eingabe: "" };
  const setzeAntwort = (teil: Partial<{ auswahl: number[]; eingabe: string }>) =>
    setAntworten((alt) => ({ ...alt, [frage.id]: { ...(alt[frage.id] ?? { auswahl: [], eingabe: "" }), ...teil } }));
  const rest = Math.max(0, ZEIT_LIMIT - sekunden);
  const knapp = rest <= ZEIT_KNAPP;

  return (
    <FarbweltBereich farbwelt={f}>
      <StatusBar style={f.hell ? "dark" : "light"} />
      <View style={{ flex: 1, backgroundColor: f.grund }}>
        <FrageKopf
          oben={kopfOben(insets.top)}
          links={<GlasRund icon="close" label="Simulation abbrechen" onPress={abbrechenFragen} />}
          rechts={<GlasPille titel="Abgeben" onPress={abgebenFragen} />}
          titel={`Frage ${index + 1} von ${ids.length}`}
          unter={<Kapsel icon="time-outline" text={`noch ${dauer(rest)}`} farbe={knapp ? rot : undefined} gefuellt={knapp} />}
        >
          <FragenNavigator
            anzahl={ids.length}
            aktiv={index}
            erledigt={(i) => {
              const q = frageVon(ids[i]);
              return q ? beantwortet(q, antworten[ids[i]]) : false;
            }}
            onWahl={gehe}
          />
        </FrageKopf>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: 4, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <FrageAnsicht
              frage={frage}
              auswahl={a.auswahl}
              onAuswahl={(auswahl) => setzeAntwort({ auswahl })}
              eingabe={a.eingabe}
              onEingabe={(eingabe) => setzeAntwort({ eingabe })}
              aufgedeckt={false}
              etikett="Prüfung"
              reihenfolge={reihenfolge(frage)}
            />
          </ScrollView>
          <AktionsLeiste unten={insets.bottom}>
            <NebenKnopf icon="chevron-back" onPress={() => gehe(index - 1)} deaktiviert={index === 0} style={{ width: 56 }} />
            {index + 1 < ids.length ? (
              <HauptKnopf titel="Nächste Frage" icon="arrow-forward" onPress={() => gehe(index + 1)} style={{ flex: 1 }} />
            ) : (
              <HauptKnopf titel="Abgeben" icon="checkmark" onPress={abgebenFragen} style={{ flex: 1 }} />
            )}
          </AktionsLeiste>
        </KeyboardAvoidingView>
      </View>
    </FarbweltBereich>
  );
}
