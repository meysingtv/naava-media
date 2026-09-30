import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Ring } from "@/components/grafik";
import { Kopfzeile } from "@/components/home";
import { GrossKopf, Seite } from "@/components/seite";
import { kartenFlaeche, KopfTaste, Segment } from "@/components/ui";
import { useDarstellung, useFarbwelt } from "@/lib/darstellung";
import { themaFoto } from "@/lib/fotos";
import { THEMEN, themaVon, type ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { auswertung, fortschritt, lernzeitText, serieAktuell, tagKey, useStand, wochenStart, type Stand, type Zeitraum } from "@/lib/stand";
import { leuchten, RAND, schrift, verlauf } from "@/lib/theme";

/** Diese Bereiche stehen immer da – in der Reihenfolge der Vorlage. */
const HAUPTBEREICHE: ThemaId[] = ["zeichen", "vorfahrt", "gefahren", "umwelt", "technik", "manoever"];

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

type Saeule = { label: string; wert: number };

function tagVerschoben(basis: Date, tage: number): Date {
  const d = new Date(basis);
  d.setDate(d.getDate() + tage);
  return d;
}

/** Beantwortete Fragen als Säulen: Woche = Tage, Monat = Wochen, Gesamt = Monate. */
function aktivitaet(s: Stand, zeitraum: Zeitraum): Saeule[] {
  const antworten = (d: Date) => s.antwortenTage[tagKey(d)] ?? 0;
  if (zeitraum === "woche") {
    const start = wochenStart();
    return ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((label, i) => ({ label, wert: antworten(tagVerschoben(start, i)) }));
  }
  if (zeitraum === "monat") {
    const start = wochenStart();
    return [3, 2, 1, 0].map((zurueck) => {
      const montag = tagVerschoben(start, -7 * zurueck);
      let summe = 0;
      for (let i = 0; i < 7; i++) summe += antworten(tagVerschoben(montag, i));
      return { label: zurueck === 0 ? "Diese" : `−${zurueck} W`, wert: summe };
    });
  }
  const heute = new Date();
  return [5, 4, 3, 2, 1, 0].map((zurueck) => {
    const m = new Date(heute.getFullYear(), heute.getMonth() - zurueck, 1);
    let summe = 0;
    for (const [tag, n] of Object.entries(s.antwortenTage)) {
      const [j, mo] = tag.split("-").map(Number);
      if (j === m.getFullYear() && mo === m.getMonth() + 1) summe += n;
    }
    return { label: MONATE[m.getMonth()], wert: summe };
  });
}

/** Erfolgsquote über einen Tagesbereich (0 = heute). */
function quote(s: Stand, vonTagen: number, bisTagen: number): number | null {
  let r = 0;
  let f = 0;
  for (let i = vonTagen; i < bisTagen; i++) {
    const t = s.themaTage[tagKey(tagVerschoben(new Date(), -i))];
    if (!t) continue;
    for (const [rr, ff] of Object.values(t)) {
      r += rr ?? 0;
      f += ff ?? 0;
    }
  }
  return r + f > 0 ? r / (r + f) : null;
}

function StatKarte({ symbol, wert, label, wertFarbe }: { symbol: React.ReactNode; wert: string; label: string; wertFarbe?: string }) {
  const f = useFarbwelt();
  return (
    <View style={[{ height: 62, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, borderRadius: 20 }, kartenFlaeche(f)]}>
      <View style={{ width: 30, alignItems: "center" }}>{symbol}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...schrift.titelFett, fontSize: 18, lineHeight: 22, color: wertFarbe ?? f.text, fontVariant: ["tabular-nums"] }} numberOfLines={1}>
          {wert}
        </Text>
        <Text style={{ ...schrift.text, fontSize: 13, color: f.text3 }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function Diagramm({ saeulen }: { saeulen: Saeule[] }) {
  const f = useFarbwelt();
  const maxWert = Math.max(...saeulen.map((s) => s.wert), 0);
  const skala = Math.max(50, Math.ceil(maxWert / 25) * 25);
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);
  const markiert = gewaehlt ?? (maxWert > 0 ? saeulen.findIndex((s) => s.wert === maxWert) : -1);
  const HOEHE = 84;

  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 34 }}>
      <View style={{ height: HOEHE, justifyContent: "space-between", paddingBottom: 0 }}>
        {[skala, skala / 2, 0].map((w) => (
          <Text key={w} style={{ ...schrift.text, fontSize: 12, color: f.text3, lineHeight: 14, marginTop: -7 }}>
            {w}
          </Text>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ height: HOEHE, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around" }}>
          {[0, 0.5, 1].map((p) => (
            <View key={p} style={{ position: "absolute", left: 0, right: 0, bottom: p * HOEHE, height: 1, backgroundColor: f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.06)" }} />
          ))}
          {saeulen.map((s, i) => {
            const h = Math.max(s.wert > 0 ? 8 : 3, (s.wert / skala) * HOEHE);
            const aktiv = i === markiert;
            return (
              <Pressable
                key={s.label}
                onPress={() => {
                  tippen();
                  setGewaehlt(i);
                }}
                hitSlop={{ top: 60, bottom: 10, left: 6, right: 6 }}
                style={{ alignItems: "center", justifyContent: "flex-end", height: HOEHE }}
              >
                {aktiv && s.wert > 0 ? (
                  <View style={{ position: "absolute", bottom: h + 10, alignItems: "center", width: 90 }}>
                    <View style={[{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }, f.hell ? { backgroundColor: "#14171B" } : { backgroundColor: "#262D35", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }]}>
                      <Text style={{ ...schrift.textHalb, fontSize: 13, color: "#FFFFFF" }}>
                        {s.wert} {s.wert === 1 ? "Frage" : "Fragen"}
                      </Text>
                    </View>
                    <View style={{ width: 1.5, height: 8, backgroundColor: f.orange }} />
                  </View>
                ) : null}
                <View style={[{ width: 26, height: h, borderRadius: 7, overflow: "hidden", opacity: s.wert > 0 ? 1 : 0.35 }, aktiv ? leuchten(f.orange, f.hell ? 0.4 : 0.8, 10, 0) : null]}>
                  <LinearGradient colors={verlauf.saeule} locations={[0, 0.4, 0.75, 1]} style={{ flex: 1 }} />
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 8 }}>
          {saeulen.map((s) => (
            <Text key={s.label} style={{ ...schrift.textMittel, fontSize: 12.5, color: f.text3, width: 44, textAlign: "center" }} numberOfLines={1}>
              {s.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function MeinFortschritt() {
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
  const { stand } = useStand();
  const [zeitraum, setZeitraum] = useState<Zeitraum>("woche");
  const [alle, setAlle] = useState(false);
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const rot = f.hell ? "#E5392C" : "#FF5A4E";

  const gesamt = fortschritt(stand);
  const daten = auswertung(stand, zeitraum);
  const saeulen = useMemo(() => aktivitaet(stand, zeitraum), [stand, zeitraum]);

  const tage = zeitraum === "woche" ? 7 : zeitraum === "monat" ? 30 : 3650;
  const jetzt = quote(stand, 0, Math.min(tage, 3650));
  const vorher = zeitraum === "gesamt" ? null : quote(stand, tage, tage * 2);
  const trend = jetzt != null && vorher != null ? Math.round((jetzt - vorher) * 100) : null;
  const trendText = trend != null ? `${trend >= 0 ? "+" : "−"}${Math.abs(trend)}%` : jetzt != null ? `${Math.round(jetzt * 100)}%` : "–";
  const trendLabel = trend != null ? (zeitraum === "woche" ? "diese Woche" : "dieser Monat") : "Trefferquote";
  const trendPositiv = trend == null || trend >= 0;

  const quoten = new Map(daten.themen.map((t) => [t.thema, t.quote]));
  const weitere = THEMEN.map((t) => t.id).filter((id) => !HAUPTBEREICHE.includes(id) && (alle || quoten.has(id)));
  const zeilen = [...HAUPTBEREICHE, ...(alle ? weitere : [])].map((thema) => ({ thema, quote: quoten.get(thema) ?? 0 }));

  return (
    <Seite>
      <GrossKopf titel="Mein Fortschritt" unter="Dein Weg zur Prüfung" rechts={<KopfTaste icon="calendar-outline" label="Lernkalender" onPress={() => router.push("/kalender")} />} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 14, paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: RAND }}>
          <Segment<Zeitraum>
            wert={zeitraum}
            onWechsel={setZeitraum}
            optionen={[
              { id: "woche", titel: "Woche" },
              { id: "monat", titel: "Monat" },
              { id: "gesamt", titel: "Gesamt" },
            ]}
          />

          {/* Ring und Kennzahlen */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 22 }}>
            <Ring anteil={gesamt.anteil} groesse={168} dicke={15} spur={f.hell ? "rgba(20,23,27,0.07)" : "#23282E"} verlauf={verlauf.ring} leuchten>
              <Text style={{ ...schrift.titel, fontSize: 40, lineHeight: 46, color: f.text, letterSpacing: -0.8, fontVariant: ["tabular-nums"] }}>{Math.round(gesamt.anteil * 100)}%</Text>
              <Text style={{ ...schrift.text, fontSize: 13.5, lineHeight: 18, color: f.text2, textAlign: "center" }}>
                {gesamt.richtig} von {gesamt.gesamt}
                {"\n"}Fragen sicher
              </Text>
            </Ring>
            <View style={{ flex: 1, gap: 9 }}>
              <StatKarte
                symbol={<Ionicons name={trendPositiv ? "trending-up" : "trending-down"} size={26} color={trendPositiv ? gruen : rot} />}
                wert={trendText}
                wertFarbe={trendPositiv ? gruen : rot}
                label={trendLabel}
              />
              <StatKarte symbol={<Icon name="flame" size={26} color="#FF8A2A" />} wert={String(serieAktuell(stand))} label="Tage in Folge" />
              <StatKarte
                symbol={
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#5AA9F0", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="time-outline" sf="clock" size={18} color="#FFFFFF" weight="semibold" />
                  </View>
                }
                wert={lernzeitText(daten.sekunden)}
                label="Lernzeit"
              />
            </View>
          </View>

          {/* Lernaktivität */}
          <View style={[{ marginTop: 18, padding: 18, paddingBottom: 14, borderRadius: 24 }, kartenFlaeche(f)]}>
            <Text style={{ ...schrift.titel, fontSize: 19, color: f.text }}>Lernaktivität</Text>
            <Text style={{ ...schrift.text, fontSize: 13, color: f.text3, marginTop: 1 }}>Beantwortete Fragen</Text>
            <Diagramm saeulen={saeulen} />
          </View>
        </View>

        {/* Stärken & Schwächen */}
        <Kopfzeile titel="Stärken & Schwächen" link={alle ? "Weniger" : "Mehr anzeigen"} onLink={() => setAlle(!alle)} style={{ marginTop: 30 }} />
        <View style={[{ marginHorizontal: RAND, borderRadius: 24, overflow: "hidden" }, kartenFlaeche(f)]}>
          {zeilen.map((t, i) => {
            const stark = t.quote >= 0.75;
            return (
              <Pressable
                key={t.thema}
                onPress={() => {
                  tippen();
                  router.push({ pathname: "/thema/[id]", params: { id: t.thema } });
                }}
                accessibilityRole="button"
                accessibilityLabel={`${themaVon(t.thema).titel}, ${Math.round(t.quote * 100)} Prozent`}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 13,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: f.linie,
                  backgroundColor: pressed ? (f.hell ? "rgba(20,23,27,0.04)" : "rgba(255,255,255,0.04)") : "transparent",
                })}
              >
                <Image source={themaFoto(t.thema)} style={{ width: 42, height: 42, borderRadius: 13 }} resizeMode="cover" fadeDuration={0} />
                <View style={{ flex: 1, gap: 7 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.text, flexShrink: 1 }} numberOfLines={1}>
                      {themaVon(t.thema).titel}
                    </Text>
                    <Text style={{ ...schrift.titelFett, fontSize: 14, color: stark ? gruen : f.text, fontVariant: ["tabular-nums"] }}>{Math.round(t.quote * 100)}%</Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: f.hell ? "rgba(20,23,27,0.07)" : "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    {stark ? (
                      <View style={{ width: `${t.quote * 100}%`, height: "100%", borderRadius: 3, backgroundColor: gruen }} />
                    ) : (
                      <LinearGradient colors={verlauf.balken} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: `${Math.max(t.quote > 0 ? 3 : 0, t.quote * 100)}%`, height: "100%", borderRadius: 3 }} />
                    )}
                  </View>
                </View>
                <Icon name="chevron-forward" size={15} color={f.text3} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Seite>
  );
}
