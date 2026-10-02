import { useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, ScrollView, useWindowDimensions, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { kopfOben } from "@/components/ui";
import { AllesRichtig, ErgebnisHeld, ErgebnisRing, ErgebnisWerte, FehlerKarte, LeerZustand, type Ton } from "@/components/auswertung";
import { FrageAktionen } from "@/components/frage-aktionen";
import { FrageAnsicht, useAntwortReihenfolge } from "@/components/frage-ansicht";
import { AktionsLeiste, FrageKopf, FragenFortschritt, GlasRund, HauptKnopf, Kapsel, KopfPille, NebenKnopf, type Segment } from "@/components/frage-rahmen";
import { HinweisAnzeige, useHinweis } from "@/components/hinweis";
import { KiBlase, KiKnopf, type KiAnker } from "@/components/ki-hilfe";
import { Kopfzeile } from "@/components/home";
import { dialog } from "@/components/dialog";
import { ErklaerKnopf } from "@/components/erklaerung";
import { FarbweltBereich, useDarstellung } from "@/lib/darstellung";
import { animationFuer } from "@/lib/erklaer-animationen";
import { useErklaervideos } from "@/lib/erklaervideos";
import { dauer } from "@/lib/format";
import { FOTOS, themaFoto } from "@/lib/fotos";
import { antwortRichtig, frageVon, FRAGEN, fragenZuThema, istBildfrage, istZeichen, themaVon, zahlLesen, type ThemaId } from "@/lib/fragen";
import { erfolg, fehler } from "@/lib/haptik";
import { frageMelden } from "@/lib/melden";
import { fehlerIds, gemerktIds, gemischt, heuteBeantwortet, schwierigeIds, serieAktuell, smartAuswahl, useStand, type Stand } from "@/lib/stand";
import { RAND } from "@/lib/theme";
import { useZurueckTaste } from "@/lib/zurueck-taste";

type Params = { modus?: string; thema?: string; start?: string };

function fragenFuer(p: Params, s: Stand): string[] {
  const modus = p.modus ?? "smart";
  const thema = p.thema as ThemaId | undefined;
  switch (modus) {
    case "thema": {
      const liste = thema ? fragenZuThema(thema) : FRAGEN;
      const ids = smartAuswahl(s, liste.length, liste);
      return p.start ? [p.start, ...ids.filter((id) => id !== p.start)] : ids;
    }
    case "fehler":
      return gemischt(fehlerIds(s).filter((id) => !thema || frageVon(id)?.thema === thema));
    case "gemerkt":
      return gemischt(gemerktIds(s));
    case "schwierig":
      return schwierigeIds(s).slice(0, 20);
    case "bild":
      return smartAuswahl(s, 15, FRAGEN.filter((f) => istBildfrage(f.bild)));
    case "zeichen":
      return smartAuswahl(s, 15, FRAGEN.filter((f) => istZeichen(f.bild)));
    case "zahl":
      return smartAuswahl(s, 15, FRAGEN.filter((f) => f.art === "zahl"));
    case "alle":
      return smartAuswahl(s, 20);
    default:
      return smartAuswahl(s, 10);
  }
}

export default function Training() {
  const params = useLocalSearchParams<Params>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { farbwelt: f, belohnungen } = useDarstellung();
  const { stand, antwort, merken, trainingFertig } = useStand();
  const { videos } = useErklaervideos();

  const [ids] = useState(() => fragenFuer(params, stand));
  const [zielOffenAmStart] = useState(() => heuteBeantwortet(stand) < stand.tagesziel);
  const [index, setIndex] = useState(0);
  const [auswahl, setAuswahl] = useState<number[]>([]);
  const [eingabe, setEingabe] = useState("");
  const [aufgedeckt, setAufgedeckt] = useState(false);
  const [ergebnisse, setErgebnisse] = useState<{ id: string; richtig: boolean }[]>([]);
  const [xpSumme, setXpSumme] = useState(0);
  const [letzteXp, setLetzteXp] = useState(0);
  const [fertig, setFertig] = useState(false);
  const [dauerSek, setDauerSek] = useState(0);
  const [kiAnker, setKiAnker] = useState<KiAnker | null>(null);
  const hinweis = useHinweis();
  const reihenfolge = useAntwortReihenfolge();
  const scroll = useRef<ScrollView>(null);
  const frageSeit = useRef(Date.now());
  const startMs = useRef(Date.now());

  const frage = ids[index] ? frageVon(ids[index]) : undefined;

  function schliessen() {
    if (ergebnisse.length === 0 || fertig) {
      router.back();
      return;
    }
    dialog("Training beenden?", "Deine bisherigen Antworten sind gespeichert.", [
      { text: "Weiterlernen", style: "cancel" },
      { text: "Beenden", style: "destructive", onPress: () => router.back() },
    ]);
  }

  useZurueckTaste(schliessen);

  function pruefen() {
    if (!frage) return;
    Keyboard.dismiss();
    const ok = antwortRichtig(frage, auswahl, eingabe);
    const xp = antwort(frage.id, ok, (Date.now() - frageSeit.current) / 1000);
    if (ok) erfolg();
    else fehler();
    setErgebnisse((e) => [...e, { id: frage.id, richtig: ok }]);
    setXpSumme((s) => s + xp);
    setLetzteXp(xp);
    setAufgedeckt(true);
  }

  function weiter() {
    if (index + 1 < ids.length) {
      setIndex(index + 1);
      setAuswahl([]);
      setEingabe("");
      setAufgedeckt(false);
      frageSeit.current = Date.now();
      scroll.current?.scrollTo({ y: 0, animated: false });
      return;
    }
    const richtig = ergebnisse.filter((e) => e.richtig).length;
    trainingFertig(richtig, ergebnisse.length);
    setDauerSek(Math.round((Date.now() - startMs.current) / 1000));
    setFertig(true);
  }

  // ------------------------------------------------------------------ leer
  if (ids.length === 0) {
    const erledigt = params.modus === "fehler" || params.modus === "schwierig";
    const text =
      params.modus === "fehler"
        ? "Keine offenen Fehler – alles, was du falsch hattest, sitzt inzwischen."
        : params.modus === "gemerkt"
          ? "Du hast noch keine Favoriten. Tippe beim Lernen oben rechts auf das Herz."
          : "Hier gibt es gerade keine Fragen.";
    return (
      <FarbweltBereich farbwelt={f}>
        <StatusBar style={f.hell ? "dark" : "light"} />
        <View style={{ flex: 1, backgroundColor: f.grund, paddingTop: insets.top }}>
          <LeerZustand icon={erledigt ? "checkmark-done" : "heart-outline"} titel={erledigt ? "Alles erledigt." : "Noch leer."} text={text}>
            <HauptKnopf titel="Zurück" onPress={() => router.back()} />
          </LeerZustand>
        </View>
      </FarbweltBereich>
    );
  }

  // ------------------------------------------------------------------ Auswertung
  if (fertig) {
    const richtig = ergebnisse.filter((e) => e.richtig).length;
    const quote = ergebnisse.length ? richtig / ergebnisse.length : 0;
    const falsche = ergebnisse.filter((e) => !e.richtig);
    const heute = heuteBeantwortet(stand);
    const zielJetzt = zielOffenAmStart && heute >= stand.tagesziel;
    const serie = serieAktuell(stand);
    const ueberschrift = quote >= 0.9 ? "Stark gefahren." : quote >= 0.6 ? "Gute Runde." : "Dranbleiben lohnt sich.";
    const ton: Ton = quote >= 0.8 ? "gruen" : quote >= 0.5 ? "orange" : "rot";
    const bild = params.modus === "thema" && params.thema ? themaFoto(params.thema as ThemaId) : FOTOS.tagesziel;
    const gruen = f.hell ? "#23A548" : "#4ED053";

    return (
      <FarbweltBereich farbwelt={f}>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: f.grund }}>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <ErgebnisHeld bild={bild} oben={insets.top + 16} hoehe={insets.top + 392} label="Training beendet" titel={ueberschrift}>
              <ErgebnisRing anteil={quote} wert={`${Math.round(quote * 100)}`} einheit="%" unter={`${richtig} von ${ergebnisse.length} richtig`} ton={ton} />
            </ErgebnisHeld>

            <ErgebnisWerte
              werte={[
                // XP nur, wenn die Einblendungen an sind – sonst die Zeit der Runde
                belohnungen ? { icon: "flash", farbe: f.orange, wert: `+${xpSumme}`, label: "XP" } : { icon: "time-outline", farbe: f.orange, wert: dauer(dauerSek), label: "Zeit" },
                { icon: "flame", farbe: "#FF8A2A", wert: `${serie}`, label: serie === 1 ? "Tag Serie" : "Tage Serie" },
                { icon: "checkmark-circle", farbe: heute >= stand.tagesziel ? gruen : "#FFB45C", wert: `${Math.min(heute, 999)}/${stand.tagesziel}`, label: "heute" },
              ]}
              style={{ marginHorizontal: RAND, marginTop: -46 }}
            />
            {zielJetzt ? (
              <View style={{ alignItems: "center", marginTop: 14 }}>
                <Kapsel icon="checkmark-circle" text="Tagesziel geschafft" farbe={gruen} />
              </View>
            ) : null}

            <Kopfzeile titel={falsche.length > 0 ? "Nochmal ansehen" : "Fehlerfrei"} link={falsche.length > 0 ? `${falsche.length} Fehler` : undefined} style={{ marginTop: 30 }} />
            <View style={{ paddingHorizontal: RAND, gap: 10 }}>
              {falsche.length > 0 ? (
                falsche.map((e) => {
                  const fr = frageVon(e.id);
                  return fr ? <FehlerKarte key={e.id} frage={fr} /> : null;
                })
              ) : (
                <AllesRichtig text="Keine einzige Frage falsch – genau so darf es in der Prüfung laufen." />
              )}
            </View>
          </ScrollView>

          <AktionsLeiste unten={insets.bottom}>
            {falsche.length > 0 ? (
              <>
                <NebenKnopf titel="Fertig" onPress={() => router.back()} style={{ flex: 1 }} />
                <HauptKnopf titel="Fehler üben" icon="refresh" onPress={() => router.replace({ pathname: "/training", params: { modus: "fehler" } })} style={{ flex: 1.5 }} />
              </>
            ) : (
              <HauptKnopf titel="Fertig" icon="checkmark" onPress={() => router.back()} style={{ flex: 1 }} />
            )}
          </AktionsLeiste>
        </View>
      </FarbweltBereich>
    );
  }

  if (!frage) return null;
  const kannPruefen = frage.art === "auswahl" ? auswahl.length > 0 : zahlLesen(eingabe) != null;
  const gemerkt = Boolean(stand.fragen[frage.id]?.m);
  const letzte = index + 1 === ids.length;
  const thema = themaVon(frage.thema);
  const segmente: Segment[] = ids.map((_, i) => (i < ergebnisse.length ? (ergebnisse[i].richtig ? "richtig" : "falsch") : i === index ? "aktiv" : "offen"));
  // Erklärvideo des Inhabers oder eingebaute Animation – dann ein Knopf mehr unten
  const erklaerVideo = Boolean(videos[frage.id]);
  const erklaerbar = erklaerVideo || animationFuer(frage) != null;
  const rund = erklaerbar && width < 390 ? 50 : 56;

  // ------------------------------------------------------------------ Frage
  return (
    <FarbweltBereich farbwelt={f}>
      <StatusBar style={f.hell ? "dark" : "light"} />
      <View style={{ flex: 1, backgroundColor: f.grund }}>
        <FrageKopf
          oben={kopfOben(insets.top)}
          links={<GlasRund icon="close" label="Training beenden" onPress={schliessen} />}
          rechts={<GlasRund icon={gemerkt ? "heart" : "heart-outline"} farbe={gemerkt ? f.orange : undefined} label={gemerkt ? "Aus den Favoriten entfernen" : "Zu den Favoriten"} onPress={() => merken(frage.id)} />}
          titel={`Frage ${index + 1} von ${ids.length}`}
          unter={<KopfPille bild={themaFoto(frage.thema)} text={thema.titel} />}
        >
          <View style={{ paddingHorizontal: RAND }}>
            <FragenFortschritt segmente={segmente} />
          </View>
        </FrageKopf>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: 6, paddingBottom: 28 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <FrageAnsicht
              frage={frage}
              auswahl={auswahl}
              onAuswahl={setAuswahl}
              eingabe={eingabe}
              onEingabe={setEingabe}
              aufgedeckt={aufgedeckt}
              reihenfolge={reihenfolge(frage)}
              xp={belohnungen ? letzteXp : undefined}
              // Nach dem Prüfen so weit rollen, dass Ergebnis und Erklärung ins Bild kommen.
              onErgebnisY={(y) => scroll.current?.scrollTo({ y: Math.max(0, y - 4), animated: true })}
            />
            {aufgedeckt ? (
              <View style={{ marginTop: 14 }}>
                <FrageAktionen frageId={frage.id} onHinweis={hinweis.zeigen} ohneKi />
              </View>
            ) : null}
          </ScrollView>
          <AktionsLeiste unten={insets.bottom}>
            <KiKnopf aktiv={kiAnker != null} onOeffnen={setKiAnker} groesse={rund} />
            {erklaerbar ? <ErklaerKnopf groesse={rund} video={erklaerVideo} onPress={() => router.push({ pathname: "/erklaerung", params: { frage: frage.id } })} /> : null}
            <NebenKnopf icon="flag-outline" onPress={() => frageMelden(frage.id)} style={{ width: rund, height: rund }} />
            {aufgedeckt ? (
              <HauptKnopf titel={letzte ? "Auswertung" : "Nächste Frage"} icon="arrow-forward" onPress={weiter} style={{ flex: 1 }} />
            ) : (
              <HauptKnopf titel="Antwort prüfen" deaktiviert={!kannPruefen} onPress={pruefen} style={{ flex: 1 }} />
            )}
          </AktionsLeiste>
        </KeyboardAvoidingView>

        {/* KI-Hilfe als Sprechblase über dem KI-Knopf – je Frage neu */}
        <KiBlase
          key={frage.id}
          kontext={{ frage, auswahl: aufgedeckt ? auswahl : undefined, eingabe: aufgedeckt ? eingabe : undefined }}
          anker={kiAnker}
          onSchliessen={() => setKiAnker(null)}
        />

        {/* Karteikarte erstellt … */}
        <HinweisAnzeige wert={hinweis.wert} inhalt={hinweis.inhalt} oben={insets.top + 70} />
      </View>
    </FarbweltBereich>
  );
}
