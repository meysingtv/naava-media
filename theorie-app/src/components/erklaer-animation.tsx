import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";

import { Icon } from "@/components/icon";
import { ANDERE, ASPHALT, Auto, DU, GEHWEG, GRUND, KreisverkehrLeer, Kreuzung, MARKIERUNG, NEUTRAL, Radfahrer, RAND as BORDSTEIN, Schild } from "@/components/lagen";
import { kartenFlaeche } from "@/components/ui";
import { useFarbwelt } from "@/lib/darstellung";
import { lageZurZeit, schrittBei, zeitplan, type Akteur, type ErklaerAnimation, type Punkt, type Zeitplan } from "@/lib/erklaer-animationen";
import { tippen } from "@/lib/haptik";
import { farben, leuchten, mitDeckkraft, schrift, svgSchrift, verlauf } from "@/lib/theme";

// Spieler für die Erklär-Animationen (Daten in lib/erklaer-animationen.ts):
// oben der Lageplan, in dem die Fahrzeuge Schritt für Schritt fahren, darunter
// der Text zum Schritt und eine Leiste zum Springen. Antippen hält an.

const FARBE: Record<NonNullable<Akteur["farbe"]>, string> = { du: DU, andere: ANDERE, neutral: NEUTRAL };
const BLAULICHT = "#2F7BFF";
const BLINKER = "#FFB000";

/** Halbe Länge und Breite je Art – für Ringe, Nummern und Hinweise. */
const HALB: Record<Akteur["art"], [number, number]> = { auto: [20, 11.5], rad: [17, 9], kind: [11, 6], einsatz: [22, 12] };

const r2 = (n: number) => Math.round(n * 100) / 100;

function akteurFarbe(ak: Akteur): string {
  if (ak.art === "einsatz") return BLAULICHT;
  if (ak.art === "auto") return FARBE[ak.farbe ?? "andere"];
  return ANDERE;
}

// ---------------------------------------------------------------------------
// Uhr: läuft mit requestAnimationFrame, kann anhalten und springen
// ---------------------------------------------------------------------------

function useUhr(gesamt: number) {
  const [t, setT] = useState(0);
  const [laeuft, setLaeuft] = useState(true);
  const zeit = useRef(0);

  useEffect(() => {
    if (!laeuft) return;
    let id = 0;
    let vorher: number | null = null;
    const takt = (jetzt: number) => {
      // Große Lücken (App im Hintergrund) nicht nachholen
      if (vorher != null) zeit.current = Math.min(gesamt, zeit.current + Math.min(0.1, (jetzt - vorher) / 1000));
      vorher = jetzt;
      setT(zeit.current);
      if (zeit.current >= gesamt) {
        setLaeuft(false);
        return;
      }
      id = requestAnimationFrame(takt);
    };
    id = requestAnimationFrame(takt);
    return () => cancelAnimationFrame(id);
  }, [laeuft, gesamt]);

  const springen = useCallback(
    (neu: number) => {
      zeit.current = Math.max(0, Math.min(gesamt, neu));
      setT(zeit.current);
      setLaeuft(true);
    },
    [gesamt],
  );

  const umschalten = useCallback(() => {
    if (zeit.current >= gesamt) springen(0);
    else setLaeuft((l) => !l);
  }, [gesamt, springen]);

  return { t, laeuft, umschalten, springen };
}

// ---------------------------------------------------------------------------
// Untergründe (wie die Lagepläne, nur ohne Fahrzeuge)
// ---------------------------------------------------------------------------

function Radweg() {
  return (
    <G>
      <Rect x={188} y={150} width={14} height={70} fill="rgba(200,16,46,0.45)" />
      <Rect x={188} y={0} width={14} height={80} fill="rgba(200,16,46,0.45)" />
      <G stroke={MARKIERUNG} strokeWidth={1.6} strokeDasharray="5 5">
        <Line x1={188} y1={80} x2={188} y2={150} />
        <Line x1={202} y1={80} x2={202} y2={150} />
      </G>
    </G>
  );
}

function Autobahn() {
  return (
    <G>
      <Rect x={0} y={0} width={300} height={220} fill={GRUND} />
      <Rect x={58} y={0} width={196} height={220} fill={ASPHALT} />
      <Rect x={212} y={0} width={42} height={220} fill="#30343C" />
      <G stroke={MARKIERUNG} strokeWidth={2.4}>
        <Line x1={61} y1={0} x2={61} y2={220} />
        <Line x1={211} y1={0} x2={211} y2={220} />
      </G>
      <G stroke={MARKIERUNG} strokeWidth={2} strokeDasharray="14 12">
        <Line x1={110} y1={0} x2={110} y2={220} />
        <Line x1={160} y1={0} x2={160} y2={220} />
      </G>
      <SvgText x={233} y={116} fill="#5A6380" fontSize={9} fontFamily={svgSchrift.text} textAnchor="middle" transform="rotate(-90 233 112)">
        Seitenstreifen
      </SvgText>
    </G>
  );
}

function Schulstrasse() {
  return (
    <G>
      <Rect x={0} y={0} width={300} height={220} fill={GRUND} />
      <Rect x={0} y={40} width={300} height={28} fill={GEHWEG} />
      <Rect x={0} y={152} width={300} height={40} fill={GEHWEG} />
      <Rect x={0} y={70} width={300} height={80} fill={ASPHALT} />
      <G stroke={BORDSTEIN} strokeWidth={2}>
        <Line x1={0} y1={70} x2={300} y2={70} />
        <Line x1={0} y1={150} x2={300} y2={150} />
      </G>
      <Line x1={0} y1={110} x2={300} y2={110} stroke={MARKIERUNG} strokeWidth={2} strokeDasharray="12 10" />
      {/* Haltestelle */}
      <Line x1={262} y1={186} x2={262} y2={170} stroke="#AEB6C8" strokeWidth={2} />
      <Circle cx={262} cy={164} r={10} fill={farben.schildGelb} stroke="#1E7F4F" strokeWidth={2} />
      <SvgText x={262} y={168.5} fill="#1E7F4F" fontSize={12} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle">
        H
      </SvgText>
    </G>
  );
}

function Grund({ art }: { art: ErklaerAnimation["grund"] }) {
  switch (art) {
    case "kreuzung":
      return <Kreuzung />;
    case "kreuzung_rad":
      return (
        <G>
          <Kreuzung />
          <Radweg />
        </G>
      );
    case "kreisverkehr":
      return (
        <G>
          <KreisverkehrLeer />
          <Schild zeichen="z215" x={198} y={150} />
          <Schild zeichen="z205" x={228} y={150} />
        </G>
      );
    case "autobahn":
      return <Autobahn />;
    case "schulbus":
      return <Schulstrasse />;
  }
}

/** Schulbus mit Warnblinklicht. */
function Bus({ an }: { an: boolean }) {
  return (
    <G>
      <Rect x={168} y={115} width={112} height={31} rx={6} fill="#FFC857" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Rect key={i} x={176 + i * 19} y={119} width={13} height={6} rx={1.5} fill="#0B0C0F" opacity={0.55} />
      ))}
      <Rect x={172} y={136} width={100} height={4} rx={2} fill="#E5A92E" />
      {[
        [170, 117],
        [278, 117],
        [170, 144],
        [278, 144],
      ].map(([x, y]) => (
        <G key={`${x}-${y}`}>
          <Circle cx={x} cy={y} r={8} fill={farben.orange} opacity={an ? 0.4 : 0.06} />
          <Circle cx={x} cy={y} r={3} fill={an ? "#FFB066" : "#8A3E1C"} />
        </G>
      ))}
    </G>
  );
}

// ---------------------------------------------------------------------------
// Figuren und Markierungen
// ---------------------------------------------------------------------------

function Kind({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      <Circle cx={0} cy={-6} r={4.5} fill="#F2C9A5" />
      <Rect x={-5} y={-1} width={10} height={12} rx={4} fill={ANDERE} />
    </G>
  );
}

function Einsatz({ x, y, winkel, links }: { x: number; y: number; winkel: number; links: boolean }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${winkel})`}>
      <Circle cx={-5.5} cy={-16} r={12} fill={BLAULICHT} opacity={links ? 0.34 : 0.06} />
      <Circle cx={5.5} cy={-16} r={12} fill={BLAULICHT} opacity={links ? 0.06 : 0.34} />
      <Rect x={-12} y={-20} width={24} height={44} rx={5} fill="#E9EDF5" />
      <Rect x={-8} y={-12} width={16} height={8} rx={2} fill="#0B0C0F" opacity={0.45} />
      <Rect x={-12} y={6} width={24} height={4.5} fill="#E5392C" opacity={0.85} />
      <Rect x={-9} y={-18} width={7} height={3.5} rx={1} fill={links ? "#9CC4FF" : BLAULICHT} />
      <Rect x={2} y={-18} width={7} height={3.5} rx={1} fill={links ? BLAULICHT : "#9CC4FF"} />
    </G>
  );
}

function Figur({ ak, x, y, winkel, t }: { ak: Akteur; x: number; y: number; winkel: number; t: number }) {
  switch (ak.art) {
    case "auto":
      return <Auto x={x} y={y} winkel={winkel} farbe={FARBE[ak.farbe ?? "andere"]} />;
    case "rad":
      return (
        <G transform={`rotate(${winkel} ${x} ${y})`}>
          <Radfahrer x={x} y={y} />
        </G>
      );
    case "kind":
      return <Kind x={x} y={y} />;
    case "einsatz":
      return <Einsatz x={x} y={y} winkel={winkel} links={(t * 2.6) % 1 < 0.5} />;
  }
}

/** Blinker vorn und hinten an einer Seite. */
function Blinker({ ak, x, y, winkel, seite }: { ak: Akteur; x: number; y: number; winkel: number; seite: "links" | "rechts" }) {
  const [l, b] = HALB[ak.art];
  const sx = (seite === "links" ? -1 : 1) * (b - 1);
  return (
    <G transform={`translate(${x} ${y}) rotate(${winkel})`}>
      {[-(l - 2), l - 2].map((sy) => (
        <G key={sy}>
          <Circle cx={sx} cy={sy} r={6.5} fill={BLINKER} opacity={0.4} />
          <Circle cx={sx} cy={sy} r={2.6} fill="#FFD27A" />
        </G>
      ))}
    </G>
  );
}

/** Sichtkegel vom Fahrerplatz nach rechts bis schräg hinten. */
function Schulterblick({ x, y, winkel, staerke }: { x: number; y: number; winkel: number; staerke: number }) {
  const r = 66;
  const a0 = (-25 * Math.PI) / 180;
  const a1 = (70 * Math.PI) / 180;
  const ox = -3;
  const oy = -3;
  const d = `M${ox},${oy} L${r2(ox + r * Math.cos(a0))},${r2(oy + r * Math.sin(a0))} A${r},${r} 0 0 1 ${r2(ox + r * Math.cos(a1))},${r2(oy + r * Math.sin(a1))} Z`;
  return (
    <G transform={`translate(${x} ${y}) rotate(${winkel})`}>
      <Path d={d} fill={DU} opacity={0.1 + 0.14 * staerke} />
      <Path d={d} fill="none" stroke={DU} strokeWidth={1.5} strokeDasharray="3 4" opacity={0.65} />
    </G>
  );
}

function Nummer({ x, y, n, farbe, groesse }: { x: number; y: number; n: number; farbe: string; groesse: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${groesse})`}>
      <Circle r={11.5} fill="#FFFFFF" />
      <Circle r={9.5} fill={farbe} />
      <SvgText y={4.2} fontSize={12} fontFamily={svgSchrift.fett} fill="#FFFFFF" textAnchor="middle">
        {n}
      </SvgText>
    </G>
  );
}

function Hinweis({ x, y, text, deckkraft }: { x: number; y: number; text: string; deckkraft: number }) {
  const w = text.length * 6 + 20;
  const px = Math.min(300 - w / 2 - 4, Math.max(w / 2 + 4, x));
  return (
    <G transform={`translate(${r2(px)} ${r2(y)})`} opacity={deckkraft}>
      <Rect x={-w / 2} y={-10.5} width={w} height={21} rx={10.5} fill="#FFFFFF" />
      <SvgText y={3.9} fontSize={10.5} fontFamily={svgSchrift.fett} fill="#14171B" textAnchor="middle">
        {text}
      </SvgText>
    </G>
  );
}

/** Platz über einem Akteur (oder darunter, wenn oben kein Platz ist). */
function ueber(ak: Akteur, x: number, y: number, winkel: number, abstand: number): { x: number; y: number } {
  const [l, b] = HALB[ak.art];
  const w = (winkel * Math.PI) / 180;
  const h = Math.abs(Math.cos(w)) * l + Math.abs(Math.sin(w)) * b + abstand;
  return { x: Math.min(286, Math.max(14, x)), y: y - h < 14 ? y + h : y - h };
}

// ---------------------------------------------------------------------------
// Geplanter Weg: gepunktet vom Fahrzeug bis zum Bildrand, mit Spitze
// ---------------------------------------------------------------------------

const KASTEN = { x0: 8, y0: 8, x1: 292, y1: 212 };

function drin(p: Punkt): boolean {
  return p[0] >= KASTEN.x0 && p[0] <= KASTEN.x1 && p[1] >= KASTEN.y0 && p[1] <= KASTEN.y1;
}

/** Punkt auf a → b am Kastenrand (a liegt drin, b draußen). */
function amRand(a: Punkt, b: Punkt): Punkt {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let k = 1;
  if (dx > 0) k = Math.min(k, (KASTEN.x1 - a[0]) / dx);
  if (dx < 0) k = Math.min(k, (KASTEN.x0 - a[0]) / dx);
  if (dy > 0) k = Math.min(k, (KASTEN.y1 - a[1]) / dy);
  if (dy < 0) k = Math.min(k, (KASTEN.y0 - a[1]) / dy);
  k = Math.max(0, k);
  return [a[0] + dx * k, a[1] + dy * k];
}

function sichtbar(punkte: Punkt[]): Punkt[] {
  let i = 0;
  while (i < punkte.length && !drin(punkte[i])) i++;
  if (i >= punkte.length) return [];
  const aus: Punkt[] = i > 0 ? [amRand(punkte[i], punkte[i - 1])] : [];
  for (let j = i; j < punkte.length; j++) {
    if (drin(punkte[j])) aus.push(punkte[j]);
    else {
      aus.push(amRand(punkte[j - 1], punkte[j]));
      break;
    }
  }
  return aus;
}

function Restweg({ punkte, farbe }: { punkte: Punkt[]; farbe: string }) {
  const p = sichtbar(punkte);
  if (p.length < 2) return null;
  const [ax, ay] = p[p.length - 2];
  const [bx, by] = p[p.length - 1];
  const laenge = p.reduce((s, q, i) => (i === 0 ? 0 : s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1])), 0);
  if (laenge < 14) return null;
  const winkel = (Math.atan2(bx - ax, -(by - ay)) * 180) / Math.PI;
  const d = p.map((q, i) => `${i === 0 ? "M" : "L"}${r2(q[0])},${r2(q[1])}`).join(" ");
  return (
    <G opacity={0.9}>
      <Path d={d} stroke={farbe} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 7" />
      <Polygon points="0,-8 7,5 -7,5" fill={farbe} transform={`translate(${r2(bx)} ${r2(by)}) rotate(${r2(winkel)})`} />
    </G>
  );
}

// ---------------------------------------------------------------------------
// Szene zu einem Zeitpunkt
// ---------------------------------------------------------------------------

function Szene({ a, plan, t, grund }: { a: ErklaerAnimation; plan: Zeitplan; t: number; grund: ReactElement }) {
  const i = schrittBei(plan, t);
  const schritt = a.schritte[i];
  const imSchritt = Math.max(0, t - plan.starts[i]);
  const puls = 0.5 + 0.5 * Math.sin(t * 5.5);
  const blinkt = (t * 1.5) % 1 < 0.55;

  const lagen = new Map(
    a.akteure.map((ak) => {
      const l = lageZurZeit(plan, ak, t);
      return [ak.id, { ...l, x: r2(l.x), y: r2(l.y), winkel: r2(l.winkel) }] as const;
    }),
  );
  // Nummern bleiben ab dem Schritt stehen, in dem sie dazukommen.
  const nummern = new Map<string, { n: number; seit: number }>();
  a.schritte.slice(0, i + 1).forEach((s, k) => s.nummer?.forEach((n) => nummern.set(n.akteur, { n: n.n, seit: k })));
  const akteur = (id: string) => a.akteure.find((ak) => ak.id === id);
  const imBild = (x: number, y: number) => x > -16 && x < 316 && y > -16 && y < 236;

  return (
    <G>
      {grund}
      {a.grund === "schulbus" ? <Bus an={blinkt} /> : null}

      {a.akteure
        .filter((ak) => ak.wegZeigen)
        .map((ak) => {
          const l = lagen.get(ak.id)!;
          return <Restweg key={`w-${ak.id}`} punkte={[[l.x, l.y], ...ak.weg.slice(l.naechster)]} farbe={akteurFarbe(ak)} />;
        })}

      {schritt.schulterblick
        ? (() => {
            const l = lagen.get(schritt.schulterblick);
            return l ? <Schulterblick x={l.x} y={l.y} winkel={l.winkel} staerke={puls} /> : null;
          })()
        : null}

      {(schritt.hervor ?? []).map((id) => {
        const ak = akteur(id);
        const l = lagen.get(id);
        if (!ak || !l) return null;
        const farbe = ak.art === "auto" && ak.farbe === "neutral" ? "#FFFFFF" : akteurFarbe(ak);
        return (
          <Circle
            key={`h-${id}`}
            cx={l.x}
            cy={l.y}
            r={r2(HALB[ak.art][0] + 8 + 3 * puls)}
            fill={farbe}
            fillOpacity={0.12}
            stroke={farbe}
            strokeWidth={2.2}
            strokeOpacity={r2(0.45 + 0.4 * puls)}
          />
        );
      })}

      {a.akteure.map((ak) => {
        const l = lagen.get(ak.id)!;
        if (!imBild(l.x, l.y)) return null;
        return <Figur key={ak.id} ak={ak} x={l.x} y={l.y} winkel={l.winkel} t={t} />;
      })}

      {blinkt
        ? (schritt.blinker ?? []).map((b) => {
            const ak = akteur(b.akteur);
            const l = lagen.get(b.akteur);
            return ak && l ? <Blinker key={`b-${b.akteur}`} ak={ak} x={l.x} y={l.y} winkel={l.winkel} seite={b.seite} /> : null;
          })
        : null}

      {[...nummern].map(([id, { n, seit }]) => {
        const ak = akteur(id);
        const l = lagen.get(id);
        if (!ak || !l || !imBild(l.x, l.y)) return null;
        const p = ueber(ak, l.x, l.y, l.winkel, 15);
        // Neue Nummer springt kurz auf
        const s = seit === i ? Math.min(1, imSchritt / 0.35) : 1;
        const groesse = s < 1 ? 0.5 + 0.5 * s + 0.3 * Math.sin(s * Math.PI) : 1;
        return <Nummer key={`n-${id}`} x={r2(p.x)} y={r2(p.y)} n={n} farbe={akteurFarbe(ak)} groesse={r2(groesse)} />;
      })}

      {schritt.schild
        ? (() => {
            const ak = akteur(schritt.schild.akteur);
            const l = lagen.get(schritt.schild.akteur);
            if (!ak || !l || !imBild(l.x, l.y)) return null;
            const p = ueber(ak, l.x, l.y, l.winkel, nummern.has(ak.id) ? 40 : 17);
            return <Hinweis x={p.x} y={p.y} text={schritt.schild.text} deckkraft={Math.min(1, imSchritt / 0.3)} />;
          })()
        : null}
    </G>
  );
}

// ---------------------------------------------------------------------------
// Spieler
// ---------------------------------------------------------------------------

/** Text des Schritts – blendet bei jedem Wechsel weich ein. */
function SchrittText({ text, farbe }: { text: string; farbe: string }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    a.setValue(0);
    const anim = Animated.timing(a, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [text, a]);
  return (
    <Animated.Text
      style={{
        ...schrift.textHalb,
        fontSize: 17,
        lineHeight: 23,
        color: farbe,
        minHeight: 69,
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
      }}
    >
      {text}
    </Animated.Text>
  );
}

export function ErklaerAnimationSpieler({ animation, breite, merke }: { animation: ErklaerAnimation; breite: number; merke?: string }) {
  const f = useFarbwelt();
  const plan = useMemo(() => zeitplan(animation), [animation]);
  const grund = useMemo(() => <Grund art={animation.grund} />, [animation.grund]);
  const { t, laeuft, umschalten, springen } = useUhr(plan.gesamt);
  const hoehe = Math.round((breite * 220) / 300);
  const i = schrittBei(plan, t);
  const anzahl = animation.schritte.length;
  const fertig = t >= plan.gesamt - 1e-6;
  const spur = f.hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.12)";

  return (
    <View style={{ gap: 14 }}>
      <Pressable
        onPress={() => {
          tippen();
          umschalten();
        }}
        accessibilityRole="button"
        accessibilityLabel={fertig ? "Nochmal abspielen" : laeuft ? "Anhalten" : "Weiter abspielen"}
        style={[{ width: breite, height: hoehe, borderRadius: 24, backgroundColor: GRUND }, leuchten("#000000", f.hell ? 0.18 : 0.4, 16, 6)]}
      >
        <View style={{ flex: 1, borderRadius: 24, overflow: "hidden" }}>
          {/* Auf dem iPhone fängt <Svg> sonst die Berührung ab */}
          <View pointerEvents="none">
            <Svg width={breite} height={hoehe} viewBox="0 0 300 220">
              <Szene a={animation} plan={plan} t={t} grund={grund} />
            </Svg>
          </View>
          {!laeuft ? (
            <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(3,5,7,0.38)" }}>
              <View style={[{ width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: farben.orange }, leuchten(farben.orange, 0.55, 14, 0)]}>
                <Icon name={fertig ? "refresh" : "play"} size={28} color="#FFFFFF" style={fertig ? undefined : { marginLeft: 3 }} />
              </View>
              {fertig ? <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#FFFFFF", marginTop: 10 }}>Nochmal ansehen</Text> : null}
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={[{ borderRadius: 22, padding: 16, gap: 10 }, kartenFlaeche(f)]}>
        <Text style={{ ...schrift.textHalb, fontSize: 12, letterSpacing: 0.8, color: f.orange, fontVariant: ["tabular-nums"] }}>{`SCHRITT ${i + 1} VON ${anzahl}`}</Text>
        <SchrittText text={animation.schritte[i].text} farbe={f.text} />

        {/* Leiste: ein Abschnitt je Schritt, antippen springt dorthin */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 2 }}>
          <Pressable
            onPress={() => {
              tippen();
              umschalten();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={fertig ? "Nochmal abspielen" : laeuft ? "Anhalten" : "Abspielen"}
            style={({ pressed }) => [{ width: 40, height: 40, borderRadius: 20, overflow: "hidden", transform: [{ scale: pressed ? 0.92 : 1 }] }, leuchten(f.orange, f.hell ? 0.3 : 0.45, 8, 2)]}
          >
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: verlauf.knopf[1] }}>
              <Icon name={fertig ? "refresh" : laeuft ? "pause" : "play"} sf={laeuft && !fertig ? "pause.fill" : undefined} size={18} color="#FFFFFF" style={laeuft || fertig ? undefined : { marginLeft: 2 }} />
            </View>
          </Pressable>
          <View style={{ flex: 1, flexDirection: "row", gap: 4 }}>
            {animation.schritte.map((_, k) => {
              const start = plan.starts[k];
              const ende = k + 1 < anzahl ? plan.starts[k + 1] : plan.gesamt;
              const anteil = Math.max(0, Math.min(1, (t - start) / (ende - start)));
              return (
                <Pressable
                  key={k}
                  onPress={() => {
                    tippen();
                    springen(start);
                  }}
                  hitSlop={{ top: 14, bottom: 14 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Schritt ${k + 1}`}
                  style={{ flex: ende - start, height: 6, borderRadius: 3, backgroundColor: spur, overflow: "hidden" }}
                >
                  <View style={{ width: `${anteil * 100}%`, height: "100%", borderRadius: 3, backgroundColor: f.orange }} />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {merke && (fertig || i === anzahl - 1) ? (
        <View style={[{ borderRadius: 22, padding: 16, gap: 6, flexDirection: "row" }, { backgroundColor: mitDeckkraft(f.hell ? "#23A548" : "#4ED053", f.hell ? 0.1 : 0.12), borderWidth: 1, borderColor: mitDeckkraft(f.hell ? "#23A548" : "#4ED053", 0.3) }]}>
          <Icon name="bulb-outline" size={19} color={f.hell ? "#23A548" : "#4ED053"} style={{ marginTop: 1 }} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ ...schrift.textHalb, fontSize: 12, letterSpacing: 0.8, color: f.hell ? "#23A548" : "#4ED053" }}>MERKE</Text>
            <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 21, color: f.text2 }}>{merke}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
