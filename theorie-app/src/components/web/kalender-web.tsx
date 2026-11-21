import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { Abschnitt, B, Balken, Kachel, n, Raster, Spalte, TOENE, UnterKopf, zahlen, type Ton, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { tageText, terminDatum, terminText } from "@/lib/pruefungstag";
import { serieAktuell, tagKey, useStand, wochenStart } from "@/lib/stand";

// Lernkalender am PC: oben vier Kennzahlen, links der Monat als großes Raster
// (je kräftiger das Orange, desto mehr Fragen), rechts Heute, Rekord und
// Prüfungstermin, unten das letzte halbe Jahr als feines Punkteraster.

const WOCHEN = 26;
const TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/** Fläche eines Tages: je mehr Fragen, desto kräftiger. */
function tagesFlaeche(anzahl: number): string {
  if (anzahl <= 0) return B.ton;
  if (anzahl < 10) return "#FFE0CC";
  if (anzahl < 30) return "#FFB27F";
  return B.orange;
}

/** Längste Serie aufeinanderfolgender Lerntage in einer Liste von Tagen. */
export function laengsteSerie(tage: string[]): number {
  const sortiert = [...tage].sort();
  let beste = 0;
  let lauf = 0;
  let vorher: Date | null = null;
  for (const t of sortiert) {
    const [j, m, d] = t.split("-").map(Number);
    const datum = new Date(j, m - 1, d);
    lauf = vorher && Math.round((datum.getTime() - vorher.getTime()) / 86400000) === 1 ? lauf + 1 : 1;
    beste = Math.max(beste, lauf);
    vorher = datum;
  }
  return beste;
}

function Kennzahl({ icon, ton, wert, titel }: { icon: IconName; ton: Ton; wert: string; titel: string }) {
  return (
    <Kachel style={{ padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}>
      <Icon name={icon} size={30} color={ton.farbe} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...n.schwarz, fontSize: 22, color: B.text, fontVariant: ["tabular-nums"] }} numberOfLines={1}>
          {wert}
        </Text>
        <Text style={{ ...n.halb, fontSize: 13, color: B.text2 }}>{titel}</Text>
      </View>
    </Kachel>
  );
}

function Pfeil({ icon, label, onPress, aus }: { icon: IconName; label: string; onPress: () => void; aus?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={aus} accessibilityRole="button" accessibilityLabel={label} style={(z: Zustand) => ({ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: B.linie, backgroundColor: z.hovered && !aus ? B.ton : B.flaeche, opacity: aus ? 0.35 : 1 })}>
      <Icon name={icon} size={18} color={B.text} />
    </Pressable>
  );
}

function LegendePunkt({ farbe, text, rand }: { farbe: string; text: string; rand?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: farbe, borderWidth: rand ? 2 : 0, borderColor: rand }} />
      <Text style={{ ...n.halb, fontSize: 12.5, color: B.text3 }}>{text}</Text>
    </View>
  );
}

export function KalenderWeb() {
  const { stand } = useStand();
  const heute = tagKey();
  const jetzt = new Date();
  const [monat, setMonat] = useState(() => new Date(jetzt.getFullYear(), jetzt.getMonth(), 1));

  const lerntage = Object.entries(stand.antwortenTage)
    .filter(([, x]) => x > 0)
    .map(([t]) => t);
  const summe = Object.values(stand.antwortenTage).reduce((a, b) => a + b, 0);
  const serie = serieAktuell(stand);
  const besteSerie = Math.max(stand.besteSerie, laengsteSerie(lerntage), serie);
  const termin = terminDatum(stand.pruefungstermin);
  const terminKey = termin ? tagKey(termin) : null;
  const heuteFragen = stand.antwortenTage[heute] ?? 0;
  const zielGeschafft = heuteFragen >= stand.tagesziel;

  // Monatsraster: Wochen ab Montag, leere Felder vor dem 1. und nach dem Monatsende.
  const jahr = monat.getFullYear();
  const m = monat.getMonth();
  const tageImMonat = new Date(jahr, m + 1, 0).getDate();
  const versatz = (new Date(jahr, m, 1).getDay() + 6) % 7;
  const felder: (string | null)[] = [...Array.from({ length: versatz }, () => null), ...Array.from({ length: tageImMonat }, (_, i) => tagKey(new Date(jahr, m, i + 1)))];
  while (felder.length % 7) felder.push(null);
  const wochen = Array.from({ length: felder.length / 7 }, (_, w) => felder.slice(w * 7, w * 7 + 7));
  const lerntageMonat = felder.filter((k) => k && (stand.antwortenTage[k] ?? 0) > 0).length;
  const fragenMonat = felder.reduce((a, k) => a + (k ? (stand.antwortenTage[k] ?? 0) : 0), 0);
  const istAktuellerMonat = jahr === jetzt.getFullYear() && m === jetzt.getMonth();

  // Das letzte halbe Jahr als Punkteraster (Spalten = Wochen).
  const start = wochenStart();
  start.setDate(start.getDate() - 7 * (WOCHEN - 1));
  const spalten = Array.from({ length: WOCHEN }, (_, w) =>
    Array.from({ length: 7 }, (_, t) => {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7 + t);
      const key = tagKey(d);
      return { key, anzahl: stand.antwortenTage[key] ?? 0, zukunft: key > heute, ersterImMonat: d.getDate() <= 7 && t === 0, monat: d.getMonth() };
    }),
  );

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Lernkalender" unter="Deine Lerntage auf einen Blick" />

        <Raster min={200} max={4} abstand={16}>
          <Kennzahl icon="flame" ton={serie > 0 ? TOENE.orange : { ...TOENE.orange, farbe: B.text3 }} wert={`${serie} ${serie === 1 ? "Tag" : "Tage"}`} titel="Aktuelle Serie" />
          <Kennzahl icon="trophy" ton={TOENE.gelb} wert={`${besteSerie} ${besteSerie === 1 ? "Tag" : "Tage"}`} titel="Längste Serie" />
          <Kennzahl icon="calendar" ton={TOENE.gruen} wert={zahlen(lerntage.length)} titel={lerntage.length === 1 ? "Lerntag" : "Lerntage"} />
          <Kennzahl icon="checkmark-done" ton={TOENE.blau} wert={zahlen(summe)} titel="Antworten gesamt" />
        </Raster>

        <View style={{ flexDirection: "row", gap: 24, alignItems: "flex-start" }}>
          {/* Monat */}
          <Kachel style={{ flex: 1, minWidth: 0, padding: 24, gap: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...n.schwarz, fontSize: 22, color: B.text }}>
                  {MONATE[m]} {jahr}
                </Text>
                <Text style={{ ...n.halb, fontSize: 13.5, color: B.text3 }}>
                  {lerntageMonat} {lerntageMonat === 1 ? "Lerntag" : "Lerntage"} · {zahlen(fragenMonat)} {fragenMonat === 1 ? "Frage" : "Fragen"}
                </Text>
              </View>
              <Pfeil icon="chevron-back" label="Vorheriger Monat" onPress={() => setMonat(new Date(jahr, m - 1, 1))} />
              <Pfeil icon="chevron-forward" label="Nächster Monat" onPress={() => setMonat(new Date(jahr, m + 1, 1))} aus={istAktuellerMonat} />
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {TAGE.map((t) => (
                  <Text key={t} style={{ flex: 1, textAlign: "center", ...n.fett, fontSize: 12.5, color: B.text3 }}>
                    {t}
                  </Text>
                ))}
              </View>
              {wochen.map((woche, w) => (
                <View key={w} style={{ flexDirection: "row", gap: 8 }}>
                  {woche.map((key, i) => {
                    if (!key) return <View key={i} style={{ flex: 1, minWidth: 0, height: 64 }} />;
                    const anzahl = stand.antwortenTage[key] ?? 0;
                    const zukunft = key > heute;
                    const istHeute = key === heute;
                    const ziel = anzahl >= stand.tagesziel && !zukunft;
                    const pruefung = key === terminKey;
                    const tag = Number(key.slice(8));
                    const kraeftig = anzahl >= 30;
                    return (
                      <View
                        key={key}
                        accessibilityLabel={`${tag}. ${MONATE[m]}${anzahl > 0 ? `, ${anzahl} Fragen` : ""}${ziel ? ", Tagesziel erreicht" : ""}${pruefung ? ", Prüfungstag" : ""}`}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          height: 64,
                          borderRadius: 14,
                          backgroundColor: zukunft ? B.flaeche : tagesFlaeche(anzahl),
                        }}
                      >
                        {/* Rand und Innenabstand liegen innen, damit alle Spalten gleich breit bleiben */}
                        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 14, borderWidth: istHeute ? 2 : zukunft ? 1.5 : 0, borderColor: istHeute ? B.text : B.ton, paddingHorizontal: 10, paddingVertical: 8, justifyContent: "space-between" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <Text style={{ ...(anzahl > 0 || istHeute ? n.schwarz : n.halb), fontSize: 15, color: kraeftig ? "#FFFFFF" : zukunft ? B.text3 : B.text, fontVariant: ["tabular-nums"] }}>{tag}</Text>
                            {pruefung ? <Icon name="flag" size={15} color={kraeftig ? "#FFFFFF" : B.gruenKante} /> : ziel ? <Icon name="checkmark-circle" size={16} color={kraeftig ? "#FFFFFF" : B.gruenKante} /> : null}
                          </View>
                          {anzahl > 0 ? (
                            <Text style={{ ...n.fett, fontSize: 12, color: kraeftig ? "rgba(255,255,255,0.9)" : B.orangeKante, fontVariant: ["tabular-nums"] }} numberOfLines={1}>
                              {anzahl} {anzahl === 1 ? "Frage" : "Fragen"}
                            </Text>
                          ) : pruefung ? (
                            <Text style={{ ...n.fett, fontSize: 12, color: B.gruenKante }} numberOfLines={1}>
                              Prüfung
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 18, rowGap: 8 }}>
              <LegendePunkt farbe={B.ton} text="nicht gelernt" />
              <LegendePunkt farbe="#FFE0CC" text="unter 10" />
              <LegendePunkt farbe="#FFB27F" text="10–29" />
              <LegendePunkt farbe={B.orange} text="30 und mehr" />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icon name="checkmark-circle" size={14} color={B.gruenKante} />
                <Text style={{ ...n.halb, fontSize: 12.5, color: B.text3 }}>Tagesziel</Text>
              </View>
              <LegendePunkt farbe={B.grund} rand={B.text} text="heute" />
            </View>
          </Kachel>

          {/* Heute, Rekord, Termin */}
          <View style={{ width: 340, gap: 20 }}>
            <Kachel style={{ padding: 22, gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>Heute</Text>
                <Text style={{ ...n.fett, fontSize: 13.5, color: zielGeschafft ? B.gruenKante : B.text3 }}>{zielGeschafft ? "Tagesziel geschafft" : `noch ${stand.tagesziel - heuteFragen}`}</Text>
              </View>
              <Text style={{ ...n.schwarz, fontSize: 28, color: B.text, fontVariant: ["tabular-nums"] }}>
                {heuteFragen} <Text style={{ ...n.fett, fontSize: 16, color: B.text3 }}>/ {stand.tagesziel} Fragen</Text>
              </Text>
              <Balken anteil={stand.tagesziel ? heuteFragen / stand.tagesziel : 0} ton={zielGeschafft ? TOENE.gruen : TOENE.orange} />
              <Text style={{ ...n.halb, fontSize: 13.5, lineHeight: 19, color: B.text2 }}>{heuteFragen > 0 ? (serie > 1 ? `Deine Serie läuft seit ${serie} Tagen.` : "Deine Serie läuft.") : serie > 0 ? "Beantworte heute eine Frage, damit deine Serie weiterläuft." : "Beantworte heute eine Frage – dann startet deine Serie."}</Text>
            </Kachel>

            <Kachel style={{ padding: 22, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon name="trophy" size={18} color={B.gelb} />
                <Text style={{ flex: 1, ...n.schwarz, fontSize: 17, color: B.text }}>Rekord</Text>
                <Text style={{ ...n.fett, fontSize: 13.5, color: besteSerie > 0 && serie >= besteSerie ? B.orangeKante : B.text3 }}>{besteSerie === 0 ? "noch keiner" : serie >= besteSerie ? "erreicht" : `noch ${besteSerie - serie} ${besteSerie - serie === 1 ? "Tag" : "Tage"}`}</Text>
              </View>
              <Balken anteil={besteSerie ? serie / besteSerie : 0} ton={TOENE.gelb} />
              <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }}>
                {serie} von {besteSerie} {besteSerie === 1 ? "Tag" : "Tagen"} in Folge
              </Text>
            </Kachel>

            <Kachel onPress={() => router.push("/pruefungstermin")} style={{ padding: 22, flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Icon name="flag" size={24} color={B.gruen} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...n.schwarz, fontSize: 16, color: B.text }}>{termin ? `Prüfung ${tageText(termin)}` : "Prüfungstermin"}</Text>
                <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }} numberOfLines={2}>
                  {termin ? terminText(termin) : "Trag deinen Termin ein – er erscheint im Kalender."}
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color={B.text3} />
            </Kachel>
          </View>
        </View>

        {/* Letztes halbes Jahr */}
        <View>
          <Abschnitt titel="Letzte 26 Wochen" link={`${lerntage.length} Lerntage · ${zahlen(summe)} Antworten`} />
          <Kachel style={{ padding: 24 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ gap: 5, paddingTop: 20 }}>
                {TAGE.map((t) => (
                  <Text key={t} style={{ height: 18, lineHeight: 18, ...n.halb, fontSize: 11.5, color: B.text3 }}>
                    {t}
                  </Text>
                ))}
              </View>
              <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between" }}>
                {spalten.map((woche, i) => (
                  <View key={i} style={{ gap: 5 }}>
                    <View style={{ height: 15 }}>{woche[0].ersterImMonat ? <Text style={{ position: "absolute", left: 0, width: 48, ...n.halb, fontSize: 11.5, color: B.text3 }}>{MONATE[woche[0].monat].slice(0, 3)}</Text> : null}</View>
                    {woche.map((tag) => (
                      <View key={tag.key} style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: tag.zukunft ? "transparent" : tagesFlaeche(tag.anzahl), borderWidth: tag.key === heute ? 2 : 0, borderColor: B.text }} />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </Kachel>
        </View>
      </Spalte>
    </WebSeite>
  );
}
