import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Animated as RNAnimated, Easing as RNEasing, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Reanimated, { Easing, cancelAnimation, useAnimatedReaction, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { Circle, Defs, G, Line, LinearGradient as SvgVerlauf, Path, Polygon, RadialGradient, Stop, Text as SvgText } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { useFenster } from "@/lib/fenster";
import { DekoSvg } from "@/components/grafik";
import { Icon } from "@/components/icon";
import { erfolg, tippen } from "@/lib/haptik";
import { radBisStart, radFortschritt, radName, radWinkel, type LiveRad } from "@/lib/live-rad";
import { leuchten } from "@/lib/theme";
import { ClipsGrund } from "@/components/clips-grund";
import { lilaSchrift } from "@/components/lila-teile";

// Das Themenrad im Live: Glücksrad mit den Lernthemen, Lichterkranz, Zeiger, der
// an jedem Feld anschlägt, und Konfetti, wenn es steht. Gastgeber und Zuschauer
// sehen dasselbe Rad zur selben Zeit (Winkel nach der Serverzeit).

const LILA = "#8A5FFF";
const LILA_KANTE = "#6A3FE6";
const TINTE = "#2E2650";
const TINTE2 = "#6E6888";
const GOLD = "#FFB400";
const KONFETTI_FARBEN = [LILA, GOLD, "#C0A6FF", "#FF7A59", "#2F80FF", "#22B573"];
const LAMPEN = 20;

const bogen = (grad: number) => (grad * Math.PI) / 180;
/** Punkt auf dem Kreis (Grad im Uhrzeigersinn ab 12 Uhr). */
const xy = (c: number, r: number, grad: number): [number, number] => [c + r * Math.cos(bogen(grad - 90)), c + r * Math.sin(bogen(grad - 90))];
const punkt = (c: number, r: number, grad: number) => xy(c, r, grad).join(",");

/** Felder abwechselnd lila/hell – bei ungerader Zahl ist das letzte zartlila (sonst lägen zwei gleiche nebeneinander). */
const feldFarbe = (i: number, n: number) => (n % 2 === 1 && i === n - 1 ? "mitte" : i % 2 === 0 ? "lila" : "hell");

/** Ein Feld von a bis b (Grad im Uhrzeigersinn ab 12 Uhr). */
function feldPfad(c: number, r: number, a: number, b: number) {
  return `M ${c},${c} L ${punkt(c, r, a)} A ${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${punkt(c, r, b)} Z`;
}

/** Die Scheibe mit Feldern, Beschriftung und Lenkrad in der Mitte (dreht sich als Ganzes). */
const Scheibe = memo(function Scheibe({ themen, d }: { themen: string[]; d: number }) {
  const c = d / 2;
  const r = d / 2 - 22;
  const n = themen.length;
  const feld = 360 / n;
  const nabe = d * 0.12;
  const lenkrad = nabe * 0.66;
  return (
    <DekoSvg width={d} height={d}>
      <Defs>
        <SvgVerlauf id="rad-lila" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#A684FF" />
          <Stop offset="1" stopColor="#7A4BF2" />
        </SvgVerlauf>
        <SvgVerlauf id="rad-hell" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#F1EAFF" />
        </SvgVerlauf>
        <SvgVerlauf id="rad-mitte" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#DCCBFF" />
          <Stop offset="1" stopColor="#C0A6FF" />
        </SvgVerlauf>
        <SvgVerlauf id="rad-nabe" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#EEE6FF" />
        </SvgVerlauf>
        <RadialGradient id="rad-tiefe" cx="50%" cy="50%" r="50%">
          <Stop offset="0.6" stopColor={LILA_KANTE} stopOpacity={0} />
          <Stop offset="1" stopColor={LILA_KANTE} stopOpacity={0.14} />
        </RadialGradient>
      </Defs>
      {themen.map((t, i) => (
        <Path key={t + i} d={feldPfad(c, r, i * feld, (i + 1) * feld)} fill={`url(#rad-${feldFarbe(i, n)})`} />
      ))}
      {/* Tiefe zum Rand hin */}
      <Circle cx={c} cy={c} r={r} fill="url(#rad-tiefe)" />
      {/* Trennlinien */}
      {themen.map((t, i) => {
        const [x, y] = xy(c, r, i * feld);
        return <Line key={`l${i}`} x1={c} y1={c} x2={x} y2={y} stroke="#FFFFFF" strokeWidth={2} />;
      })}
      {/* Beschriftung quer zum Radius – das Gewinnerfeld liest sich oben ganz normal */}
      {themen.map((t, i) => {
        const name = radName(t).toUpperCase();
        const bogenLaenge = (2 * Math.PI * r * 0.72) / n;
        const groesse = Math.min(13, (bogenLaenge * 0.9) / (name.length * 0.68));
        return (
          <G key={`t${i}`} transform={`rotate(${i * feld + feld / 2} ${c} ${c})`}>
            <SvgText x={c} y={c - r * 0.72 + groesse * 0.36} textAnchor="middle" fontFamily="Inter_800ExtraBold" fontSize={groesse} letterSpacing={0.4} fill={feldFarbe(i, n) === "lila" ? "#FFFFFF" : TINTE}>
              {name}
            </SvgText>
          </G>
        );
      })}
      {/* Innenkante */}
      <Circle cx={c} cy={c} r={r} fill="none" stroke="#FFFFFF" strokeWidth={2} />
      {/* Nabe mit Lenkrad */}
      <Circle cx={c} cy={c} r={nabe} fill="url(#rad-nabe)" stroke={LILA} strokeWidth={3} />
      <Circle cx={c} cy={c} r={lenkrad} fill="none" stroke={LILA} strokeWidth={3.2} />
      <Circle cx={c} cy={c} r={lenkrad * 0.26} fill={LILA} />
      <Line x1={c - lenkrad} y1={c} x2={c - lenkrad * 0.26} y2={c} stroke={LILA} strokeWidth={3.2} strokeLinecap="round" />
      <Line x1={c + lenkrad * 0.26} y1={c} x2={c + lenkrad} y2={c} stroke={LILA} strokeWidth={3.2} strokeLinecap="round" />
      <Line x1={c} y1={c + lenkrad * 0.26} x2={c} y2={c + lenkrad} stroke={LILA} strokeWidth={3.2} strokeLinecap="round" />
    </DekoSvg>
  );
});

/** Metallring mit Lichterkranz (dreht sich nicht). */
function Kranz({ d, takt, fertig }: { d: number; takt: number; fertig: boolean }) {
  const c = d / 2;
  const rMitte = d / 2 - 11;
  return (
    <DekoSvg width={d} height={d} style={{ position: "absolute", top: 0, left: 0 }}>
      <Defs>
        <SvgVerlauf id="kranz" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#F4EEFF" />
        </SvgVerlauf>
      </Defs>
      <Circle cx={c} cy={c} r={rMitte} fill="none" stroke="url(#kranz)" strokeWidth={22} />
      <Circle cx={c} cy={c} r={d / 2 - 1} fill="none" stroke="#E1DDF0" strokeWidth={1.5} />
      <Circle cx={c} cy={c} r={d / 2 - 22} fill="none" stroke="#E1DDF0" strokeWidth={1.5} />
      {Array.from({ length: LAMPEN }, (_, i) => {
        const an = fertig ? (i + takt) % 2 === 0 : (i + takt) % 3 === 0;
        const [x, y] = xy(c, rMitte, (i * 360) / LAMPEN);
        return (
          <G key={i}>
            {an ? <Circle cx={x} cy={y} r={6.5} fill={GOLD} opacity={0.3} /> : null}
            <Circle cx={x} cy={y} r={3.6} fill={an ? GOLD : "#DCD2F7"} />
          </G>
        );
      })}
    </DekoSvg>
  );
}

/** Hervorhebung des Gewinnerfelds (steht oben unter dem Zeiger). */
function Gewinner({ d, n, versatz }: { d: number; n: number; versatz: number }) {
  const puls = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    const a = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(puls, { toValue: 1, duration: 520, easing: RNEasing.out(RNEasing.quad), useNativeDriver: true }),
        RNAnimated.timing(puls, { toValue: 0, duration: 620, easing: RNEasing.in(RNEasing.quad), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [puls]);
  const c = d / 2;
  const r = d / 2 - 22;
  const feld = 360 / n;
  const a = -versatz * feld;
  return (
    <RNAnimated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, opacity: puls.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }}>
      <DekoSvg width={d} height={d}>
        <Path d={feldPfad(c, r, a, a + feld)} fill="rgba(255,255,255,0.18)" stroke={GOLD} strokeWidth={4} strokeLinejoin="round" />
      </DekoSvg>
    </RNAnimated.View>
  );
}

/** Konfetti, das aus der Mitte oben herausplatzt. */
function Konfetti({ breite }: { breite: number }) {
  const teile = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const winkel = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
        const weite = 110 + Math.random() * (breite * 0.42);
        return { i, winkel, weite, farbe: KONFETTI_FARBEN[i % KONFETTI_FARBEN.length], dreh: (Math.random() - 0.5) * 900, w: 5 + Math.random() * 5, h: 9 + Math.random() * 7, wert: new RNAnimated.Value(0) };
      }),
    [breite],
  );
  useEffect(() => {
    RNAnimated.parallel(teile.map((t) => RNAnimated.timing(t.wert, { toValue: 1, duration: 1500 + Math.random() * 500, easing: RNEasing.out(RNEasing.quad), useNativeDriver: true }))).start();
  }, [teile]);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: breite / 2, top: 0 }}>
      {teile.map((t) => {
        const x = t.wert.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(t.winkel) * t.weite] });
        const y = t.wert.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, Math.sin(t.winkel) * t.weite * 0.7, Math.sin(t.winkel) * t.weite * 0.5 + 220] });
        return (
          <RNAnimated.View
            key={t.i}
            style={{
              position: "absolute",
              width: t.w,
              height: t.h,
              borderRadius: 2,
              backgroundColor: t.farbe,
              opacity: t.wert.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
              transform: [{ translateX: x }, { translateY: y }, { rotate: t.wert.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${t.dreh}deg`] }) }],
            }}
          />
        );
      })}
    </View>
  );
}

function KnopfHaupt({ titel, icon, onPress, aus }: { titel: string; icon: "flash" | "refresh"; onPress: () => void; aus?: boolean }) {
  return (
    <Pressable
      disabled={aus}
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={titel}
      style={({ pressed }) => [{ borderRadius: 27, opacity: aus ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, leuchten(LILA_KANTE, 0.3, 14, 6)]}
    >
      <LinearGradient colors={["#9B74FF", "#7A4BF2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 54, borderRadius: 27, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 22 }}>
        <Icon name={icon} size={18} color="#FFFFFF" />
        <Text style={{ ...lilaSchrift.titel, fontSize: 21, color: "#FFFFFF" }} numberOfLines={1}>
          {titel}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

function KnopfLeise({ titel, icon, onPress, aus }: { titel: string; icon: "refresh" | "close"; onPress: () => void; aus?: boolean }) {
  return (
    <Pressable
      disabled={aus}
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={titel}
      style={({ pressed }) => ({ height: 48, borderRadius: 24, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#E1DDF0", opacity: aus ? 0.5 : pressed ? 0.75 : 1 })}
    >
      <Icon name={icon} size={17} color={LILA} />
      <Text style={{ ...lilaSchrift.titel, fontSize: 19, color: TINTE }}>{titel}</Text>
    </Pressable>
  );
}

export function ThemenRad({
  rad,
  gastgeber,
  oben,
  unten,
  beschaeftigt = false,
  onFrage,
  onNochmal,
  onSchliessen,
}: {
  rad: LiveRad;
  gastgeber: boolean;
  /** Unterkante der Kopfzeile */
  oben: number;
  unten: number;
  beschaeftigt?: boolean;
  /** Gastgeber: Frage aus dem Thema starten */
  onFrage?: (thema: string) => void;
  onNochmal?: () => void;
  /** Gastgeber: Rad schließen – Zuschauer: nur bei sich ausblenden */
  onSchliessen: () => void;
}) {
  const { width, height } = useFenster();
  const d = Math.max(220, Math.min(width - 56, 340, height - oben - unten - 330));
  const n = rad.themen.length;
  const feld = 360 / n;
  const ziel = rad.ziel;
  const versatz = rad.versatz;
  const runden = rad.runden;
  const thema = rad.themen[ziel] ?? rad.themen[0];

  const p = useSharedValue(radFortschritt(rad));
  const strahlen = useSharedValue(0);
  const auftritt = useSharedValue(0);
  const [fertig, setFertig] = useState(() => radFortschritt(rad) >= 1);
  const [takt, setTakt] = useState(0);
  const letzterTick = useRef(0);

  function landen() {
    setFertig(true);
    erfolg();
  }
  function tick() {
    const jetzt = Date.now();
    if (jetzt - letzterTick.current < 55) return;
    letzterTick.current = jetzt;
    tippen();
  }

  // Neues Rad: von der aktuellen Stelle (nach Serverzeit) bis zum Stehen.
  useEffect(() => {
    const p0 = radFortschritt(rad);
    cancelAnimation(p);
    p.value = p0;
    setFertig(p0 >= 1);
    if (p0 >= 1) return;
    const warten = Math.max(0, radBisStart(rad));
    const dauer = rad.dauer * 1000 * (1 - p0);
    p.value = withDelay(
      warten,
      withTiming(1, { duration: dauer, easing: Easing.linear }, (ok) => {
        if (ok) scheduleOnRN(landen);
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rad.id]);

  useEffect(() => {
    auftritt.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.back(1.4)) });
    strahlen.value = withRepeat(withTiming(360, { duration: 24000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(strahlen);
  }, [auftritt, strahlen]);

  // Lichterkranz: läuft beim Drehen, blinkt im Wechsel, wenn das Rad steht.
  useEffect(() => {
    const t = setInterval(() => setTakt((x) => x + 1), fertig ? 420 : 110);
    return () => clearInterval(t);
  }, [fertig]);

  // Zeiger schlägt an jedem Feld an – mit leichtem Klick.
  useAnimatedReaction(
    () => Math.floor(radWinkel(n, ziel, versatz, runden, p.value) / feld),
    (jetzt, vorher) => {
      if (vorher !== null && jetzt !== vorher && p.value < 1) scheduleOnRN(tick);
    },
  );

  const scheibe = useAnimatedStyle(() => ({ transform: [{ rotate: `${radWinkel(n, ziel, versatz, runden, p.value)}deg` }] }));
  const zeiger = useAnimatedStyle(() => {
    const w = radWinkel(n, ziel, versatz, runden, p.value);
    const u = (((w % feld) + feld) % feld) / feld;
    const anschlag = Math.max(0, 1 - u / 0.18);
    return { transform: [{ rotate: `${-22 * anschlag * anschlag}deg` }] };
  });
  const strahlenStil = useAnimatedStyle(() => ({ transform: [{ rotate: `${strahlen.value}deg` }] }));
  const rein = useAnimatedStyle(() => ({ opacity: Math.min(1, auftritt.value * 1.4), transform: [{ scale: 0.85 + 0.15 * auftritt.value }] }));

  // Ergebnis ploppt auf
  const ergebnis = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (!fertig) {
      ergebnis.setValue(0);
      return;
    }
    RNAnimated.spring(ergebnis, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [fertig, ergebnis]);

  const strahlD = d * 1.9;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Heller lila Grund, damit das Rad die Bühne hat */}
      <ClipsGrund />

      <View pointerEvents="box-none" style={{ flex: 1, paddingTop: oben + 10, alignItems: "center" }}>
        {/* Kopf */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: "#EEE6FF" }}>
          <Icon name="sparkles" size={13} color={LILA} />
          <Text style={{ ...lilaSchrift.textFett, fontSize: 12, letterSpacing: 1.4, color: LILA_KANTE }}>THEMENRAD</Text>
        </View>
        <Text style={{ ...lilaSchrift.titel, fontSize: 30, color: TINTE, marginTop: 8, textAlign: "center" }}>{fertig ? "Das Thema steht!" : "Welches Thema kommt dran?"}</Text>

        {/* Rad */}
        <Reanimated.View style={[{ width: d, height: d + 26, marginTop: 18, alignItems: "center" }, rein]}>
          {/* Strahlen und Leuchten dahinter */}
          <Reanimated.View pointerEvents="none" style={[{ position: "absolute", top: 26 + d / 2 - strahlD / 2, left: d / 2 - strahlD / 2, width: strahlD, height: strahlD, opacity: 0.55 }, strahlenStil]}>
            <DekoSvg width={strahlD} height={strahlD}>
              <Defs>
                <RadialGradient id="rad-schein" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={LILA} stopOpacity={0.35} />
                  <Stop offset="0.45" stopColor={LILA} stopOpacity={0.1} />
                  <Stop offset="1" stopColor={LILA} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={strahlD / 2} cy={strahlD / 2} r={strahlD / 2} fill="url(#rad-schein)" />
              {Array.from({ length: 14 }, (_, i) => {
                const a = (i * 360) / 14;
                const s = strahlD / 2;
                const p1 = punkt(s, s, a - 3.2);
                const p2 = punkt(s, s, a + 3.2);
                return <Polygon key={i} points={`${s},${s} ${p1} ${p2}`} fill={LILA} opacity={0.05} />;
              })}
            </DekoSvg>
          </Reanimated.View>
          <View style={{ position: "absolute", top: 26, left: 0, width: d, height: d, borderRadius: d / 2, ...leuchten(LILA_KANTE, 0.22, 24, 12) }}>
            <Reanimated.View style={[{ width: d, height: d }, scheibe]}>
              <Scheibe themen={rad.themen} d={d} />
            </Reanimated.View>
            {fertig ? <Gewinner d={d} n={n} versatz={versatz} /> : null}
            <Kranz d={d} takt={takt} fertig={fertig} />
          </View>
          {/* Zeiger oben */}
          <Reanimated.View pointerEvents="none" style={[{ position: "absolute", top: 4, width: 40, height: 52, alignItems: "center", transformOrigin: "50% 22%" }, zeiger]}>
            <DekoSvg width={40} height={52}>
              <Defs>
                <SvgVerlauf id="zeiger" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#9B74FF" />
                  <Stop offset="1" stopColor="#7A4BF2" />
                </SvgVerlauf>
              </Defs>
              <Path d="M20 50 L6 18 A15 15 0 1 1 34 18 Z" fill="url(#zeiger)" stroke="#FFFFFF" strokeWidth={2.5} strokeLinejoin="round" />
              <Circle cx={20} cy={14} r={5} fill="#FFFFFF" />
            </DekoSvg>
          </Reanimated.View>
          {fertig ? <Konfetti breite={d} /> : null}
        </Reanimated.View>

        {/* Ergebnis */}
        <View style={{ marginTop: 18, minHeight: 74, alignItems: "center" }}>
          {fertig ? null : (
            <Text style={{ ...lilaSchrift.textHalb, fontSize: 14, color: TINTE2, marginTop: 10, textAlign: "center" }}>{gastgeber ? "Alle sehen das Rad gleichzeitig drehen …" : "Gleich steht das Thema fest …"}</Text>
          )}
          <RNAnimated.View style={{ alignItems: "center", opacity: ergebnis, transform: [{ scale: ergebnis.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
            {fertig ? (
              <>
                <Text style={{ ...lilaSchrift.titel, fontSize: 44, letterSpacing: 0.5, color: LILA_KANTE, textAlign: "center" }}>{radName(thema).toUpperCase()}</Text>
                <Text style={{ ...lilaSchrift.textHalb, fontSize: 14, color: TINTE2, marginTop: 2, textAlign: "center" }}>{gastgeber ? "Starte eine Frage aus diesem Thema" : "Gleich kommt eine Frage aus diesem Thema"}</Text>
              </>
            ) : null}
          </RNAnimated.View>
        </View>
      </View>

      {/* Knöpfe unten */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: unten, gap: 10 }}>
        {gastgeber && fertig ? (
          <>
            <KnopfHaupt titel={`Frage aus „${radName(thema)}“`} icon="flash" aus={beschaeftigt} onPress={() => onFrage?.(thema)} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <KnopfLeise titel="Nochmal drehen" icon="refresh" aus={beschaeftigt} onPress={() => onNochmal?.()} />
              </View>
              <KnopfLeise titel="Schließen" icon="close" aus={beschaeftigt} onPress={onSchliessen} />
            </View>
          </>
        ) : !gastgeber && fertig ? (
          <View style={{ alignItems: "center" }}>
            <KnopfLeise titel="Ausblenden" icon="close" onPress={onSchliessen} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
