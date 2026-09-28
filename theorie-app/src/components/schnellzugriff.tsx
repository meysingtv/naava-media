import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop } from "react-native-svg";

import { tippen } from "@/lib/haptik";
import { schrift } from "@/lib/theme";

// Die vier Kacheln unter „Lernen starten“ – Füllung, Glasrand, Schimmer und
// Icons Pixel für Pixel aus der Vorlage gemessen.

const HOEHE = 100;
const ABSTAND = 9;
const RUND = 13;
const RAND = 16;

type Stil = {
  /** Füllung von oben nach unten. */
  fuellung: readonly (readonly [number, string])[];
  /** Heller Schimmer oben links. */
  schimmer?: { farbe: string; deckkraft: number };
  /** Farbiges Leuchten hinter dem Icon. */
  leuchten?: { farbe: string; deckkraft: number };
  /** Glasrand: oben hell, an den Seiten schwächer, unten fast weg. */
  rand: { farbe: string; oben: number; seite: number; unten: number };
};

const STILE = {
  themen: {
    fuellung: [
      [0, "#322A22"],
      [0.18, "#282119"],
      [0.34, "#261E18"],
      [0.5, "#2A1E15"],
      [0.67, "#342213"],
      [0.84, "#3F2612"],
      [1, "#48290F"],
    ],
    schimmer: { farbe: "#FFB464", deckkraft: 0.1 },
    rand: { farbe: "#FFC373", oben: 0.24, seite: 0.12, unten: 0.14 },
  },
  pruefung: {
    fuellung: [
      [0, "#2E2231"],
      [0.17, "#291C2A"],
      [0.3, "#231725"],
      [0.45, "#1C131E"],
      [0.6, "#19111B"],
      [1, "#17111A"],
    ],
    leuchten: { farbe: "#FF4F72", deckkraft: 0.1 },
    rand: { farbe: "#FFCDC8", oben: 0.15, seite: 0.065, unten: 0.05 },
  },
  statistik: {
    fuellung: [
      [0, "#171E27"],
      [0.17, "#151B22"],
      [0.3, "#13181F"],
      [0.45, "#0F141A"],
      [0.55, "#0E1317"],
      [1, "#0E1216"],
    ],
    schimmer: { farbe: "#B884C0", deckkraft: 0.26 },
    rand: { farbe: "#FFFFFF", oben: 0.135, seite: 0.065, unten: 0.035 },
  },
  favoriten: {
    fuellung: [
      [0, "#1A1B1E"],
      [0.15, "#18191B"],
      [0.3, "#141517"],
      [0.5, "#101213"],
      [0.7, "#0D0F10"],
      [1, "#0D0F11"],
    ],
    schimmer: { farbe: "#FFFFFF", deckkraft: 0.03 },
    leuchten: { farbe: "#FF7A1E", deckkraft: 0.16 },
    rand: { farbe: "#FFEBDC", oben: 0.1, seite: 0.055, unten: 0.04 },
  },
} satisfies Record<string, Stil>;

type KachelId = keyof typeof STILE;

function Hintergrund({ id, breite }: { id: KachelId; breite: number }) {
  const stil: Stil = STILE[id];
  const { rand } = stil;
  return (
    <Svg width={breite} height={HOEHE} style={{ position: "absolute", top: 0, left: 0 }}>
      <Defs>
        <LinearGradient id={`kf-${id}`} x1="0" y1="0" x2="0" y2="1">
          {stil.fuellung.map(([pos, farbe]) => (
            <Stop key={pos} offset={pos} stopColor={farbe} />
          ))}
        </LinearGradient>
        {stil.schimmer ? (
          <RadialGradient id={`ks-${id}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={stil.schimmer.farbe} stopOpacity={stil.schimmer.deckkraft} />
            <Stop offset="1" stopColor={stil.schimmer.farbe} stopOpacity={0} />
          </RadialGradient>
        ) : null}
        {stil.leuchten ? (
          <RadialGradient id={`kl-${id}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={stil.leuchten.farbe} stopOpacity={stil.leuchten.deckkraft} />
            <Stop offset="0.5" stopColor={stil.leuchten.farbe} stopOpacity={stil.leuchten.deckkraft * 0.5} />
            <Stop offset="1" stopColor={stil.leuchten.farbe} stopOpacity={0} />
          </RadialGradient>
        ) : null}
        <LinearGradient id={`kr-${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={rand.farbe} stopOpacity={rand.oben} />
          <Stop offset="0.06" stopColor={rand.farbe} stopOpacity={rand.oben * 0.8} />
          <Stop offset="0.15" stopColor={rand.farbe} stopOpacity={rand.seite * 1.25} />
          <Stop offset="0.5" stopColor={rand.farbe} stopOpacity={rand.seite} />
          <Stop offset="0.9" stopColor={rand.farbe} stopOpacity={(rand.seite + rand.unten) / 2} />
          <Stop offset="1" stopColor={rand.farbe} stopOpacity={rand.unten} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={breite} height={HOEHE} rx={RUND} fill={`url(#kf-${id})`} />
      {stil.schimmer ? <Ellipse cx={0} cy={HOEHE * 0.1} rx={breite * 0.6} ry={HOEHE * 0.7} fill={`url(#ks-${id})`} /> : null}
      {stil.leuchten ? <Ellipse cx={breite / 2} cy={HOEHE * 0.37} rx={breite * 0.5} ry={HOEHE * 0.42} fill={`url(#kl-${id})`} /> : null}
      <Rect x={0.5} y={0.5} width={breite - 1} height={HOEHE - 1} rx={RUND - 0.5} fill="none" stroke={`url(#kr-${id})`} strokeWidth={1} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Icons mit Verlauf wie in der Vorlage
// ---------------------------------------------------------------------------

const SEITE_LINKS =
  "M16.9 3.8 C13.2 2.2 8.4 1.7 4 2.3 C2.6 2.5 1.6 3.6 1.6 5 L1.6 24.6 C1.6 25.9 2.7 26.8 4 26.6 C8.6 26 13 26.9 16.2 28.9 C16.6 29.1 16.9 28.9 16.9 28.5 Z";
const SEITE_RECHTS =
  "M19.1 3.8 C22.8 2.2 27.6 1.7 32 2.3 C33.4 2.5 34.4 3.6 34.4 5 L34.4 24.6 C34.4 25.9 33.3 26.8 32 26.6 C27.4 26 23 26.9 19.8 28.9 C19.4 29.1 19.1 28.9 19.1 28.5 Z";

function BuchIcon() {
  return (
    <Svg width={38} height={32.7} viewBox="0 0 36 31">
      <Defs>
        <LinearGradient id="buch-seite" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFD67F" />
          <Stop offset="0.5" stopColor="#FDBD5F" />
          <Stop offset="1" stopColor="#FCB151" />
        </LinearGradient>
        <LinearGradient id="buch-schnitt" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FA8C24" />
          <Stop offset="1" stopColor="#D6660F" />
        </LinearGradient>
      </Defs>
      {/* Buchblock unter den Seiten */}
      <Path d={SEITE_LINKS} fill="url(#buch-schnitt)" transform="translate(0 1.8)" />
      <Path d={SEITE_RECHTS} fill="url(#buch-schnitt)" transform="translate(0 1.8)" />
      <Path d={SEITE_LINKS} fill="url(#buch-seite)" stroke="#FFA22E" strokeWidth={0.9} strokeLinejoin="round" />
      <Path d={SEITE_RECHTS} fill="url(#buch-seite)" stroke="#FFA22E" strokeWidth={0.9} strokeLinejoin="round" />
    </Svg>
  );
}

function ZielIcon() {
  const pink = "url(#ziel-pink)";
  return (
    <Svg width={36} height={36} viewBox="0 0 34 34">
      <Defs>
        <LinearGradient id="ziel-pink" gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="33">
          <Stop offset="0" stopColor="#FF7888" />
          <Stop offset="1" stopColor="#EE4A60" />
        </LinearGradient>
      </Defs>
      <Circle cx={15} cy={19} r={11.9} stroke={pink} strokeWidth={4} fill="none" />
      <Circle cx={15} cy={19} r={4.85} stroke={pink} strokeWidth={3.3} fill="none" />
      {/* Pfeil: dunkle Fuge über den Ringen, Schaft, Spitze in der Mitte, Federn außen */}
      <Path d="M17.2 16.8 L27.5 6.5" stroke="#1F1422" strokeWidth={5.4} strokeLinecap="round" />
      <Path d="M16.4 17.6 L27.5 6.5" stroke={pink} strokeWidth={2.5} strokeLinecap="round" />
      <Polygon points="15,19 18.6,18.08 15.92,15.4" fill={pink} />
      <Polygon points="27.5,9.61 30.19,6.93 27.92,6.08 27.08,3.81 24.39,6.5" fill={pink} />
    </Svg>
  );
}

function SaeulenIcon() {
  return (
    <Svg width={28} height={30} viewBox="0 0 28 30">
      <Defs>
        <LinearGradient id="saeule-silber" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="30">
          <Stop offset="0" stopColor="#F6F7FA" />
          <Stop offset="0.55" stopColor="#D5D9E2" />
          <Stop offset="1" stopColor="#B9BFCB" />
        </LinearGradient>
        <LinearGradient id="saeule-kante" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="0.3" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.7" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.3} />
        </LinearGradient>
      </Defs>
      {[
        { x: 0.5, y: 17.3 },
        { x: 10.5, y: 9.2 },
        { x: 20.5, y: 0.5 },
      ].map((s) => (
        <Rect key={s.x} x={s.x} y={s.y} width={7} height={29.5 - s.y} rx={2.4} fill="url(#saeule-silber)" />
      ))}
      {[
        { x: 0.5, y: 17.3 },
        { x: 10.5, y: 9.2 },
        { x: 20.5, y: 0.5 },
      ].map((s) => (
        <Rect key={`k${s.x}`} x={s.x} y={s.y} width={7} height={29.5 - s.y} rx={2.4} fill="url(#saeule-kante)" />
      ))}
    </Svg>
  );
}

function HerzIcon() {
  return (
    <Svg width={34} height={30.8} viewBox="0 0 32 29">
      <Defs>
        <LinearGradient id="herz-orange" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF9E2E" />
          <Stop offset="0.3" stopColor="#FD8A1D" />
          <Stop offset="0.6" stopColor="#FE7C17" />
          <Stop offset="1" stopColor="#F3660A" />
        </LinearGradient>
      </Defs>
      <Path
        d="M16 28.2 C15.5 28.2 15 28 14.6 27.6 C7.7 21.8 1.5 16.7 1.5 9.9 C1.5 5.3 5 1.8 9.4 1.8 C12.1 1.8 14.5 3.2 16 5.4 C17.5 3.2 19.9 1.8 22.6 1.8 C27 1.8 30.5 5.3 30.5 9.9 C30.5 16.7 24.3 21.8 17.4 27.6 C17 28 16.5 28.2 16 28.2 Z"
        fill="url(#herz-orange)"
      />
    </Svg>
  );
}

const ICONS: Record<KachelId, () => React.JSX.Element> = {
  themen: BuchIcon,
  pruefung: ZielIcon,
  statistik: SaeulenIcon,
  favoriten: HerzIcon,
};

function Kachel({ id, titel, breite, onPress }: { id: KachelId; titel: string; breite: number; onPress: () => void }) {
  const Symbol = ICONS[id];
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={titel}
      style={({ pressed }) => ({ width: breite, height: HOEHE, borderRadius: RUND, overflow: "hidden", transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      <Hintergrund id={id} breite={breite} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 11 }}>
        <View style={{ height: 36, alignItems: "center", justifyContent: "center" }}>
          <Symbol />
        </View>
        <Text style={{ ...schrift.textHalb, fontSize: 14, color: "#FFFFFF" }} numberOfLines={1}>
          {titel}
        </Text>
      </View>
    </Pressable>
  );
}

export type Schnellziel = { id: KachelId; titel: string; onPress: () => void };

/** Reihe mit den vier Kacheln Themen, Prüfung, Statistiken, Favoriten. */
export function Schnellzugriff({ ziele, style }: { ziele: Schnellziel[]; style?: object }) {
  const { width } = useWindowDimensions();
  const breite = Math.floor(((width - 2 * RAND - (ziele.length - 1) * ABSTAND) / ziele.length) * 2) / 2;
  return (
    <View style={[{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: RAND }, style]}>
      {ziele.map((z) => (
        <Kachel key={z.id} id={z.id} titel={z.titel} breite={breite} onPress={z.onPress} />
      ))}
    </View>
  );
}
