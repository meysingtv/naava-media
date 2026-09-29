import { useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Abschnitt, Chip, Gruppe, Karte, Knopf, Kopf, kopfOben, KopfTaste, T, Zeile } from "@/components/ui";
import { FrageAktionen } from "@/components/frage-aktionen";
import { FrageAnsicht, useAntwortReihenfolge } from "@/components/frage-ansicht";
import { Ring } from "@/components/grafik";
import { HinweisAnzeige, useHinweis } from "@/components/hinweis";
import { dialog } from "@/components/dialog";
import { antwortRichtig, frageVon, FRAGEN, THEMEN, themaVon, type Frage } from "@/lib/fragen";
import { datumKurz, dauer } from "@/lib/format";
import { erfolg, fehler, tippen } from "@/lib/haptik";
import { liveSimulation } from "@/lib/live-aktivitaet";
import { gemischt, useStand } from "@/lib/stand";
import { abstand, farben, leuchten, RAND, schrift } from "@/lib/theme";
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
    const f = frageVon(id);
    return f && beantwortet(f, antworten[id]);
  }).length;

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
      const f = frageVon(id);
      if (!f) continue;
      const a = antworten[id] ?? { auswahl: [], eingabe: "" };
      const ok = antwortRichtig(f, a.auswahl, a.eingabe);
      antwort(id, ok);
      if (ok) richtig++;
      else {
        fehlerpunkte += f.punkte;
        if (f.punkte === 5) fuenfer++;
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
      const f = frageVon(id);
      return f && !beantwortet(f, antworten[id]);
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
    const regeln: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
      { icon: "layers-outline", text: `${Math.min(FRAGEN_ANZAHL, FRAGEN.length)} Fragen aus allen Themen, gemischt` },
      { icon: "time-outline", text: "45 Minuten Zeit – danach wird automatisch abgegeben" },
      { icon: "alert-circle-outline", text: "Jede Frage zählt 2 bis 5 Fehlerpunkte" },
      { icon: "shield-checkmark-outline", text: "Bestanden mit höchstens 10 Fehlerpunkten – außer bei zwei falschen 5-Punkte-Fragen" },
      { icon: "eye-off-outline", text: "Die Auflösung siehst du erst nach dem Abgeben" },
    ];
    return (
      <View style={{ flex: 1, backgroundColor: farben.grund }}>
        <Kopf schliessen />
        <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: abstand(8), gap: abstand(6) }}>
          <View style={{ gap: abstand(2) }}>
            <T v="mini" farbe={farben.orange}>
              Prüfungssimulation
            </T>
            <T v="display">Wie in der echten Prüfung.</T>
          </View>
          <Gruppe>
            {regeln.map((r) => (
              <Zeile key={r.text} icon={r.icon} iconFarbe={farben.orange} titel={r.text} />
            ))}
          </Gruppe>
          {stand.pruefungen.length > 0 ? (
            <View>
              <Abschnitt titel="Letzte Simulationen" />
              <Gruppe>
                {stand.pruefungen.slice(0, 5).map((p) => (
                  <Zeile
                    key={p.datum}
                    icon={p.bestanden ? "checkmark-circle" : "close-circle"}
                    iconFarbe={p.bestanden ? farben.gruen : farben.rot}
                    titel={p.bestanden ? "Bestanden" : "Nicht bestanden"}
                    unter={`${datumKurz(p.datum)} · ${p.richtig} von ${p.gesamt} richtig`}
                    wert={`${p.fehlerpunkte} FP`}
                  />
                ))}
              </Gruppe>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ paddingHorizontal: RAND, paddingTop: abstand(3), paddingBottom: insets.bottom + abstand(3), borderTopWidth: 1, borderColor: farben.linie }}>
          <Knopf titel="Simulation starten" icon="arrow-forward" onPress={starten} />
        </View>
      </View>
    );
  }

  // ------------------------------------------------------------------ Ergebnis
  if ((phase === "ergebnis" || phase === "aufloesung") && ergebnis) {
    if (phase === "aufloesung") {
      return (
        <View style={{ flex: 1, backgroundColor: farben.grund }}>
          <Kopf titel="Auflösung" rechts={<Chip text={`${ergebnis.falsche.length} falsch`} farbe={farben.rot} />} />
          <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(8), gap: abstand(10) }}>
            {ergebnis.falsche.map((id) => {
              const f = frageVon(id);
              const a = antworten[id] ?? { auswahl: [], eingabe: "" };
              return f ? (
                <View key={id} style={{ gap: 14 }}>
                  <FrageAnsicht frage={f} auswahl={a.auswahl} onAuswahl={() => {}} eingabe={a.eingabe} onEingabe={() => {}} aufgedeckt etikett="Prüfung" reihenfolge={reihenfolge(f)} />
                  <FrageAktionen frageId={id} onHinweis={hinweis.zeigen} />
                </View>
              ) : null;
            })}
          </ScrollView>
          <HinweisAnzeige wert={hinweis.wert} inhalt={hinweis.inhalt} oben={insets.top + 56} />
        </View>
      );
    }
    const ok = ergebnis.bestanden;
    return (
      <View style={{ flex: 1, backgroundColor: farben.grund }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + abstand(10), paddingHorizontal: RAND, paddingBottom: abstand(8), gap: abstand(7) }}>
          <View style={{ alignItems: "center", gap: abstand(4) }}>
            <Ring anteil={Math.min(1, ergebnis.fehlerpunkte / MAX_FEHLERPUNKTE)} groesse={156} dicke={10} farbe={ok ? farben.gruen : farben.rot}>
              <T v="display" style={{ fontSize: 42 }}>
                {ergebnis.fehlerpunkte}
              </T>
              <T v="klein" style={{ marginTop: -4 }}>
                Fehlerpunkte
              </T>
            </Ring>
            <View
              style={{
                paddingHorizontal: abstand(4),
                paddingVertical: abstand(1.5),
                borderRadius: 8,
                borderWidth: 2,
                borderColor: ok ? farben.gruen : farben.rot,
                transform: [{ rotate: "-4deg" }],
              }}
            >
              <T v="h2" farbe={ok ? farben.gruen : farben.rot} style={{ letterSpacing: 1.5, ...schrift.titel }}>
                {ok ? "BESTANDEN" : "NICHT BESTANDEN"}
              </T>
            </View>
            {ergebnis.zeitAbgelaufen ? (
              <T v="klein" farbe={farben.rot} zentriert>
                Die 45 Minuten sind abgelaufen – offene Fragen zählen als falsch.
              </T>
            ) : null}
            <T v="text" zentriert>
              {ok
                ? "Sauber. So darf es in der echten Prüfung laufen."
                : ergebnis.fuenfer >= 2 && ergebnis.fehlerpunkte <= MAX_FEHLERPUNKTE
                  ? "Zwei falsche 5-Punkte-Fragen – das reicht in der echten Prüfung zum Durchfallen."
                  : "Schau dir die Fehler an und übe die Themen gezielt."}
            </T>
          </View>

          <View style={{ flexDirection: "row", gap: abstand(3) }}>
            {[
              { w: `${ergebnis.richtig}/${ids.length}`, l: "richtig" },
              { w: dauer(sekunden), l: "Zeit" },
              { w: `+${ergebnis.xp}`, l: "XP" },
            ].map((x) => (
              <Karte key={x.l} style={{ flex: 1, padding: abstand(3.5), alignItems: "center", gap: 2 }}>
                <T v="h2" style={{ fontVariant: ["tabular-nums"] }}>
                  {x.w}
                </T>
                <T v="klein">{x.l}</T>
              </Karte>
            ))}
          </View>

          {ergebnis.falsche.length > 0 ? (
            <View>
              <Abschnitt titel="Falsch beantwortet" aktion="Auflösung" onAktion={() => setPhase("aufloesung")} />
              <Gruppe>
                {ergebnis.falsche.map((id) => {
                  const f = frageVon(id);
                  return f ? <Zeile key={id} titel={f.text} titelZeilen={2} unter={themaVon(f.thema).titel} wert={`${f.punkte} FP`} /> : null;
                })}
              </Gruppe>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ paddingHorizontal: RAND, paddingTop: abstand(3), paddingBottom: insets.bottom + abstand(3), gap: abstand(3), borderTopWidth: 1, borderColor: farben.linie }}>
          {ergebnis.falsche.length > 0 ? <Knopf titel="Auflösung ansehen" onPress={() => setPhase("aufloesung")} /> : null}
          <View style={{ flexDirection: "row", gap: abstand(3) }}>
            <Knopf titel="Neue Simulation" art="sekundaer" onPress={starten} style={{ flex: 1 }} />
            <Knopf titel="Fertig" art="sekundaer" onPress={() => router.back()} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
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
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <View style={{ paddingTop: kopfOben(insets.top), paddingHorizontal: RAND - 8, gap: abstand(2.5) }}>
        <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View pointerEvents="none" style={{ position: "absolute", left: 70, right: 70, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <T v="h3" style={{ fontSize: 19, fontVariant: ["tabular-nums"] }}>
              Frage {index + 1}/{ids.length}
            </T>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Icon name="time-outline" size={12} color={knapp ? farben.rot : farben.text3} />
              <T v="klein" farbe={knapp ? farben.rot : undefined} style={{ fontSize: 11.5, fontVariant: ["tabular-nums"] }}>
                noch {dauer(rest)} · {erledigt} beantwortet
              </T>
            </View>
          </View>
          <KopfTaste
            icon="close"
            label="Simulation abbrechen"
            onPress={abbrechenFragen}
          />
          <Pressable onPress={abgebenFragen} hitSlop={10} style={{ paddingHorizontal: abstand(2), height: 40, justifyContent: "center" }}>
            <T v="textStark" farbe={farben.orange}>
              Abgeben
            </T>
          </Pressable>
        </View>
        <View style={{ marginHorizontal: 8, height: 9, borderRadius: 5, backgroundColor: farben.flaeche3 }}>
          <View
            style={{
              width: `${Math.max(4, (erledigt / Math.max(1, ids.length)) * 100)}%`,
              height: "100%",
              borderRadius: 5,
              backgroundColor: farben.orange,
              ...leuchten(farben.orange, 0.7, 8, 0),
            }}
          />
        </View>
      </View>

      {/* Fragen-Navigator */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: RAND, paddingVertical: abstand(3), gap: abstand(2) }}>
        {ids.map((id, i) => {
          const f = frageVon(id);
          const fertig = f ? beantwortet(f, antworten[id]) : false;
          const aktiv = i === index;
          return (
            <Pressable
              key={id}
              onPress={() => {
                tippen();
                gehe(i);
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: fertig ? farben.flaeche3 : farben.flaeche,
                borderWidth: 1.5,
                borderColor: aktiv ? farben.orange : fertig ? farben.flaeche3 : farben.linie,
              }}
            >
              <T v="klein" farbe={aktiv ? farben.orange : fertig ? farben.text : farben.text3} style={{ ...schrift.textHalb }}>
                {i + 1}
              </T>
            </Pressable>
          );
        })}
      </ScrollView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(1), paddingBottom: abstand(8) }} keyboardShouldPersistTaps="handled">
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
        <View style={{ flexDirection: "row", gap: abstand(3), paddingHorizontal: RAND, paddingTop: abstand(2), paddingBottom: insets.bottom + abstand(3) }}>
          <Knopf titel="Zurück" art="sekundaer" deaktiviert={index === 0} onPress={() => gehe(index - 1)} style={{ flex: 1 }} />
          {index + 1 < ids.length ? (
            <Knopf titel="Nächste Frage" icon="arrow-forward" onPress={() => gehe(index + 1)} style={{ flex: 2 }} />
          ) : (
            <Knopf titel="Abgeben" icon="checkmark" onPress={abgebenFragen} style={{ flex: 2 }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
