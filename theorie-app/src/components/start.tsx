import { type ReactNode } from "react";
import { Image, Pressable, ScrollView, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Icon, type IconName } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { useFarbwelt, type Farbwelt } from "@/lib/darstellung";
import { themaFoto } from "@/lib/fotos";
import { themaVon, type ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { leuchten, RAND, schrift } from "@/lib/theme";

// Bausteine der Startseite am Handy: große Fotos, jede Sache mit eigener
// Farbe, feste Flächen statt Glas, große Tippflächen.

/** Kräftige Akzentfarben der Startseite (Orange bleibt der Marke vorbehalten). */
export const AKZENT = {
  rot: "#EF4444",
  blau: "#2F6BFF",
  gruen: "#16A34A",
  lila: "#7C3AED",
  gelb: "#E8A200",
  bernstein: "#F08A00",
  pink: "#E0457B",
  tuerkis: "#0E9F9A",
  indigo: "#4F46E5",
  koralle: "#F2665A",
  limette: "#5E9E10",
} as const;

/** Jedes Thema hat seine eigene Farbe. */
export const THEMA_FARBE: Record<ThemaId, string> = {
  gefahren: AKZENT.rot,
  vorfahrt: AKZENT.blau,
  zeichen: AKZENT.gelb,
  umwelt: AKZENT.gruen,
  technik: AKZENT.lila,
  manoever: AKZENT.bernstein,
  tempo: AKZENT.pink,
  parken: AKZENT.tuerkis,
  autobahn: AKZENT.indigo,
  mensch: AKZENT.koralle,
  zahlen: AKZENT.limette,
};

/** Farbe mit Deckkraft (#RRGGBB → rgba). */
export function mitAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Zwei Farben mischen (t = Anteil von b) – ergibt eine feste, deckende Farbe. */
export function mischen(a: string, b: string, t: number): string {
  const x = parseInt(a.replace("#", ""), 16);
  const y = parseInt(b.replace("#", ""), 16);
  const kanal = (s: number) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
  return `#${((1 << 24) | (kanal(16) << 16) | (kanal(8) << 8) | kanal(0)).toString(16).slice(1)}`;
}

/** Feste Kartenfläche: hell weiß mit leichtem Schatten, dunkel mit feiner Kante. */
export function karte(f: Farbwelt): ViewStyle {
  return f.hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.07, 14, 4) } : { backgroundColor: f.flaeche, borderWidth: 1, borderColor: f.linie };
}

/** Getönte, deckende Fläche in einer Akzentfarbe – hell zart, dunkel satt. */
function getoent(f: Farbwelt, farbe: string): string {
  return f.hell ? mischen(farbe, "#FFFFFF", 0.88) : mischen(farbe, "#14181D", 0.8);
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
      style={({ pressed }) => [style, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      {children}
    </Pressable>
  );
}

/** Kopf: Begrüßung und Datum klein, darunter groß der Name; rechts Glocke und Profilbild. */
export function StartKopf({ datum, gruss, name, anzeigeName, glockePunkt, onGlocke, onProfil }: { datum: string; gruss: string; name: string; anzeigeName: string; glockePunkt: boolean; onGlocke: () => void; onProfil: () => void }) {
  const f = useFarbwelt();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: RAND }}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...schrift.textHalb, fontSize: 14, color: f.text2 }} numberOfLines={1}>
          {gruss} · {datum}
        </Text>
        <Text style={{ ...schrift.titel, fontSize: 30, lineHeight: 36, letterSpacing: -0.5, color: f.text, marginTop: 1 }} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Druck onPress={onGlocke} label="Erinnerungen" style={[{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" }, karte(f)]}>
        <Icon name="notifications-outline" size={22} color={f.text} />
        {glockePunkt ? <View style={{ position: "absolute", top: 11, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: AKZENT.rot, borderWidth: 1.5, borderColor: f.hell ? "#FFFFFF" : f.flaeche }} /> : null}
      </Druck>
      <Druck onPress={onProfil} label="Profil">
        <ProfilBild name={anzeigeName} groesse={46} rand={0} />
      </Druck>
    </View>
  );
}

/** Abschnittsüberschrift mit optionalem Link rechts. */
export function StartAbschnitt({ titel, link, onLink, style }: { titel: string; link?: string; onLink?: () => void; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <View style={[{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: RAND, marginBottom: 12 }, style]}>
      <Text style={{ ...schrift.titel, fontSize: 21, letterSpacing: -0.2, color: f.text }}>{titel}</Text>
      {link && onLink ? (
        <Pressable onPress={onLink} hitSlop={10} accessibilityRole="link" style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.hell ? AKZENT.blau : "#7FA6FF" }}>{link}</Text>
          <Icon name="chevron-forward" size={15} color={f.hell ? AKZENT.blau : "#7FA6FF"} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Große Fotokarte oben: Thema des Tages bzw. Weiterlernen. Foto über die ganze
 * Karte, unten ein Schleier in der Farbe des Themas, darauf Titel und Knopf.
 */
export function HeldKarte({
  foto,
  farbe,
  etikett,
  ecke,
  titel,
  unter,
  knopf,
  knopfIcon = "play",
  fortschritt,
  onPress,
}: {
  foto: ImageSourcePropType;
  farbe: string;
  etikett: string;
  ecke?: string;
  titel: string;
  unter: string;
  knopf: string;
  knopfIcon?: IconName;
  /** 0–1: dünner Balken über dem Knopf (z. B. Tagesziel). */
  fortschritt?: number;
  onPress: () => void;
}) {
  const f = useFarbwelt();
  return (
    <Druck onPress={onPress} label={`${titel}, ${knopf}`} style={[{ marginHorizontal: RAND, borderRadius: 28 }, f.hell ? leuchten(farbe, 0.28, 22, 10) : null]}>
      <View style={{ height: 360, borderRadius: 28, overflow: "hidden", backgroundColor: "#111418" }}>
        <Image source={foto} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
        {/* Oben leicht abdunkeln (Etikett lesbar), unten kräftig – mit einem Hauch Themenfarbe */}
        <LinearGradient colors={["rgba(0,0,0,0.28)", "rgba(0,0,0,0)", "rgba(8,10,14,0.55)", "rgba(8,10,14,0.92)"]} locations={[0, 0.3, 0.6, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
        <LinearGradient colors={[mitAlpha(farbe, 0.7), mitAlpha(farbe, 0)]} start={{ x: 0, y: 1 }} end={{ x: 0.85, y: 0.35 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: farbe }}>
            <Icon name="sparkles" size={13} color="#FFFFFF" />
            <Text style={{ ...schrift.textFett, fontSize: 12, letterSpacing: 0.6, color: "#FFFFFF" }}>{etikett.toUpperCase()}</Text>
          </View>
          {ecke ? (
            <View style={{ height: 30, paddingHorizontal: 12, borderRadius: 15, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.42)" }}>
              <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: "#FFFFFF" }}>{ecke}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1 }} />
        <View style={{ padding: 20, paddingTop: 0, gap: 6 }}>
          <Text style={{ ...schrift.titel, fontSize: 29, lineHeight: 34, letterSpacing: -0.4, color: "#FFFFFF" }} numberOfLines={2}>
            {titel}
          </Text>
          <Text style={{ ...schrift.textMittel, fontSize: 15, lineHeight: 21, color: "rgba(255,255,255,0.86)" }} numberOfLines={2}>
            {unter}
          </Text>
          {fortschritt !== undefined ? (
            <View style={{ height: 6, borderRadius: 3, marginTop: 8, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
              <View style={{ width: `${Math.min(100, Math.max(fortschritt > 0 ? 4 : 0, fortschritt * 100))}%`, height: "100%", borderRadius: 3, backgroundColor: "#FFFFFF" }} />
            </View>
          ) : null}
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <View style={{ height: 50, paddingLeft: 8, paddingRight: 22, borderRadius: 25, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFFFFF" }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: farbe }}>
                <Icon name={knopfIcon} size={17} color="#FFFFFF" />
              </View>
              <Text style={{ ...schrift.textFett, fontSize: 16, color: "#14171B" }}>{knopf}</Text>
            </View>
          </View>
        </View>
      </View>
    </Druck>
  );
}

export type Wert = { icon: IconName; farbe: string; wert: string; label: string; onPress?: () => void };

/** Drei Werte nebeneinander, jeder in seiner Farbe. */
export function WerteReihe({ werte, style }: { werte: Wert[]; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <View style={[{ flexDirection: "row", gap: 10, paddingHorizontal: RAND }, style]}>
      {werte.map((w) => {
        const inhalt = (
          <>
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: w.farbe }}>
              <Icon name={w.icon} size={18} color="#FFFFFF" />
            </View>
            <Text style={{ ...schrift.titel, fontSize: w.wert.length > 6 ? 17 : 22, lineHeight: 26, color: f.text, marginTop: 12 }} numberOfLines={1} adjustsFontSizeToFit>
              {w.wert}
            </Text>
            <Text style={{ ...schrift.textHalb, fontSize: 12.5, lineHeight: 16, color: f.hell ? mischen(w.farbe, "#14171B", 0.45) : mischen(w.farbe, "#FFFFFF", 0.45) }} numberOfLines={2}>
              {w.label}
            </Text>
          </>
        );
        const stil: ViewStyle = { flex: 1, minHeight: 124, borderRadius: 22, padding: 14, backgroundColor: getoent(f, w.farbe) };
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

export type Hilfe = { icon: IconName; farbe: string; foto: ImageSourcePropType; titel: string; unter: string; zahl?: number; onPress: () => void };

/** Lernhilfen als 2×2-Raster aus Fotokacheln mit farbigem Schleier. */
export function HilfenRaster({ hilfen }: { hilfen: Hilfe[] }) {
  const f = useFarbwelt();
  const reihen: Hilfe[][] = [];
  for (let i = 0; i < hilfen.length; i += 2) reihen.push(hilfen.slice(i, i + 2));
  return (
    <View style={{ paddingHorizontal: RAND, gap: 12 }}>
      {reihen.map((reihe) => (
        <View key={reihe[0].titel} style={{ flexDirection: "row", gap: 12 }}>
          {reihe.map((h) => (
            <Druck key={h.titel} onPress={h.onPress} label={`${h.titel}, ${h.unter}`} style={[{ flex: 1, borderRadius: 22 }, f.hell ? leuchten(h.farbe, 0.22, 14, 6) : null]}>
              <View style={{ height: 168, borderRadius: 22, overflow: "hidden", backgroundColor: h.farbe }}>
                <Image source={h.foto} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
                <LinearGradient
                  colors={[mitAlpha(h.farbe, 0), mitAlpha(h.farbe, 0.5), mischen(h.farbe, "#0B0D10", 0.3)]}
                  locations={[0.1, 0.55, 1]}
                  style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
                />
                <View style={{ flex: 1, padding: 14, justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
                      <Icon name={h.icon} size={20} color={h.farbe} />
                    </View>
                    {h.zahl ? (
                      <View style={{ minWidth: 26, height: 26, paddingHorizontal: 8, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
                        <Text style={{ ...schrift.textFett, fontSize: 12.5, color: h.farbe }}>{h.zahl > 99 ? "99+" : h.zahl}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View>
                    <Text style={{ ...schrift.titelFett, fontSize: 17, color: "#FFFFFF" }} numberOfLines={1}>
                      {h.titel}
                    </Text>
                    <Text style={{ ...schrift.textMittel, fontSize: 13, color: "rgba(255,255,255,0.88)", marginTop: 2 }} numberOfLines={1}>
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

/** Breite Fotozeile, z. B. Prüfungssimulation: Foto, Farbe von links, Titel und Pfeil. */
export function FotoBanner({ foto, farbe, icon, titel, unter, onPress, style }: { foto: ImageSourcePropType; farbe: string; icon: IconName; titel: string; unter: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <Druck onPress={onPress} label={titel} style={[{ marginHorizontal: RAND, borderRadius: 22 }, f.hell ? leuchten(farbe, 0.22, 14, 6) : null, style]}>
      <View style={{ height: 112, borderRadius: 22, overflow: "hidden", backgroundColor: farbe }}>
        <Image source={foto} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
        <LinearGradient colors={[mischen(farbe, "#0B0D10", 0.25), mitAlpha(farbe, 0.85), mitAlpha(farbe, 0.15)]} locations={[0, 0.5, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18 }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
            <Icon name={icon} size={22} color={farbe} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...schrift.titelFett, fontSize: 18, color: "#FFFFFF" }} numberOfLines={1}>
              {titel}
            </Text>
            <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: "rgba(255,255,255,0.88)", marginTop: 2 }} numberOfLines={2}>
              {unter}
            </Text>
          </View>
          <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.22)" }}>
            <Icon name="chevron-forward" size={18} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </Druck>
  );
}

/** Regel des Tages aus „Kurz erklärt“: warme, getönte Karte mit großem Symbol. */
export function RegelKarte({ titel, text, onPress }: { titel: string; text: string; onPress: () => void }) {
  const f = useFarbwelt();
  const farbe = AKZENT.gelb;
  const tief = f.hell ? mischen(farbe, "#2A1F00", 0.55) : mischen(farbe, "#FFFFFF", 0.35);
  return (
    <Druck onPress={onPress} label={`Regel des Tages: ${titel}`} style={{ marginHorizontal: RAND, borderRadius: 24, overflow: "hidden", backgroundColor: f.hell ? "#FFF4D6" : mischen(farbe, "#14181D", 0.82) }}>
      <View style={{ position: "absolute", right: -22, bottom: -26, opacity: f.hell ? 0.12 : 0.1 }}>
        <Icon name="bulb" size={120} color={farbe} />
      </View>
      <View style={{ padding: 20, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: farbe }}>
            <Icon name="bulb" size={16} color="#FFFFFF" />
          </View>
          <Text style={{ ...schrift.textFett, fontSize: 12.5, letterSpacing: 0.6, color: tief }}>REGEL DES TAGES</Text>
        </View>
        <Text style={{ ...schrift.titel, fontSize: 20, lineHeight: 25, color: f.text, paddingRight: 30 }}>{titel}</Text>
        <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 22, color: f.text2 }}>{text}</Text>
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          <View style={{ height: 38, paddingHorizontal: 16, borderRadius: 19, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: f.hell ? "#14171B" : "#FFFFFF" }}>
            <Text style={{ ...schrift.textFett, fontSize: 14, color: f.hell ? "#FFFFFF" : "#14171B" }}>Weiterlesen</Text>
            <Icon name="arrow-forward" size={15} color={f.hell ? "#FFFFFF" : "#14171B"} />
          </View>
        </View>
      </View>
    </Druck>
  );
}

/** Themen als Reihe großer Fotokarten, jede mit ihrer Themenfarbe. */
export function ThemenReihe({ themen, onThema }: { themen: { id: ThemaId; angabe: string }[]; onThema: (id: ThemaId) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={172} contentContainerStyle={{ paddingHorizontal: RAND, gap: 12, paddingBottom: 8 }}>
      {themen.map(({ id, angabe }) => {
        const t = themaVon(id);
        const farbe = THEMA_FARBE[id];
        return (
          <Druck key={id} onPress={() => onThema(id)} label={`${t.titel}, ${angabe}`} style={{ width: 160 }}>
            <View style={{ height: 210, borderRadius: 22, overflow: "hidden", backgroundColor: farbe }}>
              <Image source={themaFoto(id)} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
              <LinearGradient colors={["rgba(0,0,0,0)", mitAlpha(farbe, 0.45), mischen(farbe, "#0B0D10", 0.55)]} locations={[0.3, 0.65, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
              <View style={{ flex: 1, padding: 12, justifyContent: "space-between" }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: farbe, borderWidth: 2, borderColor: "rgba(255,255,255,0.9)" }}>
                  <Icon name={t.icon as IconName} size={16} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={{ ...schrift.titelFett, fontSize: 16, lineHeight: 20, color: "#FFFFFF" }} numberOfLines={2}>
                    {t.titel}
                  </Text>
                  <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>{angabe}</Text>
                </View>
              </View>
            </View>
          </Druck>
        );
      })}
    </ScrollView>
  );
}
