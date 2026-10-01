import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { dialog } from "@/components/dialog";
import { useAntwortReihenfolge } from "@/components/frage-ansicht";
import { FragenNavigator } from "@/components/frage-rahmen";
import { Icon } from "@/components/icon";
import {
  AntwortZeile,
  Aufploppen,
  BUCHSTABEN,
  Bereich,
  Etikett,
  GOLD,
  GRUEN,
  KartenKnopf,
  KopfZeile,
  Podest,
  QuizBild,
  Ring,
  ROT,
  RundKnopf,
  XpPille,
} from "@/components/live-quiz";
import { NutzerBild } from "@/components/profilbild";
import { FarbweltBereich, NACHT } from "@/lib/darstellung";
import { frageVon, zahlText, type Frage } from "@/lib/fragen";
import { erfolg, fehler as fehlerRuetteln, stoss, tippen } from "@/lib/haptik";
import {
  istBeantwortet,
  pruefungRestzeit,
  PRUEFUNG_MAX_FEHLER,
  type LivePruefung,
  type PruefungLage,
  type PruefungMeins,
  type PruefungsAntworten,
  type PruefungStand,
} from "@/lib/live-pruefung";
import { farben, leuchten, mitDeckkraft, schrift, verlauf } from "@/lib/theme";

// Live-Prüfung im geteilten Bildschirm: unten der Prüfungsbereich, oben die
// Kamera. Zuschauer schreiben wie in der App (Navigator, Fehlerpunkte, Abgeben,
// Stempel), der Gastgeber sieht live, wie weit alle sind, kann Zeit geben oder
// vorzeitig beenden – danach Ergebnis, Podest und die schwersten Fragen.

const LIVE_ROT = "#FF2D55";
const zahl = (n: number) => n.toLocaleString("de-DE");

function minSek(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Restzeit der laufenden Prüfung, viermal pro Sekunde neu. */
function useRest(pruefung: LivePruefung | null): number {
  const [rest, setRest] = useState(() => (pruefung?.status === "laeuft" ? pruefungRestzeit(pruefung) : 0));
  useEffect(() => {
    if (!pruefung || pruefung.status !== "laeuft") {
      setRest(0);
      return;
    }
    const tick = () => setRest(pruefungRestzeit(pruefung));
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [pruefung]);
  return rest;
}

/** Bereich gleitet von unten herein und beim Ende wieder hinaus. */
function useAuftritt(schluessel: string | null, weg: boolean) {
  const wert = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!schluessel) return;
    wert.setValue(0);
    Animated.spring(wert, { toValue: 1, friction: 9, tension: 70, useNativeDriver: true }).start();
  }, [schluessel, wert]);
  useEffect(() => {
    if (!weg) return;
    Animated.timing(wert, { toValue: 0, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start();
  }, [weg, wert]);
  return {
    opacity: wert.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] }),
    transform: [{ translateY: wert.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) }],
  };
}

/** Countdown im Ring (Minuten:Sekunden), die letzte Minute rot und pulsierend. */
function ZeitRing({ pruefung }: { pruefung: LivePruefung }) {
  const rest = useRest(pruefung);
  const knapp = rest > 0 && rest <= 60_000;
  const puls = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!knapp) return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(puls, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(puls, { toValue: 0, duration: 580, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => {
      a.stop();
      puls.setValue(0);
    };
  }, [knapp, puls]);
  return (
    <Animated.View accessibilityLabel={rest > 0 ? `Noch ${minSek(rest)}` : "Zeit ist um"} style={{ transform: [{ scale: puls.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}>
      <Ring anteil={rest / Math.max(1, pruefung.dauer * 1000)} farbe={knapp ? LIVE_ROT : farben.orange}>
        {rest > 0 ? (
          <Text style={{ ...schrift.titel, fontSize: 13.5, color: knapp ? "#FF6B85" : "#FFFFFF", fontVariant: ["tabular-nums"] }}>{minSek(rest)}</Text>
        ) : (
          <Icon name="hourglass-outline" size={20} color="rgba(255,255,255,0.75)" />
        )}
      </Ring>
    </Animated.View>
  );
}

/** Kleine Pille für Aktionen in der Kopfzeile („Abgeben“, „+1 Min“). */
function Pille({ titel, onPress, rot, aus, icon }: { titel: string; onPress: () => void; rot?: boolean; aus?: boolean; icon?: "add" | "checkmark" | "stop" }) {
  return (
    <Pressable
      disabled={aus}
      onPress={() => {
        tippen();
        onPress();
      }}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={titel}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: rot ? "rgba(255,45,85,0.16)" : "rgba(255,255,255,0.1)",
        borderWidth: 1,
        borderColor: rot ? "rgba(255,45,85,0.5)" : "rgba(255,255,255,0.12)",
        opacity: aus ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      {icon ? <Icon name={icon} size={13} color={rot ? "#FF6B85" : "#FFFFFF"} /> : null}
      <Text style={{ ...schrift.textFett, fontSize: 13, color: rot ? "#FF6B85" : "#FFFFFF" }}>{titel}</Text>
    </Pressable>
  );
}

/** Eigenes Ergebnis kompakt: Fehlerpunkte im kleinen Ring, daneben bestanden oder nicht. */
function EigenesErgebnis({ mein, gesamt, xp }: { mein: PruefungMeins; gesamt: number; xp?: number | null }) {
  const ok = Boolean(mein.bestanden);
  const fp = mein.fehlerpunkte ?? 0;
  const c = ok ? GRUEN : ROT;
  const fuenfer = !ok && (mein.fuenfer ?? 0) >= 2 && fp <= PRUEFUNG_MAX_FEHLER;
  return (
    <Aufploppen schluessel={`ergebnis-${ok}-${fp}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 22, backgroundColor: mitDeckkraft(c, 0.1), borderWidth: 1, borderColor: mitDeckkraft(c, 0.3) }}>
        <Ring anteil={Math.min(1, fp / PRUEFUNG_MAX_FEHLER)} farbe={c}>
          <Text style={{ ...schrift.titel, fontSize: 18, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{fp}</Text>
        </Ring>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name={ok ? "checkmark-circle" : "close-circle"} size={18} color={c} />
            <Text style={{ ...schrift.titel, fontSize: 17, letterSpacing: 0.6, color: c }}>{ok ? "BESTANDEN" : "NICHT BESTANDEN"}</Text>
          </View>
          <Text style={{ ...schrift.textHalb, fontSize: 13, color: "rgba(255,255,255,0.72)" }} numberOfLines={2}>
            {fuenfer ? "Zwei falsche 5-Punkte-Fragen" : `${fp} Fehlerpunkte · ${mein.richtig ?? 0} von ${gesamt} richtig`}
          </Text>
        </View>
        {xp ? <XpPille xp={xp} /> : null}
      </View>
    </Aufploppen>
  );
}

/** Richtige Lösung kurz in Worten (für die Fehlerliste). */
function loesungKurz(f: Frage): string {
  if (f.art === "zahl") return `${zahlText(f.loesung)} ${f.einheit}`;
  return f.antworten
    .filter((a) => a.richtig)
    .map((a) => a.text)
    .join(" · ");
}

/** Eine falsch beantwortete Frage: Text und was richtig gewesen wäre. */
function FehlerZeile({ frage, nummer }: { frage: Frage; nummer: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,90,78,0.18)", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ ...schrift.textFett, fontSize: 12, color: ROT }}>{nummer}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ ...schrift.textHalb, fontSize: 14, lineHeight: 19, color: "#FFFFFF" }} numberOfLines={3}>
          {frage.text}
        </Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Icon name="checkmark-circle" size={14} color={GRUEN} style={{ marginTop: 2 }} />
          <Text style={{ ...schrift.textMittel, flex: 1, fontSize: 13, lineHeight: 18, color: GRUEN }}>{loesungKurz(frage)}</Text>
        </View>
      </View>
      <Text style={{ ...schrift.textFett, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{frage.punkte} P.</Text>
    </View>
  );
}

function Werte({ werte }: { werte: { wert: string; text: string; farbe?: string }[] }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {werte.map((w) => (
        <View key={w.text} style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" }}>
          <Text style={{ ...schrift.titel, fontSize: 19, color: w.farbe ?? "#FFFFFF", fontVariant: ["tabular-nums"] }}>{w.wert}</Text>
          <Text style={{ ...schrift.textMittel, fontSize: 11.5, color: "rgba(255,255,255,0.6)" }}>{w.text}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Zuschauer
// ---------------------------------------------------------------------------

export function PruefungZuschauerBereich({
  lage,
  ichId,
  unten,
  weg = false,
  xp,
  onSpeichern,
  onAbgeben,
  onAnmelden,
  onAusblenden,
  onFehler,
  onLayout,
  style,
}: {
  lage: PruefungLage;
  ichId: string | null;
  unten: number;
  weg?: boolean;
  /** XP für die Prüfung (nur wenn Belohnungen eingeblendet sind). */
  xp?: number | null;
  onSpeichern: (antworten: PruefungsAntworten, aktuell: number) => void;
  onAbgeben: (antworten: PruefungsAntworten) => Promise<string | null>;
  onAnmelden: () => void;
  onAusblenden: () => void;
  onFehler: (text: string) => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { pruefung, mein, platz } = lage;
  const { height } = useWindowDimensions();
  const auftritt = useAuftritt(pruefung?.id ?? null, weg);
  const reihenfolge = useAntwortReihenfolge();
  const [antworten, setAntworten] = useState<PruefungsAntworten>({});
  const [index, setIndex] = useState(0);
  const [sendet, setSendet] = useState(false);
  const abgegebenRef = useRef(false);
  const scroll = useRef<ScrollView>(null);

  // Neue Prüfung: Stand vom Server übernehmen (z. B. nach einem Neustart der App).
  const pruefungId = pruefung?.id ?? null;
  useEffect(() => {
    if (!pruefungId) return;
    setAntworten(mein?.antworten ?? {});
    setIndex(0);
    abgegebenRef.current = Boolean(mein?.abgegeben);
    stoss();
    // nur beim Wechsel der Prüfung
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pruefungId]);

  const fragen = useMemo(() => (pruefung?.fragen ?? []).map((id) => frageVon(id)), [pruefung?.fragen]);
  const laeuft = pruefung?.status === "laeuft";
  const abgegeben = Boolean(mein?.abgegeben);
  const rest = useRest(laeuft && !abgegeben ? pruefung : null);

  async function abschicken(automatisch = false) {
    if (abgegebenRef.current || !pruefung) return;
    abgegebenRef.current = true;
    setSendet(true);
    const problem = await onAbgeben(antworten);
    setSendet(false);
    if (problem) {
      abgegebenRef.current = false;
      if (!automatisch) onFehler(problem);
      return;
    }
    erfolg();
  }

  // Zeit um: automatisch abgeben (offene Fragen zählen als falsch).
  const abschickenRef = useRef(abschicken);
  abschickenRef.current = abschicken;
  useEffect(() => {
    if (!laeuft || abgegeben || !ichId || !pruefung || rest > 0) return;
    abschickenRef.current(true);
  }, [laeuft, abgegeben, ichId, pruefung, rest]);

  // Ergebnis: kurz rütteln.
  const bestanden = mein?.bestanden;
  useEffect(() => {
    if (!abgegeben || bestanden == null) return;
    if (bestanden) erfolg();
    else fehlerRuetteln();
  }, [abgegeben, bestanden]);

  if (!pruefung) return null;
  const gesamt = pruefung.fragen.length;
  // Feste Höhe für die Frage: So bleibt der Bereich gleich hoch und das Video springt nicht bei jeder Frage.
  const inhaltMax = Math.max(200, Math.min(320, height * 0.74 - unten - 230));

  function setzen(i: number, wert: { a?: number[]; e?: string }) {
    const neu = { ...antworten, [String(i)]: wert };
    setAntworten(neu);
    onSpeichern(neu, i);
  }

  function gehe(i: number) {
    setIndex(Math.max(0, Math.min(gesamt - 1, i)));
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  function abgebenFragen() {
    const offen = fragen.filter((f, i) => !istBeantwortet(f, antworten[String(i)])).length;
    dialog("Prüfung abgeben?", offen > 0 ? `${offen} ${offen === 1 ? "Frage ist" : "Fragen sind"} noch offen und zählen als falsch.` : "Alle Fragen sind beantwortet.", [
      { text: "Weiter", style: "cancel" },
      { text: "Abgeben", style: offen > 0 ? "destructive" : "default", onPress: () => abschicken() },
    ]);
  }

  // ------------------------------------------------------------ Gast
  if (laeuft && !ichId) {
    return (
      <Animated.View style={[style, auftritt]} onLayout={onLayout}>
        <Bereich abzeichen={<ZeitRing pruefung={pruefung} />} unten={unten}>
          <KopfZeile links={<Etikett icon="document-text" text="LIVE-PRÜFUNG" />} rechts={<Etikett text={`${gesamt} FRAGEN`} farbe="rgba(255,255,255,0.5)" />} />
          <Text style={{ ...schrift.titelHalb, fontSize: 17, lineHeight: 23, color: "#FFFFFF", textAlign: "center" }}>Alle schreiben gerade die Prüfung – wie in echt, mit Fehlerpunkten.</Text>
          <KartenKnopf titel="Zum Mitmachen anmelden" icon="log-in-outline" onPress={onAnmelden} />
        </Bereich>
      </Animated.View>
    );
  }

  // ------------------------------------------------------------ Ergebnis (abgegeben oder ausgewertet)
  if (abgegeben || !laeuft) {
    const falsch = (mein?.falsch ?? []).map((nr) => ({ nr, frage: fragen[nr] })).filter((x): x is { nr: number; frage: Frage } => Boolean(x.frage));
    const quote = pruefung.teilnehmer ? Math.round((pruefung.bestanden / pruefung.teilnehmer) * 100) : 0;
    return (
      <Animated.View style={[style, auftritt]} onLayout={onLayout}>
        <Bereich
          abzeichen={
            laeuft ? (
              <ZeitRing pruefung={pruefung} />
            ) : (
              <Aufploppen schluessel={`${pruefung.id}-auswertung`}>
                <Ring anteil={quote / 100} farbe={GRUEN}>
                  <Text style={{ ...schrift.titel, fontSize: 14, color: "#FFFFFF" }}>{quote}%</Text>
                </Ring>
              </Aufploppen>
            )
          }
          unten={unten}
          glut={mein ? (mein.bestanden ? GRUEN : ROT) : farben.orange}
        >
          <KopfZeile
            links={<Etikett icon="document-text" text={laeuft ? "ABGEGEBEN" : "ERGEBNIS"} />}
            rechts={laeuft ? <Etikett text="WARTE AUF ALLE" farbe="rgba(255,255,255,0.5)" /> : <RundKnopf label="Prüfung ausblenden" onPress={onAusblenden} />}
          />
          <ScrollView style={{ maxHeight: inhaltMax + 120 }} contentContainerStyle={{ gap: 14, paddingBottom: 4 }} showsVerticalScrollIndicator={false}>
            <FarbweltBereich farbwelt={NACHT}>
              {mein?.abgegeben ? (
                <EigenesErgebnis mein={mein} gesamt={gesamt} xp={xp} />
              ) : (
                <Text style={{ ...schrift.textHalb, fontSize: 15, color: "rgba(255,255,255,0.75)", textAlign: "center" }}>Du hast nicht mitgeschrieben.</Text>
              )}
            </FarbweltBereich>

            {laeuft ? (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }}>
                <Icon name="hourglass-outline" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={{ ...schrift.textMittel, fontSize: 13, color: "rgba(255,255,255,0.65)" }}>Die Rangliste kommt, wenn die Zeit um ist.</Text>
              </View>
            ) : (
              <>
                <Werte
                  werte={[
                    ...(platz ? [{ wert: `${platz.platz}.`, text: `von ${platz.von}`, farbe: platz.platz <= 3 ? GOLD : undefined }] : []),
                    { wert: `${quote} %`, text: "bestanden", farbe: GRUEN },
                    { wert: pruefung.schnitt != null ? zahlText(pruefung.schnitt) : "–", text: "Ø Fehlerpunkte" },
                  ]}
                />
                {pruefung.bestenliste.length ? <Podest spieler={pruefung.bestenliste} ichId={ichId} wert={(p) => `${p.fehlerpunkte} FP`} /> : null}
              </>
            )}

            {falsch.length ? (
              <View style={{ gap: 8 }}>
                <Text style={{ ...schrift.textFett, fontSize: 11.5, letterSpacing: 1.2, color: "rgba(255,255,255,0.5)" }}>DEINE FEHLER</Text>
                {falsch.map((x) => (
                  <FehlerZeile key={x.nr} frage={x.frage} nummer={x.nr + 1} />
                ))}
              </View>
            ) : null}
          </ScrollView>
        </Bereich>
      </Animated.View>
    );
  }

  // ------------------------------------------------------------ Schreiben
  const frage = fragen[index];
  const a = antworten[String(index)] ?? {};
  const erledigt = (i: number) => istBeantwortet(fragen[i], antworten[String(i)]);
  const letzte = index + 1 >= gesamt;

  return (
    <Animated.View style={[style, auftritt]} onLayout={onLayout}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "position" : undefined}>
        <Bereich abzeichen={<ZeitRing pruefung={pruefung} />} unten={unten}>
          <KopfZeile links={<Etikett icon="document-text" text={`FRAGE ${index + 1}/${gesamt}`} />} rechts={<Pille titel="Abgeben" icon="checkmark" onPress={abgebenFragen} aus={sendet} />} />
          <View style={{ marginHorizontal: -16, marginTop: -4 }}>
            <FarbweltBereich farbwelt={NACHT}>
              <FragenNavigator anzahl={gesamt} aktiv={index} erledigt={erledigt} onWahl={gehe} />
            </FarbweltBereich>
          </View>

          <ScrollView ref={scroll} style={{ height: inhaltMax }} contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {frage ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <QuizBild bild={frage.bild ?? null} />
                  <View style={{ flex: 1, gap: 5 }}>
                    <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: frage.punkte >= 5 ? "rgba(255,45,85,0.18)" : "rgba(255,255,255,0.08)" }}>
                      <Text style={{ ...schrift.textFett, fontSize: 11, color: frage.punkte >= 5 ? "#FF8A9E" : "rgba(255,255,255,0.75)" }}>{frage.punkte} FEHLERPUNKTE</Text>
                    </View>
                    <Text style={{ ...schrift.titelHalb, fontSize: 17, lineHeight: 23, color: "#FFFFFF" }}>{frage.text}</Text>
                  </View>
                </View>
                {frage.art === "auswahl" ? (
                  <View style={{ gap: 8 }}>
                    <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>Eine oder mehrere Antworten sind richtig</Text>
                    {reihenfolge(frage).map((i, p) => {
                      const gewaehlt = (a.a ?? []).includes(i);
                      return (
                        <AntwortZeile
                          key={i}
                          buchstabe={BUCHSTABEN[p]}
                          text={frage.antworten[i]?.text ?? ""}
                          zustand={gewaehlt ? "gewaehlt" : "offen"}
                          onPress={() => setzen(index, { a: gewaehlt ? (a.a ?? []).filter((x) => x !== i) : [...(a.a ?? []), i] })}
                        />
                      );
                    })}
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 56, borderRadius: 18, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1.5, borderColor: (a.e ?? "").trim() ? farben.orange : "rgba(255,255,255,0.12)" }}>
                    <TextInput
                      value={a.e ?? ""}
                      onChangeText={(t) => setzen(index, { e: t.replace(/[^0-9.,]/g, "").slice(0, 8) })}
                      placeholder="Zahl eingeben"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      style={{ flex: 1, minWidth: 0, height: 56, color: "#FFFFFF", ...schrift.titel, fontSize: 20 }}
                    />
                    <Text style={{ ...schrift.textHalb, fontSize: 16, color: "rgba(255,255,255,0.7)" }}>{frage.einheit}</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={{ ...schrift.textMittel, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Diese Frage gibt es erst in der neuen App-Version – sie zählt als falsch.</Text>
            )}
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              disabled={index === 0}
              onPress={() => {
                tippen();
                gehe(index - 1);
              }}
              accessibilityRole="button"
              accessibilityLabel="Vorherige Frage"
              style={({ pressed }) => ({ width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", opacity: index === 0 ? 0.35 : pressed ? 0.7 : 1 })}
            >
              <Icon name="chevron-back" size={20} color="#FFFFFF" />
            </Pressable>
            {letzte ? (
              <KartenKnopf titel={sendet ? "Wird abgegeben …" : "Abgeben"} icon="checkmark" haupt aus={sendet} onPress={abgebenFragen} style={{ flex: 1 }} />
            ) : (
              <KartenKnopf titel="Nächste Frage" icon="arrow-forward" haupt onPress={() => gehe(index + 1)} style={{ flex: 1 }} />
            )}
          </View>
        </Bereich>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Gastgeber
// ---------------------------------------------------------------------------

function Fortschritt({ anteil, farbe = farben.orange }: { anteil: number; farbe?: string }) {
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
      <LinearGradient colors={farbe === farben.orange ? verlauf.balken : [farbe, farbe]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.round(Math.min(1, Math.max(0, anteil)) * 100)}%`, height: 6, borderRadius: 3 }} />
    </View>
  );
}

export function PruefungGastgeberBereich({
  pruefung,
  stand,
  beschaeftigt,
  unten,
  weg = false,
  onVerlaengern,
  onBeenden,
  onSchliessen,
  onLayout,
  style,
}: {
  pruefung: LivePruefung;
  stand: PruefungStand | null;
  beschaeftigt: boolean;
  unten: number;
  weg?: boolean;
  onVerlaengern: (sekunden: number) => void;
  onBeenden: () => void;
  onSchliessen: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { height } = useWindowDimensions();
  const auftritt = useAuftritt(pruefung.id, weg);
  const laeuft = pruefung.status === "laeuft";
  const gesamt = pruefung.fragen.length;
  // Feste Höhe für die Liste: Der Bereich wächst nicht, wenn mehr mitschreiben.
  const listeMax = Math.max(130, Math.min(300, height * 0.74 - unten - 330));

  if (!laeuft) {
    const quote = pruefung.teilnehmer ? Math.round((pruefung.bestanden / pruefung.teilnehmer) * 100) : 0;
    return (
      <Animated.View style={[style, auftritt]} onLayout={onLayout}>
        <Bereich
          abzeichen={
            <Aufploppen schluessel={`${pruefung.id}-ende`}>
              <Ring anteil={quote / 100} farbe={GRUEN}>
                <Text style={{ ...schrift.titel, fontSize: 14, color: "#FFFFFF" }}>{quote}%</Text>
              </Ring>
            </Aufploppen>
          }
          glut={GRUEN}
          unten={unten}
        >
          <KopfZeile links={<Etikett icon="document-text" text="ERGEBNIS" />} rechts={<RundKnopf label="Prüfung schließen" onPress={onSchliessen} />} />
          <ScrollView style={{ maxHeight: listeMax + 150 }} contentContainerStyle={{ gap: 14 }} showsVerticalScrollIndicator={false}>
            <Werte
              werte={[
                { wert: `${pruefung.bestanden}/${pruefung.teilnehmer}`, text: "bestanden", farbe: GRUEN },
                { wert: pruefung.schnitt != null ? zahlText(pruefung.schnitt) : "–", text: "Ø Fehlerpunkte" },
                { wert: String(gesamt), text: "Fragen" },
              ]}
            />
            {pruefung.bestenliste.length ? (
              <Podest spieler={pruefung.bestenliste} wert={(p) => `${p.fehlerpunkte} FP`} />
            ) : (
              <Text style={{ ...schrift.textMittel, fontSize: 14, color: "rgba(255,255,255,0.65)", textAlign: "center" }}>Diesmal hat niemand abgegeben.</Text>
            )}
            {pruefung.schwerste.length ? (
              <View style={{ gap: 8 }}>
                <Text style={{ ...schrift.textFett, fontSize: 11.5, letterSpacing: 1.2, color: "rgba(255,255,255,0.5)" }}>DIE SCHWERSTEN FRAGEN</Text>
                {pruefung.schwerste.map((s) => {
                  const f = frageVon(s.frage_id);
                  const anteil = pruefung.teilnehmer ? s.falsch / pruefung.teilnehmer : 0;
                  return f ? (
                    <View key={s.nr} style={{ gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" }}>
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <Text style={{ ...schrift.textHalb, flex: 1, fontSize: 14, lineHeight: 19, color: "#FFFFFF" }} numberOfLines={2}>
                          {f.text}
                        </Text>
                        <Text style={{ ...schrift.textFett, fontSize: 14, color: ROT }}>{Math.round(anteil * 100)} %</Text>
                      </View>
                      <Fortschritt anteil={anteil} farbe={ROT} />
                      <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: GRUEN }} numberOfLines={2}>
                        Richtig: {loesungKurz(f)}
                      </Text>
                    </View>
                  ) : null;
                })}
              </View>
            ) : null}
          </ScrollView>
          <KartenKnopf titel="Fertig" icon="checkmark" haupt aus={beschaeftigt} onPress={onSchliessen} />
        </Bereich>
      </Animated.View>
    );
  }

  const spieler = stand?.spieler ?? [];
  const schreiben = stand?.schreiben ?? 0;
  const abgegeben = stand?.abgegeben ?? 0;
  const alle = schreiben + abgegeben;
  // Fortschritt aller vom Server; ohne ihn aus der (auf 60 begrenzten) Liste.
  const schnitt = stand?.fortschritt ?? (alle ? spieler.reduce((s, p) => s + (p.abgegeben ? gesamt : p.beantwortet), 0) / (alle * gesamt) : 0);

  return (
    <Animated.View style={[style, auftritt]} onLayout={onLayout}>
      <Bereich abzeichen={<ZeitRing pruefung={pruefung} />} unten={unten}>
        <KopfZeile links={<Etikett icon="document-text" text="LIVE-PRÜFUNG" />} rechts={<Etikett text={`${gesamt} FRAGEN`} farbe="rgba(255,255,255,0.5)" />} />
        <Werte
          werte={[
            { wert: zahl(schreiben), text: "schreiben" },
            { wert: zahl(abgegeben), text: "abgegeben" },
            { wert: abgegeben ? `${Math.round(((stand?.bestanden ?? 0) / abgegeben) * 100)} %` : "–", text: "bestanden", farbe: GRUEN },
          ]}
        />
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: "rgba(255,255,255,0.65)" }}>Fortschritt aller</Text>
            <Text style={{ ...schrift.textFett, fontSize: 12.5, color: "#FFFFFF" }}>{Math.round(schnitt * 100)} %</Text>
          </View>
          <Fortschritt anteil={schnitt} />
        </View>

        <ScrollView style={{ height: listeMax }} contentContainerStyle={{ gap: 6 }} showsVerticalScrollIndicator={false}>
          {spieler.length ? (
            spieler.map((p) => (
              <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}>
                <NutzerBild pfad={p.bild_pfad} name={p.name} farbe={p.avatar_farbe} groesse={30} rand={0} />
                <View style={{ flex: 1, gap: 5 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ ...schrift.textHalb, flex: 1, fontSize: 14, color: "#FFFFFF" }} numberOfLines={1}>
                      {p.name}
                    </Text>
                    {p.abgegeben ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: mitDeckkraft(p.bestanden ? "#4ED053" : "#FF5A4E", 0.16) }}>
                        <Icon name={p.bestanden ? "checkmark" : "close"} size={12} color={p.bestanden ? GRUEN : ROT} />
                        <Text style={{ ...schrift.textFett, fontSize: 12, color: p.bestanden ? GRUEN : ROT }}>{p.fehlerpunkte} FP</Text>
                      </View>
                    ) : (
                      <Text style={{ ...schrift.textFett, fontSize: 12.5, color: "rgba(255,255,255,0.75)", fontVariant: ["tabular-nums"] }}>
                        {p.beantwortet}/{gesamt}
                      </Text>
                    )}
                  </View>
                  <Fortschritt anteil={p.abgegeben ? 1 : p.beantwortet / gesamt} farbe={p.abgegeben ? (p.bestanden ? GRUEN : ROT) : farben.orange} />
                </View>
              </View>
            ))
          ) : (
            <View style={{ alignItems: "center", gap: 6, paddingVertical: 14 }}>
              <Icon name="people" size={20} color="rgba(255,255,255,0.45)" />
              <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>Sobald jemand die erste Frage beantwortet, siehst du hier, wie weit alle sind.</Text>
            </View>
          )}
        </ScrollView>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pille titel="1 Min" icon="add" aus={beschaeftigt} onPress={() => onVerlaengern(60)} />
          <Pille titel="3 Min" icon="add" aus={beschaeftigt} onPress={() => onVerlaengern(180)} />
          <View style={{ flex: 1 }} />
          <Pressable
            disabled={beschaeftigt}
            onPress={() => {
              tippen();
              onBeenden();
            }}
            accessibilityRole="button"
            accessibilityLabel="Prüfung beenden"
            style={({ pressed }) => [{ borderRadius: 22, opacity: beschaeftigt ? 0.5 : pressed ? 0.8 : 1 }, leuchten(LIVE_ROT, 0.4, 12, 3)]}
          >
            <LinearGradient colors={["#FF5A5F", "#FF2D55", "#E0124A"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 44, borderRadius: 22, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name="stop" sf="stop.fill" size={13} color="#FFFFFF" />
              <Text style={{ ...schrift.textFett, fontSize: 14.5, color: "#FFFFFF" }}>Beenden</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Bereich>
    </Animated.View>
  );
}
