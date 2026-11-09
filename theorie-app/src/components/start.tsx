import { useState, type ReactNode } from "react";
import { Image, Pressable, Text, View, type ImageSourcePropType, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Icon, type IconName } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { useFarbwelt, type Farbwelt } from "@/lib/darstellung";
import { tippen } from "@/lib/haptik";
import { schrift } from "@/lib/theme";

// Bausteine der Startseite am Handy. Die Bildsprache kommt von der Straße:
// ein gelber Pfeilwegweiser zählt bis zur Prüfung, die Regel des Tages steht
// auf einem Zusatzzeichen. Schrift im Stil deutscher Straßenschilder (Barlow
// Semi Condensed) für Name, Überschriften und Schilder, sonst die Systemschrift.

/** Schilder-Schrift (in _layout.tsx geladen). */
const SCHILD = {
  mittel: { fontFamily: "BarlowSemiCondensed_500Medium", includeFontPadding: false },
  halb: { fontFamily: "BarlowSemiCondensed_600SemiBold", includeFontPadding: false },
  fett: { fontFamily: "BarlowSemiCondensed_700Bold", includeFontPadding: false },
} satisfies Record<string, TextStyle>;

/** Gelb der deutschen Wegweiser (nah an RAL 1023 Verkehrsgelb) und Schilder-Schwarz. */
const WEGWEISER_GELB = "#F5C400";
const SCHILD_SCHWARZ = "#16181B";

export const SEITE = 20;

export type StartFarben = {
  hell: boolean;
  /** Betongrau bzw. Asphalt. */
  grund: string;
  flaeche: string;
  linie: string;
  text: string;
  text2: string;
  text3: string;
  orange: string;
};

export function startFarben(f: Farbwelt): StartFarben {
  return f.hell
    ? { hell: true, grund: "#EDEFF2", flaeche: "#FFFFFF", linie: "rgba(20,24,30,0.09)", text: "#15181C", text2: "#5C636D", text3: "#8D939C", orange: "#E8500A" }
    : { hell: false, grund: "#141619", flaeche: "#1E2125", linie: "rgba(255,255,255,0.08)", text: "#ECEDEF", text2: "#A3A8B0", text3: "#727882", orange: "#FF6A1F" };
}

function useStart(): StartFarben {
  return startFarben(useFarbwelt());
}

/** Datum klein, darunter groß der Vorname; rechts Glocke und Profilbild. */
export function StartKopf({ datum, name, anzeigeName, glockePunkt, onGlocke, onProfil }: { datum: string; name: string; anzeigeName: string; glockePunkt: boolean; onGlocke: () => void; onProfil: () => void }) {
  const c = useStart();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: SEITE }}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...schrift.textMittel, fontSize: 15, color: c.text2 }}>{datum}</Text>
        <Text style={{ ...SCHILD.fett, fontSize: 40, lineHeight: 46, color: c.text }} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          tippen();
          onGlocke();
        }}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Erinnerungen"
      >
        <Icon name="notifications-outline" size={25} color={c.text} />
        {glockePunkt ? <View style={{ position: "absolute", top: 0, right: 0, width: 9, height: 9, borderRadius: 5, backgroundColor: c.orange, borderWidth: 2, borderColor: c.grund }} /> : null}
      </Pressable>
      <Pressable
        onPress={() => {
          tippen();
          onProfil();
        }}
        accessibilityRole="button"
        accessibilityLabel="Profil"
      >
        <ProfilBild name={anzeigeName} groesse={44} rand={0} />
      </Pressable>
    </View>
  );
}

/**
 * Gelber Pfeilwegweiser wie an deutschen Straßen: links das Ziel, rechts die
 * Entfernung – hier die Tage bis zur Theorieprüfung. Gezeichnet mit SVG,
 * schwarzer Innenrand wie auf echten Schildern.
 */
export function Wegweiser({ ziel, entfernung, einheit, unter, onPress }: { ziel: string; entfernung: string; einheit?: string; unter: string; onPress: () => void }) {
  const c = useStart();
  const [breite, setBreite] = useState(0);
  const h = 92;
  const spitze = 30;
  const w = breite;
  const aussen = `M6 0 H${w - spitze} L${w} ${h / 2} L${w - spitze} ${h} H6 Q0 ${h} 0 ${h - 6} V6 Q0 0 6 0 Z`;
  const i = 6;
  const innen = `M${i + 4} ${i} H${w - spitze - 2} L${w - i - 3} ${h / 2} L${w - spitze - 2} ${h - i} H${i + 4} Q${i} ${h - i} ${i} ${h - i - 4} V${i + 4} Q${i} ${i} ${i + 4} ${i} Z`;
  return (
    <View style={{ paddingHorizontal: SEITE }}>
      <Pressable
        onPress={() => {
          tippen();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${ziel}: ${entfernung}${einheit ? ` ${einheit}` : ""}. ${unter}`}
        onLayout={(e) => setBreite(e.nativeEvent.layout.width)}
        style={({ pressed }) => ({ height: h, transform: [{ scale: pressed ? 0.985 : 1 }] })}
      >
        {w > 0 ? (
          <Svg width={w} height={h} style={{ position: "absolute" }}>
            <Path d={aussen} fill={WEGWEISER_GELB} />
            <Path d={innen} fill="none" stroke={SCHILD_SCHWARZ} strokeWidth={2.5} strokeLinejoin="round" />
          </Svg>
        ) : null}
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingLeft: 22, paddingRight: spitze + 14, gap: 12 }}>
          <Text style={{ ...SCHILD.halb, fontSize: 25, color: SCHILD_SCHWARZ, flex: 1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {ziel}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
            <Text style={{ ...SCHILD.fett, fontSize: einheit ? 40 : 24, color: SCHILD_SCHWARZ, fontVariant: ["tabular-nums"] }}>{entfernung}</Text>
            {einheit ? <Text style={{ ...SCHILD.halb, fontSize: 20, color: SCHILD_SCHWARZ }}>{einheit}</Text> : null}
          </View>
        </View>
      </Pressable>
      <Text style={{ ...schrift.text, fontSize: 14.5, lineHeight: 20, color: c.text2, marginTop: 10, paddingLeft: 2 }}>{unter}</Text>
    </View>
  );
}

/** Abschnittsüberschrift in Schilder-Schrift, optional ein leiser Link rechts. */
export function Abschnitt({ titel, link, onLink, style }: { titel: string; link?: string; onLink?: () => void; style?: StyleProp<ViewStyle> }) {
  const c = useStart();
  return (
    <View style={[{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingHorizontal: SEITE, marginBottom: 12 }, style]}>
      <Text style={{ ...SCHILD.halb, fontSize: 25, color: c.text }}>{titel}</Text>
      {link && onLink ? (
        <Pressable
          onPress={() => {
            tippen();
            onLink();
          }}
          hitSlop={10}
          accessibilityRole="link"
        >
          <Text style={{ ...schrift.textMittel, fontSize: 15, color: c.text2 }}>{link}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Thema des Tages: großes Foto, darunter Titel, kurze Beschreibung und der Hauptknopf. */
export function TagesThema({ foto, titel, unter, knopf, meta, fortschritt, onFoto, onKnopf }: { foto: ImageSourcePropType; titel: string; unter: string; knopf: string; meta?: string; fortschritt?: number; onFoto: () => void; onKnopf: () => void }) {
  const c = useStart();
  return (
    <View style={{ paddingHorizontal: SEITE }}>
      <Pressable onPress={onFoto} accessibilityRole="button" accessibilityLabel={titel}>
        <Image source={foto} style={{ width: "100%", height: 210, borderRadius: 14, backgroundColor: c.linie }} resizeMode="cover" />
      </Pressable>
      <Text style={{ ...SCHILD.halb, fontSize: 28, lineHeight: 32, color: c.text, marginTop: 16 }}>{titel}</Text>
      <Text style={{ ...schrift.text, fontSize: 16, lineHeight: 23, color: c.text2, marginTop: 4 }}>{unter}</Text>
      {fortschritt !== undefined ? (
        <View style={{ height: 6, borderRadius: 3, marginTop: 14, backgroundColor: c.linie, overflow: "hidden" }}>
          <View style={{ width: `${Math.min(100, Math.max(fortschritt > 0 ? 3 : 0, fortschritt * 100))}%`, height: "100%", borderRadius: 3, backgroundColor: c.orange }} />
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 16 }}>
        <Pressable
          onPress={() => {
            tippen();
            onKnopf();
          }}
          accessibilityRole="button"
          style={({ pressed }) => ({ height: 50, paddingHorizontal: 22, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.orange, opacity: pressed ? 0.88 : 1 })}
        >
          <Icon name="play" size={16} color="#FFFFFF" />
          <Text style={{ ...schrift.textHalb, fontSize: 16.5, color: "#FFFFFF" }}>{knopf}</Text>
        </Pressable>
        {meta ? <Text style={{ ...schrift.text, fontSize: 14.5, color: c.text3, flexShrink: 1 }}>{meta}</Text> : null}
      </View>
    </View>
  );
}

export type Eintrag = { icon: IconName; titel: string; wert?: string; onPress: () => void };

/** Eine ruhige Liste in einer Fläche: Symbol, Titel, Wert rechts, feine Trennlinien. */
export function Liste({ eintraege, style }: { eintraege: Eintrag[]; style?: StyleProp<ViewStyle> }) {
  const c = useStart();
  return (
    <View style={[{ marginHorizontal: SEITE, borderRadius: 14, backgroundColor: c.flaeche, overflow: "hidden" }, style]}>
      {eintraege.map((e, i) => (
        <Pressable
          key={e.titel}
          onPress={() => {
            tippen();
            e.onPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={e.wert ? `${e.titel}, ${e.wert}` : e.titel}
          style={({ pressed }) => ({ backgroundColor: pressed ? c.linie : "transparent" })}
        >
          <View style={{ height: 56, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16 }}>
            <View style={{ width: 24, alignItems: "center" }}>
              <Icon name={e.icon} size={21} color={c.text2} />
            </View>
            <Text style={{ ...schrift.textMittel, fontSize: 16.5, color: c.text, flex: 1 }} numberOfLines={1}>
              {e.titel}
            </Text>
            {e.wert ? <Text style={{ ...schrift.text, fontSize: 15, color: c.text3, fontVariant: ["tabular-nums"] }}>{e.wert}</Text> : null}
            <Icon name="chevron-forward" size={17} color={c.text3} />
          </View>
          {i < eintraege.length - 1 ? <View style={{ height: 1, marginLeft: 54, backgroundColor: c.linie }} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Regel des Tages als Zusatzzeichen: weiße Tafel mit schwarzem Rand, wie das
 * kleine Schild unter einem Verkehrszeichen. Im Dunkeln bleibt sie weiß – wie
 * ein Schild im Scheinwerferlicht.
 */
export function Zusatzzeichen({ titel, text, link, onPress }: { titel: string; text: string; link: string; onPress: () => void }) {
  return (
    <View style={{ paddingHorizontal: SEITE }}>
      <Pressable
        onPress={() => {
          tippen();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${titel}. ${text}`}
        style={({ pressed }) => ({ borderRadius: 10, padding: 5, backgroundColor: "#FFFFFF", transform: [{ scale: pressed ? 0.985 : 1 }] })}
      >
        <View style={{ borderRadius: 6, borderWidth: 2.5, borderColor: SCHILD_SCHWARZ, paddingHorizontal: 16, paddingVertical: 14, gap: 6 }}>
          <Text style={{ ...SCHILD.halb, fontSize: 22, lineHeight: 26, color: SCHILD_SCHWARZ }}>{titel}</Text>
          <Text style={{ ...schrift.text, fontSize: 15.5, lineHeight: 22, color: "#3B4048" }}>{text}</Text>
          <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#B83E06", marginTop: 4 }}>{link}</Text>
        </View>
      </Pressable>
    </View>
  );
}

/** Zwischenraum zwischen Abschnitten. */
export function Abstand({ hoehe = 36 }: { hoehe?: number }): ReactNode {
  return <View style={{ height: hoehe }} />;
}
