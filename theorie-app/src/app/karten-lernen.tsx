import { useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ring } from "@/components/grafik";
import { HinweisAnzeige, useHinweis } from "@/components/hinweis";
import { FlipKarte } from "@/components/karteikarte";
import { Chip, Knopf, kopfOben, KopfTaste, Plakette, T } from "@/components/ui";
import { erfolg, tippen } from "@/lib/haptik";
import { karteInhalt, lernListe, stapelIds, stapelTitel, type LernAuswahl, type StapelId } from "@/lib/karteikarten";
import { KARTEN_ABSTAENDE, karteFaellig, useStand } from "@/lib/stand";
import { abstand, farben, leuchten, RAND, schrift } from "@/lib/theme";

type Params = { stapel?: string; alle?: string };

/** So oft kommt eine nicht gewusste Karte in derselben Runde wieder. */
const MAX_WIEDERHOLUNG = 3;

function tageText(tage: number): string {
  if (tage <= 0) return "Gleich nochmal";
  if (tage === 1) return "Morgen wieder";
  return `In ${tage} Tagen wieder`;
}

export default function KartenLernen() {
  const params = useLocalSearchParams<Params>();
  const auswahl = (params.stapel ?? "heute") as LernAuswahl;
  const alle = params.alle === "1";
  const insets = useSafeAreaInsets();
  const { stand, karteBewerten } = useStand();
  const hinweis = useHinweis();

  const [schlange, setSchlange] = useState<string[]>(() => lernListe(stand, auswahl, alle));
  const [pos, setPos] = useState(0);
  const [umgedreht, setUmgedreht] = useState(false);
  const [gesehen, setGesehen] = useState(false);
  const [fertig, setFertig] = useState(false);
  const [ergebnis, setErgebnis] = useState({ gewusst: 0, nochmal: 0, xp: 0 });
  const bewertet = useRef(new Set<string>());
  const wiederholt = useRef(new Map<string, number>());
  const seit = useRef(Date.now());

  const titel = auswahl === "heute" ? "Heute dran" : stapelTitel(auswahl as StapelId);
  const id = schlange[pos];
  const inhalt = id ? karteInhalt(stand, id) : null;

  function neueRunde() {
    const liste = lernListe(stand, auswahl, alle);
    bewertet.current = new Set();
    wiederholt.current = new Map();
    setSchlange(liste);
    setPos(0);
    setUmgedreht(false);
    setGesehen(false);
    setErgebnis({ gewusst: 0, nochmal: 0, xp: 0 });
    setFertig(false);
    seit.current = Date.now();
  }

  function bewerten(gewusst: boolean) {
    if (!id) return;
    const xp = karteBewerten(id, gewusst, (Date.now() - seit.current) / 1000);
    if (gewusst) erfolg();
    else tippen();
    const erstesMal = !bewertet.current.has(id);
    bewertet.current.add(id);
    setErgebnis((e) => ({
      gewusst: e.gewusst + (erstesMal && gewusst ? 1 : 0),
      nochmal: e.nochmal + (erstesMal && !gewusst ? 1 : 0),
      xp: e.xp + xp,
    }));
    if (xp > 0) hinweis.zeigen({ icon: "flash", text: `+${xp} XP`, textFarbe: farben.orange });

    let neu = schlange;
    if (!gewusst) {
      const n = wiederholt.current.get(id) ?? 0;
      if (n < MAX_WIEDERHOLUNG) {
        wiederholt.current.set(id, n + 1);
        neu = [...schlange, id];
        setSchlange(neu);
      }
    }
    if (pos + 1 < neu.length) {
      setPos(pos + 1);
      setUmgedreht(false);
      setGesehen(false);
      seit.current = Date.now();
    } else {
      setFertig(true);
    }
  }

  // ------------------------------------------------------------------ nichts dran
  if (schlange.length === 0) {
    const stapelLeer = auswahl !== "heute" && stapelIds(stand, auswahl as StapelId).length === 0;
    const keineKarten = auswahl === "heute" && stand.karteikarten.karten.length === 0 && Object.keys(stand.karteikarten.faecher).length === 0;
    return (
      <View style={{ flex: 1, backgroundColor: farben.grund, paddingTop: insets.top, paddingBottom: insets.bottom + abstand(3), paddingHorizontal: RAND, justifyContent: "center", gap: abstand(5) }}>
        <Plakette icon={keineKarten || stapelLeer ? "albums-outline" : "checkmark-done"} groesse={64} />
        <T v="titel">{keineKarten || stapelLeer ? "Noch keine Karten." : "Alles wiederholt."}</T>
        <T v="text">
          {keineKarten
            ? "Tippe beim Lernen unter einer Frage auf „Karteikarte“ – oder fang gleich mit den Verkehrszeichen an."
            : stapelLeer
              ? "In diesem Stapel liegen gerade keine Karten."
              : "Gerade ist keine Karte dran. Die nächsten kommen, sobald ihre Pause vorbei ist – oder geh den Stapel einmal komplett durch."}
        </T>
        <View style={{ gap: abstand(3) }}>
          {keineKarten ? (
            <Knopf titel="Verkehrszeichen lernen" icon="arrow-forward" onPress={() => router.replace({ pathname: "/karten-lernen", params: { stapel: "zeichen" } })} />
          ) : !stapelLeer && auswahl !== "heute" && !alle ? (
            <Knopf titel="Alle Karten durchgehen" icon="refresh" onPress={() => router.replace({ pathname: "/karten-lernen", params: { stapel: auswahl, alle: "1" } })} />
          ) : null}
          <Knopf titel="Zurück" art="sekundaer" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  // ------------------------------------------------------------------ Auswertung
  if (fertig) {
    const gesamt = ergebnis.gewusst + ergebnis.nochmal;
    const quote = gesamt ? ergebnis.gewusst / gesamt : 0;
    const rest = alle ? 0 : lernListe(stand, auswahl, false).length;
    const ueberschrift = quote >= 0.9 ? "Sitzt richtig gut." : quote >= 0.6 ? "Gute Runde." : "Dranbleiben lohnt sich.";
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
              <T v="text" zentriert>
                {ergebnis.gewusst} von {gesamt} {gesamt === 1 ? "Karte" : "Karten"} auf Anhieb gewusst
              </T>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: abstand(2) }}>
              {ergebnis.xp > 0 ? <Chip text={`+${ergebnis.xp} XP`} icon="flash" farbe={farben.orange} /> : null}
              <Chip text={rest > 0 ? `Noch ${rest} dran` : "Für heute fertig"} icon={rest > 0 ? "albums-outline" : "checkmark-circle"} farbe={rest > 0 ? farben.text2 : farben.gruen} />
            </View>
          </View>
          <View style={{ padding: abstand(4), borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie, gap: 6 }}>
            <T v="textStark">So geht es weiter</T>
            <T v="text" style={{ fontSize: 14, lineHeight: 20 }}>
              Gewusste Karten machen Pause – erst einen Tag, dann 3, 7, 14 und 30 Tage. Was du nicht wusstest, kommt heute noch einmal dran.
            </T>
          </View>
        </ScrollView>
        <View style={{ paddingHorizontal: RAND, paddingTop: abstand(3), paddingBottom: insets.bottom + abstand(3), gap: abstand(3), borderTopWidth: 1, borderColor: farben.linie }}>
          {rest > 0 ? <Knopf titel="Weiter lernen" icon="arrow-forward" onPress={neueRunde} /> : null}
          <Knopf titel="Fertig" art={rest > 0 ? "sekundaer" : "primaer"} onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  if (!inhalt || !id) return null;
  const fach = stand.karteikarten.faecher[id]?.fach;
  const faellig = karteFaellig(stand, id);
  const naechstesFach = Math.min(KARTEN_ABSTAENDE.length - 1, (fach ?? 0) + 1);

  // ------------------------------------------------------------------ Karte
  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <View style={{ paddingTop: kopfOben(insets.top), paddingHorizontal: RAND - 8, paddingBottom: abstand(3), gap: abstand(2.5) }}>
        <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View pointerEvents="none" style={{ position: "absolute", left: 56, right: 56, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ ...schrift.textMittel, fontSize: 18, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>
              Karte {pos + 1} von {schlange.length}
            </Text>
            <Text numberOfLines={1} style={{ ...schrift.text, fontSize: 12.5, color: farben.text3 }}>
              {alle ? `${titel} · alle durchgehen` : titel}
            </Text>
          </View>
          <KopfTaste icon="close" label="Lernen beenden" onPress={() => router.back()} />
          <View style={{ width: 40 }} />
        </View>
        <View style={{ marginHorizontal: 12, height: 6, borderRadius: 3, backgroundColor: "#1C232B" }}>
          <View
            style={{
              width: `${Math.max(3, (pos / schlange.length) * 100)}%`,
              height: "100%",
              borderRadius: 3,
              backgroundColor: farben.orangeHell,
              ...leuchten(farben.orangeHell, 0.7, 6, 0),
            }}
          />
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: RAND, paddingTop: abstand(1), paddingBottom: abstand(3) }}>
        <FlipKarte
          key={`${pos}-${id}`}
          inhalt={inhalt}
          umgedreht={umgedreht}
          fach={fach ?? null}
          onDruck={() => {
            setUmgedreht((u) => !u);
            setGesehen(true);
          }}
          style={{ flex: 1 }}
        />
      </View>

      <View style={{ paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(3), minHeight: 92 }}>
        {gesehen ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Knopf titel="Nochmal" icon="refresh" art="sekundaer" onPress={() => bewerten(false)} style={{ height: 54 }} />
              <T v="klein" zentriert style={{ fontSize: 12 }}>
                {tageText(0)}
              </T>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <Knopf titel="Gewusst" icon="checkmark" onPress={() => bewerten(true)} style={{ height: 54 }} />
              <T v="klein" zentriert style={{ fontSize: 12 }}>
                {faellig ? tageText(KARTEN_ABSTAENDE[naechstesFach]) : "Bleibt wie geplant"}
              </T>
            </View>
          </View>
        ) : (
          <Knopf
            titel="Antwort zeigen"
            onPress={() => {
              setUmgedreht(true);
              setGesehen(true);
            }}
            style={{ height: 54 }}
          />
        )}
      </View>

      <HinweisAnzeige wert={hinweis.wert} inhalt={hinweis.inhalt} oben={insets.top + 64} />
    </View>
  );
}
