import { useRef, useState } from "react";
import { Alert, Animated, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Abschnitt, Chip, Gruppe, Knopf, Plakette, T, Zeile } from "@/components/ui";
import { FrageAnsicht } from "@/components/frage-ansicht";
import { Ring } from "@/components/grafik";
import { antwortRichtig, frageVon, FRAGEN, fragenZuThema, istZeichen, themaVon, zahlLesen, type ThemaId } from "@/lib/fragen";
import { erfolg, fehler, tippen } from "@/lib/haptik";
import { fehlerIds, gemerktIds, gemischt, heuteBeantwortet, serieAktuell, smartAuswahl, useStand, type Stand } from "@/lib/stand";
import { abstand, farben, RAND } from "@/lib/theme";

type Params = { modus?: string; thema?: string; start?: string };

const TITEL: Record<string, string> = {
  smart: "Training",
  alle: "Alle Fragen",
  bild: "Bildfragen",
  zeichen: "Zeichenfragen",
  zahl: "Zahlenfragen",
  gemerkt: "Gemerkte Fragen",
  fehler: "Fehler üben",
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
    case "bild":
      return smartAuswahl(s, 15, FRAGEN.filter((f) => f.bild?.startsWith("lage_")));
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
  const [toastXp, setToastXp] = useState(0);
  const toast = useRef(new Animated.Value(0)).current;
  const scroll = useRef<ScrollView>(null);

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
    const xp = antwort(frage.id, ok);
    if (ok) erfolg();
    else fehler();
    setErgebnisse((e) => [...e, { id: frage.id, richtig: ok }]);
    setXpSumme((s) => s + xp);
    setAufgedeckt(true);
    setToastXp(xp);
    toast.setValue(0);
    Animated.sequence([
      Animated.timing(toast, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(toast, { toValue: 2, duration: 260, useNativeDriver: true }),
    ]).start();
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);
  }

  function weiter() {
    if (index + 1 < ids.length) {
      setIndex(index + 1);
      setAuswahl([]);
      setEingabe("");
      setAufgedeckt(false);
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
          ? "Du hast noch keine Fragen gemerkt. Tippe beim Lernen oben rechts auf das Lesezeichen."
          : "Hier gibt es gerade keine Fragen.";
    return (
      <View style={{ flex: 1, backgroundColor: farben.grund, paddingTop: insets.top, paddingHorizontal: RAND, justifyContent: "center", gap: abstand(5) }}>
        <Plakette icon={params.modus === "fehler" ? "checkmark-done" : "bookmark-outline"} groesse={64} />
        <T v="titel">{params.modus === "fehler" ? "Alles erledigt." : "Noch leer."}</T>
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
      <View style={{ paddingTop: insets.top + abstand(2), paddingHorizontal: RAND - 6, paddingBottom: abstand(3), gap: abstand(3) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(3) }}>
          <Pressable onPress={schliessen} hitSlop={10} accessibilityLabel="Schließen" style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="close" size={26} color={farben.text} />
          </Pressable>
          <View style={{ flex: 1, flexDirection: "row", gap: 3 }}>
            {ids.map((id, i) => {
              const e = ergebnisse[i];
              return (
                <View
                  key={id}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: e ? (e.richtig ? farben.gruen : farben.rot) : i === index ? farben.orange : farben.flaeche3,
                  }}
                />
              );
            })}
          </View>
          <Pressable
            onPress={() => {
              tippen();
              merken(frage.id);
            }}
            hitSlop={10}
            accessibilityLabel={gemerkt ? "Nicht mehr merken" : "Frage merken"}
            style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name={gemerkt ? "bookmark" : "bookmark-outline"} size={22} color={gemerkt ? farben.orange : farben.text2} />
          </Pressable>
        </View>
        <T v="klein" style={{ paddingHorizontal: 6 }}>
          {titel} · Frage {index + 1} von {ids.length}
        </T>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(2), paddingBottom: abstand(8) }} keyboardShouldPersistTaps="handled">
          <FrageAnsicht frage={frage} auswahl={auswahl} onAuswahl={setAuswahl} eingabe={eingabe} onEingabe={setEingabe} aufgedeckt={aufgedeckt} />
        </ScrollView>
        <View style={{ paddingHorizontal: RAND, paddingTop: abstand(3), paddingBottom: insets.bottom + abstand(3), borderTopWidth: 1, borderColor: farben.linie, backgroundColor: farben.grund }}>
          {aufgedeckt ? (
            <Knopf titel={letzte ? "Auswertung" : "Weiter"} icon="arrow-forward" onPress={weiter} />
          ) : (
            <Knopf titel="Antwort prüfen" deaktiviert={!kannPruefen} onPress={pruefen} />
          )}
        </View>
      </KeyboardAvoidingView>

      {/* +XP */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: insets.top + 64,
          alignSelf: "center",
          paddingHorizontal: abstand(3.5),
          paddingVertical: abstand(1.5),
          borderRadius: 999,
          backgroundColor: farben.flaeche2,
          borderWidth: 1,
          borderColor: farben.orangeLinie,
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          opacity: toast.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
          transform: [{ translateY: toast.interpolate({ inputRange: [0, 1, 2], outputRange: [8, 0, -10] }) }],
        }}
      >
        <Ionicons name="flash" size={14} color={farben.orange} />
        <T v="textStark" farbe={farben.orange} style={{ fontSize: 14 }}>
          +{toastXp} XP
        </T>
      </Animated.View>
    </View>
  );
}
