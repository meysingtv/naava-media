import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Glas } from "@/components/glas";
import { GlasGrund } from "@/components/glas-flaeche";
import { Kopfzeile, StartKnopf } from "@/components/home";
import { Icon } from "@/components/icon";
import {
  GrundstoffKarte,
  LernStand,
  ModusKarte,
  ModusRaster,
  StapelBild,
  StufenFilter,
  SucherSchild,
  SuchHinweis,
  SuchLeiste,
  SuchPille,
  SuchVorschlaege,
  Themenwand,
  ThemenRaster,
  TrefferZeile,
  type Modus,
  type Stufe,
  type ThemaPosterDaten,
} from "@/components/lernen";
import { useInhaltUnten } from "@/components/tab-leiste";
import { Verkehrszeichen } from "@/components/zeichen";
import { FarbweltBereich, useDarstellung } from "@/lib/darstellung";
import { FRAGEN, THEMEN, fragenZuThema, themaVon, type ThemaId, type ZeichenKey } from "@/lib/fragen";
import { heuteDran, kartenZahlen } from "@/lib/karteikarten";
import { useLeistenScroll } from "@/lib/leisten-scroll";
import { ALBUM } from "@/lib/schilder-jagd";
import { fehlerIds, fortschritt, gemerktIds, schwierigeIds, useStand } from "@/lib/stand";
import { RAND, schrift } from "@/lib/theme";

/** Schwierigkeit eines Themas nach den Fehlerpunkten seiner Fragen (2–5). */
function stufeVon(thema: ThemaId): Exclude<Stufe, "alle"> {
  const liste = fragenZuThema(thema);
  const schnitt = liste.reduce((s, f) => s + f.punkte, 0) / Math.max(1, liste.length);
  if (schnitt < 3.5) return "leicht";
  if (schnitt < 4.1) return "mittel";
  return "schwer";
}

/** Begriffe, die in den Fragen wirklich vorkommen. */
const VORSCHLAEGE = ["Kreisverkehr", "Rettungsgasse", "Promille", "Überholen", "Schulbus", "Reifen", "Bahnübergang", "Anhalteweg"];

export default function Lernen() {
  const insets = useSafeAreaInsets();
  const inhaltUnten = useInhaltUnten();
  const leistenScroll = useLeistenScroll();
  const fokus = useIsFocused();
  const { farbwelt: f } = useDarstellung();
  const { stand } = useStand();
  const [stufe, setStufe] = useState<Stufe>("alle");
  const [suche, setSuche] = useState<string | null>(null);
  const [kopfHoehe, setKopfHoehe] = useState(0);

  const treffer = useMemo(() => {
    const q = (suche ?? "").trim().toLowerCase();
    if (q.length < 2) return [];
    return FRAGEN.filter((fr) => fr.text.toLowerCase().includes(q) || themaVon(fr.thema).titel.toLowerCase().includes(q)).slice(0, 40);
  }, [suche]);

  // Stand aller Fragen: sicher (zuletzt richtig), offene Fehler, noch nie beantwortet.
  const gesamt = fortschritt(stand);
  const fehler = fehlerIds(stand).length;
  const gesehen = FRAGEN.filter((q) => {
    const fs = stand.fragen[q.id];
    return fs != null && fs.r + fs.f > 0;
  }).length;
  const neu = FRAGEN.length - gesehen;

  const gemerkt = gemerktIds(stand).length;
  const schwierig = schwierigeIds(stand).length;
  const dran = heuteDran(stand);
  const karten = kartenZahlen(stand);
  const kartenBegonnen = karten.gelernt > 0 || karten.eigene > 0;
  const gefunden = ALBUM.filter((k) => stand.schilder[k]);
  const letztesSchild: ZeichenKey = [...gefunden].sort((a, b) => (stand.schilder[b] ?? "").localeCompare(stand.schilder[a] ?? ""))[0] ?? "z206";

  const modi: Modus[] = [
    {
      titel: "Fehler üben",
      unter: fehler > 0 ? `${fehler} offen` : "Alles erledigt",
      akzent: "#FF4A3D",
      icon: "refresh",
      sf: "arrow.counterclockwise",
      onPress: () => router.push({ pathname: "/training", params: { modus: "fehler" } }),
    },
    { titel: "Favoriten", unter: gemerkt > 0 ? `${gemerkt} gemerkt` : "Noch leer", akzent: "#FF8A1E", icon: "heart", onPress: () => router.push("/favoriten") },
    {
      titel: "Schwierige Fragen",
      unter: schwierig > 0 ? `${schwierig} ${schwierig === 1 ? "Frage" : "Fragen"}` : "Noch keine",
      akzent: "#FFB400",
      icon: "flame",
      sf: "flame.fill",
      onPress: () => router.push({ pathname: "/training", params: { modus: "schwierig" } }),
    },
    { titel: "Verkehrszeichen", unter: "Alle Zeichen erklärt", akzent: "#4DA3FF", icon: "warning", bild: <Verkehrszeichen zeichen="z205" groesse={27} />, onPress: () => router.push("/zeichen") },
    { titel: "Formeln", unter: "Anhalteweg & Co.", akzent: "#E0A100", icon: "calculator", sf: "function", onPress: () => router.push("/formeln") },
    { titel: "Kurz erklärt", unter: "Regeln in 30 Sekunden", akzent: "#FF4D6D", icon: "bulb", sf: "lightbulb.fill", onPress: () => router.push("/kurz-erklaert") },
  ];

  const themen: ThemaPosterDaten[] = THEMEN.filter((t) => stufe === "alle" || stufeVon(t.id) === stufe).map((t) => {
    const liste = fragenZuThema(t.id);
    return { id: t.id, anteil: fortschritt(stand, liste).anteil, anzahl: liste.length, stufe: stufeVon(t.id) };
  });

  const kopfText = f.hell ? "#14171B" : "#FFFFFF";
  const statusLeiste = fokus ? <StatusBar style={f.hell ? "dark" : "light"} /> : null;

  if (suche != null) {
    const q = suche.trim();
    return (
      <FarbweltBereich farbwelt={f}>
        {statusLeiste}
        <View style={{ flex: 1, backgroundColor: f.grund, paddingTop: insets.top + 10 }}>
          <SuchLeiste wert={suche} onWechsel={setSuche} onAbbrechen={() => setSuche(null)} />
          <ScrollView
            {...leistenScroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 20, paddingBottom: inhaltUnten }}
          >
            {q.length < 2 ? (
              <SuchVorschlaege woerter={VORSCHLAEGE} onWahl={setSuche} />
            ) : treffer.length > 0 ? (
              <View style={{ paddingHorizontal: RAND, gap: 10 }}>
                <Text style={{ ...schrift.textHalb, fontSize: 13, letterSpacing: 0.6, color: f.text3 }}>
                  {treffer.length === 40 ? "40+ TREFFER" : `${treffer.length} TREFFER`}
                </Text>
                {treffer.map((fr) => (
                  <TrefferZeile key={fr.id} frage={fr} onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: fr.thema, start: fr.id } })} />
                ))}
              </View>
            ) : (
              <SuchHinweis icon="search" titel="Nichts gefunden" text="Versuch es mit einem anderen Begriff, zum Beispiel „Kreisverkehr“ oder „Promille“." />
            )}
          </ScrollView>
        </View>
      </FarbweltBereich>
    );
  }

  return (
    <FarbweltBereich farbwelt={f}>
      {statusLeiste}
      <View style={{ flex: 1, backgroundColor: f.grund }}>
        <ScrollView {...leistenScroll} contentContainerStyle={{ paddingBottom: inhaltUnten + 12 }} showsVerticalScrollIndicator={false}>
          {/* Lichtgrund scrollt mit und beginnt erst unter der Themenwand – sonst Kante am Foto */}
          {kopfHoehe > 0 ? <GlasGrund ab={kopfHoehe} dezent /> : null}
          {/* Kopf als ein Block: Titel, Suche, Stand und Startknopf dicht beieinander */}
          <View onLayout={(e) => setKopfHoehe(Math.round(e.nativeEvent.layout.height))}>
          <Themenwand>
            <View style={{ paddingTop: insets.top + 4, paddingHorizontal: RAND, paddingBottom: 24 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ ...schrift.titel, fontSize: 34, lineHeight: 40, color: kopfText, letterSpacing: -0.5 }}>Lernen</Text>
                <Pressable onPress={() => router.push("/statistik")} accessibilityLabel="Mein Fortschritt" hitSlop={8}>
                  <Glas klar hell={f.hell} style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }}>
                    <Icon name="stats-chart" size={19} color={kopfText} />
                  </Glas>
                </Pressable>
              </View>
              <Text style={{ ...schrift.textMittel, fontSize: 15, color: f.hell ? "rgba(20,23,27,0.66)" : "rgba(255,255,255,0.78)", marginTop: 1 }}>
                {THEMEN.length} Themen · {FRAGEN.length} Fragen · Klasse {stand.klasse}
              </Text>
              <SuchPille onPress={() => setSuche("")} style={{ marginTop: 16 }} />
              <View style={{ marginTop: 10 }}>
                <LernStand sicher={gesamt.richtig} fehler={fehler} neu={neu} onPress={() => router.push("/statistik")} />
              </View>
            </View>
          </Themenwand>
          </View>
          {/* Außerhalb der Fotowand, sonst schneidet sie das Leuchten des Knopfs ab */}
          <StartKnopf
            titel="Smart lernen"
            unter="Die Fragen, die dich jetzt weiterbringen"
            onPress={() => router.push({ pathname: "/training", params: { modus: "smart" } })}
            style={{ marginHorizontal: RAND, marginTop: -10 }}
          />

          <Kopfzeile titel="Lernmodi" style={{ marginTop: 20 }} />
          <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: RAND }}>
            <ModusKarte
              titel="Karteikarten"
              unter={dran.gesamt > 0 ? `${dran.gesamt} ${dran.gesamt === 1 ? "Karte" : "Karten"} heute dran` : kartenBegonnen ? "Alles wiederholt" : "Als Karten lernen"}
              akzent="#4ED053"
              bild={<StapelBild />}
              zahl={dran.gesamt}
              anteil={karten.gelernt > 0 ? karten.sicher / karten.gelernt : 0}
              onPress={() => router.push("/karteikarten")}
            />
            <ModusKarte
              titel="Schilder-Jagd"
              unter={gefunden.length > 0 ? `${gefunden.length} von ${ALBUM.length} gefunden` : "Schilder scannen"}
              akzent="#4DA3FF"
              bild={<SucherSchild zeichen={letztesSchild} groesse={28} />}
              anteil={gefunden.length / ALBUM.length}
              onPress={() => router.push("/schilder-jagd")}
            />
          </View>
          <ModusRaster modi={modi} style={{ marginTop: 10 }} />

          <Kopfzeile titel="Alle Themen" link={`${THEMEN.length} Themen`} style={{ marginTop: 32 }} />
          <StufenFilter wert={stufe} onWechsel={setStufe} style={{ marginBottom: 14 }} />
          {stufe === "alle" ? (
            <GrundstoffKarte
              anzahl={FRAGEN.length}
              anteil={gesamt.anteil}
              onPress={() => router.push({ pathname: "/training", params: { modus: "alle" } })}
              style={{ marginHorizontal: RAND, marginBottom: 12 }}
            />
          ) : null}
          {themen.length > 0 ? (
            <ThemenRaster themen={themen} onThema={(id) => router.push({ pathname: "/thema/[id]", params: { id } })} />
          ) : (
            <SuchHinweis icon="layers-outline" titel="Keine Themen" text="In dieser Stufe gibt es gerade keine Themen." />
          )}
        </ScrollView>
      </View>
    </FarbweltBereich>
  );
}
