import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AktionsLeiste, HauptKnopf } from "@/components/frage-rahmen";
import { Kopfzeile } from "@/components/home";
import { FotoKopf, Seite } from "@/components/seite";
import { Chip, Karte, T } from "@/components/ui";
import { useDarstellung } from "@/lib/darstellung";
import { FOTOS } from "@/lib/fotos";
import { zahlText } from "@/lib/fragen";
import { farben, RAND, schrift } from "@/lib/theme";

const TEMPI = [30, 50, 70, 100, 130];
const MAX_ANHALTEWEG = (130 / 10) * 3 + (130 / 10) ** 2; // Maßstab für die Balken

function Balken({ teile, label, gesamt }: { teile: { wert: number; farbe: string }[]; label: string; gesamt: number }) {
  const { farbwelt: f } = useDarstellung();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <T v="klein">{label}</T>
        <T v="textStark" style={{ fontVariant: ["tabular-nums"] }}>
          {zahlText(Math.round(gesamt * 10) / 10)} m
        </T>
      </View>
      <View style={{ flexDirection: "row", height: 14, borderRadius: 7, backgroundColor: f.hell ? "rgba(20,23,27,0.07)" : farben.flaeche3, overflow: "hidden" }}>
        {teile.map((t, i) => (
          <View key={i} style={{ width: `${(t.wert / MAX_ANHALTEWEG) * 100}%`, backgroundColor: t.farbe, borderRightWidth: i < teile.length - 1 ? 2 : 0, borderColor: f.hell ? "#FFFFFF" : f.flaeche }} />
        ))}
      </View>
    </View>
  );
}

function Formel({ titel, formel, rechnung, ergebnis }: { titel: string; formel: string; rechnung: string; ergebnis: string }) {
  const { farbwelt: f } = useDarstellung();
  return (
    <Karte style={{ gap: 8 }}>
      <T v="mini">{titel}</T>
      <Text style={{ ...schrift.titel, fontSize: 20, lineHeight: 25, color: f.orange }}>{formel}</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <T v="klein">{rechnung}</T>
        <T v="textStark" style={{ fontVariant: ["tabular-nums"] }}>
          {ergebnis}
        </T>
      </View>
    </Karte>
  );
}

/** Faustformeln zum Ausprobieren: Tempo wählen, Wege vergleichen. */
export default function Formeln() {
  const insets = useSafeAreaInsets();
  const [v, setV] = useState(50);
  const z = v / 10;
  const reaktion = z * 3;
  const bremsweg = z * z;
  const gefahr = bremsweg / 2;

  return (
    <Seite>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <FotoKopf bild={FOTOS.zahlen} hoehe={230} titel="Formeln" unter="Wie lang ist der Weg bis zum Stillstand?" />

        <View style={{ paddingHorizontal: RAND, marginTop: 8, gap: 16 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {TEMPI.map((t) => (
              <Chip key={t} text={`${t} km/h`} aktiv={t === v} onPress={() => setV(t)} />
            ))}
          </View>

          <Karte style={{ gap: 20, padding: 18 }}>
            <View>
              <T v="mini">Anhalteweg bei {v} km/h</T>
              <T v="zahl" style={{ fontSize: 44, lineHeight: 50 }}>
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
            <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 8 }}>
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
        </View>

        <Kopfzeile titel="Die Faustformeln" style={{ marginTop: 30 }} />
        <View style={{ paddingHorizontal: RAND, gap: 10 }}>
          <Formel titel="Reaktionsweg" formel="(v ÷ 10) × 3" rechnung={`(${v} ÷ 10) × 3`} ergebnis={`${zahlText(reaktion)} m`} />
          <Formel titel="Bremsweg (normal)" formel="(v ÷ 10)²" rechnung={`(${v} ÷ 10) × (${v} ÷ 10)`} ergebnis={`${zahlText(bremsweg)} m`} />
          <Formel titel="Bremsweg (Gefahrenbremsung)" formel="(v ÷ 10)² ÷ 2" rechnung={`${zahlText(bremsweg)} ÷ 2`} ergebnis={`${zahlText(gefahr)} m`} />
          <Formel titel="Anhalteweg" formel="Reaktionsweg + Bremsweg" rechnung={`${zahlText(reaktion)} + ${zahlText(bremsweg)}`} ergebnis={`${zahlText(reaktion + bremsweg)} m`} />
          <Formel titel="Sicherheitsabstand außerorts" formel="halber Tacho" rechnung={`${v} ÷ 2`} ergebnis={`${zahlText(v / 2)} m`} />
        </View>
      </ScrollView>

      <AktionsLeiste unten={insets.bottom}>
        <HauptKnopf titel="Zahlenfragen üben" icon="arrow-forward" onPress={() => router.push({ pathname: "/training", params: { modus: "zahl" } })} style={{ flex: 1 }} />
      </AktionsLeiste>
    </Seite>
  );
}
