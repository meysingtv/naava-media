import { useMemo, type ReactNode } from "react";
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { SFSymbol } from "expo-symbols";
import Svg, { Circle, Path, Polyline } from "react-native-svg";

import { Glas } from "@/components/glas";
import { Icon, type IconName } from "@/components/icon";
import { useFarbwelt } from "@/lib/darstellung";
import { FOTOS } from "@/lib/fotos";
import { tippen } from "@/lib/haptik";
import { leuchten, RAND, schrift } from "@/lib/theme";

// Bausteine des Profils im Kino-Look der Startseite.

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

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
  const { width } = useWindowDimensions();
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
      <Image source={FOTOS.autobahn} style={FUELLEN} resizeMode="cover" fadeDuration={0} />
      <LinearGradient colors={["rgba(3,5,7,0.94)", "rgba(3,5,7,0.7)", "rgba(3,5,7,0.2)"]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={FUELLEN} />
      <View style={{ flex: 1, padding: 18, justifyContent: "space-between" }}>
        <View style={{ gap: 4, maxWidth: "78%" }}>
          <Text style={{ ...schrift.textHalb, fontSize: 12, letterSpacing: 1, color: farbe }}>DEINE LIGA</Text>
          <Text style={{ ...schrift.titel, fontSize: 23, lineHeight: 28, color: "#FFFFFF" }} numberOfLines={1}>
            {name}
          </Text>
          <Text style={{ ...schrift.text, fontSize: 13, color: "rgba(255,255,255,0.78)" }} numberOfLines={1}>
            {naechste ? `Noch ${fehlt.toLocaleString("de-DE")} XP bis zur ${naechste}` : "Höchste Liga erreicht"}
          </Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", marginTop: 6 }}>
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

export type Zahl = { icon: IconName; sf?: SFSymbol; farbe: string; wert: string; label: string };

/** Vier Kennzahlen im Raster. */
export function ZahlenRaster({ zahlen, onPress }: { zahlen: Zahl[]; onPress: () => void }) {
  const f = useFarbwelt();
  const { width } = useWindowDimensions();
  const breite = (width - 2 * RAND - 12) / 2;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: RAND }}>
      {zahlen.map((z) => (
        <Pressable
          key={z.label}
          onPress={() => {
            tippen();
            onPress();
          }}
          style={({ pressed }) => [
            { width: breite, padding: 16, gap: 12, borderRadius: 24, backgroundColor: f.flaeche, borderWidth: 1, borderColor: f.linie, transform: [{ scale: pressed ? 0.97 : 1 }] },
            f.hell ? leuchten("#3C2C18", 0.06, 10, 3) : null,
          ]}
        >
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: mitDeckkraft(z.farbe, 0.16), alignItems: "center", justifyContent: "center" }}>
            <Icon name={z.icon} sf={z.sf} size={19} color={z.farbe} />
          </View>
          <View>
            <Text style={{ ...schrift.titel, fontSize: 24, lineHeight: 28, color: f.text, fontVariant: ["tabular-nums"] }} numberOfLines={1}>
              {z.wert}
            </Text>
            <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text2 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {z.label}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function mitDeckkraft(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function MenueZeile({ icon, farbe, titel, unter, onPress, gefahr }: { icon: IconName; farbe: string; titel: string; unter?: string; onPress: () => void; gefahr?: boolean }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: pressed ? f.flaeche2 : "transparent" })}
    >
      <LinearGradient colors={[mitDeckkraft(farbe, 0.95), mitDeckkraft(farbe, 0.72)]} style={{ width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={18} color="#FFFFFF" />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={{ ...schrift.textHalb, fontSize: 16, color: gefahr ? "#FF4A3D" : f.text }}>{titel}</Text>
        {unter ? (
          <Text style={{ ...schrift.text, fontSize: 13, color: f.text3, marginTop: 1 }} numberOfLines={1}>
            {unter}
          </Text>
        ) : null}
      </View>
      {gefahr ? null : <Icon name="chevron-forward" size={16} color={f.text3} />}
    </Pressable>
  );
}

export function MenueGruppe({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  const kinder = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={[{ marginHorizontal: RAND, borderRadius: 22, overflow: "hidden", backgroundColor: f.flaeche, borderWidth: 1, borderColor: f.linie }, f.hell ? leuchten("#3C2C18", 0.06, 10, 3) : null, style]}>
      {kinder.map((k, i) => (
        <View key={i}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: f.linie, marginLeft: 64 }} /> : null}
          {k}
        </View>
      ))}
    </View>
  );
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
