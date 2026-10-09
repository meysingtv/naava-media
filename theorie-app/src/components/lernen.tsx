import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { SFSymbol } from "expo-symbols";

import { Glas } from "@/components/glas";
import { GlasKarte } from "@/components/glas-flaeche";
import { Icon, type IconName } from "@/components/icon";
import { KartenStapelBild } from "@/components/karteikarten-karte";
import { Kontrollleuchte } from "@/components/leuchten";
import { Verkehrszeichen } from "@/components/zeichen";
import { useFarbwelt } from "@/lib/darstellung";
import { useFenster } from "@/lib/fenster";
import { FOTOS, themaFoto } from "@/lib/fotos";
import { istZeichen, themaVon, THEMEN, type Frage, type LeuchteKey, type ThemaId, type ZeichenKey } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { leuchten, mitDeckkraft, RAND, schrift, verlauf } from "@/lib/theme";

// Lernen im Kino-Look: oben eine Wand aus allen Themenfotos, die langsam
// vorbeizieht, darauf Suche und Lernstand auf Glas. Darunter die Lernmodi und
// alle Themen als Poster.

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;
/** Fotos füllen die Karte: ohne width/height brächten lokale Bilder ihre eigene Pixelbreite mit und endeten auf breiten Karten (iPad quer) zu früh. */
const FOTO = { ...FUELLEN, width: "100%", height: "100%" } as const;

// ---------------------------------------------------------------------------
// Themenwand
// ---------------------------------------------------------------------------

const KACHEL_B = 148;
const KACHEL_H = 98;
const LUECKE = 10;
const REIHEN = 6;

/** Themenfotos je Reihe versetzt, damit keine zwei Reihen gleich aussehen. */
function reihenFotos(i: number): ThemaId[] {
  const ids = THEMEN.map((t) => t.id);
  const start = (i * 4 + 2) % ids.length;
  return [...ids.slice(start), ...ids.slice(0, start)];
}

/**
 * Kopf mit einer schräg gestellten Wand aus allen Themenfotos. Die Reihen
 * ziehen ganz langsam gegeneinander vorbei; unten läuft die Wand in den Grund aus.
 * Die Höhe ergibt sich aus dem Inhalt – die Wand liegt nur dahinter.
 */
export function Themenwand({ children }: { children?: ReactNode }) {
  const f = useFarbwelt();
  const { width } = useFenster();
  const fahrt = useRef(new Animated.Value(0)).current;
  const strecke = THEMEN.length * (KACHEL_B + LUECKE);
  const wandBreite = width * 1.9;

  useEffect(() => {
    const a = Animated.loop(Animated.timing(fahrt, { toValue: 1, duration: 140000, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [fahrt]);

  const grund = (a: number) => mitDeckkraft(f.grund, a);

  return (
    <View style={{ width, overflow: "hidden", backgroundColor: f.hell ? "#E4DED4" : "#050709" }}>
      <View style={{ position: "absolute", left: (width - wandBreite) / 2, top: -96, width: wandBreite, transform: [{ rotate: "-8deg" }] }}>
        {Array.from({ length: REIHEN }, (_, i) => {
          const nachLinks = i % 2 === 0;
          const x = fahrt.interpolate({ inputRange: [0, 1], outputRange: nachLinks ? [0, -strecke] : [-strecke, 0] });
          const fotos = reihenFotos(i);
          return (
            <Animated.View key={i} style={{ flexDirection: "row", gap: LUECKE, marginBottom: LUECKE, marginLeft: -(i % 3) * 52, transform: [{ translateX: x }] }}>
              {[...fotos, ...fotos].map((id, k) => (
                <Image key={k} source={themaFoto(id)} resizeMode="cover" fadeDuration={0} style={{ width: KACHEL_B, height: KACHEL_H, borderRadius: 14 }} />
              ))}
            </Animated.View>
          );
        })}
      </View>

      {/* Tönung: die Fotos bleiben Stimmung, Schrift und Glas stehen davor */}
      <View style={[FUELLEN, { backgroundColor: f.hell ? "rgba(244,241,236,0.34)" : "rgba(3,5,7,0.5)" }]} />
      <LinearGradient colors={[grund(f.hell ? 0.96 : 0.82), grund(f.hell ? 0.55 : 0.35), grund(0)]} locations={[0, 0.22, 0.42]} style={FUELLEN} />
      <LinearGradient colors={[grund(0), grund(0.6), grund(0.92), f.grund]} locations={[0.56, 0.76, 0.9, 1]} style={[FUELLEN, { bottom: -1 }]} />
      {children}
    </View>
  );
}

/** Suchfeld auf Glas – öffnet die Suche. */
export function SuchPille({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="search"
      accessibilityLabel="Frage oder Thema suchen"
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.985 : 1 }] }, style]}
    >
      <Glas hell={f.hell} style={[{ height: 48, borderRadius: 24, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 }, f.hell ? leuchten("#3C2C18", 0.08, 10, 3) : null]}>
        <Icon name="search" size={18} color={f.hell ? "rgba(20,23,27,0.55)" : "rgba(255,255,255,0.7)"} />
        <Text style={{ ...schrift.textMittel, fontSize: 15.5, color: f.hell ? "rgba(20,23,27,0.5)" : "rgba(255,255,255,0.62)" }}>Frage oder Thema suchen</Text>
      </Glas>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Lernstand auf Glas
// ---------------------------------------------------------------------------

/**
 * Alle Fragen auf einen Blick: sicher, offene Fehler und noch neu – als Zahlen
 * und als geteilter Balken darunter.
 */
export function LernStand({ sicher, fehler, neu, onPress }: { sicher: number; fehler: number; neu: number; onPress: () => void }) {
  const f = useFarbwelt();
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const orange = f.hell ? "#F2540A" : "#FF8A2A";
  const grau = f.hell ? "rgba(20,23,27,0.18)" : "rgba(255,255,255,0.22)";
  const teile = [
    { wert: sicher, farbe: gruen, label: "sicher" },
    { wert: fehler, farbe: orange, label: "Fehler offen" },
    { wert: neu, farbe: grau, label: "noch neu" },
  ];
  const text = f.hell ? "#14171B" : "#FFFFFF";
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${sicher} sicher, ${fehler} Fehler offen, ${neu} noch neu`}
    >
      <Glas hell={f.hell} style={[{ borderRadius: 26, paddingTop: 14, paddingBottom: 16, paddingHorizontal: 16, gap: 13 }, f.hell ? leuchten("#3C2C18", 0.1, 14, 4) : null]}>
        <View style={{ flexDirection: "row" }}>
          {teile.map((t, i) => (
            <View key={t.label} style={{ flex: 1, flexDirection: "row" }}>
              {i > 0 ? <View style={{ width: 1, marginVertical: 3, marginRight: 14, backgroundColor: f.hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.14)" }} /> : null}
              <View style={{ gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.farbe === grau ? (f.hell ? "#A3A9B1" : "rgba(255,255,255,0.5)") : t.farbe }} />
                  <Text style={{ ...schrift.titel, fontSize: 21, lineHeight: 25, color: text, fontVariant: ["tabular-nums"] }}>{t.wert}</Text>
                </View>
                <Text style={{ ...schrift.textMittel, fontSize: 12, color: f.hell ? "rgba(20,23,27,0.6)" : "rgba(255,255,255,0.7)" }} numberOfLines={1}>
                  {t.label}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", height: 7, gap: 3 }}>
          {teile
            .filter((t) => t.wert > 0)
            .map((t) => (
              <View key={t.label} style={{ flex: t.wert, borderRadius: 4, backgroundColor: t.farbe }} />
            ))}
        </View>
      </Glas>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Lernmodi
// ---------------------------------------------------------------------------

function kartenStil(hell: boolean, grund: string, linie: string): ViewStyle {
  return hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.07, 12, 4) } : { backgroundColor: grund, borderWidth: 1, borderColor: linie };
}

/** Große Kachel mit eigenem Bild – für Karteikarten und Schilder-Jagd. */
export function ModusKarte({
  titel,
  unter,
  akzent,
  bild,
  zahl,
  anteil,
  onPress,
  style,
}: {
  titel: string;
  unter: string;
  akzent: string;
  bild: ReactNode;
  zahl?: number;
  /** Stand als Balken unten (0–1). */
  anteil: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${titel}, ${unter}`}
      style={({ pressed }) => [{ flex: 1, height: 168, borderRadius: 26, transform: [{ scale: pressed ? 0.975 : 1 }] }, style]}
    >
      <GlasKarte style={{ flex: 1, borderRadius: 26, padding: 16, justifyContent: "space-between" }}>
        <LinearGradient colors={[mitDeckkraft(akzent, f.hell ? 0.22 : 0.34), mitDeckkraft(akzent, f.hell ? 0.06 : 0.1), mitDeckkraft(akzent, 0)]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={FUELLEN} />
        <View style={{ position: "absolute", top: -60, right: -50, width: 170, height: 170, borderRadius: 85, backgroundColor: mitDeckkraft(akzent, f.hell ? 0.12 : 0.16) }} />
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: f.hell ? mitDeckkraft(akzent, 0.12) : "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" }}>{bild}</View>
          {zahl ? (
            <View style={{ minWidth: 26, height: 26, paddingHorizontal: 8, borderRadius: 13, backgroundColor: f.orange, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ ...schrift.textFett, fontSize: 13, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{zahl > 99 ? "99+" : zahl}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ gap: 3 }}>
          <Text style={{ ...schrift.titelFett, fontSize: 17, color: f.text }} numberOfLines={1}>
            {titel}
          </Text>
          <Text style={{ ...schrift.text, fontSize: 13, color: f.text2 }} numberOfLines={1}>
            {unter}
          </Text>
          <View style={{ height: 5, borderRadius: 3, marginTop: 7, backgroundColor: f.hell ? "rgba(20,23,27,0.08)" : "rgba(255,255,255,0.12)", overflow: "hidden" }}>
            <View style={{ width: `${Math.max(anteil > 0 ? 4 : 0, anteil * 100)}%`, height: "100%", borderRadius: 3, backgroundColor: akzent }} />
          </View>
        </View>
      </GlasKarte>
    </Pressable>
  );
}

/** Schild im Sucherrahmen – wie beim Scannen. */
export function SucherSchild({ zeichen, groesse = 34 }: { zeichen: ZeichenKey; groesse?: number }) {
  const f = useFarbwelt();
  const rahmen = groesse * 1.45;
  const ecke = groesse * 0.34;
  return (
    <View style={{ width: rahmen, height: rahmen, alignItems: "center", justifyContent: "center" }}>
      <Verkehrszeichen zeichen={zeichen} groesse={groesse} />
      {(["ol", "or", "ul", "ur"] as const).map((lage) => (
        <View
          key={lage}
          style={{
            position: "absolute",
            width: ecke,
            height: ecke,
            top: lage[0] === "o" ? 0 : undefined,
            bottom: lage[0] === "u" ? 0 : undefined,
            left: lage[1] === "l" ? 0 : undefined,
            right: lage[1] === "r" ? 0 : undefined,
            borderColor: f.orange,
            borderTopWidth: lage[0] === "o" ? 2 : 0,
            borderBottomWidth: lage[0] === "u" ? 2 : 0,
            borderLeftWidth: lage[1] === "l" ? 2 : 0,
            borderRightWidth: lage[1] === "r" ? 2 : 0,
          }}
        />
      ))}
    </View>
  );
}

/** Stapel Karteikarten als Bild (für die Modus-Karte). */
export function StapelBild() {
  return <KartenStapelBild groesse={40} />;
}

export type Modus = { titel: string; unter: string; akzent: string; icon?: IconName; sf?: SFSymbol; bild?: ReactNode; onPress: () => void };

/**
 * Kachel für einen Lernmodus: Verlauf in der Akzentfarbe, oben rechts ein
 * weiches Leuchten, unten rechts das Symbol groß als Wasserzeichen.
 */
function ModusKachel({ modus }: { modus: Modus }) {
  const f = useFarbwelt();
  const a = modus.akzent;
  return (
    <Pressable
      onPress={() => {
        tippen();
        modus.onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${modus.titel}, ${modus.unter}`}
      style={({ pressed }) => ({ flex: 1, height: 128, borderRadius: 24, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <GlasKarte style={{ flex: 1, borderRadius: 24 }}>
        <LinearGradient colors={[mitDeckkraft(a, f.hell ? 0.2 : 0.3), mitDeckkraft(a, f.hell ? 0.06 : 0.08), mitDeckkraft(a, 0)]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={FUELLEN} />
        <View style={{ position: "absolute", top: -46, right: -36, width: 120, height: 120, borderRadius: 60, backgroundColor: mitDeckkraft(a, f.hell ? 0.12 : 0.16) }} />
        {modus.icon ? (
          <View style={{ position: "absolute", right: -12, bottom: -18, transform: [{ rotate: "-14deg" }] }}>
            <Icon name={modus.icon} sf={modus.sf} size={92} color={mitDeckkraft(a, f.hell ? 0.14 : 0.16)} />
          </View>
        ) : null}
        <View style={{ flex: 1, padding: 14, justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <LinearGradient
              colors={modus.bild ? (f.hell ? ["#FFFFFF", "#F4F1EC"] : ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.06)"]) : [a, mitDeckkraft(a, 0.72)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" }, leuchten(a, f.hell ? 0.25 : 0.45, 10, 3)]}
            >
              {modus.bild ?? (modus.icon ? <Icon name={modus.icon} sf={modus.sf} size={21} color="#FFFFFF" /> : null)}
            </LinearGradient>
            <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.08)" }}>
              <Icon name="chevron-forward" size={14} color={f.text2} />
            </View>
          </View>
          <View style={{ gap: 2 }}>
            <Text style={{ ...schrift.titelFett, fontSize: 16, lineHeight: 20, color: f.text }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {modus.titel}
            </Text>
            <Text style={{ ...schrift.textMittel, fontSize: 12.5, lineHeight: 16, color: f.hell ? f.text2 : "rgba(255,255,255,0.62)" }} numberOfLines={1}>
              {modus.unter}
            </Text>
          </View>
        </View>
      </GlasKarte>
    </Pressable>
  );
}

/** Lernmodi im Raster: zwei nebeneinander, auf dem iPad drei. */
export function ModusRaster({ modi, style }: { modi: Modus[]; style?: StyleProp<ViewStyle> }) {
  const { width } = useFenster();
  const spalten = width >= 700 ? 3 : 2;
  const reihen: Modus[][] = [];
  for (let i = 0; i < modi.length; i += spalten) reihen.push(modi.slice(i, i + spalten));
  return (
    <View style={[{ paddingHorizontal: RAND, gap: 10 }, style]}>
      {reihen.map((reihe) => (
        <View key={reihe[0].titel} style={{ flexDirection: "row", gap: 10 }}>
          {reihe.map((m) => (
            <ModusKachel key={m.titel} modus={m} />
          ))}
          {Array.from({ length: spalten - reihe.length }, (_, i) => (
            <View key={i} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Themen
// ---------------------------------------------------------------------------

export type Stufe = "alle" | "leicht" | "mittel" | "schwer";

export const STUFEN: { id: Stufe; titel: string }[] = [
  { id: "alle", titel: "Alle" },
  { id: "leicht", titel: "Leicht" },
  { id: "mittel", titel: "Mittel" },
  { id: "schwer", titel: "Schwer" },
];

/** Filter nach Schwierigkeit als Pillen. */
export function StufenFilter({ wert, onWechsel, style }: { wert: Stufe; onWechsel: (s: Stufe) => void; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style} contentContainerStyle={{ paddingHorizontal: RAND, gap: 8 }}>
      {STUFEN.map((s) => {
        const aktiv = s.id === wert;
        return (
          <Pressable
            key={s.id}
            onPress={() => {
              if (aktiv) return;
              tippen();
              onWechsel(s.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: aktiv }}
            style={[
              { height: 38, minWidth: 74, borderRadius: 19, overflow: "hidden" },
              aktiv ? leuchten(f.orange, f.hell ? 0.3 : 0.45, 10, 3) : f.hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.06, 6, 2) } : { backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
            ]}
          >
            {aktiv ? (
              <LinearGradient colors={verlauf.chip} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18, borderRadius: 19 }}>
                <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: "#FFFFFF" }}>{s.titel}</Text>
              </LinearGradient>
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 }}>
                <Text style={{ ...schrift.textMittel, fontSize: 14.5, color: f.text }}>{s.titel}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Balken({ anteil, hoehe = 5 }: { anteil: number; hoehe?: number }) {
  return (
    <View style={{ height: hoehe, borderRadius: hoehe / 2, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" }}>
      <LinearGradient colors={verlauf.balken} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: `${Math.max(anteil > 0 ? 4 : 0, anteil * 100)}%`, height: "100%", borderRadius: hoehe / 2 }} />
    </View>
  );
}

/** Breite Fotokarte „Grundstoff“ – alle Fragen gemischt. */
export function GrundstoffKarte({ anzahl, anteil, onPress, style }: { anzahl: number; anteil: number; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Grundstoff, ${anzahl} Fragen, ${Math.round(anteil * 100)} Prozent`}
      style={({ pressed }) => [{ height: 156, borderRadius: 28, transform: [{ scale: pressed ? 0.985 : 1 }] }, f.hell ? leuchten("#3C2C18", 0.12, 14, 5) : null, style]}
    >
      <View style={{ flex: 1, borderRadius: 28, overflow: "hidden" }}>
        <Image source={FOTOS.grundstoff} style={FOTO} resizeMode="cover" fadeDuration={0} />
        <LinearGradient colors={["rgba(3,5,7,0.88)", "rgba(3,5,7,0.55)", "rgba(3,5,7,0.08)"]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={FUELLEN} />
        <View style={{ flex: 1, padding: 18, justifyContent: "space-between" }}>
          <View style={{ gap: 4, maxWidth: "70%" }}>
            <Text style={{ ...schrift.textHalb, fontSize: 12, letterSpacing: 1, color: "#FFB45C" }}>ALLE THEMEN GEMISCHT</Text>
            <Text style={{ ...schrift.titel, fontSize: 25, lineHeight: 30, color: "#FFFFFF" }}>Grundstoff</Text>
            <Text style={{ ...schrift.textMittel, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
              {anzahl} Fragen · {Math.round(anteil * 100)} % sicher
            </Text>
          </View>
          {/* Balken bis kurz vor den Start-Knopf unten rechts */}
          <View style={{ marginRight: 60 }}>
            <Balken anteil={anteil} hoehe={6} />
          </View>
        </View>
        <View style={[{ position: "absolute", right: 16, bottom: 16, width: 50, height: 50, borderRadius: 25, overflow: "hidden" }, leuchten("#FC5B0E", 0.5, 12, 3)]}>
          <LinearGradient colors={verlauf.knopf} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Icon name="play" size={21} color="#FFFFFF" />
          </LinearGradient>
        </View>
      </View>
    </Pressable>
  );
}

export type ThemaPosterDaten = { id: ThemaId; anteil: number; anzahl: number; stufe: Exclude<Stufe, "alle"> };

const STUFE_NAME: Record<Exclude<Stufe, "alle">, string> = { leicht: "Leicht", mittel: "Mittel", schwer: "Schwer" };

/** Ein Thema als Poster: Foto, Symbol, Titel, Stand. */
function ThemaPoster({ thema, breite, onPress }: { thema: ThemaPosterDaten; breite: number; onPress: () => void }) {
  const f = useFarbwelt();
  const t = themaVon(thema.id);
  const prozent = Math.round(thema.anteil * 100);
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${t.titel}, ${thema.anzahl} Fragen, ${prozent} Prozent`}
      style={({ pressed }) => [{ width: breite, height: Math.round(breite * 1.22), borderRadius: 24, transform: [{ scale: pressed ? 0.97 : 1 }] }, f.hell ? leuchten("#3C2C18", 0.12, 12, 5) : null]}
    >
      <View style={{ flex: 1, borderRadius: 24, overflow: "hidden" }}>
        <Image source={themaFoto(thema.id)} style={FOTO} resizeMode="cover" fadeDuration={0} />
        <LinearGradient colors={["rgba(3,5,7,0.22)", "rgba(3,5,7,0)", "rgba(3,5,7,0.92)"]} locations={[0, 0.3, 1]} style={FUELLEN} />
        <View style={{ position: "absolute", top: 11, left: 11, right: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Glas klar style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }}>
            <Icon name={t.icon as IconName} size={17} color="#FFFFFF" />
          </Glas>
          <Glas klar style={{ height: 24, paddingHorizontal: 9, borderRadius: 12, justifyContent: "center" }}>
            <Text style={{ ...schrift.textHalb, fontSize: 11, color: "rgba(255,255,255,0.92)" }}>{STUFE_NAME[thema.stufe]}</Text>
          </Glas>
        </View>
        <View style={{ position: "absolute", left: 13, right: 13, bottom: 13, gap: 7 }}>
          <Text style={{ ...schrift.titelFett, fontSize: 16, lineHeight: 20, color: "#FFFFFF" }} numberOfLines={2}>
            {t.titel}
          </Text>
          <Text style={{ ...schrift.textMittel, fontSize: 12, color: "rgba(255,255,255,0.72)", marginTop: -3 }}>{thema.anzahl} Fragen</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Balken anteil={thema.anteil} />
            </View>
            <Text style={{ ...schrift.textHalb, fontSize: 12, color: prozent >= 90 ? "#7BE07F" : "rgba(255,255,255,0.9)", fontVariant: ["tabular-nums"] }}>{prozent}%</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Themen als Poster in zwei Spalten. */
export function ThemenRaster({ themen, onThema, style }: { themen: ThemaPosterDaten[]; onThema: (id: ThemaId) => void; style?: StyleProp<ViewStyle> }) {
  const { width } = useFenster();
  const breite = Math.floor((width - 2 * RAND - 12) / 2);
  return (
    <View style={[{ paddingHorizontal: RAND, flexDirection: "row", flexWrap: "wrap", gap: 12 }, style]}>
      {themen.map((t) => (
        <ThemaPoster key={t.id} thema={t} breite={breite} onPress={() => onThema(t.id)} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Suche
// ---------------------------------------------------------------------------

/** Suchfeld mit „Abbrechen“ – wie die Suche in iOS-Apps. */
export function SuchLeiste({ wert, onWechsel, onAbbrechen }: { wert: string; onWechsel: (t: string) => void; onAbbrechen: () => void }) {
  const f = useFarbwelt();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: RAND }}>
      <View
        style={[
          { flex: 1, height: 46, borderRadius: 23, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 15 },
          f.hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.07, 10, 3) } : { backgroundColor: f.flaeche2, borderWidth: 1, borderColor: f.linieStark },
        ]}
      >
        <Icon name="search" size={18} color={f.text3} />
        <TextInput
          value={wert}
          onChangeText={onWechsel}
          placeholder="Frage oder Thema suchen"
          placeholderTextColor={f.text3}
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
          selectionColor={f.orange}
          cursorColor={f.orange}
          keyboardAppearance={f.hell ? "light" : "dark"}
          style={{ flex: 1, minWidth: 0, height: "100%", ...schrift.textMittel, fontSize: 16, color: f.text }}
        />
        {wert.length > 0 ? (
          <Pressable onPress={() => onWechsel("")} hitSlop={10} accessibilityLabel="Eingabe löschen">
            <Icon name="close-circle" size={18} color={f.text3} />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={() => {
          tippen();
          onAbbrechen();
        }}
        hitSlop={8}
      >
        <Text style={{ ...schrift.textHalb, fontSize: 16, color: f.orange }}>Abbrechen</Text>
      </Pressable>
    </View>
  );
}

/** Vorschläge, solange noch nichts eingegeben ist. */
export function SuchVorschlaege({ woerter, onWahl }: { woerter: string[]; onWahl: (w: string) => void }) {
  const f = useFarbwelt();
  return (
    <View style={{ paddingHorizontal: RAND, gap: 12 }}>
      <Text style={{ ...schrift.textHalb, fontSize: 13, letterSpacing: 0.6, color: f.text3 }}>OFT GESUCHT</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {woerter.map((w) => (
          <Pressable
            key={w}
            onPress={() => {
              tippen();
              onWahl(w);
            }}
            style={({ pressed }) => [
              { height: 38, paddingHorizontal: 15, borderRadius: 19, flexDirection: "row", alignItems: "center", gap: 7, transform: [{ scale: pressed ? 0.96 : 1 }] },
              f.hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.06, 6, 2) } : { backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
            ]}
          >
            <Icon name="search" size={13} color={f.orange} />
            <Text style={{ ...schrift.textMittel, fontSize: 14.5, color: f.text }}>{w}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Ein Suchtreffer: Zeichen oder Symbol, Frage, Thema und Punkte. */
export function TrefferZeile({ frage, onPress }: { frage: Frage; onPress: () => void }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, opacity: pressed ? 0.85 : 1 }, kartenStil(f.hell, f.flaeche, f.linie)]}
    >
      {frage.bild && istZeichen(frage.bild) ? (
        <Verkehrszeichen zeichen={frage.bild as ZeichenKey} groesse={36} />
      ) : frage.bild?.startsWith("leuchte_") ? (
        <Kontrollleuchte leuchte={frage.bild as LeuchteKey} groesse={36} />
      ) : (
        <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: f.hell ? f.flaeche2 : "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" }}>
          <Icon name={themaVon(frage.thema).icon as IconName} size={17} color={f.orange} />
        </View>
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <Text numberOfLines={2} style={{ ...schrift.textHalb, fontSize: 14.5, lineHeight: 20, color: f.text }}>
          {frage.text}
        </Text>
        <Text style={{ ...schrift.textMittel, fontSize: 12, color: f.text3 }}>
          {themaVon(frage.thema).titel} · {frage.punkte} Punkte
        </Text>
      </View>
      <Icon name="chevron-forward" size={16} color={f.text3} />
    </Pressable>
  );
}

/** Leerer Zustand der Suche. */
export function SuchHinweis({ icon, titel, text }: { icon: IconName; titel: string; text: string }) {
  const f = useFarbwelt();
  return (
    <View style={{ alignItems: "center", gap: 10, paddingVertical: 44, paddingHorizontal: 30 }}>
      <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: f.orangeSoft, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={27} color={f.orange} />
      </View>
      <Text style={{ ...schrift.titelFett, fontSize: 17, color: f.text, textAlign: "center" }}>{titel}</Text>
      <Text style={{ ...schrift.text, fontSize: 14.5, lineHeight: 20, color: f.text2, textAlign: "center" }}>{text}</Text>
    </View>
  );
}
