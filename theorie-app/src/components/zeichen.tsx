import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";

import type { ZeichenKey } from "@/lib/fragen";
import { farben, svgSchrift } from "@/lib/theme";

// Verkehrszeichen als Vektorgrafik (viewBox 100 × 100), den amtlichen
// Zeichen nachempfunden. Alle Zeichen haben einen weißen Außenrand, damit sie
// auf dem dunklen Grund sauber stehen.

const ROT = farben.schildRot;
const BLAU = farben.schildBlau;
const GELB = farben.schildGelb;
const WEISS = farben.schildWeiss;
const SCHWARZ = farben.schildSchwarz;
const GRUEN = "#0B8A4E";
/** Grau der „Ende“-Zeichen. */
const GRAU = "#8C9196";

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

/** Gefahrzeichen mit Piktogramm (im eigenen 100er-Raster). */
function Warn({ s = 0.38, y = 59, spiegeln, children }: { s?: number; y?: number; spiegeln?: boolean; children: React.ReactNode }) {
  return (
    <Dreieck punkte={SPITZE_OBEN}>
      <Bei x={50} y={y} s={s} spiegeln={spiegeln}>
        {children}
      </Bei>
    </Dreieck>
  );
}

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

/** Weiße Scheibe mit dünnem grauem Rand und schwarzen Schrägstrichen (Ende-Zeichen). */
function EndeRund({ children }: { children?: React.ReactNode }) {
  return (
    <G>
      <Circle cx={50} cy={50} r={47} fill={WEISS} />
      <Circle cx={50} cy={50} r={44} fill={WEISS} stroke={GRAU} strokeWidth={1.8} />
      {children}
      <G stroke={SCHWARZ} strokeWidth={2.4}>
        {[-16, -8, 0, 8, 16].map((v) => (
          <Line key={v} x1={80 + v} y1={20 + v} x2={20 + v} y2={80 + v} />
        ))}
      </G>
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

/** Weißes Hochformat-Schild (Zonen) mit Kreis oben und Schrift unten. */
function Zonenschild({ text = "ZONE", textGroesse = 15, textFarbe = SCHWARZ, children }: { text?: string; textGroesse?: number; textFarbe?: string; children: React.ReactNode }) {
  return (
    <G>
      <Rect x={12} y={2} width={76} height={96} rx={5} fill={WEISS} />
      <Rect x={15.5} y={5.5} width={69} height={89} rx={3} fill="none" stroke={SCHWARZ} strokeWidth={1.8} />
      {children}
      <SvgText x={50} y={84} fill={textFarbe} fontSize={textGroesse} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle">
        {text}
      </SvgText>
    </G>
  );
}

/** Roter Schrägbalken über Richtzeichen („Ende …“). */
function Ende({ von = [12, 88] as Punkt, bis = [88, 12] as Punkt, breite = 6.5 }: { von?: Punkt; bis?: Punkt; breite?: number }) {
  return <Line x1={von[0]} y1={von[1]} x2={bis[0]} y2={bis[1]} stroke={ROT} strokeWidth={breite} />;
}

/** Piktogramm aus einem eigenen 100er-Raster an (x, y) setzen; s = Maßstab. */
function Bei({ x, y, s, spiegeln, drehen = 0, children }: { x: number; y: number; s: number; spiegeln?: boolean; drehen?: number; children: React.ReactNode }) {
  return <G transform={`translate(${x} ${y}) rotate(${drehen}) scale(${spiegeln ? -s : s} ${s}) translate(-50 -50)`}>{children}</G>;
}

// ---------------------------------------------------------------------------
// Piktogramme (jeweils im 100er-Raster, Mitte 50/50)
// ---------------------------------------------------------------------------

const rund = { strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

/** Auto von der Seite, fährt nach links. `h` = Farbe für Fenster und Radnaben. */
function Auto({ f, h }: { f: string; h: string }) {
  return (
    <G>
      <Path d="M6,61 L6,52 Q6,47 11,46 L24,44 L35,31 Q37.5,28.5 41,28.5 L66,28.5 Q70,28.5 72.5,31.5 L82,44 L90,45.5 Q95,46.5 95,52 L95,60 Q95,63 92,63 L9,63 Q6,63 6,61 Z" fill={f} />
      <Path d="M38.5,33.5 L50,33.5 L50,43 L30.5,43 Z" fill={h} />
      <Path d="M54,33.5 L66,33.5 Q68,33.5 69.5,35.5 L75.5,43 L54,43 Z" fill={h} />
      <Circle cx={25} cy={64} r={10} fill={f} />
      <Circle cx={76} cy={64} r={10} fill={f} />
      <Circle cx={25} cy={64} r={4} fill={h} />
      <Circle cx={76} cy={64} r={4} fill={h} />
    </G>
  );
}

/** Auto von hinten (Überholverbot, Stau, Schleudergefahr). `umriss` zeichnet einen Rand darum. */
function AutoHintenForm({ f, umriss }: { f: string; umriss?: string }) {
  const teile = (farbe: string, rand?: string) => (
    <G fill={farbe} stroke={rand} strokeWidth={rand ? 14 : 0} strokeLinejoin="round">
      <Path d="M20,43 L29,16 Q32,10 38,10 L62,10 Q68,10 71,16 L80,43 Z" />
      <Rect x={8} y={40} width={84} height={36} rx={9} />
      <Rect x={14} y={73} width={18} height={18} rx={4.5} />
      <Rect x={68} y={73} width={18} height={18} rx={4.5} />
    </G>
  );
  return (
    <G>
      {umriss ? teile(umriss, umriss) : null}
      {teile(f)}
    </G>
  );
}

/** Lkw von hinten (Überholverbot für Lkw). */
function LkwHintenForm({ f }: { f: string }) {
  return (
    <G>
      <Rect x={10} y={4} width={80} height={72} rx={4} fill={f} />
      <Rect x={14} y={74} width={20} height={18} rx={4} fill={f} />
      <Rect x={66} y={74} width={20} height={18} rx={4} fill={f} />
    </G>
  );
}

/** Lkw von der Seite, fährt nach links. */
function Lkw({ f, h }: { f: string; h: string }) {
  return (
    <G>
      <Rect x={34} y={20} width={60} height={40} rx={1.5} fill={f} />
      <Path d="M6,60 L6,38 Q6,33 11,33 L24,33 Q28,33 29.5,37 L32,46 L32,60 Z" fill={f} />
      <Path d="M10,37 L23,37 Q25.5,37 26.5,40 L28,46 L10,46 Z" fill={h} />
      <Rect x={6} y={57} width={88} height={6} fill={f} />
      {[18, 62, 80].map((x) => (
        <G key={x}>
          <Circle cx={x} cy={65} r={8.5} fill={f} />
          <Circle cx={x} cy={65} r={3.2} fill={h} />
        </G>
      ))}
    </G>
  );
}

/** Bus von der Seite. */
function Bus({ f, h }: { f: string; h: string }) {
  return (
    <G>
      <Rect x={5} y={24} width={90} height={38} rx={6} fill={f} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Rect key={i} x={20 + i * 14} y={30} width={10.5} height={13} rx={1.5} fill={h} />
      ))}
      <Rect x={9} y={30} width={7} height={22} rx={1.5} fill={h} />
      <Circle cx={24} cy={63} r={8.5} fill={f} />
      <Circle cx={76} cy={63} r={8.5} fill={f} />
      <Circle cx={24} cy={63} r={3.2} fill={h} />
      <Circle cx={76} cy={63} r={3.2} fill={h} />
    </G>
  );
}

/** Motorrad mit Fahrer, fährt nach links. */
function Motorrad({ f }: { f: string }) {
  return (
    <G>
      <Circle cx={20} cy={66} r={13} fill="none" stroke={f} strokeWidth={5.5} />
      <Circle cx={80} cy={66} r={13} fill="none" stroke={f} strokeWidth={5.5} />
      <Path d="M20,66 L30,40" stroke={f} strokeWidth={5} {...rund} />
      <Path d="M34,52 Q46,44 62,46 L72,50 L80,66 L60,62 L40,62 Z" fill={f} />
      <Path d="M26,38 L36,36" stroke={f} strokeWidth={4.5} {...rund} />
      <Circle cx={54} cy={16} r={7} fill={f} />
      <Path d="M54,24 L60,42 L68,48" stroke={f} strokeWidth={8} {...rund} />
      <Path d="M55,28 L36,37" stroke={f} strokeWidth={6} {...rund} />
      <Path d="M66,48 L62,60" stroke={f} strokeWidth={6} {...rund} />
    </G>
  );
}

/** Fahrrad (Linien). */
function Fahrrad({ f, sw = 5 }: { f: string; sw?: number }) {
  return (
    <G stroke={f} strokeWidth={sw} {...rund}>
      <Circle cx={24} cy={64} r={17} />
      <Circle cx={76} cy={64} r={17} />
      <Path d="M24,64 L40,36 L66,36 L76,64 M40,36 L52,64 L66,36 M35,28 L46,28 M62,25 L70,25 L66,36" />
    </G>
  );
}

/** Radfahrer. */
function Radfahrer({ f }: { f: string }) {
  return (
    <G>
      <Bei x={50} y={62} s={0.9}>
        <Fahrrad f={f} sw={5.5} />
      </Bei>
      <Circle cx={57} cy={12} r={7} fill={f} />
      <G stroke={f} strokeWidth={7} {...rund}>
        <Path d="M55,21 L46,44" />
        <Path d="M53,26 L66,36" />
        <Path d="M46,44 L58,52 L54,62" />
      </G>
    </G>
  );
}

/** Gehender Mensch (nach rechts). */
function Mensch({ f, sw = 9 }: { f: string; sw?: number }) {
  return (
    <G>
      <Circle cx={52} cy={13} r={8.5} fill={f} />
      <G stroke={f} strokeWidth={sw} {...rund}>
        <Path d="M51,26 L46,56" />
        <Path d="M46,56 L36,86" />
        <Path d="M46,56 L58,70 L60,87" />
        <Path d="M50,32 L38,50" />
        <Path d="M50,32 L63,47" />
      </G>
    </G>
  );
}

/** Erwachsene Person mit Kind an der Hand. */
function MenschMitKind({ f }: { f: string }) {
  return (
    <G>
      <Circle cx={36} cy={12} r={8} fill={f} />
      <Polygon points="36,34 26,64 46,64" fill={f} />
      <G stroke={f} strokeWidth={8} {...rund}>
        <Path d="M36,23 L36,50" />
        <Path d="M32,62 L28,88" />
        <Path d="M40,62 L44,88" />
        <Path d="M36,30 L25,46" />
        <Path d="M37,30 L52,48" />
      </G>
      <Circle cx={66} cy={40} r={6.5} fill={f} />
      <G stroke={f} strokeWidth={6.5} {...rund}>
        <Path d="M66,49 L65,69" />
        <Path d="M65,69 L59,88" />
        <Path d="M65,69 L71,88" />
        <Path d="M65,54 L53,49" />
        <Path d="M66,54 L75,63" />
      </G>
    </G>
  );
}

/** Zwei laufende Kinder. */
function Kinder({ f }: { f: string }) {
  return (
    <G>
      <Circle cx={36} cy={14} r={8} fill={f} />
      <Polygon points="35,36 25,60 45,60" fill={f} />
      <G stroke={f} strokeWidth={7.5} {...rund}>
        <Path d="M36,24 L35,48" />
        <Path d="M31,58 L22,72 L16,86" />
        <Path d="M39,58 L46,86" />
        <Path d="M36,30 L24,40" />
        <Path d="M36,30 L50,38" />
      </G>
      <Circle cx={68} cy={34} r={6.5} fill={f} />
      <G stroke={f} strokeWidth={6.5} {...rund}>
        <Path d="M68,42 L66,64" />
        <Path d="M66,64 L58,76 L54,88" />
        <Path d="M66,64 L74,88" />
        <Path d="M67,48 L56,56" />
        <Path d="M67,48 L79,54" />
      </G>
    </G>
  );
}

/** Springendes Reh (nach rechts). */
function Reh({ f }: { f: string }) {
  return (
    <G>
      <Path d="M20,52 Q28,40 48,40 L64,40 Q72,40 76,44 L78,52 Q70,58 56,58 L36,58 Q24,58 20,52 Z" fill={f} />
      <Path d="M70,45 L78,26 Q80,22 84,22 L91,24 L89,29 L83,30 L78,49 Z" fill={f} />
      <G stroke={f} {...rund}>
        <Path d="M82,23 L78,11 M79.5,16 L73,12 M85,23 L88,10 M86.5,15.5 L93,12" strokeWidth={2.8} />
        <Path d="M72,54 L86,64 L93,61" strokeWidth={5} />
        <Path d="M66,56 L80,73" strokeWidth={5} />
        <Path d="M29,54 L13,62 L7,58" strokeWidth={5} />
        <Path d="M36,57 L22,75" strokeWidth={5} />
        <Path d="M21,49 L14,44" strokeWidth={3.5} />
      </G>
    </G>
  );
}

/** Kuh (nach links). */
function Kuh({ f }: { f: string }) {
  return (
    <G>
      <Path d="M30,34 L80,34 Q88,34 88,42 L88,56 Q88,62 82,62 L32,62 Q26,62 26,56 L26,38 Q26,34 30,34 Z" fill={f} />
      <Path d="M29,38 L14,35 Q8,35 8,41 L10,52 Q11,56 16,56 L26,54 Z" fill={f} />
      {[30, 40, 71, 80].map((x) => (
        <Rect key={x} x={x} y={58} width={6.5} height={24} rx={1.5} fill={f} />
      ))}
      <G stroke={f} {...rund}>
        <Path d="M13,36 L8,27 M20,36 L22,27" strokeWidth={3.2} />
        <Path d="M88,40 Q96,48 92,66" strokeWidth={2.8} />
      </G>
    </G>
  );
}

/** Dampflok (nach links). */
function Lok({ f, h }: { f: string; h: string }) {
  return (
    <G>
      <Rect x={16} y={40} width={50} height={20} rx={4} fill={f} />
      <Rect x={22} y={24} width={9} height={17} fill={f} />
      <Rect x={19} y={20} width={15} height={5} rx={1.5} fill={f} />
      <Rect x={64} y={26} width={24} height={34} rx={2} fill={f} />
      <Rect x={69} y={31} width={14} height={11} fill={h} />
      <Rect x={60} y={20} width={32} height={6} rx={1.5} fill={f} />
      <Polygon points="16,58 5,71 18,71" fill={f} />
      <Rect x={10} y={60} width={80} height={5} fill={f} />
      <Circle cx={28} cy={71} r={7} fill={f} />
      <Circle cx={46} cy={71} r={7} fill={f} />
      <Circle cx={76} cy={69} r={10} fill={f} />
      <Circle cx={38} cy={11} r={5.5} fill={f} />
      <Circle cx={49} cy={7} r={6.5} fill={f} />
    </G>
  );
}

/** Arbeiter mit Schaufel am Haufen. */
function Arbeiter({ f }: { f: string }) {
  return (
    <G>
      <Path d="M56,88 Q64,62 80,62 Q93,64 97,88 Z" fill={f} />
      <Circle cx={30} cy={18} r={8.5} fill={f} />
      <G stroke={f} {...rund}>
        <Path d="M32,29 L45,56" strokeWidth={11} />
        <Path d="M45,56 L34,87" strokeWidth={8.5} />
        <Path d="M45,56 L57,74 L59,87" strokeWidth={8.5} />
        <Path d="M36,37 L57,51" strokeWidth={6.5} />
        <Path d="M46,36 L72,63" strokeWidth={4} />
      </G>
      <Polygon points="67,58 80,66 74,75 62,66" fill={f} />
    </G>
  );
}

/** Schneeflocke. */
function Flocke({ f }: { f: string }) {
  return (
    <G stroke={f} strokeWidth={5.5} {...rund}>
      {[0, 60, 120].map((w) => (
        <G key={w} transform={`rotate(${w} 50 50)`}>
          <Line x1={50} y1={14} x2={50} y2={86} />
          <Path d="M50,28 L41,20 M50,28 L59,20 M50,72 L41,80 M50,72 L59,80" />
        </G>
      ))}
    </G>
  );
}

/** Haus. */
function Haus({ f, h }: { f: string; h: string }) {
  return (
    <G>
      <Polygon points="50,12 88,42 12,42" fill={f} />
      <Rect x={20} y={40} width={60} height={48} fill={f} />
      <Rect x={42} y={62} width={16} height={26} fill={h} />
      <Rect x={27} y={50} width={12} height={10} fill={h} />
      <Rect x={61} y={50} width={12} height={10} fill={h} />
    </G>
  );
}

/** Zapfsäule. */
function Zapfsaeule({ f, h }: { f: string; h: string }) {
  return (
    <G>
      <Rect x={24} y={16} width={36} height={68} rx={3} fill={f} />
      <Rect x={30} y={23} width={24} height={17} fill={h} />
      <Path d="M60,32 L71,32 Q76,32 76,37 L76,64 Q76,71 82,71" stroke={f} strokeWidth={4.5} {...rund} />
      <Rect x={18} y={82} width={48} height={7} fill={f} />
    </G>
  );
}

/** Kurve (im 100er-Raster, nach rechts). */
function Kurve({ f }: { f: string }) {
  return <Path d="M40,96 L40,60 Q40,22 78,18" stroke={f} strokeWidth={17} fill="none" />;
}

// ---------------------------------------------------------------------------

function TempoZahl({ zahl, farbe = SCHWARZ, y = 63 }: { zahl: string; farbe?: string; y?: number }) {
  return (
    <SvgText x={50} y={zahl.length >= 3 ? y - 2 : y} fill={farbe} fontSize={zahl.length >= 3 ? 29 : 36} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle" letterSpacing={-1}>
      {zahl}
    </SvgText>
  );
}

function Achteck(r: number) {
  return Array.from({ length: 8 }, (_, i) => {
    const w = ((22.5 + i * 45) * Math.PI) / 180;
    return `${50 + r * Math.cos(w)},${50 + r * Math.sin(w)}`;
  }).join(" ");
}

/** Einbahnstraße mit Pfeil nach rechts oder links. */
function Einbahn({ links }: { links?: boolean }) {
  return (
    <G>
      <Rect x={2} y={27} width={96} height={46} rx={5} fill={WEISS} />
      <Rect x={5} y={30} width={90} height={40} rx={3} fill={BLAU} />
      {links ? (
        <>
          <Rect x={29} y={42} width={60} height={16} fill={WEISS} />
          <Polygon points="31,34 10,50 31,66" fill={WEISS} />
        </>
      ) : (
        <>
          <Rect x={11} y={42} width={60} height={16} fill={WEISS} />
          <Polygon points="69,34 90,50 69,66" fill={WEISS} />
        </>
      )}
      <SvgText x={links ? 60 : 40} y={53.2} fill={SCHWARZ} fontSize={8.6} fontFamily={svgSchrift.fett} fontWeight="700" textAnchor="middle">
        Einbahnstraße
      </SvgText>
    </G>
  );
}

/** Gelbe Ortstafel. */
function Ortstafel({ children }: { children: React.ReactNode }) {
  return (
    <G>
      <Rect x={2} y={22} width={96} height={56} rx={4} fill={WEISS} />
      <Rect x={5} y={25} width={90} height={50} rx={2.5} fill={GELB} />
      <Rect x={8} y={28} width={84} height={44} rx={1.5} fill="none" stroke={SCHWARZ} strokeWidth={1.6} />
      {children}
    </G>
  );
}

/** Verkehrsberuhigter Bereich (Bildteil). */
function Spielstrasse() {
  return (
    <G>
      <Rect x={2} y={16} width={96} height={68} rx={5} fill={WEISS} />
      <Rect x={5} y={19} width={90} height={62} rx={3} fill={BLAU} />
      <Bei x={21} y={51} s={0.25}>
        <Haus f={WEISS} h={BLAU} />
      </Bei>
      <Bei x={41} y={56} s={0.27}>
        <Mensch f={WEISS} />
      </Bei>
      <Bei x={56} y={63} s={0.17}>
        <Mensch f={WEISS} />
      </Bei>
      <Circle cx={63} cy={71} r={2.6} fill={WEISS} />
      <Bei x={81} y={63} s={0.22}>
        <Auto f={WEISS} h={BLAU} />
      </Bei>
      <Rect x={9} y={74} width={82} height={2.5} fill={WEISS} />
    </G>
  );
}

/** Autobahn-Piktogramm (Brücke über zwei Fahrbahnen). */
function AutobahnBild() {
  return (
    <G>
      <Rect x={14} y={24} width={72} height={9} fill={WEISS} />
      <Rect x={18} y={33} width={7} height={20} fill={WEISS} />
      <Rect x={75} y={33} width={7} height={20} fill={WEISS} />
      <Polygon points="14,88 40,40 46,40 35,88" fill={WEISS} />
      <Polygon points="86,88 60,40 54,40 65,88" fill={WEISS} />
    </G>
  );
}

/** Nur die Grafik (für den Einbau in größere Zeichnungen, viewBox 100 × 100). */
export function ZeichenGrafik({ zeichen }: { zeichen: ZeichenKey }) {
  switch (zeichen) {
    // ----------------------------------------------------------------- Gefahr
    case "z101":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <Path d="M46.5,39 L53.5,39 L52,63 L48,63 Z" fill={SCHWARZ} />
          <Circle cx={50} cy={70.5} r={3.8} fill={SCHWARZ} />
        </Dreieck>
      );

    case "z101_15":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <Path d="M57,40 L71,76 L50,76 L50,64 Q55,54 57,40 Z" fill={SCHWARZ} />
          <Polygon points="37,47 44,45 46,52 39,54" fill={SCHWARZ} />
          <Polygon points="33,61 40,59 41.5,66 35,67.5" fill={SCHWARZ} />
          <Polygon points="41,69 46.5,68 47,74 41.5,75" fill={SCHWARZ} />
        </Dreieck>
      );

    case "z101_51":
      return (
        <Warn s={0.36} y={60}>
          <Flocke f={SCHWARZ} />
        </Warn>
      );

    case "z102":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <Rect x={46.5} y={40} width={7} height={36} fill={SCHWARZ} />
          <Rect x={32} y={54.5} width={36} height={7} fill={SCHWARZ} />
        </Dreieck>
      );

    case "z103_10":
    case "z103_20":
      return (
        <Warn s={0.38} y={59} spiegeln={zeichen === "z103_10"}>
          <Kurve f={SCHWARZ} />
        </Warn>
      );

    case "z105_20":
      return (
        <Warn s={0.38} y={59}>
          <Path d="M40,98 L40,80 Q40,60 58,54 Q76,48 66,30 L58,14" stroke={SCHWARZ} strokeWidth={15} fill="none" />
        </Warn>
      );

    case "z108":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <Polygon points="31,56 70,75 31,75" fill={SCHWARZ} />
          <SvgText x={58} y={60} fill={SCHWARZ} fontSize={10} fontFamily={svgSchrift.fett} fontWeight="700" textAnchor="middle">
            10%
          </SvgText>
        </Dreieck>
      );

    case "z110":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <Polygon points="30,75 69,56 69,75" fill={SCHWARZ} />
          <SvgText x={42} y={60} fill={SCHWARZ} fontSize={10} fontFamily={svgSchrift.fett} fontWeight="700" textAnchor="middle">
            12%
          </SvgText>
        </Dreieck>
      );

    case "z112":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <Path d="M28,75 L28,68 L33,68 Q39.5,55 46,68 Q52.5,55 59,68 L72,68 L72,75 Z" fill={SCHWARZ} />
        </Dreieck>
      );

    case "z114":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <Bei x={50} y={46} s={0.2}>
            <AutoHintenForm f={SCHWARZ} />
          </Bei>
          <G stroke={SCHWARZ} strokeWidth={2.6} fill="none">
            <Path d="M42,77 Q36,71 42,65 Q48,59 43,55" />
            <Path d="M59,77 Q53,71 59,65 Q65,59 60,55" />
          </G>
        </Dreieck>
      );

    case "z117":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <Rect x={32} y={41} width={3.2} height={36} fill={SCHWARZ} />
          <Polygon points="35,43 70,50 70,57 35,62" fill={SCHWARZ} />
          <Polygon points="43,44.6 51,46.2 51,59.5 43,60.6" fill={WEISS} />
          <Polygon points="59,47.8 64,48.8 64,57.8 59,58.5" fill={WEISS} />
        </Dreieck>
      );

    case "z120":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <G stroke={SCHWARZ} strokeWidth={4.5} fill="none">
            <Path d="M37,79 L37,66 Q37,58 44,54 L44,40" />
            <Path d="M63,79 L63,66 Q63,58 56,54 L56,40" />
          </G>
        </Dreieck>
      );

    case "z121":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <G stroke={SCHWARZ} strokeWidth={4.5} fill="none">
            <Path d="M40,79 L40,40" />
            <Path d="M63,79 L63,66 Q63,58 55,54 L55,40" />
          </G>
        </Dreieck>
      );

    case "z123":
      return (
        <Warn s={0.38} y={60}>
          <Arbeiter f={SCHWARZ} />
        </Warn>
      );

    case "z124":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <Bei x={50} y={41} s={0.14}>
            <AutoHintenForm f={SCHWARZ} />
          </Bei>
          <Bei x={50} y={53} s={0.19}>
            <AutoHintenForm f={SCHWARZ} umriss={WEISS} />
          </Bei>
          <Bei x={50} y={67} s={0.25}>
            <AutoHintenForm f={SCHWARZ} umriss={WEISS} />
          </Bei>
        </Dreieck>
      );

    case "z125":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <Rect x={40} y={42} width={5.5} height={24} fill={SCHWARZ} />
          <Polygon points="36.5,62 49,62 42.75,75" fill={SCHWARZ} />
          <Rect x={54.5} y={50} width={5.5} height={26} fill={SCHWARZ} />
          <Polygon points="51,53 63.5,53 57.25,40" fill={SCHWARZ} />
        </Dreieck>
      );

    case "z131":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <Rect x={41.5} y={39} width={17} height={38} rx={3.5} fill={SCHWARZ} />
          <Circle cx={50} cy={46} r={4.4} fill={ROT} />
          <Circle cx={50} cy={58} r={4.4} fill={GELB} />
          <Circle cx={50} cy={70} r={4.4} fill="#1FA055" />
        </Dreieck>
      );

    case "z133":
      return (
        <Warn s={0.38} y={59}>
          <Mensch f={SCHWARZ} />
        </Warn>
      );

    case "z136":
      return (
        <Warn s={0.4} y={59}>
          <Kinder f={SCHWARZ} />
        </Warn>
      );

    case "z138":
      return (
        <Warn s={0.4} y={60}>
          <Radfahrer f={SCHWARZ} />
        </Warn>
      );

    case "z140":
      return (
        <Warn s={0.4} y={61}>
          <Kuh f={SCHWARZ} />
        </Warn>
      );

    case "z142":
      return (
        <Warn s={0.42} y={60}>
          <Reh f={SCHWARZ} />
        </Warn>
      );

    case "z151":
      return (
        <Warn s={0.4} y={60}>
          <Lok f={SCHWARZ} h={WEISS} />
        </Warn>
      );

    // ------------------------------------------------------------- Vorschrift
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

    case "z205":
      return <Dreieck punkte={SPITZE_UNTEN} />;

    case "z206":
      return (
        <G>
          <Polygon points={Achteck(49)} fill={WEISS} />
          <Polygon points={Achteck(46)} fill={ROT} />
          <Polygon points={Achteck(41)} fill="none" stroke={WEISS} strokeWidth={2} />
          <SvgText x={50} y={58.5} fill={WEISS} fontSize={23} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle" letterSpacing={0.5}>
            STOP
          </SvgText>
        </G>
      );

    case "z208":
      return (
        <Rund fuellung={WEISS} ring={ROT}>
          <Rect x={35} y={32} width={7} height={34} fill={SCHWARZ} />
          <Polygon points="30,62 47,62 38.5,76" fill={SCHWARZ} />
          <Rect x={58} y={34} width={7} height={34} fill={ROT} />
          <Polygon points="53,38 70,38 61.5,24" fill={ROT} />
        </Rund>
      );

    case "z209":
      return (
        <Rund fuellung={BLAU}>
          <Rect x={22} y={44} width={38} height={12} fill={WEISS} />
          <Polygon points="57,31 81,50 57,69" fill={WEISS} />
        </Rund>
      );

    case "z209_10":
      return (
        <Rund fuellung={BLAU}>
          <Rect x={40} y={44} width={38} height={12} fill={WEISS} />
          <Polygon points="43,31 19,50 43,69" fill={WEISS} />
        </Rund>
      );

    case "z209_30":
      return (
        <Rund fuellung={BLAU}>
          <Rect x={44} y={40} width={12} height={38} fill={WEISS} />
          <Polygon points="31,43 50,19 69,43" fill={WEISS} />
        </Rund>
      );

    case "z211":
      return (
        <Rund fuellung={BLAU}>
          <Path d="M42,80 L42,52 Q42,40 54,40 L60,40" stroke={WEISS} strokeWidth={12} fill="none" />
          <Polygon points="58,26 80,40 58,54" fill={WEISS} />
        </Rund>
      );

    case "z214":
    case "z214_10":
      return (
        <Rund fuellung={BLAU}>
          <G transform={zeichen === "z214_10" ? "translate(100 0) scale(-1 1)" : undefined}>
            <Rect x={36} y={36} width={11} height={46} fill={WEISS} />
            <Polygon points="26,40 41.5,18 57,40" fill={WEISS} />
            <Path d="M41.5,70 Q41.5,55 56,55 L62,55" stroke={WEISS} strokeWidth={11} fill="none" />
            <Polygon points="60,43 80,55 60,67" fill={WEISS} />
          </G>
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
      return <Einbahn />;

    case "z220_10":
      return <Einbahn links />;

    case "z222":
    case "z222_10":
      return (
        <Rund fuellung={BLAU}>
          <G transform={`rotate(${zeichen === "z222" ? 45 : 135} 50 50)`}>
            <Rect x={27} y={44} width={34} height={12} fill={WEISS} />
            <Polygon points="58,31 80,50 58,69" fill={WEISS} />
          </G>
        </Rund>
      );

    case "z224":
      return (
        <G>
          <Circle cx={50} cy={50} r={47} fill={WEISS} />
          <Circle cx={50} cy={50} r={44} fill={GRUEN} />
          <Circle cx={50} cy={50} r={37} fill={GELB} />
          <SvgText x={50} y={66} fill={GRUEN} fontSize={46} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle">
            H
          </SvgText>
        </G>
      );

    case "z237":
      return (
        <Rund fuellung={BLAU}>
          <G stroke={WEISS} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={32} cy={60} r={12} />
            <Circle cx={68} cy={60} r={12} />
            <Path d="M32,60 L43,40 L60,40 L68,60 M43,40 L51,60 L60,40 M40,34 L48,34 M58,33 L63,33 L60,40" />
          </G>
        </Rund>
      );

    case "z239":
      return (
        <Rund fuellung={BLAU}>
          <Bei x={50} y={52} s={0.56}>
            <MenschMitKind f={WEISS} />
          </Bei>
        </Rund>
      );

    case "z240":
      return (
        <Rund fuellung={BLAU}>
          <Bei x={50} y={31} s={0.33}>
            <MenschMitKind f={WEISS} />
          </Bei>
          <Rect x={16} y={48.5} width={68} height={3} fill={WEISS} />
          <Bei x={50} y={67} s={0.34}>
            <Fahrrad f={WEISS} sw={6.5} />
          </Bei>
        </Rund>
      );

    case "z241":
      return (
        <Rund fuellung={BLAU}>
          <Rect x={48.5} y={14} width={3} height={72} fill={WEISS} />
          <Bei x={31} y={52} s={0.3}>
            <Fahrrad f={WEISS} sw={7} />
          </Bei>
          <Bei x={69} y={52} s={0.4}>
            <MenschMitKind f={WEISS} />
          </Bei>
        </Rund>
      );

    case "z242":
      return (
        <Zonenschild>
          <Circle cx={50} cy={38} r={27} fill={BLAU} />
          <Bei x={50} y={40} s={0.36}>
            <MenschMitKind f={WEISS} />
          </Bei>
        </Zonenschild>
      );

    case "z244":
      return (
        <Zonenschild text="Fahrradstraße" textGroesse={9}>
          <Circle cx={50} cy={38} r={27} fill={BLAU} />
          <Bei x={50} y={39} s={0.38}>
            <Fahrrad f={WEISS} sw={6} />
          </Bei>
        </Zonenschild>
      );

    case "z245":
      return (
        <Quadrat fuellung={BLAU}>
          <Bei x={50} y={52} s={0.7}>
            <Bus f={WEISS} h={BLAU} />
          </Bei>
        </Quadrat>
      );

    case "z250":
      return <Rund fuellung={WEISS} ring={ROT} />;

    case "z251":
      return (
        <Rund fuellung={WEISS} ring={ROT}>
          <Bei x={50} y={52} s={0.54}>
            <Auto f={SCHWARZ} h={WEISS} />
          </Bei>
        </Rund>
      );

    case "z253":
      return (
        <Rund fuellung={WEISS} ring={ROT}>
          <Bei x={50} y={52} s={0.54}>
            <Lkw f={SCHWARZ} h={WEISS} />
          </Bei>
        </Rund>
      );

    case "z254":
      return (
        <Rund fuellung={WEISS} ring={ROT}>
          <Bei x={50} y={50} s={0.56}>
            <Fahrrad f={SCHWARZ} sw={6} />
          </Bei>
        </Rund>
      );

    case "z255":
      return (
        <Rund fuellung={WEISS} ring={ROT}>
          <Bei x={50} y={52} s={0.54}>
            <Motorrad f={SCHWARZ} />
          </Bei>
        </Rund>
      );

    case "z259":
      return (
        <Rund fuellung={WEISS} ring={ROT}>
          <Bei x={50} y={52} s={0.54}>
            <MenschMitKind f={SCHWARZ} />
          </Bei>
        </Rund>
      );

    case "z260":
      return (
        <Rund fuellung={WEISS} ring={ROT}>
          <Bei x={50} y={35} s={0.33}>
            <Motorrad f={SCHWARZ} />
          </Bei>
          <Bei x={50} y={63} s={0.42}>
            <Auto f={SCHWARZ} h={WEISS} />
          </Bei>
        </Rund>
      );

    case "z262":
      return (
        <Rund fuellung={WEISS} ring={ROT}>
          <SvgText x={50} y={60} fill={SCHWARZ} fontSize={26} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle" letterSpacing={-1}>
            5,5t
          </SvgText>
        </Rund>
      );

    case "z264":
      return (
        <Rund fuellung={WEISS} ring={ROT}>
          <SvgText x={50} y={59} fill={SCHWARZ} fontSize={23} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle">
            2m
          </SvgText>
          <Polygon points="18,41 18,59 27,50" fill={SCHWARZ} />
          <Polygon points="82,41 82,59 73,50" fill={SCHWARZ} />
        </Rund>
      );

    case "z265":
      return (
        <Rund fuellung={WEISS} ring={ROT}>
          <SvgText x={50} y={58} fill={SCHWARZ} fontSize={21} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle" letterSpacing={-0.5}>
            3,8m
          </SvgText>
          <Polygon points="41,18 59,18 50,27" fill={SCHWARZ} />
          <Polygon points="41,82 59,82 50,73" fill={SCHWARZ} />
        </Rund>
      );

    case "z267":
      return (
        <Rund fuellung={ROT}>
          <Rect x={17} y={43} width={66} height={14} rx={1.5} fill={WEISS} />
        </Rund>
      );

    case "z268": {
      const ketten = Array.from({ length: 12 }, (_, i) => (i * 30 * Math.PI) / 180);
      return (
        <Rund fuellung={BLAU}>
          <Circle cx={50} cy={50} r={24} fill="none" stroke={WEISS} strokeWidth={11} />
          <Circle cx={50} cy={50} r={8} fill={WEISS} />
          {ketten.map((w, i) => (
            <Line key={i} x1={50 + 17 * Math.cos(w)} y1={50 + 17 * Math.sin(w)} x2={50 + 31 * Math.cos(w + 0.25)} y2={50 + 31 * Math.sin(w + 0.25)} stroke={BLAU} strokeWidth={2.4} />
          ))}
        </Rund>
      );
    }

    case "z274_10":
    case "z274_20":
    case "z274_30":
    case "z274_40":
    case "z274_50":
    case "z274_60":
    case "z274_70":
    case "z274_80":
    case "z274_100":
    case "z274_120":
      return (
        <Rund fuellung={WEISS} ring={ROT}>
          <TempoZahl zahl={zeichen.slice(5)} />
        </Rund>
      );

    case "z274_1":
      return (
        <Zonenschild>
          <Circle cx={50} cy={38} r={27} fill={ROT} />
          <Circle cx={50} cy={38} r={21.5} fill={WEISS} />
          <SvgText x={50} y={47} fill={SCHWARZ} fontSize={25} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle" letterSpacing={-1}>
            30
          </SvgText>
        </Zonenschild>
      );

    case "z274_2":
      return (
        <Zonenschild textFarbe={GRAU}>
          <Circle cx={50} cy={38} r={26} fill={WEISS} stroke={GRAU} strokeWidth={1.8} />
          <SvgText x={50} y={47} fill={GRAU} fontSize={25} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle" letterSpacing={-1}>
            30
          </SvgText>
          <G stroke={SCHWARZ} strokeWidth={1.8}>
            {[-10, -5, 0, 5, 10].map((v) => (
              <Line key={v} x1={67 + v} y1={21 + v} x2={33 + v} y2={55 + v} />
            ))}
          </G>
        </Zonenschild>
      );

    case "z275":
      return (
        <Rund fuellung={BLAU}>
          <TempoZahl zahl="30" farbe={WEISS} />
        </Rund>
      );

    case "z276":
      return (
        <Rund fuellung={WEISS} ring={ROT}>
          <Bei x={33} y={50.5} s={0.3}>
            <AutoHintenForm f={ROT} />
          </Bei>
          <Bei x={67} y={50.5} s={0.3}>
            <AutoHintenForm f={SCHWARZ} />
          </Bei>
        </Rund>
      );

    case "z277":
      return (
        <Rund fuellung={WEISS} ring={ROT}>
          <Bei x={33} y={48} s={0.32}>
            <LkwHintenForm f={ROT} />
          </Bei>
          <Bei x={67} y={50.5} s={0.3}>
            <AutoHintenForm f={SCHWARZ} />
          </Bei>
        </Rund>
      );

    case "z278":
      return (
        <EndeRund>
          <TempoZahl zahl="60" farbe={GRAU} />
        </EndeRund>
      );

    case "z280":
      return (
        <EndeRund>
          <Bei x={33} y={50.5} s={0.3}>
            <AutoHintenForm f={GRAU} />
          </Bei>
          <Bei x={67} y={50.5} s={0.3}>
            <AutoHintenForm f={GRAU} />
          </Bei>
        </EndeRund>
      );

    case "z282":
      return <EndeRund />;

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

    case "z290":
      return (
        <Zonenschild>
          <Circle cx={50} cy={38} r={27} fill={ROT} />
          <Circle cx={50} cy={38} r={21.5} fill={BLAU} />
          <Line x1={35} y1={23} x2={65} y2={53} stroke={ROT} strokeWidth={5.5} />
        </Zonenschild>
      );

    // ------------------------------------------------------------------ Richt
    case "z301":
      return (
        <Dreieck punkte={SPITZE_OBEN}>
          <Rect x={46} y={40} width={8} height={36} fill={SCHWARZ} />
          <Rect x={33} y={60} width={34} height={4} fill={SCHWARZ} />
        </Dreieck>
      );

    case "z306":
      return (
        <G>
          <Polygon points="50,2 98,50 50,98 2,50" fill={WEISS} stroke={SCHWARZ} strokeWidth={1.4} strokeLinejoin="round" />
          <Polygon points="50,16 84,50 50,84 16,50" fill={GELB} stroke={SCHWARZ} strokeWidth={0.8} strokeLinejoin="round" />
        </G>
      );

    case "z307":
      return (
        <G>
          <Polygon points="50,2 98,50 50,98 2,50" fill={WEISS} stroke={SCHWARZ} strokeWidth={1.4} strokeLinejoin="round" />
          <Polygon points="50,16 84,50 50,84 16,50" fill={GELB} stroke={SCHWARZ} strokeWidth={0.8} strokeLinejoin="round" />
          <G stroke={SCHWARZ} strokeWidth={2.6}>
            {[-9, -3, 3, 9].map((v) => (
              <Line key={v} x1={22 + v} y1={28 - v} x2={72 + v} y2={78 - v} />
            ))}
          </G>
        </G>
      );

    case "z308":
      return (
        <Quadrat fuellung={BLAU}>
          <Rect x={34} y={32} width={7} height={34} fill={ROT} />
          <Polygon points="29,62 46,62 37.5,76" fill={ROT} />
          <Rect x={59} y={34} width={7} height={34} fill={WEISS} />
          <Polygon points="54,38 71,38 62.5,24" fill={WEISS} />
        </Quadrat>
      );

    case "z310":
      return (
        <Ortstafel>
          <SvgText x={50} y={53} fill={SCHWARZ} fontSize={15.5} fontFamily={svgSchrift.fett} fontWeight="700" textAnchor="middle">
            Musterstadt
          </SvgText>
          <SvgText x={50} y={64.5} fill={SCHWARZ} fontSize={6.8} fontFamily={svgSchrift.fett} fontWeight="700" textAnchor="middle">
            Landkreis Beispiel
          </SvgText>
        </Ortstafel>
      );

    case "z311":
      return (
        <Ortstafel>
          <SvgText x={50} y={41} fill={SCHWARZ} fontSize={8} fontFamily={svgSchrift.fett} fontWeight="700" textAnchor="middle">
            Nachbarort 4 km
          </SvgText>
          <Line x1={8} y1={48} x2={92} y2={48} stroke={SCHWARZ} strokeWidth={1.2} />
          <SvgText x={50} y={64} fill={SCHWARZ} fontSize={14} fontFamily={svgSchrift.fett} fontWeight="700" textAnchor="middle">
            Musterstadt
          </SvgText>
          <Ende von={[14, 70]} bis={[86, 51]} breite={4.5} />
        </Ortstafel>
      );

    case "z314":
      return (
        <Quadrat fuellung={BLAU}>
          <SvgText x={50} y={72} fill={WEISS} fontSize={62} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle">
            P
          </SvgText>
        </Quadrat>
      );

    case "z315":
      return (
        <Quadrat fuellung={BLAU}>
          <SvgText x={30} y={47} fill={WEISS} fontSize={40} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle">
            P
          </SvgText>
          <Rect x={44} y={72} width={42} height={4} fill={WEISS} />
          <Rect x={12} y={80} width={34} height={3.5} fill={WEISS} />
          <Bei x={63} y={62} s={0.36} drehen={-12}>
            <Auto f={WEISS} h={BLAU} />
          </Bei>
        </Quadrat>
      );

    case "z325":
      return <Spielstrasse />;

    case "z326":
      return (
        <G>
          <Spielstrasse />
          <Ende von={[8, 80]} bis={[92, 20]} breite={5} />
        </G>
      );

    case "z327":
      return (
        <Quadrat fuellung={BLAU}>
          <Path d="M16,82 L16,52 A34,34 0 0 1 84,52 L84,82 Z" fill={WEISS} />
          <Path d="M27,82 L27,54 A23,23 0 0 1 73,54 L73,82 Z" fill={SCHWARZ} />
          <Polygon points="42,82 48,58 52,58 58,82" fill={WEISS} />
        </Quadrat>
      );

    case "z330":
      return (
        <Quadrat fuellung={BLAU}>
          <AutobahnBild />
        </Quadrat>
      );

    case "z330_2":
      return (
        <Quadrat fuellung={BLAU}>
          <AutobahnBild />
          <Ende />
        </Quadrat>
      );

    case "z331":
      return (
        <Quadrat fuellung={BLAU}>
          <Bei x={50} y={52} s={0.72}>
            <Auto f={WEISS} h={BLAU} />
          </Bei>
        </Quadrat>
      );

    case "z331_2":
      return (
        <Quadrat fuellung={BLAU}>
          <Bei x={50} y={52} s={0.72}>
            <Auto f={WEISS} h={BLAU} />
          </Bei>
          <Ende />
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

    case "z357":
      return (
        <Quadrat fuellung={BLAU}>
          <Rect x={42} y={34} width={16} height={52} fill={WEISS} />
          <Rect x={22} y={18} width={56} height={14} fill={ROT} stroke={WEISS} strokeWidth={2} />
        </Quadrat>
      );

    case "z358":
      return (
        <Quadrat fuellung={BLAU}>
          <Rect x={21} y={21} width={58} height={58} fill={WEISS} />
          <Rect x={43} y={28} width={14} height={44} fill={ROT} />
          <Rect x={28} y={43} width={44} height={14} fill={ROT} />
        </Quadrat>
      );

    case "z365":
      return (
        <Quadrat fuellung={BLAU}>
          <Rect x={20} y={20} width={60} height={60} fill={WEISS} />
          <Bei x={50} y={50} s={0.5}>
            <Zapfsaeule f={SCHWARZ} h={WEISS} />
          </Bei>
        </Quadrat>
      );

    case "z380":
      return (
        <Quadrat fuellung={BLAU}>
          <SvgText x={50} y={62} fill={WEISS} fontSize={34} fontFamily={svgSchrift.schild} fontWeight="800" textAnchor="middle" letterSpacing={-1}>
            130
          </SvgText>
        </Quadrat>
      );
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

/** Zulässige Höchstgeschwindigkeit mit beliebiger Zahl (für Bildkacheln). */
export function TempoZeichen({ zahl, groesse = 96 }: { zahl: number; groesse?: number }) {
  return (
    <Svg width={groesse} height={groesse} viewBox="0 0 100 100">
      <Rund fuellung={WEISS} ring={ROT}>
        <TempoZahl zahl={String(zahl)} />
      </Rund>
    </Svg>
  );
}

export type ZeichenInfo = {
  key: ZeichenKey;
  name: string;
  kurz?: string;
  gruppe: "gefahr" | "vorschrift" | "richt";
  bedeutung: string;
  /** Tipp, wo man das Schild typischerweise findet. */
  fundort: string;
};

export const ZEICHEN_INFO: ZeichenInfo[] = [
  // Gefahrzeichen
  { key: "z101", name: "Gefahrstelle", gruppe: "gefahr", fundort: "Vor besonderen Gefahren, meist mit einem Zusatzzeichen darunter.", bedeutung: "Warnt vor einer Gefahr, für die es kein eigenes Zeichen gibt. Besonders aufmerksam und bremsbereit fahren." },
  { key: "z101_15", name: "Steinschlag", gruppe: "gefahr", fundort: "An Felshängen im Mittelgebirge und in den Alpen.", bedeutung: "Steine können auf die Fahrbahn fallen. Aufmerksam fahren und hier nicht anhalten." },
  { key: "z101_51", name: "Schnee- oder Eisglätte", kurz: "Glätte", gruppe: "gefahr", fundort: "Vor Brücken und schattigen Strecken, oft nur im Winter aufgestellt.", bedeutung: "Bei Schnee oder Eis wird es hier glatt – langsamer fahren und Abstand vergrößern." },
  { key: "z102", name: "Kreuzung mit Vorfahrt von rechts", kurz: "Vorfahrt von rechts", gruppe: "gefahr", fundort: "In Wohngebieten vor Kreuzungen ohne Vorfahrtregelung.", bedeutung: "An der nächsten Kreuzung gilt rechts vor links – langsam heranfahren." },
  { key: "z103_10", name: "Kurve (links)", kurz: "Linkskurve", gruppe: "gefahr", fundort: "Auf Landstraßen vor engen Kurven.", bedeutung: "Eine gefährliche Linkskurve kommt – vorher bremsen, nicht in der Kurve." },
  { key: "z103_20", name: "Kurve (rechts)", kurz: "Rechtskurve", gruppe: "gefahr", fundort: "Auf Landstraßen vor engen Kurven.", bedeutung: "Eine gefährliche Rechtskurve kommt – vorher bremsen, nicht in der Kurve." },
  { key: "z105_20", name: "Doppelkurve (zunächst rechts)", kurz: "Doppelkurve", gruppe: "gefahr", fundort: "Auf kurvigen Landstraßen und Bergstrecken.", bedeutung: "Zwei Kurven direkt hintereinander, die erste nach rechts. Langsam hineinfahren." },
  { key: "z108", name: "Gefälle", gruppe: "gefahr", fundort: "Vor steilen Bergabstrecken.", bedeutung: "Starkes Gefälle – früh herunterschalten und mit dem Motor bremsen." },
  { key: "z110", name: "Steigung", gruppe: "gefahr", fundort: "Vor steilen Bergauf-Strecken.", bedeutung: "Starke Steigung – rechtzeitig einen kleineren Gang wählen." },
  { key: "z112", name: "Unebene Fahrbahn", gruppe: "gefahr", fundort: "Auf schlechten Straßen, an Bahngleisen und Baustellen.", bedeutung: "Die Fahrbahn ist uneben oder hat Schlaglöcher – langsamer fahren." },
  { key: "z114", name: "Schleuder- oder Rutschgefahr", kurz: "Rutschgefahr", gruppe: "gefahr", fundort: "Wo die Straße bei Nässe oder Schmutz glatt wird.", bedeutung: "Bei Nässe oder Schmutz besonders rutschig – sanft lenken und bremsen." },
  { key: "z117", name: "Seitenwind", gruppe: "gefahr", fundort: "Auf Brücken und offenen Strecken, oft an Autobahnen.", bedeutung: "Starker Seitenwind möglich – Lenkrad fest halten, besonders mit Anhänger." },
  { key: "z120", name: "Verengte Fahrbahn", gruppe: "gefahr", fundort: "Vor Engstellen und Brücken.", bedeutung: "Die Fahrbahn wird auf beiden Seiten schmaler – Tempo anpassen." },
  { key: "z121", name: "Einseitig verengte Fahrbahn", kurz: "Einseitig verengt", gruppe: "gefahr", fundort: "Vor Baustellen auf einer Straßenseite.", bedeutung: "Die Fahrbahn wird auf einer Seite enger – rechtzeitig einordnen." },
  { key: "z123", name: "Arbeitsstelle", kurz: "Baustelle", gruppe: "gefahr", fundort: "Vor jeder Baustelle an der Straße.", bedeutung: "Baustelle voraus: langsam fahren, mit Arbeitern und Baufahrzeugen rechnen." },
  { key: "z124", name: "Stau", gruppe: "gefahr", fundort: "Auf Autobahnen vor staugefährdeten Abschnitten.", bedeutung: "Stau oder Staugefahr – früh bremsen und das Stauende sichern." },
  { key: "z125", name: "Gegenverkehr", gruppe: "gefahr", fundort: "Wo eine Fahrbahn plötzlich Gegenverkehr bekommt, z. B. an Baustellen.", bedeutung: "Ab hier kommt dir Verkehr auf deiner Fahrbahn entgegen – weit rechts fahren." },
  { key: "z131", name: "Lichtzeichenanlage", kurz: "Ampel voraus", gruppe: "gefahr", fundort: "Vor Ampeln, die man erst spät sieht.", bedeutung: "Achtung, eine Ampel kommt – oft schlecht zu sehen, rechtzeitig bremsbereit sein." },
  { key: "z133", name: "Fußgänger", gruppe: "gefahr", fundort: "Vor Stellen, an denen oft Menschen die Straße queren.", bedeutung: "Achtung Fußgänger – besonders vorsichtig und bremsbereit fahren." },
  { key: "z136", name: "Kinder", gruppe: "gefahr", fundort: "Vor Schulen, Kindergärten und Spielplätzen.", bedeutung: "Kinder können plötzlich auf die Fahrbahn laufen – Tempo runter, bremsbereit sein." },
  { key: "z138", name: "Radverkehr", gruppe: "gefahr", fundort: "Wo Radwege die Straße kreuzen oder enden.", bedeutung: "Achtung Radfahrer – sie kreuzen oder fahren hier auf der Fahrbahn." },
  { key: "z140", name: "Viehtrieb, Tiere", kurz: "Viehtrieb", gruppe: "gefahr", fundort: "Auf dem Land zwischen Weiden und Höfen.", bedeutung: "Tiere können auf der Straße sein – langsam fahren, im Zweifel anhalten." },
  { key: "z142", name: "Wildwechsel", gruppe: "gefahr", fundort: "An Wald- und Feldrändern auf Landstraßen.", bedeutung: "Wildtiere können plötzlich auftauchen – besonders in der Dämmerung aufpassen." },
  { key: "z151", name: "Bahnübergang", gruppe: "gefahr", fundort: "Vor Bahnübergängen, meist zusammen mit Baken.", bedeutung: "Bahnübergang voraus – langsam heranfahren und auf Züge achten." },

  // Vorschriftzeichen
  { key: "z201", name: "Andreaskreuz", gruppe: "vorschrift", fundort: "Direkt an Bahnübergängen.", bedeutung: "Bahnübergang: Schienenfahrzeuge haben Vorrang. Bei Rotlicht oder geschlossener Schranke warten." },
  { key: "z205", name: "Vorfahrt gewähren", gruppe: "vorschrift", fundort: "An Einmündungen auf größere Straßen.", bedeutung: "Den Querverkehr durchlassen. Anhalten nur, wenn es nötig ist." },
  { key: "z206", name: "Halt. Vorfahrt gewähren", kurz: "Stoppschild", gruppe: "vorschrift", fundort: "An unübersichtlichen Kreuzungen.", bedeutung: "Immer vollständig anhalten – an der Haltlinie oder dort, wo du einsehen kannst – und dann Vorfahrt gewähren." },
  { key: "z208", name: "Vorrang des Gegenverkehrs", kurz: "Gegenverkehr hat Vorrang", gruppe: "vorschrift", fundort: "Vor schmalen Brücken und Engstellen.", bedeutung: "An der Engstelle musst du den Gegenverkehr zuerst durchlassen." },
  { key: "z209", name: "Vorgeschriebene Fahrtrichtung rechts", kurz: "Fahrtrichtung rechts", gruppe: "vorschrift", fundort: "An Einmündungen und Ausfahrten.", bedeutung: "Hier darfst du nur nach rechts fahren." },
  { key: "z209_10", name: "Vorgeschriebene Fahrtrichtung links", kurz: "Fahrtrichtung links", gruppe: "vorschrift", fundort: "An Einmündungen und Ausfahrten.", bedeutung: "Hier darfst du nur nach links fahren." },
  { key: "z209_30", name: "Vorgeschriebene Fahrtrichtung geradeaus", kurz: "Nur geradeaus", gruppe: "vorschrift", fundort: "An Kreuzungen, an denen Abbiegen verboten ist.", bedeutung: "Hier darfst du nur geradeaus fahren." },
  { key: "z211", name: "Vorgeschriebene Fahrtrichtung – hier rechts", kurz: "Hier rechts", gruppe: "vorschrift", fundort: "Direkt an Kreuzungen und Einmündungen.", bedeutung: "Genau hier musst du rechts abbiegen." },
  { key: "z214", name: "Geradeaus oder rechts", gruppe: "vorschrift", fundort: "An Kreuzungen, an denen Linksabbiegen verboten ist.", bedeutung: "Nur geradeaus oder nach rechts – Linksabbiegen ist verboten." },
  { key: "z214_10", name: "Geradeaus oder links", gruppe: "vorschrift", fundort: "An Kreuzungen, an denen Rechtsabbiegen verboten ist.", bedeutung: "Nur geradeaus oder nach links – Rechtsabbiegen ist verboten." },
  { key: "z215", name: "Kreisverkehr", gruppe: "vorschrift", fundort: "An jeder Einfahrt in einen Kreisverkehr.", bedeutung: "Im Kreis gegen den Uhrzeigersinn fahren. Beim Einfahren nicht blinken, beim Ausfahren rechts blinken." },
  { key: "z220", name: "Einbahnstraße (rechts)", kurz: "Einbahnstraße", gruppe: "vorschrift", fundort: "In Innenstädten und engen Wohnstraßen.", bedeutung: "Fahren nur in Pfeilrichtung erlaubt." },
  { key: "z220_10", name: "Einbahnstraße (links)", kurz: "Einbahnstraße links", gruppe: "vorschrift", fundort: "In Innenstädten und engen Wohnstraßen.", bedeutung: "Fahren nur in Pfeilrichtung erlaubt – hier nach links." },
  { key: "z222", name: "Rechts vorbei", gruppe: "vorschrift", fundort: "An Verkehrsinseln und Mittelstreifen.", bedeutung: "Am Hindernis (z. B. Verkehrsinsel) rechts vorbeifahren." },
  { key: "z222_10", name: "Links vorbei", gruppe: "vorschrift", fundort: "An Hindernissen, die man nur links umfahren kann.", bedeutung: "Am Hindernis links vorbeifahren." },
  { key: "z224", name: "Haltestelle", gruppe: "vorschrift", fundort: "An jeder Bus- und Straßenbahnhaltestelle.", bedeutung: "Bus- oder Straßenbahn-Haltestelle. 15 m davor und dahinter nicht parken." },
  { key: "z237", name: "Radweg", gruppe: "vorschrift", fundort: "An Straßen mit eigenem Radweg.", bedeutung: "Nur für Radfahrer – und Radfahrer müssen ihn benutzen. Autos dürfen hier nicht fahren oder parken." },
  { key: "z239", name: "Gehweg", gruppe: "vorschrift", fundort: "Am Anfang von Fußwegen und Gehwegen.", bedeutung: "Nur für Fußgänger. Andere nur, wenn ein Zusatzzeichen es erlaubt – dann in Schrittgeschwindigkeit." },
  { key: "z240", name: "Gemeinsamer Geh- und Radweg", kurz: "Geh- und Radweg", gruppe: "vorschrift", fundort: "An Landstraßen, in Parks und am Stadtrand.", bedeutung: "Fußgänger und Radfahrer teilen sich den Weg – Radfahrer nehmen Rücksicht." },
  { key: "z241", name: "Getrennter Rad- und Gehweg", kurz: "Rad- und Gehweg getrennt", gruppe: "vorschrift", fundort: "Wo Radweg und Gehweg nebeneinander verlaufen.", bedeutung: "Radfahrer nutzen ihre Seite, Fußgänger ihre – so wie auf dem Schild." },
  { key: "z242", name: "Fußgängerzone", gruppe: "vorschrift", fundort: "Am Beginn von Einkaufsstraßen in der Innenstadt.", bedeutung: "Nur für Fußgänger. Fahrzeuge nur mit Zusatzzeichen – dann in Schrittgeschwindigkeit." },
  { key: "z244", name: "Fahrradstraße", gruppe: "vorschrift", fundort: "In Städten auf wichtigen Radrouten.", bedeutung: "Radfahrer haben Vorrang und dürfen nebeneinander fahren. Höchstens 30 km/h, Autos nur mit Zusatzzeichen." },
  { key: "z245", name: "Bussonderfahrstreifen", kurz: "Busspur", gruppe: "vorschrift", fundort: "In größeren Städten an eigenen Busspuren.", bedeutung: "Die Spur gehört den Linienbussen. Andere (z. B. Taxis, Räder) nur mit Zusatzzeichen." },
  { key: "z250", name: "Verbot für Fahrzeuge aller Art", kurz: "Durchfahrt verboten", gruppe: "vorschrift", fundort: "An Wegen, die nur zu Fuß erlaubt sind.", bedeutung: "Keine Fahrzeuge erlaubt. Fahrräder und Motorräder darf man schieben." },
  { key: "z251", name: "Verbot für Kraftwagen", kurz: "Keine Autos", gruppe: "vorschrift", fundort: "An Wirtschaftswegen und Parkzufahrten.", bedeutung: "Autos und andere mehrspurige Kraftfahrzeuge dürfen hier nicht fahren." },
  { key: "z253", name: "Verbot für Kraftfahrzeuge über 3,5 t", kurz: "Lkw-Verbot", gruppe: "vorschrift", fundort: "In Ortsdurchfahrten und Wohngebieten.", bedeutung: "Lkw und Zugmaschinen über 3,5 t dürfen hier nicht fahren – Pkw und Busse schon." },
  { key: "z254", name: "Verbot für Radverkehr", kurz: "Radfahren verboten", gruppe: "vorschrift", fundort: "An Unterführungen, Treppen und Schnellstraßen.", bedeutung: "Radfahren verboten – schieben ist erlaubt." },
  { key: "z255", name: "Verbot für Krafträder", kurz: "Keine Motorräder", gruppe: "vorschrift", fundort: "An Waldwegen und beliebten Motorradstrecken.", bedeutung: "Motorräder, Mofas und Kleinkrafträder dürfen hier nicht fahren." },
  { key: "z259", name: "Verbot für Fußgänger", kurz: "Fußgänger verboten", gruppe: "vorschrift", fundort: "An Tunneln, Brücken und Schnellstraßen.", bedeutung: "Zu Fuß gehen ist hier verboten." },
  { key: "z260", name: "Verbot für Kraftfahrzeuge", kurz: "Keine Kfz", gruppe: "vorschrift", fundort: "An Feld- und Waldwegen, oft mit „Landwirtschaftlicher Verkehr frei“.", bedeutung: "Keine Autos und Motorräder – Radfahrer dürfen weiterfahren." },
  { key: "z262", name: "Verbot bei zu hoher Masse", kurz: "Gewichtsgrenze", gruppe: "vorschrift", fundort: "Vor Brücken mit begrenzter Tragkraft.", bedeutung: "Fahrzeuge, die tatsächlich schwerer sind als angegeben, dürfen nicht weiterfahren." },
  { key: "z264", name: "Verbot bei zu großer Breite", kurz: "Breitengrenze", gruppe: "vorschrift", fundort: "Vor engen Durchfahrten und Baustellen.", bedeutung: "Fahrzeuge, die breiter sind als angegeben (mit Ladung), dürfen nicht durch." },
  { key: "z265", name: "Verbot bei zu großer Höhe", kurz: "Höhengrenze", gruppe: "vorschrift", fundort: "Vor niedrigen Brücken und Unterführungen.", bedeutung: "Fahrzeuge, die höher sind als angegeben (mit Ladung), dürfen nicht durch." },
  { key: "z267", name: "Verbot der Einfahrt", gruppe: "vorschrift", fundort: "Am Ende von Einbahnstraßen.", bedeutung: "Einfahren verboten – zum Beispiel am Ende einer Einbahnstraße." },
  { key: "z268", name: "Schneeketten vorgeschrieben", kurz: "Schneeketten", gruppe: "vorschrift", fundort: "Im Winter an Bergstraßen.", bedeutung: "Weiterfahren nur mit Schneeketten – und dann höchstens 50 km/h." },
  { key: "z274_10", name: "Höchstgeschwindigkeit 10", kurz: "Tempo 10", gruppe: "vorschrift", fundort: "Auf Parkplätzen, an Engstellen und Baustellen.", bedeutung: "Höchstens 10 km/h – fast Schritttempo." },
  { key: "z274_20", name: "Höchstgeschwindigkeit 20", kurz: "Tempo 20", gruppe: "vorschrift", fundort: "In Innenstädten, vor Schulen und an Baustellen.", bedeutung: "Höchstens 20 km/h fahren." },
  { key: "z274_30", name: "Höchstgeschwindigkeit 30", kurz: "Tempo 30", gruppe: "vorschrift", fundort: "In Wohnstraßen, vor Schulen und Kliniken.", bedeutung: "Höchstens 30 km/h – bei schlechten Bedingungen langsamer." },
  { key: "z274_40", name: "Höchstgeschwindigkeit 40", kurz: "Tempo 40", gruppe: "vorschrift", fundort: "Vor Baustellen und Kurven außerorts.", bedeutung: "Höchstens 40 km/h fahren." },
  { key: "z274_50", name: "Höchstgeschwindigkeit 50", kurz: "Tempo 50", gruppe: "vorschrift", fundort: "Vor Ortseinfahrten und Kreuzungen außerorts.", bedeutung: "Nicht schneller als 50 km/h fahren – auch dort, wo sonst mehr erlaubt wäre." },
  { key: "z274_60", name: "Höchstgeschwindigkeit 60", kurz: "Tempo 60", gruppe: "vorschrift", fundort: "An Ortsrändern und vor Einmündungen auf Landstraßen.", bedeutung: "Höchstens 60 km/h fahren." },
  { key: "z274_70", name: "Höchstgeschwindigkeit 70", kurz: "Tempo 70", gruppe: "vorschrift", fundort: "Auf Landstraßen vor Gefahrstellen und auf Stadtschnellstraßen.", bedeutung: "Nicht schneller als 70 km/h fahren, bis das Verbot aufgehoben wird." },
  { key: "z274_80", name: "Höchstgeschwindigkeit 80", kurz: "Tempo 80", gruppe: "vorschrift", fundort: "Auf Landstraßen und in Autobahnbaustellen.", bedeutung: "Höchstens 80 km/h fahren." },
  { key: "z274_100", name: "Höchstgeschwindigkeit 100", kurz: "Tempo 100", gruppe: "vorschrift", fundort: "Auf Autobahnen und gut ausgebauten Schnellstraßen.", bedeutung: "Höchstens 100 km/h fahren." },
  { key: "z274_120", name: "Höchstgeschwindigkeit 120", kurz: "Tempo 120", gruppe: "vorschrift", fundort: "Auf Autobahnen, z. B. vor Kurven oder in Stadtnähe.", bedeutung: "Höchstens 120 km/h fahren." },
  { key: "z274_1", name: "Beginn einer Tempo-30-Zone", kurz: "Tempo-30-Zone", gruppe: "vorschrift", fundort: "An den Einfahrten in Wohngebiete.", bedeutung: "Im ganzen Gebiet höchstens 30 km/h – meist gilt dort rechts vor links." },
  { key: "z274_2", name: "Ende einer Tempo-30-Zone", kurz: "Ende Tempo-30-Zone", gruppe: "vorschrift", fundort: "An den Ausfahrten aus Wohngebieten.", bedeutung: "Die Tempo-30-Zone ist zu Ende – danach gilt wieder das normale Tempolimit." },
  { key: "z275", name: "Vorgeschriebene Mindestgeschwindigkeit", kurz: "Mindesttempo", gruppe: "vorschrift", fundort: "In Tunneln und auf manchen Autobahnabschnitten.", bedeutung: "Langsamer als angegeben darfst du hier nicht fahren – außer Verkehr oder Wetter zwingen dich dazu." },
  { key: "z276", name: "Überholverbot", gruppe: "vorschrift", fundort: "Auf Landstraßen vor Kuppen und Kurven.", bedeutung: "Mehrspurige Kraftfahrzeuge dürfen nicht überholt werden. Einspurige Fahrzeuge schon." },
  { key: "z277", name: "Überholverbot für Kraftfahrzeuge über 3,5 t", kurz: "Lkw-Überholverbot", gruppe: "vorschrift", fundort: "Auf Autobahnen an Steigungen und Baustellen.", bedeutung: "Lkw über 3,5 t, Busse und Pkw mit Anhänger dürfen hier keine mehrspurigen Fahrzeuge überholen." },
  { key: "z278", name: "Ende der zulässigen Höchstgeschwindigkeit", kurz: "Ende Tempolimit", gruppe: "vorschrift", fundort: "Hinter Baustellen, Kurven und Ortsausgängen.", bedeutung: "Das angezeigte Tempolimit ist aufgehoben – es gilt wieder die normale Höchstgeschwindigkeit." },
  { key: "z280", name: "Ende des Überholverbots", kurz: "Ende Überholverbot", gruppe: "vorschrift", fundort: "Am Ende einer Überholverbotsstrecke.", bedeutung: "Überholen ist wieder erlaubt, wenn die Lage es zulässt." },
  { key: "z282", name: "Ende sämtlicher Streckenverbote", kurz: "Ende aller Verbote", gruppe: "vorschrift", fundort: "Auf Landstraßen und Autobahnen hinter Gefahrstellen.", bedeutung: "Alle vorher angeordneten Tempolimits und Überholverbote sind aufgehoben." },
  { key: "z283", name: "Absolutes Halteverbot", gruppe: "vorschrift", fundort: "An Einfahrten, Engstellen und Hauptstraßen.", bedeutung: "Halten ist auf der Fahrbahn verboten – auch kurz." },
  { key: "z286", name: "Eingeschränktes Halteverbot", kurz: "Eingeschr. Halteverbot", gruppe: "vorschrift", fundort: "An Geschäftsstraßen und Lieferzonen.", bedeutung: "Halten länger als drei Minuten verboten, außer zum Ein- und Aussteigen oder Be- und Entladen." },
  { key: "z290", name: "Beginn eines eingeschränkten Halteverbots für eine Zone", kurz: "Zonenhalteverbot", gruppe: "vorschrift", fundort: "An den Einfahrten in Altstädte und Innenstädte.", bedeutung: "In der ganzen Zone ist Halten über drei Minuten verboten – außer auf markierten Parkflächen." },

  // Richtzeichen
  { key: "z301", name: "Vorfahrt an der nächsten Kreuzung", kurz: "Vorfahrt nächste Kreuzung", gruppe: "richt", fundort: "Vor Kreuzungen und Einmündungen.", bedeutung: "An der nächsten Kreuzung oder Einmündung hast du Vorfahrt." },
  { key: "z306", name: "Vorfahrtstraße", gruppe: "richt", fundort: "An Hauptstraßen, meist hinter Kreuzungen.", bedeutung: "Du hast Vorfahrt, bis ein Zeichen sie aufhebt." },
  { key: "z307", name: "Ende der Vorfahrtstraße", gruppe: "richt", fundort: "Wo eine Hauptstraße ihre Vorfahrt verliert.", bedeutung: "Deine Vorfahrt endet hier. Ab jetzt gelten wieder Zeichen oder rechts vor links." },
  { key: "z308", name: "Vorrang vor dem Gegenverkehr", kurz: "Du hast Vorrang", gruppe: "richt", fundort: "Vor schmalen Brücken und Engstellen.", bedeutung: "An der Engstelle darfst du zuerst fahren – der Gegenverkehr wartet." },
  { key: "z310", name: "Ortstafel (Anfang)", kurz: "Ortseingang", gruppe: "richt", fundort: "An jedem Ortseingang.", bedeutung: "Hier beginnt der Ort: höchstens 50 km/h, falls nichts anderes angezeigt ist." },
  { key: "z311", name: "Ortstafel (Ende)", kurz: "Ortsausgang", gruppe: "richt", fundort: "An jedem Ortsausgang.", bedeutung: "Der Ort endet – außerorts sind mit dem Auto höchstens 100 km/h erlaubt." },
  { key: "z314", name: "Parken", gruppe: "richt", fundort: "An Parkplätzen und Parkhäusern.", bedeutung: "Parken ist erlaubt. Zusatzzeichen können es einschränken." },
  { key: "z315", name: "Parken auf Gehwegen", gruppe: "richt", fundort: "In engen Wohnstraßen.", bedeutung: "Parken auf dem Gehweg ist erlaubt – nur wie abgebildet und nur bis 2,8 t." },
  { key: "z325", name: "Verkehrsberuhigter Bereich", kurz: "Spielstraße", gruppe: "richt", fundort: "In Wohnstraßen, oft an der Einfahrt ins Viertel.", bedeutung: "Schrittgeschwindigkeit! Fußgänger dürfen die ganze Straße nutzen, Kinder überall spielen." },
  { key: "z326", name: "Ende eines verkehrsberuhigten Bereichs", kurz: "Ende Spielstraße", gruppe: "richt", fundort: "An der Ausfahrt aus Spielstraßen.", bedeutung: "Die Spielstraße endet – beim Hinausfahren musst du allen anderen Vorrang lassen." },
  { key: "z327", name: "Tunnel", gruppe: "richt", fundort: "Vor Tunneleinfahrten.", bedeutung: "Im Tunnel: Licht an, nicht wenden, nicht halten." },
  { key: "z330", name: "Autobahn", gruppe: "richt", fundort: "An jeder Autobahnauffahrt.", bedeutung: "Ab hier Autobahn: nur für Kraftfahrzeuge, die schneller als 60 km/h fahren können." },
  { key: "z330_2", name: "Ende der Autobahn", gruppe: "richt", fundort: "Wo die Autobahn in eine normale Straße übergeht.", bedeutung: "Die Autobahn endet – ab hier gelten wieder die normalen Regeln." },
  { key: "z331", name: "Kraftfahrstraße", gruppe: "richt", fundort: "An Schnellstraßen, die wie Autobahnen ausgebaut sind.", bedeutung: "Nur für Kraftfahrzeuge über 60 km/h – Halten ist verboten." },
  { key: "z331_2", name: "Ende der Kraftfahrstraße", gruppe: "richt", fundort: "Wo die Schnellstraße endet.", bedeutung: "Die Kraftfahrstraße endet – ab hier dürfen alle Fahrzeuge fahren." },
  { key: "z350", name: "Fußgängerüberweg", kurz: "Zebrastreifen", gruppe: "richt", fundort: "An jedem Zebrastreifen.", bedeutung: "Fußgängern das Überqueren ermöglichen, mäßig heranfahren, nicht überholen." },
  { key: "z357", name: "Sackgasse", gruppe: "richt", fundort: "An der Einfahrt in Stichstraßen.", bedeutung: "Die Straße geht nicht durch. Wenden musst du am Ende." },
  { key: "z358", name: "Erste Hilfe", gruppe: "richt", fundort: "An Raststätten und Rettungswachen.", bedeutung: "Hier gibt es eine Stelle für Erste Hilfe." },
  { key: "z365", name: "Tankstelle", gruppe: "richt", fundort: "Vor Tankstellen an Autobahnen und Bundesstraßen.", bedeutung: "Hinweis auf eine Tankstelle." },
  { key: "z380", name: "Richtgeschwindigkeit", kurz: "Richtgeschwindigkeit 130", gruppe: "richt", fundort: "An Autobahnen, meist hinter den Auffahrten.", bedeutung: "Empfohlen sind höchstens 130 km/h. Wer schneller fährt, haftet bei einem Unfall eher mit." },
];
