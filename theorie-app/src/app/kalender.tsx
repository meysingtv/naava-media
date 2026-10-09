import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { CaretLeftIcon } from "phosphor-react-native/src/icons/CaretLeft";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { CheckCircleIcon } from "phosphor-react-native/src/icons/CheckCircle";
import { FlagCheckeredIcon } from "phosphor-react-native/src/icons/FlagCheckered";
import { FlameIcon } from "phosphor-react-native/src/icons/Flame";
import { TrophyIcon } from "phosphor-react-native/src/icons/Trophy";

import { GlasGrund, GlasKarte } from "@/components/glas-flaeche";
import { GrossKopf, Seite } from "@/components/seite";
import { useDarstellung } from "@/lib/darstellung";
import { useFenster } from "@/lib/fenster";
import { tippen } from "@/lib/haptik";
import { serieAktuell, tagKey, useStand, wochenStart } from "@/lib/stand";
import { leuchten, mitDeckkraft, RAND, schrift, verlauf } from "@/lib/theme";

const WOCHEN = 12;
const TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/** Farbe eines Tages: je mehr Fragen, desto kräftiger das Orange. */
function tagesFarbe(n: number, hell: boolean, orange: string): string {
  if (n <= 0) return hell ? "rgba(20,23,27,0.05)" : "rgba(255,255,255,0.06)";
  if (n < 10) return mitDeckkraft(orange, 0.3);
  if (n < 30) return mitDeckkraft(orange, 0.62);
  return orange;
}

/** Serie: große Zahl, Stand von heute und der Weg zum eigenen Rekord. */
function SerieKarte({ serie, beste, heuteFragen, tagesziel }: { serie: number; beste: number; heuteFragen: number; tagesziel: number }) {
  const { farbwelt: f } = useDarstellung();
  const { width } = useFenster();
  const breit = width >= 700;
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const rekord = Math.max(beste, serie);
  const anteil = rekord > 0 ? serie / rekord : 0;
  const fehlt = rekord - serie;
  const ziel = heuteFragen >= tagesziel;
  // Stand von heute als kleine Marke oben rechts
  const marke = ziel ? { text: "Tagesziel geschafft", farbe: gruen } : heuteFragen > 0 ? { text: `Heute ${heuteFragen}/${tagesziel}`, farbe: f.orange } : { text: serie > 0 ? "Heute noch offen" : "Heute starten", farbe: null };

  const zahl = (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
      <Text style={{ ...schrift.titel, fontSize: 64, lineHeight: 72, color: f.text, letterSpacing: -1.5, fontVariant: ["tabular-nums"] }}>{serie}</Text>
      <Text style={{ ...schrift.textHalb, fontSize: 18, color: f.text2 }}>{serie === 1 ? "Tag" : "Tage"} in Folge</Text>
    </View>
  );

  const weg =
    rekord > 0 ? (
      <View style={{ gap: 9 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <TrophyIcon size={16} color="#FFB400" weight="fill" />
            <Text style={{ ...schrift.textHalb, fontSize: 14, color: f.text }}>
              Rekord: {rekord} {rekord === 1 ? "Tag" : "Tage"}
            </Text>
          </View>
          <Text style={{ ...schrift.textMittel, fontSize: 13, color: fehlt === 0 ? f.orange : f.text3 }}>{fehlt === 0 ? "Rekord erreicht" : `noch ${fehlt} ${fehlt === 1 ? "Tag" : "Tage"}`}</Text>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: f.hell ? "rgba(20,23,27,0.07)" : "rgba(255,255,255,0.09)", overflow: "hidden" }}>
          {anteil > 0 ? <LinearGradient colors={verlauf.knopf} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: `${Math.max(4, anteil * 100)}%`, height: "100%", borderRadius: 4 }} /> : null}
        </View>
      </View>
    ) : (
      <Text style={{ ...schrift.text, fontSize: 14, lineHeight: 19, color: f.text2 }}>Beantworte heute eine Frage – dann startet deine Serie.</Text>
    );

  return (
    <GlasKarte style={{ borderRadius: 26, padding: 20, paddingTop: 18, gap: breit ? 6 : 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <FlameIcon size={18} color={f.orange} weight="fill" />
          <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.text2 }}>Aktuelle Serie</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: marke.farbe ? mitDeckkraft(marke.farbe, f.hell ? 0.12 : 0.16) : f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.08)" }}>
          {ziel ? <CheckCircleIcon size={14} color={gruen} weight="fill" /> : null}
          <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: marke.farbe ?? f.text2 }}>{marke.text}</Text>
        </View>
      </View>
      {breit ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 32 }}>
          {zahl}
          <View style={{ flex: 1 }}>{weg}</View>
        </View>
      ) : (
        <>
          {zahl}
          {weg}
        </>
      )}
    </GlasKarte>
  );
}

/** Längste Serie aufeinanderfolgender Lerntage in einer Liste von Tagen. */
function laengsteSerie(tage: string[]): number {
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

/** Lernkalender: Kennzahlen, Monatskalender mit Lerntagen und die letzten 12 Wochen. */
export default function Kalender() {
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
  const { stand } = useStand();
  const { width } = useFenster();
  const heute = tagKey();
  const jetzt = new Date();
  const [monat, setMonat] = useState(() => new Date(jetzt.getFullYear(), jetzt.getMonth(), 1));
  const gruen = f.hell ? "#23A548" : "#4ED053";

  const lerntage = Object.entries(stand.antwortenTage).filter(([, n]) => n > 0).map(([t]) => t);
  const summe = Object.values(stand.antwortenTage).reduce((a, b) => a + b, 0);
  const besteSerie = Math.max(stand.besteSerie, laengsteSerie(lerntage));
  const termin = stand.pruefungstermin ? tagKey(new Date(stand.pruefungstermin)) : null;

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

  function monatWechseln(schritt: number) {
    tippen();
    setMonat(new Date(jahr, m + schritt, 1));
  }

  // Letzte 12 Wochen als kleine Übersicht.
  const start = wochenStart();
  start.setDate(start.getDate() - 7 * (WOCHEN - 1));
  const spalten = Array.from({ length: WOCHEN }, (_, w) =>
    Array.from({ length: 7 }, (_, t) => {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7 + t);
      const key = tagKey(d);
      return { key, n: stand.antwortenTage[key] ?? 0, zukunft: key > heute };
    }),
  );

  // Kalenderfelder: auf dem iPad größer, aber nicht gestreckt.
  const kalenderBreite = Math.min(width - 2 * RAND, 640);
  const feld = Math.min(48, Math.floor((kalenderBreite - 36 - 6 * 6) / 7));

  return (
    <Seite>
      <GlasGrund />
      <GrossKopf titel="Lernkalender" unter="Deine Lerntage auf einen Blick" schliessen />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: 10, paddingBottom: insets.bottom + 24, gap: 14 }} showsVerticalScrollIndicator={false}>
        <SerieKarte serie={serieAktuell(stand)} beste={besteSerie} heuteFragen={stand.antwortenTage[heute] ?? 0} tagesziel={stand.tagesziel} />

        {/* Monatskalender */}
        <GlasKarte style={{ borderRadius: 26, padding: 18, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable onPress={() => monatWechseln(-1)} accessibilityRole="button" accessibilityLabel="Vorheriger Monat" hitSlop={8} style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: f.hell ? "rgba(20,23,27,0.05)" : "rgba(255,255,255,0.07)", opacity: pressed ? 0.6 : 1 })}>
              <CaretLeftIcon size={16} color={f.text} weight="bold" />
            </Pressable>
            <View style={{ alignItems: "center" }}>
              <Text style={{ ...schrift.titel, fontSize: 19, color: f.text }}>
                {MONATE[m]} {jahr}
              </Text>
              <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: f.text3 }}>
                {lerntageMonat} {lerntageMonat === 1 ? "Lerntag" : "Lerntage"} · {fragenMonat} {fragenMonat === 1 ? "Frage" : "Fragen"}
              </Text>
            </View>
            <Pressable
              onPress={() => monatWechseln(1)}
              disabled={istAktuellerMonat}
              accessibilityRole="button"
              accessibilityLabel="Nächster Monat"
              hitSlop={8}
              style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: f.hell ? "rgba(20,23,27,0.05)" : "rgba(255,255,255,0.07)", opacity: istAktuellerMonat ? 0.3 : pressed ? 0.6 : 1 })}
            >
              <CaretRightIcon size={16} color={f.text} weight="bold" />
            </Pressable>
          </View>

          <View style={{ alignSelf: "center", width: feld * 7 + 6 * 6, gap: 6 }}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {TAGE.map((t) => (
                <Text key={t} style={{ width: feld, textAlign: "center", ...schrift.textHalb, fontSize: 11.5, color: f.text3 }}>
                  {t}
                </Text>
              ))}
            </View>
            {wochen.map((woche, w) => (
              <View key={w} style={{ flexDirection: "row", gap: 6 }}>
                {woche.map((key, i) => {
                  if (!key) return <View key={i} style={{ width: feld, height: feld }} />;
                  const n = stand.antwortenTage[key] ?? 0;
                  const zukunft = key > heute;
                  const istHeute = key === heute;
                  const ziel = n >= stand.tagesziel;
                  const pruefung = key === termin;
                  const tag = Number(key.slice(8));
                  const voll = n >= 30;
                  return (
                    <View
                      key={key}
                      accessibilityLabel={`${tag}. ${MONATE[m]}${n > 0 ? `, ${n} Fragen` : ""}${ziel ? ", Tagesziel erreicht" : ""}${pruefung ? ", Prüfungstag" : ""}`}
                      style={[
                        {
                          width: feld,
                          height: feld,
                          borderRadius: feld / 2,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: zukunft ? "transparent" : tagesFarbe(n, f.hell, f.orange),
                          borderWidth: istHeute || pruefung ? 2 : 0,
                          borderColor: pruefung ? gruen : f.text,
                        },
                        ziel && !zukunft ? leuchten(f.orange, f.hell ? 0.35 : 0.6, 8, 0) : null,
                      ]}
                    >
                      <Text style={{ ...(n > 0 || istHeute ? schrift.textFett : schrift.textMittel), fontSize: 14, color: voll ? "#FFFFFF" : zukunft ? f.text3 : f.text, fontVariant: ["tabular-nums"] }}>{tag}</Text>
                      {ziel && !zukunft ? (
                        <View style={{ position: "absolute", top: -3, right: -3, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: f.hell ? "#FFFFFF" : "#0B0D10" }}>
                          <CheckCircleIcon size={15} color={gruen} weight="fill" />
                        </View>
                      ) : null}
                      {pruefung ? (
                        <View style={{ position: "absolute", bottom: -4, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: gruen }}>
                          <FlagCheckeredIcon size={11} color="#FFFFFF" weight="fill" />
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Legende */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", columnGap: 14, rowGap: 8, paddingTop: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text style={{ ...schrift.text, fontSize: 11.5, color: f.text3 }}>weniger</Text>
              {[0, 5, 20, 40].map((n) => (
                <View key={n} style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: tagesFarbe(n, f.hell, f.orange) }} />
              ))}
              <Text style={{ ...schrift.text, fontSize: 11.5, color: f.text3 }}>mehr</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <CheckCircleIcon size={13} color={gruen} weight="fill" />
              <Text style={{ ...schrift.text, fontSize: 11.5, color: f.text3 }}>Tagesziel</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: f.text }} />
              <Text style={{ ...schrift.text, fontSize: 11.5, color: f.text3 }}>Heute</Text>
            </View>
            {termin ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <FlagCheckeredIcon size={13} color={gruen} weight="fill" />
                <Text style={{ ...schrift.text, fontSize: 11.5, color: f.text3 }}>Prüfung</Text>
              </View>
            ) : null}
          </View>
        </GlasKarte>

        {/* Letzte 12 Wochen */}
        <GlasKarte style={{ borderRadius: 26, padding: 18, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
            <Text style={{ ...schrift.titel, fontSize: 17, color: f.text }}>Letzte 12 Wochen</Text>
            <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: f.text3 }}>
              {lerntage.length} Lerntage · {summe} Antworten
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View style={{ justifyContent: "space-between", paddingVertical: 1 }}>
              {TAGE.map((t) => (
                <Text key={t} style={{ ...schrift.textMittel, fontSize: 10.5, lineHeight: 16, color: f.text3 }}>
                  {t}
                </Text>
              ))}
            </View>
            <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between" }}>
              {spalten.map((woche, i) => (
                <View key={i} style={{ gap: 4 }}>
                  {woche.map((tag) => (
                    <View
                      key={tag.key}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: tag.zukunft ? "transparent" : tagesFarbe(tag.n, f.hell, f.orange),
                        borderWidth: tag.key === heute ? 1.5 : 0,
                        borderColor: f.text,
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </GlasKarte>
      </ScrollView>
    </Seite>
  );
}
