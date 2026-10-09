import { useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErgebnisHeld, ErgebnisRing, ErgebnisWerte, LeerZustand } from "@/components/auswertung";
import { AktionsLeiste, FortschrittBalken, FrageKopf, GlasRund, HauptKnopf, KopfPille, NebenKnopf } from "@/components/frage-rahmen";
import { HinweisAnzeige, useHinweis } from "@/components/hinweis";
import { FlipKarte } from "@/components/karteikarte";
import { Seite } from "@/components/seite";
import { kartenFlaeche, kopfOben, T } from "@/components/ui";
import { useDarstellung } from "@/lib/darstellung";
import { FOTOS } from "@/lib/fotos";
import { erfolg, tippen } from "@/lib/haptik";
import { karteInhalt, lernListe, stapelIds, stapelTitel, type LernAuswahl, type StapelId } from "@/lib/karteikarten";
import { KARTEN_ABSTAENDE, karteFaellig, useStand } from "@/lib/stand";
import { RAND, schrift } from "@/lib/theme";

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
  const { belohnungen, farbwelt: f } = useDarstellung();
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
    if (xp > 0 && belohnungen) hinweis.zeigen({ icon: "flash", text: `+${xp} XP`, textFarbe: f.orange });

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
      <Seite>
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 12 }}>
          <LeerZustand
            icon={keineKarten || stapelLeer ? "albums-outline" : "checkmark-done"}
            titel={keineKarten || stapelLeer ? "Noch keine Karten." : "Alles wiederholt."}
            text={
              keineKarten
                ? "Tippe beim Lernen unter einer Frage auf „Karteikarte“ – oder fang gleich mit den Verkehrszeichen an."
                : stapelLeer
                  ? "In diesem Stapel liegen gerade keine Karten."
                  : "Gerade ist keine Karte dran. Die nächsten kommen, sobald ihre Pause vorbei ist – oder geh den Stapel einmal komplett durch."
            }
          >
            <View style={{ gap: 12 }}>
              {keineKarten ? (
                <HauptKnopf titel="Verkehrszeichen lernen" icon="arrow-forward" onPress={() => router.replace({ pathname: "/karten-lernen", params: { stapel: "zeichen" } })} />
              ) : !stapelLeer && auswahl !== "heute" && !alle ? (
                <HauptKnopf titel="Alle Karten durchgehen" icon="refresh" onPress={() => router.replace({ pathname: "/karten-lernen", params: { stapel: auswahl, alle: "1" } })} />
              ) : null}
              <NebenKnopf titel="Zurück" onPress={() => router.back()} />
            </View>
          </LeerZustand>
        </View>
      </Seite>
    );
  }

  // ------------------------------------------------------------------ Auswertung
  if (fertig) {
    const gesamt = ergebnis.gewusst + ergebnis.nochmal;
    const quote = gesamt ? ergebnis.gewusst / gesamt : 0;
    const rest = alle ? 0 : lernListe(stand, auswahl, false).length;
    const ueberschrift = quote >= 0.9 ? "Sitzt richtig gut." : quote >= 0.6 ? "Gute Runde." : "Dranbleiben lohnt sich.";
    return (
      <Seite>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <ErgebnisHeld bild={FOTOS.lernen} oben={insets.top + 16} hoehe={insets.top + 392} label="Karten gelernt" titel={ueberschrift}>
            <ErgebnisRing anteil={quote} wert={`${Math.round(quote * 100)}`} einheit="%" unter={`${ergebnis.gewusst} von ${gesamt} gewusst`} ton={quote >= 0.8 ? "gruen" : quote >= 0.5 ? "orange" : "rot"} />
          </ErgebnisHeld>
          <ErgebnisWerte
            werte={[
              { icon: "checkmark-circle", farbe: f.hell ? "#23A548" : "#4ED053", wert: `${ergebnis.gewusst}`, label: "gewusst" },
              { icon: "refresh", farbe: f.orange, wert: `${ergebnis.nochmal}`, label: "nochmal" },
              belohnungen && ergebnis.xp > 0 ? { icon: "flash", farbe: f.orange, wert: `+${ergebnis.xp}`, label: "XP" } : { icon: "albums-outline", farbe: f.orange, wert: `${rest}`, label: "noch dran" },
            ]}
            style={{ marginHorizontal: RAND, marginTop: -46 }}
          />
          <View style={[{ marginHorizontal: RAND, marginTop: 20, padding: 16, borderRadius: 22, gap: 6 }, kartenFlaeche(f)]}>
            <T v="textStark">So geht es weiter</T>
            <T v="text" style={{ fontSize: 14, lineHeight: 20 }}>
              Gewusste Karten machen Pause – erst einen Tag, dann 3, 7, 14 und 30 Tage. Was du nicht wusstest, kommt heute noch einmal dran.
            </T>
          </View>
        </ScrollView>
        <AktionsLeiste unten={insets.bottom}>
          {rest > 0 ? (
            <>
              <NebenKnopf titel="Fertig" onPress={() => router.back()} style={{ flex: 1 }} />
              <HauptKnopf titel="Weiter lernen" icon="arrow-forward" onPress={neueRunde} style={{ flex: 1.5 }} />
            </>
          ) : (
            <HauptKnopf titel="Fertig" icon="checkmark" onPress={() => router.back()} style={{ flex: 1 }} />
          )}
        </AktionsLeiste>
      </Seite>
    );
  }

  if (!inhalt || !id) return null;
  const fach = stand.karteikarten.faecher[id]?.fach;
  const faellig = karteFaellig(stand, id);
  const naechstesFach = Math.min(KARTEN_ABSTAENDE.length - 1, (fach ?? 0) + 1);

  // ------------------------------------------------------------------ Karte
  return (
    <Seite>
      <FrageKopf
        oben={kopfOben(insets.top)}
        links={<GlasRund icon="close" label="Lernen beenden" onPress={() => router.back()} />}
        rechts={null}
        titel={`Karte ${pos + 1} von ${schlange.length}`}
        unter={<KopfPille icon="albums" text={alle ? `${titel} · alle` : titel} />}
      >
        <View style={{ paddingHorizontal: RAND }}>
          <FortschrittBalken anteil={pos / schlange.length} />
        </View>
      </FrageKopf>

      <View style={{ flex: 1, paddingHorizontal: RAND, paddingTop: 6, paddingBottom: 8 }}>
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

      <View style={{ paddingHorizontal: RAND, paddingTop: 8, paddingBottom: insets.bottom + 10, minHeight: 96 }}>
        {gesehen ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <NebenKnopf titel="Nochmal" icon="refresh" onPress={() => bewerten(false)} />
              <Text style={{ ...schrift.textMittel, fontSize: 12, color: f.text3, textAlign: "center" }}>{tageText(0)}</Text>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <HauptKnopf titel="Gewusst" icon="checkmark" onPress={() => bewerten(true)} />
              <Text style={{ ...schrift.textMittel, fontSize: 12, color: f.text3, textAlign: "center" }}>{faellig ? tageText(KARTEN_ABSTAENDE[naechstesFach]) : "Bleibt wie geplant"}</Text>
            </View>
          </View>
        ) : (
          <HauptKnopf
            titel="Antwort zeigen"
            onPress={() => {
              setUmgedreht(true);
              setGesehen(true);
            }}
          />
        )}
      </View>

      <HinweisAnzeige wert={hinweis.wert} inhalt={hinweis.inhalt} oben={insets.top + 70} />
    </Seite>
  );
}
