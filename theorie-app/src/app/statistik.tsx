import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarbellIcon } from "phosphor-react-native/src/icons/Barbell";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { CheckCircleIcon } from "phosphor-react-native/src/icons/CheckCircle";
import { ClockIcon } from "phosphor-react-native/src/icons/Clock";
import { FlagCheckeredIcon } from "phosphor-react-native/src/icons/FlagCheckered";
import { FlameIcon } from "phosphor-react-native/src/icons/Flame";
import { TargetIcon } from "phosphor-react-native/src/icons/Target";
import { TrendDownIcon } from "phosphor-react-native/src/icons/TrendDown";
import { TrendUpIcon } from "phosphor-react-native/src/icons/TrendUp";
import type { Icon as PhosphorIcon } from "phosphor-react-native";

import { Kopfzeile } from "@/components/home";
import { GlasGrund, GlasKarte } from "@/components/glas-flaeche";
import { GrossKopf, Seite } from "@/components/seite";
import { KopfTaste, Segment } from "@/components/ui";
import { useFenster } from "@/lib/fenster";
import { useDarstellung, useFarbwelt } from "@/lib/darstellung";
import { themaFoto } from "@/lib/fotos";
import { THEMEN, themaVon, type ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { auswertung, fortschritt, lernzeitText, serieAktuell, tagKey, useStand, wochenStart, type Stand, type Zeitraum } from "@/lib/stand";
import { leuchten, mitDeckkraft, RAND, schrift, verlauf } from "@/lib/theme";

/** Ab diesem Anteil sicherer Fragen gilt man als prüfungsreif. */
const REIF = 0.9;

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

/** Kleine Kennzahl: Icon im getönten Kreis, Zahl, Label. */
function Kennzahl({ symbol: S, farbe, wert, label, wertFarbe }: { symbol: PhosphorIcon; farbe: string; wert: string; label: string; wertFarbe?: string }) {
  const f = useFarbwelt();
  return (
    <GlasKarte style={{ flex: 1, padding: 13, gap: 10, borderRadius: 20 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: mitDeckkraft(farbe, f.hell ? 0.1 : 0.15) }}>
        <S size={19} color={farbe} weight="fill" />
      </View>
      <View>
        <Text style={{ ...schrift.titel, fontSize: 20, lineHeight: 24, color: wertFarbe ?? f.text, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {wert}
        </Text>
        <Text style={{ ...schrift.textMittel, fontSize: 12, color: f.text3 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {label}
        </Text>
      </View>
    </GlasKarte>
  );
}

/** Große Karte oben: wie weit bis zur Prüfungsreife (90 % sicher). */
function PruefungsreifeKarte({ anteil, richtig, gesamt, tagesziel }: { anteil: number; richtig: number; gesamt: number; tagesziel: number }) {
  const f = useFarbwelt();
  const prozent = Math.round(anteil * 100);
  const reif = anteil >= REIF;
  const fehlen = Math.max(0, Math.ceil(REIF * gesamt) - richtig);
  const lerntage = fehlen > 0 ? Math.max(1, Math.ceil(fehlen / Math.max(1, tagesziel))) : 0;
  const gruen = f.hell ? "#23A548" : "#4ED053";
  return (
    <GlasKarte style={{ borderRadius: 26 }}>
      <View style={{ padding: 18, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ gap: 3, flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <FlagCheckeredIcon size={16} color={reif ? gruen : f.orange} weight="fill" />
              <Text style={{ ...schrift.textHalb, fontSize: 13, letterSpacing: 0.4, color: reif ? gruen : f.orange }}>PRÜFUNGSREIFE</Text>
            </View>
            <Text style={{ ...schrift.titel, fontSize: 21, lineHeight: 26, color: f.text }}>{reif ? "Du bist prüfungsreif!" : `Noch ${Math.round(REIF * 100) - prozent} % bis prüfungsreif`}</Text>
            <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: f.text2 }}>
              {richtig} von {gesamt} Fragen sicher
            </Text>
          </View>
          <Text style={{ ...schrift.titel, fontSize: 44, lineHeight: 50, letterSpacing: -1, color: reif ? gruen : f.text, fontVariant: ["tabular-nums"] }}>
            {prozent}
            <Text style={{ fontSize: 22, color: f.text2 }}>%</Text>
          </Text>
        </View>
        {/* Balken mit Ziel-Marke bei 90 % */}
        <View style={{ paddingTop: 14 }}>
          <View style={{ height: 12, borderRadius: 6, backgroundColor: f.hell ? "rgba(20,23,27,0.07)" : "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <LinearGradient
              colors={reif ? ["#7BE07F", "#3FBF4A"] : verlauf.balken}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ width: `${Math.max(anteil > 0 ? 2 : 0, prozent)}%`, height: "100%", borderRadius: 6 }}
            />
          </View>
          <View style={{ position: "absolute", left: `${REIF * 100}%`, top: 0, bottom: -4, alignItems: "center", transform: [{ translateX: -1 }] }}>
            <Text style={{ ...schrift.textHalb, fontSize: 10.5, color: f.text3, position: "absolute", top: -2, width: 40, textAlign: "center", left: -20 }}>Ziel</Text>
            <View style={{ width: 2, height: 22, marginTop: 10, borderRadius: 1, backgroundColor: f.text }} />
          </View>
        </View>
        {fehlen > 0 ? (
          <Text style={{ ...schrift.text, fontSize: 13, color: f.text3 }}>
            Noch {fehlen} {fehlen === 1 ? "Frage" : "Fragen"} sicher beantworten – mit deinem Tagesziel etwa {lerntage} {lerntage === 1 ? "Lerntag" : "Lerntage"}.
          </Text>
        ) : (
          <Text style={{ ...schrift.text, fontSize: 13, color: f.text3 }}>Mach eine Prüfungssimulation, um es zu bestätigen.</Text>
        )}
      </View>
    </GlasKarte>
  );
}

type Ampel = "sitzt" | "fast" | "ueben";
const AMPEL: Record<Ampel, { titel: string; farbe: string; symbol: PhosphorIcon; text: string }> = {
  sitzt: { titel: "Sitzt", farbe: "#4ED053", symbol: CheckCircleIcon, text: "75 % und mehr richtig" },
  fast: { titel: "Fast", farbe: "#FFB400", symbol: TargetIcon, text: "Noch etwas Übung" },
  ueben: { titel: "Üben", farbe: "#FF4A3D", symbol: BarbellIcon, text: "Hier lohnt sich Training" },
};

function ampelVon(quote: number): Ampel {
  return quote >= 0.75 ? "sitzt" : quote >= 0.4 ? "fast" : "ueben";
}

/** Ein Thema als weiche Zeile: Foto, Titel, Balken in Ampelfarbe, Prozent. */
function ThemaZeile({ thema, quote, geuebt }: { thema: ThemaId; quote: number; geuebt: boolean }) {
  const f = useFarbwelt();
  const farbe = AMPEL[ampelVon(quote)].farbe;
  return (
    <Pressable
      onPress={() => {
        tippen();
        router.push({ pathname: "/thema/[id]", params: { id: thema } });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${themaVon(thema).titel}, ${geuebt ? `${Math.round(quote * 100)} Prozent` : "noch nicht geübt"}`}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      <GlasKarte style={{ flexDirection: "row", alignItems: "center", gap: 13, padding: 10, paddingRight: 14, borderRadius: 20 }}>
      <Image source={themaFoto(thema)} style={{ width: 46, height: 46, borderRadius: 14 }} resizeMode="cover" fadeDuration={0} />
      <View style={{ flex: 1, gap: 7 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text, flexShrink: 1 }} numberOfLines={1}>
            {themaVon(thema).titel}
          </Text>
          <Text style={{ ...schrift.titelFett, fontSize: 14, color: geuebt ? farbe : f.text3, fontVariant: ["tabular-nums"] }}>{geuebt ? `${Math.round(quote * 100)} %` : "neu"}</Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: f.hell ? "rgba(20,23,27,0.07)" : "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <View style={{ width: `${Math.max(geuebt && quote > 0 ? 3 : 0, quote * 100)}%`, height: "100%", borderRadius: 3, backgroundColor: farbe }} />
        </View>
      </View>
      <CaretRightIcon size={15} color={f.text3} weight="bold" />
      </GlasKarte>
    </Pressable>
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
            {Math.round(w)}
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
  const { width } = useFenster();
  const [zeitraum, setZeitraum] = useState<Zeitraum>("woche");
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const rot = f.hell ? "#E5392C" : "#FF5A4E";

  const gesamt = fortschritt(stand);
  const daten = auswertung(stand, zeitraum);
  const saeulen = useMemo(() => aktivitaet(stand, zeitraum), [stand, zeitraum]);

  const tage = zeitraum === "woche" ? 7 : zeitraum === "monat" ? 30 : 3650;
  const jetzt = quote(stand, 0, Math.min(tage, 3650));
  const vorher = zeitraum === "gesamt" ? null : quote(stand, tage, tage * 2);
  const trend = jetzt != null && vorher != null ? Math.round((jetzt - vorher) * 100) : null;
  const trendText = trend != null ? `${trend >= 0 ? "+" : "−"}${Math.abs(trend)} %` : jetzt != null ? `${Math.round(jetzt * 100)} %` : "–";
  const trendLabel = trend != null ? (zeitraum === "woche" ? "zur Vorwoche" : "zum Vormonat") : "Trefferquote";
  const trendPositiv = trend == null || trend >= 0;

  // Themen nach Ampel: sitzt, fast, üben – nicht geübte Themen zählen zu „Üben“.
  const quoten = new Map(daten.themen.map((t) => [t.thema, t.quote]));
  const gruppen: Record<Ampel, { thema: ThemaId; quote: number; geuebt: boolean }[]> = { sitzt: [], fast: [], ueben: [] };
  for (const t of THEMEN) {
    const q = quoten.get(t.id);
    gruppen[q == null ? "ueben" : ampelVon(q)].push({ thema: t.id, quote: q ?? 0, geuebt: q != null });
  }
  (Object.keys(gruppen) as Ampel[]).forEach((k) => gruppen[k].sort((a, b) => b.quote - a.quote));
  const [offen, setOffen] = useState<Ampel>("ueben");
  const zweiSpalten = width >= 700;

  return (
    <Seite>
      <GlasGrund />
      <GrossKopf titel="Mein Fortschritt" rechts={<KopfTaste icon="calendar-outline" label="Lernkalender" onPress={() => router.push("/kalender")} />} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 10, paddingBottom: insets.bottom + 28, paddingHorizontal: RAND, gap: 14 }} showsVerticalScrollIndicator={false}>
        <PruefungsreifeKarte anteil={gesamt.anteil} richtig={gesamt.richtig} gesamt={gesamt.gesamt} tagesziel={stand.tagesziel} />

        <Segment<Zeitraum>
          wert={zeitraum}
          onWechsel={setZeitraum}
          optionen={[
            { id: "woche", titel: "Woche" },
            { id: "monat", titel: "Monat" },
            { id: "gesamt", titel: "Gesamt" },
          ]}
        />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Kennzahl symbol={FlameIcon} farbe="#FC6F14" wert={String(serieAktuell(stand))} label={serieAktuell(stand) === 1 ? "Tag in Folge" : "Tage in Folge"} />
          <Kennzahl symbol={ClockIcon} farbe="#4DA3FF" wert={lernzeitText(daten.sekunden)} label="Lernzeit" />
          <Kennzahl symbol={trendPositiv ? TrendUpIcon : TrendDownIcon} farbe={trendPositiv ? gruen : rot} wert={trendText} wertFarbe={trendPositiv ? gruen : rot} label={trendLabel} />
        </View>

        <GlasKarte style={{ padding: 18, paddingBottom: 14, borderRadius: 24 }}>
          <Text style={{ ...schrift.titel, fontSize: 19, color: f.text }}>Lernaktivität</Text>
          <Text style={{ ...schrift.text, fontSize: 13, color: f.text3, marginTop: 1 }}>Beantwortete Fragen</Text>
          <Diagramm saeulen={saeulen} />
        </GlasKarte>

        {/* Themen nach Ampel */}
        <Kopfzeile titel="Deine Themen" style={{ marginTop: 16, marginHorizontal: -RAND }} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(Object.keys(AMPEL) as Ampel[]).map((k) => {
            const a = AMPEL[k];
            const aktiv = offen === k;
            const S = a.symbol;
            return (
              <Pressable
                key={k}
                onPress={() => {
                  tippen();
                  setOffen(k);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: aktiv }}
                accessibilityLabel={`${a.titel}, ${gruppen[k].length} Themen`}
                style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
              >
                <GlasKarte toenung={aktiv ? mitDeckkraft(a.farbe, f.hell ? 0.22 : 0.3) : undefined} style={{ paddingVertical: 12, paddingHorizontal: 12, borderRadius: 18, gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <S size={20} color={a.farbe} weight="fill" />
                  <Text style={{ ...schrift.titel, fontSize: 20, color: f.text, fontVariant: ["tabular-nums"] }}>{gruppen[k].length}</Text>
                </View>
                <Text style={{ ...schrift.textHalb, fontSize: 14, color: aktiv ? (f.hell ? f.text : "#FFFFFF") : f.text }}>{a.titel}</Text>
                </GlasKarte>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ ...schrift.text, fontSize: 13, color: f.text3, marginTop: -4 }}>{AMPEL[offen].text}</Text>
        {gruppen[offen].length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {gruppen[offen].map((t) => (
              <View key={t.thema} style={{ width: zweiSpalten ? "49.4%" : "100%", flexGrow: 1 }}>
                <ThemaZeile thema={t.thema} quote={t.quote} geuebt={t.geuebt} />
              </View>
            ))}
          </View>
        ) : (
          <GlasKarte style={{ padding: 18, borderRadius: 20, alignItems: "center" }}>
            <Text style={{ ...schrift.textMittel, fontSize: 14, color: f.text3, textAlign: "center" }}>{offen === "sitzt" ? "Noch kein Thema sitzt – bleib dran!" : "Hier ist gerade nichts."}</Text>
          </GlasKarte>
        )}
      </ScrollView>
    </Seite>
  );
}
