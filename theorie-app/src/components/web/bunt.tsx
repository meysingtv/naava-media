import { Children, useState, type ReactNode } from "react";
import { Pressable, Text, TextInput, View, type PressableStateCallbackType, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import { router } from "expo-router";
import Svg, { Circle } from "react-native-svg";

import { Icon, type IconName } from "@/components/icon";
import type { ThemaId } from "@/lib/fragen";

// Bausteine der Lern-App im Browser („bunt“): freundlich, aber ruhig. Jedes
// Thema hat seine Farbe – als Akzent, nicht als Fläche. Knöpfe und Karten
// haben eine feine Unterkante und sinken beim Klicken ein, die Schrift ist
// Nunito (rund). Nur im Browser am PC –
// am Handy bleibt die App, wie sie ist.

/** Hover gibt es nur im Browser – React Native kennt den Zustand nicht. */
export type Zustand = PressableStateCallbackType & { hovered?: boolean };

/** Farben der hellen Fassung. */
const HELL = {
  grund: "#FFFFFF",
  /** Karten, Felder, Knöpfe mit Rand. */
  flaeche: "#FFFFFF",
  /** Leicht getönte Fläche (Spur von Balken, Platzhalter). */
  ton: "#F4F3F0",
  /** Fläche unter der Maus. */
  hover: "#FAF9F6",
  hover2: "#EDECE8",
  linie: "#E7E5E0",
  /** Unterkante von Karten. */
  kante: "#DEDBD4",
  text: "#2B2D31",
  text2: "#6B6F76",
  text3: "#A4A7AC",
  orange: "#FF6A13",
  orangeKante: "#D9540A",
  orangeHell: "#FFF0E6",
  gruen: "#4CC764",
  gruenKante: "#36A34D",
  gruenHell: "#E9F9EC",
  rot: "#FF5A5F",
  rotKante: "#D9434A",
  rotHell: "#FFECEC",
  blau: "#2EA8F5",
  blauKante: "#1C89CF",
  blauHell: "#E6F5FE",
  gelb: "#FFC72C",
  gelbKante: "#E0A800",
  gelbHell: "#FFF7DC",
  lila: "#A974FF",
  lilaKante: "#8A55E0",
  lilaHell: "#F3ECFF",
};

type Farben = typeof HELL;

/** Leichte Tönung einer Farbe für den dunklen Grund. */
function dunkelTon(hex: string): string {
  const z = parseInt(hex.slice(1), 16);
  return `rgba(${(z >> 16) & 255},${(z >> 8) & 255},${z & 255},0.17)`;
}

/** Farben der dunklen Fassung („Nachtfahrt“). */
const DUNKEL: Farben = {
  ...HELL,
  grund: "#131518",
  flaeche: "#1A1D21",
  ton: "#23272C",
  hover: "#1F2328",
  hover2: "#2B3036",
  linie: "#2B2F35",
  kante: "#30353C",
  text: "#EEF0F2",
  text2: "#ABB0B7",
  text3: "#717780",
  orangeHell: dunkelTon(HELL.orange),
  gruenHell: dunkelTon(HELL.gruen),
  rotHell: dunkelTon(HELL.rot),
  blauHell: dunkelTon(HELL.blau),
  gelbHell: dunkelTon(HELL.gelb),
  lilaHell: dunkelTon(HELL.lila),
};

/**
 * Aktuelle Farben. Werden beim Umschalten hell/dunkel ersetzt (webFarbenSetzen)
 * – der Rahmen baut die PC-Ansicht dann neu auf, damit alles die neuen Werte liest.
 */
export const B: Farben = { ...HELL };

export type Ton = { farbe: string; kante: string; hell: string };

export const TOENE = {
  orange: { farbe: B.orange, kante: B.orangeKante, hell: B.orangeHell },
  gruen: { farbe: B.gruen, kante: B.gruenKante, hell: B.gruenHell },
  rot: { farbe: B.rot, kante: B.rotKante, hell: B.rotHell },
  blau: { farbe: B.blau, kante: B.blauKante, hell: B.blauHell },
  gelb: { farbe: B.gelb, kante: B.gelbKante, hell: B.gelbHell },
  lila: { farbe: B.lila, kante: B.lilaKante, hell: B.lilaHell },
  pink: { farbe: "#FF6FB5", kante: "#DB4F94", hell: "#FFEDF6" },
  tuerkis: { farbe: "#1FC7B6", kante: "#13A395", hell: "#E3FAF7" },
  indigo: { farbe: "#5B7CFA", kante: "#4160D6", hell: "#ECF0FF" },
  koralle: { farbe: "#FF7A59", kante: "#DB5E3F", hell: "#FFEFEA" },
  limette: { farbe: "#8BCB2E", kante: "#6FA71F", hell: "#F1F9E4" },
  bernstein: { farbe: "#FF9F1C", kante: "#DB820A", hell: "#FFF3E0" },
} satisfies Record<string, Ton>;

/** Helle Tönungen der Töne – zum Zurückschalten. */
const TOENE_HELL = Object.fromEntries(Object.entries(TOENE).map(([k, t]) => [k, t.hell])) as Record<keyof typeof TOENE, string>;

let dunkelAktiv = false;

/** PC-Fassung hell oder dunkel – ändert B und die Töne an Ort und Stelle. */
export function webFarbenSetzen(dunkel: boolean) {
  if (dunkel === dunkelAktiv) return;
  dunkelAktiv = dunkel;
  Object.assign(B, dunkel ? DUNKEL : HELL);
  for (const [k, t] of Object.entries(TOENE) as [keyof typeof TOENE, Ton][]) t.hell = dunkel ? dunkelTon(t.farbe) : TOENE_HELL[k];
}

/** Ist die PC-Fassung gerade dunkel? */
export function webDunkel(): boolean {
  return dunkelAktiv;
}

export type TonName = keyof typeof TOENE;

/** Jedes Thema hat seine eigene Farbe. */
export const THEMA_TON: Record<ThemaId, Ton> = {
  gefahren: TOENE.rot,
  vorfahrt: TOENE.blau,
  zeichen: TOENE.gelb,
  umwelt: TOENE.gruen,
  technik: TOENE.lila,
  manoever: TOENE.bernstein,
  tempo: TOENE.pink,
  parken: TOENE.tuerkis,
  autobahn: TOENE.indigo,
  mensch: TOENE.koralle,
  zahlen: TOENE.limette,
};

/** Nunito in den Stärken der App. */
export const n = {
  schwarz: { fontFamily: "Nunito_900Black" } as TextStyle,
  fett: { fontFamily: "Nunito_800ExtraBold" } as TextStyle,
  halb: { fontFamily: "Nunito_700Bold" } as TextStyle,
  text: { fontFamily: "Nunito_600SemiBold" } as TextStyle,
};

export const zahlen = (x: number) => x.toLocaleString("de-DE");

// ---------------------------------------------------------------------------
// Knöpfe und Karten
// ---------------------------------------------------------------------------

/** Dicker Knopf mit Unterkante – sinkt beim Klicken ein. */
export function Knopf({
  titel,
  icon,
  onPress,
  ton = "orange",
  art = "voll",
  groesse = "mittel",
  deaktiviert,
  style,
}: {
  titel: string;
  icon?: IconName;
  onPress: () => void;
  ton?: TonName;
  /** voll = farbig, rand = weiß mit farbiger Schrift. */
  art?: "voll" | "rand";
  groesse?: "gross" | "mittel" | "klein";
  deaktiviert?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = TOENE[ton];
  const hoehe = groesse === "gross" ? 54 : groesse === "mittel" ? 44 : 36;
  const kante = groesse === "klein" ? 2 : 3;
  const voll = art === "voll" && !deaktiviert;
  const flaeche = deaktiviert ? B.ton : voll ? t.farbe : B.flaeche;
  const unten = deaktiviert ? B.linie : voll ? t.kante : B.kante;
  const schrift = deaktiviert ? B.text3 : voll ? "#FFFFFF" : t.farbe;
  return (
    <Pressable
      disabled={deaktiviert}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={titel}
      style={(z: Zustand) => [
        {
          height: hoehe,
          paddingHorizontal: groesse === "klein" ? 14 : 20,
          borderRadius: groesse === "klein" ? 10 : 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
          backgroundColor: flaeche,
          borderWidth: voll ? 0 : 1.5,
          borderColor: B.linie,
          borderBottomWidth: z.pressed && !deaktiviert ? (voll ? 0 : 1.5) : kante,
          borderBottomColor: unten,
          marginTop: z.pressed && !deaktiviert ? kante - (voll ? 0 : 1.5) : 0,
          filter: z.hovered && !deaktiviert ? "brightness(1.05)" : undefined,
        } as ViewStyle,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={groesse === "gross" ? 22 : 18} color={schrift} /> : null}
      <Text style={{ ...n.fett, fontSize: groesse === "gross" ? 16.5 : groesse === "mittel" ? 15 : 13.5, color: schrift }} numberOfLines={1}>
        {titel}
      </Text>
    </Pressable>
  );
}

/** Weiße Karte mit Rand und dicker Unterkante. Mit onPress klickbar (sinkt ein). */
export function Kachel({ children, onPress, style, ton, aktiv }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; ton?: Ton; aktiv?: boolean }) {
  const rand = aktiv && ton ? ton.farbe : B.linie;
  const unten = aktiv && ton ? ton.kante : B.kante;
  const basis = { borderRadius: 18, borderWidth: 1.5, borderColor: rand, borderBottomWidth: 3, borderBottomColor: unten, backgroundColor: aktiv && ton ? ton.hell : B.flaeche, overflow: "hidden" } as ViewStyle;
  if (!onPress) return <View style={[basis, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={(z: Zustand) => [basis, z.hovered ? { backgroundColor: aktiv && ton ? ton.hell : B.hover, borderColor: ton ? ton.farbe : B.kante } : null, z.pressed ? { borderBottomWidth: 1.5, marginTop: 1.5 } : null, style]}
    >
      {children}
    </Pressable>
  );
}

/** Farbiges Quadrat mit Symbol (Themen, Lernmodi). */
export function Symbol({ icon, ton, groesse = 48, bild }: { icon?: IconName; ton: Ton; groesse?: number; bild?: ReactNode }) {
  return (
    <View style={{ width: groesse, height: groesse, borderRadius: groesse * 0.28, backgroundColor: ton.farbe, alignItems: "center", justifyContent: "center" }}>
      {bild ?? (icon ? <Icon name={icon} size={groesse * 0.5} color="#FFFFFF" /> : null)}
    </View>
  );
}

/** Dicker, runder Balken mit hellem Glanzstreifen. */
export function Balken({ anteil, ton = TOENE.orange, hoehe = 10, style }: { anteil: number; ton?: Ton; hoehe?: number; style?: StyleProp<ViewStyle> }) {
  const a = Math.max(0, Math.min(1, anteil));
  return (
    <View style={[{ height: hoehe, borderRadius: hoehe / 2, backgroundColor: B.ton, overflow: "hidden" }, style]}>
      {a > 0 ? (
        <View style={{ width: `${Math.max(a * 100, (hoehe / 2) * 0.8)}%`, minWidth: hoehe, height: "100%", borderRadius: hoehe / 2, backgroundColor: ton.farbe }}>
          {hoehe >= 14 ? <View style={{ position: "absolute", top: hoehe * 0.22, left: hoehe * 0.5, right: hoehe * 0.5, height: Math.max(3, hoehe * 0.2), borderRadius: 3, backgroundColor: "rgba(255,255,255,0.3)" }} /> : null}
        </View>
      ) : null}
    </View>
  );
}

/** Fortschritt als dicker Ring, die Mitte frei für Text. */
export function DickRing({ anteil, groesse = 120, dicke = 14, ton = TOENE.orange, children }: { anteil: number; groesse?: number; dicke?: number; ton?: Ton; children?: ReactNode }) {
  const r = (groesse - dicke) / 2;
  const umfang = 2 * Math.PI * r;
  const a = Math.max(0, Math.min(1, anteil));
  return (
    <View style={{ width: groesse, height: groesse, alignItems: "center", justifyContent: "center" }}>
      <Svg width={groesse} height={groesse} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={groesse / 2} cy={groesse / 2} r={r} stroke={B.ton} strokeWidth={dicke} fill="none" />
        {a > 0 ? <Circle cx={groesse / 2} cy={groesse / 2} r={r} stroke={ton.farbe} strokeWidth={dicke} fill="none" strokeLinecap="round" strokeDasharray={`${umfang * a} ${umfang}`} /> : null}
      </Svg>
      {children}
    </View>
  );
}

/** Kleine Kapsel: Symbol + Text, farbig hinterlegt. */
export function Chip({ icon, text, ton = TOENE.orange, onPress }: { icon?: IconName; text: string; ton?: Ton; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: ton.hell, opacity: z.hovered && onPress ? 0.85 : 1 })}>
      {icon ? <Icon name={icon} size={15} color={ton.farbe} /> : null}
      <Text style={{ ...n.fett, fontSize: 13.5, color: ton.kante }}>{text}</Text>
    </Pressable>
  );
}

/** Wert mit großem farbigem Symbol (Serie, XP …). */
export function Wert({ icon, ton, wert, titel, onPress }: { icon: IconName; ton: Ton; wert: string; titel?: string; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityLabel={titel ? `${titel}: ${wert}` : wert} style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, height: 40, borderRadius: 12, backgroundColor: z.hovered && onPress ? B.ton : "transparent" })}>
      <Icon name={icon} size={24} color={ton.farbe} />
      <Text style={{ ...n.schwarz, fontSize: 18, color: ton.farbe, fontVariant: ["tabular-nums"] }}>{wert}</Text>
    </Pressable>
  );
}

/** Überschrift eines Abschnitts mit optionalem Link rechts. */
export function Abschnitt({ titel, link, onLink, style }: { titel: string; link?: string; onLink?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }, style]}>
      <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>{titel}</Text>
      {link && onLink ? (
        <Pressable onPress={onLink} style={(z: Zustand) => ({ opacity: z.hovered ? 0.7 : 1 })}>
          <Text style={{ ...n.fett, fontSize: 14.5, color: B.blau }}>{link}</Text>
        </Pressable>
      ) : link ? (
        <Text style={{ ...n.halb, fontSize: 14, color: B.text3 }}>{link}</Text>
      ) : null}
    </View>
  );
}

/** Großer Seitentitel mit Unterzeile. */
export function SeitenTitel({ titel, unter, rechts }: { titel: string; unter?: string; rechts?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <View style={{ flex: 1, minWidth: 240 }}>
        <Text style={{ ...n.schwarz, fontSize: 36, lineHeight: 42, color: B.text }}>{titel}</Text>
        {unter ? <Text style={{ ...n.halb, fontSize: 16, color: B.text2, marginTop: 2 }}>{unter}</Text> : null}
      </View>
      {rechts}
    </View>
  );
}

/** Raster mit gleich breiten Kacheln: so viele Spalten, wie mit `min` Breite hineinpassen. */
export function Raster({ min = 220, max, abstand = 16, children, style }: { min?: number; max?: number; abstand?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [breite, setBreite] = useState(0);
  const kinder = Children.toArray(children);
  let spalten = Math.max(1, Math.floor((breite + abstand) / (min + abstand)));
  if (max) spalten = Math.min(spalten, max);
  const w = breite ? (breite - abstand * (spalten - 1)) / spalten : 0;
  return (
    <View onLayout={(e) => setBreite(e.nativeEvent.layout.width)} style={[{ width: "100%", alignSelf: "stretch", flexDirection: "row", flexWrap: "wrap", gap: abstand }, style]}>
      {breite ? kinder.map((k, i) => <View key={i} style={{ width: w }}>{k}</View>) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Unterseiten, Formulare, Listen
// ---------------------------------------------------------------------------

/** Kopf einer Unterseite: Zurück, Titel, Unterzeile, rechts Aktionen. */
export function UnterKopf({ titel, unter, rechts, onZurueck }: { titel: string; unter?: string; rechts?: ReactNode; onZurueck?: () => void }) {
  return (
    <View style={{ gap: 14 }}>
      <Pressable
        onPress={onZurueck ?? (() => (router.canGoBack() ? router.back() : router.navigate("/heute")))}
        accessibilityLabel="Zurück"
        style={(z: Zustand) => ({ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 10, marginLeft: -10, borderRadius: 10, backgroundColor: z.hovered ? B.ton : "transparent" })}
      >
        <Icon name="arrow-back" size={18} color={B.text2} />
        <Text style={{ ...n.fett, fontSize: 14.5, color: B.text2 }}>Zurück</Text>
      </Pressable>
      <SeitenTitel titel={titel} unter={unter} rechts={rechts} />
    </View>
  );
}

/** Inhalt einer Unterseite: volle Breite, mittige Spalte (Standard 1080). */
export function Spalte({ children, breite = 1080, style }: { children: ReactNode; breite?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: "100%", maxWidth: breite, alignSelf: "center", gap: 32 }, style]}>{children}</View>;
}

/** Eingabefeld mit Beschriftung. */
export function Eingabe({ titel, hinweis, icon, mehrzeilig, ...props }: TextInputProps & { titel?: string; hinweis?: string; icon?: IconName; mehrzeilig?: boolean }) {
  return (
    <View style={{ gap: 7 }}>
      {titel ? <Text style={{ ...n.fett, fontSize: 14, color: B.text2 }}>{titel}</Text> : null}
      <View style={{ flexDirection: "row", alignItems: mehrzeilig ? "flex-start" : "center", gap: 10, minHeight: mehrzeilig ? 110 : 48, paddingHorizontal: 14, paddingVertical: mehrzeilig ? 10 : 0, borderRadius: 14, borderWidth: 1.5, borderColor: B.linie, backgroundColor: B.ton }}>
        {icon ? <Icon name={icon} size={19} color={B.text3} /> : null}
        <TextInput placeholderTextColor={B.text3} multiline={mehrzeilig} {...props} style={[{ flex: 1, minWidth: 0, ...n.halb, fontSize: 16, color: B.text, outlineWidth: 0, minHeight: mehrzeilig ? 88 : 46 }, mehrzeilig ? { textAlignVertical: "top" } : null, props.style]} />
      </View>
      {hinweis ? <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>{hinweis}</Text> : null}
    </View>
  );
}

/** Ein/Aus-Schalter im Stil der PC-Fassung. */
export function Schalter({ wert, onWechsel, ton = TOENE.gruen }: { wert: boolean; onWechsel: (w: boolean) => void; ton?: Ton }) {
  return (
    <Pressable onPress={() => onWechsel(!wert)} accessibilityRole="switch" accessibilityState={{ checked: wert }} style={{ width: 52, height: 30, borderRadius: 15, padding: 3, backgroundColor: wert ? ton.farbe : B.linie, alignItems: wert ? "flex-end" : "flex-start" }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#FFFFFF" }} />
    </Pressable>
  );
}

/** Zeile in einer Liste/Gruppe: Symbol, Titel, Unterzeile, rechts Wert oder Pfeil. */
export function ListenZeile({ icon, ton, titel, unter, rechts, onPress, oben, gefahr }: { icon?: IconName; ton?: Ton; titel: string; unter?: string; rechts?: ReactNode; onPress?: () => void; oben?: boolean; gefahr?: boolean }) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 64, paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: oben ? 1.5 : 0, borderTopColor: B.ton, backgroundColor: z.hovered && onPress ? B.hover : "transparent" })}
    >
      {icon ? <Symbol icon={icon} ton={gefahr ? TOENE.rot : (ton ?? TOENE.orange)} groesse={38} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ ...n.fett, fontSize: 15.5, color: gefahr ? B.rotKante : B.text }} numberOfLines={1}>
          {titel}
        </Text>
        {unter ? (
          <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }} numberOfLines={2}>
            {unter}
          </Text>
        ) : null}
      </View>
      {rechts ?? (onPress ? <Icon name="chevron-forward" size={18} color={B.text3} /> : null)}
    </Pressable>
  );
}

/** Leerer Zustand: großes Symbol, Titel, Text, optional ein Knopf. */
export function Leer({ icon, ton = TOENE.orange, titel, text, children }: { icon: IconName; ton?: Ton; titel: string; text?: string; children?: ReactNode }) {
  return (
    <View style={{ alignItems: "center", gap: 12, paddingVertical: 48, paddingHorizontal: 24 }}>
      <Symbol icon={icon} ton={ton} groesse={72} />
      <Text style={{ ...n.schwarz, fontSize: 22, color: B.text, textAlign: "center" }}>{titel}</Text>
      {text ? <Text style={{ ...n.halb, fontSize: 15.5, lineHeight: 22, color: B.text2, textAlign: "center", maxWidth: 460 }}>{text}</Text> : null}
      {children ? <View style={{ marginTop: 8, flexDirection: "row", gap: 10 }}>{children}</View> : null}
    </View>
  );
}

/** Reiter zum Umschalten (Woche/Monat/Gesamt …). */
export function Reiter<W extends string>({ optionen, wert, onWechsel }: { optionen: { id: W; titel: string; zahl?: number }[]; wert: W; onWechsel: (w: W) => void }) {
  return (
    <View style={{ flexDirection: "row", alignSelf: "flex-start", gap: 4, padding: 4, borderRadius: 14, backgroundColor: B.ton }}>
      {optionen.map((o) => {
        const aktiv = o.id === wert;
        return (
          <Pressable
            key={o.id}
            onPress={() => onWechsel(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktiv }}
            style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 16, borderRadius: 10, backgroundColor: aktiv ? B.flaeche : z.hovered ? B.hover2 : "transparent", borderWidth: aktiv ? 1.5 : 0, borderColor: B.linie })}
          >
            <Text style={{ ...n.fett, fontSize: 14, color: aktiv ? B.text : B.text2 }}>{o.titel}</Text>
            {o.zahl != null ? <Text style={{ ...n.fett, fontSize: 13, color: B.text3 }}>{o.zahl}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
