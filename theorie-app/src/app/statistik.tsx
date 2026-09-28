import { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { KategorieMini } from "@/components/foto";
import { Ring } from "@/components/grafik";
import { KopfTaste, Segment, kopfOben, zurueck } from "@/components/ui";
import { THEMEN, themaVon, type ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { auswertung, fortschritt, lernzeitText, serieAktuell, tagKey, useStand, wochenStart, type Stand, type Zeitraum } from "@/lib/stand";
import { farben, quoteFarbe, schrift, verlauf } from "@/lib/theme";

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

function StatKarte({ symbol, wert, label, wertFarbe = "#FFFFFF" }: { symbol: React.ReactNode; wert: string; label: string; wertFarbe?: string }) {
  return (
    <View
      style={{
        height: 62,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 14,
        borderRadius: 16,
        backgroundColor: farben.flaeche,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.09)",
      }}
    >
      <View style={{ width: 30, alignItems: "center" }}>{symbol}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...schrift.titelFett, fontSize: 18, lineHeight: 22, color: wertFarbe }} numberOfLines={1}>
          {wert}
        </Text>
        <Text style={{ ...schrift.text, fontSize: 13, color: "#D3D7DC" }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

function Diagramm({ saeulen }: { saeulen: Saeule[] }) {
  const maxWert = Math.max(...saeulen.map((s) => s.wert), 0);
  const skala = Math.max(50, Math.ceil(maxWert / 25) * 25);
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);
  const markiert = gewaehlt ?? (maxWert > 0 ? saeulen.findIndex((s) => s.wert === maxWert) : -1);
  const HOEHE = 72;

  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 28 }}>
      <View style={{ height: HOEHE, justifyContent: "space-between", paddingBottom: 0 }}>
        {[skala, skala / 2, 0].map((w) => (
          <Text key={w} style={{ ...schrift.text, fontSize: 12, color: "#8F959D", lineHeight: 14, marginTop: -7 }}>
            {w}
          </Text>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ height: HOEHE, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around" }}>
          {[0, 0.5, 1].map((p) => (
            <View key={p} style={{ position: "absolute", left: 0, right: 0, bottom: p * HOEHE, height: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
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
                    <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: "#262D35", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
                      <Text style={{ ...schrift.textMittel, fontSize: 13, color: "#FFFFFF" }}>
                        {s.wert} {s.wert === 1 ? "Frage" : "Fragen"}
                      </Text>
                    </View>
                    <View style={{ width: 1.5, height: 8, backgroundColor: farben.orange }} />
                  </View>
                ) : null}
                <View
                  style={{
                    width: 24,
                    height: h,
                    borderRadius: 6,
                    overflow: "hidden",
                    opacity: s.wert > 0 ? 1 : 0.35,
                    ...(aktiv ? { shadowColor: farben.orange, shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } } : null),
                  }}
                >
                  <LinearGradient colors={verlauf.saeule} locations={[0, 0.4, 0.75, 1]} style={{ flex: 1 }} />
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 8 }}>
          {saeulen.map((s) => (
            <Text key={s.label} style={{ ...schrift.text, fontSize: 13, color: "#AEB3BA", width: 44, textAlign: "center" }} numberOfLines={1}>
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
  const { stand } = useStand();
  const [zeitraum, setZeitraum] = useState<Zeitraum>("woche");
  const [alle, setAlle] = useState(false);

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
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <View style={{ paddingTop: kopfOben(insets.top), paddingHorizontal: 8, paddingBottom: 4 }}>
        <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View pointerEvents="none" style={{ position: "absolute", left: 56, right: 56, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ ...schrift.titelFett, fontSize: 20, color: "#FFFFFF" }}>Mein Fortschritt</Text>
          </View>
          <KopfTaste icon="arrow-back" label="Zurück" onPress={zurueck} />
          <Pressable
            onPress={() => {
              tippen();
              router.push("/kalender");
            }}
            accessibilityLabel="Lernkalender"
            hitSlop={10}
            style={({ pressed }) => ({ width: 40, height: 40, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
          >
            <Icon name="calendar-outline" sf="calendar" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20 }}>
          <View>
            <Ring anteil={gesamt.anteil} groesse={172} dicke={16} spur="#23282E" verlauf={verlauf.ring} leuchten>
              <Text style={{ ...schrift.titel, fontSize: 40, lineHeight: 46, color: "#FFFFFF", letterSpacing: -0.8, fontVariant: ["tabular-nums"] }}>
                {Math.round(gesamt.anteil * 100)}%
              </Text>
              <Text style={{ ...schrift.text, fontSize: 14, lineHeight: 19, color: "#D3D7DC", textAlign: "center" }}>
                {gesamt.richtig} von {gesamt.gesamt}
                {"\n"}Fragen
              </Text>
            </Ring>
          </View>
          <View style={{ flex: 1, gap: 9 }}>
            <StatKarte
              symbol={<Ionicons name={trendPositiv ? "trending-up" : "trending-down"} size={28} color={trendPositiv ? farben.gruen : farben.rot} />}
              wert={trendText}
              wertFarbe={trendPositiv ? farben.gruen : farben.rot}
              label={trendLabel}
            />
            <StatKarte symbol={<Icon name="flame" size={28} color={farben.flamme} />} wert={String(serieAktuell(stand))} label="Tage in Folge" />
            <StatKarte
              symbol={
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#5AA9F0", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="time-outline" sf="clock" size={20} color="#FFFFFF" weight="semibold" />
                </View>
              }
              wert={lernzeitText(daten.sekunden)}
              label="Lernzeit"
            />
          </View>
        </View>

        {/* Lernaktivität */}
        <View style={{ marginTop: 18, padding: 16, paddingBottom: 12, borderRadius: 18, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ ...schrift.titelFett, fontSize: 20, color: "#FFFFFF" }}>Lernaktivität</Text>
          <Diagramm saeulen={saeulen} />
        </View>

        {/* Stärken & Schwächen */}
        <View style={{ marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ ...schrift.titelFett, fontSize: 20, color: "#FFFFFF" }}>Stärken & Schwächen</Text>
          <Pressable
            onPress={() => {
              tippen();
              setAlle(!alle);
            }}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
          >
            <Text style={{ ...schrift.text, fontSize: 14, color: "#C9CDD2" }}>{alle ? "Weniger" : "Mehr anzeigen"}</Text>
            <Icon name={alle ? "chevron-up" : "chevron-forward"} sf={alle ? "chevron.up" : "chevron.right"} size={14} color="#C9CDD2" />
          </Pressable>
        </View>
        <View style={{ marginTop: 12, gap: 9 }}>
          {zeilen.map((t) => (
            <Pressable
              key={t.thema}
              onPress={() => {
                tippen();
                router.push({ pathname: "/thema/[id]", params: { id: t.thema } });
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              <View style={{ width: 28, alignItems: "center" }}>
                <KategorieMini id={t.thema} />
              </View>
              <Text style={{ ...schrift.text, fontSize: 14.5, color: "#E6E8EB", width: "38%" }} numberOfLines={1}>
                {themaVon(t.thema).titel}
              </Text>
              <View style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: "#1E242B", overflow: "hidden" }}>
                <View style={{ width: `${t.quote * 100}%`, height: "100%", borderRadius: 6, backgroundColor: quoteFarbe(t.quote) }} />
              </View>
              <Text style={{ ...schrift.textMittel, fontSize: 15, color: "#FFFFFF", width: 42, textAlign: "right", fontVariant: ["tabular-nums"] }}>
                {Math.round(t.quote * 100)}%
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
