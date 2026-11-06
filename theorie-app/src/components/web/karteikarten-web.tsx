import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { dialog } from "@/components/dialog";
import { FrageBild } from "@/components/frage-bild";
import { Icon, type IconName } from "@/components/icon";
import { Abschnitt, B, Balken, Kachel, Knopf, Leer, n, Raster, Spalte, Symbol, THEMA_TON, TOENE, UnterKopf, type Ton, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { Verkehrszeichen } from "@/components/zeichen";
import { istZeichen, themaVon, zahlText, type ThemaId, type ZeichenKey } from "@/lib/fragen";
import { GRUPPE_TITEL, heuteDran, istEingebaut, karteInhalt, kartenZahlen, naechsteRunde, naechsteText, stapelInfo, stapelListe, vorneText, type KartenInhalt, type Stapel, type StapelId } from "@/lib/karteikarten";
import { KARTEN_ABSTAENDE, useStand } from "@/lib/stand";

// Karteikarten am PC: die Übersicht (heute dran, Zahlen, alle Stapel als
// Raster), ein Stapel (Lernfächer, Kartenliste links, Vorschau rechts) und
// die Karte selbst zum Umdrehen – sie nutzen auch Lernen und Bearbeiten.

// ---------------------------------------------------------------------------
// Kleine Bausteine
// ---------------------------------------------------------------------------

/** Symbol eines Stapels: Stift, Themen-Symbol oder ein Verkehrszeichen. */
export function StapelZeichen({ id, groesse = 44 }: { id: StapelId; groesse?: number }) {
  if (id === "zeichen") {
    return (
      <View style={{ width: groesse, height: groesse, borderRadius: groesse * 0.28, backgroundColor: B.ton, alignItems: "center", justifyContent: "center" }}>
        <Verkehrszeichen zeichen="z205" groesse={groesse * 0.68} />
      </View>
    );
  }
  if (id === "eigen") return <Symbol icon="create" ton={TOENE.orange} groesse={groesse} />;
  const thema = id.slice(2) as ThemaId;
  return <Symbol icon={themaVon(thema).icon as IconName} ton={THEMA_TON[thema]} groesse={groesse} />;
}

/** Lernfach als Punkte (1–5) – oder „Neu“. */
export function FachPunkteWeb({ fach }: { fach: number | null }) {
  if (fach == null) {
    return (
      <View style={{ height: 22, paddingHorizontal: 9, borderRadius: 11, backgroundColor: B.orangeHell, justifyContent: "center" }}>
        <Text style={{ ...n.fett, fontSize: 12, color: B.orangeKante }}>Neu</Text>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: "row", gap: 4 }} accessibilityLabel={`Fach ${fach} von ${KARTEN_ABSTAENDE.length - 1}`}>
      {Array.from({ length: KARTEN_ABSTAENDE.length - 1 }, (_, i) => (
        <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i < fach ? (fach >= 3 ? B.gruen : B.orange) : B.linie }} />
      ))}
    </View>
  );
}

/** Kleine Taste mit Kürzel (Leertaste, 1, 2, Esc). */
export function TastenKappe({ text, hell }: { text: string; hell?: boolean }) {
  return (
    <View style={{ minWidth: 26, height: 24, paddingHorizontal: 7, borderRadius: 7, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderBottomWidth: 3, borderColor: hell ? "rgba(255,255,255,0.55)" : B.linie, backgroundColor: hell ? "rgba(255,255,255,0.16)" : B.grund }}>
      <Text style={{ ...n.fett, fontSize: 12, color: hell ? "#FFFFFF" : B.text3 }}>{text}</Text>
    </View>
  );
}

/** Oben links auf der Karte: woher sie kommt. */
function herkunft(inhalt: KartenInhalt): { icon: IconName; text: string; ton: Ton } {
  if (inhalt.art === "frage") {
    const t = themaVon(inhalt.frage.thema);
    return { icon: t.icon as IconName, text: t.titel, ton: THEMA_TON[inhalt.frage.thema] };
  }
  if (inhalt.art === "zeichen") return { icon: "warning", text: GRUPPE_TITEL[inhalt.info.gruppe], ton: TOENE.gelb };
  return { icon: "create", text: "Eigene Karte", ton: TOENE.orange };
}

/** Bild in Listen: Zeichen, wenn es eins gibt, sonst das Themen-Symbol. */
function Vorschaubild({ inhalt, groesse = 44 }: { inhalt: KartenInhalt; groesse?: number }) {
  const zeichen: ZeichenKey | undefined = inhalt.art === "zeichen" ? inhalt.info.key : inhalt.art === "eigen" ? inhalt.zeichen : istZeichen(inhalt.frage.bild) ? (inhalt.frage.bild as ZeichenKey) : undefined;
  if (zeichen) {
    return (
      <View style={{ width: groesse, height: groesse, borderRadius: groesse * 0.28, backgroundColor: B.ton, alignItems: "center", justifyContent: "center" }}>
        <Verkehrszeichen zeichen={zeichen} groesse={groesse * 0.72} />
      </View>
    );
  }
  const h = herkunft(inhalt);
  return <Symbol icon={h.icon} ton={h.ton} groesse={groesse} />;
}

// ---------------------------------------------------------------------------
// Die Karte zum Umdrehen
// ---------------------------------------------------------------------------

function Vorderseite({ inhalt, gross }: { inhalt: KartenInhalt; gross: boolean }) {
  if (inhalt.art === "zeichen") {
    return (
      <View style={{ alignItems: "center", gap: 22 }}>
        <Verkehrszeichen zeichen={inhalt.info.key} groesse={gross ? 210 : 150} />
        <Text style={{ ...n.fett, fontSize: gross ? 18 : 16, color: B.text2, textAlign: "center" }}>Was bedeutet dieses Zeichen?</Text>
      </View>
    );
  }
  if (inhalt.art === "eigen") {
    const lang = inhalt.vorne.length > 110;
    return (
      <View style={{ alignItems: "center", gap: 22 }}>
        {inhalt.zeichen ? <Verkehrszeichen zeichen={inhalt.zeichen} groesse={gross ? 150 : 110} /> : null}
        <Text style={{ ...n.schwarz, fontSize: lang ? (gross ? 22 : 18) : gross ? 28 : 22, lineHeight: lang ? (gross ? 30 : 25) : gross ? 36 : 29, color: B.text, textAlign: "center" }}>{inhalt.vorne}</Text>
      </View>
    );
  }
  const { frage } = inhalt;
  const lang = frage.text.length > 90;
  return (
    <View style={{ gap: 22, alignItems: "center" }}>
      {istZeichen(frage.bild) ? (
        <Verkehrszeichen zeichen={frage.bild as ZeichenKey} groesse={gross ? 150 : 110} />
      ) : frage.bild ? (
        <View style={{ width: gross ? 420 : "88%", maxWidth: "100%", borderRadius: 16, overflow: "hidden", borderWidth: 1.5, borderColor: B.linie }}>
          <FrageBild bild={frage.bild} thema={frage.thema} randlos />
        </View>
      ) : null}
      <Text style={{ ...n.schwarz, fontSize: lang ? (gross ? 22 : 18) : gross ? 26 : 21, lineHeight: lang ? (gross ? 30 : 25) : gross ? 34 : 28, color: B.text, textAlign: "center" }}>{frage.text}</Text>
    </View>
  );
}

function Rueckseite({ inhalt, gross }: { inhalt: KartenInhalt; gross: boolean }) {
  if (inhalt.art === "zeichen") {
    const { info } = inhalt;
    return (
      <View style={{ gap: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <Verkehrszeichen zeichen={info.key} groesse={gross ? 88 : 64} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ ...n.schwarz, fontSize: gross ? 26 : 21, lineHeight: gross ? 32 : 26, color: B.text }}>{info.name}</Text>
            <Text style={{ ...n.halb, fontSize: 14.5, color: B.text3 }}>{GRUPPE_TITEL[info.gruppe]}</Text>
          </View>
        </View>
        <Text style={{ ...n.halb, fontSize: gross ? 19 : 16.5, lineHeight: gross ? 28 : 24, color: B.text }}>{info.bedeutung}</Text>
        <View style={{ flexDirection: "row", gap: 8, paddingTop: 14, borderTopWidth: 1.5, borderTopColor: B.ton }}>
          <Icon name="location" size={17} color={B.text3} />
          <Text style={{ flex: 1, ...n.halb, fontSize: 14.5, lineHeight: 21, color: B.text2 }}>{info.fundort}</Text>
        </View>
      </View>
    );
  }
  if (inhalt.art === "eigen") {
    const lang = inhalt.hinten.length > 140;
    return <Text style={{ ...n.fett, fontSize: lang ? (gross ? 20 : 17) : gross ? 25 : 20, lineHeight: lang ? (gross ? 29 : 24) : gross ? 34 : 28, color: B.text, textAlign: "center" }}>{inhalt.hinten}</Text>;
  }
  const { frage } = inhalt;
  const richtige = frage.art === "auswahl" ? frage.antworten.filter((a) => a.richtig) : [];
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 12 }}>
        <Text style={{ ...n.fett, fontSize: 14, color: B.gruenKante }}>{frage.art === "zahl" ? "Lösung" : richtige.length > 1 ? "Richtige Antworten" : "Richtige Antwort"}</Text>
        {frage.art === "zahl" ? (
          <Text style={{ ...n.schwarz, fontSize: gross ? 46 : 38, color: B.gruenKante, fontVariant: ["tabular-nums"] }}>
            {zahlText(frage.loesung)} {frage.einheit}
          </Text>
        ) : (
          richtige.map((a, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, marginTop: 1, backgroundColor: B.gruen, alignItems: "center", justifyContent: "center" }}>
                <Icon name="checkmark" size={15} color="#FFFFFF" />
              </View>
              <Text style={{ flex: 1, ...n.fett, fontSize: gross ? 19 : 16.5, lineHeight: gross ? 26 : 23, color: B.text }}>{a.text}</Text>
            </View>
          ))
        )}
      </View>
      <View style={{ gap: 4, paddingTop: 16, borderTopWidth: 1.5, borderTopColor: B.ton }}>
        <Text style={{ ...n.schwarz, fontSize: 14.5, color: B.orange }}>Merke dir</Text>
        <Text style={{ ...n.halb, fontSize: gross ? 16.5 : 15, lineHeight: gross ? 25 : 22, color: B.text2 }}>{frage.erklaerung}</Text>
      </View>
    </View>
  );
}

/**
 * Karteikarte am PC: weiß, feiner Rand, dicke Unterkante. Dreht sich beim
 * Umdrehen zur Kante, tauscht die Seite und dreht zurück.
 */
export function KarteWeb({
  inhalt,
  umgedreht,
  onDruck,
  fach,
  gross,
  hinweis = "Klicken zum Umdrehen",
  style,
}: {
  inhalt: KartenInhalt;
  umgedreht: boolean;
  onDruck?: () => void;
  /** Lernfach oben rechts; null = neu, undefined = ausblenden. */
  fach?: number | null;
  gross?: boolean;
  hinweis?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [seite, setSeite] = useState(umgedreht);
  const dreh = useRef(new Animated.Value(0)).current;
  const ziel = useRef(umgedreht);
  const erst = useRef(true);

  useEffect(() => {
    ziel.current = umgedreht;
    if (erst.current) {
      erst.current = false;
      return;
    }
    dreh.stopAnimation();
    Animated.timing(dreh, { toValue: 1, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: false }).start(({ finished }) => {
      if (!finished) return;
      setSeite(ziel.current);
      dreh.setValue(-1);
      Animated.timing(dreh, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    });
  }, [umgedreht, dreh]);

  const hinten = seite;
  const h = herkunft(inhalt);

  return (
    <Pressable onPress={onDruck} disabled={!onDruck} accessibilityRole="button" accessibilityLabel={hinten ? "Karte umdrehen, Vorderseite zeigen" : "Karte umdrehen, Antwort zeigen"} style={style}>
      {(z: Zustand) => (
        <Animated.View
          style={{
            flex: 1,
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: hinten ? "#BFE8C8" : z.hovered && onDruck ? B.kante : B.linie,
            borderBottomWidth: 5,
            borderBottomColor: hinten ? B.gruen : B.kante,
            backgroundColor: B.flaeche,
            overflow: "hidden",
            transform: [{ perspective: 1400 }, { rotateY: dreh.interpolate({ inputRange: [-1, 0, 1], outputRange: ["-90deg", "0deg", "90deg"] }) }, { scale: dreh.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.96, 1, 0.96] }) }],
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: gross ? 26 : 20, paddingTop: gross ? 22 : 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
              <Icon name={hinten ? "checkmark-circle" : h.icon} size={18} color={hinten ? B.gruen : h.ton.farbe} />
              <Text numberOfLines={1} style={{ ...n.fett, fontSize: 14, color: hinten ? B.gruenKante : B.text2, flexShrink: 1 }}>
                {hinten ? "Antwort" : h.text}
              </Text>
            </View>
            {fach !== undefined ? <FachPunkteWeb fach={fach} /> : null}
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: gross ? 48 : 24, paddingVertical: gross ? 28 : 20 }} showsVerticalScrollIndicator={false}>
            <View style={{ width: "100%", maxWidth: 680, alignSelf: "center" }}>{hinten ? <Rueckseite inhalt={inhalt} gross={Boolean(gross)} /> : <Vorderseite inhalt={inhalt} gross={Boolean(gross)} />}</View>
          </ScrollView>
          {onDruck && hinweis ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingBottom: gross ? 18 : 14 }}>
              <Icon name="sync" size={14} color={B.text3} />
              <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>{hinweis}</Text>
            </View>
          ) : null}
        </Animated.View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Übersicht
// ---------------------------------------------------------------------------

function ZahlZeile({ icon, ton, wert, titel, oben }: { icon: IconName; ton: Ton; wert: string; titel: string; oben?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, borderTopWidth: oben ? 1.5 : 0, borderTopColor: B.ton }}>
      <Icon name={icon} size={22} color={ton.farbe} />
      <Text style={{ flex: 1, ...n.halb, fontSize: 15, color: B.text2 }}>{titel}</Text>
      <Text style={{ ...n.schwarz, fontSize: 19, color: B.text, fontVariant: ["tabular-nums"] }}>{wert}</Text>
    </View>
  );
}

function StapelKachel({ stapel }: { stapel: Stapel }) {
  const dran = stapel.faellig + (stapel.id === "zeichen" ? 0 : stapel.neu);
  const leer = stapel.ids.length === 0;
  const anteil = leer ? 0 : stapel.sicher / stapel.ids.length;
  return (
    <Kachel onPress={() => router.push({ pathname: "/stapel/[id]", params: { id: stapel.id } })} style={{ padding: 18, gap: 16, height: 150 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <StapelZeichen id={stapel.id} groesse={46} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ ...n.schwarz, fontSize: 16.5, color: B.text }}>
            {stapel.titel}
          </Text>
          <Text numberOfLines={1} style={{ ...n.halb, fontSize: 13.5, color: B.text3 }}>
            {leer ? "Noch leer" : stapel.unter}
          </Text>
        </View>
        {dran > 0 ? (
          <View style={{ minWidth: 28, height: 28, paddingHorizontal: 8, borderRadius: 14, backgroundColor: B.orange, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ ...n.schwarz, fontSize: 13, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{dran}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1 }} />
      {leer ? (
        <Text style={{ ...n.halb, fontSize: 14, color: B.text2 }}>Schreib deine erste Karte</Text>
      ) : (
        <View style={{ gap: 7 }}>
          <Balken anteil={anteil} ton={TOENE.gruen} hoehe={8} />
          <Text style={{ ...n.halb, fontSize: 13, color: B.text3, fontVariant: ["tabular-nums"] }}>
            {stapel.sicher} von {stapel.ids.length} sitzen
          </Text>
        </View>
      )}
    </Kachel>
  );
}

export function KarteikartenWeb() {
  const { stand } = useStand();
  const dran = heuteDran(stand);
  const zahlen = kartenZahlen(stand);
  const stapel = stapelListe(stand);
  const zeichenBegonnen = Object.keys(stand.karteikarten.faecher).filter((id) => id.startsWith("z:")).length;
  const weiter = naechsteRunde(stand);
  const anfang = zahlen.gelernt === 0 && zahlen.eigene === 0;
  const unterzeile =
    dran.gesamt > 0
      ? [dran.wiederholen > 0 ? `${dran.wiederholen} wiederholen` : null, dran.neu > 0 ? `${dran.neu} neu` : null].filter(Boolean).join(" · ")
      : !anfang
        ? weiter
          ? `Alles wiederholt – weiter geht's ${weiter}.`
          : "Alles wiederholt."
        : "Noch keine Karten – fang mit den 100 Verkehrszeichen an.";

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Karteikarten" unter="Vorn die Frage, hinten die Antwort" rechts={<Knopf titel="Neue Karte" icon="add" art="rand" onPress={() => router.push("/karte-bearbeiten")} />} />

        <View style={{ flexDirection: "row", gap: 20, flexWrap: "wrap" }}>
          <Kachel style={{ flex: 2, minWidth: 420, padding: 28, gap: 22 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
              <Symbol icon="albums" ton={TOENE.tuerkis} groesse={56} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...n.fett, fontSize: 14.5, color: B.text3 }}>Heute dran</Text>
                <Text style={{ ...n.schwarz, fontSize: 30, lineHeight: 36, color: B.text, fontVariant: ["tabular-nums"] }}>
                  {dran.gesamt} {dran.gesamt === 1 ? "Karte" : "Karten"}
                </Text>
                <Text style={{ ...n.halb, fontSize: 15, color: B.text2 }}>{unterzeile}</Text>
              </View>
            </View>
            {dran.gesamt > 0 ? (
              <Knopf titel="Jetzt lernen" icon="play" groesse="gross" ton="tuerkis" onPress={() => router.push({ pathname: "/karten-lernen", params: { stapel: "heute" } })} style={{ alignSelf: "flex-start", minWidth: 240 }} />
            ) : anfang ? (
              <Knopf titel="Mit Verkehrszeichen loslegen" icon="play" groesse="gross" ton="tuerkis" onPress={() => router.push({ pathname: "/karten-lernen", params: { stapel: "zeichen" } })} style={{ alignSelf: "flex-start", minWidth: 240 }} />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="checkmark-circle" size={20} color={B.gruen} />
                <Text style={{ ...n.fett, fontSize: 15, color: B.gruenKante }}>Für heute bist du durch.</Text>
              </View>
            )}
          </Kachel>

          <Kachel style={{ flex: 1, minWidth: 280, paddingHorizontal: 24, paddingVertical: 14, justifyContent: "center" }}>
            <ZahlZeile icon="create" ton={TOENE.orange} titel="Deine Karten" wert={String(zahlen.eigene)} />
            <ZahlZeile icon="checkmark-circle" ton={TOENE.gruen} titel="Sitzen" wert={String(zahlen.sicher)} oben />
            <ZahlZeile icon="warning" ton={TOENE.gelb} titel="Zeichen begonnen" wert={`${zeichenBegonnen}/100`} oben />
          </Kachel>
        </View>

        <View>
          <Abschnitt titel="Stapel" link={`${stapel.length} ${stapel.length === 1 ? "Stapel" : "Stapel"}`} />
          <Raster min={300} abstand={16}>
            {stapel.map((s) => (
              <StapelKachel key={s.id} stapel={s} />
            ))}
          </Raster>
        </View>

        {zahlen.eigene === 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, paddingLeft: 20, borderRadius: 16, backgroundColor: B.ton, flexWrap: "wrap" }}>
            <Icon name="bulb" size={22} color={B.text2} />
            <Text style={{ flex: 1, minWidth: 260, ...n.halb, fontSize: 15, lineHeight: 21, color: B.text2 }}>Unter jeder Frage gibt es den Knopf „Karteikarte“. Ein Klick – und die Frage liegt hier: vorn die Frage, hinten die richtige Antwort mit Merksatz.</Text>
            <Knopf titel="Eigene Karte schreiben" icon="add" art="rand" groesse="klein" onPress={() => router.push("/karte-bearbeiten")} />
          </View>
        ) : null}
      </Spalte>
    </WebSeite>
  );
}

// ---------------------------------------------------------------------------
// Ein Stapel
// ---------------------------------------------------------------------------

const GUELTIG = /^(eigen|zeichen|t:[a-z]+)$/;

/** Verteilung der Karten auf die Lernfächer – von „Neu“ bis „sitzt“. */
function Faecher({ ids, faecher }: { ids: string[]; faecher: Record<string, { fach: number }> }) {
  const zahlen = Array.from({ length: KARTEN_ABSTAENDE.length }, () => 0);
  let neu = 0;
  for (const id of ids) {
    const f = faecher[id];
    if (!f) neu++;
    else zahlen[f.fach]++;
  }
  const spalten = [
    { titel: "Neu", unter: "noch nie", n: neu, farbe: B.text3 },
    { titel: "Nochmal", unter: "heute", n: zahlen[0], farbe: B.rot },
    ...zahlen.slice(1).map((x, i) => ({ titel: `Fach ${i + 1}`, unter: KARTEN_ABSTAENDE[i + 1] === 1 ? "1 Tag" : `${KARTEN_ABSTAENDE[i + 1]} Tage`, n: x, farbe: i + 1 >= 3 ? B.gruen : B.orange })),
  ];
  const max = Math.max(1, ...spalten.map((s) => s.n));
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 14, height: 150 }}>
      {spalten.map((s) => (
        <View key={s.titel} style={{ flex: 1, alignItems: "center", gap: 6 }}>
          <Text style={{ ...n.schwarz, fontSize: 15, color: s.n > 0 ? B.text : B.text3, fontVariant: ["tabular-nums"] }}>{s.n}</Text>
          <View style={{ width: "100%", maxWidth: 72, height: 6 + (s.n / max) * 70, borderRadius: 8, backgroundColor: s.n > 0 ? s.farbe : B.ton }} />
          <View style={{ alignItems: "center" }}>
            <Text numberOfLines={1} style={{ ...n.fett, fontSize: 13, color: B.text2 }}>
              {s.titel}
            </Text>
            <Text numberOfLines={1} style={{ ...n.halb, fontSize: 12, color: B.text3 }}>
              {s.unter}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function KartenZeile({ inhalt, unter, fach, aktiv, oben, onPress }: { inhalt: KartenInhalt; unter: string; fach: number | null; aktiv: boolean; oben: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: aktiv }}
      style={(z: Zustand) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: 68,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: oben ? 1.5 : 0,
        borderTopColor: B.ton,
        backgroundColor: aktiv ? B.ton : z.hovered ? B.hover : "transparent",
      })}
    >
      <Vorschaubild inhalt={inhalt} groesse={42} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text numberOfLines={2} style={{ ...n.fett, fontSize: 15, lineHeight: 20, color: B.text }}>
          {vorneText(inhalt)}
        </Text>
        <Text numberOfLines={1} style={{ ...n.halb, fontSize: 13, color: B.text3 }}>
          {unter}
        </Text>
      </View>
      <FachPunkteWeb fach={fach} />
    </Pressable>
  );
}

export function StapelWeb() {
  const { id: roh } = useLocalSearchParams<{ id: string }>();
  const id = (roh && GUELTIG.test(roh) ? roh : "eigen") as StapelId;
  const { stand, karteLoeschen, frageKarteUmschalten } = useStand();
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const [umgedreht, setUmgedreht] = useState(false);

  const info = stapelInfo(stand, id);
  const zeilen = info.ids.map((k) => karteInhalt(stand, k)).filter((x): x is KartenInhalt => Boolean(x));
  const dran = info.faellig + (id === "zeichen" ? Math.min(10, info.neu) : info.neu);
  const offen = zeilen.find((k) => k.id === gewaehlt) ?? zeilen[0] ?? null;
  const offenFach = offen ? (stand.karteikarten.faecher[offen.id]?.fach ?? null) : null;

  function waehlen(k: string) {
    setGewaehlt(k);
    setUmgedreht(false);
  }

  /** Neue Karten: woher sie kommen; gelernte: wann sie wieder dran sind. */
  function unterzeile(k: KartenInhalt): string {
    if (stand.karteikarten.faecher[k.id]) return naechsteText(stand, k.id);
    if (k.art === "zeichen") return GRUPPE_TITEL[k.info.gruppe];
    if (k.art === "frage") return `Frage · ${k.frage.punkte} Punkte`;
    return "Eigene Karte";
  }

  function loeschen(k: KartenInhalt) {
    const frage = k.art === "frage";
    dialog(frage ? "Karte entfernen?" : "Karte löschen?", frage ? "Die Frage bleibt natürlich in der App – nur die Karteikarte verschwindet." : "Die Karte ist danach weg.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: frage ? "Entfernen" : "Löschen",
        style: "destructive",
        onPress: () => {
          setGewaehlt(null);
          if (k.art === "frage") frageKarteUmschalten(k.frage.id);
          else karteLoeschen(k.id);
        },
      },
    ]);
  }

  const knoepfe: ReactNode = (
    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
      {id === "eigen" ? <Knopf titel="Neue Karte" icon="add" art="rand" onPress={() => router.push("/karte-bearbeiten")} /> : null}
      {zeilen.length > 0 ? <Knopf titel="Alle durchgehen" icon="refresh" art="rand" ton="tuerkis" onPress={() => router.push({ pathname: "/karten-lernen", params: { stapel: id, alle: "1" } })} /> : null}
      {dran > 0 ? <Knopf titel={`Lernen · ${dran} dran`} icon="play" ton="tuerkis" onPress={() => router.push({ pathname: "/karten-lernen", params: { stapel: id } })} /> : null}
    </View>
  );

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel={info.titel} unter={info.unter} rechts={knoepfe} />

        {zeilen.length === 0 ? (
          <Kachel>
            <Leer
              icon={id === "eigen" ? "create" : "albums"}
              ton={id === "eigen" ? TOENE.orange : TOENE.tuerkis}
              titel={id === "eigen" ? "Noch keine eigenen Karten" : "Keine Karten"}
              text={id === "eigen" ? "Schreib dir Karten zu allem, was du dir merken willst – vorn die Frage, hinten die Antwort." : "Hier liegen gerade keine Karten."}
            >
              {id === "eigen" ? <Knopf titel="Karte schreiben" icon="add" onPress={() => router.push("/karte-bearbeiten")} /> : null}
            </Leer>
          </Kachel>
        ) : (
          <>
            <Kachel style={{ padding: 24, gap: 18 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>Lernfächer</Text>
                {dran > 0 ? (
                  <Text style={{ ...n.fett, fontSize: 14, color: B.text2 }}>
                    {dran} {dran === 1 ? "Karte" : "Karten"} heute dran
                  </Text>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Icon name="checkmark-circle" size={18} color={B.gruen} />
                    <Text style={{ ...n.fett, fontSize: 14, color: B.gruenKante }}>Alles wiederholt – die nächsten Karten kommen bald.</Text>
                  </View>
                )}
              </View>
              <Faecher ids={info.ids} faecher={stand.karteikarten.faecher} />
            </Kachel>

            <View style={{ flexDirection: "row", gap: 24, alignItems: "flex-start" }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Abschnitt titel="Karten" link={`${zeilen.length}`} />
                <Kachel>
                  {zeilen.map((k, i) => (
                    <KartenZeile key={k.id} inhalt={k} unter={unterzeile(k)} fach={stand.karteikarten.faecher[k.id]?.fach ?? null} aktiv={offen?.id === k.id} oben={i > 0} onPress={() => waehlen(k.id)} />
                  ))}
                </Kachel>
              </View>

              {offen ? (
                <View style={{ width: 400, gap: 14, position: "sticky" as ViewStyle["position"], top: 0 }}>
                  <Abschnitt titel="Vorschau" />
                  <KarteWeb key={offen.id} inhalt={offen} umgedreht={umgedreht} onDruck={() => setUmgedreht((u) => !u)} fach={offenFach} style={{ height: 430 }} />
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    {offen.art === "eigen" ? <Knopf titel="Bearbeiten" icon="create" art="rand" ton="blau" onPress={() => router.push({ pathname: "/karte-bearbeiten", params: { id: offen.id } })} style={{ flex: 1 }} /> : null}
                    {offen.art === "frage" ? <Knopf titel="Frage üben" icon="play" art="rand" ton="blau" onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: offen.frage.thema, start: offen.frage.id } })} style={{ flex: 1 }} /> : null}
                    {!istEingebaut(offen.id) ? <Knopf titel={offen.art === "frage" ? "Entfernen" : "Löschen"} icon="trash" art="rand" ton="rot" onPress={() => loeschen(offen)} style={{ flex: 1 }} /> : null}
                  </View>
                </View>
              ) : null}
            </View>
          </>
        )}
      </Spalte>
    </WebSeite>
  );
}
