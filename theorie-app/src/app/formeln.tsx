import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { Icon } from "@/components/icon";
import { LilaLeisteSeite } from "@/components/lila-leiste";
import { LilaFigurBlase, LilaKarte, LilaKnopf, LilaKopf, LILA_RAND, LilaTitel, LilaZurueck, lilaSchrift, useLila } from "@/components/lila-teile";

import { FormelnWeb } from "@/components/web/formeln-web";
import { useDesktop } from "@/lib/fenster";
import { zahlText } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { FRAGEN_AKTIV } from "@/lib/funktionen";

const TEMPI = [30, 50, 70, 100, 130];
const MAX_ANHALTEWEG = (130 / 10) * 3 + (130 / 10) ** 2; // Maßstab für die Balken

/** Faustformeln zum Ausprobieren: Tempo wählen, Wege vergleichen. Am PC eine eigene Fassung. */
export default function Formeln() {
  return useDesktop() ? <FormelnWeb /> : <FormelnHandy />;
}

/** Eine Faustformel als Karte: Titel, Formel, Rechnung mit Ergebnis. */
function FormelLila({ titel, formel, rechnung, ergebnis }: { titel: string; formel: string; rechnung: string; ergebnis: string }) {
  const l = useLila();
  return (
    <LilaKarte>
      <View style={{ padding: 16, gap: 8 }}>
        <Text style={{ ...lilaSchrift.textHalb, fontSize: 14, color: l.tinte2 }}>{titel}</Text>
        <Text style={{ ...lilaSchrift.titel, fontSize: 26, lineHeight: 29, color: l.tinte }}>{formel}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: l.linie }}>
          <Text style={{ ...lilaSchrift.textMittel, fontSize: 14, color: l.tinte3, flexShrink: 1, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {rechnung}
          </Text>
          <View style={{ height: 30, paddingHorizontal: 12, borderRadius: 10, justifyContent: "center", backgroundColor: l.lilaZart }}>
            <Text style={{ ...lilaSchrift.fett, fontSize: 17, color: l.lila, fontVariant: ["tabular-nums"] }}>{ergebnis}</Text>
          </View>
        </View>
      </View>
    </LilaKarte>
  );
}

/** Formeln im lila Design: Tempo wählen, Anhalteweg groß, Bremsarten im Vergleich, Faustformeln. */
function FormelnHandy() {
  const insets = useSafeAreaInsets();
  const l = useLila();
  const [v, setV] = useState(50);
  const z = v / 10;
  const reaktion = z * 3;
  const bremsweg = z * z;
  const gefahr = bremsweg / 2;
  const anhalteweg = reaktion + bremsweg;
  const blau = "#5AA9F5";
  const balken = (wert: number, farbe: string) => <View style={{ width: `${(wert / MAX_ANHALTEWEG) * 100}%`, height: "100%", borderRadius: 6, backgroundColor: farbe }} />;

  return (
    <View style={{ flex: 1, backgroundColor: l.grund }}>
      <StatusBar style={l.hell ? "dark" : "light"} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 20, paddingHorizontal: LILA_RAND, width: "100%", maxWidth: 560, alignSelf: "center" }} showsVerticalScrollIndicator={false}>
        <LilaZurueck />
        <LilaTitel style={{ marginTop: 14 }}>Formeln</LilaTitel>
        <LilaFigurBlase text="Berechne wichtige Werte für die Prüfung!" style={{ marginTop: 6 }} />

        <LilaKopf titel="Geschwindigkeit wählen" style={{ marginTop: 16 }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {TEMPI.map((t) => {
            const an = t === v;
            return (
              <Pressable
                key={t}
                onPress={() => {
                  tippen();
                  setV(t);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: an }}
                accessibilityLabel={`${t} Kilometer pro Stunde`}
                style={({ pressed }) => ({ width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: an ? "#8C7AE6" : l.karte, borderWidth: 1.5, borderBottomWidth: 4, borderColor: an ? "#8C7AE6" : l.linie, borderBottomColor: an ? l.lilaKante : l.kante, transform: [{ translateY: pressed ? 2 : 0 }] })}
              >
                <Text style={{ ...lilaSchrift.titel, fontSize: t >= 100 ? 21 : 23, color: an ? "#FFFFFF" : l.tinte, fontVariant: ["tabular-nums"] }}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Anhalteweg */}
        <LilaKarte style={{ marginTop: 16 }}>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: l.lilaZart, alignItems: "center", justifyContent: "center" }}>
                <Icon name="car" size={24} color={l.lila} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...lilaSchrift.titel, fontSize: 23, color: l.tinte }}>Anhalteweg</Text>
                <Text style={{ ...lilaSchrift.textMittel, fontSize: 13.5, color: l.tinte2 }}>bei {v} km/h, normale Bremsung</Text>
              </View>
            </View>
            <Text style={{ ...lilaSchrift.titel, fontSize: 58, lineHeight: 62, color: l.tinte, textAlign: "center", marginTop: 8, fontVariant: ["tabular-nums"] }}>{zahlText(anhalteweg)} m</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginTop: 6 }}>
              <View style={{ alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: blau }} />
                  <Text style={{ ...lilaSchrift.textMittel, fontSize: 13.5, color: l.tinte2 }}>Reaktionsweg</Text>
                </View>
                <Text style={{ ...lilaSchrift.titel, fontSize: 26, color: l.tinte }}>{zahlText(reaktion)} m</Text>
              </View>
              <Icon name="add" size={22} color={l.lila} />
              <View style={{ alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: "#8C7AE6" }} />
                  <Text style={{ ...lilaSchrift.textMittel, fontSize: 13.5, color: l.tinte2 }}>Bremsweg</Text>
                </View>
                <Text style={{ ...lilaSchrift.titel, fontSize: 26, color: l.tinte }}>{zahlText(bremsweg)} m</Text>
              </View>
            </View>
          </View>
        </LilaKarte>

        {/* Bremsarten im Vergleich */}
        <LilaKarte style={{ marginTop: 10 }}>
          <View style={{ padding: 16, gap: 14 }}>
            {[
              { titel: "Normale Bremsung", gesamt: anhalteweg, teile: [balken(reaktion, blau), balken(bremsweg, "#8C7AE6")] },
              { titel: "Gefahrenbremsung", gesamt: reaktion + gefahr, teile: [balken(reaktion, blau), balken(gefahr, "#B4A8F4")] },
            ].map((b) => (
              <View key={b.titel} style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ ...lilaSchrift.fett, fontSize: 18, color: l.tinte }}>{b.titel}</Text>
                  <Text style={{ ...lilaSchrift.titel, fontSize: 19, color: l.tinte, fontVariant: ["tabular-nums"] }}>{zahlText(Math.round(b.gesamt * 10) / 10)} m</Text>
                </View>
                <View style={{ height: 12, borderRadius: 6, backgroundColor: l.spur, flexDirection: "row", gap: 3, overflow: "hidden" }}>{b.teile}</View>
              </View>
            ))}
          </View>
        </LilaKarte>

        <LilaKopf titel="Die Faustformeln" style={{ marginTop: 24 }} />
        <View style={{ gap: 10 }}>
          <FormelLila titel="Reaktionsweg" formel="(v ÷ 10) × 3" rechnung={`(${v} ÷ 10) × 3`} ergebnis={`${zahlText(reaktion)} m`} />
          <FormelLila titel="Bremsweg (normal)" formel="(v ÷ 10)²" rechnung={`(${v} ÷ 10) × (${v} ÷ 10)`} ergebnis={`${zahlText(bremsweg)} m`} />
          <FormelLila titel="Bremsweg (Gefahrenbremsung)" formel="(v ÷ 10)² ÷ 2" rechnung={`${zahlText(bremsweg)} ÷ 2`} ergebnis={`${zahlText(gefahr)} m`} />
          <FormelLila titel="Anhalteweg" formel="Reaktionsweg + Bremsweg" rechnung={`${zahlText(reaktion)} + ${zahlText(bremsweg)}`} ergebnis={`${zahlText(anhalteweg)} m`} />
          <FormelLila titel="Sicherheitsabstand außerorts" formel="halber Tacho" rechnung={`${v} ÷ 2`} ergebnis={`${zahlText(v / 2)} m`} />
        </View>
        {FRAGEN_AKTIV ? <LilaKnopf titel="Zahlenfragen üben" icon="arrow-forward" onPress={() => router.push({ pathname: "/training", params: { modus: "zahl" } })} style={{ marginTop: 20 }} /> : null}
      </ScrollView>
      <LilaLeisteSeite aktiv="lernen" />
    </View>
  );
}
