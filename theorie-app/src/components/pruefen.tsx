import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Image, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, Line, Path, Polygon, RadialGradient, Stop, Text as SvgText, LinearGradient as SvgVerlauf } from "react-native-svg";

import { useFenster } from "@/lib/fenster";
import { DekoSvg } from "@/components/grafik";
import { Icon, type IconName } from "@/components/icon";
import { useFarbwelt } from "@/lib/darstellung";
import { datumKurz, uhrzeit } from "@/lib/format";
import { themaFoto } from "@/lib/fotos";
import { themaVon, type ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import type { Pruefung } from "@/lib/stand";
import { leuchten, mitDeckkraft, RAND, schrift, svgSchrift, verlauf } from "@/lib/theme";

// Prüfung im Kino-Look: oben ein Tacho für die Prüfungsreife wie im Cockpit,
// darunter das Ticket zum Prüfungstag, der Verlauf der Fehlerpunkte und der Ablauf.

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;
const AnimPath = Animated.createAnimatedComponent(Path);

function kartenStil(hell: boolean, grund: string, linie: string): ViewStyle {
  return hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.07, 12, 4) } : { backgroundColor: grund, borderWidth: 1, borderColor: linie };
}

// ---------------------------------------------------------------------------
// Tacho
// ---------------------------------------------------------------------------

/** Skala beginnt links unten und läuft im Uhrzeigersinn über oben nach rechts unten. */
const START = 150;
const BOGEN = 240;

/** Hintergrund des Kopfs: dunkles bzw. helles Armaturenbrett mit weichem Licht hinter dem Tacho. */
export function Instrumententafel({ hoehe, lichtY, children }: { hoehe: number; lichtY: number; children?: ReactNode }) {
  const f = useFarbwelt();
  const { width } = useFenster();
  return (
    <View style={{ width, height: hoehe, overflow: "hidden", backgroundColor: f.hell ? "#F1EDE6" : "#040608" }}>
      <Svg width={width} height={hoehe} style={{ position: "absolute" }}>
        <Defs>
          <RadialGradient id="tafelLicht" cx={width / 2} cy={lichtY} r={width * 0.72} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={f.hell ? "#FFFFFF" : "#FC5B0E"} stopOpacity={f.hell ? 1 : 0.2} />
            <Stop offset="0.45" stopColor={f.hell ? "#FFFFFF" : "#FC5B0E"} stopOpacity={f.hell ? 0.55 : 0.06} />
            <Stop offset="1" stopColor={f.hell ? "#FFFFFF" : "#FC5B0E"} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="tafelKante" cx={width / 2} cy={lichtY} r={width * 0.95} gradientUnits="userSpaceOnUse">
            <Stop offset="0.55" stopColor={f.hell ? "#D9D2C6" : "#000000"} stopOpacity={0} />
            <Stop offset="1" stopColor={f.hell ? "#D9D2C6" : "#000000"} stopOpacity={f.hell ? 0.55 : 0.7} />
          </RadialGradient>
        </Defs>
        <Circle cx={width / 2} cy={lichtY} r={width * 0.72} fill="url(#tafelLicht)" />
        <Circle cx={width / 2} cy={lichtY} r={width * 1.4} fill="url(#tafelKante)" />
        {/* Feine Ringe wie die Einfassung eines Rundinstruments */}
        {[0.62, 0.7].map((r, i) => (
          <Circle key={r} cx={width / 2} cy={lichtY} r={width * r} fill="none" stroke={f.hell ? "rgba(60,44,24,0.05)" : "rgba(255,255,255,0.045)"} strokeWidth={1} strokeDasharray={i === 1 ? "2 7" : undefined} />
        ))}
      </Svg>
      <LinearGradient colors={[mitDeckkraft(f.grund, 0), mitDeckkraft(f.grund, 0.85), f.grund]} locations={[0.72, 0.92, 1]} style={[FUELLEN, { bottom: -1 }]} />
      {children}
    </View>
  );
}

/**
 * Prüfungsreife als Tacho: Skala 0–100 %, grüner Bereich ab 90 % („reif“),
 * leuchtender Bogen und Nadel, die beim Öffnen hochläuft.
 */
export function Tacho({ anteil, sicher, gesamt, groesse = 300 }: { anteil: number; sicher: number; gesamt: number; groesse?: number }) {
  const f = useFarbwelt();
  const S = groesse;
  const m = S / 2;
  const R = S * 0.4;
  const wert = Math.max(0, Math.min(1, anteil));
  const reif = wert >= 0.9;
  const bogenWert = useRef(new Animated.Value(0)).current;
  const nadelWert = useRef(new Animated.Value(0)).current;
  const erstesMal = useRef(true);

  // Beim ersten Öffnen einmal Vollausschlag und zurück – wie der Selbsttest beim Motorstart.
  useEffect(() => {
    const lauf = (v: Animated.Value, nativ: boolean) =>
      erstesMal.current
        ? Animated.sequence([
            Animated.delay(250),
            Animated.timing(v, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.cubic), useNativeDriver: nativ }),
            Animated.timing(v, { toValue: wert, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: nativ }),
          ])
        : Animated.timing(v, { toValue: wert, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: nativ });
    Animated.parallel([lauf(bogenWert, false), lauf(nadelWert, true)]).start();
    erstesMal.current = false;
  }, [wert, bogenWert, nadelWert]);

  // Die Zahl in der Mitte läuft mit der Nadel mit (0 → 100 → Stand), statt sofort den Endwert zu zeigen.
  const [anzeige, setAnzeige] = useState(0);
  useEffect(() => {
    const id = bogenWert.addListener(({ value }) => setAnzeige(Math.round(value * 100)));
    return () => bogenWert.removeListener(id);
  }, [bogenWert]);

  const rad = (v: number) => ((START + BOGEN * v) * Math.PI) / 180;
  const punkt = (v: number, r: number) => ({ x: m + r * Math.cos(rad(v)), y: m + r * Math.sin(rad(v)) });
  const pfad = (von: number, bis: number, r: number) => {
    const a = punkt(von, r);
    const b = punkt(bis, r);
    return `M ${a.x} ${a.y} A ${r} ${r} 0 ${BOGEN * (bis - von) > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
  };
  const laenge = (BOGEN / 360) * 2 * Math.PI * R;
  const versatz = bogenWert.interpolate({ inputRange: [0, 1], outputRange: [laenge, 0] });
  const drehung = nadelWert.interpolate({ inputRange: [0, 1], outputRange: [`${START}deg`, `${START + BOGEN}deg`] });

  const strichFarbe = f.hell ? "20,23,27" : "255,255,255";
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const bogenId = reif ? "tachoGruen" : "tachoOrange";
  const nadelFarbe = f.hell ? "#E8480A" : "#FF6224";
  const nadelLaenge = R - 8;

  return (
    <View style={{ width: S, height: S * 0.9 }}>
      <DekoSvg width={S} height={S} style={{ position: "absolute" }}>
        <Defs>
          <SvgVerlauf id="tachoOrange" gradientUnits="userSpaceOnUse" x1={m - R} y1={0} x2={m + R} y2={0}>
            <Stop offset="0" stopColor="#FFB25C" />
            <Stop offset="0.55" stopColor="#FD7A1C" />
            <Stop offset="1" stopColor="#F5470A" />
          </SvgVerlauf>
          <SvgVerlauf id="tachoGruen" gradientUnits="userSpaceOnUse" x1={m - R} y1={0} x2={m + R} y2={0}>
            <Stop offset="0" stopColor="#9BE88F" />
            <Stop offset="1" stopColor="#2FB34A" />
          </SvgVerlauf>
        </Defs>

        {/* Spur und Zielbereich ab 90 % */}
        <Path d={pfad(0, 1, R)} stroke={`rgba(${strichFarbe},0.07)`} strokeWidth={11} strokeLinecap="round" fill="none" />
        <Path d={pfad(0.9, 1, R)} stroke={gruen} strokeOpacity={f.hell ? 0.3 : 0.32} strokeWidth={11} strokeLinecap="round" fill="none" />

        {/* Leuchten hinter dem Bogen */}
        {wert > 0.005
          ? [0.1, 0.06, 0.03].map((d, i) => (
              <AnimPath
                key={i}
                d={pfad(0, 1, R)}
                stroke={`url(#${bogenId})`}
                strokeOpacity={f.hell ? d * 0.7 : d}
                strokeWidth={11 + (i + 1) * 7}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${laenge} ${laenge}`}
                strokeDashoffset={versatz}
              />
            ))
          : null}
        {wert > 0.005 ? (
          <AnimPath d={pfad(0, 1, R)} stroke={`url(#${bogenId})`} strokeWidth={11} strokeLinecap="round" fill="none" strokeDasharray={`${laenge} ${laenge}`} strokeDashoffset={versatz} />
        ) : null}

        {/* Skala: alle 2 %, lange Striche alle 10 %, Zahlen alle 20 % */}
        {Array.from({ length: 51 }, (_, i) => {
          const v = i / 50;
          const lang = i % 5 === 0;
          const a = punkt(v, R - 15);
          const b = punkt(v, lang ? R - 27 : R - 21);
          const imZiel = v >= 0.9;
          return (
            <Line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={imZiel ? gruen : `rgba(${strichFarbe},${lang ? 0.72 : 0.28})`}
              strokeOpacity={imZiel ? (lang ? 1 : 0.6) : 1}
              strokeWidth={lang ? 2 : 1.2}
              strokeLinecap="round"
            />
          );
        })}
        {[0, 20, 40, 60, 80, 100].map((z) => {
          const p = punkt(z / 100, R - 42);
          return (
            <SvgText key={z} x={p.x} y={p.y + 4.5} fill={`rgba(${strichFarbe},${z === 100 ? 0.9 : 0.62})`} fontSize={12.5} fontFamily={svgSchrift.text} textAnchor="middle">
              {z}
            </SvgText>
          );
        })}
        {(() => {
          const p = punkt(0.955, R + 19);
          return (
            <SvgText x={p.x} y={p.y + 4} fill={gruen} fontSize={10} fontFamily={svgSchrift.fett} textAnchor="middle" letterSpacing={0.8}>
              REIF
            </SvgText>
          );
        })()}
      </DekoSvg>

      {/* Nadel – dreht sich um die Nabe in der Mitte */}
      <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: S, height: S, transform: [{ rotate: drehung }] }}>
        <Svg width={S} height={S}>
          <Polygon points={`${m - 18},${m - 5} ${m + nadelLaenge - 6},${m - 2.4} ${m + nadelLaenge + 2},${m} ${m + nadelLaenge - 6},${m + 2.4} ${m - 18},${m + 5}`} fill={nadelFarbe} opacity={0.18} />
          <Polygon points={`${m - 16},${m - 2.6} ${m + nadelLaenge - 8},${m - 1.1} ${m + nadelLaenge},${m} ${m + nadelLaenge - 8},${m + 1.1} ${m - 16},${m + 2.6}`} fill={nadelFarbe} />
        </Svg>
      </Animated.View>
      <DekoSvg width={S} height={S} style={{ position: "absolute" }}>
        <Circle cx={m} cy={m} r={11} fill={f.hell ? "#FFFFFF" : "#0B1015"} stroke={nadelFarbe} strokeWidth={2.5} />
        <Circle cx={m} cy={m} r={3.2} fill={nadelFarbe} />
      </DekoSvg>

      {/* Anzeige unter der Nabe */}
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: m + 26, alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <Text style={{ ...schrift.titel, fontSize: 46, lineHeight: 50, color: f.text, fontVariant: ["tabular-nums"], letterSpacing: -1 }}>{anzeige}</Text>
          <Text style={{ ...schrift.titel, fontSize: 21, lineHeight: 36, color: f.text2, marginLeft: 2 }}>%</Text>
        </View>
        <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: reif ? gruen : f.text2, marginTop: -1 }}>{reif ? "Prüfungsreif" : "Prüfungsreife"}</Text>
        <Text style={{ ...schrift.text, fontSize: 12, color: f.text3, marginTop: 2 }}>
          {sicher} von {gesamt} Fragen sicher
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Ticket zum Prüfungstag
// ---------------------------------------------------------------------------

const TAGE_KURZ = ["SO.", "MO.", "DI.", "MI.", "DO.", "FR.", "SA."];
const MONATE_KURZ = ["JAN.", "FEB.", "MÄRZ", "APR.", "MAI", "JUNI", "JULI", "AUG.", "SEP.", "OKT.", "NOV.", "DEZ."];
const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

/**
 * Prüfungstermin als Ticket: links der Abriss mit dem Datum, rechts Tag,
 * Uhrzeit und Countdown. Ohne Termin lädt es zum Eintragen ein.
 */
export function PruefungsTicket({
  termin,
  wann,
  hinweis,
  hinweisIcon,
  onPress,
  style,
}: {
  termin: Date | null;
  wann: string | null;
  hinweis: string;
  hinweisIcon: IconName;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const f = useFarbwelt();
  const kerbe = 11;
  const abriss = 98;
  const vorbei = wann === "vorbei";
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={termin ? `Prüfungstermin ${WOCHENTAGE[termin.getDay()]}, ${termin.getDate()}. ${MONATE[termin.getMonth()]}, ${wann ?? ""}` : "Prüfungstermin eintragen"}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.985 : 1 }] }, style]}
    >
      <View style={[{ flexDirection: "row", minHeight: 132, borderRadius: 24 }, kartenStil(f.hell, f.flaeche, f.linie)]}>
        {/* Abriss mit Datum */}
        <View style={{ width: abriss, borderTopLeftRadius: 23, borderBottomLeftRadius: 23, overflow: "hidden" }}>
          <LinearGradient colors={verlauf.knopf} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 14 }}>
            {termin ? (
              <>
                <Text style={{ ...schrift.textFett, fontSize: 12, letterSpacing: 1, color: "rgba(255,255,255,0.86)" }}>{TAGE_KURZ[termin.getDay()]}</Text>
                <Text style={{ ...schrift.titel, fontSize: 40, lineHeight: 46, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{termin.getDate()}</Text>
                <Text style={{ ...schrift.textFett, fontSize: 12, letterSpacing: 1, color: "rgba(255,255,255,0.86)" }}>{MONATE_KURZ[termin.getMonth()]}</Text>
              </>
            ) : (
              <>
                <Icon name="calendar-outline" size={30} color="#FFFFFF" />
                <Text style={{ ...schrift.textFett, fontSize: 12, letterSpacing: 1, color: "rgba(255,255,255,0.9)", marginTop: 8 }}>TERMIN</Text>
              </>
            )}
          </LinearGradient>
        </View>

        {/* Perforation mit Kerben oben und unten */}
        <View style={{ width: 1, marginVertical: 16, borderLeftWidth: 1.5, borderStyle: "dashed", borderColor: f.hell ? "rgba(20,23,27,0.16)" : "rgba(255,255,255,0.18)" }} />
        <View style={{ position: "absolute", left: abriss - kerbe + 0.5, top: -kerbe, width: kerbe * 2, height: kerbe * 2, borderRadius: kerbe, backgroundColor: f.grund }} />
        <View style={{ position: "absolute", left: abriss - kerbe + 0.5, bottom: -kerbe, width: kerbe * 2, height: kerbe * 2, borderRadius: kerbe, backgroundColor: f.grund }} />

        <View style={{ flex: 1, paddingVertical: 16, paddingLeft: 16, paddingRight: 14, justifyContent: "space-between", gap: 10 }}>
          {termin ? (
            <View style={{ gap: 3 }}>
              <Text style={{ ...schrift.textHalb, fontSize: 11.5, letterSpacing: 1, color: f.orange }}>THEORIEPRÜFUNG</Text>
              <Text style={{ ...schrift.titelFett, fontSize: 17, color: f.text }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {WOCHENTAGE[termin.getDay()]}, {termin.getDate()}. {MONATE[termin.getMonth()]}
              </Text>
              <Text style={{ ...schrift.text, fontSize: 14, color: f.text2 }}>{uhrzeit(termin.getHours(), termin.getMinutes())} Uhr</Text>
            </View>
          ) : (
            <View style={{ gap: 4 }}>
              <Text style={{ ...schrift.titelFett, fontSize: 17, color: f.text }}>Noch kein Termin</Text>
              <Text style={{ ...schrift.text, fontSize: 13.5, lineHeight: 18, color: f.text2 }}>Trag deine Prüfung ein – dann zählt die App mit dir runter.</Text>
            </View>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <View style={{ height: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: vorbei ? (f.hell ? f.flaeche2 : "rgba(255,255,255,0.08)") : f.orangeSoft, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon name={termin ? (vorbei ? "checkmark" : "time-outline") : "add"} size={14} color={vorbei ? f.text2 : f.orange} />
              <Text style={{ ...schrift.textHalb, fontSize: 13, color: vorbei ? f.text2 : f.orange }}>
                {termin ? (vorbei ? "Vorbei – neuer Termin?" : wann === "heute" ? "Heute!" : wann === "morgen" ? "Morgen" : (wann ?? "")) : "Termin eintragen"}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name={hinweisIcon} size={11} color={f.text3} />
            <Text style={{ ...schrift.text, fontSize: 11.5, color: f.text3, flex: 1 }} numberOfLines={1}>
              {hinweis}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Verlauf der Simulationen
// ---------------------------------------------------------------------------

const PLAETZE = 10;
const GRENZE = 10;

/** Fehlerpunkte der letzten zehn Simulationen als Säulen, mit der Grenze bei 10 Punkten. */
export function FehlerpunkteVerlauf({ pruefungen, style }: { pruefungen: Pruefung[]; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  const { width } = useFenster();
  const liste = pruefungen.slice(0, PLAETZE).reverse();
  const innen = width - 2 * RAND - 36;
  // Rechts ein schmaler Rand für die Beschriftung der Grenze
  const saeulenBreite = innen - 26;
  const hoehe = 132;
  const oben = 18;
  const max = Math.max(20, ...liste.map((p) => p.fehlerpunkte + 3));
  const yVon = (fp: number) => oben + hoehe - (fp / max) * hoehe;
  const platz = saeulenBreite / PLAETZE;
  const saeule = Math.min(22, platz * 0.58);
  const grenzeY = yVon(GRENZE);
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const rot = f.hell ? "#E5392C" : "#FF5A4E";
  const leer = liste.length === 0;

  const beste = leer ? null : Math.min(...pruefungen.map((p) => p.fehlerpunkte));
  const schnitt = leer ? null : pruefungen.reduce((s, p) => s + p.fehlerpunkte, 0) / pruefungen.length;
  const quote = leer ? null : pruefungen.filter((p) => p.bestanden).length / pruefungen.length;

  return (
    <View style={[{ borderRadius: 26, padding: 18, gap: 14 }, kartenStil(f.hell, f.flaeche, f.linie), style]}>
      <View>
        <Text style={{ ...schrift.titelFett, fontSize: 16, color: f.text }}>Fehlerpunkte</Text>
        <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }}>{leer ? "Noch keine Simulation" : `Letzte ${liste.length === 1 ? "Simulation" : `${liste.length} Simulationen`}`}</Text>
      </View>

      <View style={{ height: oben + hoehe + 20 }}>
        <Svg width={innen} height={oben + hoehe + 20}>
          <Defs>
            <SvgVerlauf id="fpGruen" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={f.hell ? "#3CC35B" : "#7BE07F"} />
              <Stop offset="1" stopColor={gruen} />
            </SvgVerlauf>
            <SvgVerlauf id="fpRot" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={f.hell ? "#FF6A5C" : "#FF8A7E"} />
              <Stop offset="1" stopColor={rot} />
            </SvgVerlauf>
          </Defs>
          {/* Grundlinie */}
          <Line x1={0} y1={oben + hoehe} x2={saeulenBreite} y2={oben + hoehe} stroke={f.hell ? "rgba(20,23,27,0.12)" : "rgba(255,255,255,0.12)"} strokeWidth={1} />
          {/* Plätze: gefüllt mit Säulen, sonst nur eine blasse Markierung */}
          {Array.from({ length: PLAETZE }, (_, i) => {
            const p = liste[i];
            const x = i * platz + (platz - saeule) / 2;
            if (!p) {
              return <Path key={i} d={`M ${x} ${oben + hoehe - 6} h ${saeule}`} stroke={f.hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.1)"} strokeWidth={3} strokeLinecap="round" />;
            }
            const y = Math.min(yVon(p.fehlerpunkte), oben + hoehe - 5);
            const h = oben + hoehe - y;
            const r = Math.min(6, saeule / 2, h / 2);
            return (
              <Path
                key={i}
                d={`M ${x} ${oben + hoehe} V ${y + r} Q ${x} ${y} ${x + r} ${y} H ${x + saeule - r} Q ${x + saeule} ${y} ${x + saeule} ${y + r} V ${oben + hoehe} Z`}
                fill={p.bestanden ? "url(#fpGruen)" : "url(#fpRot)"}
              />
            );
          })}
          {liste.map((p, i) => {
            const x = i * platz + platz / 2;
            const y = Math.min(yVon(p.fehlerpunkte), oben + hoehe - 5);
            return (
              <SvgText key={`z${i}`} x={x} y={y - 6} fill={f.text2} fontSize={11.5} fontFamily={svgSchrift.fett} textAnchor="middle">
                {p.fehlerpunkte}
              </SvgText>
            );
          })}
          {liste.map((p, i) => (
            <SvgText key={`d${i}`} x={i * platz + platz / 2} y={oben + hoehe + 15} fill={f.text3} fontSize={9.5} fontFamily={svgSchrift.text} textAnchor="middle">
              {datumKurz(p.datum).slice(0, 5)}
            </SvgText>
          ))}
          {/* Grenze: darüber nicht bestanden */}
          {!leer ? <Line x1={0} y1={grenzeY} x2={saeulenBreite + 4} y2={grenzeY} stroke={rot} strokeOpacity={0.75} strokeWidth={1.2} strokeDasharray="5 5" /> : null}
          {!leer ? (
            <SvgText x={innen} y={grenzeY + 4} fill={rot} fontSize={11.5} fontFamily={svgSchrift.fett} textAnchor="end">
              {GRENZE}
            </SvgText>
          ) : null}
        </Svg>
        {leer ? (
          <View style={[FUELLEN, { alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }]}>
            <Text style={{ ...schrift.text, fontSize: 13.5, lineHeight: 19, color: f.text2, textAlign: "center" }}>Nach deiner ersten Simulation siehst du hier, wie viele Fehlerpunkte du hattest.</Text>
          </View>
        ) : null}
      </View>

      {/* Legende */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: -4, display: leer ? "none" : "flex" }}>
        {[
          { farbe: gruen, text: "bestanden" },
          { farbe: rot, text: "nicht bestanden" },
        ].map((l) => (
          <View key={l.text} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: l.farbe }} />
            <Text style={{ ...schrift.textMittel, fontSize: 12, color: f.text3 }}>{l.text}</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ flexDirection: "row", gap: 2 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: 4, height: 2, borderRadius: 1, backgroundColor: rot }} />
            ))}
          </View>
          <Text style={{ ...schrift.textMittel, fontSize: 12, color: f.text3 }}>Grenze {GRENZE} FP</Text>
        </View>
      </View>

      {!leer ? (
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: f.linie, paddingTop: 14 }}>
          {[
            { wert: `${beste}`, label: "Bestwert FP" },
            { wert: schnitt === null ? "–" : schnitt.toLocaleString("de-DE", { maximumFractionDigits: 1 }), label: "Schnitt FP" },
            { wert: `${Math.round((quote ?? 0) * 100)} %`, label: "bestanden" },
          ].map((z, i) => (
            <View key={z.label} style={{ flex: 1, alignItems: "center", borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: f.linie }}>
              <Text style={{ ...schrift.titel, fontSize: 19, lineHeight: 23, color: f.text, fontVariant: ["tabular-nums"] }}>{z.wert}</Text>
              <Text style={{ ...schrift.textMittel, fontSize: 11.5, color: f.text3 }}>{z.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Die letzten Ergebnisse als Liste. */
export function ErgebnisListe({ pruefungen, style }: { pruefungen: Pruefung[]; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const rot = f.hell ? "#E5392C" : "#FF5A4E";
  return (
    <View style={[{ borderRadius: 24, overflow: "hidden" }, kartenStil(f.hell, f.flaeche, f.linie), style]}>
      {pruefungen.map((p, i) => (
        <View key={p.datum} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: f.linie }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: mitDeckkraft(p.bestanden ? gruen : rot, 0.14), alignItems: "center", justifyContent: "center" }}>
            <Icon name={p.bestanden ? "checkmark" : "close"} size={18} color={p.bestanden ? gruen : rot} weight="bold" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text }}>{p.bestanden ? "Bestanden" : "Nicht bestanden"}</Text>
            <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }}>
              {datumKurz(p.datum)} · {p.richtig} von {p.gesamt} richtig
            </Text>
          </View>
          <Text style={{ ...schrift.titel, fontSize: 16, color: p.bestanden ? gruen : rot, fontVariant: ["tabular-nums"] }}>{p.fehlerpunkte} FP</Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Vor der Prüfung noch üben
// ---------------------------------------------------------------------------

export type Baustelle = { id: ThemaId; anteil: number; offen: number };

/** Die schwächsten Themen mit Foto und Stand – ein Tipp übt genau dieses Thema. */
export function Baustellen({ themen, onThema, style }: { themen: Baustelle[]; onThema: (id: ThemaId) => void; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <View style={[{ borderRadius: 24, overflow: "hidden" }, kartenStil(f.hell, f.flaeche, f.linie), style]}>
      {themen.map((t, i) => {
        const thema = themaVon(t.id);
        return (
          <Pressable
            key={t.id}
            onPress={() => {
              tippen();
              onThema(t.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${thema.titel} üben`}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: f.linie, backgroundColor: pressed ? (f.hell ? f.flaeche2 : "rgba(255,255,255,0.04)") : "transparent" })}
          >
            <Image source={themaFoto(t.id)} style={{ width: 54, height: 54, borderRadius: 14 }} resizeMode="cover" fadeDuration={0} />
            <View style={{ flex: 1, gap: 6 }}>
              <View>
                <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text }} numberOfLines={1}>
                  {thema.titel}
                </Text>
                <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }}>
                  {Math.round(t.anteil * 100)} % sicher · {t.offen} offen
                </Text>
              </View>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: f.hell ? "rgba(20,23,27,0.08)" : "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                <LinearGradient colors={verlauf.balken} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: `${Math.max(4, t.anteil * 100)}%`, height: "100%" }} />
              </View>
            </View>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: f.orangeSoft, alignItems: "center", justifyContent: "center" }}>
              <Icon name="play" size={15} color={f.orange} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Ablauf
// ---------------------------------------------------------------------------

/** Die drei Eckdaten der Prüfung als große Zahlen. */
export function Eckdaten({ style }: { style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  const daten = [
    { zahl: "30", label: "Fragen" },
    { zahl: "45", label: "Minuten" },
    { zahl: "≤ 10", label: "Fehlerpunkte" },
  ];
  return (
    <View style={[{ flexDirection: "row", gap: 10 }, style]}>
      {daten.map((d) => (
        <View key={d.label} style={[{ flex: 1, borderRadius: 22, paddingVertical: 16, paddingHorizontal: 8, alignItems: "center" }, kartenStil(f.hell, f.flaeche, f.linie)]}>
          <Text style={{ ...schrift.titel, fontSize: 30, lineHeight: 35, color: f.orange, fontVariant: ["tabular-nums"] }}>{d.zahl}</Text>
          <Text style={{ ...schrift.textMittel, fontSize: 12, color: f.text2, textAlign: "center" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {d.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export type Regel = { icon: IconName; text: string };

/** Regeln der Prüfung als ruhige Liste. */
export function RegelListe({ regeln, style }: { regeln: Regel[]; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <View style={[{ borderRadius: 24, paddingVertical: 6, paddingHorizontal: 16 }, kartenStil(f.hell, f.flaeche, f.linie), style]}>
      {regeln.map((r, i) => (
        <View key={r.text} style={{ flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: f.linie }}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: f.orangeSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name={r.icon} size={16} color={f.orange} />
          </View>
          <Text style={{ ...schrift.text, fontSize: 14.5, lineHeight: 20, color: f.text, flex: 1 }}>{r.text}</Text>
        </View>
      ))}
    </View>
  );
}
