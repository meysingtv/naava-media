import { useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Abschnitt, Chip, Karte, Knopf, Kopf, T } from "@/components/ui";
import { zahlText } from "@/lib/fragen";
import { abstand, farben, RAND, schrift } from "@/lib/theme";

const TEMPI = [30, 50, 70, 100, 130];
const MAX_ANHALTEWEG = (130 / 10) * 3 + (130 / 10) ** 2; // Maßstab für die Balken

function Balken({ teile, label, gesamt }: { teile: { wert: number; farbe: string }[]; label: string; gesamt: number }) {
  return (
    <View style={{ gap: abstand(2) }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T v="klein">{label}</T>
        <T v="textStark" style={{ fontVariant: ["tabular-nums"] }}>
          {zahlText(Math.round(gesamt * 10) / 10)} m
        </T>
      </View>
      <View style={{ flexDirection: "row", height: 14, borderRadius: 4, backgroundColor: farben.flaeche3, overflow: "hidden" }}>
        {teile.map((t, i) => (
          <View key={i} style={{ width: `${(t.wert / MAX_ANHALTEWEG) * 100}%`, backgroundColor: t.farbe, borderRightWidth: i < teile.length - 1 ? 2 : 0, borderColor: farben.flaeche }} />
        ))}
      </View>
    </View>
  );
}

function Formel({ titel, formel, rechnung, ergebnis }: { titel: string; formel: string; rechnung: string; ergebnis: string }) {
  return (
    <Karte style={{ gap: abstand(2) }}>
      <T v="mini">{titel}</T>
      <T v="h2" farbe={farben.orange} style={{ ...schrift.titel }}>
        {formel}
      </T>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <T v="klein">{rechnung}</T>
        <T v="textStark">{ergebnis}</T>
      </View>
    </Karte>
  );
}

export default function Formeln() {
  const insets = useSafeAreaInsets();
  const [v, setV] = useState(50);
  const z = v / 10;
  const reaktion = z * 3;
  const bremsweg = z * z;
  const gefahr = bremsweg / 2;

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <Kopf titel="Formeln" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(8), gap: abstand(6) }}>
        <View style={{ gap: abstand(2) }}>
          <T v="titel">Wie lang ist der Weg bis zum Stillstand?</T>
          <T v="text">Wähl eine Geschwindigkeit – die Balken zeigen die Faustformeln im Vergleich.</T>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: abstand(2) }}>
          {TEMPI.map((t) => (
            <Chip key={t} text={`${t} km/h`} aktiv={t === v} onPress={() => setV(t)} />
          ))}
        </View>

        <Karte style={{ gap: abstand(5) }}>
          <View>
            <T v="mini">Anhalteweg bei {v} km/h</T>
            <T v="zahl" style={{ fontSize: 40, lineHeight: 46 }}>
              {zahlText(reaktion + bremsweg)} m
            </T>
          </View>
          <Balken
            label="Normale Bremsung"
            gesamt={reaktion + bremsweg}
            teile={[
              { wert: reaktion, farbe: farben.blau },
              { wert: bremsweg, farbe: farben.orange },
            ]}
          />
          <Balken
            label="Gefahrenbremsung"
            gesamt={reaktion + gefahr}
            teile={[
              { wert: reaktion, farbe: farben.blau },
              { wert: gefahr, farbe: farben.gelb },
            ]}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: abstand(4), rowGap: abstand(2) }}>
            {[
              { f: farben.blau, t: "Reaktionsweg" },
              { f: farben.orange, t: "Bremsweg" },
              { f: farben.gelb, t: "Gefahrenbremsung" },
            ].map((l) => (
              <View key={l.t} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: l.f }} />
                <T v="klein" style={{ fontSize: 12 }}>
                  {l.t}
                </T>
              </View>
            ))}
          </View>
        </Karte>

        <View style={{ gap: abstand(3) }}>
          <Abschnitt titel="Die Faustformeln" style={{ marginBottom: 0 }} />
          <Formel titel="Reaktionsweg" formel="(v ÷ 10) × 3" rechnung={`(${v} ÷ 10) × 3`} ergebnis={`${zahlText(reaktion)} m`} />
          <Formel titel="Bremsweg (normal)" formel="(v ÷ 10)²" rechnung={`(${v} ÷ 10) × (${v} ÷ 10)`} ergebnis={`${zahlText(bremsweg)} m`} />
          <Formel titel="Bremsweg (Gefahrenbremsung)" formel="(v ÷ 10)² ÷ 2" rechnung={`${zahlText(bremsweg)} ÷ 2`} ergebnis={`${zahlText(gefahr)} m`} />
          <Formel titel="Anhalteweg" formel="Reaktionsweg + Bremsweg" rechnung={`${zahlText(reaktion)} + ${zahlText(bremsweg)}`} ergebnis={`${zahlText(reaktion + bremsweg)} m`} />
          <Formel titel="Sicherheitsabstand außerorts" formel="halber Tacho" rechnung={`${v} ÷ 2`} ergebnis={`${zahlText(v / 2)} m`} />
        </View>

        <Knopf titel="Zahlenfragen üben" icon="arrow-forward" onPress={() => router.push({ pathname: "/training", params: { modus: "zahl" } })} />
      </ScrollView>
    </View>
  );
}
