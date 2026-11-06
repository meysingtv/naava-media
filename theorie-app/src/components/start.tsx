import { type ReactNode } from "react";
import { Image, Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { useFarbwelt, type Farbwelt } from "@/lib/darstellung";
import { themaFoto } from "@/lib/fotos";
import { themaVon, type ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { leuchten, RAND, schrift } from "@/lib/theme";

// Bausteine der Startseite am Handy: ruhige, feste Flächen statt Glas, klare
// Schrift, eine Hauptsache pro Karte, große Tippflächen.

/** Farbe mit Deckkraft (#RRGGBB → rgba). */
export function mitAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Feste Kartenfläche: hell weiß mit leichtem Schatten, dunkel mit feiner Kante. */
export function karte(f: Farbwelt): ViewStyle {
  return f.hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.07, 14, 4) } : { backgroundColor: f.flaeche, borderWidth: 1, borderColor: f.linie };
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
      style={({ pressed }) => [style, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
    >
      {children}
    </Pressable>
  );
}

/** Kopf: kleine Begrüßung, großer Name, rechts Glocke und Profilbild. */
export function StartKopf({ gruss, name, anzeigeName, glockePunkt, onGlocke, onProfil }: { gruss: string; name: string; anzeigeName: string; glockePunkt: boolean; onGlocke: () => void; onProfil: () => void }) {
  const f = useFarbwelt();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: RAND }}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...schrift.textMittel, fontSize: 15, color: f.text2 }}>{gruss}</Text>
        <Text style={{ ...schrift.titel, fontSize: 30, lineHeight: 36, letterSpacing: -0.4, color: f.text }} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <Druck onPress={onGlocke} label="Erinnerungen" style={[{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" }, karte(f)]}>
        <Icon name="notifications-outline" size={22} color={f.text} />
        {glockePunkt ? <View style={{ position: "absolute", top: 11, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: f.orange, borderWidth: 1.5, borderColor: f.hell ? "#FFFFFF" : f.flaeche }} /> : null}
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
      <Text style={{ ...schrift.titelFett, fontSize: 20, color: f.text }}>{titel}</Text>
      {link && onLink ? (
        <Pressable onPress={onLink} hitSlop={10} accessibilityRole="link">
          <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.orange }}>{link}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Großer, flacher Hauptknopf (eine Farbe, keine Verläufe). */
export function HauptKnopfFlach({ titel, icon = "play", onPress }: { titel: string; icon?: IconName; onPress: () => void }) {
  const f = useFarbwelt();
  return (
    <Druck onPress={onPress} label={titel} style={{ height: 54, borderRadius: 16, backgroundColor: f.orange, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <Icon name={icon} size={20} color="#FFFFFF" />
      <Text style={{ ...schrift.textFett, fontSize: 17, color: "#FFFFFF" }}>{titel}</Text>
    </Druck>
  );
}

/** Hauptkarte oben: Foto, kleines Etikett, Titel, Unterzeile, Inhalt und Knopf. */
export function TagesKarte({ thema, etikett, titel, unter, children, knopf, onFoto }: { thema: ThemaId; etikett: string; titel: string; unter: string; children?: ReactNode; knopf: ReactNode; onFoto?: () => void }) {
  const f = useFarbwelt();
  const foto = (
    <View style={{ height: 156, backgroundColor: f.flaeche2 }}>
      <Image source={themaFoto(thema)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      <View style={{ position: "absolute", top: 14, left: 14, flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: "#FFFFFF" }}>
        <Icon name="sparkles" size={13} color="#F2540A" />
        <Text style={{ ...schrift.textFett, fontSize: 12.5, color: "#14171B" }}>{etikett}</Text>
      </View>
    </View>
  );
  return (
    <View style={[{ marginHorizontal: RAND, borderRadius: 24, overflow: "hidden" }, karte(f)]}>
      {onFoto ? (
        <Pressable onPress={onFoto} accessibilityRole="button" accessibilityLabel={titel}>
          {foto}
        </Pressable>
      ) : (
        foto
      )}
      <View style={{ padding: 18, gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ ...schrift.titelFett, fontSize: 22, lineHeight: 27, color: f.text }} numberOfLines={2}>
            {titel}
          </Text>
          <Text style={{ ...schrift.textMittel, fontSize: 15, lineHeight: 21, color: f.text2 }}>{unter}</Text>
        </View>
        {children}
        {knopf}
      </View>
    </View>
  );
}

/** Einfacher Balken für das Tagesziel. */
export function ZielBalken({ anteil }: { anteil: number }) {
  const f = useFarbwelt();
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: f.hell ? "rgba(20,23,27,0.07)" : "rgba(255,255,255,0.1)", overflow: "hidden" }}>
      <View style={{ width: `${Math.min(100, Math.max(anteil > 0 ? 4 : 0, anteil * 100))}%`, height: "100%", borderRadius: 4, backgroundColor: anteil >= 1 ? f.gruen : f.orange }} />
    </View>
  );
}

/** Zeile mit Symbol, Titel, Unterzeile und Pfeil – z. B. der Prüfungstermin. */
export function StartZeile({ icon, farbe, titel, unter, onPress, style }: { icon: IconName; farbe: string; titel: string; unter: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <Druck onPress={onPress} label={titel} style={[{ marginHorizontal: RAND, borderRadius: 20, padding: 14, flexDirection: "row", alignItems: "center", gap: 14 }, karte(f), style]}>
      <View style={{ width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: mitAlpha(farbe, f.hell ? 0.12 : 0.2) }}>
        <Icon name={icon} size={22} color={farbe} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...schrift.textFett, fontSize: 16.5, color: f.text }} numberOfLines={1}>
          {titel}
        </Text>
        <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: f.text2, marginTop: 1 }} numberOfLines={1}>
          {unter}
        </Text>
      </View>
      <Icon name="chevron-forward" size={18} color={f.text3} />
    </Druck>
  );
}

export type Hilfe = { icon: IconName; farbe: string; titel: string; unter: string; zahl?: number; onPress: () => void };

/** Lernhilfen als ruhiges 2×2-Raster. */
export function HilfenRaster({ hilfen }: { hilfen: Hilfe[] }) {
  const f = useFarbwelt();
  const reihen: Hilfe[][] = [];
  for (let i = 0; i < hilfen.length; i += 2) reihen.push(hilfen.slice(i, i + 2));
  return (
    <View style={{ paddingHorizontal: RAND, gap: 12 }}>
      {reihen.map((reihe) => (
        <View key={reihe[0].titel} style={{ flexDirection: "row", gap: 12 }}>
          {reihe.map((h) => (
            <Druck key={h.titel} onPress={h.onPress} label={`${h.titel}, ${h.unter}`} style={[{ flex: 1, minHeight: 116, borderRadius: 20, padding: 16, justifyContent: "space-between", gap: 14 }, karte(f)]}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                <View style={{ width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: mitAlpha(h.farbe, f.hell ? 0.12 : 0.2) }}>
                  <Icon name={h.icon} size={21} color={h.farbe} />
                </View>
                {h.zahl ? (
                  <View style={{ minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: f.orange }}>
                    <Text style={{ ...schrift.textFett, fontSize: 12.5, color: "#FFFFFF" }}>{h.zahl > 99 ? "99+" : h.zahl}</Text>
                  </View>
                ) : null}
              </View>
              <View>
                <Text style={{ ...schrift.textFett, fontSize: 16, color: f.text }} numberOfLines={1}>
                  {h.titel}
                </Text>
                <Text style={{ ...schrift.textMittel, fontSize: 13, color: f.text2, marginTop: 1 }} numberOfLines={1}>
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

/** Regel des Tages aus „Kurz erklärt“: Titel und die erste Regel. */
export function RegelKarte({ titel, text, onPress }: { titel: string; text: string; onPress: () => void }) {
  const f = useFarbwelt();
  const farbe = "#E0A100";
  return (
    <Druck onPress={onPress} label={`Regel des Tages: ${titel}`} style={[{ marginHorizontal: RAND, borderRadius: 20, padding: 18, gap: 10 }, karte(f)]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: mitAlpha(farbe, f.hell ? 0.14 : 0.22) }}>
          <Icon name="bulb" size={16} color={farbe} />
        </View>
        <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: f.text2 }}>Regel des Tages</Text>
      </View>
      <Text style={{ ...schrift.titelFett, fontSize: 18, lineHeight: 23, color: f.text }}>{titel}</Text>
      <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 22, color: f.text2 }}>{text}</Text>
      <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.orange }}>Weiterlesen</Text>
    </Druck>
  );
}

/** Themen als Reihe: Foto oben, Titel und Angabe darunter (kein Text über dem Bild). */
export function ThemenReihe({ themen, onThema }: { themen: { id: ThemaId; angabe: string }[]; onThema: (id: ThemaId) => void }) {
  const f = useFarbwelt();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={158} contentContainerStyle={{ paddingHorizontal: RAND, gap: 12 }}>
      {themen.map(({ id, angabe }) => {
        const t = themaVon(id);
        return (
          <Druck key={id} onPress={() => onThema(id)} label={`${t.titel}, ${angabe}`} style={{ width: 146 }}>
            <View style={[{ height: 104, borderRadius: 18, overflow: "hidden", backgroundColor: f.flaeche2 }, f.hell ? leuchten("#3C2C18", 0.08, 10, 3) : null]}>
              <Image source={themaFoto(id)} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
            </View>
            <Text style={{ ...schrift.textFett, fontSize: 14.5, lineHeight: 19, color: f.text, marginTop: 9 }} numberOfLines={2}>
              {t.titel}
            </Text>
            <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: f.text3, marginTop: 2 }}>{angabe}</Text>
          </Druck>
        );
      })}
    </ScrollView>
  );
}
