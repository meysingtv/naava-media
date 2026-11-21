import type { ReactNode } from "react";
import { ActivityIndicator, Image, Pressable, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient as ExpoVerlauf } from "expo-linear-gradient";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { Verkehrszeichen } from "@/components/zeichen";
import type { ZeichenKey } from "@/lib/fragen";
import { Icon } from "@/components/icon";
import { tippen } from "@/lib/haptik";

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

/** Helle Seiten mit der Figur (Fragen vor dem Konto). */
export const HELL = {
  grund: "#F4F2FC",
  tinte: "#2E2650",
  tinte2: "#6E6888",
  tinte3: "#A19CB6",
  blase: "#E8E5F4",
  karte: "#FFFFFF",
  linie: "#E1DDF0",
  spur: "#E3E0EF",
  rot: "#E5484D",
} as const;

type KnopfArt = "hell" | "dunkel" | "lila" | "zart";

const KNOPF: Record<KnopfArt | "aus", { flaeche: string; kante: string; text: string }> = {
  hell: { flaeche: START.knopfHell, kante: START.knopfHellKante, text: START.knopfHellText },
  dunkel: { flaeche: START.knopfDunkel, kante: START.knopfDunkelKante, text: START.text },
  lila: { flaeche: START.lila, kante: START.lilaKante, text: "#FFFFFF" },
  zart: { flaeche: "#E9E6F5", kante: "#CCC6E0", text: HELL.tinte },
  aus: { flaeche: "#E7E4F0", kante: "#D2CEE0", text: "#A9A4BE" },
};

const KANTE = 5;

/** Großer, runder Knopf mit fester Kante unten – gedrückt sinkt er ein. */
export function StartKnopf({ titel, art = "hell", onPress, deaktiviert, laedt, style }: { titel: string; art?: KnopfArt; onPress: () => void; deaktiviert?: boolean; laedt?: boolean; style?: StyleProp<ViewStyle> }) {
  // Auf hellen Seiten sind gesperrte Knöpfe grau statt durchsichtig.
  const grau = deaktiviert && (art === "lila" || art === "zart");
  const k = KNOPF[grau ? "aus" : art];
  return (
    <Pressable
      onPress={() => {
        if (deaktiviert || laedt) return;
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
          <View style={{ flex: 1, justifyContent: "flex-end", opacity: deaktiviert && !grau ? 0.45 : 1 }}>
            <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 58, borderRadius: 29, backgroundColor: k.kante }} />
            <View style={{ height: 58, borderRadius: 29, backgroundColor: k.flaeche, alignItems: "center", justifyContent: "center", transform: [{ translateY: tief - KANTE }] }}>
              {laedt ? <ActivityIndicator color={k.text} /> : <Text style={{ ...startSchrift.titel, fontSize: 23, letterSpacing: -0.2, color: k.text }}>{titel}</Text>}
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

/** Ein Schild auf einem Pfahl, unten auf dem Boden der Szene. */
type Schild = { zeichen: ZeichenKey; x: number; fuss: number; groesse: number; pfahl: number };

/**
 * Bild der ersten Seite: abends auf dem Land. Eine Straße läuft durch lila
 * Hügel zum Horizont, am Rand stehen Verkehrszeichen, vorne fährt ein Auto.
 */
export function StartBild({ breite, hoehe, oben }: { breite: number; hoehe: number; oben: number }) {
  const W = breite;
  const H = hoehe;
  const hor = oben + (H - oben) * 0.46; // Horizont
  const fern = { x: W * 0.56, y: hor + 2 }; // Fluchtpunkt der Straße
  // Straße: unten breit, geschwungen zum Horizont
  const d = H - hor;
  const strasse = `M ${W * 0.18} ${H} C ${W * 0.36} ${H - d * 0.5}, ${W * 0.54} ${hor + d * 0.3}, ${fern.x - 4} ${fern.y} L ${fern.x + 4} ${fern.y} C ${W * 0.62} ${hor + d * 0.3}, ${W * 0.66} ${H - d * 0.5}, ${W * 0.84} ${H} Z`;
  const mitte = `M ${W * 0.51} ${H} C ${W * 0.51} ${H - d * 0.5}, ${W * 0.58} ${hor + d * 0.3}, ${fern.x} ${fern.y}`;
  const sterne = [
    [0.08, 0.3], [0.2, 0.18], [0.34, 0.36], [0.46, 0.14], [0.64, 0.28], [0.78, 0.12], [0.9, 0.34], [0.72, 0.42],
  ];
  const schilder: Schild[] = [
    { zeichen: "z306", x: W * 0.1, fuss: H - (H - hor) * 0.28, groesse: Math.min(54, W * 0.13), pfahl: (H - hor) * 0.32 },
    { zeichen: "z274_50", x: W * 0.84, fuss: hor + (H - hor) * 0.5, groesse: Math.min(42, W * 0.1), pfahl: (H - hor) * 0.24 },
    { zeichen: "z103_20", x: W * 0.34, fuss: hor + (H - hor) * 0.2, groesse: Math.min(24, W * 0.06), pfahl: (H - hor) * 0.12 },
  ];
  const auto = { b: Math.min(W * 0.2, 96), x: W * 0.515, y: H - (H - hor) * 0.26 };

  return (
    <View style={{ width: W, height: H, overflow: "hidden" }}>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="himmel" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={START.grund} />
            <Stop offset="1" stopColor="#2A2361" />
          </LinearGradient>
          <LinearGradient id="boden" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#7A68DA" />
            <Stop offset="1" stopColor={START.lila} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={hor + 4} fill="url(#himmel)" />
        {sterne.map(([x, y], i) => (
          <Circle key={i} cx={W * x} cy={oben + (hor - oben) * y} r={i % 3 ? 1.4 : 2} fill="#FFFFFF" opacity={i % 2 ? 0.5 : 0.85} />
        ))}
        {/* Mond */}
        <Circle cx={W * 0.8} cy={oben + (hor - oben) * 0.32} r={W * 0.07} fill={START.lilaHell} opacity={0.9} />
        <Circle cx={W * 0.8 - W * 0.028} cy={oben + (hor - oben) * 0.32 - W * 0.012} r={W * 0.066} fill="#1A1640" />
        {/* Hügel hinten und vorne */}
        <Path d={`M 0 ${hor - H * 0.05} C ${W * 0.2} ${hor - H * 0.12}, ${W * 0.38} ${hor - H * 0.02}, ${W * 0.55} ${hor - H * 0.04} C ${W * 0.72} ${hor - H * 0.07}, ${W * 0.86} ${hor - H * 0.13}, ${W} ${hor - H * 0.06} L ${W} ${hor + 4} L 0 ${hor + 4} Z`} fill="#3B3184" />
        <Rect x={0} y={hor} width={W} height={H - hor} fill="url(#boden)" />
        <Path d={`M 0 ${hor + (H - hor) * 0.08} C ${W * 0.25} ${hor - 6}, ${W * 0.45} ${hor + 4}, ${W * 0.6} ${hor + 2} C ${W * 0.78} ${hor}, ${W * 0.9} ${hor + (H - hor) * 0.1}, ${W} ${hor + (H - hor) * 0.06} L ${W} ${hor + (H - hor) * 0.2} L 0 ${hor + (H - hor) * 0.22} Z`} fill="#6B59CC" opacity={0.6} />
        {/* Straße */}
        <Path d={strasse} fill="#241F4A" />
        <Path d={mitte} stroke="#FFFFFF" strokeWidth={3} strokeDasharray="14 12" fill="none" opacity={0.85} />
        {/* Pfähle */}
        {schilder.map((s, i) => (
          <Rect key={i} x={s.x - 1.5} y={s.fuss - s.pfahl} width={3} height={s.pfahl} rx={1.5} fill="#D9D4F5" />
        ))}
        {/* Auto von hinten */}
        <G transform={`translate(${auto.x - auto.b / 2} ${auto.y - auto.b * 0.62})`}>
          <Ellipse cx={auto.b / 2} cy={auto.b * 0.66} rx={auto.b * 0.56} ry={auto.b * 0.07} fill="#000000" opacity={0.28} />
          <Rect x={auto.b * 0.1} y={auto.b * 0.5} width={auto.b * 0.16} height={auto.b * 0.16} rx={auto.b * 0.04} fill="#15122E" />
          <Rect x={auto.b * 0.74} y={auto.b * 0.5} width={auto.b * 0.16} height={auto.b * 0.16} rx={auto.b * 0.04} fill="#15122E" />
          <Path d={`M ${auto.b * 0.2} ${auto.b * 0.22} Q ${auto.b * 0.24} ${auto.b * 0.02} ${auto.b * 0.5} ${auto.b * 0.02} Q ${auto.b * 0.76} ${auto.b * 0.02} ${auto.b * 0.8} ${auto.b * 0.22} Z`} fill="#F3F1FF" />
          <Path d={`M ${auto.b * 0.27} ${auto.b * 0.2} Q ${auto.b * 0.3} ${auto.b * 0.07} ${auto.b * 0.5} ${auto.b * 0.07} Q ${auto.b * 0.7} ${auto.b * 0.07} ${auto.b * 0.73} ${auto.b * 0.2} Z`} fill="#2D2766" />
          <Rect x={0} y={auto.b * 0.2} width={auto.b} height={auto.b * 0.36} rx={auto.b * 0.12} fill="#F3F1FF" />
          <Rect x={auto.b * 0.07} y={auto.b * 0.29} width={auto.b * 0.2} height={auto.b * 0.08} rx={auto.b * 0.04} fill="#FF5A6E" />
          <Rect x={auto.b * 0.73} y={auto.b * 0.29} width={auto.b * 0.2} height={auto.b * 0.08} rx={auto.b * 0.04} fill="#FF5A6E" />
          <Rect x={auto.b * 0.36} y={auto.b * 0.4} width={auto.b * 0.28} height={auto.b * 0.1} rx={auto.b * 0.02} fill="#FFFFFF" stroke="#C7C1E4" strokeWidth={1} />
        </G>
      </Svg>
      {schilder.map((s, i) => (
        <View key={i} pointerEvents="none" style={{ position: "absolute", left: s.x - s.groesse / 2, top: s.fuss - s.pfahl - s.groesse * 0.9 }}>
          <Verkehrszeichen zeichen={s.zeichen} groesse={s.groesse} />
        </View>
      ))}
      {/* Unten weich in den Grund */}
      <ExpoVerlauf colors={["rgba(11,12,22,0)", START.grund]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: H * 0.16 }} pointerEvents="none" />
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

// ---------------------------------------------------------------------------
// Figur und helle Frageseiten
// ---------------------------------------------------------------------------

export const FIGUR = {
  grund: require("../../assets/images/figur/grund.png"),
  neugierig: require("../../assets/images/figur/neugierig.png"),
  winken: require("../../assets/images/figur/winken.png"),
  freude: require("../../assets/images/figur/freude.png"),
  denken: require("../../assets/images/figur/denken.png"),
  kopf: require("../../assets/images/figur/kopf.png"),
  code: require("../../assets/images/figur/code.png"),
  kalender: require("../../assets/images/figur/kalender.png"),
  brief: require("../../assets/images/figur/brief.png"),
  traurig: require("../../assets/images/figur/traurig.png"),
  glocke: require("../../assets/images/figur/glocke.png"),
  feiern: require("../../assets/images/figur/feiern.png"),
} satisfies Record<string, ImageSourcePropType>;

export type FigurName = keyof typeof FIGUR;

/** Oben: Zurück und Fortschritt. */
export function FrageKopf({ anteil, onZurueck }: { anteil: number; onZurueck?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, height: 44 }}>
      {onZurueck ? (
        <Pressable onPress={onZurueck} hitSlop={12} accessibilityRole="button" accessibilityLabel="Zurück" style={{ width: 32 }}>
          <Icon name="arrow-back" size={24} color={HELL.tinte} />
        </Pressable>
      ) : (
        <View style={{ width: 32 }} />
      )}
      <View style={{ flex: 1, height: 14, borderRadius: 7, backgroundColor: HELL.spur, overflow: "hidden" }}>
        <View style={{ width: `${Math.max(8, Math.min(100, anteil * 100))}%`, height: "100%", borderRadius: 7, backgroundColor: START.lila }} />
      </View>
    </View>
  );
}

/** Figur links, daneben eine Sprechblase mit der Frage. */
export function FigurBlase({ figur, teile }: { figur: FigurName; teile: (string | [string])[] }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Image source={FIGUR[figur]} style={{ width: 82, height: 82 }} resizeMode="contain" />
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 14, height: 14, backgroundColor: HELL.blase, transform: [{ rotate: "45deg" }], marginRight: -7, borderRadius: 2 }} />
        <View style={{ flex: 1, backgroundColor: HELL.blase, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16 }}>
          <Text style={{ ...startSchrift.titel, fontSize: 28, lineHeight: 30, letterSpacing: -0.4, color: HELL.tinte }}>
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
      </View>
    </View>
  );
}

/** Große Figur in der Mitte (z. B. zur Begrüßung oder am Ende). */
export function GrosseFigur({ figur, groesse = 220 }: { figur: FigurName; groesse?: number }) {
  return <Image source={FIGUR[figur]} style={{ width: groesse, height: groesse, alignSelf: "center" }} resizeMode="contain" />;
}

/** Wahl-Karte mit Kante; gewählt mit lila Rand. */
export function WahlKarte({ aktiv, onPress, children, style, label }: { aktiv: boolean; onPress: () => void; children: ReactNode; style?: StyleProp<ViewStyle>; label: string }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected: aktiv }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          backgroundColor: aktiv ? "#F1EEFF" : HELL.karte,
          borderRadius: 20,
          borderWidth: 2,
          borderBottomWidth: 5,
          borderColor: aktiv ? START.lila : HELL.linie,
          transform: [{ translateY: pressed ? 2 : 0 }],
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** Rahmen eines Handys für die Vorschau-Bilder der Willkommens-Seiten. */
export function VorschauRahmen({ breite, hoehe, children }: { breite: number; hoehe: number; children: ReactNode }) {
  return (
    <View style={{ width: breite, height: hoehe, alignSelf: "center", overflow: "hidden" }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: hoehe + 60, borderRadius: 46, borderWidth: 7, borderColor: "#2C2C40", backgroundColor: "#1A1A28", overflow: "hidden", padding: 18 }}>
        {children}
      </View>
      <ExpoVerlauf colors={["rgba(11,12,22,0)", START.grund]} locations={[0, 0.9]} style={{ position: "absolute", left: -10, right: -10, bottom: 0, height: hoehe * 0.32 }} pointerEvents="none" />
    </View>
  );
}
