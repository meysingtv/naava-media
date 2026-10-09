import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowsHorizontalIcon } from "phosphor-react-native/src/icons/ArrowsHorizontal";
import { GaugeIcon } from "phosphor-react-native/src/icons/Gauge";
import { HandPalmIcon } from "phosphor-react-native/src/icons/HandPalm";
import { RulerIcon } from "phosphor-react-native/src/icons/Ruler";
import { TimerIcon } from "phosphor-react-native/src/icons/Timer";
import { WarningIcon } from "phosphor-react-native/src/icons/Warning";
import type { Icon as PhosphorIcon } from "phosphor-react-native";

import { AktionsLeiste, HauptKnopf } from "@/components/frage-rahmen";
import { Kopfzeile } from "@/components/home";
import { GlasGrund, GlasKarte } from "@/components/glas-flaeche";
import { GrossKopf, Seite } from "@/components/seite";
import { useFarbwelt } from "@/lib/darstellung";
import { useFenster } from "@/lib/fenster";
import { zahlText } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { farben, leuchten, mitDeckkraft, RAND, schrift, verlauf } from "@/lib/theme";

const TEMPI = [30, 50, 70, 100, 130];
const MAX_ANHALTEWEG = (130 / 10) * 3 + (130 / 10) ** 2; // Maßstab für die Balken

const BLAU = farben.blau;
const ORANGE = farben.orange;
const GELB = farben.gelb;

/** Massives Icon im zart getönten Kreis. */
function IconKreis({ symbol: S, farbe, groesse = 40 }: { symbol: PhosphorIcon; farbe: string; groesse?: number }) {
  const f = useFarbwelt();
  return (
    <View style={{ width: groesse, height: groesse, borderRadius: groesse / 2, alignItems: "center", justifyContent: "center", backgroundColor: mitDeckkraft(farbe, f.hell ? 0.1 : 0.15) }}>
      <S size={Math.round(groesse * 0.5)} color={farbe} weight="fill" />
    </View>
  );
}

/** Tempo-Wahl als echte Tempo-Schilder: weißer Kreis, roter Rand, schwarze Zahl. Das gewählte ist groß und leuchtet. */
function TempoWahl({ wert, onWahl }: { wert: number; onWahl: (v: number) => void }) {
  const f = useFarbwelt();
  return (
    <GlasKarte style={{ borderRadius: 30, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingVertical: 14, paddingHorizontal: 8 }}>
      {TEMPI.map((t) => {
        const aktiv = t === wert;
        const d = aktiv ? 62 : 48;
        return (
          <Pressable
            key={t}
            onPress={() => {
              if (aktiv) return;
              tippen();
              onWahl(t);
            }}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityState={{ selected: aktiv }}
            accessibilityLabel={`${t} Kilometer pro Stunde`}
            style={({ pressed }) => ({ alignItems: "center", gap: 6, opacity: aktiv ? 1 : f.hell ? 0.75 : 0.6, transform: [{ scale: pressed ? 0.92 : 1 }] })}
          >
            <View
              style={[
                { width: d, height: d, borderRadius: d / 2, backgroundColor: "#FFFFFF", borderWidth: aktiv ? 6 : 5, borderColor: "#D7261E", alignItems: "center", justifyContent: "center" },
                aktiv ? leuchten("#D7261E", f.hell ? 0.35 : 0.6, 14, 2) : null,
              ]}
            >
              <Text style={{ ...schrift.titel, fontSize: aktiv ? (t >= 100 ? 21 : 24) : t >= 100 ? 15 : 17, color: "#111111", letterSpacing: -0.5, fontVariant: ["tabular-nums"] }}>{t}</Text>
            </View>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: aktiv ? ORANGE : "transparent" }} />
          </Pressable>
        );
      })}
    </GlasKarte>
  );
}

/** Weg als Balken aus Teilstücken (Reaktion, Bremsen) – mit kleinem Abstand zwischen den Stücken. */
function Strecke({ teile, label, gesamt }: { teile: { wert: number; farbe: string }[]; label: string; gesamt: number }) {
  const f = useFarbwelt();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={{ ...schrift.textHalb, fontSize: 14, color: f.text2 }}>{label}</Text>
        <Text style={{ ...schrift.titel, fontSize: 18, color: f.text, fontVariant: ["tabular-nums"] }}>{zahlText(Math.round(gesamt * 10) / 10)} m</Text>
      </View>
      <View style={{ height: 14, borderRadius: 7, backgroundColor: f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.07)", flexDirection: "row", gap: 3, overflow: "hidden" }}>
        {teile.map((t, i) => (
          <View key={i} style={{ width: `${(t.wert / MAX_ANHALTEWEG) * 100}%`, borderRadius: 7, backgroundColor: t.farbe }} />
        ))}
      </View>
    </View>
  );
}

function Wert({ farbe, label, wert }: { farbe: string; label: string; wert: string }) {
  const f = useFarbwelt();
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: farbe }} />
        <Text style={{ ...schrift.textMittel, fontSize: 12, color: f.text3 }} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={{ ...schrift.titel, fontSize: 19, lineHeight: 23, color: f.text, fontVariant: ["tabular-nums"] }}>{wert}</Text>
    </View>
  );
}

/** Eine Faustformel: Icon, Titel, Formel groß, darunter die Rechnung mit dem Ergebnis. */
function Formel({ symbol, farbe, titel, formel, rechnung, ergebnis }: { symbol: PhosphorIcon; farbe: string; titel: string; formel: string; rechnung: string; ergebnis: string }) {
  const f = useFarbwelt();
  return (
    <GlasKarte style={{ padding: 16, gap: 12, borderRadius: 22 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconKreis symbol={symbol} farbe={farbe} />
        <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text, flex: 1 }} numberOfLines={2}>
          {titel}
        </Text>
      </View>
      <Text style={{ ...schrift.titel, fontSize: 22, lineHeight: 28, color: f.text }}>{formel}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.07)" }}>
        <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: f.text3, flexShrink: 1, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {rechnung}
        </Text>
        <View style={{ height: 30, paddingHorizontal: 12, borderRadius: 15, justifyContent: "center", backgroundColor: mitDeckkraft(farbe, f.hell ? 0.12 : 0.16) }}>
          <Text style={{ ...schrift.titelFett, fontSize: 15, color: f.hell && farbe === GELB ? "#B37E00" : farbe, fontVariant: ["tabular-nums"] }}>{ergebnis}</Text>
        </View>
      </View>
    </GlasKarte>
  );
}

/** Zwei Spalten auf dem iPad, sonst untereinander. */
function Raster({ spalten, children }: { spalten: number; children: ReactNode[] }) {
  const reihen: ReactNode[][] = [];
  for (let i = 0; i < children.length; i += spalten) reihen.push(children.slice(i, i + spalten));
  return (
    <View style={{ gap: 10 }}>
      {reihen.map((reihe, r) => (
        <View key={r} style={{ flexDirection: "row", gap: 10 }}>
          {reihe.map((k, i) => (
            <View key={i} style={{ flex: 1 }}>
              {k}
            </View>
          ))}
          {Array.from({ length: spalten - reihe.length }, (_, i) => (
            <View key={`leer-${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Faustformeln zum Ausprobieren: Tempo wählen, Wege vergleichen. */
export default function Formeln() {
  const insets = useSafeAreaInsets();
  const f = useFarbwelt();
  const { width } = useFenster();
  const [v, setV] = useState(50);
  const z = v / 10;
  const reaktion = z * 3;
  const bremsweg = z * z;
  const gefahr = bremsweg / 2;
  const anhalteweg = reaktion + bremsweg;

  return (
    <Seite>
      <GlasGrund />
      <GrossKopf titel="Formeln" unter="Wie lang ist der Weg bis zum Stillstand?" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: 10, paddingBottom: 24, gap: 14 }} showsVerticalScrollIndicator={false}>
        <TempoWahl wert={v} onWahl={setV} />

        {/* Ergebnis: Anhalteweg groß, darunter die beiden Bremsarten im Vergleich */}
        <GlasKarte style={{ borderRadius: 26 }}>
          <View style={{ padding: 18, gap: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <IconKreis symbol={GaugeIcon} farbe={ORANGE} groesse={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...schrift.textHalb, fontSize: 13, letterSpacing: 0.4, color: f.orange }}>ANHALTEWEG</Text>
                <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: f.text2 }}>bei {v} km/h, normale Bremsung</Text>
              </View>
            </View>
            <Text style={{ ...schrift.titel, fontSize: 54, lineHeight: 60, letterSpacing: -1, color: f.text, fontVariant: ["tabular-nums"] }}>
              {zahlText(anhalteweg)}
              <Text style={{ fontSize: 24, color: f.text2 }}> m</Text>
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Wert farbe={BLAU} label="Reaktionsweg" wert={`${zahlText(reaktion)} m`} />
              <Wert farbe={ORANGE} label="Bremsweg" wert={`${zahlText(bremsweg)} m`} />
              <Wert farbe={GELB} label="Gefahrenbremsung" wert={`${zahlText(gefahr)} m`} />
            </View>
            <View style={{ gap: 16 }}>
              <Strecke
                label="Normale Bremsung"
                gesamt={anhalteweg}
                teile={[
                  { wert: reaktion, farbe: BLAU },
                  { wert: bremsweg, farbe: ORANGE },
                ]}
              />
              <Strecke
                label="Gefahrenbremsung"
                gesamt={reaktion + gefahr}
                teile={[
                  { wert: reaktion, farbe: BLAU },
                  { wert: gefahr, farbe: GELB },
                ]}
              />
            </View>
          </View>
        </GlasKarte>

        <Kopfzeile titel="Die Faustformeln" style={{ marginTop: 16, marginHorizontal: -RAND }} />
        <Raster spalten={width >= 700 ? 2 : 1}>
          {[
            <Formel key="reaktion" symbol={TimerIcon} farbe={BLAU} titel="Reaktionsweg" formel="(v ÷ 10) × 3" rechnung={`(${v} ÷ 10) × 3`} ergebnis={`${zahlText(reaktion)} m`} />,
            <Formel key="brems" symbol={HandPalmIcon} farbe={ORANGE} titel="Bremsweg (normal)" formel="(v ÷ 10)²" rechnung={`(${v} ÷ 10) × (${v} ÷ 10)`} ergebnis={`${zahlText(bremsweg)} m`} />,
            <Formel key="gefahr" symbol={WarningIcon} farbe={GELB} titel="Bremsweg (Gefahrenbremsung)" formel="(v ÷ 10)² ÷ 2" rechnung={`${zahlText(bremsweg)} ÷ 2`} ergebnis={`${zahlText(gefahr)} m`} />,
            <Formel key="anhalte" symbol={RulerIcon} farbe="#A66BFF" titel="Anhalteweg" formel="Reaktionsweg + Bremsweg" rechnung={`${zahlText(reaktion)} + ${zahlText(bremsweg)}`} ergebnis={`${zahlText(anhalteweg)} m`} />,
            <Formel key="abstand" symbol={ArrowsHorizontalIcon} farbe={farben.gruen} titel="Sicherheitsabstand außerorts" formel="halber Tacho" rechnung={`${v} ÷ 2`} ergebnis={`${zahlText(v / 2)} m`} />,
          ]}
        </Raster>
      </ScrollView>

      <AktionsLeiste unten={insets.bottom}>
        <HauptKnopf titel="Zahlenfragen üben" icon="arrow-forward" onPress={() => router.push({ pathname: "/training", params: { modus: "zahl" } })} style={{ flex: 1 }} />
      </AktionsLeiste>
    </Seite>
  );
}
