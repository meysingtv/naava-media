import Svg, { Circle, G, Line, Path, Rect } from "react-native-svg";

import type { LeuchteKey } from "@/lib/fragen";

// Kontrollleuchten im Cockpit (viewBox 100 × 100) als Linien-Symbole.
// Rot = sofort anhalten, Gelb = bald in die Werkstatt, Blau/Grün = Info.

export const LEUCHTE_FARBE: Record<LeuchteKey, string> = {
  leuchte_batterie: "#FF4D3D",
  leuchte_oel: "#FF4D3D",
  leuchte_bremse: "#FF4D3D",
  leuchte_kuehlmittel: "#FF4D3D",
  leuchte_motor: "#FFC400",
  leuchte_fernlicht: "#3D8BFF",
};

export const LEUCHTE_NAME: Record<LeuchteKey, string> = {
  leuchte_batterie: "Ladekontrolle",
  leuchte_oel: "Öldruck",
  leuchte_bremse: "Bremsanlage",
  leuchte_kuehlmittel: "Kühlmittel",
  leuchte_motor: "Motorkontrolle",
  leuchte_fernlicht: "Fernlicht",
};

function Symbol({ leuchte, farbe }: { leuchte: LeuchteKey; farbe: string }) {
  const s = { stroke: farbe, strokeWidth: 6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  switch (leuchte) {
    case "leuchte_batterie":
      return (
        <G {...s}>
          <Rect x={14} y={32} width={72} height={46} rx={5} />
          <Rect x={24} y={22} width={14} height={10} rx={2} />
          <Rect x={62} y={22} width={14} height={10} rx={2} />
          <Line x1={26} y1={54} x2={40} y2={54} />
          <Line x1={60} y1={54} x2={74} y2={54} />
          <Line x1={67} y1={47} x2={67} y2={61} />
        </G>
      );
    case "leuchte_oel":
      return (
        <G>
          <G {...s}>
            <Path d="M28,52 H62 L86,40 L68,68 H32 Z" />
            <Path d="M28,55 L14,50 V62 L28,64" />
            <Line x1={44} y1={52} x2={44} y2={44} />
            <Line x1={38} y1={44} x2={50} y2={44} />
          </G>
          <Path d="M88,56 C84,64 84,68 88,70 C92,68 92,64 88,56 Z" fill={farbe} />
        </G>
      );
    case "leuchte_motor":
      return (
        <G {...s}>
          <Path d="M24,42 H34 V34 H60 V42 H68 L74,48 H82 V62 H74 L68,70 H40 L32,62 H24 Z" />
          <Line x1={14} y1={46} x2={14} y2={62} />
          <Line x1={14} y1={54} x2={24} y2={54} />
          <Line x1={42} y1={34} x2={42} y2={26} />
          <Line x1={36} y1={26} x2={52} y2={26} />
        </G>
      );
    case "leuchte_bremse":
      return (
        <G>
          <G {...s}>
            <Circle cx={50} cy={50} r={25} />
            <Path d="M22,26 A36,36 0 0 0 22,74" />
            <Path d="M78,26 A36,36 0 0 1 78,74" />
            <Line x1={50} y1={36} x2={50} y2={53} />
          </G>
          <Circle cx={50} cy={63} r={4} fill={farbe} />
        </G>
      );
    case "leuchte_kuehlmittel":
      return (
        <G>
          <G {...s}>
            <Line x1={50} y1={16} x2={50} y2={58} />
            <Line x1={50} y1={24} x2={62} y2={24} />
            <Line x1={50} y1={34} x2={60} y2={34} />
            <Line x1={50} y1={44} x2={62} y2={44} />
            <Path d="M16,82 q8,-7 17,0 t17,0 t17,0 t17,0" />
          </G>
          <Circle cx={50} cy={64} r={8} fill={farbe} />
        </G>
      );
    case "leuchte_fernlicht":
      return (
        <G {...s}>
          <Path d="M46,28 C70,28 80,40 80,50 C80,60 70,72 46,72 Z" />
          <Line x1={16} y1={34} x2={34} y2={34} />
          <Line x1={16} y1={45} x2={34} y2={45} />
          <Line x1={16} y1={56} x2={34} y2={56} />
          <Line x1={16} y1={67} x2={34} y2={67} />
        </G>
      );
  }
}

export function Kontrollleuchte({ leuchte, groesse = 96, aus }: { leuchte: LeuchteKey; groesse?: number; aus?: boolean }) {
  const farbe = aus ? "#2B2E35" : LEUCHTE_FARBE[leuchte];
  return (
    <Svg width={groesse} height={groesse} viewBox="0 0 100 100">
      {!aus ? <Circle cx={50} cy={50} r={46} fill={farbe} opacity={0.1} /> : null}
      <Symbol leuchte={leuchte} farbe={farbe} />
    </Svg>
  );
}
