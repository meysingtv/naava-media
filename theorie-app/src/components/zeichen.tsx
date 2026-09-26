import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";

import type { ZeichenKey } from "@/lib/fragen";
import { farben, schrift } from "@/lib/theme";

// Verkehrszeichen als Vektorgrafik (viewBox 100 × 100), den amtlichen
// Zeichen nachempfunden. Alle Zeichen haben einen weißen Außenrand, damit sie
// auf dem dunklen Grund sauber stehen.

const ROT = farben.schildRot;
const BLAU = farben.schildBlau;
const GELB = farben.schildGelb;
const WEISS = farben.schildWeiss;
const SCHWARZ = farben.schildSchwarz;

type Punkt = [number, number];

function skaliert(punkte: Punkt[], k: number): Punkt[] {
  const cx = punkte.reduce((s, p) => s + p[0], 0) / punkte.length;
  const cy = punkte.reduce((s, p) => s + p[1], 0) / punkte.length;
  return punkte.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
}

const pts = (p: Punkt[]) => p.map(([x, y]) => `${x},${y}`).join(" ");

/** Dreieck mit weißem Rand, rotem Band und weißem Innenfeld. */
function Dreieck({ punkte, children }: { punkte: Punkt[]; children?: React.ReactNode }) {
  return (
    <G>
      <Polygon points={pts(skaliert(punkte, 1.07))} fill={WEISS} stroke={WEISS} strokeWidth={5} strokeLinejoin="round" />
      <Polygon points={pts(punkte)} fill={ROT} stroke={ROT} strokeWidth={6} strokeLinejoin="round" />
      <Polygon points={pts(skaliert(punkte, 0.64))} fill={WEISS} stroke={WEISS} strokeWidth={2.5} strokeLinejoin="round" />
      {children}
    </G>
  );
}

const SPITZE_OBEN: Punkt[] = [
  [50, 9],
  [93, 86],
  [7, 86],
];
const SPITZE_UNTEN: Punkt[] = [
  [7, 14],
  [93, 14],
  [50, 91],
];

/** Runde Scheibe mit weißem Rand. */
function Rund({ fuellung, ring, children }: { fuellung: string; ring?: string; children?: React.ReactNode }) {
  return (
    <G>
      <Circle cx={50} cy={50} r={47} fill={WEISS} />
      <Circle cx={50} cy={50} r={44.5} fill={ring ?? fuellung} />
      {ring ? <Circle cx={50} cy={50} r={36} fill={fuellung} /> : null}
      {children}
    </G>
  );
}

function Quadrat({ fuellung, children }: { fuellung: string; children?: React.ReactNode }) {
  return (
    <G>
      <Rect x={4} y={4} width={92} height={92} rx={9} fill={WEISS} />
      <Rect x={7.5} y={7.5} width={85} height={85} rx={6.5} fill={fuellung} />
      {children}
    </G>
  );
}

/** Auto von hinten (für Überholverbot). */
function AutoHinten({ x, farbe }: { x: number; farbe: string }) {
  return (
    <G>
      <Path d={`M${x + 5},48 L${x + 8},39 Q${x + 9},37 ${x + 11},37 L${x + 19},37 Q${x + 21},37 ${x + 22},39 L${x + 25},48 Z`} fill={farbe} />
      <Rect x={x + 1} y={47} width={28} height={12} rx={3} fill={farbe} />
      <Rect x={x + 3} y={58} width={6} height={6} rx={1.5} fill={farbe} />
      <Rect x={x + 21} y={58} width={6} height={6} rx={1.5} fill={farbe} />
    </G>
  );
}

/** Nur die Grafik (für den Einbau in größere Zeichnungen, viewBox 100 × 100). */
export function ZeichenGrafik({ zeichen }: { zeichen: ZeichenKey }) {
  switch (zeichen) {
    case "z205":
      return <Dreieck punkte={SPITZE_UNTEN} />;

    case "z206": {
      const achteck = (r: number) =>
        Array.from({ length: 8 }, (_, i) => {
          const w = ((22.5 + i * 45) * Math.PI) / 180;
          return `${50 + r * Math.cos(w)},${50 + r * Math.sin(w)}`;
        }).join(" ");
      return (
        <G>
          <Polygon points={achteck(49)} fill={WEISS} />
          <Polygon points={achteck(46)} fill={ROT} />
          <Polygon points={achteck(41)} fill="none" stroke={WEISS} strokeWidth={2} />
          <SvgText x={50} y={58.5} fill={WEISS} fontSize={23} fontFamily={schrift.titel} fontWeight="800" textAnchor="middle" letterSpacing={0.5}>
            STOP
          </SvgText>
        </G>
      );
    }

    case "z306":
      return (
        <G>
          <Polygon points="50,2 98,50 50,98 2,50" fill={WEISS} stroke={SCHWARZ} strokeWidth={1.4} strokeLinejoin="round" />
          <Polygon points="50,16 84,50 50,84 16,50" fill={GELB} stroke={SCHWARZ} strokeWidth={0.8} strokeLinejoin="round" />
        </G>
      );

    case "z301":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <Rect x={46} y={40} width={8} height={36} fill={SCHWARZ} />
          <Rect x={33} y={60} width={34} height={4} fill={SCHWARZ} />
        </Dreieck>
      );

    case "z101":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <Path d="M46.5,39 L53.5,39 L52,63 L48,63 Z" fill={SCHWARZ} />
          <Circle cx={50} cy={70.5} r={3.8} fill={SCHWARZ} />
        </Dreieck>
      );

    case "z274_30":
      return (
        <Rund fuellung={WEISS} ring={ROT}>
          <SvgText x={50} y={63} fill={SCHWARZ} fontSize={36} fontFamily={schrift.titel} fontWeight="800" textAnchor="middle" letterSpacing={-1}>
            30
          </SvgText>
        </Rund>
      );

    case "z267":
      return (
        <Rund fuellung={ROT}>
          <Rect x={17} y={43} width={66} height={14} rx={1.5} fill={WEISS} />
        </Rund>
      );

    case "z276":
      return (
        <Rund fuellung={WEISS} ring={ROT}>
          <AutoHinten x={18} farbe={ROT} />
          <AutoHinten x={52} farbe={SCHWARZ} />
        </Rund>
      );

    case "z283":
      return (
        <Rund fuellung={BLAU} ring={ROT}>
          <Line x1={24.5} y1={24.5} x2={75.5} y2={75.5} stroke={ROT} strokeWidth={8.5} />
          <Line x1={75.5} y1={24.5} x2={24.5} y2={75.5} stroke={ROT} strokeWidth={8.5} />
        </Rund>
      );

    case "z286":
      return (
        <Rund fuellung={BLAU} ring={ROT}>
          <Line x1={24.5} y1={24.5} x2={75.5} y2={75.5} stroke={ROT} strokeWidth={8.5} />
        </Rund>
      );

    case "z209":
      return (
        <Rund fuellung={BLAU}>
          <Rect x={22} y={44} width={38} height={12} fill={WEISS} />
          <Polygon points="57,31 81,50 57,69" fill={WEISS} />
        </Rund>
      );

    case "z215": {
      const cx = 50;
      const cy = 50;
      const r = 23;
      const p = (grad: number, rr = r): Punkt => [cx + rr * Math.cos((grad * Math.PI) / 180), cy + rr * Math.sin((grad * Math.PI) / 180)];
      return (
        <Rund fuellung={BLAU}>
          {[0, 120, 240].map((basis) => {
            const von = basis + 108;
            const bis = basis + 30;
            const [x1, y1] = p(von);
            const [x2, y2] = p(bis);
            const w = (bis * Math.PI) / 180;
            const d: Punkt = [Math.sin(w), -Math.cos(w)];
            const n: Punkt = [Math.cos(w), Math.sin(w)];
            const spitze: Punkt = [x2 + d[0] * 9, y2 + d[1] * 9];
            const l: Punkt = [x2 + n[0] * 8, y2 + n[1] * 8];
            const rr: Punkt = [x2 - n[0] * 8, y2 - n[1] * 8];
            return (
              <G key={basis}>
                <Path d={`M${x1},${y1} A${r},${r} 0 0 0 ${x2},${y2}`} stroke={WEISS} strokeWidth={7} fill="none" />
                <Polygon points={pts([spitze, l, rr])} fill={WEISS} />
              </G>
            );
          })}
        </Rund>
      );
    }

    case "z220":
      return (
        <G>
          <Rect x={2} y={27} width={96} height={46} rx={5} fill={WEISS} />
          <Rect x={5} y={30} width={90} height={40} rx={3} fill={BLAU} />
          <Rect x={11} y={42} width={60} height={16} fill={WEISS} />
          <Polygon points="69,34 90,50 69,66" fill={WEISS} />
          <SvgText x={40} y={53.2} fill={SCHWARZ} fontSize={8.6} fontFamily={schrift.textFett} fontWeight="700" textAnchor="middle">
            Einbahnstraße
          </SvgText>
        </G>
      );

    case "z314":
      return (
        <Quadrat fuellung={BLAU}>
          <SvgText x={50} y={72} fill={WEISS} fontSize={62} fontFamily={schrift.titel} fontWeight="800" textAnchor="middle">
            P
          </SvgText>
        </Quadrat>
      );

    case "z350":
      return (
        <Quadrat fuellung={BLAU}>
          <Polygon points="50,15 86,79 14,79" fill={WEISS} stroke={WEISS} strokeWidth={3} strokeLinejoin="round" />
          {[0, 1, 2, 3].map((i) => (
            <Rect key={i} x={27 + i * 12} y={71} width={7} height={5} fill={SCHWARZ} />
          ))}
          <Circle cx={51} cy={35} r={5} fill={SCHWARZ} />
          <G stroke={SCHWARZ} strokeWidth={4.6} strokeLinecap="round" fill="none">
            <Path d="M50,42 L47,56" />
            <Path d="M47,56 L41,67" />
            <Path d="M47,56 L55,66" />
            <Path d="M49,46 L41,52" />
            <Path d="M49,46 L57,51" />
          </G>
        </Quadrat>
      );

    case "z201": {
      const balken = (winkel: number) => (
        <G transform={`rotate(${winkel} 50 50)`}>
          <Rect x={43} y={2} width={14} height={96} rx={2} fill={WEISS} stroke={ROT} strokeWidth={2.4} />
          <Rect x={43} y={2} width={14} height={20} rx={2} fill={ROT} />
          <Rect x={43} y={78} width={14} height={20} rx={2} fill={ROT} />
          <Rect x={43} y={43} width={14} height={14} fill={ROT} />
        </G>
      );
      return (
        <G>
          {balken(-38)}
          {balken(38)}
        </G>
      );
    }
  }
}

/** Ein Verkehrszeichen in beliebiger Größe. */
export function Verkehrszeichen({ zeichen, groesse = 96 }: { zeichen: ZeichenKey; groesse?: number }) {
  return (
    <Svg width={groesse} height={groesse} viewBox="0 0 100 100">
      <ZeichenGrafik zeichen={zeichen} />
    </Svg>
  );
}

export type ZeichenInfo = { key: ZeichenKey; name: string; kurz?: string; gruppe: "gefahr" | "vorschrift" | "richt"; bedeutung: string };

export const ZEICHEN_INFO: ZeichenInfo[] = [
  { key: "z101", name: "Gefahrstelle", gruppe: "gefahr", bedeutung: "Warnt vor einer Gefahr, für die es kein eigenes Zeichen gibt. Besonders aufmerksam und bremsbereit fahren." },
  { key: "z201", name: "Andreaskreuz", gruppe: "vorschrift", bedeutung: "Bahnübergang: Schienenfahrzeuge haben Vorrang. Bei Rotlicht oder geschlossener Schranke warten." },
  { key: "z205", name: "Vorfahrt gewähren", gruppe: "vorschrift", bedeutung: "Den Querverkehr durchlassen. Anhalten nur, wenn es nötig ist." },
  { key: "z206", name: "Halt. Vorfahrt gewähren", kurz: "Stoppschild", gruppe: "vorschrift", bedeutung: "Immer vollständig anhalten – an der Haltlinie oder dort, wo du einsehen kannst – und dann Vorfahrt gewähren." },
  { key: "z209", name: "Vorgeschriebene Fahrtrichtung rechts", kurz: "Fahrtrichtung rechts", gruppe: "vorschrift", bedeutung: "Hier darfst du nur nach rechts fahren." },
  { key: "z215", name: "Kreisverkehr", gruppe: "vorschrift", bedeutung: "Im Kreis gegen den Uhrzeigersinn fahren. Beim Einfahren nicht blinken, beim Ausfahren rechts blinken." },
  { key: "z220", name: "Einbahnstraße", gruppe: "richt", bedeutung: "Fahren nur in Pfeilrichtung erlaubt." },
  { key: "z267", name: "Verbot der Einfahrt", gruppe: "vorschrift", bedeutung: "Einfahren verboten – zum Beispiel am Ende einer Einbahnstraße." },
  { key: "z274_30", name: "Zulässige Höchstgeschwindigkeit", kurz: "Tempolimit", gruppe: "vorschrift", bedeutung: "Die angezeigte Geschwindigkeit darfst du nicht überschreiten – bei schlechten Bedingungen langsamer." },
  { key: "z276", name: "Überholverbot", gruppe: "vorschrift", bedeutung: "Mehrspurige Kraftfahrzeuge dürfen nicht überholt werden. Einspurige Fahrzeuge schon." },
  { key: "z283", name: "Absolutes Halteverbot", gruppe: "vorschrift", bedeutung: "Halten ist auf der Fahrbahn verboten – auch kurz." },
  { key: "z286", name: "Eingeschränktes Halteverbot", kurz: "Eingeschr. Halteverbot", gruppe: "vorschrift", bedeutung: "Halten länger als drei Minuten verboten, außer zum Ein- und Aussteigen oder Be- und Entladen." },
  { key: "z301", name: "Vorfahrt an der nächsten Kreuzung", kurz: "Vorfahrt nächste Kreuzung", gruppe: "vorschrift", bedeutung: "An der nächsten Kreuzung oder Einmündung hast du Vorfahrt." },
  { key: "z306", name: "Vorfahrtstraße", gruppe: "vorschrift", bedeutung: "Du hast Vorfahrt, bis ein Zeichen sie aufhebt." },
  { key: "z314", name: "Parken", gruppe: "richt", bedeutung: "Parken ist erlaubt. Zusatzzeichen können es einschränken." },
  { key: "z350", name: "Fußgängerüberweg", gruppe: "richt", bedeutung: "Fußgängern das Überqueren ermöglichen, mäßig heranfahren, nicht überholen." },
];
