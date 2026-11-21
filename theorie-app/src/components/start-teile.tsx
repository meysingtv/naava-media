import type { ReactNode } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Polygon, Rect } from "react-native-svg";

import { Icon, type IconName } from "@/components/icon";
import { tippen } from "@/lib/haptik";
import type { SFSymbol } from "expo-symbols";

// Bausteine für den Start (Willkommen, Fragen vor dem Konto): eigene,
// lila Farbwelt mit schmaler, kräftiger Überschrift und Knöpfen mit Kante.

export const START = {
  lila: "#8C7AE6",
  lilaHell: "#B4A8F4",
  lilaKante: "#6D5BC9",
  lilaTief: "#1F1B45",
  lilaGeraet: "#35305F",
  grund: "#0B0C16",
  text: "#FFFFFF",
  text2: "#C9C6DA",
  text3: "#8E8BA3",
  knopfHell: "#F3F1FF",
  knopfHellKante: "#C7C1E4",
  knopfHellText: "#16122B",
  knopfDunkel: "#20212C",
  knopfDunkelKante: "#14151D",
} as const;

/** Schmale, kräftige Schrift für Überschriften und Knöpfe. */
export const startSchrift = {
  titel: { fontFamily: "BarlowCondensed_800ExtraBold" },
  fett: { fontFamily: "BarlowCondensed_700Bold" },
  text: { fontFamily: "Inter_400Regular" },
  textHalb: { fontFamily: "Inter_600SemiBold" },
} as const;

type KnopfArt = "hell" | "dunkel" | "lila";

const KNOPF: Record<KnopfArt, { flaeche: string; kante: string; text: string }> = {
  hell: { flaeche: START.knopfHell, kante: START.knopfHellKante, text: START.knopfHellText },
  dunkel: { flaeche: START.knopfDunkel, kante: START.knopfDunkelKante, text: START.text },
  lila: { flaeche: START.lila, kante: START.lilaKante, text: "#FFFFFF" },
};

const KANTE = 5;

/** Großer, runder Knopf mit fester Kante unten – gedrückt sinkt er ein. */
export function StartKnopf({ titel, art = "hell", onPress, deaktiviert, style }: { titel: string; art?: KnopfArt; onPress: () => void; deaktiviert?: boolean; style?: StyleProp<ViewStyle> }) {
  const k = KNOPF[art];
  return (
    <Pressable
      onPress={() => {
        if (deaktiviert) return;
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!deaktiviert }}
      style={[{ height: 58 + KANTE }, style]}
    >
      {({ pressed }) => {
        const tief = pressed && !deaktiviert ? KANTE - 1 : 0;
        return (
          <View style={{ flex: 1, justifyContent: "flex-end", opacity: deaktiviert ? 0.45 : 1 }}>
            <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 58, borderRadius: 29, backgroundColor: k.kante }} />
            <View style={{ height: 58, borderRadius: 29, backgroundColor: k.flaeche, alignItems: "center", justifyContent: "center", transform: [{ translateY: tief - KANTE }] }}>
              <Text style={{ ...startSchrift.titel, fontSize: 23, letterSpacing: -0.2, color: k.text }}>{titel}</Text>
            </View>
          </View>
        );
      }}
    </Pressable>
  );
}

/** Punkte für die Seiten des Starts. */
export function SeitenPunkte({ anzahl, aktiv }: { anzahl: number; aktiv: number }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 9 }}>
      {Array.from({ length: anzahl }, (_, i) => (
        <View key={i} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: i === aktiv ? "#FFFFFF" : "rgba(255,255,255,0.28)" }} />
      ))}
    </View>
  );
}

/** Lorbeerzweig (links oder gespiegelt rechts). */
function Lorbeer({ rechts }: { rechts?: boolean }) {
  const blaetter = [
    { x: 21, y: 50, r: -60 },
    { x: 14, y: 41, r: -35 },
    { x: 10, y: 31, r: -15 },
    { x: 10, y: 20, r: 8 },
    { x: 14, y: 10, r: 30 },
  ];
  return (
    <Svg width={26} height={56} viewBox="0 0 32 60" style={rechts ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Path d="M27 56 C 12 48, 6 32, 16 6" stroke={START.lila} strokeWidth={2.2} fill="none" strokeLinecap="round" />
      {blaetter.map((b, i) => (
        <G key={i} transform={`rotate(${b.r} ${b.x} ${b.y})`}>
          <Ellipse cx={b.x - 4} cy={b.y} rx={5} ry={2.4} fill={START.lila} />
          <Ellipse cx={b.x + 4.5} cy={b.y - 2} rx={4.4} ry={2.1} fill={START.lilaHell} transform={`rotate(-50 ${b.x + 4.5} ${b.y - 2})`} />
        </G>
      ))}
    </Svg>
  );
}

/** Wert mit Lorbeer links und rechts. */
export function LorbeerWert({ wert, label }: { wert: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Lorbeer />
      <View style={{ alignItems: "center" }}>
        <Text style={{ ...startSchrift.titel, fontSize: 30, lineHeight: 32, color: START.text }}>{wert}</Text>
        <Text style={{ ...startSchrift.fett, fontSize: 13.5, letterSpacing: 0.6, color: START.text }}>{label}</Text>
      </View>
      <Lorbeer rechts />
    </View>
  );
}

type Schwebe = { name: IconName; sf?: SFSymbol; x: number; y: number; groesse: number; dreh: number };

const SCHWEBEN: Schwebe[] = [
  { name: "sparkles", x: 0.13, y: 0.13, groesse: 26, dreh: -12 },
  { name: "trophy-outline", sf: "trophy", x: 0.24, y: 0.3, groesse: 34, dreh: -14 },
  { name: "sparkles", x: 0.37, y: 0.2, groesse: 22, dreh: 10 },
  { name: "warning-outline", sf: "exclamationmark.triangle", x: 0.52, y: 0.27, groesse: 32, dreh: 8 },
  { name: "car-outline", sf: "car", x: 0.36, y: 0.44, groesse: 34, dreh: -8 },
  { name: "bulb-outline", sf: "lightbulb", x: 0.67, y: 0.42, groesse: 30, dreh: 10 },
  { name: "flag-outline", sf: "flag.checkered", x: 0.82, y: 0.2, groesse: 32, dreh: 14 },
  { name: "hourglass-outline", sf: "hourglass", x: 0.66, y: 0.11, groesse: 26, dreh: -16 },
];

/**
 * Bild der ersten Seite: Aus dem Handy mit dem App-Zeichen führt eine lila
 * Straße nach oben, darauf schweben Symbole fürs Lernen und Fahren.
 */
export function StartBild({ breite, hoehe, oben }: { breite: number; hoehe: number; oben: number }) {
  const W = breite;
  const H = hoehe;
  const kreisR = Math.min(W * 0.29, H * 0.28);
  const kreisY = H - kreisR - 4;
  const gH = kreisR * 1.22; // Gerät
  const gB = gH * 0.75;
  const gX = (W - gB) / 2;
  const gY = kreisY - kreisR * 0.5;
  const rand = 9;
  // Straße: unten so breit wie das Gerät, nach oben weit und geschwungen
  const l0 = gX + rand;
  const r0 = gX + gB - rand;
  const strasse = `M ${l0} ${gY + 4} C ${l0 - W * 0.02} ${gY - H * 0.16}, ${W * 0.02} ${H * 0.3}, ${-W * 0.2} ${-2} L ${W * 1.2} ${-2} C ${W * 0.98} ${H * 0.26}, ${r0 + W * 0.04} ${gY - H * 0.2}, ${r0} ${gY + 4} Z`;
  const mitte = `M ${W / 2} ${gY - 6} C ${W * 0.5} ${gY - H * 0.18}, ${W * 0.47} ${H * 0.28}, ${W * 0.5} ${-2}`;

  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H}>
        <Circle cx={W / 2} cy={kreisY} r={kreisR} fill={START.lilaTief} />
        <Path d={strasse} fill={START.lila} />
        <Path d={mitte} stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeDasharray="16 14" strokeLinecap="round" fill="none" />
        {/* Gerät, unten vom Kreis abgeschnitten */}
        <Rect x={gX} y={gY} width={gB} height={gH} rx={gB * 0.2} fill={START.lilaGeraet} stroke={START.lila} strokeWidth={rand} />
        {/* App-Zeichen */}
        <G transform={`translate(${W / 2 - gB * 0.22} ${gY + gH * 0.2}) scale(${(gB * 0.44) / 100})`}>
          <Polygon points="20,92 33,92 50,10 44,10" fill="#FFFFFF" />
          <Polygon points="80,92 67,92 50,10 56,10" fill="#FFFFFF" />
          <Polygon points="46,92 54,92 53.4,72 46.6,72" fill={START.lilaHell} />
          <Polygon points="47,60 53,60 52.6,47 47.4,47" fill={START.lilaHell} />
        </G>
        {/* Gerät verschwindet nach unten in den Grund */}
        <Rect x={0} y={kreisY + kreisR} width={W} height={H} fill={START.grund} />
      </Svg>
      {SCHWEBEN.map((s, i) => (
        <View key={i} pointerEvents="none" style={{ position: "absolute", left: W * s.x - s.groesse / 2, top: oben + (gY - oben) * (s.y / 0.46) * 0.92 - s.groesse / 2, transform: [{ rotate: `${s.dreh}deg` }] }}>
          <Icon name={s.name} sf={s.sf} size={s.groesse} color="#FFFFFF" weight="regular" />
        </View>
      ))}
    </View>
  );
}

/** Überschrift mit hervorgehobenen Teilen: ["Mach deinen ", ["Führerschein."]]. */
export function StartTitel({ teile, groesse = 40, farbe = START.text, style }: { teile: (string | [string])[]; groesse?: number; farbe?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <Text style={{ ...startSchrift.titel, fontSize: groesse, lineHeight: groesse * 1.04, letterSpacing: -0.6, color: farbe, textAlign: "center" }}>
        {teile.map((t, i) =>
          typeof t === "string" ? (
            t
          ) : (
            <Text key={i} style={{ color: START.lila }}>
              {t[0]}
            </Text>
          ),
        )}
      </Text>
    </View>
  );
}

export function StartRechtsHinweis({ onNutzung, onDatenschutz }: { onNutzung: () => void; onDatenschutz: () => void }): ReactNode {
  return (
    <Text style={{ ...startSchrift.text, fontSize: 13.5, lineHeight: 19, color: START.text3, textAlign: "center" }}>
      Mit der Nutzung der App bestätigst du, dass du unsere{" "}
      <Text onPress={onNutzung} accessibilityRole="link" style={{ color: START.lila }}>
        Nutzungsbedingungen
      </Text>{" "}
      und{" "}
      <Text onPress={onDatenschutz} accessibilityRole="link" style={{ color: START.lila }}>
        Datenschutzerklärung
      </Text>{" "}
      gelesen hast.
    </Text>
  );
}
