import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";

import type { LageKey } from "@/lib/fragen";
import { farben, schrift } from "@/lib/theme";
import { ZeichenGrafik } from "./zeichen";

// Lagepläne von oben (viewBox 300 × 220): du bist immer das blaue Auto,
// andere Verkehrsteilnehmer sind orange. Rechtsverkehr.

export const DU = farben.blau;
export const ANDERE = farben.orange;
export const NEUTRAL = "#6B7590";
export const ASPHALT = farben.asphalt;
export const RAND = farben.asphaltRand;
export const GRUND = farben.gelaende;
export const GEHWEG = "#141D35";
export const MARKIERUNG = "rgba(255,255,255,0.6)";

/** Auto von oben, Front zeigt bei Winkel 0 nach oben. */
export function Auto({ x, y, winkel = 0, farbe }: { x: number; y: number; winkel?: number; farbe: string }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${winkel})`}>
      <Rect x={-11.5} y={-20} width={23} height={40} rx={6.5} fill={farbe} />
      <Path d="M-8.5,-6 L8.5,-6 L6.8,-13 L-6.8,-13 Z" fill="#0A0F1E" opacity={0.6} />
      <Path d="M-7.5,11 L7.5,11 L6.2,16 L-6.2,16 Z" fill="#0A0F1E" opacity={0.5} />
      <Rect x={-8} y={-5} width={16} height={15} rx={2.5} fill="#FFFFFF" opacity={0.14} />
      <Rect x={-9.5} y={-20} width={5} height={2.2} rx={1} fill="#FFF4D6" />
      <Rect x={4.5} y={-20} width={5} height={2.2} rx={1} fill="#FFF4D6" />
    </G>
  );
}

function Pfeilspitze({ x, y, winkel, farbe }: { x: number; y: number; winkel: number; farbe: string }) {
  return <Polygon points="0,-8 7,5 -7,5" fill={farbe} transform={`translate(${x} ${y}) rotate(${winkel})`} />;
}

/** Fahrweg als Linie mit Spitze; `winkel` ist die Richtung am Ende (0 = nach oben). */
export function Weg({ d, farbe, spitze }: { d: string; farbe: string; spitze: { x: number; y: number; winkel: number } }) {
  return (
    <G>
      <Path d={d} stroke={farbe} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 7" opacity={0.95} />
      <Pfeilspitze x={spitze.x} y={spitze.y} winkel={spitze.winkel} farbe={farbe} />
    </G>
  );
}

function Schild({ zeichen, x, y, groesse = 26 }: { zeichen: "z205" | "z215" | "z306"; x: number; y: number; groesse?: number }) {
  return (
    <G>
      <Line x1={x + groesse / 2} y1={y + groesse} x2={x + groesse / 2} y2={y + groesse + 10} stroke="#AEB6C8" strokeWidth={2} />
      <G transform={`translate(${x} ${y}) scale(${groesse / 100})`}>
        <ZeichenGrafik zeichen={zeichen} />
      </G>
    </G>
  );
}

/** Kreuzung zweier zweispuriger Straßen, Mitte bei (150, 115). */
export function Kreuzung() {
  return (
    <G>
      <Rect x={0} y={0} width={300} height={220} fill={GRUND} />
      {/* Gehwege an den Ecken */}
      <Rect x={0} y={0} width={107} height={72} rx={10} fill={GEHWEG} />
      <Rect x={193} y={0} width={107} height={72} rx={10} fill={GEHWEG} />
      <Rect x={0} y={158} width={107} height={62} rx={10} fill={GEHWEG} />
      <Rect x={193} y={158} width={107} height={62} rx={10} fill={GEHWEG} />
      {/* Fahrbahnen */}
      <Rect x={115} y={0} width={70} height={220} fill={ASPHALT} />
      <Rect x={0} y={80} width={300} height={70} fill={ASPHALT} />
      {/* Bordsteinkanten */}
      <G stroke={RAND} strokeWidth={2}>
        <Line x1={115} y1={0} x2={115} y2={80} />
        <Line x1={185} y1={0} x2={185} y2={80} />
        <Line x1={115} y1={150} x2={115} y2={220} />
        <Line x1={185} y1={150} x2={185} y2={220} />
        <Line x1={0} y1={80} x2={115} y2={80} />
        <Line x1={185} y1={80} x2={300} y2={80} />
        <Line x1={0} y1={150} x2={115} y2={150} />
        <Line x1={185} y1={150} x2={300} y2={150} />
      </G>
      {/* Leitlinien */}
      <G stroke={MARKIERUNG} strokeWidth={2} strokeDasharray="10 9">
        <Line x1={150} y1={0} x2={150} y2={76} />
        <Line x1={150} y1={154} x2={150} y2={220} />
        <Line x1={0} y1={115} x2={111} y2={115} />
        <Line x1={189} y1={115} x2={300} y2={115} />
      </G>
    </G>
  );
}

function RechtsVorLinks() {
  return (
    <G>
      <Kreuzung />
      <Weg d="M167,160 L167,46" farbe={DU} spitze={{ x: 167, y: 40, winkel: 0 }} />
      <Weg d="M226,97 L78,97" farbe={ANDERE} spitze={{ x: 72, y: 97, winkel: -90 }} />
      <Auto x={167} y={184} farbe={DU} />
      <Auto x={252} y={97} winkel={-90} farbe={ANDERE} />
    </G>
  );
}

function LinksAbbiegen() {
  return (
    <G>
      <Kreuzung />
      <Weg d="M167,160 L167,134 Q167,97 128,97 L64,97" farbe={DU} spitze={{ x: 58, y: 97, winkel: -90 }} />
      <Weg d="M133,64 L133,196" farbe={ANDERE} spitze={{ x: 133, y: 202, winkel: 180 }} />
      <Auto x={167} y={184} farbe={DU} />
      <Auto x={133} y={40} winkel={180} farbe={ANDERE} />
    </G>
  );
}

function Kreisverkehr() {
  const cx = 150;
  const cy = 112;
  return (
    <G>
      <Rect x={0} y={0} width={300} height={220} fill={GRUND} />
      <Rect x={125} y={0} width={50} height={60} fill={ASPHALT} />
      <Rect x={125} y={164} width={50} height={56} fill={ASPHALT} />
      <Rect x={0} y={87} width={98} height={50} fill={ASPHALT} />
      <Rect x={202} y={87} width={98} height={50} fill={ASPHALT} />
      <Circle cx={cx} cy={cy} r={68} fill={ASPHALT} />
      <Circle cx={cx} cy={cy} r={68} fill="none" stroke={RAND} strokeWidth={2} strokeDasharray="30 22" />
      <Circle cx={cx} cy={cy} r={33} fill="#16213B" stroke={RAND} strokeWidth={2} />
      <Circle cx={cx} cy={cy} r={20} fill="#1B2A48" />
      <G stroke={MARKIERUNG} strokeWidth={2} strokeDasharray="8 8">
        <Line x1={150} y1={0} x2={150} y2={40} />
        <Line x1={150} y1={184} x2={150} y2={220} />
        <Line x1={0} y1={112} x2={78} y2={112} />
        <Line x1={222} y1={112} x2={300} y2={112} />
      </G>
      <Weg d="M162,166 L162,156" farbe={DU} spitze={{ x: 162, y: 150, winkel: 0 }} />
      <Weg d="M99,128 Q108,160 136,168" farbe={ANDERE} spitze={{ x: 141, y: 169, winkel: 100 }} />
      <Auto x={162} y={192} farbe={DU} />
      <Auto x={99} y={104} winkel={170} farbe={ANDERE} />
      <Schild zeichen="z215" x={198} y={150} />
      <Schild zeichen="z205" x={228} y={150} />
    </G>
  );
}

export function Radfahrer({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      <Rect x={-2.2} y={-17} width={4.4} height={34} rx={2.2} fill="#C7CDDA" />
      <Rect x={-9} y={-10} width={18} height={3} rx={1.5} fill="#C7CDDA" />
      <Ellipse cx={0} cy={1} rx={9} ry={6.5} fill={ANDERE} />
      <Circle cx={0} cy={-2} r={4.8} fill="#8A3E1C" />
    </G>
  );
}

function RechtsAbbiegenRad() {
  return (
    <G>
      <Kreuzung />
      {/* Radweg rechts neben der Fahrbahn */}
      <Rect x={188} y={150} width={14} height={70} fill="rgba(200,16,46,0.45)" />
      <Rect x={188} y={0} width={14} height={80} fill="rgba(200,16,46,0.45)" />
      <G stroke={MARKIERUNG} strokeWidth={1.6} strokeDasharray="5 5">
        <Line x1={188} y1={80} x2={188} y2={150} />
        <Line x1={202} y1={80} x2={202} y2={150} />
      </G>
      <Weg d="M167,160 L167,152 Q167,132 196,132 L276,132" farbe={DU} spitze={{ x: 282, y: 132, winkel: 90 }} />
      <Weg d="M195,156 L195,40" farbe={ANDERE} spitze={{ x: 195, y: 34, winkel: 0 }} />
      <Auto x={167} y={184} farbe={DU} />
      <Radfahrer x={195} y={176} />
    </G>
  );
}

function Rettungsgasse() {
  const spuren = [85, 135, 185];
  return (
    <G>
      <Rect x={0} y={0} width={300} height={220} fill={GRUND} />
      <Rect x={58} y={0} width={196} height={220} fill={ASPHALT} />
      <Rect x={212} y={0} width={42} height={220} fill="#26304A" />
      <G stroke={MARKIERUNG} strokeWidth={2.4}>
        <Line x1={61} y1={0} x2={61} y2={220} />
        <Line x1={211} y1={0} x2={211} y2={220} />
      </G>
      <G stroke={MARKIERUNG} strokeWidth={2} strokeDasharray="14 12">
        <Line x1={110} y1={0} x2={110} y2={220} />
        <Line x1={160} y1={0} x2={160} y2={220} />
      </G>
      <SvgText x={233} y={116} fill="#5A6380" fontSize={9} fontFamily={schrift.textHalb} textAnchor="middle" transform="rotate(-90 233 112)">
        Seitenstreifen
      </SvgText>
      {spuren.map((x) => (
        <Auto key={`a${x}`} x={x} y={36} farbe={NEUTRAL} />
      ))}
      {spuren.map((x) => (
        <Auto key={`b${x}`} x={x} y={92} farbe={NEUTRAL} />
      ))}
      <Auto x={85} y={150} farbe={DU} />
      <Auto x={135} y={150} farbe={NEUTRAL} />
      <Auto x={185} y={150} farbe={NEUTRAL} />
      {/* Einsatzfahrzeug von hinten */}
      <G transform="translate(135 208)">
        <Rect x={-12} y={-20} width={24} height={44} rx={5} fill="#E9EDF5" />
        <Rect x={-9} y={-18} width={7} height={3.5} rx={1} fill="#2F7BFF" />
        <Rect x={2} y={-18} width={7} height={3.5} rx={1} fill="#2F7BFF" />
        <Circle cx={-5.5} cy={-16} r={9} fill="#2F7BFF" opacity={0.18} />
        <Circle cx={5.5} cy={-16} r={9} fill="#2F7BFF" opacity={0.18} />
      </G>
    </G>
  );
}

function Schulbus() {
  return (
    <G>
      <Rect x={0} y={0} width={300} height={220} fill={GRUND} />
      <Rect x={0} y={40} width={300} height={28} fill={GEHWEG} />
      <Rect x={0} y={152} width={300} height={40} fill={GEHWEG} />
      <Rect x={0} y={70} width={300} height={80} fill={ASPHALT} />
      <G stroke={RAND} strokeWidth={2}>
        <Line x1={0} y1={70} x2={300} y2={70} />
        <Line x1={0} y1={150} x2={300} y2={150} />
      </G>
      <Line x1={0} y1={110} x2={300} y2={110} stroke={MARKIERUNG} strokeWidth={2} strokeDasharray="12 10" />
      {/* Haltestelle */}
      <Line x1={262} y1={186} x2={262} y2={170} stroke="#AEB6C8" strokeWidth={2} />
      <Circle cx={262} cy={164} r={10} fill={farben.schildGelb} stroke="#1E7F4F" strokeWidth={2} />
      <SvgText x={262} y={168.5} fill="#1E7F4F" fontSize={12} fontFamily={schrift.titel} fontWeight="800" textAnchor="middle">
        H
      </SvgText>
      {/* Bus mit Warnblinklicht */}
      <G>
        <Rect x={168} y={115} width={112} height={31} rx={6} fill="#FFC857" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Rect key={i} x={176 + i * 19} y={119} width={13} height={6} rx={1.5} fill="#0A0F1E" opacity={0.55} />
        ))}
        <Rect x={172} y={136} width={100} height={4} rx={2} fill="#E5A92E" />
        {[
          [170, 117],
          [278, 117],
          [170, 144],
          [278, 144],
        ].map(([x, y]) => (
          <G key={`${x}-${y}`}>
            <Circle cx={x} cy={y} r={8} fill={farben.orange} opacity={0.25} />
            <Circle cx={x} cy={y} r={3} fill={farben.orange} />
          </G>
        ))}
      </G>
      {/* Kind am Gehweg */}
      <G transform="translate(158 168)">
        <Circle cx={0} cy={-6} r={4.5} fill="#F2C9A5" />
        <Rect x={-5} y={-1} width={10} height={12} rx={4} fill={ANDERE} />
      </G>
      <Weg d="M84,130 L136,130" farbe={DU} spitze={{ x: 142, y: 130, winkel: 90 }} />
      <Auto x={56} y={130} winkel={90} farbe={DU} />
    </G>
  );
}

const LAGEN: Record<LageKey, () => React.JSX.Element> = {
  lage_rechts_vor_links: RechtsVorLinks,
  lage_links_abbiegen: LinksAbbiegen,
  lage_kreisverkehr: Kreisverkehr,
  lage_rechts_abbiegen_rad: RechtsAbbiegenRad,
  lage_rettungsgasse: Rettungsgasse,
  lage_schulbus: Schulbus,
};

/** Lageplan in voller Breite (Seitenverhältnis 300 : 220). */
export function Lageplan({ lage, breite }: { lage: LageKey; breite: number }) {
  const Inhalt = LAGEN[lage];
  return (
    <Svg width={breite} height={(breite * 220) / 300} viewBox="0 0 300 220">
      <Inhalt />
    </Svg>
  );
}
