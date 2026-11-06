import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { type IconName } from "@/components/icon";
import { Abschnitt, B, Chip, Kachel, Knopf, n, Raster, Spalte, Symbol, TOENE, UnterKopf, type Ton, type Zustand } from "@/components/web/bunt";
import { useTasten } from "@/components/web/frage-web";
import { TastenKappe } from "@/components/web/karteikarten-web";
import { WebSeite } from "@/components/web/rahmen";
import { zahlText } from "@/lib/fragen";
import { FRAGEN_AKTIV } from "@/lib/funktionen";

// Formeln am PC: links das Tempo als echte Schilder und der Anhalteweg groß
// mit beiden Bremsarten als Balken, rechts alle Tempi im Vergleich, darunter
// die Faustformeln mit der Rechnung zum gewählten Tempo.
// Pfeiltasten wechseln das Tempo.

const TEMPI = [30, 50, 70, 100, 130];
const MAX_ANHALTEWEG = (130 / 10) * 3 + (130 / 10) ** 2;

const T_REAKTION = TOENE.blau;
const T_BREMS = TOENE.orange;
const T_GEFAHR = TOENE.gelb;

function wege(v: number) {
  const z = v / 10;
  const reaktion = z * 3;
  const bremsweg = z * z;
  const gefahr = bremsweg / 2;
  return { reaktion, bremsweg, gefahr, anhalteweg: reaktion + bremsweg };
}

const meter = (x: number) => `${zahlText(Math.round(x * 10) / 10)} m`;

/** Tempo als Schild: weißer Kreis, roter Rand, schwarze Zahl. */
function TempoSchild({ wert, aktiv, onPress }: { wert: number; aktiv: boolean; onPress: () => void }) {
  const d = aktiv ? 76 : 58;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: aktiv }}
      accessibilityLabel={`${wert} Kilometer pro Stunde`}
      style={(z: Zustand) => ({
        width: 84,
        height: 96,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: aktiv ? 1 : z.hovered ? 0.95 : 0.7,
      })}
    >
      <View
        style={{
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: "#FFFFFF",
          borderWidth: aktiv ? 7 : 6,
          borderColor: "#D7261E",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            ...n.schwarz,
            fontSize: aktiv ? (wert >= 100 ? 24 : 28) : wert >= 100 ? 18 : 21,
            color: "#111111",
            fontVariant: ["tabular-nums"],
          }}
        >
          {wert}
        </Text>
      </View>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: aktiv ? B.orange : "transparent",
        }}
      />
    </Pressable>
  );
}

function Strecke({ titel, teile, gesamt }: { titel: string; teile: { wert: number; ton: Ton }[]; gesamt: number }) {
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ ...n.fett, fontSize: 14.5, color: B.text2 }}>{titel}</Text>
        <Text
          style={{
            ...n.schwarz,
            fontSize: 18,
            color: B.text,
            fontVariant: ["tabular-nums"],
          }}
        >
          {meter(gesamt)}
        </Text>
      </View>
      <View
        style={{
          height: 14,
          borderRadius: 7,
          backgroundColor: B.ton,
          flexDirection: "row",
          gap: 3,
          overflow: "hidden",
        }}
      >
        {teile.map((t, i) => (
          <View
            key={i}
            style={{
              width: `${(t.wert / MAX_ANHALTEWEG) * 100}%`,
              borderRadius: 7,
              backgroundColor: t.ton.farbe,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function Teilwert({ ton, titel, wert }: { ton: Ton; titel: string; wert: string }) {
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        <View
          style={{
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: ton.farbe,
          }}
        />
        <Text numberOfLines={1} style={{ ...n.halb, fontSize: 13.5, color: B.text3 }}>
          {titel}
        </Text>
      </View>
      <Text
        style={{
          ...n.schwarz,
          fontSize: 21,
          color: B.text,
          fontVariant: ["tabular-nums"],
        }}
      >
        {wert}
      </Text>
    </View>
  );
}

function FormelKachel({ icon, ton, titel, formel, rechnung, ergebnis }: { icon: IconName; ton: Ton; titel: string; formel: string; rechnung: string; ergebnis: string }) {
  return (
    <Kachel style={{ padding: 20, gap: 16, height: 196 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Symbol icon={icon} ton={ton} groesse={40} />
        <Text numberOfLines={2} style={{ flex: 1, ...n.fett, fontSize: 15.5, color: B.text }}>
          {titel}
        </Text>
      </View>
      <Text
        numberOfLines={2}
        style={{
          ...n.schwarz,
          fontSize: formel.length > 16 ? 20 : 24,
          lineHeight: 30,
          color: B.text,
        }}
      >
        {formel}
      </Text>
      <View style={{ flex: 1 }} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          paddingTop: 12,
          borderTopWidth: 1.5,
          borderTopColor: B.ton,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flexShrink: 1,
            ...n.halb,
            fontSize: 14,
            color: B.text3,
            fontVariant: ["tabular-nums"],
          }}
        >
          {rechnung}
        </Text>
        <Chip text={ergebnis} ton={ton} />
      </View>
    </Kachel>
  );
}

export function FormelnWeb() {
  const [v, setV] = useState(50);
  const w = wege(v);

  useTasten((e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = TEMPI.indexOf(v) + (e.key === "ArrowRight" ? 1 : -1);
    if (i >= 0 && i < TEMPI.length) setV(TEMPI[i]);
  });

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf
          titel="Formeln"
          unter="Wie lang ist der Weg bis zum Stillstand?"
          rechts={
            FRAGEN_AKTIV ? (
              <Knopf
                titel="Zahlenfragen üben"
                icon="play"
                onPress={() =>
                  router.push({
                    pathname: "/training",
                    params: { modus: "zahl" },
                  })
                }
              />
            ) : undefined
          }
        />

        <View style={{ flexDirection: "row", gap: 20, flexWrap: "wrap" }}>
          <Kachel style={{ flex: 3, minWidth: 460, padding: 28, gap: 26 }}>
            <View style={{ gap: 6 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ ...n.fett, fontSize: 14.5, color: B.text3 }}>Tempo wählen</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <TastenKappe text="←" />
                  <TastenKappe text="→" />
                </View>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {TEMPI.map((t) => (
                  <TempoSchild key={t} wert={t} aktiv={t === v} onPress={() => setV(t)} />
                ))}
              </View>
            </View>

            <View
              style={{
                gap: 4,
                paddingTop: 22,
                borderTopWidth: 1.5,
                borderTopColor: B.ton,
              }}
            >
              <Text style={{ ...n.fett, fontSize: 14.5, color: B.text3 }}>Anhalteweg bei {v} km/h · normale Bremsung</Text>
              <Text
                style={{
                  ...n.schwarz,
                  fontSize: 56,
                  lineHeight: 64,
                  color: B.text,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {zahlText(w.anhalteweg)}
                <Text style={{ fontSize: 26, color: B.text3 }}> m</Text>
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 16 }}>
              <Teilwert ton={T_REAKTION} titel="Reaktionsweg" wert={meter(w.reaktion)} />
              <Teilwert ton={T_BREMS} titel="Bremsweg" wert={meter(w.bremsweg)} />
              <Teilwert ton={T_GEFAHR} titel="Gefahrenbremsung" wert={meter(w.gefahr)} />
            </View>

            <View style={{ gap: 18 }}>
              <Strecke
                titel="Normale Bremsung"
                gesamt={w.anhalteweg}
                teile={[
                  { wert: w.reaktion, ton: T_REAKTION },
                  { wert: w.bremsweg, ton: T_BREMS },
                ]}
              />
              <Strecke
                titel="Gefahrenbremsung"
                gesamt={w.reaktion + w.gefahr}
                teile={[
                  { wert: w.reaktion, ton: T_REAKTION },
                  { wert: w.gefahr, ton: T_GEFAHR },
                ]}
              />
            </View>
          </Kachel>

          <Kachel style={{ flex: 2, minWidth: 340, paddingVertical: 22, gap: 6 }}>
            <View style={{ paddingHorizontal: 24, gap: 2, marginBottom: 8 }}>
              <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>Alle Tempi im Vergleich</Text>
              <Text style={{ ...n.halb, fontSize: 14, color: B.text2 }}>Doppelt so schnell heißt: vierfacher Bremsweg.</Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                paddingHorizontal: 24,
                paddingVertical: 8,
              }}
            >
              {["km/h", "Reaktion", "Bremsweg", "Anhalteweg"].map((k, i) => (
                <Text
                  key={k}
                  style={{
                    flex: i === 0 ? 0.8 : 1,
                    textAlign: i === 0 ? "left" : "right",
                    ...n.fett,
                    fontSize: 13,
                    color: B.text3,
                  }}
                >
                  {k}
                </Text>
              ))}
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              {TEMPI.map((t) => {
                const x = wege(t);
                const aktiv = t === v;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setV(t)}
                    style={(z: Zustand) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      marginHorizontal: 12,
                      paddingHorizontal: 12,
                      flex: 1,
                      minHeight: 46,
                      maxHeight: 66,
                      borderRadius: 12,
                      backgroundColor: aktiv ? B.ton : z.hovered ? B.hover : "transparent",
                    })}
                  >
                    <Text
                      style={{
                        flex: 0.8,
                        ...n.schwarz,
                        fontSize: 15.5,
                        color: B.text,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {t}
                    </Text>
                    <Text
                      style={{
                        flex: 1,
                        textAlign: "right",
                        ...n.halb,
                        fontSize: 15,
                        color: B.text2,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {meter(x.reaktion)}
                    </Text>
                    <Text
                      style={{
                        flex: 1,
                        textAlign: "right",
                        ...n.halb,
                        fontSize: 15,
                        color: B.text2,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {meter(x.bremsweg)}
                    </Text>
                    <Text
                      style={{
                        flex: 1,
                        textAlign: "right",
                        ...n.schwarz,
                        fontSize: 15.5,
                        color: aktiv ? B.orangeKante : B.text,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {meter(x.anhalteweg)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Kachel>
        </View>

        <View>
          <Abschnitt titel="Die Faustformeln" link={`gerechnet mit ${v} km/h`} />
          <Raster min={300} abstand={16}>
            <FormelKachel icon="timer" ton={T_REAKTION} titel="Reaktionsweg" formel="(v ÷ 10) × 3" rechnung={`(${v} ÷ 10) × 3`} ergebnis={meter(w.reaktion)} />
            <FormelKachel icon="hand-left" ton={T_BREMS} titel="Bremsweg (normal)" formel="(v ÷ 10)²" rechnung={`(${v} ÷ 10) × (${v} ÷ 10)`} ergebnis={meter(w.bremsweg)} />
            <FormelKachel icon="warning" ton={T_GEFAHR} titel="Bremsweg (Gefahrenbremsung)" formel="(v ÷ 10)² ÷ 2" rechnung={`${zahlText(w.bremsweg)} ÷ 2`} ergebnis={meter(w.gefahr)} />
            <FormelKachel icon="flag" ton={TOENE.lila} titel="Anhalteweg" formel="Reaktionsweg + Bremsweg" rechnung={`${zahlText(w.reaktion)} + ${zahlText(w.bremsweg)}`} ergebnis={meter(w.anhalteweg)} />
            <FormelKachel icon="swap-horizontal" ton={TOENE.gruen} titel="Sicherheitsabstand außerorts" formel="halber Tacho" rechnung={`${v} ÷ 2`} ergebnis={meter(v / 2)} />
          </Raster>
        </View>
      </Spalte>
    </WebSeite>
  );
}
