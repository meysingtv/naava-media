import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { Kontrollleuchte } from "@/components/leuchten";
import { Verkehrszeichen } from "@/components/zeichen";
import { Abschnitt, B, Chip, DickRing, Kachel, Knopf, Leer, n, Reiter, Spalte, Symbol, THEMA_TON, UnterKopf, type Ton, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { fragenZuThema, istZeichen, THEMEN, themaVon, type Frage, type LeuchteKey, type ThemaId, type ZeichenKey } from "@/lib/fragen";
import { fortschritt, themaStatistik, useStand, type Stand } from "@/lib/stand";
import { useThemenvideos } from "@/lib/themenvideos";

// Themenseite am PC: links alle Fragen des Themas als ruhige Liste mit Filter,
// rechts der Stand als Ring mit Werten, der Start ins Training und die Videos
// zum Thema.

export type FrageStand = "neu" | "falsch" | "geuebt" | "sicher";

export const STAND_TEXT: Record<FrageStand, string> = { neu: "neu", falsch: "falsch", geuebt: "geübt", sicher: "sicher" };
export const STAND_FARBE: Record<FrageStand, string> = { neu: B.text3, falsch: B.rot, geuebt: B.orange, sicher: B.gruen };

export function frageStand(stand: Stand, frageId: string): FrageStand {
  const fs = stand.fragen[frageId];
  if (!fs || fs.r + fs.f === 0) return "neu";
  if (fs.l === 0) return "falsch";
  if (fs.box >= 3) return "sicher";
  return "geuebt";
}

/** Kleines Bild zur Frage: Zeichen, Kontrollleuchte, Lageplan oder das Themensymbol. */
export function FrageBild({ frage, groesse = 48 }: { frage: Frage; groesse?: number }) {
  const ton = THEMA_TON[frage.thema];
  const flaeche = { width: groesse, height: groesse, borderRadius: groesse * 0.28, alignItems: "center", justifyContent: "center", backgroundColor: B.ton } as const;
  if (frage.bild && istZeichen(frage.bild)) {
    return (
      <View style={flaeche}>
        <Verkehrszeichen zeichen={frage.bild as ZeichenKey} groesse={groesse * 0.72} />
      </View>
    );
  }
  if (frage.bild?.startsWith("leuchte_")) {
    return (
      <View style={[flaeche, { backgroundColor: "#16191D" }]}>
        <Kontrollleuchte leuchte={frage.bild as LeuchteKey} groesse={groesse * 0.64} />
      </View>
    );
  }
  return (
    <View style={flaeche}>
      <Icon name={frage.bild ? "map-outline" : (themaVon(frage.thema).icon as IconName)} size={groesse * 0.42} color={ton.farbe} />
    </View>
  );
}

/** Stand einer Frage als Punkt mit Wort. */
export function StandMarke({ stand }: { stand: FrageStand }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: STAND_FARBE[stand] }} />
      <Text style={{ ...n.fett, fontSize: 13, color: stand === "neu" ? B.text3 : B.text2 }}>{STAND_TEXT[stand]}</Text>
    </View>
  );
}

type Filter = "alle" | "offen" | "falsch" | "sicher";

/** Eine Frage als Zeile – öffnet das Training im Thema ab dieser Frage. */
function FrageReihe({ frage, stand, oben }: { frage: Frage; stand: FrageStand; oben: boolean }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: frage.thema, start: frage.id } })}
      accessibilityRole="button"
      accessibilityLabel={frage.text}
      style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: oben ? 1.5 : 0, borderTopColor: B.ton, backgroundColor: z.hovered ? B.hover : "transparent" })}
    >
      <FrageBild frage={frage} />
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <Text style={{ ...n.fett, fontSize: 15, lineHeight: 21, color: B.text }} numberOfLines={3}>
          {frage.text}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <StandMarke stand={stand} />
          <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>
            {frage.punkte} Punkte · {frage.art === "zahl" ? "Zahl eingeben" : frage.bild ? "mit Bild" : "Auswahl"}
          </Text>
        </View>
      </View>
      <Icon name="chevron-forward" size={18} color={B.text3} />
    </Pressable>
  );
}

/** Eine Kennzahl rechts neben dem Ring. */
function Kennzahl({ wert, titel, farbe }: { wert: number; titel: string; farbe: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: farbe }} />
      <Text style={{ flex: 1, ...n.halb, fontSize: 14.5, color: B.text2 }}>{titel}</Text>
      <Text style={{ ...n.schwarz, fontSize: 16, color: B.text, fontVariant: ["tabular-nums"] }}>{wert}</Text>
    </View>
  );
}

function dauerText(s: number | null): string | null {
  if (!s) return null;
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

export function ThemaWeb({ id }: { id: ThemaId }) {
  const { stand } = useStand();
  const [filter, setFilter] = useState<Filter>("alle");
  const thema = themaVon(id);
  const ton: Ton = THEMA_TON[thema.id];
  const fragen = fragenZuThema(thema.id);
  const stat = themaStatistik(stand, thema.id);
  const fort = fortschritt(stand, fragen);
  const videos = useThemenvideos().videos.filter((v) => v.thema_id === thema.id);

  const mitStand = fragen.map((q) => ({ frage: q, stand: frageStand(stand, q.id) }));
  const zahl = (f: Filter) => mitStand.filter((x) => f === "alle" || (f === "offen" ? x.stand !== "sicher" : x.stand === f)).length;
  const liste = mitStand.filter((x) => filter === "alle" || (filter === "offen" ? x.stand !== "sicher" : x.stand === filter));
  const anzahl = (st: FrageStand) => mitStand.filter((x) => x.stand === st).length;

  const punkte = fragen.reduce((a, q) => a + q.punkte, 0);
  // Die nächsten Themen in der Reihenfolge der Liste – zum schnellen Weiterklicken.
  const platz = THEMEN.findIndex((t) => t.id === thema.id);
  const weitere = [1, 2, 3, 4].map((k) => THEMEN[(platz + k) % THEMEN.length]);

  const lernen = () => router.push({ pathname: "/training", params: { modus: "thema", thema: thema.id } });

  return (
    <WebSeite ohneRechts>
      <Spalte breite={1180}>
        <UnterKopf titel={thema.titel} unter={thema.kurz} rechts={<Chip icon={thema.icon as IconName} text={`${stat.gesamt} Fragen · ${punkte} Punkte`} ton={ton} />} />

        <View style={{ flexDirection: "row", gap: 24, alignItems: "flex-start" }}>
          {/* Fragen */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Abschnitt titel="Alle Fragen" link={`${stat.sicher} von ${stat.gesamt} sicher`} />
            <View style={{ marginBottom: 14 }}>
              <Reiter<Filter>
                optionen={[
                  { id: "alle", titel: "Alle", zahl: zahl("alle") },
                  { id: "offen", titel: "Offen", zahl: zahl("offen") },
                  { id: "falsch", titel: "Fehler", zahl: zahl("falsch") },
                  { id: "sicher", titel: "Sicher", zahl: zahl("sicher") },
                ]}
                wert={filter}
                onWechsel={setFilter}
              />
            </View>
            <Kachel>
              {liste.length ? (
                liste.map((x, i) => <FrageReihe key={x.frage.id} frage={x.frage} stand={x.stand} oben={i > 0} />)
              ) : (
                <Leer
                  icon={filter === "falsch" ? "checkmark-circle" : filter === "sicher" ? "school" : "sparkles"}
                  ton={ton}
                  titel={filter === "falsch" ? "Keine offenen Fehler" : filter === "sicher" ? "Noch keine Frage sicher" : "Alles sicher"}
                  text={filter === "sicher" ? "Eine Frage gilt als sicher, wenn du sie mehrmals hintereinander richtig beantwortet hast." : "Hier gibt es gerade nichts zu tun."}
                />
              )}
            </Kachel>
          </View>

          {/* Stand, Start und Videos */}
          <View style={{ width: 340, gap: 28 }}>
            <View>
              <Abschnitt titel="Dein Stand" link={fort.anteil >= 0.9 ? "Prüfungsreif" : undefined} />
              <Kachel style={{ padding: 24, gap: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                  <DickRing anteil={fort.anteil} groesse={112} dicke={11} ton={ton}>
                    <Text style={{ ...n.schwarz, fontSize: 26, color: B.text, fontVariant: ["tabular-nums"] }}>{Math.round(fort.anteil * 100)}%</Text>
                  </DickRing>
                  <View style={{ flex: 1, gap: 10 }}>
                    <Kennzahl wert={anzahl("sicher")} titel="sicher" farbe={B.gruen} />
                    <Kennzahl wert={anzahl("geuebt")} titel="geübt" farbe={B.orange} />
                    <Kennzahl wert={anzahl("falsch")} titel="falsch" farbe={B.rot} />
                    <Kennzahl wert={anzahl("neu")} titel="neu" farbe={B.linie} />
                  </View>
                </View>
                <View style={{ gap: 10 }}>
                  <Knopf titel="Thema lernen" icon="play" groesse="gross" onPress={lernen} />
                  <Text style={{ ...n.halb, fontSize: 13, color: B.text3, textAlign: "center" }}>{stat.gesamt} Fragen · offene zuerst</Text>
                  {stat.fehler > 0 ? <Knopf titel={`Nur Fehler üben (${stat.fehler})`} icon="refresh" art="rand" ton="rot" onPress={() => router.push({ pathname: "/training", params: { modus: "fehler", thema: thema.id } })} /> : null}
                </View>
              </Kachel>
            </View>

            {videos.length ? (
              <View>
                <Abschnitt titel="Videos" link={videos.length === 1 ? "1 Video" : `${videos.length} Videos`} />
                <Kachel>
                  {videos.map((v, i) => {
                    const dauer = dauerText(v.dauer);
                    return (
                      <Pressable
                        key={v.id}
                        onPress={() => router.push({ pathname: "/themavideo", params: { id: v.id } })}
                        accessibilityRole="button"
                        accessibilityLabel={`Video: ${v.titel}`}
                        style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1.5 : 0, borderTopColor: B.ton, backgroundColor: z.hovered ? B.hover : "transparent" })}
                      >
                        <Symbol icon="play" ton={ton} groesse={40} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ ...n.fett, fontSize: 15, color: B.text }} numberOfLines={2}>
                            {v.titel}
                          </Text>
                          {dauer ? <Text style={{ ...n.halb, fontSize: 13, color: B.text3, fontVariant: ["tabular-nums"] }}>{dauer} Min.</Text> : null}
                        </View>
                        <Icon name="chevron-forward" size={18} color={B.text3} />
                      </Pressable>
                    );
                  })}
                </Kachel>
              </View>
            ) : null}

            <View>
              <Abschnitt titel="Weitere Themen" link="Alle" onLink={() => router.navigate("/lernen")} />
              <Kachel>
                {weitere.map((t, i) => {
                  const tt = THEMA_TON[t.id];
                  const anteil = fortschritt(stand, fragenZuThema(t.id)).anteil;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => router.replace({ pathname: "/thema/[id]", params: { id: t.id } })}
                      accessibilityRole="button"
                      accessibilityLabel={t.titel}
                      style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, height: 58, borderTopWidth: i ? 1.5 : 0, borderTopColor: B.ton, backgroundColor: z.hovered ? B.hover : "transparent" })}
                    >
                      <Symbol icon={t.icon as IconName} ton={tt} groesse={34} />
                      <Text style={{ flex: 1, ...n.fett, fontSize: 14.5, color: B.text }} numberOfLines={1}>
                        {t.titel}
                      </Text>
                      <Text style={{ ...n.schwarz, fontSize: 13.5, color: anteil > 0 ? B.text : B.text3, fontVariant: ["tabular-nums"] }}>{Math.round(anteil * 100)}%</Text>
                    </Pressable>
                  );
                })}
              </Kachel>
            </View>
          </View>
        </View>
      </Spalte>
    </WebSeite>
  );
}
