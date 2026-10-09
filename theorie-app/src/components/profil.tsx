import { useMemo, type ReactNode } from "react";
import { Image, Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { SFSymbol } from "expo-symbols";
import Svg, { Circle, Path, Polyline } from "react-native-svg";
import { CalculatorIcon } from "phosphor-react-native/src/icons/Calculator";
import { CameraIcon } from "phosphor-react-native/src/icons/Camera";
import { CardsIcon } from "phosphor-react-native/src/icons/Cards";
import { CaretRightIcon } from "phosphor-react-native/src/icons/CaretRight";
import { ChartLineUpIcon } from "phosphor-react-native/src/icons/ChartLineUp";
import { CheckCircleIcon } from "phosphor-react-native/src/icons/CheckCircle";
import { ClockIcon } from "phosphor-react-native/src/icons/Clock";
import { CrownIcon } from "phosphor-react-native/src/icons/Crown";
import { FlameIcon } from "phosphor-react-native/src/icons/Flame";
import { GearSixIcon } from "phosphor-react-native/src/icons/GearSix";
import { GraduationCapIcon } from "phosphor-react-native/src/icons/GraduationCap";
import { HeartIcon } from "phosphor-react-native/src/icons/Heart";
import { ImagesIcon } from "phosphor-react-native/src/icons/Images";
import { LightbulbIcon } from "phosphor-react-native/src/icons/Lightbulb";
import { SignOutIcon } from "phosphor-react-native/src/icons/SignOut";
import { UsersThreeIcon } from "phosphor-react-native/src/icons/UsersThree";
import type { Icon as PhosphorIcon } from "phosphor-react-native";

import { Glas } from "@/components/glas";
import { GlasKarte } from "@/components/glas-flaeche";
import { Icon, type IconName } from "@/components/icon";
import { useFarbwelt } from "@/lib/darstellung";
import { useFenster } from "@/lib/fenster";
import { FOTOS } from "@/lib/fotos";
import { tippen } from "@/lib/haptik";
import { leuchten, RAND, schrift } from "@/lib/theme";

// Bausteine des Profils im Kino-Look der Startseite.

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;
/** Fotos füllen die Karte: ohne width/height brächten lokale Bilder ihre eigene Pixelbreite mit und endeten auf breiten Karten (iPad quer) zu früh. */
const FOTO = { ...FUELLEN, width: "100%", height: "100%" } as const;

// ---------------------------------------------------------------------------
// Dein Weg zum Führerschein
// ---------------------------------------------------------------------------

export type Meilenstein = { titel: string; unter?: string; erreicht: boolean };

const WEG_HOEHE = 206;
const WEG_RAND = 42;

/**
 * Serpentine mit Meilensteinen – jeder sitzt in einer Kehre, die Beschriftung
 * außen daneben. Das Auto steht zwischen dem letzten erreichten und dem
 * nächsten Meilenstein (`zwischen` = Anteil der Strecke dazwischen).
 */
export function Fuehrerscheinweg({ meilensteine, anteil, zeile, zwischen = 0.5, onPress, style }: { meilensteine: Meilenstein[]; anteil: number; zeile: string; zwischen?: number; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  const { width } = useFenster();
  const breite = width - 2 * RAND;
  const n = 160;

  const m = meilensteine.length;
  const kehren = Math.max(1, m - 1);
  // Straße als Linienzug, damit Meilensteine und Auto genau darauf sitzen:
  // oben und unten abwechselnd eine Kehre, in jeder Kehre ein Meilenstein.
  const punkte = useMemo(
    () =>
      Array.from({ length: n + 1 }, (_, i) => {
        const t = i / n;
        return { x: WEG_RAND + t * (breite - 2 * WEG_RAND), y: WEG_HOEHE * 0.5 - Math.cos(Math.PI * kehren * t) * WEG_HOEHE * 0.25 };
      }),
    [breite, kehren],
  );
  const lage = meilensteine.map((_, k) => k / kehren);
  const punktBei = (t: number) => punkte[Math.round(Math.max(0, Math.min(1, t)) * n)];

  const naechster = meilensteine.findIndex((s) => !s.erreicht);
  const autoT = naechster === -1 ? lage[m - 1] : naechster === 0 ? lage[0] : lage[naechster - 1] + (lage[naechster] - lage[naechster - 1]) * Math.max(0.22, Math.min(0.78, zwischen));
  const auto = punktBei(autoT);
  const bisAuto = punkte.slice(0, Math.round(autoT * n) + 1);
  const alle = punkte.map((p) => `${p.x},${p.y}`).join(" ");
  const gefahren = bisAuto.map((p) => `${p.x},${p.y}`).join(" ");

  // Heller Asphalt, damit die Straße nicht wie ein schwerer Balken wirkt.
  const asphalt = f.hell ? "#80868F" : "#353B44";
  const bankett = f.hell ? "#E9E4DC" : "#1B2128";
  const mittellinie = f.hell ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)";

  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Dein Weg zum Führerschein: ${Math.round(anteil * 100)} Prozent`}
      style={({ pressed }) => [
        { borderRadius: 28, overflow: "hidden", backgroundColor: f.flaeche, borderWidth: 1, borderColor: f.linie, transform: [{ scale: pressed ? 0.99 : 1 }] },
        f.hell ? leuchten("#3C2C18", 0.07, 12, 4) : null,
        style,
      ]}
    >
      {f.hell ? null : <LinearGradient colors={["rgba(252,91,14,0.10)", "rgba(252,91,14,0)"]} locations={[0, 0.6]} style={FUELLEN} />}
      <View style={{ flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 18, paddingTop: 16 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ ...schrift.titelFett, fontSize: 17, color: f.text }}>Dein Weg zum Führerschein</Text>
          <Text style={{ ...schrift.text, fontSize: 13, color: f.text2 }} numberOfLines={1}>
            {zeile}
          </Text>
        </View>
        <Text style={{ ...schrift.titel, fontSize: 26, lineHeight: 30, color: f.orange, fontVariant: ["tabular-nums"] }}>{Math.round(anteil * 100)} %</Text>
      </View>

      <View style={{ height: WEG_HOEHE }}>
        <Svg width={breite} height={WEG_HOEHE} style={{ position: "absolute" }}>
          {/* Bankett, Asphalt, Mittellinie – gefahrene Strecke orange */}
          <Polyline points={alle} fill="none" stroke={bankett} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" />
          <Polyline points={alle} fill="none" stroke={asphalt} strokeWidth={19} strokeLinecap="round" strokeLinejoin="round" />
          <Polyline points={alle} fill="none" stroke={mittellinie} strokeWidth={1.6} strokeDasharray="7 7" strokeLinecap="butt" />
          {bisAuto.length > 1 ? <Polyline points={gefahren} fill="none" stroke="#FF8A2A" strokeWidth={3} strokeDasharray="9 5" strokeLinecap="round" /> : null}
          {meilensteine.map((s, k) => {
            const p = punktBei(lage[k]);
            return s.erreicht ? (
              <Circle key={k} cx={p.x} cy={p.y} r={10} fill="#FC5B0E" stroke="#FFFFFF" strokeWidth={2} />
            ) : (
              <Circle key={k} cx={p.x} cy={p.y} r={9} fill={f.flaeche} stroke={f.hell ? "#B9BEC5" : "#5C636C"} strokeWidth={2} />
            );
          })}
          {meilensteine.map((s, k) => {
            if (!s.erreicht) return null;
            const p = punktBei(lage[k]);
            return <Path key={`h${k}`} d={`M ${p.x - 4} ${p.y + 0.2} L ${p.x - 1.2} ${p.y + 3} L ${p.x + 4.4} ${p.y - 3}`} stroke="#FFFFFF" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
          })}
        </Svg>

        {/* Beschriftung außen an der Kehre: über den oberen, unter den unteren */}
        {meilensteine.map((s, k) => {
          const p = punktBei(lage[k]);
          const oben = k % 2 === 0;
          return (
            <View
              key={k}
              pointerEvents="none"
              style={{ position: "absolute", left: Math.max(2, Math.min(breite - 90, p.x - 44)), width: 88, top: oben ? p.y - 48 : p.y + 17, alignItems: "center" }}
            >
              <Text style={{ ...schrift.textHalb, fontSize: 12, color: s.erreicht ? f.text : f.text3, textAlign: "center" }} numberOfLines={1}>
                {s.titel}
              </Text>
              {s.unter ? (
                <Text style={{ ...schrift.text, fontSize: 11, color: f.text3, textAlign: "center" }} numberOfLines={1}>
                  {s.unter}
                </Text>
              ) : null}
            </View>
          );
        })}

        {/* Das eigene Auto */}
        <View pointerEvents="none" style={[{ position: "absolute", left: auto.x - 18, top: auto.y - 18, width: 36, height: 36, borderRadius: 18 }, leuchten("#FC5B0E", 0.6, 12, 0)]}>
          <LinearGradient colors={["#FF9A3C", "#FC5B0E", "#E4470A"]} style={{ flex: 1, borderRadius: 18, borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
            <Icon name="car" sf="car.fill" size={17} color="#FFFFFF" />
          </LinearGradient>
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Abzeichen als Medaillen
// ---------------------------------------------------------------------------

export type Medaille = { id: string; titel: string; icon: IconName; erreicht: boolean };

export function Medaillen({ medaillen, onPress }: { medaillen: Medaille[]; onPress: (id: string) => void }) {
  const f = useFarbwelt();
  // Erreichte zuerst – so beginnt die Reihe mit dem, was man schon hat.
  const sortiert = [...medaillen].sort((a, b) => Number(b.erreicht) - Number(a.erreicht));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: RAND - 6, gap: 0 }}>
      {sortiert.map((m) => (
        <Pressable
          key={m.id}
          onPress={() => {
            tippen();
            onPress(m.id);
          }}
          accessibilityLabel={`${m.titel}${m.erreicht ? "" : ", noch gesperrt"}`}
          style={({ pressed }) => ({ width: 96, alignItems: "center", gap: 8, paddingTop: 6, transform: [{ scale: pressed ? 0.95 : 1 }] })}
        >
          {m.erreicht ? (
            <View style={[{ width: 70, height: 70, borderRadius: 35 }, leuchten("#FC5B0E", f.hell ? 0.3 : 0.5, 12, 3)]}>
              <LinearGradient colors={["#FFC065", "#FC6A14", "#D8430A"]} locations={[0, 0.55, 1]} style={{ flex: 1, borderRadius: 35, alignItems: "center", justifyContent: "center" }}>
                <View style={{ position: "absolute", top: 4, left: 4, right: 4, bottom: 4, borderRadius: 31, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.45)" }} />
                <Icon name={m.icon} size={29} color="#FFFFFF" />
              </LinearGradient>
            </View>
          ) : (
            <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: f.flaeche2, borderWidth: 1.5, borderColor: f.linieStark, alignItems: "center", justifyContent: "center" }}>
              <Icon name="lock-closed" size={20} color={f.text3} />
            </View>
          )}
          <Text style={{ ...schrift.textHalb, fontSize: 11.5, lineHeight: 15, color: m.erreicht ? f.text : f.text3, textAlign: "center" }} numberOfLines={2}>
            {m.titel}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Liga-Karte
// ---------------------------------------------------------------------------

export function LigaKarte({
  name,
  farbe,
  naechste,
  fehlt,
  anteil,
  elo,
  siege,
  onPress,
  style,
}: {
  name: string;
  farbe: string;
  naechste: string | null;
  fehlt: number;
  anteil: number;
  elo: number;
  siege: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${name}, Rangliste und Duelle`}
      style={({ pressed }) => [{ height: 178, borderRadius: 28, overflow: "hidden", transform: [{ scale: pressed ? 0.985 : 1 }] }, style]}
    >
      <Image source={FOTOS.autobahn} style={FOTO} resizeMode="cover" fadeDuration={0} />
      <LinearGradient colors={["rgba(3,5,7,0.94)", "rgba(3,5,7,0.7)", "rgba(3,5,7,0.2)"]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={FUELLEN} />
      <View style={{ flex: 1, padding: 18, justifyContent: "space-between" }}>
        <View>
          <View style={{ gap: 4, maxWidth: "78%" }}>
            <Text style={{ ...schrift.textHalb, fontSize: 12, letterSpacing: 1, color: farbe }}>DEINE LIGA</Text>
          <Text style={{ ...schrift.titel, fontSize: 23, lineHeight: 28, color: "#FFFFFF" }} numberOfLines={1}>
            {name}
          </Text>
          <Text style={{ ...schrift.text, fontSize: 13, color: "rgba(255,255,255,0.78)" }} numberOfLines={1}>
            {naechste ? `Noch ${fehlt.toLocaleString("de-DE")} XP bis zur ${naechste}` : "Höchste Liga erreicht"}
          </Text>
          </View>
          {/* Balken über die ganze Kartenbreite – der Pfeil sitzt oben rechts */}
          <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", marginTop: 10 }}>
            <View style={{ width: `${Math.max(3, anteil * 100)}%`, height: "100%", borderRadius: 3, backgroundColor: farbe }} />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Glas klar style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16 }}>
            <Icon name="flash" size={14} color="#FFB45C" />
            <Text style={{ ...schrift.textHalb, fontSize: 13, color: "#FFFFFF" }}>Elo {elo}</Text>
          </Glas>
          <Glas klar style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16 }}>
            <Icon name="trophy" size={14} color="#FFC857" />
            <Text style={{ ...schrift.textHalb, fontSize: 13, color: "#FFFFFF" }}>
              {siege} {siege === 1 ? "Sieg" : "Siege"}
            </Text>
          </Glas>
        </View>
      </View>
      <View style={{ position: "absolute", right: 16, top: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
        <Icon name="arrow-forward" size={20} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Zahlen und Menü
// ---------------------------------------------------------------------------

export type Zahl = { icon: IconName; sf?: SFSymbol; farbe: string; wert: string; label: string; einheit?: string; mini?: Mini; unter?: string };

/**
 * Phosphor-Icons (Duotone) für Profil-Zahlen und Menü – die Namen bleiben
 * Ionicons-Namen, damit die Seite nichts davon wissen muss.
 */
const PHOSPHOR: Partial<Record<IconName, PhosphorIcon>> = {
  time: ClockIcon,
  "checkmark-circle": CheckCircleIcon,
  flame: FlameIcon,
  school: GraduationCapIcon,
  "stats-chart": ChartLineUpIcon,
  camera: CameraIcon,
  albums: CardsIcon,
  people: UsersThreeIcon,
  bulb: LightbulbIcon,
  heart: HeartIcon,
  calculator: CalculatorIcon,
  "settings-outline": GearSixIcon,
  "diamond-outline": CrownIcon,
  "images-outline": ImagesIcon,
  "log-out-outline": SignOutIcon,
};

function ProIcon({ name, groesse, farbe, sf }: { name: IconName; groesse: number; farbe: string; sf?: SFSymbol }) {
  const P = PHOSPHOR[name];
  return P ? <P size={groesse} color={farbe} weight="fill" /> : <Icon name={name} sf={sf} size={groesse} color={farbe} />;
}

/** Mini-Diagramm einer Kennzahl: Balken der letzten Tage oder Punkte (geschafft, verpasst, leer). */
export type Mini = { art: "balken"; werte: number[] } | { art: "punkte"; werte: (boolean | null)[] };

function MiniDiagramm({ mini, farbe }: { mini: Mini; farbe: string }) {
  const f = useFarbwelt();
  const leer = f.hell ? "rgba(20,23,27,0.08)" : "rgba(255,255,255,0.1)";
  if (mini.art === "balken") {
    const max = Math.max(...mini.werte, 1);
    return (
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 30 }}>
        {mini.werte.map((w, i) => {
          const letzter = i === mini.werte.length - 1;
          return <View key={i} style={{ flex: 1, height: w > 0 ? Math.max(4, Math.round((w / max) * 30)) : 4, borderRadius: 3, backgroundColor: w > 0 ? mitDeckkraft(farbe, letzter ? 1 : 0.45) : leer }} />;
        })}
      </View>
    );
  }
  const rot = f.hell ? "#E5392C" : "#FF4A3D";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 30 }}>
      {mini.werte.map((w, i) => (
        <View key={i} style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: w === null ? leer : w ? farbe : mitDeckkraft(rot, 0.75) }} />
      ))}
    </View>
  );
}

/** Vier Kennzahlen wie in Apple Fitness: Titel in Farbe, große Zahl, Mini-Diagramm. Auf dem iPad alle vier nebeneinander. */
export function ZahlenRaster({ zahlen, onPress }: { zahlen: Zahl[]; onPress: () => void }) {
  const f = useFarbwelt();
  const { width } = useFenster();
  const spalten = width >= 700 ? 4 : 2;
  const reihen: Zahl[][] = [];
  for (let i = 0; i < zahlen.length; i += spalten) reihen.push(zahlen.slice(i, i + spalten));
  return (
    <View style={{ paddingHorizontal: RAND, gap: 10 }}>
      {reihen.map((reihe, r) => (
        <View key={r} style={{ flexDirection: "row", gap: 10 }}>
          {reihe.map((z) => (
            <Pressable
              key={z.label}
              onPress={() => {
                tippen();
                onPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={`${z.label}: ${z.wert}${z.einheit ? ` ${z.einheit}` : ""}`}
              style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <GlasKarte style={{ flex: 1, padding: 14, gap: 10, borderRadius: 22 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <ProIcon name={z.icon} sf={z.sf} groesse={18} farbe={z.farbe} />
                <Text style={{ ...schrift.textHalb, fontSize: 13, color: z.farbe }} numberOfLines={1}>
                  {z.label}
                </Text>
              </View>
              <Text style={{ ...schrift.titel, fontSize: 28, lineHeight: 32, color: f.text, fontVariant: ["tabular-nums"] }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {z.wert}
                {z.einheit ? <Text style={{ ...schrift.textHalb, fontSize: 14, color: f.text2 }}> {z.einheit}</Text> : null}
              </Text>
              {z.mini ? <MiniDiagramm mini={z.mini} farbe={z.farbe} /> : null}
              {z.unter ? (
                <Text style={{ ...schrift.textMittel, fontSize: 11.5, color: f.text3, marginTop: -4 }} numberOfLines={1}>
                  {z.unter}
                </Text>
              ) : null}
              </GlasKarte>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

function mitDeckkraft(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Eine Zeile im Profil-Menü: runder, zart eingefärbter Icon-Kreis, Titel, Unterzeile, Pfeil. */
export function MenueZeile({ icon, farbe, titel, unter, onPress, gefahr }: { icon: IconName; farbe: string; titel: string; unter?: string; onPress: () => void; gefahr?: boolean }) {
  const f = useFarbwelt();
  const rot = f.hell ? "#E5392C" : "#FF4A3D";
  const akzent = gefahr ? rot : farbe;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={unter ? `${titel}, ${unter}` : titel}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      <GlasKarte style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 68, paddingVertical: 12, paddingLeft: 12, paddingRight: 16, borderRadius: 20 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: mitDeckkraft(akzent, f.hell ? 0.1 : 0.14) }}>
        <ProIcon name={icon} groesse={23} farbe={akzent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...schrift.textHalb, fontSize: 16, color: gefahr ? rot : f.text }} numberOfLines={1}>
          {titel}
        </Text>
        {unter ? (
          <Text style={{ ...schrift.text, fontSize: 13, color: f.text3 }} numberOfLines={1}>
            {unter}
          </Text>
        ) : null}
      </View>
      {gefahr ? null : <CaretRightIcon size={16} color={f.text3} weight="bold" />}
      </GlasKarte>
    </Pressable>
  );
}

/** Menüzeilen untereinander – jede für sich, mit etwas Luft dazwischen. */
export function MenueGruppe({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ marginHorizontal: RAND, gap: 8 }, style]}>{children}</View>;
}

/** Profilbild mit weißem Rand, leichtem Schatten und Kamera-Knopf. */
export function ProfilRing({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityLabel="Profilbild ändern"
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <View style={[{ borderRadius: 70, borderWidth: 4, borderColor: "#FFFFFF", backgroundColor: "#FFFFFF" }, leuchten("#000000", f.hell ? 0.16 : 0.5, 16, 8)]}>{children}</View>
      <View
        style={[
          { position: "absolute", right: 2, bottom: 4, width: 32, height: 32, borderRadius: 16, backgroundColor: f.hell ? "#14171B" : "#FFFFFF", alignItems: "center", justifyContent: "center" },
          leuchten("#000000", 0.25, 6, 2),
        ]}
      >
        <Icon name="camera" sf="camera.fill" size={15} color={f.hell ? "#FFFFFF" : "#14171B"} />
      </View>
    </Pressable>
  );
}
