import { type ReactNode } from "react";
import { Image, Pressable, ScrollView, Text, View, type ImageSourcePropType, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Icon, type IconName } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { useFarbwelt, type Farbwelt } from "@/lib/darstellung";
import { FOTOS, type FotoKey } from "@/lib/fotos";
import { themaVon, type ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { leuchten, RAND } from "@/lib/theme";

// Bausteine der Startseite am Handy (hell und dunkel): oben eine kräftige
// orange Karte als Blickfang, darunter klare Karten, helle Fotos und farbige
// Symbole. Runde, kräftige Schrift (Nunito).

/** Farben für Symbole und Akzente. */
export const AKZENT = {
  orange: "#F2540A",
  rot: "#EF4444",
  blau: "#3B82F6",
  gruen: "#1FAF5A",
  gelb: "#F5A400",
  tuerkis: "#14A3A0",
  pink: "#E0457B",
} as const;

const NU = {
  schwarz: { fontFamily: "Nunito_900Black", includeFontPadding: false },
  extra: { fontFamily: "Nunito_800ExtraBold", includeFontPadding: false },
  fett: { fontFamily: "Nunito_700Bold", includeFontPadding: false },
  halb: { fontFamily: "Nunito_600SemiBold", includeFontPadding: false },
} satisfies Record<string, TextStyle>;

/** Helle Fotos je Thema (einige Themenfotos sind Nachtaufnahmen). */
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
  /** Zarter Schein oben auf der Seite. */
  schein: [string, string];
  karte: string;
  text: string;
  text2: string;
  text3: string;
  linie: string;
  orange: string;
  schatten: ViewStyle | null;
};

export function startFarben(f: Farbwelt): StartFarben {
  return f.hell
    ? {
        hell: true,
        grund: "#F5F6FA",
        schein: ["#FFE9DC", "rgba(245,246,250,0)"],
        karte: "#FFFFFF",
        text: "#111827",
        text2: "#5B6475",
        text3: "#9AA2B1",
        linie: "#ECEFF4",
        orange: AKZENT.orange,
        schatten: leuchten("#1F2D4D", 0.07, 16, 6),
      }
    : {
        hell: false,
        grund: "#0D1015",
        schein: ["rgba(242,84,10,0.16)", "rgba(242,84,10,0)"],
        karte: "#171B22",
        text: "#F3F4F6",
        text2: "#A5ADBA",
        text3: "#6E7785",
        linie: "rgba(255,255,255,0.07)",
        orange: "#FF6A1F",
        schatten: null,
      };
}

function useStartFarben(): StartFarben {
  return startFarben(useFarbwelt());
}

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
      style={({ pressed }) => [style, { transform: [{ scale: pressed ? 0.975 : 1 }] }]}
    >
      {children}
    </Pressable>
  );
}

/** Zarter Schein oben auf der Seite (liegt hinter dem Inhalt). */
export function StartSchein({ hoehe }: { hoehe: number }) {
  const c = useStartFarben();
  return <LinearGradient pointerEvents="none" colors={c.schein} style={{ position: "absolute", left: 0, right: 0, top: 0, height: hoehe }} />;
}

/** Kopf: Begrüßung und Name groß, rechts Glocke und Profilbild. */
export function StartKopf({ gruss, name, anzeigeName, glockePunkt, onGlocke, onProfil }: { gruss: string; name: string; anzeigeName: string; glockePunkt: boolean; onGlocke: () => void; onProfil: () => void }) {
  const c = useStartFarben();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: RAND }}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...NU.fett, fontSize: 16, color: c.text2 }} numberOfLines={1}>
          {gruss}
        </Text>
        <Text style={{ ...NU.schwarz, fontSize: 34, lineHeight: 40, letterSpacing: -0.4, color: c.text }} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Druck onPress={onGlocke} label="Erinnerungen" style={[{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" }, kartenStil(c)]}>
        <Icon name="notifications-outline" size={22} color={c.text} />
        {glockePunkt ? <View style={{ position: "absolute", top: 11, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: c.orange, borderWidth: 1.5, borderColor: c.karte }} /> : null}
      </Druck>
      <Druck onPress={onProfil} label="Profil" style={[{ borderRadius: 24 }, c.hell ? c.schatten : null]}>
        <ProfilBild name={anzeigeName} groesse={48} rand={0} />
      </Druck>
    </View>
  );
}

/** Abschnittsüberschrift mit optionalem Link rechts. */
export function StartAbschnitt({ titel, link, onLink, style }: { titel: string; link?: string; onLink?: () => void; style?: StyleProp<ViewStyle> }) {
  const c = useStartFarben();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: RAND, marginBottom: 12 }, style]}>
      <Text style={{ ...NU.schwarz, fontSize: 22, color: c.text }}>{titel}</Text>
      {link && onLink ? (
        <Pressable onPress={onLink} hitSlop={10} accessibilityRole="link">
          <Text style={{ ...NU.extra, fontSize: 15, color: c.orange }}>{link}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Blickfang oben: kräftige orange Karte mit Etikett, großem Titel, Foto als
 * schräg gestelltes Bild rechts und weißem Knopf.
 */
export function HeldKarte({
  foto,
  etikett,
  titel,
  unter,
  knopf,
  fortschritt,
  onPress,
}: {
  foto: ImageSourcePropType;
  etikett: string;
  titel: string;
  unter: string;
  knopf: string;
  /** 0–1: weißer Balken (z. B. Tagesziel). */
  fortschritt?: number;
  onPress: () => void;
}) {
  const c = useStartFarben();
  return (
    <Druck onPress={onPress} label={`${titel}. ${knopf}`} style={[{ marginHorizontal: RAND, borderRadius: 30 }, leuchten("#F2540A", c.hell ? 0.38 : 0.3, 22, 12)]}>
      <LinearGradient colors={["#FF8A3D", "#F2540A", "#D6400A"]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 30, padding: 20, overflow: "hidden" }}>
        {/* Ruhige Zier: große helle Kreise */}
        <View pointerEvents="none" style={{ position: "absolute", right: -70, top: -80, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.10)" }} />
        <View pointerEvents="none" style={{ position: "absolute", left: -60, bottom: -110, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.07)" }} />

        <View style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.22)" }}>
                <Icon name="sparkles" size={13} color="#FFFFFF" />
                <Text style={{ ...NU.extra, fontSize: 12.5, color: "#FFFFFF" }}>{etikett}</Text>
              </View>
            </View>
            <Text style={{ ...NU.schwarz, fontSize: 26, lineHeight: 30, letterSpacing: -0.3, color: "#FFFFFF", marginTop: 14 }} numberOfLines={3}>
              {titel}
            </Text>
            <Text style={{ ...NU.fett, fontSize: 14.5, lineHeight: 19, color: "rgba(255,255,255,0.88)", marginTop: 6 }} numberOfLines={2}>
              {unter}
            </Text>
          </View>
          <View style={[{ width: 100, height: 124, borderRadius: 20, borderWidth: 3, borderColor: "#FFFFFF", overflow: "hidden", backgroundColor: "#FFFFFF", transform: [{ rotate: "4deg" }], marginTop: 4 }, leuchten("#7A2200", 0.35, 12, 6)]}>
            <Image source={foto} style={{ width: "100%", height: "100%", borderRadius: 17 }} resizeMode="cover" />
          </View>
        </View>

        {fortschritt !== undefined ? (
          <View style={{ height: 8, borderRadius: 4, marginTop: 16, backgroundColor: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
            <View style={{ width: `${Math.min(100, Math.max(fortschritt > 0 ? 4 : 0, fortschritt * 100))}%`, height: "100%", borderRadius: 4, backgroundColor: "#FFFFFF" }} />
          </View>
        ) : null}

        <View style={{ flexDirection: "row", marginTop: 18 }}>
          <View style={{ height: 50, paddingLeft: 8, paddingRight: 20, borderRadius: 25, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF" }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#F2540A" }}>
              <Icon name="play" size={16} color="#FFFFFF" />
            </View>
            <Text style={{ ...NU.extra, fontSize: 16, color: "#D6400A" }}>{knopf}</Text>
          </View>
        </View>
      </LinearGradient>
    </Druck>
  );
}

export type Wert = { icon: IconName; farbe: string; wert: string; label: string; onPress?: () => void };

/** Eine Karte mit drei Werten: farbiger Kreis mit Symbol, Zahl, Beschriftung. */
export function WerteKarte({ werte, style }: { werte: Wert[]; style?: StyleProp<ViewStyle> }) {
  const c = useStartFarben();
  return (
    <View style={[{ marginHorizontal: RAND, borderRadius: 26, paddingVertical: 18, flexDirection: "row" }, kartenStil(c), style]}>
      {werte.map((w, i) => {
        const inhalt = (
          <>
            <View style={[{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: w.farbe }, c.hell ? leuchten(w.farbe, 0.3, 8, 4) : null]}>
              <Icon name={w.icon} size={21} color="#FFFFFF" />
            </View>
            <Text style={{ ...NU.schwarz, fontSize: 23, lineHeight: 28, color: c.text, marginTop: 10 }} numberOfLines={1} adjustsFontSizeToFit>
              {w.wert}
            </Text>
            <Text style={{ ...NU.fett, fontSize: 13, color: c.text2 }} numberOfLines={1}>
              {w.label}
            </Text>
          </>
        );
        const stil: ViewStyle = { flex: 1, alignItems: "center", paddingHorizontal: 6, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: c.linie };
        return w.onPress ? (
          <Pressable
            key={w.label}
            onPress={() => {
              tippen();
              w.onPress?.();
            }}
            accessibilityRole="button"
            accessibilityLabel={`${w.wert} ${w.label}`}
            style={({ pressed }) => [stil, { opacity: pressed ? 0.6 : 1 }]}
          >
            {inhalt}
          </Pressable>
        ) : (
          <View key={w.label} style={stil}>
            {inhalt}
          </View>
        );
      })}
    </View>
  );
}

/** Prüfungstermin: Kalenderblatt links, Text, orangefarbener Knopf rechts. */
export function TerminKarte({ monat, tag, titel, unter, knopf, onPress, style }: { monat: string; tag: string; titel: string; unter: string; knopf: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const c = useStartFarben();
  return (
    <Druck onPress={onPress} label={`${titel}. ${knopf}`} style={[{ marginHorizontal: RAND, borderRadius: 24, padding: 14, flexDirection: "row", alignItems: "center", gap: 14 }, kartenStil(c), style]}>
      <View style={{ width: 58, height: 64, borderRadius: 15, overflow: "hidden", backgroundColor: c.hell ? "#FFF4EE" : mitAlpha(c.orange, 0.12), borderWidth: 1, borderColor: mitAlpha(c.orange, 0.22) }}>
        <View style={{ height: 20, alignItems: "center", justifyContent: "center", backgroundColor: c.orange }}>
          <Text style={{ ...NU.schwarz, fontSize: 10, letterSpacing: 1, color: "#FFFFFF" }}>{monat}</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ ...NU.schwarz, fontSize: 24, color: c.orange }}>{tag}</Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...NU.schwarz, fontSize: 17, lineHeight: 21, color: c.text }} numberOfLines={1}>
          {titel}
        </Text>
        <Text style={{ ...NU.fett, fontSize: 13.5, lineHeight: 18, color: c.text2, marginTop: 2 }} numberOfLines={2}>
          {unter}
        </Text>
      </View>
      <View style={{ height: 38, paddingHorizontal: 15, borderRadius: 19, justifyContent: "center", backgroundColor: c.orange }}>
        <Text style={{ ...NU.extra, fontSize: 14, color: "#FFFFFF" }}>{knopf}</Text>
      </View>
    </Druck>
  );
}

export type Hilfe = { icon: IconName; farbe: string; foto: ImageSourcePropType; titel: string; unter: string; zahl?: number; onPress: () => void };

/** Lernhilfen als 2×2-Raster: helles Foto, Symbol oben links, Text unten. */
export function HilfenRaster({ hilfen }: { hilfen: Hilfe[] }) {
  const c = useStartFarben();
  const reihen: Hilfe[][] = [];
  for (let i = 0; i < hilfen.length; i += 2) reihen.push(hilfen.slice(i, i + 2));
  return (
    <View style={{ paddingHorizontal: RAND, gap: 12 }}>
      {reihen.map((reihe) => (
        <View key={reihe[0].titel} style={{ flexDirection: "row", gap: 12 }}>
          {reihe.map((h) => (
            <Druck key={h.titel} onPress={h.onPress} label={`${h.titel}, ${h.unter}`} style={[{ flex: 1, borderRadius: 24 }, c.hell ? leuchten("#1F2D4D", 0.12, 14, 6) : null]}>
              <View style={{ height: 160, borderRadius: 24, overflow: "hidden", backgroundColor: c.karte }}>
                <Image source={h.foto} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
                {/* Nur unten ein leichter Verlauf, damit die Schrift lesbar bleibt */}
                <LinearGradient colors={["rgba(10,14,20,0)", "rgba(10,14,20,0.62)"]} locations={[0.42, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
                <View style={{ flex: 1, padding: 12, justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
                      <Icon name={h.icon} size={20} color={h.farbe} />
                    </View>
                    {h.zahl ? (
                      <View style={{ minWidth: 26, height: 26, paddingHorizontal: 8, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: c.orange }}>
                        <Text style={{ ...NU.extra, fontSize: 12.5, color: "#FFFFFF" }}>{h.zahl > 99 ? "99+" : h.zahl}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View>
                    <Text style={{ ...NU.schwarz, fontSize: 17, color: "#FFFFFF" }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {h.titel}
                    </Text>
                    <Text style={{ ...NU.fett, fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: 1 }} numberOfLines={1}>
                      {h.unter}
                    </Text>
                  </View>
                </View>
              </View>
            </Druck>
          ))}
          {reihe.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

/** Zeile mit kleinem Foto links, Titel, Unterzeile und Pfeil (z. B. Prüfungssimulation). */
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

/** Regel des Tages: Karte mit gelbem Streifen links. */
export function RegelKarte({ titel, text, onPress }: { titel: string; text: string; onPress: () => void }) {
  const c = useStartFarben();
  return (
    <Druck onPress={onPress} label={`Regel des Tages: ${titel}`} style={[{ marginHorizontal: RAND, borderRadius: 24, overflow: "hidden", flexDirection: "row" }, kartenStil(c)]}>
      <View style={{ width: 5, backgroundColor: AKZENT.gelb }} />
      <View style={{ flex: 1, paddingVertical: 18, paddingHorizontal: 16, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon name="bulb" size={15} color={AKZENT.gelb} />
          <Text style={{ ...NU.schwarz, fontSize: 11.5, letterSpacing: 1, color: c.hell ? "#C98A00" : AKZENT.gelb }}>REGEL DES TAGES</Text>
        </View>
        <Text style={{ ...NU.schwarz, fontSize: 17.5, lineHeight: 22, color: c.text }}>{titel}</Text>
        <Text style={{ ...NU.halb, fontSize: 14.5, lineHeight: 20, color: c.text2 }}>{text}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
          <Text style={{ ...NU.extra, fontSize: 14.5, color: c.orange }}>Weiterlesen</Text>
          <Icon name="arrow-forward" size={15} color={c.orange} />
        </View>
      </View>
    </Druck>
  );
}

/** Themen als Reihe von Karten: helles Foto oben, Titel und Angabe darunter. */
export function ThemenReihe({ themen, onThema }: { themen: { id: ThemaId; angabe: string }[]; onThema: (id: ThemaId) => void }) {
  const c = useStartFarben();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={162} contentContainerStyle={{ paddingHorizontal: RAND, gap: 12, paddingTop: 2, paddingBottom: 14 }}>
      {themen.map(({ id, angabe }) => {
        const t = themaVon(id);
        return (
          <Druck key={id} onPress={() => onThema(id)} label={`${t.titel}, ${angabe}`} style={[{ width: 150, borderRadius: 22, padding: 7 }, kartenStil(c)]}>
            <Image source={hellesFoto(id)} style={{ width: "100%", height: 100, borderRadius: 16 }} resizeMode="cover" />
            <View style={{ paddingHorizontal: 6, paddingTop: 9, paddingBottom: 6, minHeight: 58 }}>
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
