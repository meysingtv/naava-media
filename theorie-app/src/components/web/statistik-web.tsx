import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { B, Balken, DickRing, Kachel, Knopf, ListenZeile, n, Reiter, Spalte, Symbol, THEMA_TON, TOENE, UnterKopf, zahlen, type Ton, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { THEMEN, themaVon, type ThemaId } from "@/lib/fragen";
import { auswertung, fortschritt, lernzeitText, serieAktuell, useStand, type Zeitraum } from "@/lib/stand";
import { aktivitaet, ampelVon, REIF, trendVon, type Ampel, type Saeule } from "@/lib/statistik";

// Mein Fortschritt am PC: oben die Prüfungsreife mit Ziel-Marke, darunter die
// Lernaktivität als Säulen neben den Kennzahlen des Zeitraums und die Themen
// nach Ampel in drei Spalten nebeneinander.

const AMPEL: Record<Ampel, { titel: string; icon: IconName; ton: Ton; text: string; leer: string }> = {
  ueben: { titel: "Üben", icon: "barbell", ton: TOENE.rot, text: "Hier lohnt sich Training", leer: "Hier ist gerade nichts." },
  fast: { titel: "Fast", icon: "locate", ton: TOENE.bernstein, text: "Noch etwas Übung", leer: "Hier ist gerade nichts." },
  sitzt: { titel: "Sitzt", icon: "checkmark-circle", ton: TOENE.gruen, text: "75 % und mehr richtig", leer: "Noch kein Thema sitzt – bleib dran!" },
};
const REIHENFOLGE: Ampel[] = ["ueben", "fast", "sitzt"];

const EINHEIT: Record<Zeitraum, string> = { woche: "je Tag", monat: "je Woche", gesamt: "je Monat" };

type ThemaEintrag = { thema: ThemaId; quote: number; geuebt: boolean };

export function StatistikWeb() {
  const { stand } = useStand();
  const [zeitraum, setZeitraum] = useState<Zeitraum>("woche");

  const gesamt = fortschritt(stand);
  const daten = auswertung(stand, zeitraum);
  // Am PC ist Platz für ausgeschriebene Wochen („vor 2 Wochen“ statt „−2 W“).
  const saeulen = useMemo(
    () => aktivitaet(stand, zeitraum).map((s) => (zeitraum !== "monat" ? s : { ...s, label: s.label === "Diese" ? "Diese Woche" : s.label.replace(/^−(\d+) W$/, (_, z) => (z === "1" ? "Vorwoche" : `vor ${z} Wochen`)) })),
    [stand, zeitraum],
  );
  const trend = trendVon(stand, zeitraum);
  const serie = serieAktuell(stand);

  // Themen nach Ampel – nicht geübte Themen zählen zu „Üben“.
  const quoten = new Map(daten.themen.map((t) => [t.thema, t.quote]));
  const gruppen: Record<Ampel, ThemaEintrag[]> = { sitzt: [], fast: [], ueben: [] };
  for (const t of THEMEN) {
    const q = quoten.get(t.id);
    gruppen[q == null ? "ueben" : ampelVon(q)].push({ thema: t.id, quote: q ?? 0, geuebt: q != null });
  }
  REIHENFOLGE.forEach((k) => gruppen[k].sort((a, b) => b.quote - a.quote));

  const aktuell = zeitraum === "woche" ? (new Date().getDay() + 6) % 7 : saeulen.length - 1;

  const zeitText = zeitraum === "woche" ? "letzte 7 Tage" : zeitraum === "monat" ? "letzte 30 Tage" : "insgesamt";
  const kennzahlen: { icon: IconName; ton: Ton; titel: string; unter: string; wert: string; farbe?: string }[] = [
    { icon: "flame", ton: TOENE.orange, titel: "Serie", unter: serie === 1 ? "Tag in Folge" : "Tage in Folge", wert: String(serie) },
    { icon: "time", ton: TOENE.blau, titel: "Lernzeit", unter: zeitText, wert: lernzeitText(daten.sekunden) },
    { icon: trend.positiv ? "trending-up" : "trending-down", ton: trend.positiv ? TOENE.gruen : TOENE.rot, titel: "Trefferquote", unter: trend.label === "Trefferquote" ? zeitText : trend.label, wert: trend.text, farbe: trend.text === "–" ? B.text3 : trend.positiv ? B.gruenKante : B.rotKante },
    { icon: "chatbubbles", ton: TOENE.indigo, titel: "Beantwortet", unter: `Fragen · ${zeitText}`, wert: zahlen(daten.antworten) },
    { icon: "flash", ton: TOENE.gelb, titel: "XP gesammelt", unter: zeitText, wert: zahlen(daten.xp) },
  ];

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Mein Fortschritt" unter="Wie weit du bist – und wo es noch hakt." rechts={<Knopf titel="Lernkalender" icon="calendar" art="rand" ton="blau" onPress={() => router.push("/kalender")} />} />

        <ReifeKachel anteil={gesamt.anteil} richtig={gesamt.richtig} gesamt={gesamt.gesamt} tagesziel={stand.tagesziel} />

        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>Lernaktivität</Text>
            <Reiter<Zeitraum>
              wert={zeitraum}
              onWechsel={setZeitraum}
              optionen={[
                { id: "woche", titel: "Woche" },
                { id: "monat", titel: "Monat" },
                { id: "gesamt", titel: "Gesamt" },
              ]}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 20, flexWrap: "wrap", alignItems: "stretch" }}>
            <Kachel style={{ flex: 2, minWidth: 420, padding: 24, gap: 6 }}>
              <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>Beantwortete Fragen</Text>
              <Text style={{ ...n.halb, fontSize: 13.5, color: B.text3 }}>{EINHEIT[zeitraum]}</Text>
              <Diagramm saeulen={saeulen} aktuell={aktuell} />
            </Kachel>
            <Kachel style={{ flex: 1, minWidth: 280 }}>
              {kennzahlen.map((k, i) => (
                <ListenZeile
                  key={k.icon}
                  icon={k.icon}
                  ton={k.ton}
                  titel={k.titel}
                  unter={k.unter}
                  oben={i > 0}
                  rechts={<Text style={{ ...n.schwarz, fontSize: 17, color: k.farbe ?? B.text, fontVariant: ["tabular-nums"] }}>{k.wert}</Text>}
                />
              ))}
            </Kachel>
          </View>
        </View>

        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
            <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>Deine Themen</Text>
            <Text style={{ ...n.halb, fontSize: 14, color: B.text3 }}>Trefferquote {zeitraum === "woche" ? "der letzten 7 Tage" : zeitraum === "monat" ? "der letzten 30 Tage" : "insgesamt"}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            {REIHENFOLGE.map((k) => (
              <AmpelSpalte key={k} ampel={k} themen={gruppen[k]} />
            ))}
          </View>
        </View>
      </Spalte>
    </WebSeite>
  );
}

/** Prüfungsreife: Ring mit Prozent, Text und Balken mit Ziel-Marke bei 90 %. */
function ReifeKachel({ anteil, richtig, gesamt, tagesziel }: { anteil: number; richtig: number; gesamt: number; tagesziel: number }) {
  const prozent = Math.round(anteil * 100);
  const reif = anteil >= REIF;
  const fehlen = Math.max(0, Math.ceil(REIF * gesamt) - richtig);
  const lerntage = fehlen > 0 ? Math.max(1, Math.ceil(fehlen / Math.max(1, tagesziel))) : 0;
  const ton = reif ? TOENE.gruen : TOENE.orange;
  return (
    <Kachel style={{ padding: 28, flexDirection: "row", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
      <DickRing anteil={anteil} groesse={120} dicke={12} ton={ton}>
        <Text style={{ ...n.schwarz, fontSize: 28, color: B.text, fontVariant: ["tabular-nums"] }}>{prozent}%</Text>
      </DickRing>
      <View style={{ flex: 1, minWidth: 320, gap: 16 }}>
        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <Icon name="flag" size={16} color={ton.farbe} />
            <Text style={{ ...n.fett, fontSize: 14.5, color: B.text3 }}>Prüfungsreife</Text>
          </View>
          <Text style={{ ...n.schwarz, fontSize: 24, lineHeight: 30, color: B.text }}>{reif ? "Du bist prüfungsreif!" : `Noch ${Math.round(REIF * 100) - prozent} % bis prüfungsreif`}</Text>
          <Text style={{ ...n.halb, fontSize: 15, color: B.text2 }}>
            {richtig} von {gesamt} Fragen sicher
          </Text>
        </View>
        <ZielBalken anteil={anteil} ton={ton} />
        <Text style={{ ...n.halb, fontSize: 14, lineHeight: 20, color: B.text3 }}>
          {fehlen > 0
            ? `Noch ${fehlen} ${fehlen === 1 ? "Frage" : "Fragen"} sicher beantworten – mit deinem Tagesziel etwa ${lerntage} ${lerntage === 1 ? "Lerntag" : "Lerntage"}.`
            : "Mach eine Prüfungssimulation, um es zu bestätigen."}
        </Text>
      </View>
    </Kachel>
  );
}

/** Balken mit Marke „Ziel“ bei 90 %. */
function ZielBalken({ anteil, ton }: { anteil: number; ton: Ton }) {
  return (
    <View style={{ paddingTop: 20 }}>
      <Balken anteil={anteil} ton={ton} hoehe={12} />
      <View style={{ position: "absolute", left: `${REIF * 100}%`, top: 0, bottom: -4, width: 2, marginLeft: -1, alignItems: "center" }}>
        <Text style={{ position: "absolute", top: 0, width: 60, textAlign: "center", ...n.fett, fontSize: 12, color: B.text3 }}>Ziel 90 %</Text>
        <View style={{ position: "absolute", top: 17, bottom: 0, width: 2, borderRadius: 1, backgroundColor: B.text }} />
      </View>
    </View>
  );
}

/** Säulen mit Wert darüber und Beschriftung darunter – die aktuelle Säule orange. */
function Diagramm({ saeulen, aktuell }: { saeulen: Saeule[]; aktuell: number }) {
  const HOEHE = 170;
  const meiste = Math.max(1, ...saeulen.map((s) => s.wert));
  const [zeiger, setZeiger] = useState<number | null>(null);
  return (
    <View style={{ marginTop: 18 }}>
      <View style={{ height: HOEHE + 24, flexDirection: "row", alignItems: "flex-end", gap: 14 }}>
        {[0, 0.5, 1].map((p) => (
          <View key={p} style={{ position: "absolute", left: 0, right: 0, bottom: p * HOEHE, height: 1.5, backgroundColor: B.ton }} />
        ))}
        {saeulen.map((s, i) => {
          const jetzt = i === aktuell;
          const ton = jetzt ? TOENE.orange : TOENE.gruen;
          const hervor = zeiger === i;
          return (
            <Pressable
              key={s.label}
              onHoverIn={() => setZeiger(i)}
              onHoverOut={() => setZeiger((z) => (z === i ? null : z))}
              accessibilityLabel={`${s.label}: ${s.wert} ${s.wert === 1 ? "Frage" : "Fragen"}`}
              style={{ flex: 1, alignItems: "center", gap: 6 }}
            >
              <Text style={{ ...n.schwarz, fontSize: 13.5, color: s.wert ? (hervor ? ton.kante : B.text) : B.text3, fontVariant: ["tabular-nums"] }}>{zahlen(s.wert)}</Text>
              <View
                style={{
                  width: "100%",
                  maxWidth: 64,
                  height: Math.max(8, (s.wert / meiste) * HOEHE),
                  borderRadius: 10,
                  backgroundColor: s.wert ? ton.farbe : B.ton,
                  borderBottomWidth: s.wert ? 4 : 0,
                  borderBottomColor: ton.kante,
                  opacity: zeiger != null && !hervor && s.wert ? 0.75 : 1,
                }}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
        {saeulen.map((s, i) => (
          <Text key={s.label} style={{ flex: 1, textAlign: "center", ...n.fett, fontSize: 13, color: i === aktuell ? B.orange : B.text2 }} numberOfLines={1}>
            {s.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Eine Ampel-Gruppe als Spalte: Kopf mit Anzahl, darunter die Themen. */
function AmpelSpalte({ ampel, themen }: { ampel: Ampel; themen: ThemaEintrag[] }) {
  const a = AMPEL[ampel];
  return (
    <Kachel style={{ flex: 1, minWidth: 270 }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
          <Icon name={a.icon} size={21} color={a.ton.farbe} />
          <Text style={{ flex: 1, ...n.schwarz, fontSize: 17, color: B.text }}>{a.titel}</Text>
          <Text style={{ ...n.schwarz, fontSize: 17, color: B.text3, fontVariant: ["tabular-nums"] }}>{themen.length}</Text>
        </View>
        <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }}>{a.text}</Text>
      </View>
      {themen.length === 0 ? (
        <View style={{ paddingHorizontal: 18, paddingVertical: 22, borderTopWidth: 1.5, borderTopColor: B.ton }}>
          <Text style={{ ...n.halb, fontSize: 14, color: B.text3, textAlign: "center" }}>{a.leer}</Text>
        </View>
      ) : (
        themen.map((t) => <ThemaZeile key={t.thema} eintrag={t} ton={a.ton} />)
      )}
    </Kachel>
  );
}

function ThemaZeile({ eintrag, ton }: { eintrag: ThemaEintrag; ton: Ton }) {
  const thema = themaVon(eintrag.thema);
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/thema/[id]", params: { id: eintrag.thema } })}
      accessibilityRole="button"
      accessibilityLabel={`${thema.titel}, ${eintrag.geuebt ? `${Math.round(eintrag.quote * 100)} Prozent` : "noch nicht geübt"}`}
      style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 11, borderTopWidth: 1.5, borderTopColor: B.ton, backgroundColor: z.hovered ? B.hover : "transparent" })}
    >
      <Symbol icon={thema.icon as IconName} ton={THEMA_TON[eintrag.thema]} groesse={34} />
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <Text style={{ ...n.fett, fontSize: 14.5, color: B.text }} numberOfLines={1}>
          {thema.titel}
        </Text>
        <Balken anteil={eintrag.quote} ton={ton} hoehe={6} />
      </View>
      <Text style={{ width: 44, textAlign: "right", ...n.schwarz, fontSize: 14, color: eintrag.geuebt ? ton.kante : B.text3, fontVariant: ["tabular-nums"] }}>{eintrag.geuebt ? `${Math.round(eintrag.quote * 100)}%` : "neu"}</Text>
    </Pressable>
  );
}
