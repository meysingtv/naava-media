import { useRef, useState } from "react";
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { Abschnitt, Chip, Gruppe, Knopf, KopfKnopf, kopfOben, Plakette, T, Zeile } from "@/components/ui";
import { FrageAktionen } from "@/components/frage-aktionen";
import { FrageAnsicht, useAntwortReihenfolge } from "@/components/frage-ansicht";
import { HinweisAnzeige, useHinweis } from "@/components/hinweis";
import { Ring } from "@/components/grafik";
import { antwortRichtig, frageVon, FRAGEN, fragenZuThema, istBildfrage, istZeichen, themaVon, zahlLesen, type ThemaId } from "@/lib/fragen";
import { erfolg, fehler, tippen } from "@/lib/haptik";
import { frageMelden } from "@/lib/melden";
import { fehlerIds, gemerktIds, gemischt, heuteBeantwortet, schwierigeIds, serieAktuell, smartAuswahl, useStand, type Stand } from "@/lib/stand";
import { abstand, farben, RAND, schrift } from "@/lib/theme";

type Params = { modus?: string; thema?: string; start?: string };

const TITEL: Record<string, string> = {
  smart: "Training",
  alle: "Alle Fragen",
  bild: "Bildfragen",
  zeichen: "Zeichenfragen",
  zahl: "Zahlenfragen",
  gemerkt: "Favoriten",
  fehler: "Fehler üben",
  schwierig: "Schwierige Fragen",
};

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
  const { stand, antwort, merken, trainingFertig } = useStand();

  const [ids] = useState(() => fragenFuer(params, stand));
  const [zielOffenAmStart] = useState(() => heuteBeantwortet(stand) < stand.tagesziel);
  const [index, setIndex] = useState(0);
  const [auswahl, setAuswahl] = useState<number[]>([]);
  const [eingabe, setEingabe] = useState("");
  const [aufgedeckt, setAufgedeckt] = useState(false);
  const [ergebnisse, setErgebnisse] = useState<{ id: string; richtig: boolean }[]>([]);
  const [xpSumme, setXpSumme] = useState(0);
  const [fertig, setFertig] = useState(false);
  const hinweis = useHinweis();
  const reihenfolge = useAntwortReihenfolge();
  const scroll = useRef<ScrollView>(null);
  const frageSeit = useRef(Date.now());

  const titel = params.modus === "thema" && params.thema ? themaVon(params.thema as ThemaId).titel : TITEL[params.modus ?? "smart"] ?? "Training";
  const frage = ids[index] ? frageVon(ids[index]) : undefined;

  function schliessen() {
    if (ergebnisse.length === 0 || fertig) {
      router.back();
      return;
    }
    Alert.alert("Training beenden?", "Deine bisherigen Antworten sind gespeichert.", [
      { text: "Weiterlernen", style: "cancel" },
      { text: "Beenden", style: "destructive", onPress: () => router.back() },
    ]);
  }

  function pruefen() {
    if (!frage) return;
    Keyboard.dismiss();
    const ok = antwortRichtig(frage, auswahl, eingabe);
    const xp = antwort(frage.id, ok, (Date.now() - frageSeit.current) / 1000);
    if (ok) erfolg();
    else fehler();
    setErgebnisse((e) => [...e, { id: frage.id, richtig: ok }]);
    setXpSumme((s) => s + xp);
    setAufgedeckt(true);
    hinweis.zeigen({ icon: "flash", text: `+${xp} XP`, textFarbe: farben.orange });
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);
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
    setFertig(true);
  }

  // ------------------------------------------------------------------ leer
  if (ids.length === 0) {
    const text =
      params.modus === "fehler"
        ? "Keine offenen Fehler – alles, was du falsch hattest, sitzt inzwischen."
        : params.modus === "gemerkt"
          ? "Du hast noch keine Favoriten. Tippe beim Lernen oben rechts auf das Herz."
          : "Hier gibt es gerade keine Fragen.";
    return (
      <View style={{ flex: 1, backgroundColor: farben.grund, paddingTop: insets.top, paddingHorizontal: RAND, justifyContent: "center", gap: abstand(5) }}>
        <Plakette icon={params.modus === "fehler" || params.modus === "schwierig" ? "checkmark-done" : "heart-outline"} groesse={64} />
        <T v="titel">{params.modus === "fehler" || params.modus === "schwierig" ? "Alles erledigt." : "Noch leer."}</T>
        <T v="text">{text}</T>
        <Knopf titel="Zurück" art="sekundaer" onPress={() => router.back()} />
      </View>
    );
  }

  // ------------------------------------------------------------------ Auswertung
  if (fertig) {
    const richtig = ergebnisse.filter((e) => e.richtig).length;
    const quote = ergebnisse.length ? richtig / ergebnisse.length : 0;
    const falsche = ergebnisse.filter((e) => !e.richtig);
    const zielJetzt = zielOffenAmStart && heuteBeantwortet(stand) >= stand.tagesziel;
    const ueberschrift = quote >= 0.9 ? "Stark gefahren." : quote >= 0.6 ? "Gute Runde." : "Dranbleiben lohnt sich.";
    return (
      <View style={{ flex: 1, backgroundColor: farben.grund }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + abstand(10), paddingHorizontal: RAND, paddingBottom: abstand(8), gap: abstand(7) }}>
          <View style={{ alignItems: "center", gap: abstand(4) }}>
            <Ring anteil={quote} groesse={156} dicke={10} farbe={quote >= 0.8 ? farben.gruen : farben.orange}>
              <T v="display" style={{ fontSize: 40 }}>
                {Math.round(quote * 100)} %
              </T>
            </Ring>
            <View style={{ alignItems: "center", gap: 4 }}>
              <T v="titel">{ueberschrift}</T>
              <T v="text">
                {richtig} von {ergebnisse.length} Fragen richtig
              </T>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: abstand(2) }}>
              <Chip text={`+${xpSumme} XP`} icon="flash" farbe={farben.orange} />
              <Chip text={`Serie: ${serieAktuell(stand)} ${serieAktuell(stand) === 1 ? "Tag" : "Tage"}`} icon="flame" farbe={farben.text2} />
              {zielJetzt ? <Chip text="Tagesziel geschafft" icon="checkmark-circle" farbe={farben.gruen} /> : null}
            </View>
          </View>

          {falsche.length > 0 ? (
            <View>
              <Abschnitt titel="Nochmal ansehen" />
              <Gruppe>
                {falsche.map((e) => {
                  const f = frageVon(e.id);
                  return f ? <Zeile key={e.id} icon="close-circle" iconFarbe={farben.rot} titel={f.text} titelZeilen={2} unter={themaVon(f.thema).titel} /> : null;
                })}
              </Gruppe>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ paddingHorizontal: RAND, paddingTop: abstand(3), paddingBottom: insets.bottom + abstand(3), gap: abstand(3), borderTopWidth: 1, borderColor: farben.linie }}>
          {falsche.length > 0 ? <Knopf titel="Fehler üben" icon="refresh" onPress={() => router.replace({ pathname: "/training", params: { modus: "fehler" } })} /> : null}
          <Knopf titel="Fertig" art={falsche.length > 0 ? "sekundaer" : "primaer"} onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  if (!frage) return null;
  const kannPruefen = frage.art === "auswahl" ? auswahl.length > 0 : zahlLesen(eingabe) != null;
  const gemerkt = Boolean(stand.fragen[frage.id]?.m);
  const letzte = index + 1 === ids.length;

  // ------------------------------------------------------------------ Frage
  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <View style={{ paddingTop: kopfOben(insets.top), paddingHorizontal: RAND, paddingBottom: abstand(3), gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <KopfKnopf icon="close" label="Training beenden" onPress={schliessen} />
          <View style={{ flex: 1, alignItems: "center", gap: 5 }}>
            <Text style={{ ...schrift.titelFett, fontSize: 17, color: farben.text, fontVariant: ["tabular-nums"] }}>
              Frage {index + 1}/{ids.length}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                maxWidth: "100%",
                height: 24,
                paddingHorizontal: 10,
                borderRadius: 12,
                backgroundColor: farben.orangeSoft,
              }}
            >
              <Icon name={themaVon(frage.thema).icon as IconName} size={12} color={farben.orangeText} />
              <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 12, color: farben.orangeText, flexShrink: 1 }}>
                {themaVon(frage.thema).titel}
              </Text>
            </View>
          </View>
          <KopfKnopf
            icon={gemerkt ? "heart" : "heart-outline"}
            eckig
            farbe={gemerkt ? farben.orange : farben.text}
            label={gemerkt ? "Aus den Favoriten entfernen" : "Zu den Favoriten"}
            onPress={() => merken(frage.id)}
          />
        </View>
        <View style={{ height: 5, borderRadius: 3, backgroundColor: farben.flaeche2 }}>
          <View
            style={{
              width: `${Math.max(3, ((index + (aufgedeckt ? 1 : 0)) / ids.length) * 100)}%`,
              height: "100%",
              borderRadius: 3,
              backgroundColor: farben.orange,
            }}
          />
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(1), paddingBottom: abstand(6) }} keyboardShouldPersistTaps="handled">
          <FrageAnsicht
            frage={frage}
            auswahl={auswahl}
            onAuswahl={setAuswahl}
            eingabe={eingabe}
            onEingabe={setEingabe}
            aufgedeckt={aufgedeckt}
            reihenfolge={reihenfolge(frage)}
          />
          <View style={{ marginTop: 12 }}>
            <FrageAktionen frageId={frage.id} onHinweis={hinweis.zeigen} />
          </View>
        </ScrollView>
        <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: RAND, paddingTop: abstand(2), paddingBottom: insets.bottom + abstand(3), backgroundColor: farben.grund }}>
          <Pressable
            onPress={() => {
              tippen();
              frageMelden(frage.id);
            }}
            accessibilityLabel="Frage melden"
            style={({ pressed }) => ({
              width: 54,
              height: 54,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: farben.flaeche2,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Icon name="flag-outline" sf="flag" size={21} color={farben.text2} />
          </Pressable>
          {aufgedeckt ? (
            <Knopf titel={letzte ? "Auswertung" : "Nächste Frage"} icon="arrow-forward" onPress={weiter} style={{ flex: 1, height: 54 }} />
          ) : (
            <Knopf titel="Antwort prüfen" deaktiviert={!kannPruefen} onPress={pruefen} style={{ flex: 1, height: 54 }} />
          )}
        </View>
      </KeyboardAvoidingView>

      {/* +XP, Karteikarte erstellt … */}
      <HinweisAnzeige wert={hinweis.wert} inhalt={hinweis.inhalt} oben={insets.top + 64} />
    </View>
  );
}
