import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, Text, View, useWindowDimensions, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";

import { Glas } from "@/components/glas";
import { Ring } from "@/components/grafik";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/ui";
import { useFarbwelt } from "@/lib/darstellung";
import { FOTOS, themaFoto } from "@/lib/fotos";
import { themaVon, type ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { handschrift, leuchten, RAND, schrift, verlauf } from "@/lib/theme";

// Startseite im Kino-Look: großes Foto, das mit der Tageszeit wechselt und sich
// langsam bewegt, darauf Begrüßung, Handschrift und die wichtigsten Werte auf
// Glas. Darunter Fotokarten statt Kästen.

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

/** „#RRGGBB“ mit Deckkraft als rgba(). */
function mitAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------------------------------------------------------------------------
// Titelbild
// ---------------------------------------------------------------------------

export type Tageszeit = "morgen" | "tag" | "abend" | "nacht";

export function tageszeit(stunde: number): Tageszeit {
  if (stunde >= 5 && stunde < 11) return "morgen";
  if (stunde >= 11 && stunde < 17) return "tag";
  if (stunde >= 17 && stunde < 22) return "abend";
  return "nacht";
}

export const GRUSS: Record<Tageszeit, string> = {
  morgen: "Guten Morgen",
  tag: "Hallo",
  abend: "Guten Abend",
  nacht: "Noch wach?",
};

const HELD_FOTO: Record<Tageszeit, ImageSourcePropType> = {
  morgen: FOTOS.heldMorgen,
  tag: FOTOS.heldTag,
  abend: FOTOS.heldAbend,
  nacht: FOTOS.heldNacht,
};

/** Seitenverhältnis der Titelfotos (1179 × 1680). */
const HELD_VERHAELTNIS = 1680 / 1179;

export function heldHoehe(breite: number): number {
  return Math.round(breite * HELD_VERHAELTNIS);
}

/**
 * Foto über die ganze Breite, fährt ganz langsam heran (wie eine Kamerafahrt) und läuft unten in den Grund aus.
 * Ohne eigenes Bild das Foto zur Tageszeit.
 */
export function KinoHeld({
  zeit = "tag",
  bild,
  hoehe: vorgabe,
  ausblendenAb,
  abdunkeln = true,
  children,
}: {
  zeit?: Tageszeit;
  bild?: ImageSourcePropType;
  hoehe?: number;
  /** Ab welcher Höhe (Anteil) das Foto in den Grund übergeht. */
  ausblendenAb?: number;
  /** Oben und links abdunkeln, damit weiße Schrift trägt (bei hellen Grafiken aus). */
  abdunkeln?: boolean;
  children?: ReactNode;
}) {
  const f = useFarbwelt();
  const { width } = useWindowDimensions();
  const hoehe = vorgabe ?? heldHoehe(width);
  const fahrt = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(fahrt, { toValue: 1, duration: 18000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(fahrt, { toValue: 0, duration: 18000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [fahrt]);

  const scale = fahrt.interpolate({ inputRange: [0, 1], outputRange: [1.03, 1.12] });
  const translateY = fahrt.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

  return (
    <View style={{ width, height: hoehe, overflow: "hidden", backgroundColor: f.grund }}>
      <Animated.Image source={bild ?? HELD_FOTO[zeit]} resizeMode="cover" fadeDuration={0} style={{ position: "absolute", width, height: hoehe, transform: [{ scale }, { translateY }] }} />
      {abdunkeln ? (
        <>
          {/* Oben abgedunkelt für Statusleiste und Begrüßung */}
          <LinearGradient colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.26)", "rgba(0,0,0,0)"]} locations={[0, 0.2, 0.44]} style={FUELLEN} />
          {/* Links etwas dunkler, damit die Schrift trägt */}
          <LinearGradient colors={["rgba(0,0,0,0.32)", "rgba(0,0,0,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 0.75, y: 0.5 }} style={FUELLEN} />
        </>
      ) : null}
      {/* Unten weich in den Grund – ohne sichtbare Kante */}
      <LinearGradient
        colors={[mitAlpha(f.grund, 0), mitAlpha(f.grund, 0.3), mitAlpha(f.grund, 0.72), mitAlpha(f.grund, 0.94), f.grund]}
        locations={auslauf(ausblendenAb ?? (f.hell ? 0.7 : 0.46))}
        style={[FUELLEN, { bottom: -1 }]}
      />
      {children}
    </View>
  );
}

/** Stützpunkte des Übergangs ins Grund, beginnend bei `ab`. */
function auslauf(ab: number): [number, number, number, number, number] {
  const rest = 1 - ab;
  return [ab, ab + rest * 0.3, ab + rest * 0.6, ab + rest * 0.85, 1];
}

/** Oranger Pinselstrich unter der Handschrift. */
function Pinselstrich({ breite = 128 }: { breite?: number }) {
  return (
    <Svg width={breite} height={breite * 0.21} viewBox="0 0 104 22">
      <Path d="M3 18 C 28 12, 58 7, 101 3 C 70 8.5, 38 14, 5 20.5 Z" fill="#F66A16" />
    </Svg>
  );
}

/** Handschrift auf dem Foto – leicht schräg, jede Zeile etwas eingerückt. */
export function Handschrift({ zeilen, style }: { zeilen: string[]; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ transform: [{ rotate: "-7deg" }] }, style]}>
      {zeilen.map((z, i) => (
        <Text
          key={i}
          style={{
            fontFamily: handschrift,
            fontSize: i === 0 ? 36 : 29,
            lineHeight: i === 0 ? 42 : 35,
            marginLeft: i * 14,
            color: "#FFFFFF",
            textShadowColor: "rgba(0,0,0,0.55)",
            textShadowRadius: 10,
            textShadowOffset: { width: 0, height: 2 },
          }}
        >
          {z}
        </Text>
      ))}
      <View style={{ marginLeft: 22 + (zeilen.length - 1) * 14, marginTop: 2 }}>
        <Pinselstrich />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Werte auf Glas
// ---------------------------------------------------------------------------

export type GlasWertDaten = { icon: IconName; farbe: string; wert: string; label: string; onPress: () => void };

function GlasWert({ icon, farbe, wert, label, onPress, hell }: GlasWertDaten & { hell?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      style={{ flex: 1, alignItems: "center", gap: 3 }}
      hitSlop={6}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <Icon name={icon} size={17} color={farbe} />
        <Text style={{ ...schrift.titel, fontSize: 20, lineHeight: 24, color: hell ? "#14171B" : "#FFFFFF", fontVariant: ["tabular-nums"] }}>{wert}</Text>
      </View>
      <Text style={{ ...schrift.textMittel, fontSize: 12, color: hell ? "rgba(20,23,27,0.62)" : "rgba(255,255,255,0.72)" }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Senkrechter Strich zwischen zwei Werten auf dem Glas. */
function GlasTrenner({ hell }: { hell?: boolean }) {
  return <View style={{ width: 1, alignSelf: "stretch", marginVertical: 4, backgroundColor: hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.14)" }} />;
}

/** Einige Werte nebeneinander auf Glas über einem Foto. */
export function GlasLeiste({ werte, hell, style }: { werte: GlasWertDaten[]; hell?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Glas hell={hell} style={[{ borderRadius: 26, flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 4 }, hell ? leuchten("#3C2C18", 0.1, 14, 4) : null, style]}>
      {werte.map((w, i) => (
        <View key={w.label} style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          {i > 0 ? <GlasTrenner hell={hell} /> : null}
          <GlasWert {...w} hell={hell} />
        </View>
      ))}
    </Glas>
  );
}

/**
 * Prüfungsreife als leuchtender Ring, daneben Serie und Tagesziel – alles auf Glas über dem Foto.
 * Im hellen Modus helles Glas mit dunkler Schrift, wie die Werte im Profil.
 */
export function HeldWerte({
  reife,
  sicher,
  gesamt,
  serie,
  heute,
  ziel,
  onReife,
  onSerie,
  onHeute,
}: {
  reife: number;
  sicher: number;
  gesamt: number;
  serie: number;
  heute: number;
  ziel: number;
  onReife: () => void;
  onSerie: () => void;
  onHeute: () => void;
}) {
  const { hell } = useFarbwelt();
  const text = hell ? "#14171B" : "#FFFFFF";
  return (
    <Glas
      hell={hell}
      style={[{ borderRadius: 26, flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingLeft: 12, paddingRight: 4 }, hell ? leuchten("#3C2C18", 0.1, 14, 4) : null]}
    >
      <Pressable
        onPress={() => {
          tippen();
          onReife();
        }}
        style={{ flex: 1.9, flexDirection: "row", alignItems: "center", gap: 9 }}
      >
        <Ring anteil={reife} groesse={50} dicke={5} verlauf={verlauf.ring} spur={hell ? "rgba(20,23,27,0.09)" : "rgba(255,255,255,0.14)"} leuchten>
          <Text style={{ ...schrift.titel, fontSize: 13.5, color: text, fontVariant: ["tabular-nums"] }}>{Math.round(reife * 100)}%</Text>
        </Ring>
        <View style={{ flex: 1 }}>
          <Text style={{ ...schrift.titelFett, fontSize: 14.5, color: text }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            Prüfungsreif
          </Text>
          <Text style={{ ...schrift.text, fontSize: 12, color: hell ? "rgba(20,23,27,0.62)" : "rgba(255,255,255,0.72)" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            {sicher}/{gesamt} sicher
          </Text>
        </View>
      </Pressable>
      <GlasTrenner hell={hell} />
      <GlasWert icon="flame" farbe="#FF8A2A" wert={`${serie}`} label={serie === 1 ? "Tag Serie" : "Tage Serie"} onPress={onSerie} hell={hell} />
      <GlasTrenner hell={hell} />
      <GlasWert icon="checkmark-circle" farbe={heute >= ziel ? (hell ? "#23A548" : "#4ED053") : "#FFB45C"} wert={`${Math.min(heute, 999)}/${ziel}`} label="heute" onPress={onHeute} hell={hell} />
    </Glas>
  );
}

// ---------------------------------------------------------------------------
// Startknopf mit Glanz
// ---------------------------------------------------------------------------

/** Großer oranger Knopf wie in der Vorlage – mit Schein und einem Glanz, der ab und zu darüberläuft. */
export function StartKnopf({ titel, unter, onPress, style }: { titel: string; unter?: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  const [breite, setBreite] = useState(0);
  const glanz = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.delay(2600),
        Animated.timing(glanz, { toValue: 1, duration: 1250, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(glanz, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [glanz]);

  const x = glanz.interpolate({ inputRange: [0, 1], outputRange: [-140, breite + 60] });
  const hoehe = unter ? 68 : 62;

  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={unter ? `${titel}. ${unter}` : titel}
      onLayout={(e) => setBreite(e.nativeEvent.layout.width)}
      style={({ pressed }) => [{ height: hoehe, borderRadius: hoehe / 2, transform: [{ scale: pressed ? 0.98 : 1 }] }, leuchten(f.orange, f.hell ? 0.32 : 0.5, 20, 8), style]}
    >
      <View style={{ flex: 1, borderRadius: hoehe / 2, overflow: "hidden" }}>
        <LinearGradient colors={verlauf.knopf} locations={[0, 0.5, 1]} style={FUELLEN} />
        <LinearGradient colors={verlauf.knopfSchein} locations={[0, 0.1, 0.25, 0.36]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={FUELLEN} />
        {breite > 0 ? (
          <Animated.View pointerEvents="none" style={{ position: "absolute", top: -10, bottom: -10, width: 90, transform: [{ translateX: x }, { skewX: "-20deg" }] }}>
            <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.34)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
          </Animated.View>
        ) : null}
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingLeft: 30 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...schrift.textHalb, fontSize: 20, color: "#FFFFFF" }}>{titel}</Text>
            {unter ? (
              <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: "rgba(255,255,255,0.86)", marginTop: 1 }} numberOfLines={1}>
                {unter}
              </Text>
            ) : null}
          </View>
          {/* Heller Kreis bildet das rechte Ende des Knopfs */}
          <LinearGradient colors={["#FE9145", "#FD8538"]} style={{ width: hoehe, height: hoehe, borderRadius: hoehe / 2, alignItems: "center", justifyContent: "center" }}>
            <Icon name="arrow-forward" size={25} color="#FFFFFF" weight="semibold" />
          </LinearGradient>
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Überschriften und Schnellstart
// ---------------------------------------------------------------------------

export function Kopfzeile({ titel, link, onLink, style }: { titel: string; link?: string; onLink?: () => void; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: RAND, marginBottom: 12 }, style]}>
      <Text style={{ ...schrift.titel, fontSize: 21, lineHeight: 26, color: f.text }}>{titel}</Text>
      {link && onLink ? (
        <Pressable
          onPress={() => {
            tippen();
            onLink();
          }}
          hitSlop={8}
          style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
        >
          <Text style={{ ...schrift.text, fontSize: 15, color: f.text2 }}>{link}</Text>
          <Icon name="chevron-forward" size={15} color={f.text2} />
        </Pressable>
      ) : link ? (
        <Text style={{ ...schrift.text, fontSize: 15, color: f.text2 }}>{link}</Text>
      ) : null}
    </View>
  );
}

export type Schnellziel = { icon: IconName; titel: string; zahl?: number; onPress: () => void };

/** Kleine Glas-Pillen zum schnellen Einstieg – seitlich scrollbar. */
export function Schnellstart({ ziele, style }: { ziele: Schnellziel[]; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style} contentContainerStyle={{ paddingHorizontal: RAND, gap: 8 }}>
      {ziele.map((z) => (
        <Pressable
          key={z.titel}
          onPress={() => {
            tippen();
            z.onPress();
          }}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            height: 40,
            paddingHorizontal: 14,
            borderRadius: 20,
            backgroundColor: f.hell ? "#FFFFFF" : "rgba(255,255,255,0.07)",
            borderWidth: 1,
            borderColor: f.hell ? f.linie : "rgba(255,255,255,0.1)",
            transform: [{ scale: pressed ? 0.96 : 1 }],
            ...(f.hell ? leuchten("#3C2C18", 0.06, 6, 2) : null),
          })}
        >
          <Icon name={z.icon} size={16} color={f.orange} />
          <Text style={{ ...schrift.textHalb, fontSize: 14, color: f.text }}>{z.titel}</Text>
          {z.zahl ? (
            <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: f.orange, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ ...schrift.textFett, fontSize: 11.5, color: "#FFFFFF" }}>{z.zahl > 99 ? "99+" : z.zahl}</Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Fotokarten
// ---------------------------------------------------------------------------

function Fortschritt({ anteil, hoehe = 6 }: { anteil: number; hoehe?: number }) {
  return (
    <View style={{ height: hoehe, borderRadius: hoehe / 2, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden" }}>
      <LinearGradient colors={verlauf.balken} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: `${Math.max(3, anteil * 100)}%`, height: "100%", borderRadius: hoehe / 2 }} />
    </View>
  );
}

/** Große Fotokarte fürs Thema, das heute am meisten bringt. */
export function FokusKarte({ thema, anteil, offen, style, onPress }: { thema: ThemaId; anteil: number; offen: number; style?: StyleProp<ViewStyle>; onPress: () => void }) {
  const t = themaVon(thema);
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${t.titel} üben`}
      style={({ pressed }) => [{ height: 220, borderRadius: 28, overflow: "hidden", transform: [{ scale: pressed ? 0.985 : 1 }] }, style]}
    >
      <Image source={themaFoto(thema)} style={FUELLEN} resizeMode="cover" fadeDuration={0} />
      <LinearGradient colors={["rgba(3,5,7,0.05)", "rgba(3,5,7,0.3)", "rgba(3,5,7,0.9)"]} locations={[0, 0.42, 1]} style={FUELLEN} />
      <LinearGradient colors={["rgba(3,5,7,0.45)", "rgba(3,5,7,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 0.8, y: 0.5 }} style={FUELLEN} />
      <Glas klar style={{ position: "absolute", top: 14, left: 14, flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15 }}>
        <Icon name="sparkles" size={13} color="#FFB45C" />
        <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: "#FFFFFF" }}>{anteil > 0 ? "Hier holst du am meisten raus" : "Guter Einstieg"}</Text>
      </Glas>
      <View style={{ position: "absolute", left: 18, right: 18, bottom: 18, flexDirection: "row", alignItems: "flex-end", gap: 14 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name={t.icon as IconName} size={20} color="#FFB45C" />
            <Text style={{ ...schrift.titel, fontSize: 24, lineHeight: 29, color: "#FFFFFF" }} numberOfLines={1}>
              {t.titel}
            </Text>
          </View>
          <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: "rgba(255,255,255,0.82)" }}>
            {Math.round(anteil * 100)} % sicher · {offen} {offen === 1 ? "Frage" : "Fragen"} offen
          </Text>
          <Fortschritt anteil={anteil} />
        </View>
        <View style={[{ width: 58, height: 58, borderRadius: 29, overflow: "hidden" }, leuchten("#FC5B0E", 0.5, 14, 4)]}>
          <LinearGradient colors={verlauf.knopf} style={{ flex: 1, borderRadius: 29, alignItems: "center", justifyContent: "center" }}>
            <Icon name="play" size={24} color="#FFFFFF" />
          </LinearGradient>
        </View>
      </View>
    </Pressable>
  );
}

/** Themen als Poster zum Durchwischen. */
export function ThemenKarussell({ themen, onThema }: { themen: { id: ThemaId; anteil: number }[]; onThema: (id: ThemaId) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={160} contentContainerStyle={{ paddingHorizontal: RAND, gap: 12 }}>
      {themen.map(({ id, anteil }) => {
        const t = themaVon(id);
        return (
          <Pressable
            key={id}
            onPress={() => {
              tippen();
              onThema(id);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${t.titel}, ${Math.round(anteil * 100)} Prozent`}
            style={({ pressed }) => ({ width: 148, height: 204, borderRadius: 24, overflow: "hidden", transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <Image source={themaFoto(id)} style={FUELLEN} resizeMode="cover" fadeDuration={0} />
            <LinearGradient colors={["rgba(3,5,7,0.15)", "rgba(3,5,7,0.2)", "rgba(3,5,7,0.92)"]} locations={[0, 0.4, 1]} style={FUELLEN} />
            <Glas klar style={{ position: "absolute", top: 12, left: 12, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }}>
              <Icon name={t.icon as IconName} size={18} color="#FFFFFF" />
            </Glas>
            <View style={{ position: "absolute", left: 13, right: 13, bottom: 13, gap: 8 }}>
              <Text style={{ ...schrift.titelFett, fontSize: 16, lineHeight: 20, color: "#FFFFFF" }} numberOfLines={2}>
                {t.titel}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Fortschritt anteil={anteil} hoehe={5} />
                </View>
                <Text style={{ ...schrift.textHalb, fontSize: 12, color: "rgba(255,255,255,0.85)", fontVariant: ["tabular-nums"] }}>{Math.round(anteil * 100)}%</Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Prüfungssimulation mit Countdown zum Termin und dem letzten Ergebnis. */
export function PruefungKarte({ tage, letzte, style, onPress, onTermin }: { tage: number | null; letzte: { bestanden: boolean; fehlerpunkte: number } | null; style?: StyleProp<ViewStyle>; onPress: () => void; onTermin: () => void }) {
  const countdown = tage === null ? null : tage <= 0 ? "Heute ist Prüfung" : tage === 1 ? "Morgen ist Prüfung" : `Noch ${tage} Tage`;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel="Prüfungssimulation"
      style={({ pressed }) => [{ height: 184, borderRadius: 28, overflow: "hidden", transform: [{ scale: pressed ? 0.985 : 1 }] }, style]}
    >
      <Image source={FOTOS.pruefung} style={FUELLEN} resizeMode="cover" fadeDuration={0} />
      <LinearGradient colors={["rgba(3,5,7,0.92)", "rgba(3,5,7,0.62)", "rgba(3,5,7,0.1)"]} locations={[0, 0.5, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={FUELLEN} />
      <View style={{ flex: 1, padding: 18, justifyContent: "space-between" }}>
        <View style={{ gap: 5, maxWidth: "74%" }}>
          <Text style={{ ...schrift.textHalb, fontSize: 12, letterSpacing: 1, color: "#FFB45C" }}>PRÜFUNGSSIMULATION</Text>
          <Text style={{ ...schrift.titel, fontSize: 23, lineHeight: 28, color: "#FFFFFF" }}>Bereit für den Ernstfall?</Text>
          <Text style={{ ...schrift.text, fontSize: 13.5, color: "rgba(255,255,255,0.78)" }}>30 Fragen · 45 Minuten</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {countdown ? (
            <Glas klar style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16 }}>
              <Icon name="calendar" size={14} color="#FFB45C" />
              <Text style={{ ...schrift.textHalb, fontSize: 13, color: "#FFFFFF" }}>{countdown}</Text>
            </Glas>
          ) : (
            <Pressable
              onPress={() => {
                tippen();
                onTermin();
              }}
              hitSlop={6}
            >
              <Glas klar style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16 }}>
                <Icon name="calendar-outline" size={14} color="#FFB45C" />
                <Text style={{ ...schrift.textHalb, fontSize: 13, color: "#FFFFFF" }}>Termin eintragen</Text>
              </Glas>
            </Pressable>
          )}
          {letzte ? (
            <Glas klar style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16 }}>
              <Icon name={letzte.bestanden ? "checkmark-circle" : "close-circle"} size={14} color={letzte.bestanden ? "#4ED053" : "#FF6A5C"} />
              <Text style={{ ...schrift.textHalb, fontSize: 13, color: "#FFFFFF" }}>
                {letzte.bestanden ? "Bestanden" : "Durchgefallen"} · {letzte.fehlerpunkte} FP
              </Text>
            </Glas>
          ) : null}
        </View>
      </View>
      <View style={{ position: "absolute", right: 16, top: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
        <Icon name="arrow-forward" size={20} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

/** Spruch des Tages vor einem Landschaftsfoto, in Handschrift. */
export function ZitatKarte({ zeilen, style }: { zeilen: [string, string]; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <View style={[{ height: 112, borderRadius: 26, overflow: "hidden", backgroundColor: f.hell ? "#1B1714" : f.flaeche }, style]}>
      <Image source={FOTOS.zitat} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "78%", height: "100%" }} resizeMode="cover" fadeDuration={0} />
      <LinearGradient
        colors={["rgba(13,19,23,1)", "rgba(13,19,23,0.9)", "rgba(13,19,23,0.55)", "rgba(13,19,23,0.15)", "rgba(13,19,23,0)"]}
        locations={[0, 0.25, 0.5, 0.78, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "78%" }}
      />
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 22 }}>
        <Text style={{ fontFamily: handschrift, fontSize: 27, lineHeight: 32, color: "#FFFFFF" }}>{zeilen[0]}</Text>
        <Text style={{ fontFamily: handschrift, fontSize: 27, lineHeight: 32, color: "#FFB45C", marginLeft: 18 }}>{zeilen[1]}</Text>
      </View>
    </View>
  );
}
