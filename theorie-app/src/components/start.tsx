import { type ReactNode } from "react";
import { Image, Pressable, ScrollView, Text, View, type ImageSourcePropType, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { useFarbwelt, type Farbwelt } from "@/lib/darstellung";
import { FOTOS, type FotoKey } from "@/lib/fotos";
import { themaVon, type ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { leuchten, RAND } from "@/lib/theme";

// Bausteine der Startseite am Handy – durchgehend hell: weiße Karten auf
// hellem Grund, helle Fotos ohne Abdunkeln, Text immer auf Weiß. Orange für
// Knöpfe und Akzente, sonst nur kleine farbige Symbole.

/** Akzentfarben für kleine Symbole. */
export const AKZENT = {
  rot: "#EF4444",
  blau: "#3B82F6",
  gruen: "#22A55B",
  gelb: "#F2A900",
  tuerkis: "#14A3A0",
  pink: "#E0457B",
} as const;

/** Runde Schrift der Startseite (wird in _layout.tsx geladen). */
const NU = {
  schwarz: { fontFamily: "Nunito_900Black", includeFontPadding: false },
  extra: { fontFamily: "Nunito_800ExtraBold", includeFontPadding: false },
  fett: { fontFamily: "Nunito_700Bold", includeFontPadding: false },
  halb: { fontFamily: "Nunito_600SemiBold", includeFontPadding: false },
} satisfies Record<string, TextStyle>;

/**
 * Helle Fotos je Thema. Einige Themenfotos sind dunkel (Nacht, Motorraum,
 * Tiefgarage) – auf der hellen Startseite stattdessen ein helles Straßenfoto.
 */
const HELLES_FOTO: Record<ThemaId, FotoKey> = {
  gefahren: "gefahren",
  vorfahrt: "vorfahrt",
  zeichen: "strasse1",
  umwelt: "baeume",
  technik: "pruefung",
  manoever: "verhalten",
  tempo: "tempo",
  parken: "strasse3",
  autobahn: "grundstoff",
  mensch: "simulation",
  zahlen: "lernen",
};

export function hellesFoto(thema: ThemaId): ImageSourcePropType {
  return FOTOS[HELLES_FOTO[thema]];
}

/** Farbe mit Deckkraft (#RRGGBB → rgba). */
export function mitAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

type StartFarben = {
  hell: boolean;
  grund: string;
  karte: string;
  text: string;
  text2: string;
  text3: string;
  linie: string;
  orange: string;
  /** Zarte orange Fläche (Hinweise, Prüfungstermin). */
  orangeFlaeche: string;
  schatten: ViewStyle | null;
};

/** Farben der Startseite: hell kühl-weiß, dunkel wie der Rest der App. */
export function startFarben(f: Farbwelt): StartFarben {
  return f.hell
    ? {
        hell: true,
        grund: "#F4F6FA",
        karte: "#FFFFFF",
        text: "#111827",
        text2: "#5B6475",
        text3: "#9AA2B1",
        linie: "#EBEEF3",
        orange: f.orange,
        orangeFlaeche: "#FFF1E8",
        schatten: leuchten("#1F2D4D", 0.07, 16, 5),
      }
    : { hell: false, grund: f.grund, karte: f.flaeche, text: f.text, text2: f.text2, text3: f.text3, linie: f.linie, orange: f.orange, orangeFlaeche: mitAlpha(f.orange, 0.12), schatten: null };
}

function useStartFarben(): StartFarben {
  return startFarben(useFarbwelt());
}

/** Weiße Karte mit weichem Schatten (dunkel: Fläche mit feiner Kante). */
function kartenStil(c: StartFarben): ViewStyle {
  return c.hell ? { backgroundColor: c.karte, ...c.schatten } : { backgroundColor: c.karte, borderWidth: 1, borderColor: c.linie };
}

function Druck({ children, onPress, style, label }: { children: ReactNode; onPress: () => void; style?: StyleProp<ViewStyle>; label?: string }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [style, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      {children}
    </Pressable>
  );
}

/** Kopf: Profilbild, Begrüßung und Name, rechts die Glocke. */
export function StartKopf({ gruss, name, anzeigeName, glockePunkt, onGlocke, onProfil }: { gruss: string; name: string; anzeigeName: string; glockePunkt: boolean; onGlocke: () => void; onProfil: () => void }) {
  const c = useStartFarben();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: RAND }}>
      <Druck onPress={onProfil} label="Profil" style={{ borderRadius: 26 }}>
        <ProfilBild name={anzeigeName} groesse={52} rand={0} />
      </Druck>
      <View style={{ flex: 1 }}>
        <Text style={{ ...NU.fett, fontSize: 15, color: c.text2 }} numberOfLines={1}>
          {gruss}
        </Text>
        <Text style={{ ...NU.schwarz, fontSize: 26, lineHeight: 31, color: c.text }} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Druck onPress={onGlocke} label="Erinnerungen" style={[{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" }, kartenStil(c)]}>
        <Icon name="notifications-outline" size={22} color={c.text} />
        {glockePunkt ? <View style={{ position: "absolute", top: 11, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: c.orange, borderWidth: 1.5, borderColor: c.karte }} /> : null}
      </Druck>
    </View>
  );
}

/** Abschnittsüberschrift mit optionalem Link rechts. */
export function StartAbschnitt({ titel, link, onLink, style }: { titel: string; link?: string; onLink?: () => void; style?: StyleProp<ViewStyle> }) {
  const c = useStartFarben();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: RAND, marginBottom: 12 }, style]}>
      <Text style={{ ...NU.schwarz, fontSize: 21, color: c.text }}>{titel}</Text>
      {link && onLink ? (
        <Pressable onPress={onLink} hitSlop={10} accessibilityRole="link">
          <Text style={{ ...NU.extra, fontSize: 15, color: c.orange }}>{link}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Großer orangefarbener Knopf. */
function HauptKnopf({ titel, icon }: { titel: string; icon: IconName }) {
  const c = useStartFarben();
  return (
    <View style={[{ height: 52, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: c.orange }, c.hell ? leuchten(c.orange, 0.3, 10, 4) : null]}>
      <Icon name={icon} size={19} color="#FFFFFF" />
      <Text style={{ ...NU.extra, fontSize: 16.5, color: "#FFFFFF" }}>{titel}</Text>
    </View>
  );
}

/**
 * Hauptkarte: helles Foto oben (mit kleinem weißen Etikett), darunter auf Weiß
 * Titel, Unterzeile, optional ein Balken und der orangefarbene Knopf.
 */
export function TagesKarte({
  foto,
  etikett,
  titel,
  unter,
  knopf,
  knopfIcon = "play",
  fortschritt,
  onPress,
}: {
  foto: ImageSourcePropType;
  etikett: string;
  titel: string;
  unter: string;
  knopf: string;
  knopfIcon?: IconName;
  /** 0–1: Balken über dem Knopf (z. B. Tagesziel). */
  fortschritt?: number;
  onPress: () => void;
}) {
  const c = useStartFarben();
  return (
    <Druck onPress={onPress} label={`${titel}. ${knopf}`} style={[{ marginHorizontal: RAND, borderRadius: 28, padding: 8 }, kartenStil(c)]}>
      <View style={{ height: 196, borderRadius: 21, overflow: "hidden", backgroundColor: c.linie }}>
        <Image source={foto} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        <View style={{ position: "absolute", top: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: "#FFFFFF" }}>
          <Icon name="sparkles" size={13} color={c.orange} />
          <Text style={{ ...NU.extra, fontSize: 13, color: "#111827" }}>{etikett}</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10, gap: 4 }}>
        <Text style={{ ...NU.schwarz, fontSize: 24, lineHeight: 29, color: c.text }} numberOfLines={2}>
          {titel}
        </Text>
        <Text style={{ ...NU.fett, fontSize: 15, lineHeight: 20, color: c.text2 }} numberOfLines={2}>
          {unter}
        </Text>
        {fortschritt !== undefined ? (
          <View style={{ height: 8, borderRadius: 4, marginTop: 10, backgroundColor: c.linie, overflow: "hidden" }}>
            <View style={{ width: `${Math.min(100, Math.max(fortschritt > 0 ? 4 : 0, fortschritt * 100))}%`, height: "100%", borderRadius: 4, backgroundColor: c.orange }} />
          </View>
        ) : null}
        <View style={{ marginTop: 14 }}>
          <HauptKnopf titel={knopf} icon={knopfIcon} />
        </View>
      </View>
    </Druck>
  );
}

export type Wert = { icon: IconName; farbe: string; wert: string; label: string; onPress?: () => void };

/** Drei kleine weiße Karten nebeneinander: Symbol, Zahl, Beschriftung. */
export function WerteReihe({ werte, style }: { werte: Wert[]; style?: StyleProp<ViewStyle> }) {
  const c = useStartFarben();
  return (
    <View style={[{ flexDirection: "row", gap: 10, paddingHorizontal: RAND }, style]}>
      {werte.map((w) => {
        const inhalt = (
          <>
            <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: mitAlpha(w.farbe, c.hell ? 0.12 : 0.2) }}>
              <Icon name={w.icon} size={20} color={w.farbe} />
            </View>
            <Text style={{ ...NU.schwarz, fontSize: 22, lineHeight: 27, color: c.text, marginTop: 12 }} numberOfLines={1} adjustsFontSizeToFit>
              {w.wert}
            </Text>
            <Text style={{ ...NU.fett, fontSize: 13, color: c.text2 }} numberOfLines={1}>
              {w.label}
            </Text>
          </>
        );
        const stil: StyleProp<ViewStyle> = [{ flex: 1, borderRadius: 22, padding: 14 }, kartenStil(c)];
        return w.onPress ? (
          <Druck key={w.label} onPress={w.onPress} label={`${w.wert} ${w.label}`} style={stil}>
            {inhalt}
          </Druck>
        ) : (
          <View key={w.label} style={stil}>
            {inhalt}
          </View>
        );
      })}
    </View>
  );
}

/** Prüfungstermin als zarte orange Karte: Symbol, Text, kleiner Knopf rechts. */
export function TerminKarte({ titel, unter, knopf, onPress, style }: { titel: string; unter: string; knopf: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const c = useStartFarben();
  return (
    <Druck onPress={onPress} label={`${titel}. ${knopf}`} style={[{ marginHorizontal: RAND, borderRadius: 24, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: c.orangeFlaeche, borderWidth: 1, borderColor: mitAlpha(c.orange, 0.16) }, style]}>
      <View style={[{ width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: c.hell ? "#FFFFFF" : c.karte }, c.hell ? leuchten(c.orange, 0.15, 8, 3) : null]}>
        <Icon name="calendar" size={25} color={c.orange} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...NU.schwarz, fontSize: 17, lineHeight: 21, color: c.text }} numberOfLines={2}>
          {titel}
        </Text>
        <Text style={{ ...NU.fett, fontSize: 13.5, lineHeight: 18, color: c.text2, marginTop: 2 }} numberOfLines={2}>
          {unter}
        </Text>
      </View>
      <View style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: "center", backgroundColor: c.orange }}>
        <Text style={{ ...NU.extra, fontSize: 14, color: "#FFFFFF" }}>{knopf}</Text>
      </View>
    </Druck>
  );
}

export type Hilfe = { icon: IconName; farbe: string; foto: ImageSourcePropType; titel: string; unter: string; zahl?: number; onPress: () => void };

/** Lernhilfen als 2×2-Raster weißer Karten: helles Foto oben, Text darunter. */
export function HilfenRaster({ hilfen }: { hilfen: Hilfe[] }) {
  const c = useStartFarben();
  const reihen: Hilfe[][] = [];
  for (let i = 0; i < hilfen.length; i += 2) reihen.push(hilfen.slice(i, i + 2));
  return (
    <View style={{ paddingHorizontal: RAND, gap: 12 }}>
      {reihen.map((reihe) => (
        <View key={reihe[0].titel} style={{ flexDirection: "row", gap: 12 }}>
          {reihe.map((h) => (
            <Druck key={h.titel} onPress={h.onPress} label={`${h.titel}, ${h.unter}`} style={[{ flex: 1, borderRadius: 24, padding: 7 }, kartenStil(c)]}>
              <View style={{ height: 104, borderRadius: 18, overflow: "hidden", backgroundColor: c.linie }}>
                <Image source={h.foto} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                <View style={{ position: "absolute", top: 8, left: 8, width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
                  <Icon name={h.icon} size={19} color={h.farbe} />
                </View>
                {h.zahl ? (
                  <View style={{ position: "absolute", top: 8, right: 8, minWidth: 26, height: 26, paddingHorizontal: 8, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: c.orange }}>
                    <Text style={{ ...NU.extra, fontSize: 12.5, color: "#FFFFFF" }}>{h.zahl > 99 ? "99+" : h.zahl}</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ paddingHorizontal: 7, paddingTop: 10, paddingBottom: 6 }}>
                <Text style={{ ...NU.schwarz, fontSize: 16, color: c.text }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {h.titel}
                </Text>
                <Text style={{ ...NU.fett, fontSize: 13, color: c.text3, marginTop: 1 }} numberOfLines={1}>
                  {h.unter}
                </Text>
              </View>
            </Druck>
          ))}
          {reihe.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

/** Weiße Zeile mit kleinem Foto links, Titel, Unterzeile und Pfeil (z. B. Prüfungssimulation). */
export function FotoZeile({ foto, titel, unter, onPress, style }: { foto: ImageSourcePropType; titel: string; unter: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const c = useStartFarben();
  return (
    <Druck onPress={onPress} label={titel} style={[{ marginHorizontal: RAND, borderRadius: 24, padding: 8, paddingRight: 16, flexDirection: "row", alignItems: "center", gap: 14 }, kartenStil(c), style]}>
      <Image source={foto} style={{ width: 72, height: 72, borderRadius: 18 }} resizeMode="cover" />
      <View style={{ flex: 1 }}>
        <Text style={{ ...NU.schwarz, fontSize: 17, color: c.text }} numberOfLines={1}>
          {titel}
        </Text>
        <Text style={{ ...NU.fett, fontSize: 13.5, color: c.text2, marginTop: 2 }} numberOfLines={2}>
          {unter}
        </Text>
      </View>
      <Icon name="chevron-forward" size={20} color={c.text3} />
    </Druck>
  );
}

/** Regel des Tages aus „Kurz erklärt“: weiße Karte, Symbol links, Text, Link. */
export function RegelKarte({ titel, text, onPress }: { titel: string; text: string; onPress: () => void }) {
  const c = useStartFarben();
  const gelb = AKZENT.gelb;
  return (
    <Druck onPress={onPress} label={`Regel des Tages: ${titel}`} style={[{ marginHorizontal: RAND, borderRadius: 24, padding: 18, flexDirection: "row", gap: 14 }, kartenStil(c)]}>
      <View style={{ width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: mitAlpha(gelb, c.hell ? 0.15 : 0.2) }}>
        <Icon name="bulb" size={23} color={gelb} />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ ...NU.extra, fontSize: 12, letterSpacing: 1.1, color: c.text3 }}>REGEL DES TAGES</Text>
        <Text style={{ ...NU.schwarz, fontSize: 17.5, lineHeight: 22, color: c.text }}>{titel}</Text>
        <Text style={{ ...NU.halb, fontSize: 14.5, lineHeight: 20, color: c.text2 }}>{text}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
          <Text style={{ ...NU.extra, fontSize: 14.5, color: c.orange }}>Weiterlesen</Text>
          <Icon name="arrow-forward" size={15} color={c.orange} />
        </View>
      </View>
    </Druck>
  );
}

/** Themen als Reihe weißer Karten: helles Foto oben, Titel und Angabe darunter. */
export function ThemenReihe({ themen, onThema }: { themen: { id: ThemaId; angabe: string }[]; onThema: (id: ThemaId) => void }) {
  const c = useStartFarben();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={162} contentContainerStyle={{ paddingHorizontal: RAND, gap: 12, paddingTop: 2, paddingBottom: 14 }}>
      {themen.map(({ id, angabe }) => {
        const t = themaVon(id);
        return (
          <Druck key={id} onPress={() => onThema(id)} label={`${t.titel}, ${angabe}`} style={[{ width: 150, borderRadius: 22, padding: 7 }, kartenStil(c)]}>
            <Image source={hellesFoto(id)} style={{ width: "100%", height: 100, borderRadius: 16 }} resizeMode="cover" />
            <View style={{ paddingHorizontal: 6, paddingTop: 9, paddingBottom: 6 }}>
              <Text style={{ ...NU.schwarz, fontSize: 14.5, lineHeight: 18, color: c.text }} numberOfLines={2}>
                {t.titel}
              </Text>
              <Text style={{ ...NU.fett, fontSize: 12.5, color: c.text3, marginTop: 3 }}>{angabe}</Text>
            </View>
          </Druck>
        );
      })}
    </ScrollView>
  );
}
